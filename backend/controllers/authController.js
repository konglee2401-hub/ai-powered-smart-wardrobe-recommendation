import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { issueTokens, rotateRefreshToken, revokeRefreshToken } from '../services/authService.js';
import { getSystemSettings, resolveEffectiveAccess } from '../services/accessControlService.js';
import { parseCookies } from '../utils/authTokens.js';
import { ensureUserSubscription } from '../services/subscriptionService.js';

const googleClientId =
  process.env.GOOGLE_LOGIN_CLIENT_ID ||
  process.env.GOOGLE_OAUTH_CLIENT_ID ||
  process.env.OAUTH_CLIENT_ID ||
  '';

const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

function mapUserResponse(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

function getRefreshTokenFromRequest(req) {
  const headerToken = req.headers['x-refresh-token'];
  if (headerToken) return headerToken;
  if (req.body?.refreshToken) return req.body.refreshToken;
  const cookies = parseCookies(req.headers.cookie || '');
  return cookies[process.env.REFRESH_COOKIE_NAME || 'refreshToken'];
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

export const register = async (req, res) => {
  try {
    const { name, email, password, rememberMe = false } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, password are required' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, message: 'User exists' });
    }

    const systemSettings = await getSystemSettings();
    const defaultPermissions = systemSettings.defaultPermissions || {};

    const user = await User.create({
      name,
      email,
      password,
      role: 'user',
      permissions: {
        menu: clone(defaultPermissions.menu),
        api: clone(defaultPermissions.api),
        queue: clone(defaultPermissions.queue),
        job: clone(defaultPermissions.job),
      },
      settings: clone(systemSettings.defaultUserSettings),
    });

    await ensureUserSubscription(user._id);

    const tokens = await issueTokens(user, { rememberMe, req });

    res.status(201).json({
      success: true,
      data: {
        user: mapUserResponse(user),
        tokens,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, rememberMe = false } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'User is disabled' });
    }

    user.lastLoginAt = new Date();
    await user.save();
    await ensureUserSubscription(user._id);

    const tokens = await issueTokens(user, { rememberMe, req });

    res.json({
      success: true,
      data: {
        user: mapUserResponse(user),
        tokens,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const googleLogin = async (req, res) => {
  try {
    const { idToken, rememberMe = false } = req.body || {};
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'idToken is required' });
    }
    if (!googleClient) {
      return res.status(500).json({ success: false, message: 'Google client not configured' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      return res.status(400).json({ success: false, message: 'Invalid Google token' });
    }

    let user = await User.findOne({ email: payload.email });
    if (!user) {
      const systemSettings = await getSystemSettings();
      const defaultPermissions = systemSettings.defaultPermissions || {};
      const randomPassword = crypto.randomBytes(24).toString('hex');

      user = await User.create({
        name: payload.name || payload.email.split('@')[0],
        email: payload.email,
        password: randomPassword,
        role: 'user',
        permissions: {
          menu: clone(defaultPermissions.menu),
          api: clone(defaultPermissions.api),
          queue: clone(defaultPermissions.queue),
          job: clone(defaultPermissions.job),
        },
        settings: clone(systemSettings.defaultUserSettings),
        authProviders: {
          google: {
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
          },
        },
      });
    } else {
      user.authProviders = user.authProviders || {};
      user.authProviders.google = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      };
      user.lastLoginAt = new Date();
      await user.save();
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'User is disabled' });
    }

    await ensureUserSubscription(user._id);
    const tokens = await issueTokens(user, { rememberMe, req });

    res.json({
      success: true,
      data: {
        user: mapUserResponse(user),
        tokens,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const refresh = async (req, res) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    const result = await rotateRefreshToken(refreshToken, { req });
    if (!result.ok) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token', reason: result.reason });
    }

    res.json({
      success: true,
      data: {
        user: mapUserResponse(result.user),
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    res.json({ success: true, data: mapUserResponse(req.user) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAccess = async (req, res) => {
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
};
