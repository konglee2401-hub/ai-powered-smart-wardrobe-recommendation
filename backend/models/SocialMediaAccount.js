import mongoose from 'mongoose';
import crypto from 'crypto';

// Encryption helper
const encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const encryptionIv = process.env.ENCRYPTION_IV || crypto.randomBytes(16).toString('hex');

const encrypt = (text) => {
  if (!text) return null;
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), Buffer.from(encryptionIv, 'hex'));
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

const decrypt = (text) => {
  if (!text) return null;
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey, 'hex'), Buffer.from(encryptionIv, 'hex'));
  let decrypted = decipher.update(text, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

const socialMediaAccountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    platform: {
      type: String,
      enum: ['tiktok', 'youtube', 'facebook', 'instagram', 'twitter'],
      required: true
    },
    
    // Account Info
    accountName: {
      type: String,
      required: true
    },
    accountId: {
      type: String,
      required: true
    },
    accountHandle: String,
    accountUrl: String,
    accountImage: String,
    
    // Credentials (encrypted)
    credentials: {
      accessToken: {
        type: String,
        set: encrypt,
        get: decrypt
      },
      refreshToken: {
        type: String,
        set: encrypt,
        get: decrypt
      },
      refreshTokenExpiry: Date,
      secretKey: {
        type: String,
        set: encrypt,
        get: decrypt
      },
      // Platform-specific fields
      platformData: mongoose.Schema.Types.Mixed // Store any extra platform-specific data
    },
    
    // Account Status
    isActive: {
      type: Boolean,
      default: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    lastVerifiedAt: Date,
    verificationError: String,
    
    // Rate Limiting & Distribution
    rateLimit: {
      postsPerDay: {
        type: Number,
        default: 3
      },
      cooldownMinutes: {
        type: Number,
        default: 8
      }
    },
    lastPostTime: Date,
    postCount: {
      type: Number,
      default: 0
    },
    postCountResetAt: Date,
    
    // Scheduling
    schedulingEnabled: {
      type: Boolean,
      default: false
    },
    scheduleTime: String, // e.g., "09:00", "14:30"
    scheduleTimezone: String,
    scheduleFrequency: {
      type: String,
      enum: ['daily', 'every2Hours', 'every4Hours', 'every6Hours', 'every12Hours', 'custom'],
      default: 'daily'
    },
    
    // Hashtags & Content Settings
    defaultHashtags: [String],
    contentCategory: String,
    contentNiche: String,
    
    // Performance tracking
    totalUploads: {
      type: Number,
      default: 0
    },
    totalViews: {
      type: Number,
      default: 0
    },
    totalLikes: {
      type: Number,
      default: 0
    },
    totalShares: {
      type: Number,
      default: 0
    },
    averageEngagementRate: Number,
    
    // Error Tracking
    consecutiveErrors: {
      type: Number,
      default: 0
    },
    lastErrorAt: Date,
    lastErrorMessage: String,
    autoDeactivateOnError: {
      type: Boolean,
      default: true
    },
    autoDeactivateThreshold: {
      type: Number,
      default: 5 // Deactivate after 5 consecutive errors
    },
    
    // Connection Info
    connectedAt: {
      type: Date,
      default: Date.now
    },
    lastSyncedAt: Date,
    connectionStatus: {
      type: String,
      enum: ['connected', 'disconnected', 'error', 'pending'],
      default: 'pending'
    },
    
    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
    notes: String
  },
  { 
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

// Index for efficient queries
socialMediaAccountSchema.index({ userId: 1, platform: 1 });
socialMediaAccountSchema.index({ isActive: 1 });
socialMediaAccountSchema.index({ createdAt: 1 });

// Methods
socialMediaAccountSchema.methods.isRateLimited = function() {
  if (!this.lastPostTime) return false;
  
  const now = new Date();
  const minutesSinceLastPost = (now - this.lastPostTime) / (1000 * 60);
  
  return minutesSinceLastPost < this.rateLimit.cooldownMinutes;
};

socialMediaAccountSchema.methods.canPostNow = function() {
  if (!this.isActive) return false;
  if (this.isRateLimited()) return false;
  
  // Check if post count exceeded for today
  if (this.postCountResetAt) {
    const today = new Date();
    if (this.postCountResetAt.toDateString() !== today.toDateString()) {
      this.postCount = 0;
      this.postCountResetAt = today;
    }
  }
  
  return this.postCount < this.rateLimit.postsPerDay;
};

socialMediaAccountSchema.methods.recordPost = function() {
  this.lastPostTime = new Date();
  this.postCount = (this.postCount || 0) + 1;
  this.totalUploads = (this.totalUploads || 0) + 1;
  this.consecutiveErrors = 0; // Reset errors on successful post
};

socialMediaAccountSchema.methods.recordError = function(errorMessage) {
  this.consecutiveErrors = (this.consecutiveErrors || 0) + 1;
  this.lastErrorAt = new Date();
  this.lastErrorMessage = errorMessage;
  
  if (this.autoDeactivateOnError && this.consecutiveErrors >= this.autoDeactivateThreshold) {
    this.isActive = false;
  }
};

export default mongoose.model('SocialMediaAccount', socialMediaAccountSchema);
