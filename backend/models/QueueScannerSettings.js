import mongoose from 'mongoose';

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
  }
}, { timestamps: true });

export default mongoose.model('QueueScannerSettings', queueScannerSettingsSchema);
