import mongoose from 'mongoose';

const distributionTrackingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    videoGenerationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VideoGeneration',
      index: true
    },
    videoGenerationConfigId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VideoGenerationConfig'
    },
    
    // Distribution Info
    originalVideoUrl: String,
    videoTitle: String,
    videoDescription: String,
    
    // Distribution Status
    overallStatus: {
      type: String,
      enum: ['pending', 'distributing', 'completed', 'partial', 'failed'],
      default: 'pending'
    },
    startedAt: Date,
    completedAt: Date,
    
    // Per-platform distribution
    distributions: [{
      _id: mongoose.Schema.Types.ObjectId,
      accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SocialMediaAccount',
        required: true
      },
      platform: {
        type: String,
        required: true
      },
      accountHandle: String,
      
      // Upload details
      status: {
        type: String,
        enum: ['pending', 'processing', 'uploading', 'success', 'failed', 'skipped'],
        default: 'pending'
      },
      postId: String,
      postUrl: String,
      uploadedAt: Date,
      
      // Content posted
      title: String,
      description: String,
      hashtags: [String],
      customContent: String,
      
      // Platform-specific data
      platformResponse: mongoose.Schema.Types.Mixed,
      
      // Metrics (fetched after posting)
      metrics: {
        views: {
          type: Number,
          default: 0
        },
        likes: {
          type: Number,
          default: 0
        },
        comments: {
          type: Number,
          default: 0
        },
        shares: {
          type: Number,
          default: 0
        },
        saves: {
          type: Number,
          default: 0
        },
        engagementRate: Number,
        completionRate: Number // For video
      },
      metricsLastUpdatedAt: Date,
      metricsFetchCount: {
        type: Number,
        default: 0
      },
      
      // Error handling
      errorMessage: String,
      errorCount: {
        type: Number,
        default: 0
      },
      lastErrorAt: Date,
      retryCount: {
        type: Number,
        default: 0
      },
      maxRetries: {
        type: Number,
        default: 3
      },
      nextRetryAt: Date,
      
      // Timing
      queuedAt: Date,
      startedAt: Date,
      completedAt: Date,
      duration: Number // milliseconds
    }],
    
    // Summary Statistics
    summary: {
      totalAccounts: Number,
      successCount: Number,
      failedCount: Number,
      skippedCount: Number,
      totalViews: {
        type: Number,
        default: 0
      },
      totalLikes: {
        type: Number,
        default: 0
      },
      totalComments: {
        type: Number,
        default: 0
      },
      totalShares: {
        type: Number,
        default: 0
      },
      averageEngagementRate: Number,
      bestPerformingPlatform: String,
      worstPerformingPlatform: String
    },
    
    // Scheduling
    scheduledFor: Date,
    rateLimitRespected: {
      type: Boolean,
      default: true
    },
    delayReasons: [String],
    
    // Monitoring
    isMonitored: {
      type: Boolean,
      default: true
    },
    monitoringEndDate: Date,
    metricsFetchInterval: {
      type: Number,
      default: 3600 // seconds (1 hour)
    },
    nextMetricsFetchAt: Date,
    metricsFetchHistory: [{
      fetchedAt: Date,
      totalViews: Number,
      totalLikes: Number,
      totalComments: Number,
      totalShares: Number
    }],
    
    // Notifications
    notificationsSent: [{
      type: String,
      sentAt: Date,
      message: String
    }],
    
    // Metadata
    tags: [String],
    notes: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  { 
    timestamps: true,
    collection: 'distribution_tracking'
  }
);

// Indexes
distributionTrackingSchema.index({ userId: 1, createdAt: -1 });
distributionTrackingSchema.index({ videoGenerationId: 1 });
distributionTrackingSchema.index({ overallStatus: 1 });
distributionTrackingSchema.index({ 'distributions.platform': 1 });

// Methods
distributionTrackingSchema.methods.calculateSummary = function() {
  const summary = {
    totalAccounts: this.distributions.length,
    successCount: 0,
    failedCount: 0,
    skippedCount: 0,
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    totalShares: 0
  };
  
  this.distributions.forEach(dist => {
    if (dist.status === 'success') {
      summary.successCount++;
      summary.totalViews += dist.metrics.views || 0;
      summary.totalLikes += dist.metrics.likes || 0;
      summary.totalComments += dist.metrics.comments || 0;
      summary.totalShares += dist.metrics.shares || 0;
    } else if (dist.status === 'failed') {
      summary.failedCount++;
    } else if (dist.status === 'skipped') {
      summary.skippedCount++;
    }
  });
  
  if (summary.totalAccounts > 0) {
    const totalEngagement = summary.totalViews + summary.totalLikes + summary.totalComments + summary.totalShares;
    summary.averageEngagementRate = (totalEngagement / (summary.totalViews || 1)) * 100;
  }
  
  this.summary = summary;
  return summary;
};

distributionTrackingSchema.methods.getDistributionStatus = function() {
  const statuses = this.distributions.map(d => d.status);
  
  if (statuses.every(s => s === 'success')) return 'completed';
  if (statuses.every(s => s === 'pending')) return 'pending';
  if (statuses.every(s => ['pending', 'processing', 'uploading'].includes(s))) return 'distributing';
  if (statuses.some(s => s === 'success')) return 'partial';
  if (statuses.some(s => s !== 'failed')) return 'partial';
  return 'failed';
};

distributionTrackingSchema.methods.isDistributionDue = function() {
  if (!this.isMonitored) return false;
  if (this.monitoringEndDate && new Date() > this.monitoringEndDate) return false;
  if (!this.nextMetricsFetchAt) return true;
  return new Date() >= this.nextMetricsFetchAt;
};

export default mongoose.model('DistributionTracking', distributionTrackingSchema);
