import { getApiStore } from '../../../services/apiStoreService.js';
import { isMongoConnected } from '../../../config/db.js';
import { PaymentGatewayConfigModel } from '../models/payment.models.js';
import { GatewayCredentials, PaymentEnvironment } from '../types/payment.types.js';
import { CONFIG_CACHE_TTL_MS } from '../constants/payment.constants.js';
import { getPaymentCallbackUrl } from '../utils/app-url.util.js';

type CacheEntry = { data: GatewayCredentials[]; expiresAt: number };
let configCache: CacheEntry | null = null;

function envToCredentials(): GatewayCredentials[] {
  const items: GatewayCredentials[] = [];

  const push = (
    gatewayName: string,
    merchantCode: string,
    secretKey: string,
    publicKey: string,
    username: string,
    password: string,
    environment: PaymentEnvironment,
    isActive: boolean,
    extraSettings?: Record<string, string>,
  ) => {
    if (!merchantCode && !secretKey && !publicKey && !username) return;
    items.push({
      id: gatewayName,
      gatewayName,
      merchantCode,
      publicKey,
      secretKey,
      username,
      password,
      callbackUrl: getPaymentCallbackUrl(gatewayName),
      verifyUrl: process.env.PAYMENT_VERIFY_URL || '',
      environment,
      isActive,
      extraSettings,
    });
  };

  push(
    'esewa',
    process.env.ESEWA_MERCHANT_CODE || '',
    process.env.ESEWA_SECRET_KEY || '',
    '',
    '',
    '',
    (process.env.ESEWA_ENV === 'live' ? 'live' : 'sandbox') as PaymentEnvironment,
    process.env.ESEWA_ENABLED === 'true',
  );
  push(
    'khalti',
    process.env.KHALTI_PUBLIC_KEY || '',
    process.env.KHALTI_SECRET_KEY || '',
    process.env.KHALTI_PUBLIC_KEY || '',
    '',
    '',
    (process.env.KHALTI_ENV === 'live' ? 'live' : 'sandbox') as PaymentEnvironment,
    process.env.KHALTI_ENABLED === 'true',
  );
  push(
    'fonepay_static',
    process.env.FONEPAY_MERCHANT_CODE || '',
    '',
    '',
    process.env.FONEPAY_USERNAME || '',
    process.env.FONEPAY_PASSWORD || '',
    (process.env.FONEPAY_ENV === 'live' ? 'live' : 'sandbox') as PaymentEnvironment,
    process.env.FONEPAY_ENABLED === 'true',
    { qrImageUrl: process.env.FONEPAY_STATIC_QR_URL || '' },
  );
  push(
    'fonepay_dynamic',
    process.env.FONEPAY_MERCHANT_CODE || '',
    process.env.FONEPAY_SECRET_KEY || '',
    '',
    process.env.FONEPAY_USERNAME || '',
    process.env.FONEPAY_PASSWORD || '',
    (process.env.FONEPAY_ENV === 'live' ? 'live' : 'sandbox') as PaymentEnvironment,
    process.env.FONEPAY_ENABLED === 'true',
  );
  push(
    'nps',
    process.env.NPS_MERCHANT_ID || '',
    process.env.NPS_SECRET_KEY || '',
    process.env.CARD_PUBLIC_KEY || '',
    process.env.NPS_API_USERNAME || '',
    process.env.NPS_API_PASSWORD || '',
    (process.env.NPS_ENV === 'live' ? 'live' : 'sandbox') as PaymentEnvironment,
    process.env.NPS_ENABLED === 'true' || process.env.CARD_PROVIDER === 'nps',
    {
      merchantName: process.env.NPS_MERCHANT_NAME || '',
      apiUsername: process.env.NPS_API_USERNAME || '',
      apiPassword: process.env.NPS_API_PASSWORD || '',
    },
  );
  push(
    'card',
    process.env.NPS_MERCHANT_ID || '',
    process.env.CARD_SECRET_KEY || process.env.NPS_SECRET_KEY || '',
    process.env.CARD_PUBLIC_KEY || '',
    process.env.NPS_API_USERNAME || '',
    process.env.NPS_API_PASSWORD || '',
    (process.env.NPS_ENV === 'live' ? 'live' : 'sandbox') as PaymentEnvironment,
    process.env.NPS_ENABLED === 'true',
    { merchantName: process.env.NPS_MERCHANT_NAME || '' },
  );

  return items;
}

