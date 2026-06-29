import mongoose from 'mongoose';
import dns from 'dns';

const DEFAULT_DB_NAME = 'koseli_xpress';
const MONGO_DNS_SERVERS = ['1.1.1.1', '8.8.8.8'];

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

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function connectDB(): Promise<boolean> {
  const rawUri = process.env.MONGODB_URI || `mongodb://localhost:27017/${DEFAULT_DB_NAME}`;
  const uri = normalizeMongoUri(rawUri);

  try {
    if (uri.startsWith('mongodb+srv://')) {
      dns.setServers(MONGO_DNS_SERVERS);
    }
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    const dbName = mongoose.connection.db?.databaseName || DEFAULT_DB_NAME;
    console.log(`MongoDB connected: ${uri.replace(/\/\/.*@/, '//***@')} (database: ${dbName})`);
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.error(
      '\nMongoDB is unavailable. Starting API in offline local-store mode; admin/customer sync will use local files until MongoDB reconnects.\n'
    );
    return false;
  }
}
