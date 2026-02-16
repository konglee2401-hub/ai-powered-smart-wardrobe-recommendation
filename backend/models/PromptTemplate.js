import mongoose from 'mongoose';

const promptTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },
    useCase: {
      type: String,
      enum: ['ecommerce', 'social', 'advertising', 'editorial', 'lookbook'],
      default: 'ecommerce'
    },
    style: {
      type: String,
      enum: ['realistic', 'cinematic', 'fashion', 'casual', 'artistic'],
      default: 'realistic'
    },
    defaultPrompt: {
      type: String,
      required: true
    },
    defaultNegativePrompt: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

const PromptTemplate = mongoose.model('PromptTemplate', promptTemplateSchema);

export default PromptTemplate;
