import { AppStateModel } from '../models/AppState.js';
import { isMongoConnected } from '../config/db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_STORE_DIR = path.resolve(__dirname, '../../.local-store');
const LOCAL_APP_STATE_FILE = path.join(LOCAL_STORE_DIR, 'app-state.json');

function parseJsonWithTrailingRecovery(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    for (let idx = raw.lastIndexOf('}') - 1; idx > 0; idx = raw.lastIndexOf('}', idx - 1)) {
      try {
        return JSON.parse(raw.slice(0, idx + 1)) as Record<string, unknown>;
      } catch {
        // Keep scanning for the end of the last complete object.
      }
    }
    return null;
  }
}

async function readLocalAppState(): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(LOCAL_APP_STATE_FILE, 'utf8');
    return parseJsonWithTrailingRecovery(raw);
  } catch {
    return null;
  }
}

async function writeLocalAppState(data: Record<string, unknown>): Promise<void> {
  await fs.mkdir(LOCAL_STORE_DIR, { recursive: true });
  const tempFile = `${LOCAL_APP_STATE_FILE}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tempFile, LOCAL_APP_STATE_FILE);
}

export async function getAppState(): Promise<Record<string, unknown> | null> {
  if (!isMongoConnected()) {
    return readLocalAppState();
  }
  const doc = await AppStateModel.findOne({ key: 'main' });
  return doc?.data ?? null;
}

export async function saveAppState(data: Record<string, unknown>): Promise<void> {
  if (!isMongoConnected()) {
    await writeLocalAppState(data);
    return;
  }
  await AppStateModel.findOneAndUpdate(
    { key: 'main' },
    { data },
    { upsert: true, new: true }
  );
}

function hasStorefrontData(data: Record<string, unknown> | null): boolean {
  return !!data && (
    (Array.isArray(data.pages) && data.pages.length > 0) ||
    (Array.isArray(data.products) && data.products.length > 0) ||
    (Array.isArray(data.categories) && data.categories.length > 0)
  );
}

export async function syncLocalAppStateToMongo(): Promise<boolean> {
  if (!isMongoConnected()) return false;

  const localState = await readLocalAppState();
  if (!hasStorefrontData(localState)) return false;

  const mongoState = await getAppState();
  const mergedState: Record<string, unknown> = { ...(mongoState ?? {}) };
  let changed = false;

  for (const key of ['pages', 'products', 'categories']) {
    const localItems = localState[key];
    const mongoItems = mongoState?.[key];
    if (
      Array.isArray(localItems) &&
      localItems.length > 0 &&
      (!Array.isArray(mongoItems) || localItems.length > mongoItems.length)
    ) {
      mergedState[key] = localItems;
      changed = true;
    }
  }

  for (const key of ['store', 'appearance', 'paymentMethods', 'shippingZones']) {
    if (localState[key] && !mongoState?.[key]) {
      mergedState[key] = localState[key];
      changed = true;
    }
  }

  if (!changed) return false;

  await AppStateModel.findOneAndUpdate(
    { key: 'main' },
    { data: mergedState },
    { upsert: true, new: true }
  );
  console.log('[Store] Synced local-store app-state into MongoDB.');
  return true;
}

export async function appendVisitorTrack(track: Record<string, unknown>, maxTracks = 500): Promise<void> {
  if (!isMongoConnected()) {
    const state = await readLocalAppState();
    if (!state) return;
    const existingTracks = Array.isArray(state.visitorTracks) ? state.visitorTracks : [];
    await writeLocalAppState({
      ...state,
      visitorTracks: [...existingTracks, track].slice(-maxTracks),
    });
    return;
  }

  const doc = await AppStateModel.findOne({ key: 'main' });
  if (!doc?.data) return;

  const existingTracks = Array.isArray(doc.data.visitorTracks) ? doc.data.visitorTracks : [];
  doc.data = {
    ...doc.data,
    visitorTracks: [...existingTracks, track].slice(-maxTracks),
  };
  doc.markModified('data');
  await doc.save();
}

export async function resetAppState(data: Record<string, unknown>): Promise<void> {
  await saveAppState(data);
}
