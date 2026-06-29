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
import { generatePaymentId } from '../utils/crypto.util.js';
import { maskSecret } from '../utils/mask.util.js';
import { getAppBaseUrl, getPaymentCallbackUrl, isLiveEnvironment } from '../utils/app-url.util.js';

type KhaltiApiResponse = {
  payment_url?: string;
  pidx?: string;
  detail?: string;
  error_key?: string;
  message?: string;
  return_url?: string[];
  amount?: string[];
  purchase_order_id?: string[];
  purchase_order_name?: string[];
  status?: string;
  total_amount?: number;
  transaction_id?: string | null;
  fee?: number;
  refunded?: boolean;
};

function khaltiBaseUrl(isLive: boolean): string {
  return isLive ? 'https://khalti.com/api/v2' : 'https://dev.khalti.com/api/v2';
}

function khaltiErrorMessage(data: KhaltiApiResponse): string {
  if (data.return_url?.length) return data.return_url.join(', ');
  if (data.amount?.length) return data.amount.join(', ');
  if (data.purchase_order_id?.length) return data.purchase_order_id.join(', ');
  if (data.purchase_order_name?.length) return data.purchase_order_name.join(', ');
  return data.detail || data.error_key || data.message || JSON.stringify(data);
}

export class KhaltiGateway implements PaymentGatewayAdapter {
  readonly gatewayId = 'khalti';

  async initializePayment(credentials: GatewayCredentials, input: CreatePaymentDto): Promise<InitializePaymentResult> {
    if (!credentials.secretKey) throw new Error('Khalti secret key is required.');
    const isLive = isLiveEnvironment(credentials.environment);
    const amountPaisa = Math.round(Number(input.amount) * 100);
    if (amountPaisa < 1000) throw new Error('Khalti minimum payment is Rs. 10 (1000 paisa).');

    const payload = {
      return_url: input.returnUrl || getPaymentCallbackUrl('khalti'),
      website_url: getAppBaseUrl(),
      amount: amountPaisa,
      purchase_order_id: input.orderRef,
      purchase_order_name: `Order ${input.orderRef}`,
      customer_info: {
        name: input.customerName || 'Customer',
        email: input.customerEmail || 'guest@customer.com',
        phone: (input.customerPhone || '9800000000').replace(/\D/g, '').slice(-10) || '9800000000',
      },
    };

    const res = await fetch(`${khaltiBaseUrl(isLive)}/epayment/initiate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Key ${credentials.secretKey}` },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as KhaltiApiResponse;
    if (!res.ok || (!data.payment_url && !data.pidx)) {
      throw new Error(khaltiErrorMessage(data));
    }

    return {
      paymentId: generatePaymentId(),
      status: PaymentStatus.Processing,
      redirectUrl: data.payment_url,
      gatewayReference: data.pidx,
      raw: data,
    };
  }

  async verifyPayment(credentials: GatewayCredentials, input: VerifyPaymentDto): Promise<VerifyPaymentResult> {
    const pidx = String(input.gatewayReference || input.rawPayload?.pidx || '').trim();
    if (!pidx) throw new Error('Missing pidx for Khalti verification.');
    const isLive = isLiveEnvironment(credentials.environment);
    const res = await fetch(`${khaltiBaseUrl(isLive)}/epayment/lookup/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Key ${credentials.secretKey}` },
      body: JSON.stringify({ pidx }),
    });
    const data = (await res.json()) as KhaltiApiResponse;
    if (!res.ok || !data.pidx) throw new Error(khaltiErrorMessage(data));
    const verified = data.status === 'Completed';
    return {
      verified,
      status: verified ? PaymentStatus.Success : PaymentStatus.Pending,
      transactionId: data.transaction_id || undefined,
      gatewayReference: data.pidx,
      amount: (data.total_amount ?? 0) / 100,
      currency: 'NPR',
      paidAt: verified ? new Date() : undefined,
      raw: data,
    };
  }

  async checkStatus(credentials: GatewayCredentials, gatewayReference: string): Promise<VerifyPaymentResult> {
    return this.verifyPayment(credentials, { gateway: this.gatewayId, gatewayReference });
  }

  async refundPayment(): Promise<RefundPaymentResult> {
    return { success: false, status: PaymentStatus.Failed, message: 'Khalti refunds must be initiated from Khalti dashboard.' };
  }

  async handleWebhook(): Promise<WebhookHandleResult> {
    return { accepted: false, duplicate: false };
  }

  async testConnection(credentials: GatewayCredentials): Promise<TestConnectionResult> {
    if (!credentials.secretKey) return { ok: false, message: 'Missing Khalti secret key.' };
    const isLive = isLiveEnvironment(credentials.environment);
    const payload = {
      return_url: getPaymentCallbackUrl('khalti'),
      website_url: getAppBaseUrl(),
      amount: 1000,
      purchase_order_id: `TEST-${Date.now()}`,
      purchase_order_name: 'Koseli Xpress Integration Test',
      customer_info: { name: 'Test', email: 'test@koselixpress.com', phone: '9800000000' },
    };
    const res = await fetch(`${khaltiBaseUrl(isLive)}/epayment/initiate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Key ${credentials.secretKey}` },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as KhaltiApiResponse;
    if (data.payment_url || data.pidx) {
      return { ok: true, message: `Khalti connection successful (${isLive ? 'LIVE' : 'SANDBOX'}).`, details: { pidx: data.pidx } };
    }
    return { ok: false, message: khaltiErrorMessage(data) };
  }
}

export const khaltiGateway = new KhaltiGateway();
