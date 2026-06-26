import mongoose from 'mongoose';

const DEFAULT_DB_NAME = 'koseli_xpress';

function normalizeMongoUri(uri: string): string {
  const trimmed = uri.trim();
  if (!trimmed) return `mongodb://localhost:27017/${DEFAULT_DB_NAME}`;

  // Atlas / SRV URI without database path → append koseli_xpress
  const atlasNoDb = trimmed.match(/^(mongodb(\+srv)?:\/\/[^/]+)\/?(\?.*)?$/i);
  if (atlasNoDb) {
    const base = atlasNoDb[1];
    const query = atlasNoDb[3] || '';
    return `${base}/${DEFAULT_DB_NAME}${query}`;
  }

  return trimmed;
}

export async function connectDB(): Promise<void> {
  const rawUri = process.env.MONGODB_URI || `mongodb://localhost:27017/${DEFAULT_DB_NAME}`;
  const uri = normalizeMongoUri(rawUri);

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    const dbName = mongoose.connection.db?.databaseName || DEFAULT_DB_NAME;
    console.log(`MongoDB connected: ${uri.replace(/\/\/.*@/, '//***@')} (database: ${dbName})`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.error(
      '\nEnsure MongoDB is running locally (mongod) or set MONGODB_URI in .env to a valid Atlas connection string.\n'
    );
    throw error;
  }
}
