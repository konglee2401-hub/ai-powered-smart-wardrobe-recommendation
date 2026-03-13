import SystemSettings from '../models/SystemSettings.js';
import { getActiveSubscription, ensureUserSubscription } from './subscriptionService.js';
import {
  DEFAULT_USER_MENU,
  DEFAULT_USER_API,
  DEFAULT_USER_QUEUE,
  DEFAULT_USER_JOB,
  DEFAULT_ALLOWED_AI_PROVIDERS,
  DEFAULT_ALLOWED_BROWSER_AUTOMATIONS,
  DEFAULT_USER_SETTINGS,
} from '../utils/accessDefaults.js';

const WILDCARD = '*';

function normalizeList(list) {
  return Array.isArray(list) ? list.filter(Boolean) : [];
}

export async function getSystemSettings() {
  let settings = await SystemSettings.findOne({ key: 'default' });
  if (!settings) {
    settings = await SystemSettings.create({
      key: 'default',
      allowedAIProviders: DEFAULT_ALLOWED_AI_PROVIDERS,
      allowedBrowserAutomations: DEFAULT_ALLOWED_BROWSER_AUTOMATIONS,
      defaultPermissions: {
        menu: DEFAULT_USER_MENU,
        api: DEFAULT_USER_API,
        queue: DEFAULT_USER_QUEUE,
        job: DEFAULT_USER_JOB,
      },
      defaultUserSettings: DEFAULT_USER_SETTINGS,
    });
  }
  return settings;
}

export function isAdmin(user) {
  return user?.role === 'admin';
}

export function resolveEffectivePermissions(user, systemSettings, plan, overrides) {
  if (isAdmin(user)) {
    return {
      menu: [WILDCARD],
      api: [WILDCARD],
      queue: [WILDCARD],
      job: [WILDCARD],
    };
  }

  const defaults = systemSettings?.defaultPermissions || {};
  const planPermissions = plan?.permissions || {};
  const overridePermissions = overrides?.permissions || {};
  return {
    menu: normalizeList(overridePermissions.menu).length
      ? normalizeList(overridePermissions.menu)
      : normalizeList(user?.permissions?.menu).length
        ? normalizeList(user?.permissions?.menu)
        : normalizeList(planPermissions.menu).length
          ? normalizeList(planPermissions.menu)
          : normalizeList(defaults.menu).length
            ? normalizeList(defaults.menu)
            : DEFAULT_USER_MENU,
    api: normalizeList(overridePermissions.api).length
      ? normalizeList(overridePermissions.api)
      : normalizeList(user?.permissions?.api).length
        ? normalizeList(user?.permissions?.api)
        : normalizeList(planPermissions.api).length
          ? normalizeList(planPermissions.api)
          : normalizeList(defaults.api).length
            ? normalizeList(defaults.api)
            : DEFAULT_USER_API,
    queue: normalizeList(overridePermissions.queue).length
      ? normalizeList(overridePermissions.queue)
      : normalizeList(user?.permissions?.queue).length
        ? normalizeList(user?.permissions?.queue)
        : normalizeList(planPermissions.queue).length
          ? normalizeList(planPermissions.queue)
          : normalizeList(defaults.queue).length
            ? normalizeList(defaults.queue)
            : DEFAULT_USER_QUEUE,
    job: normalizeList(overridePermissions.job).length
      ? normalizeList(overridePermissions.job)
      : normalizeList(user?.permissions?.job).length
        ? normalizeList(user?.permissions?.job)
        : normalizeList(planPermissions.job).length
          ? normalizeList(planPermissions.job)
          : normalizeList(defaults.job).length
            ? normalizeList(defaults.job)
            : DEFAULT_USER_JOB,
  };
}

export function resolveAllowedAiProviders(user, systemSettings, plan, overrides) {
  if (isAdmin(user)) return { mode: 'all', providers: [] };

  const overrideList = normalizeList(overrides?.access?.aiProviders);
  if (overrideList.length) return { mode: 'list', providers: overrideList };

  const userList = normalizeList(user?.access?.aiProviders);
  if (userList.length) return { mode: 'list', providers: userList };

  const planList = normalizeList(plan?.access?.aiProviders);
  if (planList.length) return { mode: 'list', providers: planList };

  const systemList = normalizeList(systemSettings?.allowedAIProviders);
  if (systemList.length) return { mode: 'list', providers: systemList };

  return { mode: 'all', providers: [] };
}

export function resolveAllowedBrowserAutomations(user, systemSettings, plan, overrides) {
  if (isAdmin(user)) return { mode: 'all', options: [] };

  const overrideList = normalizeList(overrides?.access?.browserAutomations);
  if (overrideList.length) return { mode: 'list', options: overrideList };

  const userList = normalizeList(user?.access?.browserAutomations);
  if (userList.length) return { mode: 'list', options: userList };

  const planList = normalizeList(plan?.access?.browserAutomations);
  if (planList.length) return { mode: 'list', options: planList };

  const systemList = normalizeList(systemSettings?.allowedBrowserAutomations);
  if (systemList.length) return { mode: 'list', options: systemList };

  return { mode: 'all', options: [] };
}

export function resolveEffectiveSettings(user, systemSettings) {
  if (isAdmin(user)) return systemSettings?.defaultUserSettings || DEFAULT_USER_SETTINGS;

  return {
    generation: user?.settings?.generation ?? systemSettings?.defaultUserSettings?.generation ?? DEFAULT_USER_SETTINGS.generation,
    videoPipeline: user?.settings?.videoPipeline ?? systemSettings?.defaultUserSettings?.videoPipeline ?? DEFAULT_USER_SETTINGS.videoPipeline,
    scheduler: user?.settings?.scheduler ?? systemSettings?.defaultUserSettings?.scheduler ?? DEFAULT_USER_SETTINGS.scheduler,
  };
}

function hasValue(list, value) {
  const normalized = normalizeList(list);
  return normalized.includes(WILDCARD) || normalized.includes(value);
}

export function hasMenuAccess(permissions, menuKey) {
  return hasValue(permissions?.menu, menuKey);
}

export function hasApiAccess(permissions, apiKey) {
  return hasValue(permissions?.api, apiKey);
}

export function hasQueueAccess(permissions, queueKey) {
  return hasValue(permissions?.queue, queueKey);
}

export function hasJobAccess(permissions, jobKey) {
  return hasValue(permissions?.job, jobKey);
}

export async function resolveEffectiveAccess(user) {
  const systemSettings = await getSystemSettings();
  let subscription = null;
  let plan = null;

  if (user && user.role !== 'admin') {
    subscription = await getActiveSubscription(user._id);
    if (!subscription) {
      subscription = await ensureUserSubscription(user._id);
    }
    plan = subscription?.plan || null;
  }

  return {
    permissions: resolveEffectivePermissions(user, systemSettings, plan, subscription?.overrides),
    allowedAIProviders: resolveAllowedAiProviders(user, systemSettings, plan, subscription?.overrides),
    allowedBrowserAutomations: resolveAllowedBrowserAutomations(user, systemSettings, plan, subscription?.overrides),
    settings: resolveEffectiveSettings(user, systemSettings),
    systemSettings,
    subscription,
    plan,
  };
}
