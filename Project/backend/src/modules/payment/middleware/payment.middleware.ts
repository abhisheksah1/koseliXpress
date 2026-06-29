import { Request, Response, NextFunction } from 'express';
import { PAYMENT_RATE_LIMIT } from '../constants/payment.constants.js';

const buckets = new Map<string, { count: number; resetAt: number }>();

export function paymentRateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + PAYMENT_RATE_LIMIT.windowMs });
    next();
    return;
  }

  if (bucket.count >= PAYMENT_RATE_LIMIT.maxRequests) {
    res.status(429).json({ error: 'Too many payment requests. Please try again later.', code: 'RATE_LIMITED' });
    return;
  }

  bucket.count += 1;
  next();
}

export function validateWebhookSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) {
    next();
    return;
  }
  const header = req.headers['x-payment-webhook-secret'];
  if (header !== secret) {
    res.status(401).json({ error: 'Invalid webhook secret.', code: 'WEBHOOK_UNAUTHORIZED' });
    return;
  }
  next();
}
