import { PaymentError } from '../types/payment.types.js';

const SUPPORTED_CURRENCIES = new Set(['NPR', 'USD']);

export function validateCreatePaymentInput(input: {
  orderId?: string;
  orderRef?: string;
  gateway?: string;
  amount?: number;
  currency?: string;
}): void {
  if (!input.orderId?.trim()) {
    throw new PaymentError('Order ID is required.', 'INVALID_ORDER_ID', 400);
  }
  if (!input.orderRef?.trim()) {
    throw new PaymentError('Order reference is required.', 'INVALID_ORDER_REF', 400);
  }
  if (!input.gateway?.trim()) {
    throw new PaymentError('Payment gateway is required.', 'INVALID_GATEWAY', 400);
  }
  if (typeof input.amount !== 'number' || Number.isNaN(input.amount) || input.amount <= 0) {
    throw new PaymentError('Amount must be a positive number.', 'INVALID_AMOUNT', 400);
  }
  if (!input.currency?.trim() || !SUPPORTED_CURRENCIES.has(input.currency.toUpperCase())) {
    throw new PaymentError('Unsupported currency. Supported: NPR, USD.', 'INVALID_CURRENCY', 400);
  }
}

export function validateVerifyPaymentInput(input: {
  gateway?: string;
  paymentId?: string;
  orderRef?: string;
  gatewayReference?: string;
}): void {
  if (!input.gateway?.trim()) {
    throw new PaymentError('Gateway is required for verification.', 'INVALID_GATEWAY', 400);
  }
  if (!input.paymentId?.trim() && !input.orderRef?.trim() && !input.gatewayReference?.trim()) {
    throw new PaymentError('Provide paymentId, orderRef, or gatewayReference.', 'INVALID_VERIFY_INPUT', 400);
  }
}

export function assertAmountMatch(expected: number, actual: number, tolerance = 0.01): void {
  if (Math.abs(Number(expected) - Number(actual)) > tolerance) {
    throw new PaymentError(
      `Amount mismatch: expected ${expected}, got ${actual}.`,
      'AMOUNT_MISMATCH',
      409,
    );
  }
}

export function sanitizeGatewayId(gateway: string): string {
  return gateway.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
}
