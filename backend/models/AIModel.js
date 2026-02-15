import mongoose from 'mongoose';

const AIModelSchema = new mongoose.Schema({
  // Basic Info
  modelId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  provider: {
    type: String,
    required: true,
    enum: ['anthropic', 'openai', 'google', 'byteplus', 'fireworks', 'zai', 'grok', 'replicate', 'huggingface', 'runway', 'luma', 'nvidia', 'mistral', 'groq']
  },
  
  // Model Type
  type: {
    type: String,
    required: true,
    enum: ['analysis', 'image-generation', 'video-generation']
  },
  
  // Capabilities
  capabilities: {
    vision: { type: Boolean, default: false },
    imageInput: { type: Boolean, default: false },
    streaming: { type: Boolean, default: false },
    reasoning: { type: Boolean, default: false }
  },
  
  // Pricing
  pricing: {
    inputCost: { type: Number, default: 0 }, // per 1M tokens
    outputCost: { type: Number, default: 0 }, // per 1M tokens
    imageCost: { type: Number, default: 0 }, // per image
    videoCost: { type: Number, default: 0 }, // per second
    free: { type: Boolean, default: false }
  },
  
  // Status
  status: {
    available: { type: Boolean, default: true },
    deprecated: { type: Boolean, default: false },
    experimental: { type: Boolean, default: false },
    recommended: { type: Boolean, default: false }
  },
  
  // Performance
  performance: {
    priority: { type: Number, default: 100 },
    avgResponseTime: { type: Number, default: 0 }, // seconds
    successRate: { type: Number, default: 100 }, // percentage
    totalRequests: { type: Number, default: 0 },
    successfulRequests: { type: Number, default: 0 },
    failedRequests: { type: Number, default: 0 }
  },
  
  // API Details
  apiDetails: {
    endpoint: String,
    modelIdentifier: String, // actual model ID used in API
    maxTokens: Number,
    contextWindow: Number,
    supportedFormats: [String]
  },
  
  // Metadata
  metadata: {
    description: String,
    releaseDate: Date,
    lastChecked: { type: Date, default: Date.now },
    lastUsed: Date,
    tags: [String]
  }
}, {
  timestamps: true
});

// Indexes
AIModelSchema.index({ provider: 1, type: 1 });
AIModelSchema.index({ 'status.available': 1, 'performance.priority': 1 });
AIModelSchema.index({ type: 1, 'status.available': 1 });

// Methods
AIModelSchema.methods.recordSuccess = async function(responseTime) {
  this.performance.totalRequests += 1;
  this.performance.successfulRequests += 1;
  
  // Update average response time
  const totalTime = this.performance.avgResponseTime * (this.performance.totalRequests - 1);
  this.performance.avgResponseTime = (totalTime + responseTime) / this.performance.totalRequests;
  
  // Update success rate
  this.performance.successRate = (this.performance.successfulRequests / this.performance.totalRequests) * 100;
  
  this.metadata.lastUsed = new Date();
  
  await this.save();
};

AIModelSchema.methods.recordFailure = async function() {
  this.performance.totalRequests += 1;
  this.performance.failedRequests += 1;
  
  // Update success rate
  this.performance.successRate = (this.performance.successfulRequests / this.performance.totalRequests) * 100;
  
  // Auto-disable if success rate too low
  if (this.performance.totalRequests > 10 && this.performance.successRate < 20) {
    this.status.available = false;
    console.log(`⚠️  Auto-disabled ${this.name} due to low success rate (${this.performance.successRate.toFixed(2)}%)`);
  }
  
  await this.save();
};

AIModelSchema.methods.updateAvailability = async function(isAvailable) {
  this.status.available = isAvailable;
  this.metadata.lastChecked = new Date();
  await this.save();
};

// Static methods
AIModelSchema.statics.getAvailableModels = async function(type, provider = null) {
  const query = {
    type: type,
    'status.available': true,
    'status.deprecated': false
  };
  
  if (provider) {
    query.provider = provider;
  }
  
  return this.find(query).sort({ 'performance.priority': 1 });
};

AIModelSchema.statics.getRecommendedModels = async function(type) {
  return this.find({
    type: type,
    'status.available': true,
    'status.recommended': true,
    'status.deprecated': false
  }).sort({ 'performance.priority': 1 });
};

AIModelSchema.statics.getBestPerformingModels = async function(type, limit = 5) {
  return this.find({
    type: type,
    'status.available': true,
    'performance.totalRequests': { $gte: 10 }
  })
  .sort({ 'performance.successRate': -1, 'performance.avgResponseTime': 1 })
  .limit(limit);
};

export default mongoose.model('AIModel', AIModelSchema);
