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

export class FonepayGateway implements PaymentGatewayAdapter {
  readonly gatewayId = 'fonepay';

  resolveGatewayId(credentials: GatewayCredentials): string {
    if (credentials.extraSettings?.qrImageUrl) return 'fonepay_static';
    if (credentials.secretKey) return 'fonepay_dynamic';
    return 'fonepay_static';
  }

  async initializePayment(credentials: GatewayCredentials, input: CreatePaymentDto): Promise<InitializePaymentResult> {
    const qrImageUrl = credentials.extraSettings?.qrImageUrl || process.env.FONEPAY_STATIC_QR_URL || '';
    const gatewayUrl = process.env.FONEPAY_GATEWAY_URL || '';

    return {
      paymentId: generatePaymentId(),
      status: PaymentStatus.Pending,
      gatewayReference: input.orderRef,
      redirectUrl: gatewayUrl || undefined,
      raw: {
        mode: qrImageUrl ? 'static_qr' : 'manual_confirm',
        qrImageUrl,
        merchantCode: credentials.merchantCode,
        amount: input.amount,
        orderRef: input.orderRef,
        instructions: 'Scan the Fonepay QR and confirm payment. Admin will verify manually for static QR.',
      },
    };
  }

  async verifyPayment(_credentials: GatewayCredentials, input: VerifyPaymentDto): Promise<VerifyPaymentResult> {
    return {
      verified: false,
      status: PaymentStatus.Pending,
      gatewayReference: input.gatewayReference || input.orderRef,
      message: 'Fonepay static QR requires manual confirmation.',
    } as VerifyPaymentResult & { message?: string };
  }

  async checkStatus(credentials: GatewayCredentials, gatewayReference: string): Promise<VerifyPaymentResult> {
    return this.verifyPayment(credentials, { gateway: this.gatewayId, gatewayReference });
  }

  async refundPayment(): Promise<RefundPaymentResult> {
    return { success: false, status: PaymentStatus.Failed, message: 'Fonepay refunds are handled manually.' };
  }

  async handleWebhook(): Promise<WebhookHandleResult> {
    return { accepted: false, duplicate: false };
  }

  async testConnection(credentials: GatewayCredentials): Promise<TestConnectionResult> {
    const qrUrl = credentials.extraSettings?.qrImageUrl || process.env.FONEPAY_STATIC_QR_URL || '';
    const username = credentials.username || process.env.FONEPAY_USERNAME || '';
    if (qrUrl) {
      return { ok: true, message: 'Fonepay static QR configured.', details: { qrUrl, merchantCode: credentials.merchantCode || 'N/A' } };
    }
    if (username && credentials.password) {
      return { ok: true, message: 'Fonepay credentials configured.', details: { username: maskSecret(username) } };
    }
    return { ok: false, message: 'Configure FONEPAY_STATIC_QR_URL or username/password.' };
  }
}

export class FonepayStaticGateway implements PaymentGatewayAdapter {
  readonly gatewayId = 'fonepay_static';
  private core = new FonepayGateway();
  initializePayment(c: GatewayCredentials, i: CreatePaymentDto) { return this.core.initializePayment(c, i); }
  verifyPayment(c: GatewayCredentials, i: VerifyPaymentDto) { return this.core.verifyPayment(c, i); }
  checkStatus(c: GatewayCredentials, r: string) { return this.core.checkStatus(c, r); }
  refundPayment() { return this.core.refundPayment(); }
  handleWebhook() { return this.core.handleWebhook(); }
  testConnection(c: GatewayCredentials) { return this.core.testConnection(c); }
}

export class FonepayDynamicGateway implements PaymentGatewayAdapter {
  readonly gatewayId = 'fonepay_dynamic';
  private core = new FonepayGateway();
  initializePayment(c: GatewayCredentials, i: CreatePaymentDto) { return this.core.initializePayment(c, i); }
  verifyPayment(c: GatewayCredentials, i: VerifyPaymentDto) { return this.core.verifyPayment(c, i); }
  checkStatus(c: GatewayCredentials, r: string) { return this.core.checkStatus(c, r); }
  refundPayment() { return this.core.refundPayment(); }
  handleWebhook() { return this.core.handleWebhook(); }
  testConnection(c: GatewayCredentials) { return this.core.testConnection(c); }
}

export const fonepayGateway = new FonepayGateway();
export const fonepayStaticGateway = new FonepayStaticGateway();
export const fonepayDynamicGateway = new FonepayDynamicGateway();
