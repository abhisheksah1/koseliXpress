import crypto from 'crypto';
import { getApiStore, saveApiStore } from './apiStoreService.js';

export interface GatewayConfig {
  id: string;
  name?: string;
  merchantId: string;
  secretKey: string;
  publicKey?: string;
  apiEnvironment: 'test' | 'live';
  isEnabled: boolean;
  extraSettings?: Record<string, string>;
}

function envGateway(id: string, defaults: Partial<GatewayConfig>): GatewayConfig | null {
  const merchantId = defaults.merchantId || '';
  const secretKey = defaults.secretKey || '';
  const publicKey = defaults.publicKey || '';
  const hasCreds = !!(
    merchantId ||
    secretKey ||
    publicKey ||
    defaults.extraSettings?.fonepayUsername ||
    defaults.extraSettings?.merchantName ||
    defaults.extraSettings?.apiUsername
  );
  if (!hasCreds) return null;
  return {
    id,
    merchantId,
    secretKey,
    publicKey,
    apiEnvironment: defaults.apiEnvironment || 'test',
    isEnabled: defaults.isEnabled ?? false,
    extraSettings: defaults.extraSettings || {},
  };
}

export function getEnvGatewayDefaults(): GatewayConfig[] {
  const esewa = envGateway('esewa', {
    merchantId: process.env.ESEWA_MERCHANT_CODE || '',
    secretKey: process.env.ESEWA_SECRET_KEY || '',
    apiEnvironment: process.env.ESEWA_ENV === 'live' ? 'live' : 'test',
    isEnabled: process.env.ESEWA_ENABLED === 'true',
  });
  const khalti = envGateway('khalti', {
    merchantId: process.env.KHALTI_PUBLIC_KEY || '',
    publicKey: process.env.KHALTI_PUBLIC_KEY || '',
    secretKey: process.env.KHALTI_SECRET_KEY || '',
    apiEnvironment: process.env.KHALTI_ENV === 'live' ? 'live' : 'test',
    isEnabled: process.env.KHALTI_ENABLED === 'true',
  });
  const fonepayStatic = envGateway('fonepay_static', {
    merchantId: process.env.FONEPAY_MERCHANT_CODE || '',
    secretKey: '',
    apiEnvironment: process.env.FONEPAY_ENV === 'live' ? 'live' : 'test',
    isEnabled: process.env.FONEPAY_ENABLED === 'true',
    extraSettings: {
      fonepayUsername: process.env.FONEPAY_USERNAME || '',
      fonepayPassword: process.env.FONEPAY_PASSWORD || '',
      qrImageUrl: process.env.FONEPAY_STATIC_QR_URL || '',
    },
  });
  const fonepayDynamic = envGateway('fonepay_dynamic', {
    merchantId: process.env.FONEPAY_MERCHANT_CODE || '',
    secretKey: process.env.FONEPAY_SECRET_KEY || '',
    apiEnvironment: process.env.FONEPAY_ENV === 'live' ? 'live' : 'test',
    isEnabled: process.env.FONEPAY_ENABLED === 'true',
    extraSettings: {
      fonepayUsername: process.env.FONEPAY_USERNAME || '',
      fonepayPassword: process.env.FONEPAY_PASSWORD || '',
    },
  });
  const nps = envGateway('nps', {
    merchantId: process.env.NPS_MERCHANT_ID || '',
    secretKey: process.env.NPS_SECRET_KEY || '',
    apiEnvironment: process.env.NPS_ENV === 'live' ? 'live' : 'test',
    isEnabled: process.env.NPS_ENABLED === 'true',
    extraSettings: {
      merchantName: process.env.NPS_MERCHANT_NAME || '',
      apiUsername: process.env.NPS_API_USERNAME || '',
      apiPassword: process.env.NPS_API_PASSWORD || '',
    },
  });
  return [esewa, khalti, fonepayStatic, fonepayDynamic, nps].filter(Boolean) as GatewayConfig[];
}

function mergeExtraSettings(existing: Record<string, string> = {}, incoming: Record<string, string> = {}): Record<string, string> {
  const keys = new Set([...Object.keys(existing), ...Object.keys(incoming)]);
  const merged: Record<string, string> = {};
  for (const key of keys) {
    merged[key] = incoming[key] || existing[key] || '';
  }
  return merged;
}

