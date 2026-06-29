export enum PaymentStatus {
  Pending = 'pending',
  Processing = 'processing',
  Success = 'success',
  Failed = 'failed',
  Cancelled = 'cancelled',
  Expired = 'expired',
  Refunded = 'refunded',
  PartiallyRefunded = 'partially_refunded',
}

export type PaymentEnvironment = 'sandbox' | 'test' | 'live' | 'production';

export interface GatewayCredentials {
  id: string;
  gatewayName: string;
  merchantCode: string;
  publicKey: string;
  secretKey: string;
  username: string;
  password: string;
  callbackUrl: string;
  verifyUrl: string;
  environment: PaymentEnvironment;
  isActive: boolean;
  extraSettings?: Record<string, string>;
}

export interface CreatePaymentDto {
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
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface VerifyPaymentDto {
  paymentId?: string;
  orderRef?: string;
  gateway: string;
  gatewayReference?: string;
  amount?: number;
  currency?: string;
  rawPayload?: Record<string, unknown>;
}

export interface InitializePaymentResult {
  paymentId: string;
  status: PaymentStatus;
  redirectUrl?: string;
  formAction?: string;
  formFields?: Record<string, string>;
  gatewayReference?: string;
  raw?: unknown;
}

export interface VerifyPaymentResult {
  verified: boolean;
  status: PaymentStatus;
  transactionId?: string;
  gatewayReference?: string;
  amount?: number;
  currency?: string;
  paidAt?: Date;
  raw?: unknown;
}

export interface RefundPaymentResult {
  success: boolean;
  refundId?: string;
  status: PaymentStatus;
  message?: string;
}

export interface WebhookHandleResult {
  accepted: boolean;
  duplicate: boolean;
  paymentId?: string;
  status?: PaymentStatus;
}

export interface TestConnectionResult {
  ok: boolean;
  message: string;
  details?: unknown;
}

export interface PaymentGatewayAdapter {
  readonly gatewayId: string;
  initializePayment(credentials: GatewayCredentials, input: CreatePaymentDto): Promise<InitializePaymentResult>;
  verifyPayment(credentials: GatewayCredentials, input: VerifyPaymentDto): Promise<VerifyPaymentResult>;
  checkStatus(credentials: GatewayCredentials, gatewayReference: string): Promise<VerifyPaymentResult>;
  refundPayment(credentials: GatewayCredentials, gatewayReference: string, amount: number): Promise<RefundPaymentResult>;
  handleWebhook(credentials: GatewayCredentials, payload: Record<string, unknown>, headers: Record<string, string>): Promise<WebhookHandleResult>;
  testConnection(credentials: GatewayCredentials): Promise<TestConnectionResult>;
}

export class PaymentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}
