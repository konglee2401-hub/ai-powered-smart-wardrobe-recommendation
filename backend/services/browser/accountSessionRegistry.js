import fs from 'fs';
import path from 'path';

const slugify = (value = '') => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80) || `account-${Date.now()}`;

class AccountSessionRegistry {
  constructor(provider, options = {}) {
    this.provider = provider;
    this.baseDir = options.baseDir
      || path.join(process.cwd(), 'backend', 'data', `${provider}-profiles`);
    this.registryPath = path.join(this.baseDir, 'registry.json');
  }

  _loadRegistry() {
    try {
      if (fs.existsSync(this.registryPath)) {
        return JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
      }
    } catch {
      // ignore
    }
    return { provider: this.provider, updatedAt: new Date().toISOString(), sessions: [] };
  }

  _saveRegistry(data) {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    const payload = {
      provider: this.provider,
      updatedAt: new Date().toISOString(),
      sessions: data.sessions || [],
    };
    fs.writeFileSync(this.registryPath, JSON.stringify(payload, null, 2));
  }

  _normalizeSession(entry = {}) {
    return {
      email: entry.email || '',
      label: entry.label || '',
      accountKey: entry.accountKey || '',
      profileDir: entry.profileDir || '',
      sessionPath: entry.sessionPath || '',
      lastUsedAt: entry.lastUsedAt || null,
      lastCredits: Number.isFinite(entry.lastCredits) ? entry.lastCredits : null,
      lastCreditsAt: entry.lastCreditsAt || null,
      rateLimitedAt: entry.rateLimitedAt || null,
      rateLimitReason: entry.rateLimitReason || '',
      disabledUntil: entry.disabledUntil || null,
      isPreferred: entry.isPreferred === true,
      isActive: entry.isActive !== false,
    };
  }

  list() {
    const registry = this._loadRegistry();
    return (registry.sessions || []).map((entry) => this._normalizeSession(entry));
  }

  _findSession(sessions, { email = '', accountKey = '' } = {}) {
    const normalizedEmail = String(email || '').trim();
    const normalizedKey = String(accountKey || '').trim();
    return sessions.find((item) =>
      (normalizedKey && item.accountKey === normalizedKey) ||
      (normalizedEmail && item.email === normalizedEmail)
    );
  }

  ensureAccount(input = '') {
    if (typeof input === 'object' && input !== null) {
      return this._ensureAccountDetails(input);
    }
    return this._ensureAccountDetails({ email: input });
  }

  _ensureAccountDetails({ email = '', label = '', accountKey = '' } = {}) {
    const registry = this._loadRegistry();
    const sessions = registry.sessions || [];
    const normalizedEmail = String(email || '').trim();
    const normalizedLabel = String(label || '').trim();
    const resolvedKey = String(accountKey || '').trim() || (normalizedEmail ? slugify(normalizedEmail) : slugify(normalizedLabel || `account-${Date.now()}`));
    const profileDir = path.join(this.baseDir, resolvedKey);
    const sessionPath = path.join(profileDir, 'session.json');

    let existing = this._findSession(sessions, { email: normalizedEmail, accountKey: resolvedKey });
    if (!existing) {
      existing = {
        email: normalizedEmail,
        label: normalizedLabel,
        accountKey: resolvedKey,
        profileDir,
        sessionPath,
        lastUsedAt: null,
        lastCredits: null,
        lastCreditsAt: null,
        rateLimitedAt: null,
        rateLimitReason: '',
        disabledUntil: null,
        isPreferred: false,
        isActive: true,
      };
      sessions.push(existing);
      this._saveRegistry({ sessions });
    } else {
      existing.email = normalizedEmail || existing.email;
      existing.label = normalizedLabel || existing.label;
      existing.accountKey = existing.accountKey || resolvedKey;
      existing.profileDir = existing.profileDir || profileDir;
      existing.sessionPath = existing.sessionPath || sessionPath;
      if (existing.isActive === undefined) existing.isActive = true;
      this._saveRegistry({ sessions });
    }

    return this._normalizeSession(existing);
  }

