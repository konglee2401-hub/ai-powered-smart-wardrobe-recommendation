import mongoose from 'mongoose';

const monitoringStatsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    // Date grouping
    date: {
      type: Date,
      default: () => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return date;
      },
      index: true
    },
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'daily'
    },
    
    // Video Generation Stats
    videoGeneration: {
      totalGenerated: {
        type: Number,
        default: 0
      },
      successful: {
        type: Number,
        default: 0
      },
      failed: {
        type: Number,
        default: 0
      },
      inProgress: {
        type: Number,
        default: 0
      },
      averageGenerationTime: Number, // milliseconds
      errorRate: Number, // percentage
      topErrors: [{
        errorMessage: String,
        count: Number
      }]
    },
    
    // Distribution Stats
    distribution: {
      totalDistributed: {
        type: Number,
        default: 0
      },
      successful: {
        type: Number,
        default: 0
      },
      failed: {
        type: Number,
        default: 0
      },
      pending: {
        type: Number,
        default: 0
      },
      byPlatform: {
        tiktok: {
          count: Number,
          successful: Number,
          failed: Number
        },
        youtube: {
          count: Number,
          successful: Number,
          failed: Number
        },
        facebook: {
          count: Number,
          successful: Number,
          failed: Number
        },
        instagram: {
          count: Number,
          successful: Number,
          failed: Number
        }
      },
      successRate: Number // percentage
    },
    
    // Engagement Stats
    engagement: {
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
      totalSaves: {
        type: Number,
        default: 0
      },
      averageEngagementRate: Number,
      topPerformingPost: {
        videoId: mongoose.Schema.Types.ObjectId,
        platform: String,
        postId: String,
        views: Number,
        engagement: Number
      }
    },
    
    // Account Stats
    accounts: {
      total: Number,
      active: Number,
      inactive: Number,
      byPlatform: {
        tiktok: Number,
        youtube: Number,
        facebook: Number,
        instagram: Number
      },
      successRate: Number,
      averagePostsPerAccount: Number,
      problemAccounts: [{
        accountId: mongoose.Schema.Types.ObjectId,
        platform: String,
        issueCount: Number,
        lastIssue: String
      }]
    },
    
    // System Health
    systemHealth: {
      uptime: Number, // percentage
      errorRate: Number, // percentage
      averageResponseTime: Number, // milliseconds
      apiQuotaUsage: Number, // percentage
      storageUsage: Number // percentage
    },
    
    // Resource Usage
    resources: {
      cpuUsage: Number,
      memoryUsage: Number,
      diskUsage: Number,
      networkBandwidth: Number
    },
    
    // Error Tracking
    errors: {
      totalErrors: {
        type: Number,
        default: 0
      },
      criticalErrors: {
        type: Number,
        default: 0
      },
      warningCount: {
        type: Number,
        default: 0
      },
      infoCount: {
        type: Number,
        default: 0
      },
      recentErrors: [{
        timestamp: Date,
        type: {
          type: String,
          enum: ['critical', 'error', 'warning', 'info']
        },
        message: String,
        source: String,
        resolved: Boolean
      }]
    },
    
    // Trends
    trends: {
      videoGenerationTrend: [Number], // Array of hourly/daily counts
      engagementTrend: [Number],
      errorTrend: [Number],
      viewsTrend: [Number]
    },
    
    // Alerts
    alerts: [{
      severity: {
        type: String,
        enum: ['critical', 'high', 'medium', 'low']
      },
      message: String,
      source: String,
      triggeredAt: Date,
      resolvedAt: Date,
      actionsTaken: [String]
    }],
    
    // Metadata
    notes: String,
    metadata: mongoose.Schema.Types.Mixed,
    isLocked: {
      type: Boolean,
      default: false
    }
  },
  { 
    timestamps: true,
    collection: 'monitoring_stats'
  }
);

// Indexes
monitoringStatsSchema.index({ userId: 1, date: -1 });
monitoringStatsSchema.index({ userId: 1, period: 1 });
monitoringStatsSchema.index({ date: -1 });

// Methods
monitoringStatsSchema.methods.calculateRates = function() {
  // Video generation error rate
  if (this.videoGeneration.totalGenerated > 0) {
    this.videoGeneration.errorRate = 
      (this.videoGeneration.failed / this.videoGeneration.totalGenerated) * 100;
  }
  
  // Distribution success rate
  const totalDistribution = 
    this.distribution.successful + 
    this.distribution.failed + 
    this.distribution.pending;
  if (totalDistribution > 0) {
    this.distribution.successRate = 
      (this.distribution.successful / totalDistribution) * 100;
  }
  
  // System error rate
  const totalErrors = 
    this.errors.criticalErrors + 
    this.errors.warningCount + 
    this.errors.infoCount;
  if (totalErrors > 0) {
    this.systemHealth.errorRate = 
      (this.errors.criticalErrors / totalErrors) * 100;
  }
  
  // Engagement rate
  const totalEngagement = 
    this.engagement.totalLikes + 
    this.engagement.totalComments + 
    this.engagement.totalShares + 
    this.engagement.totalSaves;
  if (this.engagement.totalViews > 0) {
    this.engagement.averageEngagementRate = 
      (totalEngagement / this.engagement.totalViews) * 100;
  }
};

monitoringStatsSchema.methods.addError = function(errorType, message, source) {
  this.errors.totalErrors++;
  
  if (errorType === 'critical') {
    this.errors.criticalErrors++;
  } else if (errorType === 'warning') {
    this.errors.warningCount++;
  } else if (errorType === 'info') {
    this.errors.infoCount++;
  }
  
  // Add to recent errors (keep last 10)
  this.errors.recentErrors.unshift({
    timestamp: new Date(),
    type: errorType,
    message,
    source,
    resolved: false
  });
  
  if (this.errors.recentErrors.length > 10) {
    this.errors.recentErrors.pop();
  }
};

monitoringStatsSchema.methods.addAlert = function(severity, message, source) {
  this.alerts.unshift({
    severity,
    message,
    source,
    triggeredAt: new Date(),
    actionsTaken: []
  });
  
  // Keep only last 20 alerts
  if (this.alerts.length > 20) {
    this.alerts.pop();
  }
};

export default mongoose.model('MonitoringStats', monitoringStatsSchema);
