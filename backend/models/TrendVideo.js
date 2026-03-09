import mongoose from 'mongoose';

/**
 * TrendVideo keeps the canonical record for discovered source videos.
 * The same document now tracks three lifecycle stages so the UI can show
 * one unified flow:
 * 1. discovery/download from scraper providers
 * 2. Drive sync / asset storage status
 * 3. production queue / publish hand-off status
 */
const TrendVideoSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['youtube', 'facebook', 'dailyhaha', 'douyin', 'playboard', 'other'],
    required: true,
    index: true,
  },
  videoId: {
    type: String,
    required: true,
    trim: true,
  },
  title: {
    type: String,
    default: '',
    trim: true,
  },
  views: {
    type: Number,
    default: 0,
    index: true,
  },
  likes: {
    type: Number,
    default: 0,
  },
  url: {
    type: String,
    required: true,
  },
  thumbnail: String,
  source: {
    type: String,
    default: '',
    index: true,
  },
  topic: {
    type: String,
    enum: ['hai', 'dance', 'cooking'],
    index: true,
  },
  uploadedAt: Date,
  discoveredAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  localPath: String,
  downloadStatus: {
    type: String,
    enum: ['pending', 'downloading', 'done', 'failed'],
    default: 'pending',
    index: true,
  },
  failReason: String,
  downloadedAt: Date,
  driveSync: {
    /**
     * Mirrors whether the downloaded file has been copied to Drive storage.
     * The unified pipeline reads this to decide if a source is production-ready.
     */
    status: {
      type: String,
      enum: ['pending', 'uploaded', 'failed', 'skipped'],
      default: 'pending',
      index: true,
    },
    driveFileId: String,
    driveFolder: String,
    drivePath: String,
    webViewLink: String,
    syncedAt: Date,
    lastError: String,
  },
  production: {
    /**
     * Tracks the latest production queue job started from this source video.
     * This avoids having to stitch queue state back on the frontend only.
     */
    queueStatus: {
      type: String,
      enum: ['idle', 'queued', 'processing', 'ready', 'completed', 'failed'],
      default: 'idle',
      index: true,
    },
    queueId: String,
    recipe: String,
    lastQueuedAt: Date,
    completedVideoPath: String,
    completedDriveFileId: String,
    completedAt: Date,
    lastError: String,
  },
  publishing: {
    /**
     * Minimal publish snapshot so the dashboard can show whether a source
     * has already produced something that was pushed to a social platform.
     */
    totalPublished: {
      type: Number,
      default: 0,
    },
    lastPlatform: String,
    lastPublishedAt: Date,
    lastResult: String,
  },
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrendChannel',
    index: true,
  },
}, { timestamps: true });

TrendVideoSchema.index({ platform: 1, videoId: 1 }, { unique: true });
TrendVideoSchema.index({ topic: 1, downloadStatus: 1, discoveredAt: -1 });
TrendVideoSchema.index({ 'driveSync.status': 1, 'production.queueStatus': 1, discoveredAt: -1 });

// Always register with explicit collection name
// If already registered, mongoose will reuse the existing model
const TrendVideo = mongoose.model('TrendVideo', TrendVideoSchema, 'trendvideos');

export default TrendVideo;
