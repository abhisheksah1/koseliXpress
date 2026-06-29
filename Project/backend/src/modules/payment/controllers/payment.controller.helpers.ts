import { Request, Response, NextFunction } from 'express';
import { PaymentError } from '../types/payment.types.js';

export function paymentErrorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof PaymentError) {
    res.status(err.httpStatus).json({ error: err.message, code: err.code, details: err.details });
    return;
  }
  console.error('[Payment Controller Error]', err);
  res.status(500).json({ error: err instanceof Error ? err.message : 'Unexpected payment error', code: 'INTERNAL_ERROR' });
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
