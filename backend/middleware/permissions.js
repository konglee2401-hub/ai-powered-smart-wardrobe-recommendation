import { resolveEffectiveAccess, hasMenuAccess, hasApiAccess, hasQueueAccess, hasJobAccess, isAdmin } from '../services/accessControlService.js';

export const attachAccess = async (req, res, next) => {
  try {
    if (req.user) {
      const access = await resolveEffectiveAccess(req.user);
      req.access = access;
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (role) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
  if (req.user.role !== role) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  return next();
};

export const requireMenuAccess = (menuKey) => async (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
  if (isAdmin(req.user)) return next();
  if (!req.access) req.access = await resolveEffectiveAccess(req.user);
  if (!hasMenuAccess(req.access.permissions, menuKey)) {
    return res.status(403).json({ success: false, message: 'Menu access denied' });
  }
  return next();
};

export const requireApiAccess = (apiKey) => async (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
  if (isAdmin(req.user)) return next();
  if (!req.access) req.access = await resolveEffectiveAccess(req.user);
  if (!hasApiAccess(req.access.permissions, apiKey)) {
    return res.status(403).json({ success: false, message: 'API access denied' });
  }
  return next();
};

export const requireQueueAccess = (queueKey) => async (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
  if (isAdmin(req.user)) return next();
  if (!req.access) req.access = await resolveEffectiveAccess(req.user);
  if (!hasQueueAccess(req.access.permissions, queueKey)) {
    return res.status(403).json({ success: false, message: 'Queue access denied' });
  }
  return next();
};

export const requireJobAccess = (jobKey) => async (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
  if (isAdmin(req.user)) return next();
  if (!req.access) req.access = await resolveEffectiveAccess(req.user);
  if (!hasJobAccess(req.access.permissions, jobKey)) {
    return res.status(403).json({ success: false, message: 'Job access denied' });
  }
  return next();
};

export const enforceAiProviderAccess = () => async (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
  if (isAdmin(req.user)) return next();
  if (!req.access) req.access = await resolveEffectiveAccess(req.user);
  const { mode, providers } = req.access.allowedAIProviders;
  if (mode === 'all') return next();

  const requested = (req.body?.providerId || req.body?.provider || req.query?.provider || '').toString().toLowerCase();
  if (!requested) return next();
  if (!providers.map(p => p.toLowerCase()).includes(requested)) {
    return res.status(403).json({ success: false, message: 'AI provider not allowed' });
  }
  return next();
};

export const enforceBrowserAutomationAccess = () => async (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Not authorized' });
  if (isAdmin(req.user)) return next();
  if (!req.access) req.access = await resolveEffectiveAccess(req.user);
  const { mode, options } = req.access.allowedBrowserAutomations;
  if (mode === 'all') return next();

  const requested = (req.body?.provider || req.body?.automation || req.query?.provider || '').toString().toLowerCase();
  if (!requested) return next();
  if (!options.map(o => o.toLowerCase()).includes(requested)) {
    return res.status(403).json({ success: false, message: 'Browser automation option not allowed' });
  }
  return next();
};
