import { MongoClient } from 'mongodb';

// The hostname "mongo" is the name the tutorial gives the database container.
// Docker's DNS resolves it on a user-defined network.
const MONGO_URL = process.env.MONGO_URL || 'mongodb://mongo:27017/sampledb';

const MAX_DELAY_MS = 10_000;

let client;
let notes;

/** True once the connection to MongoDB has succeeded. */
export const isConnected = () => notes !== undefined;

/** Returns the `notes` collection. Throws until `connectWithRetry` has succeeded. */
export function getNotesCollection() {
  if (!notes) throw new Error('MongoDB is not connected yet');
  return notes;
}

/**
 * Connects to MongoDB and keeps retrying with a growing delay, so the app can start
 * before the database container is ready instead of crashing.
 */
export async function connectWithRetry() {
  let delay = 500;
  for (;;) {
    try {
      client = new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 3000 });
      await client.connect();
      notes = client.db().collection('notes');
      console.log('Connected to MongoDB');
      return;
    } catch (error) {
      console.error(`MongoDB not reachable (${error.message}). Retrying in ${delay} ms.`);
      await client?.close().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, MAX_DELAY_MS);
    }
  }
}

/** Closes the connection. Used on shutdown. */
export async function closeConnection() {
  await client?.close();
}
