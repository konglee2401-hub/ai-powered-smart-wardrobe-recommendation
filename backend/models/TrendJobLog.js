import mongoose from 'mongoose';

const TrendJobLogSchema = new mongoose.Schema({
  jobType: {
    type: String,
    enum: ['discover', 'scan-channel', 'download'],
    required: true,
    index: true,
  },
  topic: String,
  platform: String,
  status: {
    type: String,
    enum: ['success', 'failed', 'partial'],
    required: true,
  },
  itemsFound: {
    type: Number,
    default: 0,
  },
  itemsDownloaded: {
    type: Number,
    default: 0,
  },
  duration: {
    type: Number,
    default: 0,
  },
  error: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  ranAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, { timestamps: true });

TrendJobLogSchema.index({ jobType: 1, ranAt: -1 });

const TrendJobLog = mongoose.models.TrendJobLog || mongoose.model('TrendJobLog', TrendJobLogSchema);

export default TrendJobLog;
