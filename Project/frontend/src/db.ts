import { DatabaseState, Role } from './types';
import { createDefaultState } from './defaultState';
import { buildEnvAdminUser, getEnvAdminCredentials } from './utils/adminAuth';

export const DB_KEY = 'koseli_xpress_db';

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
    const res = await fetch(`/api/store?ts=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const remote = (await res.json()) as DatabaseState;
      const migratedRemote = applyMigrations(remote);
      localStorage.setItem(DB_KEY, JSON.stringify(migratedRemote));
      return migratedRemote;
    }
  } catch (err) {
    console.warn('Could not load from MongoDB, using local defaults:', err);
  }

  const local = getDbState();
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

function removeLegacySeededStorefrontContent(parsed: DatabaseState): boolean {
  if (!parsed.pages || parsed.pages.length === 0) return false;

  const legacyStaticSectionIds = new Set([
    'sec-banner',
    'sec-trust',
    'sec-cats',
    'sec-products',
    'sec-story',
    'sec-features',
    'sec-faq',
    'sec-cta',
  ]);
  const legacyStaticMarkers = new Set([
    'Celebrate',
    'SAME DAY DELIVERY',
    'Premium flowers & gifts across Nepal',
    'Shop by Category',
    'Featured Gifts',
    'Crafted with Intention, Delivered with Care',
    'The Koseli Difference',
    'Questions & Answers',
    "Ready to Make Someone's Day?",
  ]);

  let changed = false;
  parsed.pages = parsed.pages.map((page) => {
    if (page.id !== 'page-home' && page.slug !== 'home') return page;

    const filteredSections = (page.sections || []).filter((section: any) => {
      const data = section.data || {};
      const markers = [
        data.scriptTitle,
        data.boldSubtitle,
        data.title,
      ].filter(Boolean);
      const looksLikeLegacyStatic =
        legacyStaticSectionIds.has(section.id) &&
        markers.some((marker) => legacyStaticMarkers.has(String(marker)));

      if (looksLikeLegacyStatic) {
        changed = true;
        return false;
      }
      return true;
    });

    return { ...page, sections: filteredSections };
  });

  return changed;
}

function applyMigrations(parsed: DatabaseState, persistChanges = true): DatabaseState {
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

  changed = removeLegacySeededStorefrontContent(parsed) || changed;

  if (changed) {
    localStorage.setItem(DB_KEY, JSON.stringify(parsed));
    if (persistChanges) {
      void persistToMongoDB(parsed);
    }
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
    return applyMigrations(parsed, false);
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
