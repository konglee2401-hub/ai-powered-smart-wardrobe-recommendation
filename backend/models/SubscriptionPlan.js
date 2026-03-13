import mongoose from 'mongoose';

const limitsSchema = new mongoose.Schema(
  {
    storage: {
      maxGB: { type: Number, default: null },
    },
    scrape: {
      maxPerDay: { type: Number, default: null },
      maxPerRun: { type: Number, default: null },
    },
    mashup: {
      maxConcurrent: { type: Number, default: null },
    },
    generationDaily: {
      image: { type: Number, default: null },
      video: { type: Number, default: null },
      voice: { type: Number, default: null },
      oneClick: { type: Number, default: null },
    },
  },
  { _id: false }
);

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, index: true },
    description: { type: String, default: '' },
    durationDays: { type: Number, required: true },
    permissions: {
      menu: { type: [String], default: [] },
      api: { type: [String], default: [] },
      queue: { type: [String], default: [] },
      job: { type: [String], default: [] },
    },
    access: {
      aiProviders: { type: [String], default: [] },
      browserAutomations: { type: [String], default: [] },
    },
    limits: { type: limitsSchema, default: () => ({}) },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false }, // non-deletable
    sortOrder: { type: Number, default: 50 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

subscriptionPlanSchema.index({ sortOrder: 1, createdAt: -1 });

const SubscriptionPlan =
  mongoose.models.SubscriptionPlan || mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

export default SubscriptionPlan;