function mergeCredentials(db: GatewayCredentials[], env: GatewayCredentials[], legacy: unknown[]): GatewayCredentials[] {
  const byName = new Map<string, GatewayCredentials>();

  for (const item of env) byName.set(item.gatewayName, item);

  for (const raw of legacy as Array<Record<string, unknown>>) {
    const id = String(raw.id || '');
    if (!id) continue;
    const existing = byName.get(id) || byName.get(id.replace('_static', '').replace('_dynamic', ''));
    byName.set(id, {
      id,
      gatewayName: id,
      merchantCode: String(raw.merchantId || existing?.merchantCode || ''),
      publicKey: String(raw.publicKey || existing?.publicKey || ''),
      secretKey: String(raw.secretKey || existing?.secretKey || ''),
      username: String((raw.extraSettings as Record<string, string>)?.fonepayUsername || existing?.username || ''),
      password: String((raw.extraSettings as Record<string, string>)?.fonepayPassword || existing?.password || ''),
      callbackUrl: existing?.callbackUrl || getPaymentCallbackUrl(id),
      verifyUrl: existing?.verifyUrl || process.env.PAYMENT_VERIFY_URL || '',
      environment: (raw.apiEnvironment === 'live' ? 'live' : 'sandbox') as PaymentEnvironment,
      isActive: Boolean(raw.isEnabled ?? existing?.isActive),
      extraSettings: { ...(existing?.extraSettings || {}), ...((raw.extraSettings as Record<string, string>) || {}) },
    });
  }

  for (const item of db) {
    const existing = byName.get(item.gatewayName);
    byName.set(item.gatewayName, {
      ...(existing || item),
      merchantCode: item.merchantCode || existing?.merchantCode || '',
      publicKey: item.publicKey || existing?.publicKey || '',
      secretKey: item.secretKey || existing?.secretKey || '',
      username: item.username || existing?.username || '',
      password: item.password || existing?.password || '',
      callbackUrl: item.callbackUrl || existing?.callbackUrl || getPaymentCallbackUrl(item.gatewayName),
      verifyUrl: item.verifyUrl || existing?.verifyUrl || '',
      environment: item.environment || existing?.environment || 'sandbox',
      isActive: item.isActive ?? existing?.isActive ?? false,
      extraSettings: { ...(existing?.extraSettings || {}), ...(item.extraSettings || {}) },
    });
  }

  return Array.from(byName.values());
}

export class PaymentConfigRepository {
  async loadAll(force = false): Promise<GatewayCredentials[]> {
    const now = Date.now();
    if (!force && configCache && configCache.expiresAt > now) {
      return configCache.data;
    }

    const envDefaults = envToCredentials();
    let dbConfigs: GatewayCredentials[] = [];

    if (isMongoConnected()) {
      const docs = await PaymentGatewayConfigModel.find().lean();
      dbConfigs = docs.map((doc) => ({
        id: doc.gatewayName,
        gatewayName: doc.gatewayName,
        merchantCode: doc.merchantCode,
        publicKey: doc.publicKey,
        secretKey: doc.secretKey,
        username: doc.username,
        password: doc.password,
        callbackUrl: doc.callbackUrl,
        verifyUrl: doc.verifyUrl,
        environment: doc.environment as PaymentEnvironment,
        isActive: doc.isActive,
        extraSettings: doc.extraSettings as Record<string, string>,
      }));
    }

    const store = await getApiStore();
    const legacy = store.paymentGateways || [];
    const merged = mergeCredentials(dbConfigs, envDefaults, legacy);

    configCache = { data: merged, expiresAt: now + CONFIG_CACHE_TTL_MS };
    return merged;
  }

  async getByGateway(gatewayName: string, force = false): Promise<GatewayCredentials | null> {
    const all = await this.loadAll(force);
    return all.find((g) => g.gatewayName === gatewayName) || null;
  }

  invalidateCache(): void {
    configCache = null;
  }

  async upsertConfig(input: GatewayCredentials & { updatedBy?: string }): Promise<void> {
    if (isMongoConnected()) {
      await PaymentGatewayConfigModel.findOneAndUpdate(
        { gatewayName: input.gatewayName },
        {
          gatewayName: input.gatewayName,
          merchantCode: input.merchantCode,
          publicKey: input.publicKey,
          secretKey: input.secretKey,
          username: input.username,
          password: input.password,
          callbackUrl: input.callbackUrl,
          verifyUrl: input.verifyUrl,
          environment: input.environment,
          isActive: input.isActive,
          extraSettings: input.extraSettings,
          updatedBy: input.updatedBy,
        },
        { upsert: true, new: true },
      );
    }
    this.invalidateCache();
  }
}

export const paymentConfigRepository = new PaymentConfigRepository();
