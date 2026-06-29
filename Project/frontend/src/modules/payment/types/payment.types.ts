export enum PaymentStatus {
  Pending = 'pending',
  Processing = 'processing',
  Success = 'success',
  Failed = 'failed',
  Cancelled = 'cancelled',
  Expired = 'expired',
}

export type PaymentToastVariant = 'success' | 'error' | 'warning' | 'loading' | 'info';

export interface PaymentToastMessage {
  id: string;
  title: string;
  message?: string;
  variant: PaymentToastVariant;
}

export interface CreatePaymentRequest {
  orderId: string;
  orderRef: string;
  gateway: string;
  amount: number;
  currency: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  successUrl?: string;
  failureUrl?: string;
  returnUrl?: string;
}

export interface PaymentGatewayOption {
  id: string;
  gatewayId: string;
  displayName: string;
  logoUrl?: string;
  isSelectable: boolean;
  unavailableReason?: string;
}
