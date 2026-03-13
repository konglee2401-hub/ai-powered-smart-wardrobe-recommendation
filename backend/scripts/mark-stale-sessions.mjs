import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoUri = process.env.DATABASE_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/smart-wardrobe';
const staleMinutes = Math.max(1, Number(process.env.WORKFLOW_STALE_MINUTES || 45));
const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000);

const sessionLogSchema = new mongoose.Schema({}, { strict: false });
const SessionLog = mongoose.model('SessionLog', sessionLogSchema, 'sessionlogs');

const main = async () => {
  await mongoose.connect(mongoUri);

  const stale = await SessionLog.find({
    status: 'in-progress',
    updatedAt: { $lt: cutoff }
  }).select('sessionId status updatedAt createdAt flowType workflowState error');

  if (!stale.length) {
    console.log('No stale in-progress sessions found.');
    await mongoose.disconnect();
    return;
  }

  const now = new Date();
  const message = `Marked failed after ${staleMinutes} minutes without updates`;

  let updated = 0;
  for (const session of stale) {
    session.status = 'failed';
    session.error = { ...(session.error || {}), message, timestamp: now };
    session.updatedAt = now;

    if (session.workflowState && typeof session.workflowState === 'object') {
      session.workflowState.status = 'failed';
      session.workflowState.updatedAt = now.toISOString();
      session.workflowState.staleFailure = {
        message,
        staleMinutes,
        lastUpdatedAt: (session.updatedAt || session.createdAt || now).toISOString(),
        detectedAt: now.toISOString()
      };
    }

    await session.save();
    updated += 1;
  }

  console.log(`Marked ${updated} session(s) as failed (cutoff: ${cutoff.toISOString()}).`);
  await mongoose.disconnect();
};

main().catch((err) => {
  console.error('Failed to backfill stale sessions:', err);
  process.exit(1);
});