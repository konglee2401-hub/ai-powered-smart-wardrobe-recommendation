import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SOURCE_DB_NAME = process.env.TREND_AUTOMATION_SOURCE_DB || 'smart_wardrobe';
const TARGET_DB_NAME = process.env.TREND_AUTOMATION_TARGET_DB || 'smart-wardrobe';
const MONGO_URI = process.env.TREND_AUTOMATION_MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-wardrobe';

function stripId(doc = {}) {
  const { _id, ...rest } = doc;
  return rest;
}

function asObjectId(value) {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;
  try {
    return new mongoose.Types.ObjectId(String(value));
  } catch {
    return null;
  }
}

async function migrateSettings(sourceDb, targetDb) {
  const collection = 'trendsettings';
  const docs = await sourceDb.collection(collection).find({}).toArray();
  let updated = 0;
  let inserted = 0;

  for (const doc of docs) {
    const key = doc.key || 'default';
    const payload = stripId(doc);
    delete payload.key;
    const existing = await targetDb.collection(collection).findOne({ key }, { projection: { _id: 1 } });
    await targetDb.collection(collection).updateOne(
      { key },
      { $set: payload, $setOnInsert: { key } },
      { upsert: true }
    );
    if (existing) updated += 1;
    else inserted += 1;
  }

  return { collection, sourceCount: docs.length, inserted, updated };
}

async function migrateChannels(sourceDb, targetDb) {
  const collection = 'trendchannels';
  const docs = await sourceDb.collection(collection).find({}).toArray();
  const channelIdMap = new Map();
  let inserted = 0;
  let updated = 0;

  for (const doc of docs) {
    const filter = { platform: doc.platform, channelId: doc.channelId };
    const existing = await targetDb.collection(collection).findOne(filter, { projection: { _id: 1 } });

    if (existing) {
      await targetDb.collection(collection).updateOne(filter, { $set: stripId(doc) });
      channelIdMap.set(String(doc._id), existing._id);
      updated += 1;
      continue;
    }

    await targetDb.collection(collection).insertOne(doc);
    channelIdMap.set(String(doc._id), doc._id);
    inserted += 1;
  }

  return { summary: { collection, sourceCount: docs.length, inserted, updated }, channelIdMap };
}

async function migrateVideos(sourceDb, targetDb, channelIdMap) {
  const collection = 'trendvideos';
  const docs = await sourceDb.collection(collection).find({}).toArray();
  let inserted = 0;
  let updated = 0;

  for (const doc of docs) {
    const filter = { platform: doc.platform, videoId: doc.videoId };
    const payload = { ...doc };
    const sourceChannelId = payload.channel ? String(payload.channel) : '';
    const mappedChannelId = sourceChannelId ? channelIdMap.get(sourceChannelId) || asObjectId(sourceChannelId) : null;
    if (mappedChannelId) {
      payload.channel = mappedChannelId;
    }

    const existing = await targetDb.collection(collection).findOne(filter, { projection: { _id: 1 } });
    if (existing) {
      await targetDb.collection(collection).updateOne(filter, { $set: stripId(payload) });
      updated += 1;
      continue;
    }

    await targetDb.collection(collection).insertOne(payload);
    inserted += 1;
  }

  return { collection, sourceCount: docs.length, inserted, updated };
}

async function migrateLogs(sourceDb, targetDb) {
  const collection = 'trendjoblogs';
  const docs = await sourceDb.collection(collection).find({}).toArray();
  let inserted = 0;
  let updated = 0;

  for (const doc of docs) {
    const filter = { _id: doc._id };
    const existing = await targetDb.collection(collection).findOne(filter, { projection: { _id: 1 } });
    await targetDb.collection(collection).replaceOne(filter, doc, { upsert: true });
    if (existing) updated += 1;
    else inserted += 1;
  }

  return { collection, sourceCount: docs.length, inserted, updated };
}

async function main() {
  await mongoose.connect(MONGO_URI);
  const sourceDb = mongoose.connection.client.db(SOURCE_DB_NAME);
  const targetDb = mongoose.connection.client.db(TARGET_DB_NAME);

  console.log(`Migrating trend automation data from "${SOURCE_DB_NAME}" -> "${TARGET_DB_NAME}"`);

  const settingsSummary = await migrateSettings(sourceDb, targetDb);
  const { summary: channelsSummary, channelIdMap } = await migrateChannels(sourceDb, targetDb);
  const videosSummary = await migrateVideos(sourceDb, targetDb, channelIdMap);
  const logsSummary = await migrateLogs(sourceDb, targetDb);

  console.log(JSON.stringify({
    settings: settingsSummary,
    channels: channelsSummary,
    videos: videosSummary,
    logs: logsSummary,
  }, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('Migration failed:', error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
