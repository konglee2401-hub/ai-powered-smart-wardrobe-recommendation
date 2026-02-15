import mongoose from 'mongoose';

const promptTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ['image', 'video', 'vision'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    placeholders: [{
      type: String,
    }],
    variables: [{
      key: {
        type: String,
        required: true,
      },
      label: {
        type: String,
        required: true,
      },
      type: {
        type: String,
        enum: ['text', 'select', 'number', 'textarea'],
        default: 'text',
      },
      options: [String],
      defaultValue: String,
      required: Boolean,
    }],
    provider: {
      type: String,
      enum: ['gemini-native', 'gemini-imagen', 'grok', 'flow-fake', 'video-fake'],
      default: 'gemini-native',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Index for quick lookups
promptTemplateSchema.index({ userId: 1, type: 1, isActive: 1 });
promptTemplateSchema.index({ isSystem: 1, isDefault: 1 });

export default mongoose.model('PromptTemplate', promptTemplateSchema);
