import mongoose, { Schema } from 'mongoose';

export interface AppStateDocument {
  key: string;
  data: Record<string, unknown>;
}

const appStateSchema = new Schema<AppStateDocument>(
  {
    key: { type: String, default: 'main', unique: true },
    data: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true, collection: 'appstates' }
);

export const AppStateModel = mongoose.model<AppStateDocument>('AppState', appStateSchema);
