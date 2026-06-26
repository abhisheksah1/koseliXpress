import { Role, UserRole } from '../types';

const ADMIN_SESSION_KEY = 'koseli_admin_session';

type AdminSessionPayload = {
  email: string;
  role: Role;
  savedAt: string;
};

export function saveAdminSession(user: UserRole): void {
  try {
    const payload: AdminSessionPayload = {
      email: user.email.trim().toLowerCase(),
      role: user.role,
      savedAt: new Date().toISOString(),
    };
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage may be unavailable in private mode
  }
}

export function clearAdminSession(): void {
  try {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {
    // ignore
  }
}

/** Restore admin session after refresh — validates user still exists and is active. */
export function restoreAdminSession(users: UserRole[]): UserRole | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;

    const payload = JSON.parse(raw) as AdminSessionPayload;
    const email = payload.email?.trim().toLowerCase();
    if (!email) {
      clearAdminSession();
      return null;
    }

    const fromDb = users.find((u) => u.email.toLowerCase() === email);
    if (fromDb) {
      if (fromDb.status === 'inactive') {
        clearAdminSession();
        return null;
      }
      return fromDb;
    }

    const creds = getEnvAdminCredentials();
    if (email === creds.email) {
      return buildEnvAdminUser();
    }

    clearAdminSession();
    return null;
  } catch {
    clearAdminSession();
    return null;
  }
}

export function getEnvAdminCredentials() {
  return {
    email: (import.meta.env.VITE_ADMIN_EMAIL || 'admin@koselixpress.com').trim().toLowerCase(),
    password: import.meta.env.VITE_ADMIN_PASSWORD || 'admin123',
    name: import.meta.env.VITE_ADMIN_NAME || 'Admin',
    passcode: '0000',
  };
}

export function buildEnvAdminUser(): UserRole {
  const creds = getEnvAdminCredentials();
  return {
    email: creds.email,
    role: Role.ADMIN,
    invitedAt: new Date().toISOString(),
    passcode: creds.passcode,
    fullName: creds.name,
    username: 'superadmin',
    password: creds.password,
    mobile: '',
    status: 'active',
    isSuperAdmin: true,
  };
}

export function matchesEnvAdminLogin(email: string, password: string): boolean {
  const creds = getEnvAdminCredentials();
  const normalizedEmail = email.trim().toLowerCase();
  return (
    normalizedEmail === creds.email &&
    (password === creds.password || password === creds.passcode)
  );
}

export function findAdminUser(users: UserRole[], email: string, password: string): UserRole | null {
  const normalizedEmail = email.trim().toLowerCase();
  const fromDb = users.find(
    (u) =>
      u.email.toLowerCase() === normalizedEmail &&
      (u.password === password || u.passcode === password)
  );
  if (fromDb) return fromDb;
  if (matchesEnvAdminLogin(email, password)) return buildEnvAdminUser();
  return null;
}
