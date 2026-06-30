import {
  GatewayConfigRecord,
  GatewayEnvironmentCredentialMap,
  GatewayEnvironmentCredentials,
  LegacyPaymentGateway,
  ResolvedGatewayConfig,
} from '../types/payment-config.types.js';
import { GatewayCredentials, PaymentEnvironment } from '../types/payment.types.js';
import { getDefaultGatewayBaseUrl } from '../constants/gateway-urls.js';
import { getAppBaseUrl, getPaymentCallbackUrl, getPaymentFailureUrl } from '../utils/app-url.util.js';

const SANDBOX_ALIASES = new Set(['sandbox', 'test', 'uat', 'development']);
const LIVE_ALIASES = new Set(['live', 'production', 'prod']);

export function normalizePaymentEnvironment(value: unknown): PaymentEnvironment {
  const v = String(value || 'sandbox').toLowerCase();
  if (LIVE_ALIASES.has(v)) return 'live';
  return 'sandbox';
}

export function isLivePaymentEnvironment(env: PaymentEnvironment | string): boolean {
  return LIVE_ALIASES.has(String(env).toLowerCase());
}

function pickAdminThenEnv(adminValue: string | undefined, envValue: string | undefined): string {
  const admin = String(adminValue || '').trim();
  if (admin) return admin;
  return String(envValue || '').trim();
}

function parseExtraCredentialMap(extra?: Record<string, string>): GatewayEnvironmentCredentialMap {
  if (!extra) return {};
  const read = (prefix: 'sandbox' | 'live', field: string) => extra[`${prefix}${field}`] || extra[`${prefix}_${field}`] || '';
  const build = (prefix: 'sandbox' | 'live'): GatewayEnvironmentCredentials => ({
    merchantCode: read(prefix, 'MerchantCode') || read(prefix, 'MerchantId'),
    merchantId: read(prefix, 'MerchantId') || read(prefix, 'MerchantCode'),
    secretKey: read(prefix, 'SecretKey'),
    publicKey: read(prefix, 'PublicKey'),
    clientId: read(prefix, 'ClientId'),
    clientSecret: read(prefix, 'ClientSecret'),
    baseUrl: read(prefix, 'BaseUrl'),
    successUrl: read(prefix, 'SuccessUrl'),
    failureUrl: read(prefix, 'FailureUrl'),
    callbackUrl: read(prefix, 'CallbackUrl'),
    username: read(prefix, 'Username'),
    password: read(prefix, 'Password'),
  });
  const sandbox = build('sandbox');
  const live = build('live');
  const map: GatewayEnvironmentCredentialMap = {};
  if (Object.values(sandbox).some(Boolean)) map.sandbox = sandbox;
  if (Object.values(live).some(Boolean)) map.live = live;
  return map;
}

function mergeCredentialMaps(...maps: GatewayEnvironmentCredentialMap[]): GatewayEnvironmentCredentialMap {
  const out: GatewayEnvironmentCredentialMap = {};
  for (const map of maps) {
    for (const env of ['sandbox', 'live'] as const) {
      if (!map[env]) continue;
      const prev = out[env] || {};
      const next = map[env]!;
      out[env] = {
        ...prev,
        ...Object.fromEntries(Object.entries(next).filter(([, v]) => String(v || '').trim() !== '')),
      };
    }
  }
  return out;
}

function legacyToCredentialMap(raw: LegacyPaymentGateway): GatewayEnvironmentCredentialMap {
  const envKey = normalizePaymentEnvironment(raw.apiEnvironment) === 'live' ? 'live' : 'sandbox';
  const set: GatewayEnvironmentCredentials = {
    merchantCode: String(raw.merchantId || '').trim(),
    merchantId: String(raw.merchantId || '').trim(),
    secretKey: String(raw.secretKey || '').trim(),
    publicKey: String(raw.publicKey || '').trim(),
    clientId: String(raw.extraSettings?.clientId || '').trim(),
    clientSecret: String(raw.extraSettings?.clientSecret || '').trim(),
    baseUrl: String(raw.extraSettings?.baseUrl || '').trim(),
    successUrl: String(raw.extraSettings?.successUrl || '').trim(),
    failureUrl: String(raw.extraSettings?.failureUrl || '').trim(),
    callbackUrl: String(raw.extraSettings?.callbackUrl || '').trim(),
    username: String(raw.extraSettings?.fonepayUsername || raw.extraSettings?.apiUsername || '').trim(),
    password: String(raw.extraSettings?.fonepayPassword || raw.extraSettings?.apiPassword || '').trim(),
  };
  return { [envKey]: set };
}

