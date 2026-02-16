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
    unique: true,
    index: true
  },
  label: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['scene', 'lighting', 'mood', 'style', 'colorPalette', 'cameraAngle'],
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
 * Bulk update usage counts
 */
promptOptionSchema.statics.bulkIncrementUsage = function(optionIds) {
  return this.updateMany(
    { _id: { $in: optionIds } },
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
