import mongoose from 'mongoose';

const generatedMediaSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true,
    },
    provider: {
      type: String,
      required: true,
    },
    prompt: {
      type: String,
      required: true,
    },
    inputImages: [String],
    outputUrl: String,
    meta: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed',
    },
  },
  { timestamps: true }
);

export default mongoose.model('GeneratedMedia', generatedMediaSchema);

