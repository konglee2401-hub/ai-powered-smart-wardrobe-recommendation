import RefreshToken from '../models/RefreshToken.js';
import User from '../models/User.js';
import { createAccessToken, createRefreshToken, getRefreshTokenExpiresAt, hashToken } from '../utils/authTokens.js';

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    ''
  );
}

function getUserAgent(req) {
  return req.headers['user-agent'] || '';
}

export async function issueTokens(user, { rememberMe = false, req } = {}) {
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken();
  const tokenHash = hashToken(refreshToken);

  await RefreshToken.create({
    user: user._id,
    tokenHash,
    expiresAt: getRefreshTokenExpiresAt({ rememberMe, role: user.role }),
    createdByIp: req ? getClientIp(req) : '',
    userAgent: req ? getUserAgent(req) : '',
    rememberMe,
  });

  return { accessToken, refreshToken };
}

export async function rotateRefreshToken(refreshToken, { req } = {}) {
  const tokenHash = hashToken(refreshToken);
  const existing = await RefreshToken.findOne({ tokenHash }).populate('user');
  if (!existing || existing.revokedAt) return { ok: false, reason: 'invalid' };
  if (existing.expiresAt <= new Date()) return { ok: false, reason: 'expired' };

  const user = existing.user || (await User.findById(existing.user));
  if (!user) return { ok: false, reason: 'user_not_found' };
  if (user.status !== 'active') return { ok: false, reason: 'user_disabled' };

  const accessToken = createAccessToken(user);
  const newRefreshToken = createRefreshToken();
  const newHash = hashToken(newRefreshToken);

  existing.revokedAt = new Date();
  existing.replacedByToken = newHash;
  await existing.save();

  await RefreshToken.create({
    user: user._id,
    tokenHash: newHash,
    expiresAt: getRefreshTokenExpiresAt({ rememberMe: existing.rememberMe, role: user.role }),
    createdByIp: req ? getClientIp(req) : '',
    userAgent: req ? getUserAgent(req) : '',
    rememberMe: existing.rememberMe,
  });

  return { ok: true, user, accessToken, refreshToken: newRefreshToken };
}

export async function revokeRefreshToken(refreshToken) {
  const tokenHash = hashToken(refreshToken);
  const existing = await RefreshToken.findOne({ tokenHash });
  if (!existing || existing.revokedAt) return false;
  existing.revokedAt = new Date();
  await existing.save();
  return true;
}