function envDefaultsForGateway(gatewayName: string): GatewayConfigRecord | null {
  const g = gatewayName.toLowerCase();
  const appBase = getAppBaseUrl();

  if (g === 'esewa') {
    const sandbox = {
      merchantCode: process.env.ESEWA_SANDBOX_MERCHANT_CODE || process.env.ESEWA_MERCHANT_CODE || '',
      secretKey: process.env.ESEWA_SANDBOX_SECRET_KEY || (process.env.ESEWA_ENV !== 'live' ? process.env.ESEWA_SECRET_KEY || '' : ''),
    };
    const live = {
      merchantCode: process.env.ESEWA_LIVE_MERCHANT_CODE || (process.env.ESEWA_ENV === 'live' ? process.env.ESEWA_MERCHANT_CODE || '' : ''),
      secretKey: process.env.ESEWA_LIVE_SECRET_KEY || (process.env.ESEWA_ENV === 'live' ? process.env.ESEWA_SECRET_KEY || '' : ''),
    };
    return {
      gatewayName: 'esewa',
      environment: normalizePaymentEnvironment(process.env.ESEWA_ENV),
      isActive: process.env.ESEWA_ENABLED === 'true',
      environmentCredentials: { sandbox, live },
      callbackUrl: `${appBase}/payment/esewa/success`,
      successUrl: `${appBase}/payment/esewa/success`,
      failureUrl: `${appBase}/payment/esewa/failure`,
    };
  }

  if (g === 'khalti') {
    const sandbox = {
      secretKey: process.env.KHALTI_SANDBOX_SECRET_KEY || (process.env.KHALTI_ENV !== 'live' ? process.env.KHALTI_SECRET_KEY || '' : ''),
      publicKey: process.env.KHALTI_SANDBOX_PUBLIC_KEY || (process.env.KHALTI_ENV !== 'live' ? process.env.KHALTI_PUBLIC_KEY || '' : ''),
    };
    const live = {
      secretKey: process.env.KHALTI_LIVE_SECRET_KEY || (process.env.KHALTI_ENV === 'live' ? process.env.KHALTI_SECRET_KEY || '' : ''),
      publicKey: process.env.KHALTI_LIVE_PUBLIC_KEY || (process.env.KHALTI_ENV === 'live' ? process.env.KHALTI_PUBLIC_KEY || '' : ''),
    };
    return {
      gatewayName: 'khalti',
      environment: normalizePaymentEnvironment(process.env.KHALTI_ENV),
      isActive: process.env.KHALTI_ENABLED === 'true',
      environmentCredentials: { sandbox, live },
      callbackUrl: `${appBase}/payment/khalti/callback`,
    };
  }

  return null;
}

