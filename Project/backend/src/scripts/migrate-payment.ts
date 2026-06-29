/**
 * MongoDB collection bootstrap for payment module.
 * Run: npm run migrate:payment
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from '../config/db.js';
import {
  PaymentRecordModel,
  PaymentTransactionModel,
  PaymentLogModel,
  PaymentWebhookModel,
  PaymentGatewayConfigModel,
} from '../modules/payment/models/payment.models.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function migrate() {
  await connectDB();
  await Promise.all([
    PaymentRecordModel.createIndexes(),
    PaymentTransactionModel.createIndexes(),
    PaymentLogModel.createIndexes(),
    PaymentWebhookModel.createIndexes(),
    PaymentGatewayConfigModel.createIndexes(),
  ]);
  console.log('Payment module indexes ensured on collections:');
  console.log('  - payments');
  console.log('  - payment_transactions');
  console.log('  - payment_logs');
  console.log('  - payment_webhooks');
  console.log('  - payment_gateway_configs');
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
