import mongoose from 'mongoose';

const promptLocationSchema = new mongoose.Schema(
  {
    page: { type: String, trim: true, default: '' },
    step: { type: Number, default: null },
    context: { type: String, trim: true, default: '' },
    field: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const promptFieldSchema = new mongoose.Schema(
  {
    id: { type: String, trim: true, default: '' },
    label: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    type: {
      type: String,
      enum: ['text', 'textarea', 'select', 'number', 'checkbox', 'radio', 'date', 'color'],
      default: 'text'
    },
    placeholder: { type: String, trim: true, default: '' },
    defaultValue: { type: mongoose.Schema.Types.Mixed, default: '' },
    options: [
      {
        value: { type: String, trim: true, default: '' },
        label: { type: String, trim: true, default: '' },
        description: { type: String, trim: true, default: '' }
      }
    ],
    validation: {
      required: { type: Boolean, default: false },
      minLength: Number,
      maxLength: Number,
      pattern: String
    },
    editable: { type: Boolean, default: true },
    category: { type: String, trim: true, default: '' },
    source: {
      type: String,
      enum: ['manual', 'option', 'system'],
      default: 'manual'
    },
    optionCategory: { type: String, trim: true, default: '' },
    allowCustomValue: { type: Boolean, default: true },
    runtimeKey: { type: String, trim: true, default: '' }
  },
  { _id: false }
);

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
    // Vietnamese translation
    nameVi: {
      type: String,
      trim: true,
      maxlength: 100,
      default: ''
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    // Vietnamese translation
    descriptionVi: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },

    purpose: {
      type: String,
      trim: true,
      maxlength: 300,
      default: ''
    },

    sourceType: {
      type: String,
      enum: ['manual', 'hardcoded-scan'],
      default: 'manual',
      index: true
    },

    sourceKey: {
      type: String,
      trim: true,
      index: true,
      sparse: true
    },

    // Category & Type
    useCase: {
      type: String,
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
    usedInPages: [promptLocationSchema],

    // Active runtime bindings. Only one template should own a target context at a time.
    assignmentTargets: [promptLocationSchema],

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
    fields: [promptFieldSchema],

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
      { 'usedInPages.page': 1 },
      { 'assignmentTargets.page': 1, 'assignmentTargets.context': 1, 'assignmentTargets.field': 1 }
    ]
  }
);

function normalizeReplacementValue(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

// Instance Methods
promptTemplateSchema.methods.getRenderedPrompt = function(fieldValues = {}) {
  let prompt = this.content.mainPrompt;
  let negativePrompt = this.content.negativePrompt;

  // Replace placeholders with actual values
  Object.keys(fieldValues).forEach(key => {
    const value = normalizeReplacementValue(fieldValues[key]);
    const braceRegex = new RegExp(`{${key}}`, 'g');
    const doubleBraceRegex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    prompt = prompt.replace(braceRegex, value).replace(doubleBraceRegex, value);
    negativePrompt = negativePrompt.replace(braceRegex, value).replace(doubleBraceRegex, value);
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

promptTemplateSchema.statics.findAssignedTemplate = function({
  page,
  step = null,
  context,
  field,
  useCase,
  templateType
} = {}) {
  const query = { isActive: true };
  const contextQuery = {};

  if (page) contextQuery['assignmentTargets.page'] = page;
  if (step !== null && step !== undefined && step !== '') {
    contextQuery['assignmentTargets.step'] = Number(step);
  }
  if (context) contextQuery['assignmentTargets.context'] = context;
  if (field) contextQuery['assignmentTargets.field'] = field;
  if (useCase) query.useCase = useCase;
  if (templateType) query.templateType = templateType;

  return this.findOne({ ...query, ...contextQuery }).sort({ isCore: 1, updatedAt: -1, createdAt: -1 });
};

const PromptTemplate = mongoose.model('PromptTemplate', promptTemplateSchema);

export default PromptTemplate;