export function buildGatewayConfigRecord(
  gatewayName: string,
  sources: {
    mongo?: Partial<GatewayConfigRecord> | null;
    legacy?: LegacyPaymentGateway | null;
    env?: GatewayConfigRecord | null;
  },
): GatewayConfigRecord {
  const envDefault = sources.env || envDefaultsForGateway(gatewayName);
  const legacy = sources.legacy;
  const mongo = sources.mongo;

  const activeEnvironment = normalizePaymentEnvironment(
    mongo?.environment ?? legacy?.apiEnvironment ?? envDefault?.environment ?? 'sandbox',
  );

  const credentialMaps = mergeCredentialMaps(
    envDefault?.environmentCredentials || {},
    legacy ? legacyToCredentialMap(legacy) : {},
    parseExtraCredentialMap(legacy?.extraSettings),
    mongo?.environmentCredentials || {},
    parseExtraCredentialMap(mongo?.extraSettings as Record<string, string>),
  );

  // Legacy flat admin fields apply to whichever environment admin last saved under
  if (legacy?.merchantId || legacy?.secretKey) {
    const key = normalizePaymentEnvironment(legacy.apiEnvironment) === 'live' ? 'live' : 'sandbox';
    credentialMaps[key] = {
      ...(credentialMaps[key] || {}),
      merchantCode: String(legacy.merchantId || credentialMaps[key]?.merchantCode || ''),
      secretKey: String(legacy.secretKey || credentialMaps[key]?.secretKey || ''),
      publicKey: String(legacy.publicKey || credentialMaps[key]?.publicKey || ''),
    };
  }

  if (mongo?.merchantCode || mongo?.secretKey) {
    const key = normalizePaymentEnvironment(mongo.environment) === 'live' ? 'live' : 'sandbox';
    credentialMaps[key] = {
      ...(credentialMaps[key] || {}),
      merchantCode: mongo.merchantCode || credentialMaps[key]?.merchantCode,
      secretKey: mongo.secretKey || credentialMaps[key]?.secretKey,
      publicKey: mongo.publicKey || credentialMaps[key]?.publicKey,
    };
  }

  const isActive =
    mongo?.isActive ??
    legacy?.isEnabled ??
    envDefault?.isActive ??
    false;

  let environment = activeEnvironment;
  const flatMerchant = String(legacy?.merchantId || mongo?.merchantCode || '').trim();
  if (flatMerchant === 'EPAYTEST') environment = 'sandbox';

  return {
    gatewayName,
    environment,
    isActive: Boolean(isActive),
    environmentCredentials: credentialMaps,
    merchantCode: mongo?.merchantCode || legacy?.merchantId || '',
    secretKey: mongo?.secretKey || legacy?.secretKey || '',
    publicKey: mongo?.publicKey || legacy?.publicKey || '',
    username: mongo?.username || '',
    password: mongo?.password || '',
    callbackUrl: pickAdminThenEnv(mongo?.callbackUrl || legacy?.extraSettings?.callbackUrl, envDefault?.callbackUrl) || getPaymentCallbackUrl(gatewayName),
    verifyUrl: pickAdminThenEnv(mongo?.verifyUrl, process.env.PAYMENT_VERIFY_URL),
    successUrl: pickAdminThenEnv(mongo?.successUrl || legacy?.extraSettings?.successUrl, envDefault?.successUrl) || getPaymentCallbackUrl(gatewayName),
    failureUrl: pickAdminThenEnv(mongo?.failureUrl || legacy?.extraSettings?.failureUrl, envDefault?.failureUrl) || getPaymentFailureUrl(gatewayName),
    extraSettings: {
      ...(envDefault?.extraSettings || {}),
      ...(legacy?.extraSettings || {}),
      ...(mongo?.extraSettings as Record<string, string> | undefined),
    },
  };
}

export function resolveGatewayConfig(record: GatewayConfigRecord): ResolvedGatewayConfig {
  const isLive = isLivePaymentEnvironment(record.environment);
  const envKey = isLive ? 'live' : 'sandbox';
  const envCreds = record.environmentCredentials[envKey] || {};
  const envFallback = record.environmentCredentials[envKey] || record.environmentCredentials.sandbox || record.environmentCredentials.live || {};

  const envDefaults = envDefaultsForGateway(record.gatewayName);
  const envBucket = envDefaults?.environmentCredentials?.[envKey] || {};

  let adminUsed = false;
  const take = (adminVal: string | undefined, envVal: string | undefined, fallback = '') => {
    const admin = String(adminVal || '').trim();
    if (admin) {
      adminUsed = true;
      return admin;
    }
    const envV = String(envVal || '').trim();
    return envV || fallback;
  };

  const merchantCode = take(
    envCreds.merchantCode || envCreds.merchantId || record.merchantCode,
    envBucket.merchantCode || envBucket.merchantId,
  );
  const secretKey = take(envCreds.secretKey || record.secretKey, envBucket.secretKey);
  const publicKey = take(envCreds.publicKey || record.publicKey, envBucket.publicKey);
  const clientId = take(envCreds.clientId, envBucket.clientId);
  const clientSecret = take(envCreds.clientSecret, envBucket.clientSecret);
  const username = take(envCreds.username || record.username, envBucket.username);
  const password = take(envCreds.password || record.password, envBucket.password);

  const defaultBase = getDefaultGatewayBaseUrl(record.gatewayName, isLive);
  const baseUrl = take(envCreds.baseUrl, envBucket.baseUrl, defaultBase);
  const callbackUrl = take(envCreds.callbackUrl || record.callbackUrl, envDefaults?.callbackUrl, getPaymentCallbackUrl(record.gatewayName));
  const successUrl = take(envCreds.successUrl || record.successUrl, envDefaults?.successUrl, getPaymentCallbackUrl(record.gatewayName));
  const failureUrl = take(envCreds.failureUrl || record.failureUrl, envDefaults?.failureUrl, getPaymentFailureUrl(record.gatewayName));
  const verifyUrl = take(record.verifyUrl, process.env.PAYMENT_VERIFY_URL);

  return {
    gatewayName: record.gatewayName,
    environment: record.environment,
    isActive: record.isActive,
    merchantCode,
    secretKey,
    publicKey,
    clientId,
    clientSecret,
    username,
    password,
    baseUrl,
    callbackUrl,
    successUrl,
    failureUrl,
    verifyUrl,
    extraSettings: record.extraSettings || {},
    configSource: adminUsed ? (envBucket.secretKey || envBucket.merchantCode ? 'mixed' : 'admin') : 'env',
  };
}

