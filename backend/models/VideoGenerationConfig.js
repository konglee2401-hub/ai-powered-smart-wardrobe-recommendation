import mongoose from 'mongoose';

const videoGenerationConfigSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    // Configuration name and description
    name: {
      type: String,
      required: true
    },
    description: String,
    isDefault: {
      type: Boolean,
      default: false
    },
    
    // Automation Settings
    automationEnabled: {
      type: Boolean,
      default: false
    },
    generationFrequency: {
      type: String,
      enum: ['hourly', 'every2Hours', 'every4Hours', 'every6Hours', 'every12Hours', 'daily', 'custom'],
      default: 'daily'
    },
    generationTime: String, // HH:mm format for daily, or cron expression for custom
    
    // Distribution Settings
    autoDistribute: {
      type: Boolean,
      default: false
    },
    distributionAccounts: [{
      accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SocialMediaAccount'
      },
      enabled: Boolean,
      priority: Number // Higher = posts first
    }],
    accountRotationStrategy: {
      type: String,
      enum: ['sequential', 'random', 'roundRobin', 'weighted'],
      default: 'roundRobin'
    },
    respectRateLimits: {
      type: Boolean,
      default: true
    },
    
    // Content Generation Settings
    contentSettings: {
      videoStyle: String,
      motionIntensity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      },
      videoLength: {
        type: Number,
        default: 60 // seconds
      },
      aspectRatio: {
        type: String,
        enum: ['9:16', '16:9', '1:1'],
        default: '9:16'
      },
      fps: {
        type: Number,
        default: 30
      },
      colorGrading: String,
      audioSettings: {
        includeAudio: Boolean,
        musicStyle: String,
        voiceoverEnabled: Boolean
      }
    },
    
    // Character & Theme Settings
    characterSettings: {
      characterImageUrl: String,
      characterName: String,
      characterTrait: String,
      customInstructions: String
    },
    themeSettings: {
      theme: String,
      mood: String,
      atmosphere: String
    },
    
    // Quality Settings
    qualitySettings: {
      resolution: {
        type: String,
        enum: ['720p', '1080p', '4k'],
        default: '1080p'
      },
      targetBitrate: String,
      compressionLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      }
    },
    
    // Post-processing
    postProcessing: {
      addSubtitles: Boolean,
      subtitleStyle: String,
      addWatermark: Boolean,
      watermarkPosition: String,
      addEndCard: Boolean
    },
    
    // Platform-specific Settings
    platformSettings: {
      tiktok: {
        enabled: Boolean,
        hashtags: [String],
        useSound: Boolean,
        soundId: String,
        description: String
      },
      youtube: {
        enabled: Boolean,
        title: String,
        description: String,
        hashtags: [String],
        visibility: {
          type: String,
          enum: ['public', 'private', 'unlisted'],
          default: 'public'
        },
        category: String,
        allowComments: Boolean,
        allowRatings: Boolean,
        notifications: Boolean
      },
      facebook: {
        enabled: Boolean,
        description: String,
        allowComments: Boolean,
        privacy: {
          type: String,
          enum: ['PUBLIC', 'FRIENDS', 'PRIVATE'],
          default: 'PUBLIC'
        }
      },
      instagram: {
        enabled: Boolean,
        caption: String,
        hashtags: [String],
        location: String
      }
    },
    
    // Error Handling
    errorHandling: {
      retryOnFailure: Boolean,
      maxRetries: {
        type: Number,
        default: 3
      },
      retryDelaySeconds: {
        type: Number,
        default: 300
      },
      notifyOnError: Boolean,
      pauseOnError: Boolean
    },
    
    // Monitoring & Notifications
    monitoring: {
      trackMetrics: Boolean,
      trackEngagement: Boolean,
      trackTrendingTopics: Boolean
    },
    notifications: {
      emailOnComplete: Boolean,
      emailOnError: Boolean,
      webhookUrl: String
    },
    
    // Status
    isActive: {
      type: Boolean,
      default: true
    },
    lastExecutedAt: Date,
    nextExecutionAt: Date,
    executionHistory: [{
      executedAt: Date,
      status: {
        type: String,
        enum: ['success', 'failed', 'partial', 'skipped']
      },
      generatedVideoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VideoGeneration'
      },
      videosGenerated: Number,
      videosDistributed: Number,
      distributionResults: [{
        accountId: mongoose.Schema.Types.ObjectId,
        platform: String,
        status: String,
        postId: String,
        errorMessage: String
      }],
      errorMessage: String,
      duration: Number // in milliseconds
    }],
    
    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
    tags: [String],
    notes: String
  },
  { 
    timestamps: true 
  }
);

// Indexes
videoGenerationConfigSchema.index({ userId: 1, isActive: 1 });
videoGenerationConfigSchema.index({ userId: 1, isDefault: 1 });

// Methods
videoGenerationConfigSchema.methods.isDueForExecution = function() {
  if (!this.automationEnabled) return false;
  
  if (!this.nextExecutionAt) return true;
  
  return new Date() >= this.nextExecutionAt;
};

videoGenerationConfigSchema.methods.updateNextExecution = function() {
  // This would be implemented based on generationFrequency and generationTime
  // For now, just set basic logic
  const now = new Date();
  const nextExecution = new Date(now);
  
  switch (this.generationFrequency) {
    case 'hourly':
      nextExecution.setHours(nextExecution.getHours() + 1);
      break;
    case 'every2Hours':
      nextExecution.setHours(nextExecution.getHours() + 2);
      break;
    case 'every4Hours':
      nextExecution.setHours(nextExecution.getHours() + 4);
      break;
    case 'every6Hours':
      nextExecution.setHours(nextExecution.getHours() + 6);
      break;
    case 'every12Hours':
      nextExecution.setHours(nextExecution.getHours() + 12);
      break;
    case 'daily':
      nextExecution.setDate(nextExecution.getDate() + 1);
      break;
  }
  
  this.nextExecutionAt = nextExecution;
};

export default mongoose.model('VideoGenerationConfig', videoGenerationConfigSchema);
