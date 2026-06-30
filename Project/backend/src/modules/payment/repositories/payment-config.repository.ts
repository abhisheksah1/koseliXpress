import { getApiStore } from '../../../services/apiStoreService.js';
import { isMongoConnected } from '../../../config/db.js';
import { PaymentGatewayConfigModel } from '../models/payment.models.js';
import { GatewayCredentials } from '../types/payment.types.js';
import { CONFIG_CACHE_TTL_MS, GATEWAY_IDS } from '../constants/payment.constants.js';
import {
  buildGatewayConfigRecord,
  legacyGatewayToMongoUpdate,
  paymentConfigService,
  toGatewayCredentials,
} from '../services/payment-config.service.js';
import { GatewayConfigRecord, LegacyPaymentGateway } from '../types/payment-config.types.js';

type CacheEntry = { data: GatewayCredentials[]; expiresAt: number };
let configCache: CacheEntry | null = null;

const CORE_GATEWAYS = [GATEWAY_IDS.ESEWA, GATEWAY_IDS.KHALTI, GATEWAY_IDS.NPS, GATEWAY_IDS.FONEPAY_STATIC, GATEWAY_IDS.FONEPAY_DYNAMIC, GATEWAY_IDS.CARD];

function docToPartial(doc: Record<string, unknown>): Partial<GatewayConfigRecord> {
  return {
    gatewayName: String(doc.gatewayName || ''),
    merchantCode: String(doc.merchantCode || ''),
    publicKey: String(doc.publicKey || ''),
    secretKey: String(doc.secretKey || ''),
    username: String(doc.username || ''),
    password: String(doc.password || ''),
    callbackUrl: String(doc.callbackUrl || ''),
    verifyUrl: String(doc.verifyUrl || ''),
    successUrl: String(doc.successUrl || ''),
    failureUrl: String(doc.failureUrl || ''),
    environment: String(doc.environment || 'sandbox') as GatewayConfigRecord['environment'],
    isActive: Boolean(doc.isActive),
    environmentCredentials: (doc.environmentCredentials as GatewayConfigRecord['environmentCredentials']) || {},
    extraSettings: (doc.extraSettings as Record<string, string>) || {},
  };
}

export class PaymentConfigRepository {
  async loadAll(force = false): Promise<GatewayCredentials[]> {
    const now = Date.now();
    if (!force && configCache && configCache.expiresAt > now) {
      return configCache.data;
    }

    const store = await getApiStore();
    const legacyList = (store.paymentGateways || []) as LegacyPaymentGateway[];
    const legacyById = new Map(legacyList.map((g) => [g.id, g]));

    const mongoByName = new Map<string, Partial<GatewayConfigRecord>>();
    if (isMongoConnected()) {
      const docs = await PaymentGatewayConfigModel.find().lean();
      for (const doc of docs) {
        mongoByName.set(String(doc.gatewayName), docToPartial(doc as Record<string, unknown>));
      }
    }

    const gatewayNames = new Set<string>([...CORE_GATEWAYS, ...legacyList.map((g) => g.id), ...mongoByName.keys()]);

    const merged: GatewayCredentials[] = [];
    for (const gatewayName of gatewayNames) {
      const record = buildGatewayConfigRecord(gatewayName, {
        mongo: mongoByName.get(gatewayName) || null,
        legacy: legacyById.get(gatewayName) || null,
        env: null,
      });
      merged.push(toGatewayCredentials(paymentConfigService.resolveRecord(record)));
    }

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

  async upsertFromLegacyGateway(raw: LegacyPaymentGateway, updatedBy?: string): Promise<void> {
    if (!isMongoConnected()) return;
    const patch = legacyGatewayToMongoUpdate(raw);
    const existing = await PaymentGatewayConfigModel.findOne({ gatewayName: raw.id }).lean();
    const mergedCreds = {
      ...(existing?.environmentCredentials || {}),
      ...(patch.environmentCredentials || {}),
    };
    await PaymentGatewayConfigModel.findOneAndUpdate(
      { gatewayName: raw.id },
      {
        ...patch,
        environmentCredentials: mergedCreds,
        updatedBy,
      },
      { upsert: true, new: true },
    );
  }

  async syncLegacyGateways(gateways: LegacyPaymentGateway[], updatedBy?: string): Promise<void> {
    for (const gw of gateways) {
      if (!gw.id) continue;
      await this.upsertFromLegacyGateway(gw, updatedBy);
    }
    this.invalidateCache();
  }

  async upsertConfig(input: GatewayCredentials & { updatedBy?: string }): Promise<void> {
    if (isMongoConnected()) {
      const envKey = input.environment === 'live' ? 'live' : 'sandbox';
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
          successUrl: input.extraSettings?.successUrl || '',
          failureUrl: input.extraSettings?.failureUrl || '',
          environment: input.environment,
          isActive: input.isActive,
          extraSettings: input.extraSettings,
          updatedBy: input.updatedBy,
          [`environmentCredentials.${envKey}`]: {
            merchantCode: input.merchantCode,
            merchantId: input.merchantCode,
            secretKey: input.secretKey,
            publicKey: input.publicKey,
            baseUrl: input.extraSettings?.baseUrl || '',
            successUrl: input.extraSettings?.successUrl || '',
            failureUrl: input.extraSettings?.failureUrl || '',
            callbackUrl: input.callbackUrl,
            clientId: input.extraSettings?.clientId || '',
            clientSecret: input.extraSettings?.clientSecret || '',
          },
        },
        { upsert: true, new: true },
      );
    }
    this.invalidateCache();
  }
}

export const paymentConfigRepository = new PaymentConfigRepository();
