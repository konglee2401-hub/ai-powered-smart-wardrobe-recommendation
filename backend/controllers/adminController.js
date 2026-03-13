import User from '../models/User.js';
import SystemSettings from '../models/SystemSettings.js';
import { getSystemSettings } from '../services/accessControlService.js';

function normalizeList(value) {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) return value.filter(Boolean);
  return [];
}

export async function listUsers(req, res) {
  try {
    const { role, q } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (q) {
      filter.$or = [
        { email: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
      ];
    }

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { role, status, permissions, access, settings } = req.body || {};

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (role) user.role = role;
    if (status) user.status = status;
    if (permissions) {
      user.permissions = {
        menu: normalizeList(permissions.menu) ?? user.permissions.menu,
        api: normalizeList(permissions.api) ?? user.permissions.api,
        queue: normalizeList(permissions.queue) ?? user.permissions.queue,
        job: normalizeList(permissions.job) ?? user.permissions.job,
      };
    }
    if (access) {
      user.access = {
        aiProviders: normalizeList(access.aiProviders) ?? user.access.aiProviders,
        browserAutomations: normalizeList(access.browserAutomations) ?? user.access.browserAutomations,
      };
    }
    if (settings) {
      user.settings = {
        generation: settings.generation ?? user.settings.generation,
        videoPipeline: settings.videoPipeline ?? user.settings.videoPipeline,
        scheduler: settings.scheduler ?? user.settings.scheduler,
      };
    }

    await user.save();
    const safeUser = await User.findById(user._id).select('-password');
    res.json({ success: true, data: safeUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function getSystemSettingsController(req, res) {
  try {
    const settings = await getSystemSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

export async function updateSystemSettings(req, res) {
  try {
    const payload = req.body || {};
    const existing = await getSystemSettings();

    const next = {
      allowedAIProviders: normalizeList(payload.allowedAIProviders) ?? existing.allowedAIProviders,
      allowedBrowserAutomations: normalizeList(payload.allowedBrowserAutomations) ?? existing.allowedBrowserAutomations,
      defaultPermissions: {
        menu: normalizeList(payload.defaultPermissions?.menu) ?? existing.defaultPermissions.menu,
        api: normalizeList(payload.defaultPermissions?.api) ?? existing.defaultPermissions.api,
        queue: normalizeList(payload.defaultPermissions?.queue) ?? existing.defaultPermissions.queue,
        job: normalizeList(payload.defaultPermissions?.job) ?? existing.defaultPermissions.job,
      },
      defaultUserSettings: {
        generation: payload.defaultUserSettings?.generation ?? existing.defaultUserSettings.generation,
        videoPipeline: payload.defaultUserSettings?.videoPipeline ?? existing.defaultUserSettings.videoPipeline,
        scheduler: payload.defaultUserSettings?.scheduler ?? existing.defaultUserSettings.scheduler,
      },
    };

    const updated = await SystemSettings.findOneAndUpdate(
      { key: 'default' },
      { $set: next },
      { new: true }
    );

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}
