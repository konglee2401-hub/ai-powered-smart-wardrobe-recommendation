import mongoose from 'mongoose';

const videoGenerationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Input files
  characterImage: {
    type: String,
    required: true
  },
  referenceMedia: String,
  referenceMediaType: {
    type: String,
    enum: ['image', 'video'],
    default: 'image'
  },
  userPrompt: {
    type: String,
    required: true
  },
  
  // Analysis results (stored as JSON)
  characterAnalysis: mongoose.Schema.Types.Mixed,
  referenceAnalysis: mongoose.Schema.Types.Mixed,
  sceneAnalysis: mongoose.Schema.Types.Mixed,
  
  // Prompt engineering results
  motionDescription: mongoose.Schema.Types.Mixed,
  cameraInstructions: mongoose.Schema.Types.Mixed,
  lightingAtmosphere: mongoose.Schema.Types.Mixed,
  consistencyRules: mongoose.Schema.Types.Mixed,
  
  // Final output
  finalPrompt: mongoose.Schema.Types.Mixed,
  videoUrl: String,
  videoMetadata: mongoose.Schema.Types.Mixed,
  videoModel: {
    type: String,
    default: 'runway'
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'analyzing', 'prompting', 'assembling', 'generating', 'completed', 'failed'],
    default: 'pending'
  },
  errorMessage: String,
  
  // Timing
  completedAt: Date,
  
  // Refinement tracking
  parentGenerationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VideoGeneration'
  },
  refinementFeedback: String,
  
  // User feedback
  userRating: {
    type: Number,
    min: 1,
    max: 5
  },
  userFeedback: String,

  // Session and segment data (NEW)
  sessionId: String,
  segments: [{
    index: Number,
    prompt: String,
    videoUrl: String,
    videoDuration: Number,
    videoSize: Number,
    generatedAt: Date,
    completedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'generating', 'completed', 'failed'],
      default: 'pending'
    },
    errorMessage: String
  }],
  
  // Composed video (NEW)
  composedVideoUrl: String,
  composedVideoSize: Number,
  composedAt: Date,
  
  // Extracted frames (NEW)
  extractedFrames: [{
    id: String,
    videoSegmentIndex: Number,
    framePosition: String, // e.g., 'last-frame'
    framePath: String,
    extractedAt: Date,
    usedFor: String // Reference to next generation if reused
  }],
  
  // Generation metrics (NEW)
  metrics: {
    uploadTimeMs: Number,
    postIdDetectionTimeMs: Number,
    segmentGenerationTimesMs: [Number],
    totalTimeMs: Number,
    successRate: Number,
    retryCount: Number,
    errors: [String],
    bottleneck: String,
    phaseBreakdown: mongoose.Schema.Types.Mixed
  },
  
  // Prompt suggestions history (NEW)
  promptSuggestions: [{
    original: String,
    suggested: String,
    type: String,
    appliedAt: Date
  }],
  
  // Frame reuse tracking (NEW)
  usedExtractedFrame: {
    sourceGenerationId: mongoose.Schema.Types.ObjectId,
    sourceSessionId: String,
    frameId: String,
    usedAt: Date
  }
  
}, {
  timestamps: true
});

// Index for faster queries
videoGenerationSchema.index({ userId: 1, createdAt: -1 });
videoGenerationSchema.index({ status: 1 });
videoGenerationSchema.index({ sessionId: 1 });
videoGenerationSchema.index({ 'usedExtractedFrame.sourceGenerationId': 1 });

export default mongoose.model('VideoGeneration', videoGenerationSchema);
