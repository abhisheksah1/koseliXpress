import { VERIFY_RETRY } from '../constants/payment.constants.js';

export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseDelayMs?: number; label?: string } = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? VERIFY_RETRY.maxAttempts;
  const baseDelayMs = options.baseDelayMs ?? VERIFY_RETRY.baseDelayMs;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt >= maxAttempts) break;
      const delay = baseDelayMs * 2 ** (attempt - 1);
      if (options.label) {
        console.warn(`[Payment Retry] ${options.label} attempt ${attempt}/${maxAttempts} failed, retry in ${delay}ms`);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
