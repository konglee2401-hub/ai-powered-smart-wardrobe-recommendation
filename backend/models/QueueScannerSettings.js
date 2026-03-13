import mongoose from 'mongoose';

/**
 * QueueScannerSettings stores the persisted production scheduler state.
 * The worker still executes on intervalMinutes, but the UI now edits the
 * schedule through human-readable fields and this model stores both the
 * machine value and the operator-facing summary.
 */
const queueScannerSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  key: {
    type: String,
    default: 'default',
    index: true
  },
  enabled: {
    type: Boolean,
    default: false
  },
  intervalMinutes: {
    type: Number,
    default: 60,
    min: 1,
    max: 1440
  },
  scheduleMode: {
    type: String,
    enum: ['manual', 'hourly', 'daily', 'minutes'],
    default: 'hourly'
  },
  everyHours: {
    type: Number,
    default: 1,
    min: 1,
    max: 24
  },
  everyMinutes: {
    type: Number,
    default: 15,
    min: 1,
    max: 1440
  },
  dailyTime: {
    type: String,
    default: '09:00'
  },
  scheduleLabel: {
    type: String,
    default: 'Every 1 hour'
  },
  autoPublish: {
    type: Boolean,
    default: false
  },
  accountIds: {
    type: [String],
    default: []
  },
  platform: {
    type: String,
    default: 'youtube'
  },
  youtubePublishType: {
    type: String,
    enum: ['shorts', 'video'],
    default: 'shorts'
  },
  publishEnabled: {
    type: Boolean,
    default: false
  },
  publishIntervalMinutes: {
    type: Number,
    default: 1440,
    min: 1,
    max: 10080
  },
  publishScheduleMode: {
    type: String,
    enum: ['manual', 'hourly', 'daily', 'minutes'],
    default: 'daily'
  },
  publishEveryHours: {
    type: Number,
    default: 24,
    min: 1,
    max: 24
  },
  publishEveryMinutes: {
    type: Number,
    default: 60,
    min: 1,
    max: 1440
  },
  publishDailyTime: {
    type: String,
    default: '09:00'
  },
  publishScheduleLabel: {
    type: String,
    default: 'Manual only'
  },
  publishGapMinutes: {
    type: Number,
    default: 30,
    min: 1,
    max: 1440
  },
  publishMaxPerRun: {
    type: Number,
    default: 20,
    min: 1,
    max: 500
  },
  publishFilters: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  publishAccountIds: {
    type: [String],
    default: []
  },
  publishVisibility: {
    type: String,
    enum: ['public', 'unlisted', 'private'],
    default: 'public'
  }
}, { timestamps: true });

queueScannerSettingsSchema.index({ userId: 1, key: 1 }, { unique: true, sparse: true });

export default mongoose.model('QueueScannerSettings', queueScannerSettingsSchema);


