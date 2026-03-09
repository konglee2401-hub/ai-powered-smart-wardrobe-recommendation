import mongoose from 'mongoose';

/**
 * VideoPipelineJob is the Mongo-backed replacement for the deprecated
 * file-based queue. One document represents one production or publish job.
 * The controller/service layer keeps the public response shape compatible
 * with the previous queue service so the rest of the backend can migrate
 * incrementally without duplicating queue logic.
 */
const VideoPipelineJobSchema = new mongoose.Schema({
  queueId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  videoConfig: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  platform: {
    type: String,
    default: 'all',
    index: true,
  },
  contentType: {
    type: String,
    default: 'product_promo',
    index: true,
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal',
    index: true,
  },
  scheduleTime: {
    type: Date,
    default: Date.now,
    index: true,
  },
  accountIds: {
    type: [String],
    default: [],
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'ready', 'uploaded', 'failed'],
    default: 'pending',
    index: true,
  },
  lastRetryAt: Date,
  startedAt: Date,
  completedAt: Date,
  uploadedAt: Date,
  uploadUrl: String,
  uploadedByAccount: String,
  errorCount: {
    type: Number,
    default: 0,
  },
  errorLog: {
    type: [{
      stage: String,
      error: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
    }],
    default: [],
  },
  processLogs: {
    type: [{
      stage: String,
      status: String,
      message: String,
      error: String,
      duration: Number,
      retryAttempt: {
        type: Number,
        default: 0,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    }],
    default: [],
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  retry: {
    type: Number,
    default: 0,
  },
  maxRetries: {
    type: Number,
    default: 3,
  },
}, {
  timestamps: true,
});

VideoPipelineJobSchema.index({ status: 1, platform: 1, scheduleTime: 1, createdAt: 1 });
VideoPipelineJobSchema.index({ createdAt: -1 });

const VideoPipelineJob =
  mongoose.models.VideoPipelineJob || mongoose.model('VideoPipelineJob', VideoPipelineJobSchema);

export default VideoPipelineJob;
