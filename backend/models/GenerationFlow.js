import mongoose from 'mongoose';

const generationFlowSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // ========== STEP 1: INPUT FILES ==========
  characterImage: {
    path: String,
    url: String,
    originalName: String,
    size: Number
  },
  
  productImage: {
    path: String,
    url: String,
    originalName: String,
    size: Number
  },
  
  // ========== ✅ NEW: USE CASE CONFIGURATION ==========
  useCase: {
    type: String,
    enum: ['ecommerce', 'styling', 'brand', 'influencer', 'social'],
    default: 'ecommerce'
  },
  outfitComponents: {
    type: [String],
    enum: ['full', 'top', 'bottom', 'shoes', 'accessories'],
    default: ['full']
  },
  targetAudience: {
    type: String,
    enum: ['general', 'young', 'professional', 'luxury'],
    default: 'general'
  },
  contentGoal: {
    type: String,
    enum: ['sales', 'inspiration', 'engagement', 'awareness'],
    default: 'sales'
  },
  automationLevel: {
    type: String,
    enum: ['manual', 'semi', 'full', 'batch'],
    default: 'manual'
  },
  
  // ========== STEP 2: IMAGE GENERATION ==========
  imageGeneration: {
    status: {
      type: String,
      enum: ['pending', 'analyzing', 'generating', 'completed', 'failed'],
      default: 'pending'
    },
    
    // Analysis results
    characterAnalysis: mongoose.Schema.Types.Mixed,
    productAnalysis: mongoose.Schema.Types.Mixed,
    styleAnalysis: mongoose.Schema.Types.Mixed,
    aiAnalysis: mongoose.Schema.Types.Mixed,
    
    // Prompt used
    imagePrompt: String,
    
    // Style options
    styleOptions: {
      characterStyle: { type: String, default: 'realistic' },
      productStyle: { type: String, default: 'elegant' },
      setting: { type: String, default: 'studio' },
      lighting: { type: String, default: 'natural' },
      cameraAngle: { type: String, default: 'eye-level' },
      mood: { type: String, default: 'confident' },
      colorPalette: { type: String, default: 'vibrant' }
    },
    
    // Generation options
    useGoogleLabs: { type: Boolean, default: false },
    imageCount: { type: Number, default: 4 },
    
    // Generated images
    generatedImages: [{
      path: String,
      url: String,
      seed: Number,
      format: String,
      createdAt: Date
    }],
    
    // Selected image for video
    selectedImageIndex: Number,
    
    // Timing
    startedAt: Date,
    completedAt: Date,
    duration: Number, // seconds
    
    // Error
    error: String
  },
  
  // ========== STEP 3: VIDEO GENERATION ==========
  videoGeneration: {
    status: {
      type: String,
      enum: ['pending', 'analyzing', 'prompting', 'generating', 'completed', 'failed'],
      default: 'pending'
    },
    
    // Input for video (the generated image)
    inputImage: {
      path: String,
      url: String
    },
    
    // User prompt for video
    userPrompt: String,
    
    // Analysis results
    characterAnalysis: mongoose.Schema.Types.Mixed,
    sceneAnalysis: mongoose.Schema.Types.Mixed,
    
    // Prompt engineering
    motionDescription: mongoose.Schema.Types.Mixed,
    cameraInstructions: mongoose.Schema.Types.Mixed,
    lightingAtmosphere: mongoose.Schema.Types.Mixed,
    
    // Final prompt
    finalPrompt: mongoose.Schema.Types.Mixed,
    
    // Video options
    options: {
      cameraMovement: { type: String, default: 'static' },
      motionStyle: { type: String, default: 'moderate' },
      videoStyle: { type: String, default: 'realistic' },
      duration: { type: Number, default: 5 },
      aspectRatio: { type: String, default: '16:9' }
    },
    
    // Generated video
    videoUrl: String,
    videoPath: String,
    videoMetadata: mongoose.Schema.Types.Mixed,
    
    // Model used
    videoModel: {
      type: String,
      default: 'auto'
    },
    
    // Provider actually used (stable-video, animatediff, zeroscope, hotshot, runway, pika, mock)
    provider: String,
    
    // Timing
    startedAt: Date,
    completedAt: Date,
    duration: Number, // seconds
    
    // Error
    error: String
  },
  
  // ========== OVERALL STATUS ==========
  overallStatus: {
    type: String,
    enum: ['draft', 'image-generating', 'image-completed', 'video-generating', 'completed', 'failed'],
    default: 'draft'
  },
  
  // ========== LEGACY STATUS (for backward compatibility) ==========
  status: {
    type: String,
    enum: ['created', 'images_uploaded', 'analyzed', 'images_generated', 'video_generated', 'completed', 'failed'],
    default: 'created'
  },
  
  // ========== USER FEEDBACK ==========
  feedback: {
    imageRating: {
      type: Number,
      min: 1,
      max: 5
    },
    videoRating: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: String
  },
  
  // ========== METADATA ==========
  metadata: {
    totalDuration: Number, // total processing time in seconds
    totalCost: Number,
    modelUsed: String,
    provider: String
  },
  
  // ========== TIMESTAMPS ==========
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
generationFlowSchema.index({ userId: 1, createdAt: -1 });
generationFlowSchema.index({ overallStatus: 1 });

// Update updatedAt on save
generationFlowSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const GenerationFlow = mongoose.model('GenerationFlow', generationFlowSchema);

export default GenerationFlow;
