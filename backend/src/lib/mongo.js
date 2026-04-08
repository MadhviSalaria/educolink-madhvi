import { MongoClient } from 'mongodb';

let clientPromise = null;

function getConfig() {
  return {
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB || 'educolink',
  };
}

export function isMongoConfigured() {
  const { uri } = getConfig();
  return Boolean(uri && uri.trim());
}

async function getClient() {
  if (!isMongoConfigured()) {
    return null;
  }

  if (!clientPromise) {
    const { uri } = getConfig();
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 0,
      connectTimeoutMS: 10000,
    });

    clientPromise = client.connect();
  }

  return clientPromise;
}

export async function getDb() {
  const client = await getClient();
  if (!client) {
    return null;
  }

  const { dbName } = getConfig();
  return client.db(dbName);
}

export async function getUsersCollection() {
  const db = await getDb();
  if (!db) {
    return null;
  }

  return db.collection('users');
}
