/**
 * Enhanced PromptOption Model
 * 
 * NEW FIELDS for Phase 1:
 * - keywords: For AI matching
 * - technicalDetails: Detailed specs for prompts
 * - previewImage: UI preview
 * - usageCount: Track usage
 * - lastUsed: Timestamp
 * 
 * NEW METHODS:
 * - incrementUsage()
 * - searchByKeywords()
 * - matchesKeywords()
 */

import mongoose from 'mongoose';

// ============================================================
// SCHEMA DEFINITION
// ============================================================

const promptOptionSchema = new mongoose.Schema({
  // Basic fields
  value: {
    type: String,
    required: true,
    index: true
  },
  label: {
    type: String,
    required: true
  },
  // Vietnamese translation
  labelVi: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    required: true
  },
  // Vietnamese translation
  descriptionVi: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    required: true,
    enum: [
      'scene', 
      'lighting', 
      'mood', 
      'style', 
      'colorPalette', 
      'cameraAngle',
      // Fashion categories for VTO
      'hairstyle',
      'makeup',
      'bottoms',
      'shoes',
      'accessories',
      'outerwear',
      // NEW: Expanded accessory categories
      'hairAccessories',
      'hats',
      'necklaces',
      'earrings',
      'bracelets',
      'scarves',
      'belts',
      'socks'
    ],
    index: true
  },

  // NEW: Keywords for AI matching
  keywords: [{
    type: String,
    index: true
  }],

  // NEW: Technical details for detailed prompts
  technicalDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // NEW: Contextual prompt suggestion for detailed generation
  // Replaces generic option name with detailed description
  // Example: "minimalist-indoor" → "Bedroom with organized fashion wardrobe and shelves"
  promptSuggestion: {
    type: String,
    default: null
  },

  // NEW: Preview image for UI
  previewImage: {
    type: String,
    default: null
  },

  // NEW: Usage tracking
  usageCount: {
    type: Number,
    default: 0,
    index: true
  },
  lastUsed: {
    type: Date,
    default: null
  },

  // Metadata
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// ============================================================
// INDEXES
// ============================================================

// Compound indexes for efficient queries
promptOptionSchema.index({ category: 1, isActive: 1 });
promptOptionSchema.index({ usageCount: -1, category: 1 });
promptOptionSchema.index({ keywords: 1, category: 1 });
// Unique constraint on category+value combination (different categories can have same value)
promptOptionSchema.index({ category: 1, value: 1 }, { unique: true });

// ============================================================
// INSTANCE METHODS
// ============================================================

/**
 * Increment usage count and update lastUsed timestamp
 */
promptOptionSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

/**
 * Check if this option matches given keywords
 */
promptOptionSchema.methods.matchesKeywords = function(searchKeywords) {
  if (!searchKeywords || !Array.isArray(searchKeywords)) return false;
  
  const optionKeywords = this.keywords || [];
  const lowerOptionKeywords = optionKeywords.map(k => k.toLowerCase());
  const lowerSearchKeywords = searchKeywords.map(k => k.toLowerCase());
  
  // Check if any search keyword matches any option keyword
  return lowerSearchKeywords.some(searchKw => 
    lowerOptionKeywords.some(optionKw => 
      optionKw.includes(searchKw) || searchKw.includes(optionKw)
    )
  );
};

/**
 * Get technical details as formatted string
 */
promptOptionSchema.methods.getTechnicalDetailsString = function() {
  if (!this.technicalDetails || Object.keys(this.technicalDetails).length === 0) {
    return '';
  }

  return Object.entries(this.technicalDetails)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
};

// ============================================================
// STATIC METHODS
// ============================================================

/**
 * Search options by keywords across all categories
 */
promptOptionSchema.statics.searchByKeywords = function(keywords, category = null) {
  const query = {
    isActive: true,
    $or: [
      { keywords: { $in: keywords } },
      { label: { $regex: keywords.join('|'), $options: 'i' } },
      { description: { $regex: keywords.join('|'), $options: 'i' } }
    ]
  };

  if (category) {
    query.category = category;
  }

  return this.find(query).sort({ usageCount: -1, label: 1 });
};

/**
 * Get most used options by category
 */
promptOptionSchema.statics.getMostUsed = function(category, limit = 10) {
  return this.find({ category, isActive: true })
    .sort({ usageCount: -1, lastUsed: -1 })
    .limit(limit);
};

/**
 * Get options by category with usage stats
 */
promptOptionSchema.statics.getWithStats = function(category = null) {
  const query = { isActive: true };
  if (category) query.category = category;

  return this.find(query)
    .sort({ category: 1, sortOrder: 1, label: 1 })
    .select('value label description category keywords usageCount lastUsed previewImage');
};

/**
 * Bulk update usage counts by option value (string)
 * @param {string[]} optionValues - Array of option values like ['studio', 'soft-diffused']
 */
promptOptionSchema.statics.bulkIncrementUsage = function(optionValues) {
  return this.updateMany(
    { value: { $in: optionValues } },
    [
      {
        $set: {
          usageCount: { $add: ['$usageCount', 1] },
          lastUsed: new Date(),
          updatedAt: new Date()
        }
      }
    ]
  );
};

/**
 * Add or update option (upsert pattern)
 * @param {string} category - Category like 'scene', 'lighting', etc.
 * @param {string} value - The option value/slug
 * @param {string} label - Display label
 * @param {object} metadata - Additional metadata (reasons, alternatives, etc.)
 */
promptOptionSchema.statics.addOrUpdate = async function(category, value, label, metadata = {}) {
  // Find existing option (case-insensitive value match)
  const existing = await this.findOne({
    category,
    value: new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
  });

  if (existing) {
    // Update existing: increment usage, update label, merge metadata
    existing.label = label;
    existing.usageCount = (existing.usageCount || 0) + 1;
    existing.lastUsed = new Date();
    
    // Merge metadata
    if (metadata && Object.keys(metadata).length > 0) {
      existing.technicalDetails = { ...existing.technicalDetails, ...metadata };
    }
    
    return await existing.save();
  }

  // Create new option
  return await this.create({
    category,
    value,
    label,
    description: label, // Use label as description if not provided
    keywords: [label.toLowerCase()],
    technicalDetails: metadata || {},
    usageCount: 1,
    lastUsed: new Date(),
    isActive: true
  });
};

// ============================================================
// MIDDLEWARE
// ============================================================

// Update updatedAt on save
promptOptionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// ============================================================
// VIRTUALS
// ============================================================

// Virtual for usage rate (usage per day since creation)
promptOptionSchema.virtual('usageRate').get(function() {
  const daysSinceCreation = (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24);
  return daysSinceCreation > 0 ? this.usageCount / daysSinceCreation : 0;
});

// ============================================================
// MODEL CREATION
// ============================================================

const PromptOption = mongoose.model('PromptOption', promptOptionSchema);

// ============================================================
// EXPORTS
// ============================================================

export default PromptOption;
