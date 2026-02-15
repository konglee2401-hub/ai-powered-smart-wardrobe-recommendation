import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['scene', 'mood', 'style', 'clothingType', 'color', 'pattern', 'accessory', 'occasion']
  },
  value: {
    type: String,
    required: true
  },
  count: {
    type: Number,
    default: 1
  },
  lastUsed: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    enum: ['manual', 'ai-extracted', 'user-added'],
    default: 'ai-extracted'
  }
}, {
  timestamps: true
});

// Compound index for fast lookups
optionSchema.index({ category: 1, value: 1 }, { unique: true });

// Static method to add or increment option
optionSchema.statics.addOrIncrement = async function(category, value) {
  const option = await this.findOneAndUpdate(
    { category, value },
    { 
      $inc: { count: 1 },
      $set: { lastUsed: new Date() }
    },
    { upsert: true, new: true }
  );
  
  return option;
};

// Static method to get popular options
optionSchema.statics.getPopular = async function(category, limit = 20) {
  return this.find({ category })
    .sort({ count: -1, lastUsed: -1 })
    .limit(limit)
    .select('value count lastUsed');
};

// Static method to get all options grouped by category
optionSchema.statics.getAllGrouped = async function() {
  const options = await this.find({});
  
  const grouped = {
    scenes: [],
    moods: [],
    styles: [],
    clothingTypes: [],
    colors: [],
    patterns: [],
    accessories: [],
    occasions: []
  };
  
  options.forEach(opt => {
    const key = opt.category + 's'; // Pluralize
    if (grouped[key]) {
      grouped[key].push({
        value: opt.value,
        count: opt.count,
        lastUsed: opt.lastUsed
      });
    }
  });
  
  // Sort by count
  Object.keys(grouped).forEach(key => {
    grouped[key].sort((a, b) => b.count - a.count);
  });
  
  return grouped;
};

const Option = mongoose.model('Option', optionSchema);

export default Option;
