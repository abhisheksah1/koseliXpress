import { ApiStoreModel, ApiStoreDocument } from '../models/ApiStore.js';
import { isMongoConnected } from '../config/db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_STORE_DIR = path.resolve(__dirname, '../../.local-store');
const LOCAL_API_STORE_FILE = path.join(LOCAL_STORE_DIR, 'api-store.json');

async function readLocalApiStore(): Promise<ApiStoreData> {
  try {
    const raw = await fs.readFile(LOCAL_API_STORE_FILE, 'utf8');
    return { ...getDefaultApiStore(), ...(JSON.parse(raw) as Partial<ApiStoreData>) };
  } catch {
    return getDefaultApiStore();
  }
}

async function writeLocalApiStore(data: ApiStoreData): Promise<void> {
  await fs.mkdir(LOCAL_STORE_DIR, { recursive: true });
  await fs.writeFile(LOCAL_API_STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
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
  if (!isMongoConnected()) {
    return readLocalApiStore();
  }

  let doc = await ApiStoreModel.findOne({ key: 'main' });

  if (!doc) {
    doc = await ApiStoreModel.create({ key: 'main', ...getDefaultApiStore() });
    console.log('ApiStore initialized in MongoDB with empty defaults');
  }

  return toPlainStore(doc);
}

export async function saveApiStore(data: ApiStoreData): Promise<void> {
  if (!isMongoConnected()) {
    await writeLocalApiStore(data);
    return;
  }

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
