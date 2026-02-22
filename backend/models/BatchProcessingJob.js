import mongoose from 'mongoose';

const batchProcessingJobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    // Batch Info
    batchName: {
      type: String,
      required: true
    },
    batchDescription: String,
    batchType: {
      type: String,
      enum: ['image', 'video', 'audio', 'mixed'],
      required: true
    },
    
    // Input Source
    inputSource: {
      type: {
        type: String,
        enum: ['cloud-folder', 'local-upload', 'api', 'scheduled'],
        default: 'cloud-folder'
      },
      folderPath: String,
      folderSize: Number,
      isRecursive: Boolean
    },
    
    // Job Status
    overallStatus: {
      type: String,
      enum: ['pending', 'queued', 'processing', 'paused', 'completed', 'failed', 'cancelled'],
      default: 'pending'
    },
    priority: {
      type: Number,
      default: 0, // Higher = more priority
      min: 0,
      max: 10
    },
    
    // Items
    items: [{
      _id: mongoose.Schema.Types.ObjectId,
      sourceFileId: mongoose.Schema.Types.ObjectId,
      processingConfig: {
        style: String,
        intensity: String,
        customInstructions: String
      },
      status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed', 'skipped'],
        default: 'pending'
      },
      progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },
      result: {
        outputFileId: String,
        outputFilePath: String,
        outputFileName: String,
        outputSize: Number,
        outputUrl: String
      },
      timing: {
        queuedAt: Date,
        startedAt: Date,
        completedAt: Date,
        duration: Number // milliseconds
      },
      error: {
        message: String,
        code: String,
        retryCount: Number,
        maxRetries: Number,
        nextRetryAt: Date
      },
      metadata: mongoose.Schema.Types.Mixed
    }],
    
    // Progress
    progress: {
      total: {
        type: Number,
        default: 0
      },
      completed: {
        type: Number,
        default: 0
      },
      failed: {
        type: Number,
        default: 0
      },
      skipped: {
        type: Number,
        default: 0
      },
      inProgress: {
        type: Number,
        default: 0
      },
      pending: {
        type: Number,
        default: 0
      },
      progressPercentage: {
        type: Number,
        default: 0
      },
      estimatedTimeRemaining: Number, // seconds
      averageTimePerItem: Number // milliseconds
    },
    
    // Processing Config
    processingConfig: {
      maxConcurrentItems: {
        type: Number,
        default: 3
      },
      processingModel: String,
      outputQuality: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'high'
      },
      retryFailedItems: {
        type: Boolean,
        default: true
      },
      maxRetries: {
        type: Number,
        default: 3
      },
      skipOnError: {
        type: Boolean,
        default: false
      },
      customSettings: mongoose.Schema.Types.Mixed
    },
    
    // Output Config
    outputConfig: {
      outputFolder: String,
      outputFolderPath: String,
      fileNameTemplate: String,
      includeOperatingReport: {
        type: Boolean,
        default: true
      },
      compressOutput: {
        type: Boolean,
        default: false
      },
      createZipArchive: {
        type: Boolean,
        default: false
      },
      notifyOnCompletion: {
        type: Boolean,
        default: true
      }
    },
    
    // Timing
    scheduling: {
      scheduledFor: Date,
      startedAt: Date,
      completedAt: Date,
      pausedAt: Date,
      resumedAt: Date,
      cancelledAt: Date,
      totalDuration: Number, // milliseconds
      estimatedDuration: Number, // milliseconds
      isPeriodic: Boolean,
      recurringFrequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'custom']
      },
      nextScheduledRun: Date
    },
    
    // Statistics
    statistics: {
      totalSize: Number, // bytes
      processedSize: Number, // bytes
      failedSize: Number, // bytes
      averageFileSize: Number,
      totalFiles: Number,
      successRate: Number,
      errorBreakdown: [{
        errorType: String,
        count: Number
      }],
      performanceMetrics: {
        itemsPerSecond: Number,
        bytesPerSecond: Number,
        cpuUsage: Number,
        memoryUsage: Number
      }
    },
    
    // Notifications & Alerts
    notifications: {
      enabled: Boolean,
      channels: [String], // 'email', 'webhook', 'sms'
      recipients: [String],
      alerts: [{
        type: {
          type: String,
          enum: ['info', 'warning', 'error', 'critical']
        },
        message: String,
        timestamp: Date,
        acknowledged: Boolean
      }],
      lastNotificationAt: Date
    },
    
    // Error Handling
    errorHandling: {
      pauseOnError: {
        type: Boolean,
        default: false
      },
      autoResumeAfter: Number, // seconds
      notifyOnError: {
        type: Boolean,
        default: true
      },
      errorThreshold: Number, // percentage
      totalErrorCount: {
        type: Number,
        default: 0
      }
    },
    
    // Dependencies & Relationships
    relatedConfigs: [{
      configId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VideoGenerationConfig'
      }
    }],
    generatedVideoIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VideoGeneration'
    }],
    
    // Tags & Organization
    tags: [String],
    labels: [String],
    customFields: mongoose.Schema.Types.Mixed,
    
    // Metadata
    notes: String,
    metadata: mongoose.Schema.Types.Mixed,
    isVisible: {
      type: Boolean,
      default: true
    }
  },
  { 
    timestamps: true,
    collection: 'batch_processing_jobs'
  }
);

