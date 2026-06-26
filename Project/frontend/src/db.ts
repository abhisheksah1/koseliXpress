import { DatabaseState, Role } from './types';
import { createDefaultState } from './defaultState';
import { buildEnvAdminUser, getEnvAdminCredentials } from './utils/adminAuth';

const DB_KEY = 'koseli_xpress_db';

async function persistToMongoDB(state: DatabaseState): Promise<void> {
  try {
    const res = await fetch('/api/store', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    if (!res.ok) {
      console.error('Failed to persist store to MongoDB:', await res.text());
    }
  } catch (err) {
    console.error('Failed to reach store API:', err);
  }
}

export async function loadDbState(): Promise<DatabaseState> {
  try {
    const res = await fetch('/api/store');
    if (res.ok) {
      const remote = (await res.json()) as DatabaseState;
      localStorage.setItem(DB_KEY, JSON.stringify(remote));
      return applyMigrations(remote);
    }
  } catch (err) {
    console.warn('Could not load from MongoDB, using local defaults:', err);
  }

  const local = getDbState();
  await persistToMongoDB(local);
  return local;
}

function ensureEnvAdminInUsers(parsed: DatabaseState): boolean {
  const creds = getEnvAdminCredentials();
  if (!parsed.users) parsed.users = [];

  const idx = parsed.users.findIndex((u) => u.email.toLowerCase() === creds.email);
  if (idx < 0) {
    parsed.users.unshift(buildEnvAdminUser());
    return true;
  }

  const user = parsed.users[idx];
  let updated = false;
  if (user.isSuperAdmin !== true || user.username !== 'superadmin') {
    parsed.users[idx] = {
      ...user,
      isSuperAdmin: true,
      username: 'superadmin',
      role: user.role || Role.ADMIN,
      status: user.status || 'active',
    };
    updated = true;
  }
  if (
    user.password !== creds.password &&
    (import.meta.env.DEV || !user.password)
  ) {
    parsed.users[idx] = { ...user, password: creds.password, status: user.status || 'active' };
    updated = true;
  }
  if (!user.passcode) {
    parsed.users[idx] = { ...parsed.users[idx], passcode: creds.passcode };
    updated = true;
  }
  return updated;
}

function applyMigrations(parsed: DatabaseState): DatabaseState {
  const defaults = createDefaultState();
  let changed = false;

  const ensureArray = <K extends keyof DatabaseState>(key: K) => {
    if (!parsed[key]) {
      (parsed as any)[key] = (defaults as any)[key];
      changed = true;
    }
  };

  ensureArray('supportChats');
  ensureArray('visitorTracks');
  ensureArray('specialDayReminders');
  ensureArray('vendors');
  ensureArray('purchaseEntries');
  ensureArray('expenseEntries');
  ensureArray('treasuryAccounts');
  ensureArray('treasuryTransactions');
  ensureArray('deliveryDistricts');
  ensureArray('deliveryGroups');

  if (!parsed.deliveryDistricts || parsed.deliveryDistricts.length === 0) {
    parsed.deliveryDistricts = defaults.deliveryDistricts;
    changed = true;
  }

  if (!parsed.rolePermissions) {
    parsed.rolePermissions = defaults.rolePermissions;
    changed = true;
  }

  if (!parsed.users || parsed.users.length === 0) {
    parsed.users = defaults.users;
    changed = true;
  } else {
    changed = ensureEnvAdminInUsers(parsed) || changed;
  }

  if (!parsed.paymentGateways || parsed.paymentGateways.length === 0) {
    parsed.paymentGateways = defaults.paymentGateways;
    changed = true;
  }

  if (!parsed.appearance) {
    parsed.appearance = defaults.appearance;
    changed = true;
  } else {
    const legacyPrimary = ['#492583', '#d11252', '#f59e0b'].map((c) => c.toLowerCase());
    const legacySecondary = ['#c0267a', '#492583', '#a78bfa', '#6b3fa0'].map((c) => c.toLowerCase());
    const p = (parsed.appearance.primaryColor || '').toLowerCase();
    const s = (parsed.appearance.secondaryColor || '').toLowerCase();
    if (legacyPrimary.includes(p)) {
      parsed.appearance.primaryColor = defaults.appearance.primaryColor;
      changed = true;
    }
    if (legacySecondary.includes(s)) {
      parsed.appearance.secondaryColor = defaults.appearance.secondaryColor;
      changed = true;
    }
  }

  if (!parsed.smtpSettings) {
    parsed.smtpSettings = defaults.smtpSettings;
    changed = true;
  }

  if (!parsed.emailTemplates || parsed.emailTemplates.length === 0) {
    parsed.emailTemplates = defaults.emailTemplates;
    changed = true;
  }

  if (!parsed.customerAuthConfig) {
    parsed.customerAuthConfig = defaults.customerAuthConfig;
    changed = true;
  }

  if (!parsed.complianceFooter) {
    parsed.complianceFooter = defaults.complianceFooter;
    changed = true;
  }

  if (parsed.products) {
    parsed.products.forEach((prod: any) => {
      if (!prod.deliveryGroupIds || prod.deliveryGroupIds.length === 0) {
        prod.deliveryGroupIds = prod.deliveryGroupId ? [prod.deliveryGroupId] : [];
        changed = true;
      }
    });
  }

  if (changed) {
    localStorage.setItem(DB_KEY, JSON.stringify(parsed));
    void persistToMongoDB(parsed);
  }

  return parsed;
}

export function getDbState(): DatabaseState {
  const data = localStorage.getItem(DB_KEY);
  if (!data) {
    const fresh = createDefaultState();
    localStorage.setItem(DB_KEY, JSON.stringify(fresh));
    return fresh;
  }
  try {
    const parsed = JSON.parse(data) as DatabaseState;
    return applyMigrations(parsed);
  } catch {
    console.error('Failed to parse DB, resetting.');
    const fresh = createDefaultState();
    localStorage.setItem(DB_KEY, JSON.stringify(fresh));
    return fresh;
  }
}

export function saveDbState(state: DatabaseState) {
  localStorage.setItem(DB_KEY, JSON.stringify(state));
  void persistToMongoDB(state);
}

export function resetDbToPreset() {
  const fresh = createDefaultState();
  localStorage.setItem(DB_KEY, JSON.stringify(fresh));
  void persistToMongoDB(fresh);
  return fresh;
}
