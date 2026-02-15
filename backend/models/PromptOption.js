import mongoose from 'mongoose';

const PromptOptionSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['scene', 'lighting', 'mood', 'style', 'colorPalette', 'useCase'],
    index: true
  },
  value: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  label: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  isAiGenerated: {
    type: Boolean,
    default: false
  },
  usageCount: {
    type: Number,
    default: 0
  },
  keywords: [String],
  metadata: {
    addedBy: String,
    source: String,
    confidence: Number
  }
}, {
  timestamps: true
});

// Indexes
PromptOptionSchema.index({ category: 1, value: 1 }, { unique: true });
PromptOptionSchema.index({ usageCount: -1 });

// Methods
PromptOptionSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  await this.save();
};

// Static methods
PromptOptionSchema.statics.getByCategory = async function(category) {
  return this.find({ category }).sort({ usageCount: -1, label: 1 });
};

PromptOptionSchema.statics.addOrUpdate = async function(category, value, label, metadata = {}) {
  const option = await this.findOneAndUpdate(
    { category, value },
    {
      $set: { label, metadata },
      $setOnInsert: { isAiGenerated: true }
    },
    { upsert: true, new: true }
  );
  
  console.log(`✅ Added/Updated ${category}: ${label}`);
  return option;
};

PromptOptionSchema.statics.findOrCreate = async function(category, text) {
  // Normalize text
  const value = text.toLowerCase().trim().replace(/\s+/g, '-');
  const label = text.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  
  // Check if exists
  let option = await this.findOne({ category, value });
  
  if (!option) {
    option = await this.create({
      category,
      value,
      label,
      isAiGenerated: true,
      metadata: {
        source: 'ai-analysis',
        addedBy: 'system'
      }
    });
    console.log(`✨ Created new ${category} option: ${label}`);
  }
  
  return option;
};

export default mongoose.model('PromptOption', PromptOptionSchema);
