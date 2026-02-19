
import mongoose from 'mongoose';

/**
 * Enhanced AI Provider Configuration Schema
 * 
 * Supports:
 * - Storing multiple API keys per provider
 * - Setting provider priority (order)
 * - Enabling/disabling provider
 * - Categorizing by capability
 */

const aiProviderSchema = new mongoose.Schema({
  providerId: {
    type: String,
    required: true,
    unique: true, // 'google', 'openai', 'anthropic', 'nvidia', etc.
    index: true
  },
  name: {
    type: String,
    required: true
  },
  priority: {
    type: Number,
    default: 100 // Lower number = Higher priority (1 is highest)
  },
  isEnabled: {
    type: Boolean,
    default: true
  },
  capabilities: {
    analysis: { type: Boolean, default: false },
    vision: { type: Boolean, default: false },
    text: { type: Boolean, default: false },
    image: { type: Boolean, default: false },
    video: { type: Boolean, default: false }
  },
  apiKeys: [{
    key: { type: String, required: true },
    label: { type: String, default: 'Key 1' },
    status: { type: String, enum: ['active', 'rate_limited', 'expired', 'disabled'], default: 'active' },
    lastUsed: { type: Date },
    lastFailure: { type: Date },
    failures: { type: Number, default: 0 },
    rateLimitUntil: { type: Date }
  }],
  settings: {
    maxRetries: { type: Number, default: 3 },
    timeoutMs: { type: Number, default: 60000 },
    concurrentRequests: { type: Number, default: 5 }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Pre-save hook to update timestamps
aiProviderSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

const AIProvider = mongoose.model('AIProvider', aiProviderSchema);

export default AIProvider;