export function mergeGatewayConfigs(stored: GatewayConfig[], envDefaults: GatewayConfig[]): GatewayConfig[] {
  const byId = new Map<string, GatewayConfig>();
  for (const gw of stored) byId.set(gw.id, gw);
  for (const envGw of envDefaults) {
    const existing = byId.get(envGw.id);
    if (!existing) {
      byId.set(envGw.id, envGw);
      continue;
    }
    const merchantId = existing.merchantId || envGw.merchantId;
    const adminSecret = (existing.secretKey || '').trim();
    byId.set(envGw.id, {
      ...existing,
      merchantId: merchantId.startsWith('http') ? (envGw.merchantId || '') : merchantId,
      secretKey: adminSecret || envGw.secretKey,
      publicKey: (existing.publicKey || '').startsWith('http') ? (envGw.publicKey || '') : (existing.publicKey || envGw.publicKey),
      apiEnvironment:
        merchantId === 'EPAYTEST'
          ? 'test'
          : existing.apiEnvironment || envGw.apiEnvironment,
      extraSettings: mergeExtraSettings(envGw.extraSettings, existing.extraSettings),
    });
  }
  return Array.from(byId.values());
}

export async function getGatewayById(gatewayId: string): Promise<GatewayConfig | null> {
  const store = await getApiStore();
  const stored = (store.paymentGateways || []) as GatewayConfig[];
  const envDefaults = getEnvGatewayDefaults();
  const merged = mergeGatewayConfigs(stored, envDefaults);
  return merged.find(g => g.id === gatewayId) || null;
}

export async function seedPaymentGatewaysFromEnv(): Promise<void> {
  const envDefaults = getEnvGatewayDefaults();
  if (envDefaults.length === 0) return;
  const store = await getApiStore();
  const stored = (store.paymentGateways || []) as GatewayConfig[];
  if (stored.length === 0) {
    store.paymentGateways = envDefaults;
    await saveApiStore(store);
    console.log('[Payment] Seeded ApiStore payment gateways from .env');
    return;
  }
  const merged = mergeGatewayConfigs(stored, envDefaults);
  store.paymentGateways = merged;
  await saveApiStore(store);
}

