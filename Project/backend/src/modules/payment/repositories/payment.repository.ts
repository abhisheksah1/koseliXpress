import { isMongoConnected } from '../../../config/db.js';
import { getApiStore, saveApiStore } from '../../../services/apiStoreService.js';
import {
  PaymentRecordModel,
  PaymentTransactionModel,
  PaymentLogModel,
  PaymentWebhookModel,
  PaymentGatewayConfigModel,
  IPaymentRecord,
} from '../models/payment.models.js';
import { PaymentStatus } from '../types/payment.types.js';

const localPayments = new Map<string, IPaymentRecord>();

export class PaymentRepository {
  async createPayment(data: Partial<IPaymentRecord> & { paymentId: string }): Promise<IPaymentRecord> {
    if (isMongoConnected()) {
      return PaymentRecordModel.create(data);
    }
    const doc = { ...data, createdAt: new Date(), updatedAt: new Date() } as IPaymentRecord;
    localPayments.set(data.paymentId, doc);
    return doc;
  }

  async findByPaymentId(paymentId: string): Promise<IPaymentRecord | null> {
    if (isMongoConnected()) return (await PaymentRecordModel.findOne({ paymentId }).lean()) as unknown as IPaymentRecord | null;
    return localPayments.get(paymentId) || null;
  }

  async findByOrderRef(orderRef: string): Promise<IPaymentRecord | null> {
    if (isMongoConnected()) return (await PaymentRecordModel.findOne({ orderRef }).sort({ createdAt: -1 }).lean()) as unknown as IPaymentRecord | null;
    return [...localPayments.values()].find((p) => p.orderRef === orderRef) || null;
  }

  async findByIdempotencyKey(key: string): Promise<IPaymentRecord | null> {
    if (isMongoConnected()) return (await PaymentRecordModel.findOne({ idempotencyKey: key }).lean()) as unknown as IPaymentRecord | null;
    return [...localPayments.values()].find((p) => p.idempotencyKey === key) || null;
  }

  async updatePayment(paymentId: string, update: Partial<IPaymentRecord>): Promise<IPaymentRecord | null> {
    if (isMongoConnected()) {
      return (await PaymentRecordModel.findOneAndUpdate({ paymentId }, update, { new: true }).lean()) as unknown as IPaymentRecord | null;
    }
    const existing = localPayments.get(paymentId);
    if (!existing) return null;
    const next = { ...existing, ...update, updatedAt: new Date() } as IPaymentRecord;
    localPayments.set(paymentId, next);
    return next;
  }

  async logTransaction(entry: {
    paymentId: string;
    gateway: string;
    type: 'initiate' | 'verify' | 'webhook' | 'refund' | 'status_check';
    requestPayload?: Record<string, unknown>;
    responsePayload?: Record<string, unknown>;
    status: PaymentStatus;
    success: boolean;
    errorMessage?: string;
  }): Promise<void> {
    if (isMongoConnected()) {
      await PaymentTransactionModel.create(entry);
    }
  }

  async logWebhook(entry: {
    webhookId: string;
    gateway: string;
    eventType?: string;
    payload: Record<string, unknown>;
    signature?: string;
    processed: boolean;
    duplicate: boolean;
    paymentId?: string;
  }): Promise<boolean> {
    if (isMongoConnected()) {
      const existing = await PaymentWebhookModel.findOne({ webhookId: entry.webhookId }).lean();
      if (existing) return false;
      await PaymentWebhookModel.create(entry);
      return true;
    }
    return true;
  }

  async syncLegacyApiStoreGateways(gateways: unknown[]): Promise<void> {
    const store = await getApiStore();
    store.paymentGateways = gateways;
    await saveApiStore(store);
  }

  async getLegacyApiStoreGateways(): Promise<unknown[]> {
    const store = await getApiStore();
    return store.paymentGateways || [];
  }
}

export const paymentRepository = new PaymentRepository();
