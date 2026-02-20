/**
 * Session History Model Schema
 * MongoDB schema for storing analysis sessions, conversations, and prompt iterations
 */

import mongoose from 'mongoose';

// Analysis Stage Schema
const AnalysisStageSub = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        'started',
        'analyzing',
        'analyzed',
        'styling',
        'prompt_building',
        'prompt_enhanced',
        'generating',
        'completed',
        'failed',
        'abandoned'
      ],
      default: 'started'
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: Date,
    provider: String, // 'grok', 'zai', etc
    grokConversation: {
      conversationId: String,
      requestId: String,
      fullUrl: String,
      parsedAt: Date
    },
    analysisData: mongoose.Schema.Types.Mixed,
    analysisTime: Number, // milliseconds
    rawResponse: mongoose.Schema.Types.Mixed
  },
  { _id: false }
);

// Style Stage Schema
const StyleStageSub = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        'started',
        'analyzing',
        'analyzed',
        'styling',
        'prompt_building',
        'prompt_enhanced',
        'generating',
        'completed',
        'failed',
        'abandoned'
      ],
      default: 'started'
    },
    startedAt: Date,
    completedAt: Date,
    selectedOptions: mongoose.Schema.Types.Mixed, // Object with category: [values]
    referenceImages: [
      {
        id: String,
        type: String, // 'character', 'product', 'reference'
        imageUrl: String,
        base64Data: String,
        uploadedAt: { type: Date, default: Date.now }
      }
    ]
  },
  { _id: false }
);

// Prompt Stage Schema
const PromptStageSub = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        'started',
        'analyzing',
        'analyzed',
        'styling',
        'prompt_building',
        'prompt_enhanced',
        'generating',
        'completed',
        'failed',
        'abandoned'
      ],
      default: 'started'
    },
    startedAt: Date,
    completedAt: Date,
    initialPrompt: String,
    customPrompt: String,
    promptVariations: [
      {
        id: String,
        basePrompt: String,
        variation: String,
        method: String, // 'synonym_replacement', 'adjective_reorder', etc
        createdAt: { type: Date, default: Date.now }
      }
    ],
    layeredPrompt: {
      main: String,
      refiner: String,
      negative: String,
      combined: {
        positive: String,
        negative: String
      },
      createdAt: Date
    },
    enhancedPrompt: String,
    enhancementMethod: String, // 'grok_conversation', 'ai_api', etc
    grokEnhancementConversation: {
      conversationId: String,
      requestId: String,
      fullUrl: String,
      messages: [
        {
          role: String,
          content: String,
          timestamp: Date
        }
      ]
    },
    optimizations: [
      {
        id: String,
        method: String,
        originalLength: Number,
        optimizedLength: Number,
        reduction: Number,
        percentage: Number,
        details: mongoose.Schema.Types.Mixed,
        timestamp: Date
      }
    ]
  },
  { _id: false }
);

// Generation Stage Schema
const GenerationStageSub = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: [
        'started',
        'analyzing',
        'analyzed',
        'styling',
        'prompt_building',
        'prompt_enhanced',
        'generating',
        'completed',
        'failed',
        'abandoned'
      ],
      default: 'started'
    },
    startedAt: Date,
    completedAt: Date,
    provider: String,
    grokConversationId: String, // 💫 NEW: Store conversation ID from analysis for reuse
    grokUrl: String, // 💫 NEW: Full Grok URL for reference
    finalPrompt: String,
    negativePrompt: String, // 💫 NEW: Track negative prompt too
    generatedImages: [
      {
        id: String,
        url: String,
        base64: String,
        generatedAt: Date,
        // 💫 NEW: Storage details
        storageType: { type: String, enum: ['local', 'cloud'], default: 'local' },
        localPath: String, // Local file path
        cloudUrl: String, // imgbb or other cloud URL
        cloudMetadata: mongoose.Schema.Types.Mixed, // imgbb response data
        fileSize: Number, // bytes
        metadata: mongoose.Schema.Types.Mixed
      }
    ],
    // 💫 NEW: Storage configuration
    storageConfig: {
      type: { type: String, enum: ['local', 'cloud'], default: 'cloud' },
      localFolder: String, // For local storage
      cloudProvider: { type: String, enum: ['imgbb', 'other'], default: 'imgbb' },
      cloudFolderName: String, // e.g., "2026-02-20"
      createdAt: { type: Date, default: Date.now }
    },
    // 💫 NEW: Error tracking
    error: {
      message: String,
      code: String,
      stack: String,
      timestamp: Date
    },
    // 💫 NEW: Generation settings/options
    settings: mongoose.Schema.Types.Mixed,
    // 💫 NEW: Success rate and performance
    generationResult: {
      totalRequested: Number,
      totalGenerated: Number,
      successRate: Number, // 0-100
      averageTime: Number, // ms per image
      totalTime: Number // ms for all images
    }
  },
  { _id: false }
);

// Main Session History Schema
const SessionHistorySchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    userId: {
      type: String,
      index: true,
      sparse: true
    },
    useCase: {
      type: String,
      enum: [
        'change-clothes',
        'ecommerce-product',
        'social-media',
        'fashion-editorial',
        'lifestyle-scene',
        'before-after'
      ],
      required: true,
      index: true
    },
    characterImageId: String,
    productImageId: String,

    // 💫 NEW: Top-level conversation ID for easy tracking
    grokConversationId: { type: String, index: true, sparse: true },

    // Stage tracking
    analysisStage: AnalysisStageSub,
    styleStage: StyleStageSub,
    promptStage: PromptStageSub,
    generationStage: GenerationStageSub,

    // Metadata
    metadata: {
      browser: String,
      timezone: Number,
      locale: String,
      ipAddress: String,
      deviceType: String
    },

    // Timing
    createdAt: { type: Date, default: Date.now, index: true },
    updatedAt: { type: Date, default: Date.now, index: true },
    completedAt: Date,
    // 💫 NEW: Track total session duration
    totalDuration: Number, // milliseconds

    // Status tracking
    currentStatus: {
      type: String,
      enum: [
        'started',
        'analyzing',
        'analyzed',
        'styling',
        'prompt_building',
        'prompt_enhanced',
        'generating',
        'completed',
        'failed',
        'abandoned'
      ],
      default: 'started',
      index: true
    },

    // 💫 NEW: Overall session completion status
    completion: {
      isComplete: { type: Boolean, default: false },
      isSuccessful: { type: Boolean, default: false },
      hasErrors: { type: Boolean, default: false },
      completedStages: [String], // array of completed stages
      failedAt: String, // which stage failed
      errorMessage: String
    },

    // Additional fields
    notes: String,
    tags: [String],
    isArchived: { type: Boolean, default: false }
  },
  {
    timestamps: true,
    indexes: [
      { userId: 1, createdAt: -1 },
      { useCase: 1, currentStatus: 1 },
      { sessionId: 1 },
      { grokConversationId: 1 },
      { 'completion.isComplete': 1, createdAt: -1 }
    ]
  }
);

// Middleware to update updatedAt
SessionHistorySchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('SessionHistory', SessionHistorySchema);
