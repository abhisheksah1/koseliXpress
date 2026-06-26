import { ApiStoreModel, ApiStoreDocument } from '../models/ApiStore.js';

export type ApiStoreData = Omit<ApiStoreDocument, 'key'> & {
  users: unknown[];
  logs: unknown[];
  apiOrders: unknown[];
  manualPaymentSetup: Record<string, unknown>;
  paymentGateways: unknown[];
};

function getDefaultApiStore(): ApiStoreData {
  return {
    users: [],
    logs: [],
    apiOrders: [],
    manualPaymentSetup: {
      bankName: '',
      accountName: '',
      accountNumber: '',
      qrCode: '',
      instructions: '',
      whatsAppNumber: '',
    },
    paymentGateways: [],
  };
}

function toPlainStore(doc: ApiStoreDocument): ApiStoreData {
  return {
    users: doc.users || [],
    logs: doc.logs || [],
    apiOrders: doc.apiOrders || [],
    manualPaymentSetup: doc.manualPaymentSetup || getDefaultApiStore().manualPaymentSetup,
    paymentGateways: doc.paymentGateways || [],
  };
}

export async function getApiStore(): Promise<ApiStoreData> {
  let doc = await ApiStoreModel.findOne({ key: 'main' });

  if (!doc) {
    doc = await ApiStoreModel.create({ key: 'main', ...getDefaultApiStore() });
    console.log('ApiStore initialized in MongoDB with empty defaults');
  }

  return toPlainStore(doc);
}

export async function saveApiStore(data: ApiStoreData): Promise<void> {
  await ApiStoreModel.findOneAndUpdate(
    { key: 'main' },
    {
      users: data.users,
      logs: data.logs,
      apiOrders: data.apiOrders,
      manualPaymentSetup: data.manualPaymentSetup,
      paymentGateways: data.paymentGateways,
    },
    { upsert: true, new: true }
  );
}
