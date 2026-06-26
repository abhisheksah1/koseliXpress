import { AppStateModel } from '../models/AppState.js';

export async function getAppState(): Promise<Record<string, unknown> | null> {
  const doc = await AppStateModel.findOne({ key: 'main' });
  return doc?.data ?? null;
}

export async function saveAppState(data: Record<string, unknown>): Promise<void> {
  await AppStateModel.findOneAndUpdate(
    { key: 'main' },
    { data },
    { upsert: true, new: true }
  );
}

export async function resetAppState(data: Record<string, unknown>): Promise<void> {
  await saveAppState(data);
}
