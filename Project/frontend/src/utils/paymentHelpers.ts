/** Submit eSewa v2 payment form via POST redirect */
export function submitEsewaForm(action: string, fields: Record<string, string>): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  form.style.display = 'none';
  Object.entries(fields).forEach(([key, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

export async function initiateEsewaCheckout(params: {
  amount: number;
  transactionUuid: string;
  successUrl?: string;
  failureUrl?: string;
}): Promise<void> {
  const res = await fetch('/api/payment/initiate-esewa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'eSewa initiation failed');
  submitEsewaForm(data.action, data.fields);
}

export type KhaltiCustomerInfo = {
  name: string;
  email: string;
  phone: string;
};

/** Khalti Web Checkout KPG-2 — server initiates, browser redirects to payment_url */
export async function initiateKhaltiCheckout(params: {
  amount: number;
  purchaseOrderId: string;
  purchaseOrderName: string;
  returnUrl?: string;
  websiteUrl?: string;
  customerInfo?: KhaltiCustomerInfo;
}): Promise<{ pidx?: string; payment_url?: string; environment?: string }> {
  const phoneDigits = (params.customerInfo?.phone || '').replace(/\D/g, '').slice(-10);
  const res = await fetch('/api/payment/initiate-khalti', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: params.amount,
      purchase_order_id: params.purchaseOrderId,
      purchase_order_name: params.purchaseOrderName,
      return_url: params.returnUrl || `${window.location.origin}/payment/khalti/callback`,
      website_url: params.websiteUrl || window.location.origin,
      customer_info: params.customerInfo
        ? {
            name: params.customerInfo.name,
            email: params.customerInfo.email,
            phone: phoneDigits.length === 10 ? phoneDigits : '9800000000',
          }
        : undefined,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Khalti initiation failed');
  if (data.payment_url) {
    window.location.href = data.payment_url;
    return data;
  }
  throw new Error('Khalti did not return a payment URL');
}

export type KhaltiVerifyResult = {
  pidx: string;
  total_amount: number;
  status: string;
  transaction_id: string | null;
  fee: number;
  refunded: boolean;
  verified: boolean;
  environment?: string;
};

/** Khalti KPG-2 lookup — confirm payment after callback redirect */
export async function verifyKhaltiPayment(pidx: string): Promise<KhaltiVerifyResult> {
  const res = await fetch('/api/payment/verify-khalti', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pidx }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Khalti verification failed');
  return data as KhaltiVerifyResult;
}

export type EsewaCallbackPayload = {
  transaction_uuid?: string;
  total_amount?: string | number;
  product_code?: string;
  status?: string;
  transaction_code?: string;
  signed_field_names?: string;
  signature?: string;
};

/** Decode eSewa success URL `data` query param (base64 JSON) */
export function decodeEsewaCallbackData(dataParam: string): EsewaCallbackPayload | null {
  try {
    const json = atob(dataParam.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as EsewaCallbackPayload;
  } catch {
    return null;
  }
}

export type EsewaVerifyResult = {
  status: string;
  transaction_uuid: string;
  product_code: string;
  total_amount: string;
  transaction_code?: string;
  verified: boolean;
  environment?: string;
};

/** eSewa status API — confirm payment after redirect success */
export async function verifyEsewaPayment(params: {
  transaction_uuid: string;
  total_amount: number | string;
  callbackData?: EsewaCallbackPayload;
}): Promise<EsewaVerifyResult> {
  const res = await fetch('/api/payment/verify-esewa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transaction_uuid: params.transaction_uuid,
      total_amount: params.total_amount,
      ...params.callbackData,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'eSewa verification failed');
  return data as EsewaVerifyResult;
}

export type NpsInitiateResult = {
  code: string | number;
  message?: string;
  data?: { ProcessId?: string };
  gatewayUrl?: string;
};

/** NPS OnePG — server initiates, browser redirects to hosted card page */
export async function initiateNpsCheckout(params: {
  amount: number;
  merchantTxnId: string;
}): Promise<NpsInitiateResult> {
  const res = await fetch('/api/payment/initiate-nps', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = (await res.json()) as NpsInitiateResult & { error?: string };
  if (!res.ok) throw new Error(data.error || 'NPS initiation failed');
  if (data.code !== '0' && data.code !== 0) {
    throw new Error(data.message || 'NPS gateway rejected the payment request.');
  }
  if (!data.data?.ProcessId || !data.gatewayUrl) {
    throw new Error('NPS did not return a payment session.');
  }
  return data;
}

export function redirectToNpsHostedPage(gatewayUrl: string, processId: string): void {
  window.location.href = `${gatewayUrl}?ProcessId=${encodeURIComponent(processId)}`;
}

export type NpsStatusResult = {
  code: string | number;
  message?: string;
  data?: { Status?: string; MerchantTxnId?: string; Amount?: string };
  verified?: boolean;
};

/** NPS CheckTransactionStatus after customer returns from hosted page */
export async function checkNpsPaymentStatus(merchantTxnId: string): Promise<NpsStatusResult> {
  const res = await fetch('/api/payment/check-nps-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchantTxnId }),
  });
  const data = (await res.json()) as NpsStatusResult & { error?: string };
  if (!res.ok) throw new Error(data.error || 'NPS status check failed');
  const status = String(data.data?.Status || '').toLowerCase();
  return {
    ...data,
    verified: data.code === '0' || data.code === 0
      ? status === 'success' || status === 'completed' || status === 'complete'
      : false,
  };
}

export async function testPaymentGateway(gatewayId: string): Promise<{ ok: boolean; message: string; details?: unknown }> {
  const res = await fetch(`/api/payment/test/${gatewayId}`, { method: 'POST' });
  return res.json();
}

export async function syncPaymentGateways(paymentGateways: unknown[]): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetch('/api/payment/sync-gateways', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentGateways }),
  });
  return res.json();
}
