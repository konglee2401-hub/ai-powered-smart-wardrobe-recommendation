import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import VideoPipelineJob from '../../models/VideoPipelineJob.js';
import { resolveTemplateGroup } from '../../services/publicDriveFolderIngestService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI =
  process.env.TREND_AUTOMATION_MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/smart-wardrobe';

function extractDriveFileId(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('public_drive_')) return raw.replace('public_drive_', '');

  const urlMatch = raw.match(/\/file\/d\/([A-Za-z0-9_-]{20,})/i)
    || raw.match(/[?&]id=([A-Za-z0-9_-]{20,})/i)
    || raw.match(/open\?id=([A-Za-z0-9_-]{20,})/i);
  if (urlMatch) return urlMatch[1];

  const fileMatch = raw.match(/([A-Za-z0-9_-]{20,})-/);
  if (fileMatch) return fileMatch[1];

  return '';
}

function buildMashupLog(job = {}) {
  const metadataLog = job.metadata?.mashupLog || job.videoConfig?.mashupLog;
  if (metadataLog) return metadataLog;

  const productionConfig = job.videoConfig?.productionConfig || {};
  const templateName = productionConfig.templateName || 'reaction';
  const templateGroup = resolveTemplateGroup(templateName);
  const subVideo = job.videoConfig?.subVideo || productionConfig.manualSubVideo || {};
  const autoSelected = Boolean(subVideo?.autoSelected || job.videoConfig?.autoSelectedSubVideo);

  return {
    recipe: job.videoConfig?.recipe || job.contentType || 'mashup',
    templateName,
    templateGroup,
    layout: productionConfig.layout || '2-3-1-3',
    duration: Number(productionConfig.duration) || 30,
    aspectRatio: productionConfig.aspectRatio || '9:16',
    audioSource: productionConfig.audioSource || 'main',
    mainVideo: {
      sourceVideoId: job.videoConfig?.sourceVideoId || job.metadata?.sourceVideoId || '',
      title: job.videoConfig?.sourceTitle || '',
      path: job.videoConfig?.mainVideoPath || '',
      url: job.videoConfig?.sourceUrl || '',
    },
    subVideo: {
      selectionMethod: autoSelected ? 'auto' : (subVideo?.assetId ? 'manual' : 'auto'),
      assetId: subVideo?.assetId || '',
      name: subVideo?.name || job.videoConfig?.autoSelectedSubVideo?.name || '',
      path: job.videoConfig?.subVideoPath || subVideo?.localPath || '',
      sourceKey: subVideo?.sourceKey || job.videoConfig?.autoSelectedSubVideo?.sourceKey || '',
      sourceType: subVideo?.sourceType || job.videoConfig?.autoSelectedSubVideo?.sourceType || '',
      theme: subVideo?.theme || job.videoConfig?.autoSelectedSubVideo?.theme || '',
    },
    selection: autoSelected ? {
      method: 'auto',
      sourceKey: subVideo?.sourceKey || job.videoConfig?.autoSelectedSubVideo?.sourceKey || '',
      sourceType: subVideo?.sourceType || job.videoConfig?.autoSelectedSubVideo?.sourceType || '',
      sourceName: subVideo?.name || job.videoConfig?.autoSelectedSubVideo?.name || '',
      templateGroup,
      desiredThemes: [],
      score: null,
      candidates: [],
    } : { method: 'manual' },
  };
}

function resolveSubThumbnail(job = {}, mashupLog = {}) {
  const subVideo = mashupLog?.subVideo || {};
  const candidates = [
    subVideo?.assetId,
    job.videoConfig?.subVideo?.assetId,
    job.videoConfig?.autoSelectedSubVideo?.name,
    job.videoConfig?.subVideo?.url,
    job.videoConfig?.subVideo?.localPath,
    job.videoConfig?.subVideoPath,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const fileId = extractDriveFileId(candidate);
    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w640`;
    }
  }

  return '';
}

async function seedMashupLogs() {
  console.log(`Connecting to MongoDB: ${MONGO_URI}`);
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 20000 });

  const query = {
    contentType: 'mashup',
    $or: [
      { 'metadata.mashupLog': { $exists: false } },
      { 'metadata.mashupLog': null },
      { 'videoConfig.mashupLog': { $exists: false } },
      { 'videoConfig.mashupLog': null },
    ],
  };

  const cursor = VideoPipelineJob.find(query).lean().cursor();
  let updated = 0;

  for await (const job of cursor) {
    const mashupLog = buildMashupLog(job);
    const subThumbnail = resolveSubThumbnail(job, mashupLog);
    const mainThumbnail = job.videoConfig?.sourceThumbnail || '';

    await VideoPipelineJob.updateOne(
      { _id: job._id },
      {
        $set: {
          'metadata.mashupLog': mashupLog,
          'videoConfig.mashupLog': mashupLog,
          'metadata.mainThumbnail': mainThumbnail,
          'metadata.subThumbnail': subThumbnail,
        },
      }
    );

    updated += 1;
  }

  console.log(`Seeded mashupLog for ${updated} jobs.`);
  await mongoose.disconnect();
}

seedMashupLogs().catch(async (error) => {
  console.error('Seed failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
