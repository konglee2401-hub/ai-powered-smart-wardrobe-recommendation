import User from '../models/User.js';
import { getSystemSettings } from './accessControlService.js';

export async function ensureDefaultAdmin() {
  const adminEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@smart-wardrobe.local';
  const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123456';
  const adminName = process.env.ADMIN_DEFAULT_NAME || 'Admin';
  const forceReset = process.env.ADMIN_DEFAULT_FORCE_RESET === '1';

  const existingAdmin = await User.findOne({ role: 'admin' });
  if (existingAdmin && !forceReset) return { created: false, email: existingAdmin.email };

  const settings = await getSystemSettings();

  if (existingAdmin) {
    existingAdmin.name = adminName;
    existingAdmin.email = adminEmail;
    existingAdmin.password = adminPassword;
    existingAdmin.role = 'admin';
    existingAdmin.permissions = {
      menu: ['*'],
      api: ['*'],
      queue: ['*'],
      job: ['*'],
    };
    existingAdmin.access = {
      aiProviders: settings.allowedAIProviders || [],
      browserAutomations: settings.allowedBrowserAutomations || [],
    };
    existingAdmin.settings = settings.defaultUserSettings || {};
    await existingAdmin.save();
    return { created: false, reset: true, email: existingAdmin.email, password: adminPassword };
  }

  const adminUser = await User.create({
    name: adminName,
    email: adminEmail,
    password: adminPassword,
    role: 'admin',
    permissions: {
      menu: ['*'],
      api: ['*'],
      queue: ['*'],
      job: ['*'],
    },
    access: {
      aiProviders: settings.allowedAIProviders || [],
      browserAutomations: settings.allowedBrowserAutomations || [],
    },
    settings: settings.defaultUserSettings || {},
  });

  return { created: true, email: adminUser.email, password: adminPassword };
}

export async function ensureDefaultUser() {
  const userEmail = process.env.DEFAULT_USER_EMAIL || 'user@smart-wardrobe.local';
  const userPassword = process.env.DEFAULT_USER_PASSWORD || 'User@123456';
  const userName = process.env.DEFAULT_USER_NAME || 'Default User';
  const forceReset = process.env.DEFAULT_USER_FORCE_RESET === '1';

  const existingUser = await User.findOne({ role: 'user' });
  if (existingUser && !forceReset) return { created: false, email: existingUser.email };

  const settings = await getSystemSettings();
  const defaultPermissions = settings.defaultPermissions || {};

  if (existingUser) {
    existingUser.name = userName;
    existingUser.email = userEmail;
    existingUser.password = userPassword;
    existingUser.role = 'user';
    existingUser.permissions = {
      menu: defaultPermissions.menu || [],
      api: defaultPermissions.api || [],
      queue: defaultPermissions.queue || [],
      job: defaultPermissions.job || [],
    };
    existingUser.settings = settings.defaultUserSettings || {};
    await existingUser.save();
    return { created: false, reset: true, email: existingUser.email, password: userPassword };
  }

  const user = await User.create({
    name: userName,
    email: userEmail,
    password: userPassword,
    role: 'user',
    permissions: {
      menu: defaultPermissions.menu || [],
      api: defaultPermissions.api || [],
      queue: defaultPermissions.queue || [],
      job: defaultPermissions.job || [],
    },
    settings: settings.defaultUserSettings || {},
  });

  return { created: true, email: user.email, password: userPassword };
}