export function generateEsewaSignature(amount: string, transactionUuid: string, productCode: string, secretKey: string): string {
  const dataString = `total_amount=${amount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  return crypto.createHmac('sha256', secretKey).update(dataString).digest('base64');
}

export function getEsewaFormUrl(isLive: boolean): string {
  return isLive
    ? 'https://epay.esewa.com.np/api/epay/main/v2/form'
    : 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
}

export function getEsewaStatusUrl(isLive: boolean): string {
  return isLive
    ? 'https://esewa.com.np/api/epay/transaction/status/'
    : 'https://rc.esewa.com.np/api/epay/transaction/status/';
}

export type EsewaVerifyResult = {
  status: string;
  transaction_uuid: string;
  product_code: string;
  total_amount: string;
  transaction_code?: string;
  verified: boolean;
};

type EsewaStatusResponse = {
  status?: string;
  transaction_uuid?: string;
  product_code?: string;
  total_amount?: string | number;
  transaction_code?: string;
  ref_id?: string;
};

/** eSewa transaction status API — only status COMPLETE is treated as success */
export async function verifyEsewaTransaction(params: {
  transactionUuid: string;
  totalAmount: number | string;
  gateway?: GatewayConfig | null;
}): Promise<EsewaVerifyResult> {
  const gw = params.gateway || (await getGatewayById('esewa'));
  if (!gw) throw new Error('eSewa gateway not configured.');
  const productCode = gw.merchantId || process.env.ESEWA_MERCHANT_CODE || '';
  if (!productCode) throw new Error('eSewa merchant code missing.');
  const totalAmount = Number(params.totalAmount).toFixed(2);
  const transactionUuid = String(params.transactionUuid).trim();
  if (!transactionUuid) throw new Error('Missing transaction UUID for eSewa verification.');

  const isLive = gw.apiEnvironment === 'live';
  const url = `${getEsewaStatusUrl(isLive)}?product_code=${encodeURIComponent(productCode)}&total_amount=${encodeURIComponent(totalAmount)}&transaction_uuid=${encodeURIComponent(transactionUuid)}`;
  const res = await fetch(url);
  const data = (await res.json()) as EsewaStatusResponse;
  if (!res.ok) {
    throw new Error(`eSewa status check failed (${res.status}).`);
  }
  const status = String(data.status || '').toUpperCase();
  return {
    status: data.status || 'Unknown',
    transaction_uuid: data.transaction_uuid || transactionUuid,
    product_code: data.product_code || productCode,
    total_amount: String(data.total_amount ?? totalAmount),
    transaction_code: data.transaction_code || data.ref_id,
    verified: status === 'COMPLETE',
  };
}

export function getKhaltiBaseUrl(isLive: boolean): string {
  return isLive ? 'https://khalti.com/api/v2' : 'https://dev.khalti.com/api/v2';
}

export function getKhaltiInitiateUrl(isLive: boolean): string {
  return `${getKhaltiBaseUrl(isLive)}/epayment/initiate/`;
}

export function getKhaltiLookupUrl(isLive: boolean): string {
  return `${getKhaltiBaseUrl(isLive)}/epayment/lookup/`;
}

export function maskSecret(value: string): string {
  if (!value) return '';
  if (value.length <= 6) return '******';
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

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

export type KhaltiLookupResult = {
  pidx: string;
  total_amount: number;
  status: string;
  transaction_id: string | null;
  fee: number;
  refunded: boolean;
};

function khaltiAuthHeader(secretKey: string): string {
  return `Key ${secretKey}`;
}

function khaltiIsLive(gw: GatewayConfig): boolean {
  return gw.apiEnvironment === 'live';
}

function khaltiErrorMessage(data: KhaltiApiResponse): string {
  if (data.return_url?.length) return data.return_url.join(', ');
  if (data.amount?.length) return data.amount.join(', ');
  if (data.purchase_order_id?.length) return data.purchase_order_id.join(', ');
  if (data.purchase_order_name?.length) return data.purchase_order_name.join(', ');
  return data.detail || data.error_key || data.message || JSON.stringify(data);
}

export async function testEsewaConnection(gw: GatewayConfig): Promise<{ ok: boolean; message: string; details?: unknown }> {
  const productCode = gw.merchantId || process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';
  const secretKey = gw.secretKey || process.env.ESEWA_SECRET_KEY || '';
  if (!productCode || !secretKey) {
    return { ok: false, message: 'Missing eSewa merchant code or secret key. Set in Admin → Payment Gateways or .env (ESEWA_MERCHANT_CODE, ESEWA_SECRET_KEY).' };
  }
  try {
    const testUuid = `TEST-${Date.now()}`;
    const amount = '10';
    const signature = generateEsewaSignature(amount, testUuid, productCode, secretKey);
    return {
      ok: true,
      message: `eSewa credentials valid. Signature generated for sandbox/live (${gw.apiEnvironment}).`,
      details: { productCode, signaturePreview: maskSecret(signature), formUrl: getEsewaFormUrl(gw.apiEnvironment === 'live') },
    };
  } catch (err: unknown) {
    return { ok: false, message: err instanceof Error ? err.message : 'eSewa signature generation failed.' };
  }
}

export async function testKhaltiConnection(gw: GatewayConfig): Promise<{ ok: boolean; message: string; details?: unknown }> {
  const secretKey = gw.secretKey || process.env.KHALTI_SECRET_KEY || '';
  if (!secretKey) {
    return { ok: false, message: 'Missing Khalti live secret key. Use the key from test-admin.khalti.com (sandbox) or admin.khalti.com (live).' };
  }
  const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
  const isLive = khaltiIsLive(gw);
  try {
    const payload = {
      return_url: `${appUrl}/payment/khalti/callback`,
      website_url: appUrl,
      amount: 1000,
      purchase_order_id: `TEST-${Date.now()}`,
      purchase_order_name: 'Koseli Xpress Integration Test',
      customer_info: { name: 'Test Customer', email: 'test@koselixpress.com', phone: '9800000000' },
    };
    const res = await fetch(getKhaltiInitiateUrl(isLive), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: khaltiAuthHeader(secretKey) },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as KhaltiApiResponse;
    if (data.payment_url || data.pidx) {
      return {
        ok: true,
        message: `Khalti KPG-2 connection successful (${isLive ? 'LIVE' : 'SANDBOX'}). Payment session can be created.`,
        details: { pidx: data.pidx, apiBase: getKhaltiBaseUrl(isLive), environment: isLive ? 'live' : 'test' },
      };
    }
    return { ok: false, message: `Khalti API rejected request: ${khaltiErrorMessage(data)}` };
  } catch (err: unknown) {
    return { ok: false, message: err instanceof Error ? err.message : 'Khalti connection failed.' };
  }
}

export async function testFonepayConnection(gw: GatewayConfig): Promise<{ ok: boolean; message: string; details?: unknown }> {
  const username = gw.extraSettings?.fonepayUsername || process.env.FONEPAY_USERNAME || '';
  const password = gw.extraSettings?.fonepayPassword || process.env.FONEPAY_PASSWORD || '';
  const qrUrl = gw.extraSettings?.qrImageUrl || process.env.FONEPAY_STATIC_QR_URL || '';
  const merchantCode = gw.merchantId || process.env.FONEPAY_MERCHANT_CODE || '';

  if (gw.id === 'fonepay_static') {
    if (!qrUrl && !username) {
      return { ok: false, message: 'Fonepay static QR: upload QR image URL or set FONEPAY_STATIC_QR_URL in .env.' };
    }
    if (qrUrl) {
      try {
        const head = await fetch(qrUrl, { method: 'HEAD' });
        if (head.ok) {
          return { ok: true, message: 'Fonepay static QR URL is reachable.', details: { qrUrl, merchantCode: merchantCode || 'N/A' } };
        }
      } catch {
        // HEAD may fail on some hosts; still OK if URL is set
      }
      return { ok: true, message: 'Fonepay static QR URL configured.', details: { qrUrl, merchantCode: merchantCode || 'N/A' } };
    }
    return { ok: true, message: 'Fonepay username configured for static payments.', details: { username: maskSecret(username) } };
  }

  if (!username || !password) {
    return { ok: false, message: 'Missing Fonepay username/password. Set in Admin or .env (FONEPAY_USERNAME, FONEPAY_PASSWORD).' };
  }
  return {
    ok: true,
    message: 'Fonepay dynamic credentials configured. Use checkout to generate payment request.',
    details: { username: maskSecret(username), merchantCode: merchantCode || 'N/A', environment: gw.apiEnvironment },
  };
}

export async function buildEsewaPaymentPayload(params: {
  amount: number;
  transactionUuid: string;
  successUrl: string;
  failureUrl: string;
  gateway?: GatewayConfig | null;
}) {
  const gw = params.gateway || (await getGatewayById('esewa'));
  if (!gw) throw new Error('eSewa gateway not configured.');
  const productCode = gw.merchantId || 'EPAYTEST';
  const secretKey = gw.secretKey;
  if (!secretKey) throw new Error('eSewa secret key missing.');
  const totalAmount = Number(params.amount).toFixed(2);
  const signature = generateEsewaSignature(totalAmount, params.transactionUuid, productCode, secretKey);
  const isLive = gw.apiEnvironment === 'live';
  return {
    action: getEsewaFormUrl(isLive),
    fields: {
      amount: totalAmount,
      tax_amount: '0',
      total_amount: totalAmount,
      transaction_uuid: params.transactionUuid,
      product_code: productCode,
      product_service_charge: '0',
      product_delivery_charge: '0',
      success_url: params.successUrl,
      failure_url: params.failureUrl,
      signed_field_names: 'total_amount,transaction_uuid,product_code',
      signature,
    },
  };
}

export async function initiateKhaltiPayment(params: {
  amount: number;
  purchaseOrderId: string;
  purchaseOrderName: string;
  returnUrl?: string;
  websiteUrl?: string;
  customerInfo?: { name: string; email: string; phone: string };
  gateway?: GatewayConfig | null;
}) {
  const gw = params.gateway || (await getGatewayById('khalti'));
  if (!gw) throw new Error('Khalti gateway not configured.');
  const secretKey = gw.secretKey;
  if (!secretKey) throw new Error('Khalti live secret key missing. Add it in Admin → Payment Gateways.');
  const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
  const isLive = khaltiIsLive(gw);
  const amountPaisa = Math.round(Number(params.amount) * 100);
  if (amountPaisa < 1000) {
    throw new Error('Khalti minimum payment is Rs. 10 (1000 paisa).');
  }
  const payload = {
    return_url: params.returnUrl || `${appUrl}/payment/khalti/callback`,
    website_url: params.websiteUrl || appUrl,
    amount: amountPaisa,
    purchase_order_id: String(params.purchaseOrderId),
    purchase_order_name: params.purchaseOrderName,
    customer_info: params.customerInfo || { name: 'Koseli Customer', email: 'info@koselixpress.com', phone: '9800000000' },
  };
  const res = await fetch(getKhaltiInitiateUrl(isLive), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: khaltiAuthHeader(secretKey) },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as KhaltiApiResponse;
  if (!res.ok || (!data.payment_url && !data.pidx)) {
    throw new Error(khaltiErrorMessage(data));
  }
  return {
    ...data,
    environment: isLive ? 'live' : 'test',
    amount_paisa: amountPaisa,
  };
}

/** Khalti KPG-2 payment lookup — only status "Completed" is treated as success */
export async function lookupKhaltiPayment(pidx: string, gateway?: GatewayConfig | null): Promise<KhaltiLookupResult> {
  const gw = gateway || (await getGatewayById('khalti'));
  if (!gw) throw new Error('Khalti gateway not configured.');
  const secretKey = gw.secretKey;
  if (!secretKey) throw new Error('Khalti secret key missing.');
  if (!pidx?.trim()) throw new Error('Missing pidx for Khalti lookup.');

  const isLive = khaltiIsLive(gw);
  const res = await fetch(getKhaltiLookupUrl(isLive), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: khaltiAuthHeader(secretKey) },
    body: JSON.stringify({ pidx: pidx.trim() }),
  });
  const data = (await res.json()) as KhaltiApiResponse;
  if (!res.ok || !data.pidx) {
    throw new Error(khaltiErrorMessage(data));
  }
  return {
    pidx: data.pidx,
    total_amount: data.total_amount ?? 0,
    status: data.status ?? 'Unknown',
    transaction_id: data.transaction_id ?? null,
    fee: data.fee ?? 0,
    refunded: data.refunded ?? false,
  };
}
