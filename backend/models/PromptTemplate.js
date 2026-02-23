import mongoose from 'mongoose';

const promptTemplateSchema = new mongoose.Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },

    // Category & Type
    useCase: {
      type: String,
      enum: [
        'ecommerce', 'social', 'advertising', 'editorial', 'lookbook',
        'outfit-change', 'product-showcase', 'styling-guide', 'product-introduction',
        'style-transformation', 'generic', 'video-script'
      ],
      default: 'ecommerce',
      index: true
    },
    style: {
      type: String,
      enum: ['realistic', 'cinematic', 'fashion', 'casual', 'artistic'],
      default: 'realistic'
    },
    templateType: {
      type: String,
      enum: ['text', 'video', 'image', 'hybrid'],
      default: 'text'
    },

    // NEW: Core template (cannot be deleted)
    isCore: {
      type: Boolean,
      default: false,
      index: true
    },

    // NEW: Where this template is used
    usedInPages: [{
      page: String,      // e.g., "VideoGenerationPage", "AdvancedCustomization"
      step: Number,      // e.g., 1, 2, 3
      context: String,   // e.g., "video_scenario_outfit_change", "image_prompt_builder"
      field: String      // e.g., "mainPrompt", "negativePrompt"
    }],

    // NEW: Prompt structure with dynamic fields
    content: {
      mainPrompt: {
        type: String,
        required: true
      },
      negativePrompt: {
        type: String,
        default: ''
      }
    },

    // NEW: Dynamic fields/placeholders configuration
    fields: [{
      id: String,                    // Unique identifier e.g., "outfit1", "mood"
      label: String,                 // Display label
      description: String,           // Help text
      type: {
        type: String,
        enum: ['text', 'textarea', 'select', 'number', 'checkbox', 'radio', 'date', 'color'],
        default: 'text'
      },
      placeholder: String,
      defaultValue: mongoose.Schema.Types.Mixed,
      options: [                      // For select/radio/checkbox
        {
          value: String,
          label: String,
          description: String
        }
      ],
      validation: {
        required: { type: Boolean, default: false },
        minLength: Number,
        maxLength: Number,
        pattern: String
      },
      editable: { type: Boolean, default: true },  // User can change this field
      category: String  // Group fields by category
    }],

    // NEW: Version history
    version: {
      type: Number,
      default: 1
    },
    parentTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PromptTemplate',
      default: null
    },
    isClone: {
      type: Boolean,
      default: false
    },

    // NEW: Tags for better organization
    tags: [String],

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

    // NEW: Metadata
    metadata: {
      defaultDuration: Number,
      videCount: Number,
      aspectRatio: String,
      frameChaining: Boolean,
      requiresRefImage: Boolean
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    createdBy: {
      type: String,
      default: 'system'
    }
  },
  {
    timestamps: true,
    indexes: [
      { useCase: 1, isActive: 1 },
      { isCore: 1, isActive: 1 },
      { 'usedInPages.page': 1 }
    ]
  }
);

// Instance Methods
promptTemplateSchema.methods.getRenderedPrompt = function(fieldValues = {}) {
  let prompt = this.content.mainPrompt;
  let negativePrompt = this.content.negativePrompt;

  // Replace placeholders with actual values
  Object.keys(fieldValues).forEach(key => {
    const value = fieldValues[key];
    const regex = new RegExp(`{${key}}`, 'g');
    prompt = prompt.replace(regex, value);
    negativePrompt = negativePrompt.replace(regex, value);
  });

  return {
    prompt,
    negativePrompt
  };
};

promptTemplateSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

promptTemplateSchema.methods.canDelete = function() {
  return !this.isCore;
};

// Static Methods
promptTemplateSchema.statics.findByUseCase = function(useCase) {
  return this.find({ useCase, isActive: true }).sort({ createdAt: -1 });
};

promptTemplateSchema.statics.findCoreTemplates = function() {
  return this.find({ isCore: true, isActive: true });
};

promptTemplateSchema.statics.findByPage = function(page) {
  return this.find({ 'usedInPages.page': page, isActive: true });
};

promptTemplateSchema.statics.findByPageAndStep = function(page, step) {
  return this.find({
    'usedInPages.page': page,
    'usedInPages.step': step,
    isActive: true
  });
};

const PromptTemplate = mongoose.model('PromptTemplate', promptTemplateSchema);

export default PromptTemplate;
