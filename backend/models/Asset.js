import mongoose from 'mongoose';

const assetSchema = new mongoose.Schema({
  // Identification
  assetId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  
  // User reference
  userId: {
    type: String,
    index: true,
    default: 'anonymous'
  },
  sessionId: {
    type: String,
    index: true
  },
  
  // Asset type and category
  assetType: {
    type: String,
    enum: ['image', 'video', 'audio'],
    required: true,
    index: true
  },
  
  assetCategory: {
    type: String,
    enum: [
      'character-image',      // Character/model images uploaded by user
      'product-image',        // Product images uploaded by user
      'reference-image',      // Reference images for generation
      'generated-image',      // AI-generated images
      'source-video',         // User-uploaded videos or character videos
      'generated-video',      // AI-generated videos (segments or complete)
      'audio',               // Audio files
      'thumbnail'            // Thumbnails for previews
    ],
    required: true,
    index: true
  },
  
  // File information
  filename: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  
  // Storage location
  storage: {
    location: {
      type: String,
      enum: ['local', 'google-drive', 'cloud'],
      required: true
    },
    localPath: {
      type: String,
      description: 'Relative path from project root (e.g., temp/google-flow-downloads/image.png)'
    },
    googleDriveId: {
      type: String,
      description: 'Google Drive file ID if stored on Drive'
    },
    googleDrivePath: {
      type: String,
      description: 'Google Drive folder path (e.g., Affiliate AI → Uploaded → App → Images)'
    },
    url: {
      type: String,
      description: 'Accessible URL (could be local server or Google Drive)'
    }
  },
  
  // Media-specific metadata
  metadata: {
    // For images
    width: Number,
    height: Number,
    aspectRatio: String,
    
    // For videos
    duration: Number,
    frameCount: Number,
    fps: Number,
    bitrate: String,
    
    // Common
    colorSpace: String,
    format: String,
    hasAlpha: Boolean
  },
  
  // Generation context (if generated)
  generation: {
    generatedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GeneratedImage',
      description: 'Reference to GeneratedImage if this is a generated image'
    },
    generatedFromVideo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VideoGeneration',
      description: 'Reference to VideoGeneration if extracted from video'
    },
    prompt: String,
    model: String,
    seed: Number,
    parameters: mongoose.Schema.Types.Mixed
  },
  
  // Relationships and usage
  usedIn: [{
    type: String,
    enum: ['image-generation', 'video-generation', 'gallery', 'analysis', 'display'],
    description: 'Where this asset is being used'
  }],
  
  relatedAssets: [{
    assetId: String,
    relationship: {
      type: String,
      enum: ['thumbnail-of', 'extracted-from', 'used-with', 'version-of']
    }
  }],
  
  // Analytics
  accessCount: {
    type: Number,
    default: 0
  },
  lastAccessedAt: Date,
  
  // Tags and organization
  tags: [String],
  projectId: String,
  
  // Status and lifecycle
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted', 'pending-upload', 'upload-failed'],
    default: 'active',
    index: true
  },
  
  isTemporary: {
    type: Boolean,
    default: false,
    description: 'Whether this file should be auto-deleted after a period'
  },
  
  expiresAt: Date,
  
  // Favorite and rating
  isFavorite: {
    type: Boolean,
    default: false,
    index: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  
  notes: String,
  
  // Versioning
  version: {
    type: Number,
    default: 1
  },
  previousVersionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset'
  }
  
}, {
  timestamps: true,
  indexes: [
    { userId: 1, assetType: 1, createdAt: -1 },
    { userId: 1, assetCategory: 1, status: 1 },
    { sessionId: 1, createdAt: 1 },
    { 'storage.googleDriveId': 1 },
    { status: 1, expiresAt: 1 }
  ]
});

// Statics for common queries
assetSchema.statics.findByUserAndType = async function(userId, assetType, options = {}) {
  const { page = 1, limit = 20, category = null } = options;
  const query = { userId, assetType, status: 'active' };
  if (category) query.assetCategory = category;
  
  const skip = (page - 1) * limit;
  const [assets, total] = await Promise.all([
    this.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ]);
  
  return { assets, total, page, pages: Math.ceil(total / limit) };
};

assetSchema.statics.findByCategory = async function(userId, category, options = {}) {
  const { page = 1, limit = 20 } = options;
  const query = { userId, assetCategory: category, status: 'active' };
  
  const skip = (page - 1) * limit;
  const [assets, total] = await Promise.all([
    this.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ]);
  
  return { assets, total, page, pages: Math.ceil(total / limit) };
};

assetSchema.statics.findBySession = async function(sessionId) {
  return await this.find({ sessionId, status: 'active' })
    .sort({ assetCategory: 1, createdAt: 1 })
    .lean();
};

// Methods
assetSchema.methods.incrementAccessCount = async function() {
  this.accessCount += 1;
  this.lastAccessedAt = new Date();
  return await this.save();
};

assetSchema.methods.toggleFavorite = async function() {
  this.isFavorite = !this.isFavorite;
  return await this.save();
};

assetSchema.pre('save', function(next) {
  if (!this.assetId) {
    // Generate assetId if not provided
    this.assetId = `${this.assetCategory}_${this.sessionId || 'no-session'}_${Date.now()}`;
  }
  next();
});

export default mongoose.model('Asset', assetSchema);