// Indexes
batchProcessingJobSchema.index({ userId: 1, createdAt: -1 });
batchProcessingJobSchema.index({ overallStatus: 1 });
batchProcessingJobSchema.index({ priority: -1 });
batchProcessingJobSchema.index({ 'items.status': 1 });

// Methods
batchProcessingJobSchema.methods.updateProgress = function() {
  this.progress.total = this.items.length;
  this.progress.completed = this.items.filter(i => i.status === 'completed').length;
  this.progress.failed = this.items.filter(i => i.status === 'failed').length;
  this.progress.skipped = this.items.filter(i => i.status === 'skipped').length;
  this.progress.inProgress = this.items.filter(i => i.status === 'processing').length;
  this.progress.pending = this.items.filter(i => i.status === 'pending').length;
  
  if (this.progress.total > 0) {
    this.progress.progressPercentage = 
      ((this.progress.completed + this.progress.failed + this.progress.skipped) / this.progress.total) * 100;
  }
  
  // Calculate success rate
  if (this.statistics && this.progress.total > 0) {
    this.statistics.successRate = 
      (this.progress.completed / this.progress.total) * 100;
  }
  
  return this.progress;
};

batchProcessingJobSchema.methods.canProcessMore = function() {
  // Check if we can add more items to concurrent processing
  return this.progress.inProgress < this.processingConfig.maxConcurrentItems;
};

batchProcessingJobSchema.methods.getNextPendingItem = function() {
  return this.items.find(i => i.status === 'pending');
};

batchProcessingJobSchema.methods.calculateEstimatedTime = function() {
  if (this.progress.averageTimePerItem && this.progress.pending > 0) {
    this.progress.estimatedTimeRemaining = 
      (this.progress.pending * this.progress.averageTimePerItem) / 1000; // in seconds
    return this.progress.estimatedTimeRemaining;
  }
  return null;
};

batchProcessingJobSchema.methods.pause = function() {
  if (this.overallStatus === 'processing') {
    this.overallStatus = 'paused';
    this.scheduling.pausedAt = new Date();
    return true;
  }
  return false;
};

batchProcessingJobSchema.methods.resume = function() {
  if (this.overallStatus === 'paused') {
    this.overallStatus = 'processing';
    this.scheduling.resumedAt = new Date();
    return true;
  }
  return false;
};

batchProcessingJobSchema.methods.cancel = function() {
  if (['pending', 'queued', 'processing', 'paused'].includes(this.overallStatus)) {
    this.overallStatus = 'cancelled';
    this.scheduling.cancelledAt = new Date();
    return true;
  }
  return false;
};

export default mongoose.model('BatchProcessingJob', batchProcessingJobSchema);
