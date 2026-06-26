import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from '../config/db.js';
import { getSuperAdminSeedStatus, seedSuperAdmin } from '../services/seedService.js';
import { seedPaymentGatewaysFromEnv } from '../services/paymentGatewayService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main() {
  await connectDB();
  const result = await seedSuperAdmin();
  await seedPaymentGatewaysFromEnv();
  const status = await getSuperAdminSeedStatus();

  console.log('\n=== Koseli Xpress Seed Complete ===');
  console.log('Database:', status.database);
  console.log('Collections:', status.collections);
  console.log('Super admin in admin_users:', status.superAdminInAdminUsers);
  console.log('Super admin in appstates:', status.superAdminInStore);
  console.log('Compass:', status.compassHint);
  console.log('Seed action:', result.created ? 'created store' : result.updated ? 'updated user' : 'already up to date');
  console.log('===================================\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
