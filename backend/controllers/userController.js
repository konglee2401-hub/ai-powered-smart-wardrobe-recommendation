import User from '../models/User.js';
import { resolveEffectiveAccess } from '../services/accessControlService.js';

export async function getMe(req, res) {
  res.json({ success: true, data: req.user });
}

export async function getMySettings(req, res) {
  try {
    const access = await resolveEffectiveAccess(req.user);
    res.json({ success: true, data: access.settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateMySettings(req, res) {
  try {
    const { generation, videoPipeline, scheduler } = req.body || {};

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.settings = {
      generation: generation ?? user.settings.generation,
      videoPipeline: videoPipeline ?? user.settings.videoPipeline,
      scheduler: scheduler ?? user.settings.scheduler,
    };
    await user.save();

    res.json({ success: true, data: user.settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getMyAccess(req, res) {
  try {
    const access = await resolveEffectiveAccess(req.user);
    res.json({
      success: true,
      data: {
        permissions: access.permissions,
        allowedAIProviders: access.allowedAIProviders,
        allowedBrowserAutomations: access.allowedBrowserAutomations,
        settings: access.settings,
        subscription: access.subscription,
        plan: access.plan,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function changeMyPassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'currentPassword and newPassword are required' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
