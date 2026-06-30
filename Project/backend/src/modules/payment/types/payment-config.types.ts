import { PaymentEnvironment } from './payment.types.js';

/** Credential set for one environment (sandbox or live) */
export interface GatewayEnvironmentCredentials {
  merchantCode?: string;
  merchantId?: string;
  secretKey?: string;
  publicKey?: string;
  clientId?: string;
  clientSecret?: string;
  baseUrl?: string;
  successUrl?: string;
  failureUrl?: string;
  callbackUrl?: string;
  username?: string;
  password?: string;
}

export interface GatewayEnvironmentCredentialMap {
  sandbox?: GatewayEnvironmentCredentials;
  live?: GatewayEnvironmentCredentials;
}

export interface GatewayConfigRecord {
  gatewayName: string;
  environment: PaymentEnvironment;
  isActive: boolean;
  environmentCredentials: GatewayEnvironmentCredentialMap;
  /** Legacy flat fields (admin UI single-form compat) */
  merchantCode?: string;
  secretKey?: string;
  publicKey?: string;
  username?: string;
  password?: string;
  callbackUrl?: string;
  verifyUrl?: string;
  successUrl?: string;
  failureUrl?: string;
  extraSettings?: Record<string, string>;
  updatedBy?: string;
}

export interface ResolvedGatewayConfig {
  gatewayName: string;
  environment: PaymentEnvironment;
  isActive: boolean;
  merchantCode: string;
  secretKey: string;
  publicKey: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  baseUrl: string;
  callbackUrl: string;
  successUrl: string;
  failureUrl: string;
  verifyUrl: string;
  extraSettings: Record<string, string>;
  configSource: 'admin' | 'env' | 'mixed';
}

export type LegacyPaymentGateway = {
  id: string;
  merchantId?: string;
  secretKey?: string;
  publicKey?: string;
  apiEnvironment?: 'test' | 'live';
  isEnabled?: boolean;
  extraSettings?: Record<string, string>;
};
