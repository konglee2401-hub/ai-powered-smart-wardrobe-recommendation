import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CapCut Session Manager
 * Persists cookies, localStorage, and sessionStorage for CapCut web automation.
 */
class CapCutSessionManager {
  constructor(options = {}) {
    if (options.sessionPath) {
      this.sessionPath = options.sessionPath;
      this.sessionDir = path.dirname(this.sessionPath);
      this.sessionFile = path.basename(this.sessionPath);
    } else {
      this.sessionDir = options.sessionDir || path.join(__dirname, '../../sessions');
      this.sessionFile = options.sessionFile || 'capcut-session.json';
      this.sessionPath = path.join(this.sessionDir, this.sessionFile);
    }

    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  hasSession() {
    return fs.existsSync(this.sessionPath);
  }

  getSessionPath() {
    return this.sessionPath;
  }

  loadSession() {
    if (!this.hasSession()) {
      console.log('No saved CapCut session found');
      return null;
    }

    try {
      const data = fs.readFileSync(this.sessionPath, 'utf8');
      const session = JSON.parse(data);

      const maxAge = session.maxAge || 7 * 24 * 60 * 60 * 1000;
      if (session.timestamp && Date.now() - session.timestamp > maxAge) {
        console.log('CapCut session expired');
        return null;
      }

      console.log(`Loaded CapCut session (${session.cookies?.length || 0} cookies)`);
      return session;
    } catch (error) {
      console.error(`Failed to load CapCut session: ${error.message}`);
      return null;
    }
  }

  async saveSession(page, metadata = {}) {
    if (!page) {
      console.error('Failed to save CapCut session: page not available');
      return false;
    }
    if (page.isClosed?.()) {
      console.error('Failed to save CapCut session: page already closed');
      return false;
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const cookies = await page.cookies();

        const localStorage = await page.evaluate(() => {
          const items = {};
          for (let i = 0; i < window.localStorage.length; i += 1) {
            const key = window.localStorage.key(i);
            items[key] = window.localStorage.getItem(key);
          }
          return items;
        });

        const sessionStorage = await page.evaluate(() => {
          const items = {};
          for (let i = 0; i < window.sessionStorage.length; i += 1) {
            const key = window.sessionStorage.key(i);
            items[key] = window.sessionStorage.getItem(key);
          }
          return items;
        });

        const url = page.url();
        const title = await page.title();

        const session = {
          timestamp: Date.now(),
          maxAge: 7 * 24 * 60 * 60 * 1000,
          url,
          title,
          cookies,
          localStorage,
          sessionStorage,
          metadata: {
            provider: 'capcut',
            savedAt: new Date().toISOString(),
            ...metadata,
          },
        };

        fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2));
        console.log(`Saved CapCut session to ${this.sessionPath}`);
        console.log(`  Cookies: ${cookies.length}`);
        console.log(`  LocalStorage: ${Object.keys(localStorage).length}`);
        console.log(`  SessionStorage: ${Object.keys(sessionStorage).length}`);
        return true;
      } catch (error) {
        const message = error.message || '';
        const retryable = /Requesting main frame too early|Execution context was destroyed|Cannot find context/i.test(message);
        if (retryable && attempt === 0) {
          console.warn(`Session save retry: ${message}`);
          try {
            await page.waitForTimeout(1500);
            await page.waitForFunction(() => document.readyState === 'complete', { timeout: 10000 });
          } catch {
            // best effort
          }
          continue;
        }
        console.error(`Failed to save CapCut session: ${message}`);
        return false;
      }
    }
    return false;
  }

  async injectSession(page) {
    const session = this.loadSession();
    if (!session) {
      return false;
    }

    try {
      if (session.cookies && session.cookies.length > 0) {
        for (const cookie of session.cookies) {
          try {
            await page.setCookie(cookie);
          } catch (cookieError) {
            console.log(`Could not set cookie ${cookie.name}: ${cookieError.message}`);
          }
        }
        console.log(`Injected ${session.cookies.length} cookies`);
      }

      if (session.localStorage && Object.keys(session.localStorage).length > 0) {
        await page.evaluateOnNewDocument((storage) => {
          for (const [key, value] of Object.entries(storage)) {
            try {
              window.localStorage.setItem(key, value);
            } catch {
              // ignore quota errors
            }
          }
        }, session.localStorage);
      }

      if (session.sessionStorage && Object.keys(session.sessionStorage).length > 0) {
        await page.evaluateOnNewDocument((storage) => {
          for (const [key, value] of Object.entries(storage)) {
            try {
              window.sessionStorage.setItem(key, value);
            } catch {
              // ignore quota errors
            }
          }
        }, session.sessionStorage);
      }

      return true;
    } catch (error) {
      console.error(`Failed to inject CapCut session: ${error.message}`);
      return false;
    }
  }

  clearSession() {
    if (this.hasSession()) {
      fs.unlinkSync(this.sessionPath);
      console.log('Cleared CapCut session');
    }
  }

  getSessionInfo() {
    if (!this.hasSession()) {
      return null;
    }

    try {
      const data = fs.readFileSync(this.sessionPath, 'utf8');
      const session = JSON.parse(data);
      return {
        exists: true,
        timestamp: session.timestamp,
        savedAt: session.metadata?.savedAt,
        url: session.url,
        title: session.title,
        cookieCount: session.cookies?.length || 0,
        localStorageCount: Object.keys(session.localStorage || {}).length,
        age: Date.now() - (session.timestamp || 0),
        maxAge: session.maxAge || 7 * 24 * 60 * 60 * 1000,
        isExpired: Date.now() - (session.timestamp || 0) > (session.maxAge || 7 * 24 * 60 * 60 * 1000),
      };
    } catch (error) {
      return { exists: true, error: error.message };
    }
  }
}

export default CapCutSessionManager;
