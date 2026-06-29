import mongoose, { Schema, Document } from 'mongoose';
import { PaymentStatus } from '../types/payment.types.js';

export interface IPaymentRecord extends Document {
  paymentId: string;
  orderId: string;
  orderRef: string;
  gateway: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  transactionId?: string;
  gatewayReference?: string;
  verified: boolean;
  paidAt?: Date;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentRecordSchema = new Schema<IPaymentRecord>(
  {
    paymentId: { type: String, required: true, unique: true, index: true },
    orderId: { type: String, required: true, index: true },
    orderRef: { type: String, required: true, index: true },
    gateway: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'NPR' },
    status: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.Pending, index: true },
    transactionId: { type: String, index: true },
    gatewayReference: { type: String, index: true },
    verified: { type: Boolean, default: false },
    paidAt: { type: Date },
    customerEmail: { type: String },
    customerPhone: { type: String },
    customerName: { type: String },
    idempotencyKey: { type: String, unique: true, sparse: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, collection: 'payments' },
);

export const PaymentRecordModel = (mongoose.models.PaymentRecord ||
  mongoose.model<IPaymentRecord>('PaymentRecord', PaymentRecordSchema)) as mongoose.Model<IPaymentRecord>;

export interface IPaymentTransaction extends Document {
  paymentId: string;
  gateway: string;
  type: 'initiate' | 'verify' | 'webhook' | 'refund' | 'status_check';
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  status: PaymentStatus;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

const PaymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    paymentId: { type: String, required: true, index: true },
    gateway: { type: String, required: true },
    type: { type: String, required: true },
    requestPayload: { type: Schema.Types.Mixed },
    responsePayload: { type: Schema.Types.Mixed },
    status: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.Pending },
    success: { type: Boolean, default: false },
    errorMessage: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'payment_transactions' },
);

export const PaymentTransactionModel = (mongoose.models.PaymentTransaction ||
  mongoose.model<IPaymentTransaction>('PaymentTransaction', PaymentTransactionSchema)) as mongoose.Model<IPaymentTransaction>;

export interface IPaymentLog extends Document {
  paymentId?: string;
  gateway?: string;
  level: 'info' | 'warn' | 'error';
  action: string;
  message: string;
  payload?: Record<string, unknown>;
  actor?: string;
  createdAt: Date;
}

const PaymentLogSchema = new Schema<IPaymentLog>(
  {
    paymentId: { type: String, index: true },
    gateway: { type: String, index: true },
    level: { type: String, enum: ['info', 'warn', 'error'], default: 'info' },
    action: { type: String, required: true },
    message: { type: String, required: true },
    payload: { type: Schema.Types.Mixed },
    actor: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'payment_logs' },
);

export const PaymentLogModel = (mongoose.models.PaymentLog ||
  mongoose.model<IPaymentLog>('PaymentLog', PaymentLogSchema)) as mongoose.Model<IPaymentLog>;

export interface IPaymentWebhook extends Document {
  webhookId: string;
  gateway: string;
  eventType?: string;
  payload: Record<string, unknown>;
  signature?: string;
  processed: boolean;
  duplicate: boolean;
  paymentId?: string;
  createdAt: Date;
}

const PaymentWebhookSchema = new Schema<IPaymentWebhook>(
  {
    webhookId: { type: String, required: true, unique: true, index: true },
    gateway: { type: String, required: true, index: true },
    eventType: { type: String },
    payload: { type: Schema.Types.Mixed, required: true },
    signature: { type: String },
    processed: { type: Boolean, default: false },
    duplicate: { type: Boolean, default: false },
    paymentId: { type: String, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'payment_webhooks' },
);

export const PaymentWebhookModel = (mongoose.models.PaymentWebhook ||
  mongoose.model<IPaymentWebhook>('PaymentWebhook', PaymentWebhookSchema)) as mongoose.Model<IPaymentWebhook>;

export interface IPaymentGatewayConfig extends Document {
  gatewayName: string;
  merchantCode: string;
  publicKey: string;
  secretKey: string;
  username: string;
  password: string;
  callbackUrl: string;
  verifyUrl: string;
  environment: string;
  isActive: boolean;
  extraSettings?: Record<string, string>;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentGatewayConfigSchema = new Schema<IPaymentGatewayConfig>(
  {
    gatewayName: { type: String, required: true, unique: true, index: true },
    merchantCode: { type: String, default: '' },
    publicKey: { type: String, default: '' },
    secretKey: { type: String, default: '' },
    username: { type: String, default: '' },
    password: { type: String, default: '' },
    callbackUrl: { type: String, default: '' },
    verifyUrl: { type: String, default: '' },
    environment: { type: String, default: 'sandbox' },
    isActive: { type: Boolean, default: false },
    extraSettings: { type: Schema.Types.Mixed },
    updatedBy: { type: String },
  },
  { timestamps: true, collection: 'payment_gateway_configs' },
);

export const PaymentGatewayConfigModel = (mongoose.models.PaymentGatewayConfig ||
  mongoose.model<IPaymentGatewayConfig>('PaymentGatewayConfig', PaymentGatewayConfigSchema)) as mongoose.Model<IPaymentGatewayConfig>;
