import mongoose from 'mongoose';

const cloudStorageMetadataSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    // Root folder info
    rootFolderId: String,
    rootFolderName: {
      type: String,
      default: 'SmartWardrobe-Production'
    },
    
    // Folder structure
    folders: {
      inputs: {
        folderId: String,
        images: { folderId: String },
        videos: { folderId: String },
        audio: { folderId: String },
        documents: { folderId: String }
      },
      outputs: {
        folderId: String,
        generatedVideos: { folderId: String },
        processedImages: { folderId: String },
        batchResults: { folderId: String },
        reports: { folderId: String },
        thumbnails: { folderId: String }
      },
      templates: { folderId: String },
      mediaLibrary: {
        folderId: String,
        videos: { folderId: String },
        images: { folderId: String },
        audio: { folderId: String },
        templates: { folderId: String },
        presets: { folderId: String }
      },
      batches: { folderId: String },
      analytics: { folderId: String }
    },
    
    // Connection Status
    isInitialized: {
      type: Boolean,
      default: false
    },
    isConnected: {
      type: Boolean,
      default: false
    },
    connectionStatus: {
      type: String,
      enum: ['connected', 'disconnected', 'error', 'unauthorized'],
      default: 'disconnected'
    },
    lastConnectionCheck: Date,
    connectionError: String,
    
    // Storage Info
    storage: {
      totalUsed: Number, // bytes
      totalQuota: Number, // bytes
      totalUsagePercentage: Number,
      lastSyncedAt: Date,
      syncStatus: {
        type: String,
        enum: ['syncing', 'idle', 'error'],
        default: 'idle'
      }
    },
    
    // Folder Statistics
    statistics: {
      totalFiles: {
        type: Number,
        default: 0
      },
      totalFolders: {
        type: Number,
        default: 0
      },
      byType: {
        images: {
          count: Number,
          size: Number
        },
        videos: {
          count: Number,
          size: Number
        },
        audio: {
          count: Number,
          size: Number
        },
        documents: {
          count: Number,
          size: Number
        },
        other: {
          count: Number,
          size: Number
        }
      },
      largestFile: {
        name: String,
        size: Number,
        path: String
      },
      oldestFile: {
        name: String,
        createdAt: Date,
        path: String
      },
      newestFile: {
        name: String,
        createdAt: Date,
        path: String
      }
    },
    
    // File Tracking
    uploadedFiles: [{
      fileId: String,
      fileName: String,
      mimeType: String,
      size: Number,
      parentPath: String,
      uploadedFrom: {
        type: String,
        enum: ['gallery', 'batch', 'direct', 'api']
      },
      relatedGenerationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'VideoGeneration'
      },
      uploadedAt: Date,
      isProcessed: Boolean
    }],
    
    // Batch Operations
    batchOperations: [{
      batchId: String,
      batchName: String,
      folderId: String,
      status: {
        type: String,
        enum: ['created', 'processing', 'completed', 'failed'],
        default: 'created'
      },
      itemCount: Number,
      completedItemCount: Number,
      failedItemCount: Number,
      createdAt: Date,
      completedAt: Date,
      outputPath: String
    }],
    
    // Sharing & Permissions
    sharing: {
      publicLink: String,
      publicLinkEnabled: Boolean,
      sharedWith: [{
        email: String,
        role: {
          type: String,
          enum: ['viewer', 'commenter', 'editor']
        },
        sharedAt: Date
      }]
    },
    
    // API Usage
    apiUsage: {
      requestsThisMonth: {
        type: Number,
        default: 0
      },
      requestLimit: {
        type: Number,
        default: 1000000 // Google Drive API limit
      },
      lastRequestAt: Date,
      errorCount: {
        type: Number,
        default: 0
      }
    },
    
    // Backup & Recovery
    backup: {
      lastBackupAt: Date,
      backupStatus: {
        type: String,
        enum: ['pending', 'in-progress', 'completed', 'failed'],
        default: 'pending'
      },
      backupFrequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'weekly'
      },
      nextBackupAt: Date,
      backupHistory: [{
        backupAt: Date,
        fileCount: Number,
        size: Number,
        status: String
      }]
    },
    
    // Cache
    cache: {
      lastCachedAt: Date,
      cacheValid: Boolean,
      cacheExpiryAt: Date,
      cachedData: mongoose.Schema.Types.Mixed
    },
    
    // Monitoring
    monitoring: {
      enabled: Boolean,
      checkInterval: Number, // minutes
      lastCheckedAt: Date,
      nextCheckAt: Date,
      alerts: [{
        type: String,
        message: String,
        severity: {
          type: String,
          enum: ['info', 'warning', 'critical']
        },
        triggeredAt: Date,
        resolved: Boolean
      }]
    },
    
    // Settings
    settings: {
      autoOrganize: {
        type: Boolean,
        default: true
      },
      autoCleanup: {
        type: Boolean,
        default: false
      },
      autoCleanupDaysOld: {
        type: Number,
        default: 30
      },
      autoCompress: {
        type: Boolean,
        default: false
      },
      compressionQuality: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      },
      enableVersioning: {
        type: Boolean,
        default: true
      },
      notifyOnUpload: {
        type: Boolean,
        default: false
      },
      notifyOnError: {
        type: Boolean,
        default: true
      }
    },
    
    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
    notes: String
  },
  { 
    timestamps: true,
    collection: 'cloud_storage_metadata'
  }
);

// Indexes
cloudStorageMetadataSchema.index({ userId: 1 });
cloudStorageMetadataSchema.index({ isConnected: 1 });
cloudStorageMetadataSchema.index({ 'uploadedFiles.uploadedAt': -1 });

// Methods
cloudStorageMetadataSchema.methods.isStorageAvailable = function() {
  if (!this.isConnected) return false;
  if (!this.storage.totalQuota) return false;
  
  return this.storage.totalUsagePercentage < 95; // Alert if over 95%
};

cloudStorageMetadataSchema.methods.getStorageStatus = function() {
  return {
    isInitialized: this.isInitialized,
    isConnected: this.isConnected,
    usagePercentage: this.storage.totalUsagePercentage,
    availableBytes: this.storage.totalQuota - this.storage.totalUsed,
    isNearQuota: this.storage.totalUsagePercentage > 90
  };
};

cloudStorageMetadataSchema.methods.isCacheValid = function() {
  if (!this.cache.cacheValid) return false;
  if (!this.cache.cacheExpiryAt) return false;
  return new Date() < this.cache.cacheExpiryAt;
};

cloudStorageMetadataSchema.methods.isMonitoringDue = function() {
  if (!this.monitoring.enabled) return false;
  if (!this.monitoring.nextCheckAt) return true;
  return new Date() >= this.monitoring.nextCheckAt;
};

cloudStorageMetadataSchema.methods.isBackupDue = function() {
  if (!this.backup.nextBackupAt) return true;
  return new Date() >= this.backup.nextBackupAt;
};

export default mongoose.model('CloudStorageMetadata', cloudStorageMetadataSchema);
