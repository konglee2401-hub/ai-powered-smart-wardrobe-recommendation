import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SESSION_DIR = path.join(__dirname, '../../.sessions');

/**
 * Session Manager
 * Handles saving and loading browser sessions using cookies
 */
class SessionManager {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.sessionPath = path.join(SESSION_DIR, `${serviceName}-session.json`);
    
    // Ensure session directory exists
    if (!fs.existsSync(SESSION_DIR)) {
      fs.mkdirSync(SESSION_DIR, { recursive: true });
    }
  }

  /**
   * Check if session exists
   */
  hasSession() {
    return fs.existsSync(this.sessionPath);
  }

  /**
   * Save session using cookies
   */
  async saveSession(page) {
    try {
      console.log(`💾 Saving session to: ${this.sessionPath}`);
      
      // Get all cookies from the page
      const cookies = await page.cookies();
      
      // Save cookies to file
      const sessionData = {
        cookies: cookies,
        timestamp: new Date().toISOString(),
        serviceName: this.serviceName
      };
      
      fs.writeFileSync(this.sessionPath, JSON.stringify(sessionData, null, 2));
      
      console.log(`✅ Session saved successfully (${cookies.length} cookies)`);
      return true;
    } catch (error) {
      console.error('❌ Failed to save session:', error.message);
      return false;
    }
  }

  /**
   * Load session cookies
   */
  loadSession() {
    try {
      if (!this.hasSession()) {
        console.log('ℹ️  No saved session found');
        return null;
      }

      console.log(`📂 Loading session from: ${this.sessionPath}`);
      
      const sessionData = JSON.parse(fs.readFileSync(this.sessionPath, 'utf-8'));
      
      console.log(`✅ Session loaded successfully (${sessionData.cookies.length} cookies)`);
      return sessionData.cookies;
    } catch (error) {
      console.error('❌ Failed to load session:', error.message);
      return null;
    }
  }

  /**
   * Delete session
   */
  deleteSession() {
    try {
      if (fs.existsSync(this.sessionPath)) {
        fs.unlinkSync(this.sessionPath);
        console.log('✅ Session deleted');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to delete session:', error.message);
      return false;
    }
  }

  /**
   * Get session info
   */
  getSessionInfo() {
    if (!this.hasSession()) {
      return null;
    }

    try {
      const stats = fs.statSync(this.sessionPath);
      const sessionData = JSON.parse(fs.readFileSync(this.sessionPath, 'utf-8'));
      
      return {
        path: this.sessionPath,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        hasCookies: sessionData.cookies && sessionData.cookies.length > 0,
        cookieCount: sessionData.cookies ? sessionData.cookies.length : 0,
        timestamp: sessionData.timestamp,
        serviceName: sessionData.serviceName
      };
    } catch (error) {
      return null;
    }
  }
}

export default SessionManager;
