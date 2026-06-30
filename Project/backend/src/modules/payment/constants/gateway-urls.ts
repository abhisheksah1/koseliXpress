/** Gateway URLs — read from .env first; code fallbacks only when env is empty */

const URL_FALLBACKS = {
  esewaForm: {
    sandbox: 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
    live: 'https://epay.esewa.com.np/api/epay/main/v2/form',
  },
  esewaStatus: {
    sandbox: 'https://rc.esewa.com.np/api/epay/transaction/status/',
    live: 'https://esewa.com.np/api/epay/transaction/status/',
  },
  khaltiApi: {
    sandbox: 'https://dev.khalti.com/api/v2',
    live: 'https://khalti.com/api/v2',
  },
  npsApi: {
    sandbox: 'https://apisandbox.nepalpayment.com',
    live: 'https://api.nepalpayment.com',
  },
  npsGateway: {
    sandbox: 'https://gatewaysandbox.nepalpayment.com/Payment/Index',
    live: 'https://gateway.nepalpayment.com/Payment/Index',
  },
} as const;

function resolveEnvUrl(envKey: string, isLive: boolean, sandbox: string, live: string): string {
  const fromEnv = String(process.env[envKey] || '').trim();
  if (fromEnv) return fromEnv;
  return isLive ? live : sandbox;
}

export function getEsewaFormUrl(isLive: boolean): string {
  return resolveEnvUrl('ESEWA_FORM_URL', isLive, URL_FALLBACKS.esewaForm.sandbox, URL_FALLBACKS.esewaForm.live);
}

export function getEsewaStatusBaseUrl(isLive: boolean): string {
  return resolveEnvUrl('ESEWA_STATUS_URL', isLive, URL_FALLBACKS.esewaStatus.sandbox, URL_FALLBACKS.esewaStatus.live);
}

export function getKhaltiApiBaseUrl(isLive: boolean): string {
  return resolveEnvUrl('KHALTI_API_URL', isLive, URL_FALLBACKS.khaltiApi.sandbox, URL_FALLBACKS.khaltiApi.live);
}

export function getNpsApiBaseUrl(isLive: boolean): string {
  return resolveEnvUrl('NPS_API_URL', isLive, URL_FALLBACKS.npsApi.sandbox, URL_FALLBACKS.npsApi.live);
}

export function getNpsApiUrl(isLive: boolean, path: string): string {
  const base = getNpsApiBaseUrl(isLive).replace(/\/$/, '');
  return `${base}/${path.replace(/^\//, '')}`;
}

export function getNpsHostedUrl(isLive: boolean): string {
  return resolveEnvUrl('NPS_GATEWAY_URL', isLive, URL_FALLBACKS.npsGateway.sandbox, URL_FALLBACKS.npsGateway.live);
}

export function getFonepayGatewayUrl(isLive: boolean): string {
  return resolveEnvUrl('FONEPAY_GATEWAY_URL', isLive, '', '');
}

export function getDefaultGatewayBaseUrl(gatewayName: string, isLive: boolean): string {
  const g = gatewayName.replace('_static', '').replace('_dynamic', '');
  if (g === 'esewa') return getEsewaFormUrl(isLive);
  if (g === 'khalti') return getKhaltiApiBaseUrl(isLive);
  if (g === 'nps' || g === 'card') return getNpsApiBaseUrl(isLive);
  if (g === 'fonepay') return getFonepayGatewayUrl(isLive);
  return '';
}
