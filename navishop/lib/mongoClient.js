import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

let cached = global.mongoClient;

if (!cached) {
  cached = global.mongoClient = { conn: null, promise: null };
}

async function connectMongoClient() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000
    });
    cached.promise = client.connect();
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export async function getDb() {
  const client = await connectMongoClient();
  return MONGODB_DB_NAME ? client.db(MONGODB_DB_NAME) : client.db();
}

export default connectMongoClient;
