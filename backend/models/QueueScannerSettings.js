import mongoose from 'mongoose';

/**
 * QueueScannerSettings stores the persisted production scheduler state.
 * The worker still executes on intervalMinutes, but the UI now edits the
 * schedule through human-readable fields and this model stores both the
 * machine value and the operator-facing summary.
 */
const queueScannerSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    default: 'default',
    unique: true,
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
    enum: ['manual', 'hourly', 'daily'],
    default: 'hourly'
  },
  everyHours: {
    type: Number,
    default: 1,
    min: 1,
    max: 24
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
  }
}, { timestamps: true });

export default mongoose.model('QueueScannerSettings', queueScannerSettingsSchema);
