import { CreatePaymentRequest } from '../types/payment.types';

const API_BASE = '/api/payments';
const LEGACY_BASE = '/api/payment';

async function postJson<T>(url: string, body: unknown, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
  return data as T;
}

export const paymentApi = {
  create: (payload: CreatePaymentRequest, idempotencyKey?: string) =>
    postJson(`${API_BASE}/create`, payload, idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined),

  verify: (payload: Record<string, unknown>) => postJson(`${API_BASE}/verify`, payload),

  status: (paymentId: string) => fetch(`${API_BASE}/status/${paymentId}`).then((r) => r.json()),

  gateways: () => fetch(`${API_BASE}/gateways`).then((r) => r.json()),

  // Legacy endpoints used by existing checkout flow
  legacy: {
    initiateEsewa: (body: Record<string, unknown>) => postJson(`${LEGACY_BASE}/initiate-esewa`, body),
    initiateKhalti: (body: Record<string, unknown>) => postJson(`${LEGACY_BASE}/initiate-khalti`, body),
    verifyKhalti: (pidx: string) => postJson(`${LEGACY_BASE}/verify-khalti`, { pidx }),
    verifyEsewa: (body: Record<string, unknown>) => postJson(`${LEGACY_BASE}/verify-esewa`, body),
    initiateNps: (body: Record<string, unknown>) => postJson(`${LEGACY_BASE}/initiate-nps`, body),
    checkNpsStatus: (merchantTxnId: string) => postJson(`${LEGACY_BASE}/check-nps-status`, { merchantTxnId }),
    syncGateways: (paymentGateways: unknown[]) => postJson(`${LEGACY_BASE}/sync-gateways`, { paymentGateways }),
    testGateway: (gatewayId: string) => postJson(`${LEGACY_BASE}/test/${gatewayId}`, {}),
    envStatus: () => fetch(`${LEGACY_BASE}/env-status`).then((r) => r.json()),
  },
};

export function subscribePaymentEvents(paymentId: string, onEvent: (data: { status: string; message?: string }) => void) {
  const source = new EventSource(`${API_BASE}/events/${paymentId}`);
  source.onmessage = (event) => {
    try {
      onEvent(JSON.parse(event.data));
    } catch {
      /* ignore malformed */
    }
  };
  return () => source.close();
}
