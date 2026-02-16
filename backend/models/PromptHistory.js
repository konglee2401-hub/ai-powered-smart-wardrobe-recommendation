/**
 * PromptHistory Model
 * MongoDB model for tracking prompt enhancement history
 * 
 * Stores:
 * - Original and enhanced prompts
 * - Quality analysis results
 * - Variations generated
 * - Safety check results
 */

import mongoose from 'mongoose';

const promptHistorySchema = new mongoose.Schema({
  // User reference (optional - for multi-user support)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },

  // Prompt information
  originalPrompt: {
    type: String,
    required: true,
    trim: true,
  },
  
  enhancedPrompt: {
    type: String,
    trim: true,
    default: null,
  },

  // Enhancement options used
  enhancementOptions: {
    type: {
      type: String,
      enum: ['text', 'video', 'both'],
      default: 'both',
    },
    style: {
      type: String,
      enum: ['detailed', 'concise', 'technical'],
      default: 'detailed',
    },
    model: {
      type: String,
      default: 'auto',
    },
  },

  // Quality analysis results
  qualityAnalysis: {
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    level: {
      type: String,
      enum: ['poor', 'fair', 'good', 'excellent'],
      default: null,
    },
    metrics: {
      clarity: { type: Number, default: null },
      specificity: { type: Number, default: null },
      creativity: { type: Number, default: null },
      technicalAccuracy: { type: Number, default: null },
      length: { type: Number, default: null },
    },
    strengths: [{
      type: String,
    }],
    weaknesses: [{
      type: String,
    }],
    suggestions: [{
      type: String,
    }],
  },

  // Variations generated
  variations: [{
    text: String,
    style: String,
    focus: String,
    description: String,
    score: Number,
    selected: {
      type: Boolean,
      default: false,
    },
  }],

  // Safety check results
  safetyCheck: {
    safe: {
      type: Boolean,
      default: null,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    issues: {
      explicit: { type: Boolean, default: false },
      discriminatory: { type: Boolean, default: false },
      violent: { type: Boolean, default: false },
      misleading: { type: Boolean, default: false },
      other: [String],
    },
    flaggedTerms: [String],
  },

  // Optimization results
  optimization: {
    optimizedForImage: {
      type: String,
      default: null,
    },
    optimizedForVideo: {
      type: String,
      default: null,
    },
  },

  // Processing metadata
  metadata: {
    modelUsed: String,
    processingTime: Number,
    provider: String,
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },

  // Error message if failed
  errorMessage: {
    type: String,
    default: null,
  },

  // Reference to source (if integrated with other flows)
  sourceType: {
    type: String,
    enum: ['standalone', 'characterAnalysis', 'productAnalysis', 'pipeline', 'other'],
    default: 'standalone',
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Index for efficient queries
promptHistorySchema.index({ userId: 1, createdAt: -1 });
promptHistorySchema.index({ status: 1 });
promptHistorySchema.index({ 'qualityAnalysis.score': -1 });

// Virtual for completion status
promptHistorySchema.virtual('isComplete').get(function() {
  return this.status === 'completed';
});

// Pre-save middleware
promptHistorySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to find recent by user
promptHistorySchema.statics.findRecentByUser = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to find by status
promptHistorySchema.statics.findByStatus = function(status, limit = 50) {
  return this.find({ status })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Method to mark variation as selected
promptHistorySchema.methods.selectVariation = function(variationIndex) {
  if (this.variations && this.variations[variationIndex]) {
    this.variations.forEach((v, i) => {
      v.selected = i === variationIndex;
    });
    return this.save();
  }
  return Promise.reject(new Error('Variation not found'));
};

const PromptHistory = mongoose.model('PromptHistory', promptHistorySchema);

export default PromptHistory;
