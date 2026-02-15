import mongoose from 'mongoose';

const fashionOptionSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['hair_style', 'hair_acc', 'makeup', 'top_detail', 'material', 'outerwear', 'bottom_type', 'legwear', 'necklace', 'earrings', 'hand_acc', 'waist_acc', 'shoes', 'scene', 'lighting', 'expression', 'style', 'color', 'pattern', 'season', 'occasion']
  },
  value: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  isAIGenerated: {
    type: Boolean,
    default: false // Đánh dấu option được AI tự động phát hiện
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index để tìm kiếm nhanh và tránh trùng lặp
fashionOptionSchema.index({ category: 1, value: 1 }, { unique: true });

// Static method để thêm hoặc update option
fashionOptionSchema.statics.upsertOption = async function(category, value, metadata = {}) {
  const existing = await this.findOne({ category, value: new RegExp(`^${value}$`, 'i') });
  
  if (existing) {
    existing.usageCount += 1;
    existing.metadata = { ...existing.metadata, ...metadata };
    return await existing.save();
  }
  
  return await this.create({
    category,
    value,
    isAIGenerated: true,
    metadata
  });
};

// Static method để bulk upsert nhiều options
fashionOptionSchema.statics.bulkUpsert = async function(options) {
  const results = [];
  for (const opt of options) {
    try {
      const result = await this.upsertOption(opt.category, opt.value, opt.metadata);
      results.push({ success: true, option: result });
    } catch (error) {
      results.push({ success: false, option: opt, error: error.message });
    }
  }
  return results;
};

export default mongoose.model('FashionOption', fashionOptionSchema);