export function toGatewayCredentials(resolved: ResolvedGatewayConfig): GatewayCredentials {
  return {
    id: resolved.gatewayName,
    gatewayName: resolved.gatewayName,
    merchantCode: resolved.merchantCode,
    publicKey: resolved.publicKey,
    secretKey: resolved.secretKey,
    username: resolved.username,
    password: resolved.password,
    callbackUrl: resolved.callbackUrl,
    verifyUrl: resolved.verifyUrl,
    environment: resolved.environment,
    isActive: resolved.isActive,
    extraSettings: {
      ...resolved.extraSettings,
      baseUrl: resolved.baseUrl,
      successUrl: resolved.successUrl,
      failureUrl: resolved.failureUrl,
      clientId: resolved.clientId,
      clientSecret: resolved.clientSecret,
      configSource: resolved.configSource,
    },
  };
}

export function legacyGatewayToMongoUpdate(raw: LegacyPaymentGateway): Partial<GatewayConfigRecord> {
  const env = normalizePaymentEnvironment(raw.apiEnvironment);
  const envKey = env === 'live' ? 'live' : 'sandbox';
  const creds: GatewayEnvironmentCredentials = {
    merchantCode: String(raw.merchantId || ''),
    merchantId: String(raw.merchantId || ''),
    secretKey: String(raw.secretKey || ''),
    publicKey: String(raw.publicKey || ''),
    clientId: String(raw.extraSettings?.clientId || raw.extraSettings?.[`${envKey}ClientId`] || ''),
    clientSecret: String(raw.extraSettings?.clientSecret || raw.extraSettings?.[`${envKey}ClientSecret`] || ''),
    baseUrl: String(raw.extraSettings?.baseUrl || raw.extraSettings?.[`${envKey}BaseUrl`] || ''),
    successUrl: String(raw.extraSettings?.successUrl || raw.extraSettings?.[`${envKey}SuccessUrl`] || ''),
    failureUrl: String(raw.extraSettings?.failureUrl || raw.extraSettings?.[`${envKey}FailureUrl`] || ''),
    callbackUrl: String(raw.extraSettings?.callbackUrl || raw.extraSettings?.[`${envKey}CallbackUrl`] || ''),
  };

  return {
    gatewayName: raw.id,
    environment: env,
    isActive: Boolean(raw.isEnabled),
    environmentCredentials: { [envKey]: creds },
    merchantCode: creds.merchantCode,
    secretKey: creds.secretKey,
    publicKey: creds.publicKey,
    extraSettings: raw.extraSettings,
  };
}

export class PaymentConfigService {
  resolveRecord(record: GatewayConfigRecord): ResolvedGatewayConfig {
    return resolveGatewayConfig(record);
  }

  toCredentials(record: GatewayConfigRecord): GatewayCredentials {
    return toGatewayCredentials(resolveGatewayConfig(record));
  }

  buildRecord(
    gatewayName: string,
    sources: Parameters<typeof buildGatewayConfigRecord>[1],
  ): GatewayConfigRecord {
    return buildGatewayConfigRecord(gatewayName, sources);
  }
}

export const paymentConfigService = new PaymentConfigService();
