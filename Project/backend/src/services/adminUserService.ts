import { AdminUserModel, AdminUserDocument } from '../models/AdminUser.js';

export async function findAdminUserByCredentials(
  email: string,
  password: string
): Promise<AdminUserDocument | null> {
  const normalized = email.trim().toLowerCase();
  return AdminUserModel.findOne({
    email: normalized,
    status: 'active',
    $or: [{ password }, { passcode: password }],
  });
}

export async function getAdminUsersCount(): Promise<number> {
  return AdminUserModel.countDocuments();
}

export async function getSuperAdminDocument() {
  const { getSuperAdminConfig } = await import('../config/superAdmin.js');
  const config = getSuperAdminConfig();
  return AdminUserModel.findOne({ email: config.email }).lean();
}
