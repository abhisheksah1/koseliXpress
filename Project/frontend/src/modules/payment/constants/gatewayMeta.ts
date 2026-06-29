export const GATEWAY_META: Record<string, { label: string; logoUrl: string; accent: string }> = {
  cod: { label: 'Cash on Delivery', logoUrl: '', accent: 'emerald' },
  esewa: {
    label: 'eSewa',
    logoUrl: 'https://esewa.com.np/common/images/esewa_logo.png',
    accent: 'green',
  },
  khalti: {
    label: 'Khalti',
    logoUrl: 'https://blog.khalti.com/wp-content/uploads/2021/01/khalti-logo.png',
    accent: 'purple',
  },
  fonepay: {
    label: 'Fonepay',
    logoUrl: 'https://brandessentials.org/wp-content/uploads/2023/12/fonepay-logo.png',
    accent: 'red',
  },
  fonepay_static: {
    label: 'Fonepay QR',
    logoUrl: 'https://brandessentials.org/wp-content/uploads/2023/12/fonepay-logo.png',
    accent: 'red',
  },
  fonepay_dynamic: {
    label: 'Fonepay',
    logoUrl: 'https://brandessentials.org/wp-content/uploads/2023/12/fonepay-logo.png',
    accent: 'red',
  },
  nps: { label: 'Visa / Mastercard', logoUrl: '', accent: 'blue' },
  card: { label: 'Visa / Mastercard', logoUrl: '', accent: 'blue' },
};

export const PAYMENT_TOAST_COPY = {
  started: { title: 'Payment Started…', variant: 'loading' as const },
  redirecting: { title: 'Redirecting…', variant: 'loading' as const },
  success: { title: 'Payment Successful', variant: 'success' as const },
  failed: { title: 'Payment Failed', variant: 'error' as const },
  verifyFailed: { title: 'Verification Failed', variant: 'error' as const },
  cancelled: { title: 'Payment Cancelled', variant: 'warning' as const },
  serverError: { title: 'Server Error', variant: 'error' as const },
  gatewayUnavailable: { title: 'Gateway Unavailable', variant: 'warning' as const },
};
