import mongoose from 'mongoose';

const userSubscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'canceled'],
      default: 'active',
      index: true,
    },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true, index: true },
    canceledAt: { type: Date, default: null },
    overrides: {
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
      limits: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

userSubscriptionSchema.index({ user: 1, status: 1, endAt: -1 });

const UserSubscription =
  mongoose.models.UserSubscription || mongoose.model('UserSubscription', userSubscriptionSchema);

export default UserSubscription;
