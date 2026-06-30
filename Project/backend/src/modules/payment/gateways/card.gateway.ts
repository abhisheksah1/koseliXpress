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
import { calculateNpsSignature, generatePaymentId } from '../utils/crypto.util.js';
import { maskSecret } from '../utils/mask.util.js';
import { getNpsApiUrl, getNpsHostedUrl } from '../constants/gateway-urls.js';
import { getPaymentCallbackUrl, isLiveEnvironment } from '../utils/app-url.util.js';
import crypto from 'crypto';

/** OnePG CheckTransactionStatus values: Success | Fail | Pending */
export function mapNpsTransactionStatus(statusText: string): {
  verified: boolean;
  status: PaymentStatus;
} {
  const normalized = String(statusText || '').trim().toLowerCase();
  if (normalized === 'success') {
    return { verified: true, status: PaymentStatus.Success };
  }
  if (normalized === 'fail' || normalized === 'failed') {
    return { verified: false, status: PaymentStatus.Failed };
  }
  return { verified: false, status: PaymentStatus.Pending };
}

function verifyWebhookHmacSafe(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac('sha512', secret).update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return expected === signature;
  }
}

export class CardGateway implements PaymentGatewayAdapter {
  readonly gatewayId = 'card';

  private provider(): 'nps' | 'stripe' {
    const provider = (process.env.CARD_PROVIDER || 'nps').toLowerCase();
    return provider === 'stripe' ? 'stripe' : 'nps';
  }

  async initializePayment(credentials: GatewayCredentials, input: CreatePaymentDto): Promise<InitializePaymentResult> {
    if (this.provider() === 'stripe') {
      return this.initializeStripe(credentials, input);
    }
    return this.initializeNps(credentials, input);
  }

