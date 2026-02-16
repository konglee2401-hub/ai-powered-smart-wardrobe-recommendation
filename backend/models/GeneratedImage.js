import mongoose from 'mongoose';

const GeneratedImageSchema = new mongoose.Schema({
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

  // Source images (stored as base64 or URLs)
  characterImageUrl: {
    type: String,
    required: true
  },
  productImageUrl: {
    type: String,
    required: true
  },

  // Analysis data
  characterAnalysis: {
    type: String,
    required: true
  },
  productAnalysis: {
    type: String,
    required: true
  },
  analysisMode: {
    type: String,
    enum: ['manual', 'semi-auto', 'full-auto', 'hybrid'],
    required: true
  },
  productFocus: {
    type: String,
    enum: ['top', 'bottom', 'footwear', 'accessories', 'full-outfit'],
    default: 'full-outfit'
  },
  analysisModel: {
    type: String,
    default: 'auto'
  },

  // Options used
  selectedOptions: {
    scene: String,
    lighting: String,
    mood: String,
    style: String,
    colorPalette: String,
    useCase: String
  },

  // AI suggestions (what AI recommended)
  aiSuggestions: {
    scene: String,
    lighting: String,
    mood: String,
    style: String,
    colorPalette: String
  },

  // Prompt
  fullPrompt: {
    type: String,
    required: true
  },
  shortPrompt: String,
  customPrompt: String,
  negativePrompt: String,
  promptMode: {
    type: String,
    enum: ['full', 'short'],
    default: 'full'
  },

  // Dynamic Template Fields (Phase 2)
  dynamicTemplate: {
    // User inputs for dynamic template
    userInputs: {
      age: String,
      gender: String,
      style: String,
      colors: String,
      material: String,
      setting: String,
      mood: String
    },
    // Detected use case
    useCase: {
      type: String,
      description: 'Detected use case (e.g., casualBeach, formalBusiness, elegantEvening)'
    },
    // Draft prompt before AI enhancement
    draftPrompt: {
      type: String,
      description: 'Draft prompt from dynamic template before AI enhancement'
    },
    // Template mode
    templateMode: {
      type: String,
      enum: ['dynamic', 'manual'],
      default: 'manual'
    }
  },

  // Generated image
  imageUrl: {
    type: String,
    required: true
  },
  imageProvider: {
    type: String,
    required: true
  },
  generationMethod: {
    type: String,
    enum: ['api', 'browser-automation'],
    default: 'api'
  },

  // Metadata
  width: Number,
  height: Number,
  seed: Number,
  steps: Number,
  guidanceScale: Number,

  // Stats
  generationTime: Number, // seconds
  cost: Number, // USD

  // Status
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

  // Rating
  rating: {
    type: Number,
    min: 1,
    max: 5
  }
}, {
  timestamps: true
});

// Indexes
GeneratedImageSchema.index({ userId: 1, createdAt: -1 });
GeneratedImageSchema.index({ sessionId: 1, createdAt: -1 });
GeneratedImageSchema.index({ isFavorite: 1, createdAt: -1 });
GeneratedImageSchema.index({ tags: 1 });

// Virtual for thumbnail (if needed)
GeneratedImageSchema.virtual('thumbnailUrl').get(function() {
  return this.imageUrl; // Can add thumbnail logic later
});

// Static method: Get user history
GeneratedImageSchema.statics.getUserHistory = async function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    filters = {}
  } = options;

  const query = {
    userId,
    isDeleted: false,
    ...filters
  };

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [images, total] = await Promise.all([
    this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ]);

  return {
    images,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
};

// Static method: Get session images
GeneratedImageSchema.statics.getSessionImages = async function(sessionId) {
  return await this.find({ sessionId, isDeleted: false })
    .sort({ createdAt: 1 })
    .lean();
};

const GeneratedImage = mongoose.model('GeneratedImage', GeneratedImageSchema);

export default GeneratedImage;