export const GATEWAY_IDS = {
  ESEWA: 'esewa',
  KHALTI: 'khalti',
  FONEPAY_STATIC: 'fonepay_static',
  FONEPAY_DYNAMIC: 'fonepay_dynamic',
  FONEPAY: 'fonepay',
  CARD: 'card',
  NPS: 'nps',
} as const;

export const CONFIG_CACHE_TTL_MS = 60_000;

export const PAYMENT_RATE_LIMIT = {
  windowMs: 60_000,
  /** Checkout/initiate only — admin sync routes are not rate limited */
  maxRequests: process.env.NODE_ENV === 'production' ? 40 : 120,
};

export const VERIFY_RETRY = {
  maxAttempts: 3,
  baseDelayMs: 500,
};

export const TERMINAL_STATUSES = new Set(['success', 'failed', 'cancelled', 'expired', 'refunded']);

export const GATEWAY_LOGO_URLS: Record<string, string> = {
  esewa: 'https://esewa.com.np/common/images/esewa_logo.png',
  khalti: 'https://blog.khalti.com/wp-content/uploads/2021/01/khalti-logo.png',
  fonepay: 'https://brandessentials.org/wp-content/uploads/2023/12/fonepay-logo.png',
  fonepay_static: 'https://brandessentials.org/wp-content/uploads/2023/12/fonepay-logo.png',
  fonepay_dynamic: 'https://brandessentials.org/wp-content/uploads/2023/12/fonepay-logo.png',
  card: '',
  nps: '',
};
