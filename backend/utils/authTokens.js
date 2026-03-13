import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_EXPIRE = process.env.JWT_ACCESS_EXPIRE || process.env.JWT_EXPIRE || '15m';
const ADMIN_ACCESS_EXPIRE = process.env.ADMIN_JWT_ACCESS_EXPIRE || '30d';

export function createAccessToken(user) {
  const expiresIn = user?.role === 'admin' ? ADMIN_ACCESS_EXPIRE : ACCESS_EXPIRE;
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn }
  );
}

export function createRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getRefreshTokenExpiresAt({ rememberMe = false, role = 'user' } = {}) {
  const adminDays = Number(process.env.ADMIN_JWT_REFRESH_EXPIRE_DAYS || 90);
  const defaultDays = rememberMe
    ? Number(process.env.JWT_REFRESH_EXPIRE_REMEMBER_DAYS || 30)
    : Number(process.env.JWT_REFRESH_EXPIRE_DAYS || 7);
  const days = role === 'admin' ? adminDays : defaultDays;
  const ms = defaultDays * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function parseCookies(cookieHeader = '') {
  const cookies = {};
  cookieHeader.split(';').forEach((pair) => {
    const [rawKey, ...rest] = pair.trim().split('=');
    if (!rawKey) return;
    cookies[rawKey] = decodeURIComponent(rest.join('='));
  });
  return cookies;
}
