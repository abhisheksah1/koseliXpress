export interface SuperAdminConfig {
  email: string;
  password: string;
  name: string;
  passcode: string;
}

export interface SuperAdminUser {
  email: string;
  role: 'admin';
  invitedAt: string;
  passcode: string;
  fullName: string;
  username: string;
  password: string;
  mobile: string;
  status: 'active';
  isSuperAdmin: true;
}

export function getSuperAdminConfig(): SuperAdminConfig {
  return {
    email: (
      process.env.ADMIN_EMAIL ||
      process.env.VITE_ADMIN_EMAIL ||
      'admin@koselixpress.com'
    )
      .trim()
      .toLowerCase(),
    password:
      process.env.ADMIN_PASSWORD ||
      process.env.VITE_ADMIN_PASSWORD ||
      'admin123',
    name:
      process.env.ADMIN_NAME ||
      process.env.VITE_ADMIN_NAME ||
      'Super Admin',
    passcode: process.env.ADMIN_PASSCODE || '0000',
  };
}

export function buildSuperAdminUser(): SuperAdminUser {
  const config = getSuperAdminConfig();
  return {
    email: config.email,
    role: 'admin',
    invitedAt: new Date().toISOString(),
    passcode: config.passcode,
    fullName: config.name,
    username: 'superadmin',
    password: config.password,
    mobile: '',
    status: 'active',
    isSuperAdmin: true,
  };
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visible = local.length <= 2 ? '*' : local.slice(0, 2);
  return `${visible}***@${domain}`;
}
