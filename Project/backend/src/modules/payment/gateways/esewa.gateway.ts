import {
  CreatePaymentDto,
  GatewayCredentials,
  InitializePaymentResult,
  PaymentGatewayAdapter,
  PaymentStatus,
  RefundPaymentResult,
  TestConnectionResult,
  VerifyPaymentDto,
  VerifyPaymentResult,
  WebhookHandleResult,
} from '../types/payment.types.js';
import {
  generateEsewaSignature,
  generatePaymentId,
  sanitizeEsewaTransactionUuid,
  verifyEsewaResponseSignature,
} from '../utils/crypto.util.js';
import { maskSecret } from '../utils/mask.util.js';
import { getPaymentCallbackUrl, getPaymentFailureUrl, isLiveEnvironment } from '../utils/app-url.util.js';
import { getEsewaStatusBaseUrl } from '../constants/gateway-urls.js';

/** UAT form POST URL — admin baseUrl overrides default */
function esewaFormUrl(credentials: GatewayCredentials, isLive: boolean): string {
  const custom = credentials.extraSettings?.baseUrl?.trim();
  if (custom) return custom;
  return isLive
    ? 'https://epay.esewa.com.np/api/epay/main/v2/form'
    : 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
}

function mapEsewaStatus(status: string): { verified: boolean; paymentStatus: PaymentStatus } {
  const normalized = status.toUpperCase();
  if (normalized === 'COMPLETE') {
    return { verified: true, paymentStatus: PaymentStatus.Success };
  }
  if (normalized === 'PENDING' || normalized === 'AMBIGUOUS') {
    return { verified: false, paymentStatus: PaymentStatus.Pending };
  }
  if (normalized === 'CANCELED' || normalized === 'NOT_FOUND') {
    return { verified: false, paymentStatus: PaymentStatus.Cancelled };
  }
  if (normalized === 'FULL_REFUND' || normalized === 'PARTIAL_REFUND') {
    return { verified: false, paymentStatus: PaymentStatus.Refunded };
  }
  return { verified: false, paymentStatus: PaymentStatus.Failed };
}

type EsewaStatusResponse = {
  status?: string;
  transaction_code?: string;
  ref_id?: string;
  total_amount?: number | string;
  product_code?: string;
  transaction_uuid?: string;
  error_message?: string;
  code?: number;
};

export class EsewaGateway implements PaymentGatewayAdapter {
  readonly gatewayId = 'esewa';

  async initializePayment(credentials: GatewayCredentials, input: CreatePaymentDto): Promise<InitializePaymentResult> {
    const productCode = credentials.merchantCode || 'EPAYTEST';
    if (!credentials.secretKey) {
      throw new Error('eSewa secret key is required.');
    }
    const totalAmount = Number(input.amount).toFixed(2);
    const transactionUuid = sanitizeEsewaTransactionUuid(input.orderRef);
    const signature = generateEsewaSignature(totalAmount, transactionUuid, productCode, credentials.secretKey);
    const isLive = isLiveEnvironment(credentials.environment);
    const successUrl = input.successUrl || credentials.extraSettings?.successUrl || getPaymentCallbackUrl('esewa');
    const failureUrl = input.failureUrl || credentials.extraSettings?.failureUrl || getPaymentFailureUrl('esewa');

    return {
      paymentId: generatePaymentId(),
      status: PaymentStatus.Processing,
      formAction: esewaFormUrl(credentials, isLive),
      formFields: {
        amount: totalAmount,
        tax_amount: '0',
        total_amount: totalAmount,
        transaction_uuid: transactionUuid,
        product_code: productCode,
        product_service_charge: '0',
        product_delivery_charge: '0',
        success_url: successUrl,
        failure_url: failureUrl,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
        signature,
      },
      gatewayReference: transactionUuid,
    };
  }

  async verifyPayment(credentials: GatewayCredentials, input: VerifyPaymentDto): Promise<VerifyPaymentResult> {
    const raw = (input.rawPayload || {}) as Record<string, unknown>;
    const transactionUuid = sanitizeEsewaTransactionUuid(
      String(input.gatewayReference || input.orderRef || raw.transaction_uuid || ''),
    );
    const totalAmount = Number(
      input.amount ?? raw.total_amount ?? 0,
    ).toFixed(2);

    if (!transactionUuid || Number(totalAmount) <= 0) {
      throw new Error('eSewa verification requires transaction_uuid and total_amount.');
    }

    // Step 1: Verify success redirect payload signature (if present)
    if (raw.signature && raw.signed_field_names) {
      const signatureOk = verifyEsewaResponseSignature(raw, credentials.secretKey);
      if (!signatureOk) {
        throw new Error('eSewa callback signature verification failed.');
      }
    }

    // Step 2: Status check API (mandatory per eSewa docs — filters fraudulent transactions)
    const productCode = credentials.merchantCode || 'EPAYTEST';
    const isLive = isLiveEnvironment(credentials.environment);
    const url = `${getEsewaStatusBaseUrl(isLive)}?product_code=${encodeURIComponent(productCode)}&total_amount=${encodeURIComponent(totalAmount)}&transaction_uuid=${encodeURIComponent(transactionUuid)}`;
    const res = await fetch(url);
    const data = (await res.json()) as EsewaStatusResponse;

    if (!res.ok || data.error_message) {
      throw new Error(data.error_message || `eSewa status check failed (${res.status}).`);
    }

    const mapped = mapEsewaStatus(String(data.status || raw.status || ''));
    return {
      verified: mapped.verified,
      status: mapped.paymentStatus,
      transactionId: data.ref_id || String(raw.transaction_code || ''),
      gatewayReference: data.transaction_uuid || transactionUuid,
      amount: Number(data.total_amount ?? totalAmount),
      currency: 'NPR',
      paidAt: mapped.verified ? new Date() : undefined,
      raw: data,
    };
  }

  async checkStatus(credentials: GatewayCredentials, gatewayReference: string, amount?: number): Promise<VerifyPaymentResult> {
    return this.verifyPayment(credentials, {
      gateway: this.gatewayId,
      gatewayReference,
      amount,
    });
  }

  async refundPayment(): Promise<RefundPaymentResult> {
    return { success: false, status: PaymentStatus.Failed, message: 'eSewa refunds must be processed via merchant portal.' };
  }

  async handleWebhook(): Promise<WebhookHandleResult> {
    return { accepted: false, duplicate: false };
  }

  async testConnection(credentials: GatewayCredentials): Promise<TestConnectionResult> {
    const productCode = credentials.merchantCode || 'EPAYTEST';
    if (!credentials.secretKey) {
      return { ok: false, message: 'Missing eSewa secret key.' };
    }
    const signature = generateEsewaSignature('10.00', `TEST-${Date.now()}`, productCode, credentials.secretKey);
    const isLive = isLiveEnvironment(credentials.environment);
    return {
      ok: true,
      message: `eSewa HMAC signature valid (${isLive ? 'LIVE' : 'UAT'}). Form: ${esewaFormUrl(credentials, isLive)}`,
      details: {
        productCode: maskSecret(productCode),
        signaturePreview: maskSecret(signature),
        statusApi: getEsewaStatusBaseUrl(isLive),
      },
    };
  }
}

export const esewaGateway = new EsewaGateway();

