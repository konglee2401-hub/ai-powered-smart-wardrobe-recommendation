import SubscriptionPlan from '../models/SubscriptionPlan.js';

export async function listPlans(req, res) {
  try {
    const plans = await SubscriptionPlan.find().sort({ sortOrder: 1, createdAt: -1 });
    res.json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function createPlan(req, res) {
  try {
    const payload = req.body || {};
    const plan = await SubscriptionPlan.create(payload);
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updatePlan(req, res) {
  try {
    const { id } = req.params;
    const payload = req.body || {};
    const plan = await SubscriptionPlan.findById(id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

    Object.assign(plan, payload);
    await plan.save();
    res.json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function deletePlan(req, res) {
  try {
    const { id } = req.params;
    const plan = await SubscriptionPlan.findById(id);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    if (plan.isLocked) {
      return res.status(403).json({ success: false, message: 'Default plans cannot be deleted' });
    }
    await SubscriptionPlan.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
