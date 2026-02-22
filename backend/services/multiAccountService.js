/**
 * Multi Account Service
 * - Manage multiple TikTok, YouTube, and Facebook accounts
 * - Store encrypted credentials
 * - Track account health and usage statistics
 * - Rate limiting and posting schedules
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mediaDir = path.join(__dirname, '../media');
const accountDir = path.join(mediaDir, 'accounts');

// Use environment variable for encryption key, fallback to development key
const ENCRYPTION_KEY = process.env.ACCOUNT_ENCRYPTION_KEY || 'dev-key-1234567890abcdef1234567890abcd';

class MultiAccountService {
  constructor() {
    this.ensureDirectories();
    this.accountsFile = path.join(accountDir, 'accounts.json');
    this.statsFile = path.join(accountDir, 'account-stats.json');
    this.loadAccounts();
  }

  ensureDirectories() {
    if (!fs.existsSync(accountDir)) {
      fs.mkdirSync(accountDir, { recursive: true });
    }
  }

  /**
   * Encrypt password
   */
  encryptPassword(password) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(algorithm, key, iv);

      let encrypted = cipher.update(password, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Error encrypting password:', error);
      return null;
    }
  }

  /**
   * Decrypt password
   */
  decryptPassword(encryptedPassword) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
      const parts = encryptedPassword.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const decipher = crypto.createDecipheriv(algorithm, key, parts.shift());

      let decrypted = decipher.update(parts.join(':'), 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Error decrypting password:', error);
      return null;
    }
  }

  /**
   * Load accounts from file
   */
  loadAccounts() {
    try {
      if (fs.existsSync(this.accountsFile)) {
        const data = fs.readFileSync(this.accountsFile, 'utf8');
        this.accounts = JSON.parse(data);
      } else {
        this.accounts = [];
        this.saveAccounts();
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      this.accounts = [];
    }
  }

  /**
   * Save accounts to file
   */
  saveAccounts() {
    try {
      fs.writeFileSync(this.accountsFile, JSON.stringify(this.accounts, null, 2));
    } catch (error) {
      console.error('Error saving accounts:', error);
    }
  }

  /**
   * Add new account
   */
  addAccount(config) {
    try {
      const {
        platform, // tiktok, youtube, facebook
        username,
        password,
        email = null,
        displayName = null,
        accessToken = null, // OAuth token if available
        refreshToken = null,
        metadata = {}
      } = config;

      if (!platform || !username || !password) {
        return { success: false, error: 'Platform, username, and password are required' };
      }

      const validPlatforms = ['tiktok', 'youtube', 'facebook'];
      if (!validPlatforms.includes(platform)) {
        return { success: false, error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` };
      }

      const accountId = `acc-${platform}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const encryptedPassword = this.encryptPassword(password);

      if (!encryptedPassword) {
        return { success: false, error: 'Failed to encrypt password' };
      }

      const account = {
        accountId,
        platform,
        username,
        email,
        displayName: displayName || username,
        passwordEncrypted: encryptedPassword,
        accessToken,
        refreshToken,
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

      return {
        success: true,
        accountId,
        account: this.sanitizeAccount(account),
        message: `Account added for ${platform}: ${username}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get default cooldown between posts (in minutes)
   */
  getDefaultCooldown(platform) {
    const cooldowns = {
      tiktok: 15, // 15 minutes between posts to avoid spam flags
      youtube: 60, // 1 hour between uploads
      facebook: 30 // 30 minutes between posts
    };
    return cooldowns[platform] || 30;
  }

  /**
   * Get daily upload limit per platform
   */
  getDailyLimit(platform) {
    const limits = {
      tiktok: 10, // TikTok recommends max 10-15 per day for new accounts
      youtube: 1, // YouTube typically allows 1-2 per day
      facebook: 5 // Facebook allows several per day
    };
    return limits[platform] || 5;
  }

  /**
   * Sanitize account (remove encrypted password)
   */
  sanitizeAccount(account) {
    const sanitized = { ...account };
    delete sanitized.passwordEncrypted;
    return sanitized;
  }

  /**
   * Get account by ID
   */
  getAccount(accountId) {
    try {
      const account = this.accounts.find(a => a.accountId === accountId);
      if (!account) {
        return { success: false, error: `Account not found: ${accountId}` };
      }

      return {
        success: true,
        account: this.sanitizeAccount(account)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get account with decrypted password
   */
  getAccountWithPassword(accountId) {
    try {
      const account = this.accounts.find(a => a.accountId === accountId);
      if (!account) {
        return { success: false, error: `Account not found: ${accountId}` };
      }

      const accountWithPassword = { ...account };
      accountWithPassword.password = this.decryptPassword(account.passwordEncrypted);
      delete accountWithPassword.passwordEncrypted;

      return {
        success: true,
        account: accountWithPassword
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all accounts for platform
   */
  getAccountsByPlatform(platform) {
    try {
      const accounts = this.accounts.filter(a => a.platform === platform && a.active);
      return {
        success: true,
        accounts: accounts.map(a => this.sanitizeAccount(a)),
        count: accounts.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get active accounts (ready to use)
   */
  getActiveAccounts(platform = null) {
    try {
      let accounts = this.accounts.filter(a => a.active && a.verified);

      if (platform) {
        accounts = accounts.filter(a => a.platform === platform);
      }

      return {
        success: true,
        accounts: accounts.map(a => this.sanitizeAccount(a)),
        count: accounts.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update account
   */
  updateAccount(accountId, config) {
    try {
      const account = this.accounts.find(a => a.accountId === accountId);
      if (!account) {
        return { success: false, error: `Account not found: ${accountId}` };
      }

      const {
        displayName,
        email,
        accessToken,
        refreshToken,
        active,
        verified,
        metadata
      } = config;

      if (displayName !== undefined) account.displayName = displayName;
      if (email !== undefined) account.email = email;
      if (accessToken !== undefined) account.accessToken = accessToken;
      if (refreshToken !== undefined) account.refreshToken = refreshToken;
      if (active !== undefined) account.active = active;
      if (verified !== undefined) {
        account.verified = verified;
        if (verified) account.verifiedAt = new Date().toISOString();
      }
      if (metadata !== undefined) account.metadata = metadata;

      this.saveAccounts();

      return {
        success: true,
        accountId,
        account: this.sanitizeAccount(account),
        message: 'Account updated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Record post/upload to account
   */
  recordPost(accountId, postData = {}) {
    try {
      const account = this.accounts.find(a => a.accountId === accountId);
      if (!account) {
        return { success: false, error: `Account not found: ${accountId}` };
      }

      const now = new Date();
      const today = now.toDateString();
      const lastUploadToday = account.lastUploadTime ? new Date(account.lastUploadTime).toDateString() : null;

      // Reset daily counter if new day
      if (lastUploadToday !== today) {
        account.uploadedToday = 0;
      }

      // Update counters
      account.postsCount++;
      account.uploadedToday++;
      account.lastUsed = now.toISOString();
      account.lastUploadTime = now.toISOString();

      // Update engagement if provided
      if (postData.views !== undefined) {
        account.viewsCount += postData.views;
      }
      if (postData.engagement !== undefined) {
        account.engagementRate = Math.round(
          (account.engagementRate * (account.postsCount - 1) + postData.engagement) / account.postsCount
        );
      }

      this.saveAccounts();

      return {
        success: true,
        accountId,
        postsCount: account.postsCount,
        uploadedToday: account.uploadedToday,
        remainingDaily: Math.max(0, account.dailyUploadLimit - account.uploadedToday)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Record error for account
   */
  recordError(accountId, error) {
    try {
      const account = this.accounts.find(a => a.accountId === accountId);
      if (!account) {
        return { success: false, error: `Account not found: ${accountId}` };
      }

      account.lastError = error.message || error;
      account.lastErrorAt = new Date().toISOString();

      // Deactivate if too many errors
      const recentErrorCount = this.countRecentErrors(accountId, 60); // Last 60 minutes
      if (recentErrorCount > 5) {
        account.active = false;
      }

      this.saveAccounts();

      return {
        success: true,
        accountId,
        errorMessage: account.lastError,
        deactivated: !account.active
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Count recent errors for account
   */
  countRecentErrors(accountId, minutesBack = 60) {
    try {
      if (!fs.existsSync(this.statsFile)) {
        return 0;
      }

      const data = fs.readFileSync(this.statsFile, 'utf8');
      const stats = JSON.parse(data);

      const cutoffTime = new Date(Date.now() - minutesBack * 60 * 1000);
      const recentErrors = stats.filter(
        s => s.accountId === accountId && s.type === 'error' && new Date(s.timestamp) >= cutoffTime
      );

      return recentErrors.length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Check if account can upload now
   */
  canUploadNow(accountId) {
    try {
      const account = this.accounts.find(a => a.accountId === accountId);
      if (!account) {
        return { canUpload: false, reason: 'Account not found' };
      }

      if (!account.active) {
        return { canUpload: false, reason: 'Account is inactive' };
      }

      if (!account.verified) {
        return { canUpload: false, reason: 'Account not verified' };
      }

      // Check daily limit
      const today = new Date().toDateString();
      const lastUploadToday = account.lastUploadTime ? new Date(account.lastUploadTime).toDateString() : null;
      const uploadedToday = lastUploadToday === today ? account.uploadedToday : 0;

      if (uploadedToday >= account.dailyUploadLimit) {
        return {
          canUpload: false,
          reason: `Daily limit reached (${uploadedToday}/${account.dailyUploadLimit})`
        };
      }

      // Check cooldown
      if (account.lastUploadTime) {
        const lastUpload = new Date(account.lastUploadTime);
        const now = new Date();
        const minutesSinceLastUpload = (now - lastUpload) / 60000;

        if (minutesSinceLastUpload < account.uploadCooldown) {
          const remainingMinutes = Math.ceil(account.uploadCooldown - minutesSinceLastUpload);
          return {
            canUpload: false,
            reason: `In cooldown period. Wait ${remainingMinutes} more minutes`
          };
        }
      }

      return {
        canUpload: true,
        reason: 'Account is ready for upload',
        uploadedToday,
        remainingDaily: account.dailyUploadLimit - uploadedToday
      };
    } catch (error) {
      return {
        canUpload: false,
        reason: error.message
      };
    }
  }

  /**
   * Get best account for posting
   */
  getBestAccountForPosting(platform) {
    try {
      const accounts = this.accounts.filter(
        a => a.platform === platform && a.active && a.verified
      );

      if (accounts.length === 0) {
        return { success: false, error: `No active accounts for platform: ${platform}` };
      }

      // Score accounts based on readiness
      const scored = accounts.map(a => {
        let score = 100;

        const today = new Date().toDateString();
        const lastUploadToday = a.lastUploadTime ? new Date(a.lastUploadTime).toDateString() : null;
        const uploadedToday = lastUploadToday === today ? a.uploadedToday : 0;

        // Penalize if reaching daily limit
        score -= (uploadedToday / a.dailyUploadLimit) * 50;

        // Penalize if recently used
        if (a.lastUploadTime) {
          const minutesSinceLastUpload = (new Date() - new Date(a.lastUploadTime)) / 60000;
          score -= Math.max(0, 50 - minutesSinceLastUpload);
        }

        // Reward based on engagement
        score += a.engagementRate / 10;

        return { account: a, score };
      });

      // Select highest scoring account
      const best = scored.sort((a, b) => b.score - a.score)[0];

      return {
        success: true,
        account: this.sanitizeAccount(best.account),
        score: best.score,
        message: `Account ${best.account.username} is best for posting`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get account rotation order
   */
  getAccountRotation(platform, count = 5) {
    try {
      const accounts = this.accounts.filter(a => a.platform === platform && a.active && a.verified);

      if (accounts.length === 0) {
        return { success: false, error: `No active accounts for platform: ${platform}` };
      }

      // Sort by least recently used
      const sorted = accounts.sort((a, b) => {
        const aTime = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
        const bTime = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
        return aTime - bTime;
      });

      // Return rotation order (least recently used first)
      const rotation = sorted.slice(0, Math.min(count, sorted.length));

      return {
        success: true,
        rotation: rotation.map(a => this.sanitizeAccount(a)),
        count: rotation.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Deactivate account
   */
  deactivateAccount(accountId, reason = 'User requested') {
    try {
      const account = this.accounts.find(a => a.accountId === accountId);
      if (!account) {
        return { success: false, error: `Account not found: ${accountId}` };
      }

      account.active = false;
      account.lastError = reason;
      account.lastErrorAt = new Date().toISOString();

      this.saveAccounts();

      return {
        success: true,
        accountId,
        message: `Account deactivated: ${reason}`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete account
   */
  deleteAccount(accountId) {
    try {
      const index = this.accounts.findIndex(a => a.accountId === accountId);
      if (index === -1) {
        return { success: false, error: `Account not found: ${accountId}` };
      }

      const deleted = this.accounts.splice(index, 1)[0];
      this.saveAccounts();

      return {
        success: true,
        accountId,
        deletedAccount: this.sanitizeAccount(deleted),
        message: 'Account deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all accounts
   */
  getAllAccounts() {
    try {
      return {
        success: true,
        accounts: this.accounts.map(a => this.sanitizeAccount(a)),
        count: this.accounts.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get account statistics
   */
  getAccountStats(accountId = null) {
    try {
      let accounts = accountId ? [this.accounts.find(a => a.accountId === accountId)] : this.accounts;
      accounts = accounts.filter(a => a !== undefined);

      const stats = {
        totalAccounts: accounts.length,
        activeAccounts: accounts.filter(a => a.active).length,
        verifiedAccounts: accounts.filter(a => a.verified).length,
        byPlatform: {
          tiktok: accounts.filter(a => a.platform === 'tiktok').length,
          youtube: accounts.filter(a => a.platform === 'youtube').length,
          facebook: accounts.filter(a => a.platform === 'facebook').length
        },
        totalPosts: 0,
        totalViews: 0,
        averageEngagement: 0,
        accountsWithErrors: 0
      };

      accounts.forEach(a => {
        stats.totalPosts += a.postsCount;
        stats.totalViews += a.viewsCount;
        if (a.lastError) stats.accountsWithErrors++;
      });

      if (accounts.length > 0) {
        const totalEngagement = accounts.reduce((sum, a) => sum + a.engagementRate, 0);
        stats.averageEngagement = Math.round(totalEngagement / accounts.length);
      }

      return {
        success: true,
        stats
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new MultiAccountService();
