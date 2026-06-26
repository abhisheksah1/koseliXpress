import mongoose, { Schema } from 'mongoose';

export interface ApiStoreDocument {
  key: string;
  users: unknown[];
  logs: unknown[];
  apiOrders: unknown[];
  manualPaymentSetup: Record<string, unknown>;
  paymentGateways: unknown[];
}

const apiStoreSchema = new Schema<ApiStoreDocument>(
  {
    key: { type: String, default: 'main', unique: true },
    users: { type: [Schema.Types.Mixed], default: [] },
    logs: { type: [Schema.Types.Mixed], default: [] },
    apiOrders: { type: [Schema.Types.Mixed], default: [] },
    manualPaymentSetup: { type: Schema.Types.Mixed, default: {} },
    paymentGateways: { type: [Schema.Types.Mixed], default: [] },
  },
  { timestamps: true, collection: 'apistores' }
);

export const ApiStoreModel = mongoose.model<ApiStoreDocument>('ApiStore', apiStoreSchema);
