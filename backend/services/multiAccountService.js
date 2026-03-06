/**
 * Multi Account Service
 * Global multi-platform account manager for video production
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import platformPublishingService from './platformPublishingService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mediaDir = path.join(__dirname, '../media');
const accountDir = path.join(mediaDir, 'accounts');

const ENCRYPTION_KEY = process.env.ACCOUNT_ENCRYPTION_KEY || 'dev-key-1234567890abcdef1234567890abcd';
const YOUTUBE_CLIENT = {
  clientId: process.env.YOUTUBE_CLIENT_ID || '',
  clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
  redirectUri: process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:5000/api/video-production/accounts/oauth/youtube/callback'
};

class MultiAccountService {
  constructor() {
    this.ensureDirectories();
    this.accountsFile = path.join(accountDir, 'accounts.json');
    this.statsFile = path.join(accountDir, 'account-stats.json');
    this.oauthAppsFile = path.join(accountDir, 'oauth-apps.json');
    this.oauthStatesFile = path.join(accountDir, 'oauth-states.json');
    this.loadAccounts();
    this.loadOAuthApps();
    this.loadOAuthStates();
  }

  ensureDirectories() {
    if (!fs.existsSync(accountDir)) fs.mkdirSync(accountDir, { recursive: true });
  }

  encryptPassword(password) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(String(password), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return `${iv.toString('hex')}:${encrypted}`;
    } catch {
      return null;
    }
  }

  decryptPassword(encryptedPassword) {
    try {
      const [ivHex, payload] = String(encryptedPassword || '').split(':');
      if (!ivHex || !payload) return null;
      const algorithm = 'aes-256-cbc';
      const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(payload, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch {
      return null;
    }
  }

  readJson(file, fallback) {
    try {
      if (!fs.existsSync(file)) return fallback;
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return fallback;
    }
  }

  saveJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  }

  loadAccounts() {
    this.accounts = this.readJson(this.accountsFile, []);
    if (!fs.existsSync(this.accountsFile)) this.saveAccounts();
  }

  saveAccounts() { this.saveJson(this.accountsFile, this.accounts); }

  loadOAuthApps() {
    const defaults = {
      youtube: YOUTUBE_CLIENT,
      tiktok: {
        clientId: process.env.TIKTOK_CLIENT_ID || '',
        clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
        redirectUri: process.env.TIKTOK_REDIRECT_URI || 'http://localhost:5000/api/video-production/accounts/oauth/tiktok/callback'
      },
      facebook: {
        appId: process.env.FACEBOOK_APP_ID || '',
        appSecret: process.env.FACEBOOK_APP_SECRET || '',
        redirectUri: process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:5000/api/video-production/accounts/oauth/facebook/callback'
      }
    };
    this.oauthApps = { ...defaults, ...this.readJson(this.oauthAppsFile, {}) };
    this.saveOAuthApps();
  }

  saveOAuthApps() { this.saveJson(this.oauthAppsFile, this.oauthApps); }
  loadOAuthStates() { this.oauthStates = this.readJson(this.oauthStatesFile, []); }
  saveOAuthStates() { this.saveJson(this.oauthStatesFile, this.oauthStates); }

  sanitizeAccount(account) {
    const sanitized = { ...account };
    delete sanitized.passwordEncrypted;
    if (sanitized.accessToken) sanitized.accessToken = '***';
    if (sanitized.refreshToken) sanitized.refreshToken = '***';
    return sanitized;
  }

  getRawAccount(accountId) { return this.accounts.find(a => a.accountId === accountId) || null; }

  getAllAccounts() {
    return { success: true, accounts: this.accounts.map(a => this.sanitizeAccount(a)), count: this.accounts.length };
  }

  getAccountsByPlatform(platform) {
    const accounts = this.accounts.filter(a => a.platform === platform);
    return { success: true, accounts: accounts.map(a => this.sanitizeAccount(a)), count: accounts.length };
  }

  getActiveAccounts(platform = null) {
    let accounts = this.accounts.filter(a => a.active !== false && a.verified);
    if (platform) accounts = accounts.filter(a => a.platform === platform);
    return { success: true, accounts: accounts.map(a => this.sanitizeAccount(a)), count: accounts.length };
  }

  getDefaultCooldown(platform) {
    return { tiktok: 15, youtube: 60, facebook: 30 }[platform] || 30;
  }

  getDailyLimit(platform) {
    return { tiktok: 10, youtube: 1, facebook: 5 }[platform] || 5;
  }

  addAccount(config) {
    const {
      platform, username, password = 'oauth-linked', email = null, displayName = null,
      accessToken = null, refreshToken = null, metadata = {}, oauth = null
    } = config;

    if (!platform || !username) return { success: false, error: 'platform and username are required' };
    const validPlatforms = ['tiktok', 'youtube', 'facebook'];
    if (!validPlatforms.includes(platform)) return { success: false, error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` };

    const accountId = `acc-${platform}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const encryptedPassword = this.encryptPassword(password || 'oauth-linked');
    if (!encryptedPassword) return { success: false, error: 'Failed to encrypt password' };

    const account = {
      accountId,
      platform,
      username,
      email,
      displayName: displayName || username,
      passwordEncrypted: encryptedPassword,
      accessToken,
      refreshToken,
      oauth,
      verified: false,
      verifiedAt: null,
      active: true,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      postsCount: 0,
      viewsCount: 0,
      engagementRate: 0,
      lastError: null,
      lastErrorAt: null,
      uploadCooldown: this.getDefaultCooldown(platform),
      uploadedToday: 0,
      lastUploadTime: null,
      dailyUploadLimit: this.getDailyLimit(platform),
      metadata
    };

    this.accounts.push(account);
    this.saveAccounts();
    return { success: true, accountId, account: this.sanitizeAccount(account), message: `Account added for ${platform}: ${username}` };
  }

  updateAccount(accountId, config) {
    const account = this.accounts.find(a => a.accountId === accountId);
    if (!account) return { success: false, error: `Account not found: ${accountId}` };
    const updatable = ['displayName', 'email', 'accessToken', 'refreshToken', 'active', 'verified', 'metadata', 'oauth'];
    for (const key of updatable) if (config[key] !== undefined) account[key] = config[key];
    if (config.verified === true) account.verifiedAt = new Date().toISOString();
    this.saveAccounts();
    return { success: true, accountId, account: this.sanitizeAccount(account), message: 'Account updated successfully' };
  }

  canUploadNow(accountId) {
    const account = this.accounts.find(a => a.accountId === accountId);
    if (!account) return { canUpload: false, reason: 'Account not found' };
    if (!account.active) return { canUpload: false, reason: 'Account is inactive' };
    if (!account.verified) return { canUpload: false, reason: 'Account not verified' };

    const today = new Date().toDateString();
    const lastUploadToday = account.lastUploadTime ? new Date(account.lastUploadTime).toDateString() : null;
    const uploadedToday = lastUploadToday === today ? (account.uploadedToday || 0) : 0;
    if (uploadedToday >= account.dailyUploadLimit) return { canUpload: false, reason: `Daily limit reached (${uploadedToday}/${account.dailyUploadLimit})` };

    if (account.lastUploadTime) {
      const minutesSinceLastUpload = (Date.now() - new Date(account.lastUploadTime).getTime()) / 60000;
      if (minutesSinceLastUpload < account.uploadCooldown) {
        return { canUpload: false, reason: `In cooldown period. Wait ${Math.ceil(account.uploadCooldown - minutesSinceLastUpload)} more minutes` };
      }
    }

    return { canUpload: true, reason: 'Account is ready for upload', uploadedToday, remainingDaily: account.dailyUploadLimit - uploadedToday };
  }

  recordPost(accountId, postData = {}) {
    const account = this.accounts.find(a => a.accountId === accountId);
    if (!account) return { success: false, error: `Account not found: ${accountId}` };
    const today = new Date().toDateString();
    const lastUploadToday = account.lastUploadTime ? new Date(account.lastUploadTime).toDateString() : null;
    if (lastUploadToday !== today) account.uploadedToday = 0;
    account.postsCount = (account.postsCount || 0) + 1;
    account.uploadedToday = (account.uploadedToday || 0) + 1;
    account.lastUsed = new Date().toISOString();
    account.lastUploadTime = new Date().toISOString();
    if (postData.views !== undefined) account.viewsCount = (account.viewsCount || 0) + postData.views;
    this.saveAccounts();
    return { success: true, accountId };
  }

  countRecentErrors(accountId, minutesBack = 60) {
    const stats = this.readJson(this.statsFile, []);
    const cutoffTime = new Date(Date.now() - minutesBack * 60 * 1000);
    return stats.filter(s => s.accountId === accountId && s.type === 'error' && new Date(s.timestamp) >= cutoffTime).length;
  }

  recordError(accountId, error) {
    const account = this.accounts.find(a => a.accountId === accountId);
    if (!account) return { success: false, error: `Account not found: ${accountId}` };
    account.lastError = error?.message || String(error);
    account.lastErrorAt = new Date().toISOString();
    if (this.countRecentErrors(accountId, 60) > 5) account.active = false;
    this.saveAccounts();
    return { success: true, accountId, deactivated: !account.active };
  }

  getBestAccountForPosting(platform) {
    const accounts = this.accounts.filter(a => a.platform === platform && a.active && a.verified);
    if (!accounts.length) return { success: false, error: `No active accounts for platform: ${platform}` };
    const best = accounts.sort((a, b) => (new Date(a.lastUsed || 0)) - (new Date(b.lastUsed || 0)))[0];
    return { success: true, account: this.sanitizeAccount(best), score: 100 };
  }

  getAccountRotation(platform, count = 5) {
    const accounts = this.accounts.filter(a => a.platform === platform && a.active && a.verified)
      .sort((a, b) => new Date(a.lastUsed || 0) - new Date(b.lastUsed || 0))
      .slice(0, count)
      .map(a => this.sanitizeAccount(a));
    if (!accounts.length) return { success: false, error: `No active accounts for platform: ${platform}` };
    return { success: true, rotation: accounts, count: accounts.length };
  }

  deactivateAccount(accountId, reason = 'User requested') {
    const account = this.accounts.find(a => a.accountId === accountId);
    if (!account) return { success: false, error: `Account not found: ${accountId}` };
    account.active = false;
    account.lastError = reason;
    account.lastErrorAt = new Date().toISOString();
    this.saveAccounts();
    return { success: true, accountId, message: `Account deactivated: ${reason}` };
  }

  deleteAccount(accountId) {
    const index = this.accounts.findIndex(a => a.accountId === accountId);
    if (index === -1) return { success: false, error: `Account not found: ${accountId}` };
    const deleted = this.accounts.splice(index, 1)[0];
    this.saveAccounts();
    return { success: true, accountId, deletedAccount: this.sanitizeAccount(deleted), message: 'Account deleted successfully' };
  }

  getAccountStats(accountId = null) {
    let accounts = accountId ? [this.accounts.find(a => a.accountId === accountId)] : this.accounts;
    accounts = accounts.filter(Boolean);
    return {
      success: true,
      stats: {
        totalAccounts: accounts.length,
        activeAccounts: accounts.filter(a => a.active).length,
        verifiedAccounts: accounts.filter(a => a.verified).length,
        byPlatform: {
          tiktok: accounts.filter(a => a.platform === 'tiktok').length,
          youtube: accounts.filter(a => a.platform === 'youtube').length,
          facebook: accounts.filter(a => a.platform === 'facebook').length
        },
        totalPosts: accounts.reduce((s, a) => s + (a.postsCount || 0), 0),
        totalViews: accounts.reduce((s, a) => s + (a.viewsCount || 0), 0),
        accountsWithErrors: accounts.filter(a => !!a.lastError).length
      }
    };
  }

  validateAccountConfig(platform, config = {}) {
    const missing = [];
    const warnings = [];
    if (!config.accountHandle && !config.username) missing.push('accountHandle/username');
    if (!config.accessToken) missing.push('accessToken');
    if (platform === 'facebook' && !config.pageId) missing.push('pageId');

    if (platform === 'youtube') {
      const scopes = Array.isArray(config.oauthScopes) ? config.oauthScopes : String(config.oauthScopes || '').split(/[\n,\s]+/).filter(Boolean);
      if (!scopes.length) warnings.push('oauthScopes not provided; ensure token includes https://www.googleapis.com/auth/youtube.upload');
      else if (!scopes.map(s => s.toLowerCase()).some(s => s.includes('youtube.upload'))) missing.push('oauthScopes(youtube.upload)');
    }

    return { success: true, valid: missing.length === 0, checkedWith: 'service-validation', missing, warnings };
  }

  getOAuthAppConfig(platform) {
    const config = this.oauthApps?.[platform] || null;
    if (!config) return null;
    const safe = { ...config };
    if (safe.clientSecret) safe.clientSecret = '***';
    if (safe.appSecret) safe.appSecret = '***';
    return safe;
  }

  saveOAuthAppConfig(platform, config = {}) {
    if (!['youtube', 'tiktok', 'facebook'].includes(platform)) return { success: false, error: 'Unsupported platform' };
    this.oauthApps[platform] = { ...(this.oauthApps[platform] || {}), ...config, updatedAt: new Date().toISOString() };
    this.saveOAuthApps();
    return { success: true, platform, config: this.getOAuthAppConfig(platform) };
  }

  createOAuthAuthUrl(platform, { accountLabel = '', stateMeta = {} } = {}) {
    const cfg = this.oauthApps?.[platform] || {};
    const stateId = `oauth-${platform}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.oauthStates.push({
      stateId,
      platform,
      accountLabel,
      stateMeta,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + (15 * 60 * 1000)).toISOString()
    });
    this.saveOAuthStates();

    if (platform === 'youtube') {
      if (!cfg.clientId || !cfg.redirectUri) return { success: false, error: 'Missing YouTube OAuth app config (clientId/redirectUri)' };
      const scopes = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'];
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(cfg.clientId)}&redirect_uri=${encodeURIComponent(cfg.redirectUri)}&response_type=code&access_type=offline&prompt=consent&scope=${encodeURIComponent(scopes.join(' '))}&state=${encodeURIComponent(stateId)}`;
      return { success: true, platform, state: stateId, authUrl, scopes };
    }

    if (platform === 'facebook') {
      if (!cfg.appId || !cfg.redirectUri) return { success: false, error: 'Missing Facebook app config (appId/redirectUri)' };
      const scopes = ['pages_manage_posts', 'pages_show_list', 'pages_read_engagement'];
      const authUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${encodeURIComponent(cfg.appId)}&redirect_uri=${encodeURIComponent(cfg.redirectUri)}&state=${encodeURIComponent(stateId)}&response_type=code&scope=${encodeURIComponent(scopes.join(','))}`;
      return { success: true, platform, state: stateId, authUrl, scopes, note: 'After callback, exchange code manually or extend API integration.' };
    }

    if (platform === 'tiktok') {
      if (!cfg.clientId || !cfg.redirectUri) return { success: false, error: 'Missing TikTok app config (clientId/redirectUri)' };
      const scopes = ['video.publish', 'user.info.basic'];
      const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${encodeURIComponent(cfg.clientId)}&redirect_uri=${encodeURIComponent(cfg.redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(','))}&state=${encodeURIComponent(stateId)}`;
      return { success: true, platform, state: stateId, authUrl, scopes, note: 'After callback, exchange code manually or extend API integration.' };
    }

    return { success: false, error: 'Unsupported platform' };
  }

  consumeOAuthState(stateId, platform) {
    const idx = this.oauthStates.findIndex(s => s.stateId === stateId && s.platform === platform);
    if (idx === -1) return null;
    const state = this.oauthStates[idx];
    this.oauthStates.splice(idx, 1);
    this.saveOAuthStates();
    if (state.expiresAt && new Date(state.expiresAt) < new Date()) return null;
    return state;
  }

  async exchangeYouTubeCode({ code, state, accountName }) {
    const cfg = this.oauthApps?.youtube || {};
    if (!cfg.clientId || !cfg.clientSecret || !cfg.redirectUri) return { success: false, error: 'YouTube OAuth app config is incomplete' };
    if (!code) return { success: false, error: 'code is required' };

    const payload = new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      grant_type: 'authorization_code'
    });

    let tokenData;
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: payload.toString()
      });
      tokenData = await response.json();
      if (!response.ok) throw new Error(tokenData?.error_description || tokenData?.error || `HTTP ${response.status}`);
    } catch (error) {
      return { success: false, error: `Token exchange failed: ${error.message}` };
    }

    const channel = await this.fetchYouTubeChannelInfo(tokenData.access_token);
    if (!channel.success) return channel;

    const stateMeta = state ? this.consumeOAuthState(state, 'youtube') : null;
    const username = channel.handle || channel.channelTitle || channel.channelId;

    const existing = this.accounts.find(a => a.platform === 'youtube' && a.metadata?.channelId === channel.channelId);
    const accountPayload = {
      platform: 'youtube',
      username,
      displayName: accountName || channel.channelTitle || username,
      email: stateMeta?.accountLabel || null,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || existing?.refreshToken || null,
      oauth: {
        grantedScopes: String(tokenData.scope || '').split(/\s+/).filter(Boolean),
        tokenType: tokenData.token_type,
        expiresInSec: tokenData.expires_in,
        grantedAt: new Date().toISOString(),
        oauthClientOwner: 'konglee.aff@gmail.com'
      },
      metadata: {
        ...(existing?.metadata || {}),
        channelId: channel.channelId,
        channelTitle: channel.channelTitle,
        accountHandle: channel.handle,
        oauthStateMeta: stateMeta?.stateMeta || null
      }
    };

    let saveResult;
    if (existing) saveResult = this.updateAccount(existing.accountId, accountPayload);
    else saveResult = this.addAccount(accountPayload);

    if (!saveResult.success) return saveResult;

    const verify = await this.verifyAccountConnection(saveResult.accountId || existing.accountId);
    return {
      success: true,
      accountId: saveResult.accountId || existing.accountId,
      account: verify.account,
      oauth: {
        channelId: channel.channelId,
        channelTitle: channel.channelTitle,
        scopes: accountPayload.oauth.grantedScopes
      }
    };
  }

  async fetchYouTubeChannelInfo(accessToken) {
    try {
      const data = await platformPublishingService.request('https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const item = (data?.items || [])[0];
      if (!item?.id) return { success: false, error: 'Cannot read YouTube channel info from token' };
      return {
        success: true,
        channelId: item.id,
        channelTitle: item?.snippet?.title || '',
        handle: item?.snippet?.customUrl || ''
      };
    } catch (error) {
      return { success: false, error: `Cannot fetch YouTube channel info: ${error.message}` };
    }
  }

  getPlatformRequirements(platform = null) {
    return platformPublishingService.getPlatformRequirements(platform);
  }

  async verifyAccountConnection(accountId) {
    const account = this.getRawAccount(accountId);
    if (!account) return { success: false, error: `Account not found: ${accountId}` };

    const result = await platformPublishingService.verifyAccountConnection(account);
    account.verified = !!result.connected;
    account.verifiedAt = result.connected ? new Date().toISOString() : account.verifiedAt;
    account.lastError = result.connected ? null : result.reason;
    account.lastErrorAt = result.connected ? null : new Date().toISOString();
    this.saveAccounts();

    return {
      success: true,
      accountId,
      status: result.connected ? 'active' : 'inactive',
      account: this.sanitizeAccount(account),
      result: result.connected ? 'Connected' : result.reason,
      verifiedAt: new Date().toISOString()
    };
  }

  async verifyAllAccounts() {
    const results = await Promise.all(this.accounts.map(async account => this.verifyAccountConnection(account.accountId)));
    const success = results.filter(r => r.success && r.status === 'active').length;
    return {
      success: true,
      total: results.length,
      success,
      failed: results.length - success,
      accounts: results.filter(r => r.success).map(r => r.account),
      verifiedAt: new Date().toISOString()
    };
  }

  resolveAccountTargets(payload = {}) {
    const directAccountIds = Array.isArray(payload.accountIds) ? payload.accountIds : [];
    const accountTargets = Array.isArray(payload.accountTargets) ? payload.accountTargets : [];

    const targets = [];
    for (const accountId of directAccountIds) {
      const account = this.getRawAccount(accountId);
      if (!account) continue;
      targets.push({ accountId, platform: account.platform, uploadConfig: payload.uploadConfig || {} });
    }

    for (const t of accountTargets) {
      const ids = Array.isArray(t.accountIds) ? t.accountIds : [];
      for (const accountId of ids) {
        const account = this.getRawAccount(accountId);
        if (!account) continue;
        const platform = t.platform || account.platform;
        if (account.platform !== platform) continue;
        targets.push({ accountId, platform, uploadConfig: t.uploadConfig || payload.uploadConfig || {} });
      }
    }

    const unique = new Map();
    for (const t of targets) unique.set(`${t.accountId}-${t.platform}`, t);
    return Array.from(unique.values());
  }
}

export default new MultiAccountService();
