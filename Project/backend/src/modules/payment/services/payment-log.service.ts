import { isMongoConnected } from '../../../config/db.js';
import { PaymentLogModel } from '../models/payment.models.js';
import { maskPayload } from '../utils/mask.util.js';

export class PaymentLogService {
  async info(action: string, message: string, meta?: { paymentId?: string; gateway?: string; payload?: unknown; actor?: string }) {
    await this.write('info', action, message, meta);
  }

  async warn(action: string, message: string, meta?: { paymentId?: string; gateway?: string; payload?: unknown; actor?: string }) {
    await this.write('warn', action, message, meta);
  }

  async error(action: string, message: string, meta?: { paymentId?: string; gateway?: string; payload?: unknown; actor?: string }) {
    await this.write('error', action, message, meta);
  }

  private async write(
    level: 'info' | 'warn' | 'error',
    action: string,
    message: string,
    meta?: { paymentId?: string; gateway?: string; payload?: unknown; actor?: string },
  ): Promise<void> {
    const payload = meta?.payload ? maskPayload(meta.payload) : undefined;
    console.log(`[Payment:${level}] ${action} — ${message}`);
    if (isMongoConnected()) {
      await PaymentLogModel.create({
        level,
        action,
        message,
        paymentId: meta?.paymentId,
        gateway: meta?.gateway,
        payload,
        actor: meta?.actor,
      });
    }
  }
}

export const paymentLogService = new PaymentLogService();
