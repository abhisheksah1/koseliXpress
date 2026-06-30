export function getAppBaseUrl(): string {
  return process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
}

export function getPaymentCallbackUrl(gateway: string): string {
  const base = process.env.PAYMENT_CALLBACK_URL || getAppBaseUrl();
  const map: Record<string, string> = {
    esewa: `${base}/payment/esewa/success`,
    khalti: `${base}/payment/khalti/callback`,
    nps: `${base}/payment/nps/callback`,
    card: `${base}/payment/nps/callback`,
    fonepay: `${base}/payment/fonepay/callback`,
  };
  return map[gateway] || `${base}/payment/callback/${gateway}`;
}

/** OnePG server-to-server Notification URL (register with NPS team) */
export function getNpsNotificationUrl(): string {
  const base = process.env.PAYMENT_WEBHOOK_URL || process.env.BACKEND_URL || process.env.APP_URL || 'http://localhost:3001';
  return `${base.replace(/\/$/, '')}/api/payment/nps/notification`;
}

export function getPaymentFailureUrl(gateway: string): string {
  const base = process.env.PAYMENT_CALLBACK_URL || getAppBaseUrl();
  return `${base}/payment/${gateway}/failure`;
}

export function isLiveEnvironment(env: string): boolean {
  return env === 'live' || env === 'production' || env === 'prod';
}
