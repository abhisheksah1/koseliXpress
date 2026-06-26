import { getAppState, saveAppState } from './appStateService.js';
import { getAdminUsersCount, getSuperAdminDocument } from './adminUserService.js';
import { AdminUserModel } from '../models/AdminUser.js';
import {
  buildSuperAdminUser,
  getSuperAdminConfig,
  maskEmail,
} from '../config/superAdmin.js';
import mongoose from 'mongoose';

export { buildSuperAdminUser, getSuperAdminConfig, maskEmail } from '../config/superAdmin.js';

function defaultRolePermissions() {
  return {
    admin: {
      orderProcess: true,
      accounts: true,
      productEdit: true,
      purchaseEntry: true,
      systemSettings: true,
    },
    manager: {
      orderProcess: true,
      accounts: false,
      productEdit: true,
      purchaseEntry: true,
      systemSettings: false,
    },
    staff: {
      orderProcess: true,
      accounts: false,
      productEdit: false,
      purchaseEntry: false,
      systemSettings: false,
    },
  };
}

/** Minimal store document when MongoDB has no AppState yet. */
function createMinimalSeedState(superAdmin: ReturnType<typeof buildSuperAdminUser>): Record<string, unknown> {
  return {
    users: [superAdmin],
    rolePermissions: defaultRolePermissions(),
    categories: [],
    brands: [],
    products: [],
    inventoryLogs: [],
    reviews: [],
    coupons: [],
    leads: [],
    orders: [],
    currencies: [{ code: 'NPR', symbol: 'Rs.', rateToNPR: 1.0, isDefault: true }],
    plugins: {
      whatsappNumber: '',
      whatsappMessage: 'Hi, I need help with my order.',
      googleAnalyticsId: '',
      facebookPixelId: '',
      whatsappIconType: 'whatsapp',
      whatsappCustomSvg: '',
    },
    appearance: {
      themeMode: 'light',
      primaryColor: '#492583',
      secondaryColor: '#c0267a',
      siteLogo: '',
      navbarLinks: [],
      domainName: '',
      favImage: '',
      slogan: 'मायाको कोसेली',
      stickyNotice:
        'Same-Day Flowers & Cake Delivery Available in all major cities in Nepal — Order by 4:00 PM NST',
      websiteTextFont: 'poppins',
      shippingNotice: '',
      shortTermsAndConditions: '',
      fullTermsAndConditions: '',
      giftingSlaDisclaimer: '',
      brandDescriptionStyle:
        "Nepal's premium gifting destination — handcrafted hampers, fresh flowers, and gourmet treats.",
      footerAboutLinks: [],
      footerCategoriesLinks: [],
      footerLegalsLinks: [],
      footerSocialsLinks: [],
      registeredBusinessName: '',
      panVatNumber: '',
      companyAddress: '',
      registrationNumber: '',
      contactEmail: '',
      ecommerceNumber: '',
      outlets: '',
      complainOfficerName: '',
      complainOfficerPhone: '',
      complainOfficerEmail: '',
      categoryDiscounts: [],
      paymentDiscounts: [],
    },
    store: {
      storeName: 'Koseli Xpress',
      supportEmail: '',
      supportPhone: '',
      address: '',
      baseCurrencyCode: 'NPR',
      orderPrefix: 'KO-',
      maintenanceMode: false,
      geoRegion: 'NP-BA',
      geoPlacename: 'Kathmandu, Nepal',
      geoPosition: '27.717244;85.324060',
    },
    serviceFees: [],
    pages: [],
    deliveryDistricts: [],
    deliveryGroups: [],
    paymentGateways: [],
    vendors: [],
    purchaseEntries: [],
    expenseEntries: [],
    treasuryAccounts: [],
    treasuryTransactions: [],
    supportChats: [],
    visitorTracks: [],
    specialDayReminders: [],
    _seedVersion: 1,
    _seededAt: new Date().toISOString(),
  };
}

type StoreUser = Record<string, unknown> & { email?: string; isSuperAdmin?: boolean };

export function mergeSuperAdminIntoUsers(users: StoreUser[]): {
  users: StoreUser[];
  changed: boolean;
} {
  const superAdmin = buildSuperAdminUser() as StoreUser;
  const email = superAdmin.email as string;
  const syncPassword =
    process.env.NODE_ENV === 'development' ||
    process.env.SEED_ADMIN_SYNC_PASSWORD === 'true';

  const idx = users.findIndex((u) => u.email?.toLowerCase() === email);
  if (idx < 0) {
    return { users: [superAdmin, ...users], changed: true };
  }

  const existing = users[idx];
  const updated: StoreUser = {
    ...existing,
    email,
    role: 'admin',
    fullName: superAdmin.fullName,
    username: 'superadmin',
    passcode: superAdmin.passcode,
    status: 'active',
    isSuperAdmin: true,
    ...(syncPassword ? { password: superAdmin.password } : {}),
  };

  const changed =
    existing.isSuperAdmin !== true ||
    existing.username !== 'superadmin' ||
    existing.status !== 'active' ||
    (syncPassword && existing.password !== superAdmin.password);

  if (!changed) {
    return { users, changed: false };
  }

  const copy = [...users];
  copy[idx] = updated;
  return { users: copy, changed: true };
}

