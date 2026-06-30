/** Default API / form base URLs per gateway — overridden by admin baseUrl when set */

export const GATEWAY_DEFAULT_URLS: Record<
  string,
  { sandbox: { baseUrl: string; successPath?: string; failurePath?: string }; live: { baseUrl: string; successPath?: string; failurePath?: string } }
> = {
  esewa: {
    sandbox: {
      baseUrl: 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
      successPath: '/payment/esewa/success',
      failurePath: '/payment/esewa/failure',
    },
    live: {
      baseUrl: 'https://epay.esewa.com.np/api/epay/main/v2/form',
      successPath: '/payment/esewa/success',
      failurePath: '/payment/esewa/failure',
    },
  },
  khalti: {
    sandbox: { baseUrl: 'https://dev.khalti.com/api/v2' },
    live: { baseUrl: 'https://khalti.com/api/v2' },
  },
  nps: {
    sandbox: { baseUrl: 'https://apisandbox.nepalpayment.com' },
    live: { baseUrl: 'https://api.nepalpayment.com' },
  },
  card: {
    sandbox: { baseUrl: 'https://apisandbox.nepalpayment.com' },
    live: { baseUrl: 'https://api.nepalpayment.com' },
  },
};

export function getDefaultGatewayBaseUrl(gatewayName: string, isLive: boolean): string {
  const defaults = GATEWAY_DEFAULT_URLS[gatewayName] || GATEWAY_DEFAULT_URLS[gatewayName.replace('_static', '').replace('_dynamic', '')];
  if (!defaults) return '';
  return isLive ? defaults.live.baseUrl : defaults.sandbox.baseUrl;
}

export function getEsewaStatusBaseUrl(isLive: boolean): string {
  return isLive
    ? 'https://esewa.com.np/api/epay/transaction/status/'
    : 'https://rc.esewa.com.np/api/epay/transaction/status/';
}

export function getNpsHostedUrl(isLive: boolean): string {
  return isLive
    ? 'https://gateway.nepalpayment.com/Payment/Index'
    : 'https://gatewaysandbox.nepalpayment.com/Payment/Index';
}
