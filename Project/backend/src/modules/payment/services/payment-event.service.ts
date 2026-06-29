import { Response } from 'express';
import { PaymentStatus } from '../types/payment.types.js';

type PaymentEvent = {
  paymentId: string;
  status: PaymentStatus;
  message?: string;
  timestamp: string;
};

const subscribers = new Map<string, Set<Response>>();

export class PaymentEventService {
  subscribe(paymentId: string, res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(`data: ${JSON.stringify({ paymentId, status: PaymentStatus.Pending, message: 'Connected', timestamp: new Date().toISOString() })}\n\n`);

    if (!subscribers.has(paymentId)) subscribers.set(paymentId, new Set());
    subscribers.get(paymentId)!.add(res);

    res.on('close', () => {
      subscribers.get(paymentId)?.delete(res);
      if (subscribers.get(paymentId)?.size === 0) subscribers.delete(paymentId);
    });
  }

  emit(paymentId: string, status: PaymentStatus, message?: string): void {
    const event: PaymentEvent = {
      paymentId,
      status,
      message,
      timestamp: new Date().toISOString(),
    };
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    const set = subscribers.get(paymentId);
    if (!set) return;
    for (const res of set) {
      res.write(payload);
      if (status === PaymentStatus.Success || status === PaymentStatus.Failed || status === PaymentStatus.Cancelled) {
        res.end();
        set.delete(res);
      }
    }
  }
}

export const paymentEventService = new PaymentEventService();