  updateAccount(identifier = {}, updates = {}) {
    const registry = this._loadRegistry();
    const sessions = registry.sessions || [];
    const session = this._findSession(sessions, identifier);
    if (!session) return null;
    if (typeof updates.email === 'string' && updates.email.trim()) session.email = updates.email.trim();
    if (typeof updates.label === 'string' && updates.label.trim()) session.label = updates.label.trim();
    if (typeof updates.accountKey === 'string' && updates.accountKey.trim()) session.accountKey = updates.accountKey.trim();
    if (typeof updates.profileDir === 'string' && updates.profileDir.trim()) session.profileDir = updates.profileDir.trim();
    if (typeof updates.sessionPath === 'string' && updates.sessionPath.trim()) session.sessionPath = updates.sessionPath.trim();
    if (typeof updates.lastCredits !== 'undefined') session.lastCredits = Number.isFinite(updates.lastCredits) ? updates.lastCredits : null;
    if (typeof updates.lastCreditsAt !== 'undefined') session.lastCreditsAt = updates.lastCreditsAt || null;
    this._saveRegistry({ sessions });
    return this._normalizeSession(session);
  }

  selectAccount({ preferEmail = '', preferKey = '', minCredits = null } = {}) {
    const sessions = this.list();
    const now = Date.now();

    const isAvailable = (session) => {
      if (session.isActive === false) return false;
      if (session.disabledUntil && new Date(session.disabledUntil).getTime() > now) {
        return false;
      }
      if (session.rateLimitedAt && session.disabledUntil && new Date(session.disabledUntil).getTime() > now) {
        return false;
      }
      if (Number.isFinite(minCredits) && Number.isFinite(session.lastCredits) && session.lastCredits < minCredits) {
        return false;
      }
      return true;
    };

    if (preferKey || preferEmail) {
      const preferred = sessions.find((item) => (preferKey && item.accountKey === preferKey) || (preferEmail && item.email === preferEmail));
      if (preferred && isAvailable(preferred)) return preferred;
    }

    const preferred = sessions.find((item) => item.isPreferred && isAvailable(item));
    if (preferred) return preferred;

    const available = sessions.filter(isAvailable);
    if (!available.length) return sessions[0] || null;

    available.sort((left, right) => {
      const leftUsed = left.lastUsedAt ? new Date(left.lastUsedAt).getTime() : 0;
      const rightUsed = right.lastUsedAt ? new Date(right.lastUsedAt).getTime() : 0;
      return leftUsed - rightUsed;
    });
    return available[0] || null;
  }

  markUsed(identifier = '') {
    const registry = this._loadRegistry();
    const sessions = registry.sessions || [];
    const session = this._findSession(sessions, typeof identifier === 'object' ? identifier : { email: identifier, accountKey: identifier });
    if (session) {
      session.lastUsedAt = new Date().toISOString();
      this._saveRegistry({ sessions });
    }
  }

  updateCredits(identifier = '', credits = null) {
    const registry = this._loadRegistry();
    const sessions = registry.sessions || [];
    const session = this._findSession(sessions, typeof identifier === 'object' ? identifier : { email: identifier, accountKey: identifier });
    if (session) {
      session.lastCredits = Number.isFinite(credits) ? credits : null;
      session.lastCreditsAt = new Date().toISOString();
      this._saveRegistry({ sessions });
    }
  }

  markRateLimited(identifier = '', reason = '', cooldownMinutes = 180) {
    const registry = this._loadRegistry();
    const sessions = registry.sessions || [];
    const session = this._findSession(sessions, typeof identifier === 'object' ? identifier : { email: identifier, accountKey: identifier });
    if (session) {
      session.rateLimitedAt = new Date().toISOString();
      session.rateLimitReason = reason || 'rate-limit';
      session.disabledUntil = new Date(Date.now() + cooldownMinutes * 60 * 1000).toISOString();
      this._saveRegistry({ sessions });
    }
  }

  clearRateLimit(identifier = '') {
    const registry = this._loadRegistry();
    const sessions = registry.sessions || [];
    const session = this._findSession(sessions, typeof identifier === 'object' ? identifier : { email: identifier, accountKey: identifier });
    if (session) {
      session.rateLimitedAt = null;
      session.rateLimitReason = '';
      session.disabledUntil = null;
      this._saveRegistry({ sessions });
    }
  }

  setPreferred(identifier = '', value = true) {
    const registry = this._loadRegistry();
    const sessions = registry.sessions || [];
    const key = typeof identifier === 'object' ? identifier.accountKey : identifier;
    const email = typeof identifier === 'object' ? identifier.email : identifier;
    sessions.forEach((item) => {
      item.isPreferred = value && ((key && item.accountKey === key) || (email && item.email === email));
    });
    this._saveRegistry({ sessions });
  }

  setActive(identifier = '', value = true) {
    const registry = this._loadRegistry();
    const sessions = registry.sessions || [];
    const session = this._findSession(sessions, typeof identifier === 'object' ? identifier : { email: identifier, accountKey: identifier });
    if (session) {
      session.isActive = !!value;
      this._saveRegistry({ sessions });
    }
  }
}

export default AccountSessionRegistry;
