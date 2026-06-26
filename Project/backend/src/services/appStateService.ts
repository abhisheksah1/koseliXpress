import { AppStateModel } from '../models/AppState.js';
import { isMongoConnected } from '../config/db.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_STORE_DIR = path.resolve(__dirname, '../../.local-store');
const LOCAL_APP_STATE_FILE = path.join(LOCAL_STORE_DIR, 'app-state.json');

async function readLocalAppState(): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(LOCAL_APP_STATE_FILE, 'utf8');
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function writeLocalAppState(data: Record<string, unknown>): Promise<void> {
  await fs.mkdir(LOCAL_STORE_DIR, { recursive: true });
  await fs.writeFile(LOCAL_APP_STATE_FILE, JSON.stringify(data, null, 2), 'utf8');
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
