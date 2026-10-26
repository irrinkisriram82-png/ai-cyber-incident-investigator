import mongoose from 'mongoose';
import '../../src/models/Case.js';
import '../../src/models/Investigation.js';

let mongod = null;

/**
 * Connect to a disposable MongoDB.
 *  - MONGODB_URI_TEST set  -> use it (its data WILL be wiped between tests: use a throwaway DB)
 *  - otherwise             -> start an in-memory server via mongodb-memory-server
 */
export async function startDb() {
  const uri = process.env.MONGODB_URI_TEST;
  if (uri) {
    await mongoose.connect(uri);
  } else {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  }
  await Promise.all(Object.values(mongoose.models).map((m) => m.init())); // build unique indexes
}

export async function clearDb() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

export async function stopDb() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
  mongod = null;
}
