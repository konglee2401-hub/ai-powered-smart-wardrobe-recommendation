import mongoose from 'mongoose';

const GeneratedVideoSchema = new mongoose.Schema({
  // Reference
  userId: {
    type: String,
    index: true,
    default: 'anonymous'
  },
  sessionId: {
    type: String,
    index: true,
    required: true
  },

  // Reference to source images
  sourceImages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GeneratedImage'
  }],

  // Source image URLs (backup)
  sourceImageUrls: [{
    type: String
  }],

  // Video options
  videoOptions: {
    duration: {
      type: Number,
      default: 5 // seconds
    },
    cameraMovement: {
      type: String,
      enum: ['static', 'zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'rotate', 'dynamic'],
      default: 'static'
    },
    transitionStyle: {
      type: String,
      enum: ['none', 'fade', 'dissolve', 'slide', 'wipe', 'morph'],
      default: 'fade'
    },
    aspectRatio: {
      type: String,
      enum: ['16:9', '9:16', '1:1', '4:5'],
      default: '16:9'
    },
    fps: {
      type: Number,
      default: 24
    },
    loop: {
      type: Boolean,
      default: false
    },
    addMusic: {
      type: Boolean,
      default: false
    },
    musicStyle: String
  },

  // Video prompt
  videoPrompt: {
    type: String,
    required: true
  },
  customVideoPrompt: String,

  // Generated video
  videoUrl: String,
  thumbnailUrl: String,
  videoProvider: {
    type: String,
    required: true
  },

  // Metadata
  duration: Number, // actual duration
  fileSize: Number, // bytes
  resolution: String, // e.g., "1920x1080"
  format: String, // e.g., "mp4"

  // Stats
  generationTime: Number, // seconds
  cost: Number, // USD

  // Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
    index: true
  },
  errorMessage: String,
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  // User actions
  isFavorite: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String
  }],
  notes: String,
  rating: {
    type: Number,
    min: 1,
    max: 5
  }
}, {
  timestamps: true
});

// Indexes
GeneratedVideoSchema.index({ userId: 1, createdAt: -1 });
GeneratedVideoSchema.index({ sessionId: 1, createdAt: -1 });
GeneratedVideoSchema.index({ status: 1, createdAt: -1 });
GeneratedVideoSchema.index({ isFavorite: 1, createdAt: -1 });

// Static method: Get user videos
GeneratedVideoSchema.statics.getUserVideos = async function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    status = null
  } = options;

  const query = {
    userId,
    isDeleted: false
  };

  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;

  const [videos, total] = await Promise.all([
    this.find(query)
      .populate('sourceImages')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ]);

  return {
    videos,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
};

const GeneratedVideo = mongoose.model('GeneratedVideo', GeneratedVideoSchema);

export default GeneratedVideo;