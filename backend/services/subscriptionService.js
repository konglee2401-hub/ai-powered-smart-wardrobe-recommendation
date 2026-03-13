import SubscriptionPlan from '../models/SubscriptionPlan.js';
import UserSubscription from '../models/UserSubscription.js';

export async function getDefaultPlan() {
  const plan = await SubscriptionPlan.findOne({ isDefault: true, isActive: true }).lean();
  if (plan) return plan;
  return SubscriptionPlan.findOne({ isActive: true }).sort({ sortOrder: 1 }).lean();
}

export async function getActiveSubscription(userId) {
  const now = new Date();
  return UserSubscription.findOne({
    user: userId,
    status: 'active',
    endAt: { $gte: now },
  }).populate('plan');
}

export async function ensureUserSubscription(userId) {
  const active = await getActiveSubscription(userId);
  if (active) return active;

  const plan = await getDefaultPlan();
  if (!plan) return null;

  const startAt = new Date();
  const endAt = new Date(startAt.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  const subscription = await UserSubscription.create({
    user: userId,
    plan: plan._id,
    status: 'active',
    startAt,
    endAt,
  });
  return subscription.populate('plan');
}

export async function assignPlanToUser(userId, planId, { startAt, durationDays } = {}) {
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan) {
    return { success: false, error: 'Plan not found' };
  }

  const start = startAt ? new Date(startAt) : new Date();
  const days = durationDays || plan.durationDays;
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);

  await UserSubscription.updateMany(
    { user: userId, status: 'active' },
    { $set: { status: 'expired' } }
  );

  const subscription = await UserSubscription.create({
    user: userId,
    plan: plan._id,
    status: 'active',
    startAt: start,
    endAt: end,
  });

  return { success: true, subscription };
}
