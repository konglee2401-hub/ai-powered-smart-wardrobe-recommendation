import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import TrendVideo from '../../models/TrendVideo.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI =
  process.env.TREND_AUTOMATION_MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/smart-wardrobe';

const TARGET_PLATFORMS = ['youtube', 'playboard'];
const MISSING_THUMBNAIL_FILTER = {
  $or: [{ thumbnail: { $exists: false } }, { thumbnail: null }, { thumbnail: '' }],
};

const buildFallbackThumbnail = (videoId) =>
  `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

async function backfillTrendThumbnails() {
  console.log(`\nConnecting to MongoDB: ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI);

  const query = {
    platform: { $in: TARGET_PLATFORMS },
    videoId: { $exists: true, $ne: '' },
    ...MISSING_THUMBNAIL_FILTER,
  };

  const totalMissing = await TrendVideo.countDocuments(query);
  console.log(`Found ${totalMissing} TrendVideo records missing thumbnails.`);

  if (totalMissing === 0) {
    await mongoose.disconnect();
    return;
  }

  const cursor = TrendVideo.find(query)
    .select({ _id: 1, videoId: 1 })
    .lean()
    .cursor();

  const bulkOps = [];
  let processed = 0;
  let modified = 0;

  for await (const doc of cursor) {
    const fallback = buildFallbackThumbnail(doc.videoId);
    bulkOps.push({
      updateOne: {
        filter: { _id: doc._id, ...MISSING_THUMBNAIL_FILTER },
        update: { $set: { thumbnail: fallback } },
      },
    });

    processed += 1;

    if (bulkOps.length >= 500) {
      const result = await TrendVideo.bulkWrite(bulkOps, { ordered: false });
      modified += result.modifiedCount || 0;
      bulkOps.length = 0;
      console.log(`Processed ${processed}/${totalMissing}...`);
    }
  }

  if (bulkOps.length > 0) {
    const result = await TrendVideo.bulkWrite(bulkOps, { ordered: false });
    modified += result.modifiedCount || 0;
  }

  console.log(`\nBackfill complete. Updated ${modified} records.`);
  await mongoose.disconnect();
}

backfillTrendThumbnails().catch(async (error) => {
  console.error('Backfill failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
