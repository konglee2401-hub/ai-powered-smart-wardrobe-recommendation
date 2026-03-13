import UserSubscription from '../models/UserSubscription.js';
import { assignPlanToUser, getActiveSubscription } from '../services/subscriptionService.js';

export async function getMySubscription(req, res) {
  try {
    const subscription = await getActiveSubscription(req.user._id);
    res.json({ success: true, data: subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function listSubscriptions(req, res) {
  try {
    const { userId } = req.query || {};
    const filter = userId ? { user: userId } : {};
    const items = await UserSubscription.find(filter).populate('plan').sort({ createdAt: -1 });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function assignSubscription(req, res) {
  try {
    const { userId, planId, durationDays } = req.body || {};
    if (!userId || !planId) {
      return res.status(400).json({ success: false, message: 'userId and planId are required' });
    }
    const result = await assignPlanToUser(userId, planId, { durationDays });
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json({ success: true, data: result.subscription });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