async function seedAdminUserCollection(): Promise<{
  created: boolean;
  updated: boolean;
  email: string;
}> {
  const superAdmin = buildSuperAdminUser();
  const config = getSuperAdminConfig();
  const syncPassword =
    process.env.NODE_ENV === 'development' ||
    process.env.SEED_ADMIN_SYNC_PASSWORD === 'true';

  const existing = await AdminUserModel.findOne({ email: config.email });

  if (!existing) {
    await AdminUserModel.create({
      email: superAdmin.email,
      password: superAdmin.password,
      passcode: superAdmin.passcode,
      fullName: superAdmin.fullName,
      username: superAdmin.username,
      role: superAdmin.role,
      status: superAdmin.status,
      isSuperAdmin: true,
      mobile: superAdmin.mobile,
    });
    console.log(`[Seed] admin_users collection: created super admin ${config.email}`);
    return { created: true, updated: false, email: config.email };
  }

  const needsUpdate =
    existing.isSuperAdmin !== true ||
    existing.username !== 'superadmin' ||
    existing.status !== 'active' ||
    (syncPassword && existing.password !== superAdmin.password);

  if (needsUpdate) {
    existing.fullName = superAdmin.fullName;
    existing.username = 'superadmin';
    existing.passcode = superAdmin.passcode;
    existing.status = 'active';
    existing.isSuperAdmin = true;
    if (syncPassword) existing.password = superAdmin.password;
    await existing.save();
    console.log(`[Seed] admin_users collection: updated super admin ${config.email}`);
    return { created: false, updated: true, email: config.email };
  }

  console.log(`[Seed] admin_users collection: super admin already present ${config.email}`);
  return { created: false, updated: false, email: config.email };
}

export async function seedSuperAdmin(): Promise<{
  created: boolean;
  updated: boolean;
  email: string;
}> {
  const config = getSuperAdminConfig();
  let state = await getAppState();
  let appResult = { created: false, updated: false };

  if (!state) {
    const superAdmin = buildSuperAdminUser();
    await saveAppState(createMinimalSeedState(superAdmin));
    console.log(`[Seed] app_states: created store with super admin ${config.email}`);
    appResult = { created: true, updated: false };
  } else {
    const users = Array.isArray(state.users) ? (state.users as StoreUser[]) : [];
    const { users: merged, changed } = mergeSuperAdminIntoUsers(users);

    if (!state.rolePermissions) {
      state.rolePermissions = defaultRolePermissions();
    }

    if (changed) {
      state.users = merged;
      await saveAppState(state);
      console.log(`[Seed] app_states: synced super admin in store ${config.email}`);
      appResult = { created: false, updated: true };
    } else {
      console.log(`[Seed] app_states: super admin already in store ${config.email}`);
    }
  }

  const adminCol = await seedAdminUserCollection();

  return {
    created: appResult.created || adminCol.created,
    updated: appResult.updated || adminCol.updated,
    email: config.email,
  };
}

export async function getSuperAdminSeedStatus() {
  const config = getSuperAdminConfig();
  const state = await getAppState();
  const users = Array.isArray(state?.users) ? (state.users as StoreUser[]) : [];
  const superAdminInStore = users.find(
    (u) =>
      u.email?.toLowerCase() === config.email ||
      u.isSuperAdmin === true
  );
  const adminUsersCount = await getAdminUsersCount();
  const adminUserDoc = await getSuperAdminDocument();
  const dbName = mongoose.connection.db?.databaseName || 'unknown';

  return {
    database: dbName,
    collections: {
      admin_users: adminUsersCount,
      appstates: state ? 1 : 0,
    },
    storeInitialized: !!state,
    superAdminInStore: !!superAdminInStore,
    superAdminInAdminUsers: !!adminUserDoc,
    superAdminConfigured: !!superAdminInStore || !!adminUserDoc,
    superAdminEmail: maskEmail(config.email),
    superAdminRole: superAdminInStore?.role || adminUserDoc?.role || null,
    isSuperAdminFlag:
      superAdminInStore?.isSuperAdmin === true || adminUserDoc?.isSuperAdmin === true,
    totalStoreUsers: users.length,
    envSource: {
      emailSet: !!(process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL),
      passwordSet: !!(process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD),
    },
    seededAt: state?._seededAt || null,
    compassHint: `In Compass open database "${dbName}" → admin_users (super admin login), appstates (full store JSON), apistores (API keys)`,
  };
}
