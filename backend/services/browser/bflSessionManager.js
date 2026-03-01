import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * BFL Playground Session Manager
 * Handles saving and loading session data (cookies, localStorage, etc.)
 * for browser automation with authentication persistence
 */
class BFLSessionManager {
  constructor(options = {}) {
    this.sessionDir = options.sessionDir || path.join(__dirname, '../../sessions');
    this.sessionFile = options.sessionFile || 'bfl-session.json';
    this.sessionPath = path.join(this.sessionDir, this.sessionFile);
    
    // Ensure session directory exists
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  /**
   * Check if a saved session exists
   */
  hasSession() {
    return fs.existsSync(this.sessionPath);
  }

  /**
   * Get session file path
   */
  getSessionPath() {
    return this.sessionPath;
  }

  /**
   * Load session from file
   * Returns session data including cookies, localStorage, and metadata
   */
  loadSession() {
    if (!this.hasSession()) {
      console.log('⚠️  No saved BFL session found');
      return null;
    }

    try {
      const data = fs.readFileSync(this.sessionPath, 'utf8');
      const session = JSON.parse(data);
      
      // Check if session is expired (default 24 hours)
      const maxAge = session.maxAge || 24 * 60 * 60 * 1000; // 24 hours
      if (session.timestamp && Date.now() - session.timestamp > maxAge) {
        console.log('⚠️  BFL session expired');
        return null;
      }

      console.log(`✅ Loaded BFL session (${session.cookies?.length || 0} cookies)`);
      return session;
    } catch (error) {
      console.error(`❌ Failed to load BFL session: ${error.message}`);
      return null;
    }
  }

  /**
   * Save session to file
   * Captures cookies, localStorage, and other session data from page
   */
  async saveSession(page, metadata = {}) {
    try {
      // Get all cookies
      const cookies = await page.cookies();
      
      // Get localStorage
      const localStorage = await page.evaluate(() => {
        const items = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          items[key] = window.localStorage.getItem(key);
        }
        return items;
      });

      // Get sessionStorage (optional)
      const sessionStorage = await page.evaluate(() => {
        const items = {};
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          items[key] = window.sessionStorage.getItem(key);
        }
        return items;
      });

      // Get current URL and title for verification
      const url = page.url();
      const title = await page.title();

      const session = {
        timestamp: Date.now(),
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        url,
        title,
        cookies,
        localStorage,
        sessionStorage,
        metadata: {
          provider: 'bfl',
          savedAt: new Date().toISOString(),
          ...metadata
        }
      };

      fs.writeFileSync(this.sessionPath, JSON.stringify(session, null, 2));
      console.log(`✅ Saved BFL session to ${this.sessionPath}`);
      console.log(`   📦 ${cookies.length} cookies`);
      console.log(`   📦 ${Object.keys(localStorage).length} localStorage items`);
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to save BFL session: ${error.message}`);
      return false;
    }
  }

  /**
   * Inject session into page
   * Sets cookies and restores localStorage
   */
  async injectSession(page) {
    const session = this.loadSession();
    if (!session) {
      return false;
    }

    try {
      // Set cookies first (before navigating)
      if (session.cookies && session.cookies.length > 0) {
        for (const cookie of session.cookies) {
          try {
            await page.setCookie(cookie);
          } catch (cookieError) {
            // Some cookies might fail, that's okay
            console.log(`   ⚠️ Could not set cookie ${cookie.name}: ${cookieError.message}`);
          }
        }
        console.log(`✅ Injected ${session.cookies.length} cookies`);
      }

      // Restore localStorage after navigation
      if (session.localStorage && Object.keys(session.localStorage).length > 0) {
        await page.evaluateOnNewDocument((storage) => {
          for (const [key, value] of Object.entries(storage)) {
            try {
              window.localStorage.setItem(key, value);
            } catch (e) {
              console.warn(`Failed to set localStorage item: ${key}`);
            }
          }
        }, session.localStorage);
      }

      return true;
    } catch (error) {
      console.error(`❌ Failed to inject session: ${error.message}`);
      return false;
    }
  }

  /**
   * Clear saved session
   */
  clearSession() {
    if (this.hasSession()) {
      fs.unlinkSync(this.sessionPath);
      console.log('🗑️  Cleared BFL session');
    }
  }

  /**
   * Get session info without full data
   */
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
        maxAge: session.maxAge || 24 * 60 * 60 * 1000,
        isExpired: Date.now() - (session.timestamp || 0) > (session.maxAge || 24 * 60 * 60 * 1000)
      };
    } catch (error) {
      return { exists: true, error: error.message };
    }
  }
}

export default BFLSessionManager;
