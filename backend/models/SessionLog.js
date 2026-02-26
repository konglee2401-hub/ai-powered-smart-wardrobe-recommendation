import mongoose from 'mongoose';

const sessionLogSchema = new mongoose.Schema({
  // Session reference
  sessionId: {
    type: String,
    required: true,
    index: true
  },

  // Flow type
  flowType: {
    type: String,
    enum: ['one-click', 'affiliate-tiktok', 'image-generation', 'video-generation'],
    default: 'one-click',
    index: true
  },

  // Log entries (array to keep logs organized)
  logs: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    level: {
      type: String,
      enum: ['debug', 'info', 'warn', 'error'],
      default: 'info'
    },
    category: {
      type: String,
      index: true
      // e.g., 'character-analysis', 'image-generation', 'video-generation', 'prompt-building', 'submission', 'error'
    },
    message: String,
    details: mongoose.Schema.Types.Mixed // For structured data like errors, metrics, etc
  }],

  // Session metadata
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'failed', 'cancelled'],
    default: 'in-progress',
    index: true
  },

  // Stored artifacts for debugging (store references/paths)
  artifacts: {
    characterImagePath: String,
    productImagePath: String,
    generatedImagePaths: [String],
    videoSegmentPaths: [String]
  },

  // Analysis results
  analysis: {
    characterAnalysis: mongoose.Schema.Types.Mixed,
    productAnalysis: mongoose.Schema.Types.Mixed
  },

  // Generation metrics
  metrics: {
    totalDuration: Number, // milliseconds
    characterAnalysisTime: Number,
    imageGenerationTime: Number,
    videoGenerationTime: Number,
    stages: [{
      stage: String,
      startTime: Date,
      endTime: Date,
      duration: Number,
      status: String
    }]
  },

  // Error tracking
  error: {
    stage: String,
    message: String,
    stack: String,
    timestamp: Date
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
sessionLogSchema.index({ sessionId: 1, createdAt: -1 });
sessionLogSchema.index({ status: 1, createdAt: -1 });

// Methods
sessionLogSchema.methods.addLog = function(message, level = 'info', category = 'general', details = null) {
  this.logs.push({
    timestamp: new Date(),
    level,
    category,
    message,
    details
  });
};

sessionLogSchema.methods.addError = function(stage, message, stack = null) {
  this.status = 'failed';
  this.error = {
    stage,
    message,
    stack,
    timestamp: new Date()
  };
  this.addLog(`Error in ${stage}: ${message}`, 'error', 'error');
};

sessionLogSchema.methods.markCompleted = function() {
  this.status = 'completed';
  this.updatedAt = new Date();
};

sessionLogSchema.methods.markFailed = function(reason) {
  this.status = 'failed';
  this.error = { ...this.error, message: reason };
  this.updatedAt = new Date();
};

// Statics
sessionLogSchema.statics.createSession = async function(sessionId, flowType = 'one-click') {
  return await this.create({
    sessionId,
    flowType,
    status: 'in-progress',
    logs: [{
      timestamp: new Date(),
      level: 'info',
      category: 'session',
      message: `Session started`,
      details: { flowType }
    }]
  });
};

sessionLogSchema.statics.getSessionLogs = async function(sessionId) {
  return await this.findOne({ sessionId });
};

sessionLogSchema.statics.getRecentSessions = async function(limit = 10) {
  return await this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('sessionId flowType status createdAt metrics.totalDuration error.message');
};

export default mongoose.model('SessionLog', sessionLogSchema);
