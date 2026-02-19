import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Session Manager
 * Handles saving and loading browser cookies for persistent sessions
 */
class SessionManager {
  constructor(service = 'grok') {
    this.service = service;
    this.sessionDir = path.join(__dirname, '../../data/sessions');
    this.sessionFile = path.join(this.sessionDir, `${service}-session.json`);
    
    // Ensure session directory exists
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  /**
   * Check if session exists
   */
  hasSession() {
    return fs.existsSync(this.sessionFile);
  }

  /**
   * Save cookies to file
   */
  async saveSession(cookies) {
    try {
      const sessionData = {
        service: this.service,
        savedAt: new Date().toISOString(),
        cookies: cookies
      };

      fs.writeFileSync(
        this.sessionFile,
        JSON.stringify(sessionData, null, 2)
      );

      console.log(`✅ Session saved for ${this.service} to ${this.sessionFile}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to save session: ${error.message}`);
      return false;
    }
  }

  /**
   * Load cookies from file
   */
  loadSession() {
    try {
      if (!this.hasSession()) {
        console.log(`⚠️  No saved session found for ${this.service}`);
        return null;
      }

      const sessionData = JSON.parse(fs.readFileSync(this.sessionFile, 'utf-8'));
      const savedAt = new Date(sessionData.savedAt);
      const now = new Date();
      const ageHours = (now - savedAt) / (1000 * 60 * 60);

      console.log(`📂 Loaded ${this.service} session (saved ${ageHours.toFixed(1)} hours ago)`);

      // Check if session might be expired (older than 30 days)
      if (ageHours > 720) {
        console.log(`⚠️  Session is older than 30 days, it may have expired`);
      }

      return sessionData.cookies;
    } catch (error) {
      console.error(`❌ Failed to load session: ${error.message}`);
      return null;
    }
  }

  /**
   * Delete saved session
   */
  deleteSession() {
    try {
      if (this.hasSession()) {
        fs.unlinkSync(this.sessionFile);
        console.log(`✅ Session deleted for ${this.service}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Failed to delete session: ${error.message}`);
      return false;
    }
  }

  /**
   * Get session info
   */
  getSessionInfo() {
    try {
      if (!this.hasSession()) {
        return null;
      }

      const sessionData = JSON.parse(fs.readFileSync(this.sessionFile, 'utf-8'));
      const savedAt = new Date(sessionData.savedAt);
      const now = new Date();
      const ageMs = now - savedAt;

      return {
        service: sessionData.service,
        savedAt: savedAt.toISOString(),
        ageHours: (ageMs / (1000 * 60 * 60)).toFixed(1),
        cookieCount: sessionData.cookies ? sessionData.cookies.length : 0
      };
    } catch (error) {
      return null;
    }
  }
}

export default SessionManager;
