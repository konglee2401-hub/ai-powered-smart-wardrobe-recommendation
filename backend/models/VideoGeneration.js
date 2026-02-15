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
  userFeedback: String
  
}, {
  timestamps: true
});

// Index for faster queries
videoGenerationSchema.index({ userId: 1, createdAt: -1 });
videoGenerationSchema.index({ status: 1 });

export default mongoose.model('VideoGeneration', videoGenerationSchema);