  private async initializeNps(credentials: GatewayCredentials, input: CreatePaymentDto): Promise<InitializePaymentResult> {
    const merchantName = credentials.extraSettings?.merchantName || process.env.NPS_MERCHANT_NAME || '';
    const apiUsername = credentials.extraSettings?.apiUsername || credentials.username || process.env.NPS_API_USERNAME || '';
    const apiPassword = credentials.extraSettings?.apiPassword || credentials.password || process.env.NPS_API_PASSWORD || '';
    if (!credentials.merchantCode || !credentials.secretKey || !merchantName || !apiUsername || !apiPassword) {
      throw new Error('NPS card credentials incomplete.');
    }

    const isLive = isLiveEnvironment(credentials.environment);
    const formattedAmount = Number(input.amount).toFixed(2);
    const merchantTxnId = input.orderRef;
    const payload = {
      MerchantId: credentials.merchantCode,
      MerchantName: merchantName,
      Amount: formattedAmount,
      MerchantTxnId: merchantTxnId,
    };
    const signature = calculateNpsSignature(payload, credentials.secretKey);
    const basicCredential = Buffer.from(`${apiUsername}:${apiPassword}`).toString('base64');

    const res = await fetch(getNpsApiUrl(isLive, 'GetProcessId'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${basicCredential}` },
      body: JSON.stringify({ ...payload, Signature: signature }),
    });
    if (!res.ok) throw new Error(`NPS API error ${res.status}`);
    const data = (await res.json()) as { code?: string | number; data?: { ProcessId?: string }; message?: string };
    if (data.code !== '0' && data.code !== 0) throw new Error(data.message || 'NPS rejected payment request');
    if (!data.data?.ProcessId) throw new Error('NPS did not return ProcessId');

    const responseUrl = input.successUrl || input.returnUrl || getPaymentCallbackUrl('nps');
    const instrumentCode =
      credentials.extraSettings?.instrumentCode || process.env.NPS_INSTRUMENT_CODE || '';
    const transactionRemarks =
      (input.metadata?.remarks as string | undefined) ||
      (input.metadata?.transactionRemarks as string | undefined) ||
      `Order ${merchantTxnId}`;

    const formFields: Record<string, string> = {
      MerchantId: credentials.merchantCode,
      MerchantName: merchantName,
      Amount: formattedAmount,
      MerchantTxnId: merchantTxnId,
      ProcessId: data.data.ProcessId,
      TransactionRemarks: transactionRemarks,
      ResponseUrl: responseUrl,
    };
    if (instrumentCode) {
      formFields.InstrumentCode = instrumentCode;
    }

    return {
      paymentId: generatePaymentId(),
      status: PaymentStatus.Processing,
      formAction: getNpsHostedUrl(isLive),
      formFields,
      gatewayReference: merchantTxnId,
      raw: data,
    };
  }

  private async initializeStripe(credentials: GatewayCredentials, input: CreatePaymentDto): Promise<InitializePaymentResult> {
    const secretKey = credentials.secretKey || process.env.CARD_SECRET_KEY || process.env.STRIPE_SECRET_KEY || '';
    if (!secretKey) throw new Error('Stripe secret key not configured. Set CARD_SECRET_KEY or STRIPE_SECRET_KEY.');
    const params = new URLSearchParams();
    params.set('mode', 'payment');
    params.set('success_url', input.successUrl || `${process.env.APP_URL}/payment/card/success?ref=${input.orderRef}`);
    params.set('cancel_url', input.failureUrl || `${process.env.APP_URL}/payment/card/failure?ref=${input.orderRef}`);
    params.set('line_items[0][price_data][currency]', input.currency.toLowerCase());
    params.set('line_items[0][price_data][product_data][name]', `Order ${input.orderRef}`);
    params.set('line_items[0][price_data][unit_amount]', String(Math.round(input.amount * 100)));
    params.set('line_items[0][quantity]', '1');
    params.set('client_reference_id', input.orderRef);

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const data = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
    if (!res.ok || !data.url) throw new Error(data.error?.message || 'Stripe session creation failed');
    return {
      paymentId: generatePaymentId(),
      status: PaymentStatus.Processing,
      redirectUrl: data.url,
      gatewayReference: data.id,
      raw: data,
    };
  }

  async verifyPayment(credentials: GatewayCredentials, input: VerifyPaymentDto): Promise<VerifyPaymentResult> {
    if (this.provider() === 'stripe') {
      return this.verifyStripe(credentials, input);
    }
    return this.verifyNps(credentials, input);
  }

  private async verifyNps(credentials: GatewayCredentials, input: VerifyPaymentDto): Promise<VerifyPaymentResult> {
    const merchantTxnId = String(input.gatewayReference || input.orderRef || '').trim();
    const merchantName = credentials.extraSettings?.merchantName || process.env.NPS_MERCHANT_NAME || '';
    const apiUsername = credentials.extraSettings?.apiUsername || credentials.username || '';
    const apiPassword = credentials.extraSettings?.apiPassword || credentials.password || '';
    const isLive = isLiveEnvironment(credentials.environment);
    const payload = {
      MerchantId: credentials.merchantCode,
      MerchantName: merchantName,
      MerchantTxnId: merchantTxnId,
    };
    const signature = calculateNpsSignature(payload, credentials.secretKey);
    const basicCredential = Buffer.from(`${apiUsername}:${apiPassword}`).toString('base64');
    const res = await fetch(getNpsApiUrl(isLive, 'CheckTransactionStatus'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${basicCredential}` },
      body: JSON.stringify({ ...payload, Signature: signature }),
    });
    const data = (await res.json()) as {
      code?: string | number;
      data?: { Status?: string; Amount?: string; GatewayReferenceNo?: string };
    };
    const apiOk = data.code === '0' || data.code === 0;
    const mapped = mapNpsTransactionStatus(apiOk ? String(data.data?.Status || '') : '');
    return {
      verified: apiOk && mapped.verified,
      status: apiOk ? mapped.status : PaymentStatus.Pending,
      gatewayReference: merchantTxnId,
      transactionId: data.data?.GatewayReferenceNo,
      amount: data.data?.Amount ? Number(data.data.Amount) : undefined,
      currency: 'NPR',
      paidAt: mapped.verified ? new Date() : undefined,
      raw: data,
    };
  }

  private async verifyStripe(credentials: GatewayCredentials, input: VerifyPaymentDto): Promise<VerifyPaymentResult> {
    const secretKey = credentials.secretKey || process.env.CARD_SECRET_KEY || '';
    const sessionId = String(input.gatewayReference || '').trim();
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const data = (await res.json()) as { payment_status?: string; id?: string; amount_total?: number };
    const verified = data.payment_status === 'paid';
    return {
      verified,
      status: verified ? PaymentStatus.Success : PaymentStatus.Pending,
      gatewayReference: data.id,
      amount: data.amount_total ? data.amount_total / 100 : undefined,
      paidAt: verified ? new Date() : undefined,
      raw: data,
    };
  }

  async checkStatus(credentials: GatewayCredentials, gatewayReference: string): Promise<VerifyPaymentResult> {
    return this.verifyPayment(credentials, { gateway: this.gatewayId, gatewayReference });
  }

  async refundPayment(): Promise<RefundPaymentResult> {
    return { success: false, status: PaymentStatus.Failed, message: 'Card refunds must be processed via provider dashboard.' };
  }

  async handleWebhook(credentials: GatewayCredentials, payload: Record<string, unknown>, headers: Record<string, string>): Promise<WebhookHandleResult> {
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || credentials.secretKey;
    const signature = headers['stripe-signature'] || headers['x-webhook-signature'] || '';
    const raw = JSON.stringify(payload);
    const valid = verifyWebhookHmacSafe(raw, signature, webhookSecret);
    if (!valid && this.provider() === 'stripe') {
      return { accepted: false, duplicate: false };
    }
    const status = payload.type === 'checkout.session.completed' ? PaymentStatus.Success : PaymentStatus.Processing;
    return {
      accepted: true,
      duplicate: false,
      paymentId: String(payload.id || ''),
      status,
    };
  }

  async testConnection(credentials: GatewayCredentials): Promise<TestConnectionResult> {
    if (this.provider() === 'stripe') {
      if (!credentials.secretKey && !process.env.CARD_SECRET_KEY) {
        return { ok: false, message: 'Stripe secret key not configured.' };
      }
      return { ok: true, message: 'Stripe credentials configured.', details: { provider: 'stripe' } };
    }
    const merchantName = credentials.extraSettings?.merchantName || process.env.NPS_MERCHANT_NAME || '';
    const apiUsername = credentials.extraSettings?.apiUsername || credentials.username || process.env.NPS_API_USERNAME || '';
    const apiPassword = credentials.extraSettings?.apiPassword || credentials.password || process.env.NPS_API_PASSWORD || '';
    if (!credentials.merchantCode || !credentials.secretKey || !merchantName || !apiUsername || !apiPassword) {
      return { ok: false, message: 'NPS credentials incomplete (MerchantId, SecretKey, MerchantName, API username/password).' };
    }

    const isLive = isLiveEnvironment(credentials.environment);
    const payload = {
      MerchantId: credentials.merchantCode,
      MerchantName: merchantName,
    };
    const signature = calculateNpsSignature(payload, credentials.secretKey);
    const basicCredential = Buffer.from(`${apiUsername}:${apiPassword}`).toString('base64');

    try {
      const res = await fetch(getNpsApiUrl(isLive, 'GetPaymentInstrumentDetails'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${basicCredential}` },
        body: JSON.stringify({ ...payload, Signature: signature }),
      });
      const data = (await res.json()) as { code?: string | number; message?: string; data?: unknown[] };
      if (data.code === '0' || data.code === 0) {
        return {
          ok: true,
          message: `NPS OnePG connected (${credentials.environment}). ${Array.isArray(data.data) ? data.data.length : 0} payment instrument(s) available.`,
          details: { merchantId: maskSecret(credentials.merchantCode), merchantName, instrumentCount: data.data?.length ?? 0 },
        };
      }
      return { ok: false, message: data.message || 'NPS GetPaymentInstrumentDetails failed.', details: data };
    } catch (err: unknown) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'NPS connection test failed.',
      };
    }
  }
}

export class NpsGateway implements PaymentGatewayAdapter {
  readonly gatewayId = 'nps';
  private core = new CardGateway();
  initializePayment(c: GatewayCredentials, i: CreatePaymentDto) { return this.core.initializePayment(c, i); }
  verifyPayment(c: GatewayCredentials, i: VerifyPaymentDto) { return this.core.verifyPayment(c, i); }
  checkStatus(c: GatewayCredentials, r: string) { return this.core.checkStatus(c, r); }
  refundPayment() { return this.core.refundPayment(); }
  handleWebhook(c: GatewayCredentials, p: Record<string, unknown>, h: Record<string, string>) { return this.core.handleWebhook(c, p, h); }
  testConnection(c: GatewayCredentials) { return this.core.testConnection(c); }
}

export const cardGateway = new CardGateway();
export const npsGateway = new NpsGateway();
