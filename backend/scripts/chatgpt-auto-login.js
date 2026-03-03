#!/usr/bin/env node

/**
 * ChatGPT Auto-Login & Session Manager
 * 
 * This script automatically logs into ChatGPT and saves the session for future use.
 * The saved session can be reused in ChatGPTService to avoid repeated logins.
 * 
 * Usage:
 *   node chatgpt-auto-login.js --email your@email.com --password "yourpassword"
 *   node chatgpt-auto-login.js --refresh     (refresh existing session)
 *   node chatgpt-auto-login.js --validate    (check if session is still valid)
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

puppeteer.use(StealthPlugin());

const SESSION_PATH = path.join(path.dirname(__dirname), 'data', 'chatgpt-session.json');
const DATA_DIR = path.dirname(SESSION_PATH);

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class ChatGPTSessionManager {
  constructor(options = {}) {
    this.email = options.email;
    this.password = options.password;
    this.browser = null;
    this.page = null;
    this.sessionPath = options.sessionPath || SESSION_PATH;
  }

  /**
   * Prompt user for input
   */
  async prompt(question) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise(resolve => {
      rl.question(question, answer => {
        rl.close();
        resolve(answer);
      });
    });
  }

  /**
   * Save session to file
   */
  saveSession(sessionData) {
    try {
      fs.writeFileSync(this.sessionPath, JSON.stringify(sessionData, null, 2));
      console.log(`✅ Session saved to: ${this.sessionPath}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to save session: ${error.message}`);
      return false;
    }
  }

  /**
   * Load session from file
   */
  loadSession() {
    try {
      if (!fs.existsSync(this.sessionPath)) {
        console.log(`⚠️  No session file found at: ${this.sessionPath}`);
        return null;
      }

      const sessionData = JSON.parse(fs.readFileSync(this.sessionPath, 'utf8'));
      console.log(`✅ Session loaded from: ${this.sessionPath}`);
      return sessionData;
    } catch (error) {
      console.error(`❌ Failed to load session: ${error.message}`);
      return null;
    }
  }

  /**
   * Launch browser with proper security settings (like Google Flow)
   */
  async launchBrowser() {
    console.log('🚀 Launching browser...');
    
    const chromeUserDataDir = path.join(
      process.env.LOCALAPPDATA || process.env.HOME,
      'Google',
      'Chrome',
      'User Data'
    );

    try {
      this.browser = await puppeteer.launch({
        channel: 'chrome',
        headless: false,
        args: [
          `--user-data-dir=${chromeUserDataDir}`,
          '--profile-directory=Default',
          '--no-sandbox',  // Same as Google Flow - required for manual auth
          '--disable-setuid-sandbox',  // Same as Google Flow
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-sync',  // Disable sync to avoid "browser may not be secure" warning
          '--disable-extensions',  // Disable extensions
          '--disable-popup-blocking',
          '--start-maximized'
        ],
        defaultViewport: null,
        timeout: 120000
      });
      
      this.page = await this.browser.newPage();
      await this.page.setDefaultNavigationTimeout(120000);
      await this.page.setDefaultTimeout(120000);
      await this.page.setViewport({ width: 1280, height: 800 });
      
      // Set realistic user agent
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
      
      // Enable request logging for debugging
      await this.page.on('request', (req) => {
        if (req.url().includes('auth') || req.url().includes('login')) {
          console.log(`   [API] ${req.method()} ${req.url().substring(0, 80)}`);
        }
      });

      console.log('✅ Browser launched\n');
      return true;
    } catch (error) {
      console.error(`❌ Failed to launch browser: ${error.message}`);
      return false;
    }
  }

  /**
   * Apply saved session to page
   */
  async applySavedSession(sessionData) {
    try {
      if (!sessionData) return false;

      console.log('📝 Applying saved session...');

      // Set cookies
      if (sessionData.cookies && sessionData.cookies.length > 0) {
        await this.page.setCookie(...sessionData.cookies);
        console.log(`   ✓ Applied ${sessionData.cookies.length} cookies`);
      }

      // Set localStorage
      if (sessionData.localStorage) {
        await this.page.evaluate((items) => {
          for (const [key, value] of Object.entries(items)) {
            localStorage.setItem(key, value);
          }
        }, sessionData.localStorage);
        console.log(`   ✓ Applied ${Object.keys(sessionData.localStorage).length} localStorage items`);
      }

      // Set sessionStorage
      if (sessionData.sessionStorage) {
        await this.page.evaluate((items) => {
          for (const [key, value] of Object.entries(items)) {
            sessionStorage.setItem(key, value);
          }
        }, sessionData.sessionStorage);
        console.log(`   ✓ Applied ${Object.keys(sessionData.sessionStorage).length} sessionStorage items`);
      }

      return true;
    } catch (error) {
      console.error(`⚠️  Failed to apply session: ${error.message}`);
      return false;
    }
  }

  /**
   * Capture current session (enhanced like Google Flow)
   */
  async captureSession() {
    console.log('📸 Capturing session...');
    
    try {
      // Get cookies
      const cookies = await this.page.cookies();

      // Get localStorage
      const localStorage = await this.page.evaluate(() => {
        const items = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          items[key] = window.localStorage.getItem(key);
        }
        return items;
      });

      // Get sessionStorage
      const sessionStorage = await this.page.evaluate(() => {
        const items = {};
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          items[key] = window.sessionStorage.getItem(key);
        }
        return items;
      });

      // Check authentication status
      const authStatus = await this.page.evaluate(() => {
        return {
          hasLocalStorage: Object.keys(window.localStorage).length > 0,
          hasSessionStorage: Object.keys(window.sessionStorage).length > 0,
          hasUserInfo: !!(localStorage.getItem('user') || localStorage.getItem('email') || localStorage.getItem('name'))
        };
      });

      const sessionData = {
        cookies,
        localStorage,
        sessionStorage,
        timestamp: new Date().toISOString(),
        url: this.page.url(),
        authStatus: {
          isAuthenticated: await this.isAuthenticated(),
          ...authStatus
        }
      };

      console.log('   ✓ Captured cookies, localStorage, and sessionStorage');
      console.log(`      - Cookies: ${cookies.length}`);
      console.log(`      - LocalStorage items: ${Object.keys(localStorage).length}`);
      console.log(`      - SessionStorage items: ${Object.keys(sessionStorage).length}`);
      console.log(`      - Authenticated: ${sessionData.authStatus.isAuthenticated ? '✅' : '❌'}`);
      
      return sessionData;
    } catch (error) {
      console.error(`❌ Failed to capture session: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    try {
      // Check for chat interface
      const hasChat = await this.page.$('textarea[placeholder*="Message"], textarea[placeholder*="chat"]');
      if (hasChat) return true;

      // Check for authenticated user indication
      const hasUserMenu = await this.page.$('[data-testid="user-menu"]');
      if (hasUserMenu) return true;

      // Check for specific ChatGPT auth elements
      const isLoggedIn = await this.page.evaluate(() => {
        // Look for authenticated user indicators
        const userElement = document.querySelector('[data-testid="user-menu"]');
        const chatArea = document.querySelector('[data-testid="chat"], main');
        const authenticated = !!(userElement || (chatArea && !document.querySelector('[role="button"]:has-text("Log in")')));
        return authenticated;
      });

      return isLoggedIn;
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for manual authentication (like Google Flow)
   */
  async waitForManualAuthentication() {
    console.log('⏳ Waiting for you to login/authenticate manually...');
    console.log('   The browser is open - please login if prompted');
    console.log('   (This script will automatically detect when you\'re done)\n');
    
    const maxWaitTime = 10 * 60 * 1000; // 10 minutes
    const startTime = Date.now();
    let lastAuthCheck = 0;

    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        try {
          // Check for authentication every 2 seconds
          if (Date.now() - lastAuthCheck > 2000) {
            const isAuthed = await this.isAuthenticated();
            
            if (isAuthed) {
              console.log('\n✅ Authentication detected!\n');
              clearInterval(checkInterval);
              resolve(true);
              return;
            }
            
            lastAuthCheck = Date.now();
          }

          // Check for timeout
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          if (elapsed > 0 && elapsed % 30 === 0) {
            console.log(`   ⏳ Still waiting... (${elapsed}s elapsed)`);
          }

          if (Date.now() - startTime > maxWaitTime) {
            console.warn('\n⏱️  Authentication timeout (10 minutes). Proceeding as-is.\n');
            clearInterval(checkInterval);
            resolve(false);
          }
        } catch (error) {
          // Page might be changing, continue waiting
        }
      }, 1000);
    });
  }

  /**
   * Handle browser security warnings
   */
  async handleSecurityWarnings() {
    try {
      console.log('🔍 Checking for security warnings...\n');
      
      // Close various warning/popup dialogs
      const warnings = [
        'button[aria-label*="Close"]',
        'button:has-text("Close")',
        '[role="button"]:has-text("Dismiss")',
        'button:has-text("Got it")'
      ];

      for (const selector of warnings) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            await element.click();
            console.log(`   ✓ Closed warning dialog`);
            await this.page.waitForTimeout(500);
          }
        } catch (e) {
          // Selector not found, continue
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Could not close all warnings: ${error.message}`);
    }
  }

  /**
   * Main login flow
   */
  async login() {
    // Try to launch browser
    if (!await this.launchBrowser()) {
      return false;
    }

    try {
      // Navigate to ChatGPT
      console.log('📍 Navigating to ChatGPT...');
      await this.page.goto('https://chatgpt.com', { waitUntil: 'networkidle2', timeout: 120000 });
      
      // Try applying saved session first
      const savedSession = this.loadSession();
      if (savedSession) {
        console.log('\n💾 Found saved session, applying...');
        await this.applySavedSession(savedSession);
        
        // Reload with session applied
        console.log('🔄 Reloading page with saved session...');
        await this.page.reload({ waitUntil: 'networkidle2' });
        await this.page.waitForTimeout(3000);

        if (await this.isAuthenticated()) {
          console.log('\n✅ Successfully logged in with saved session!');
          // Capture fresh session before returning
          const session = await this.captureSession();
          if (session) {
            this.saveSession(session);
          }
          return true;
        } else {
          console.log('\n⚠️  Saved session expired or invalid. Please login again...\n');
        }
      }

      // Need to login manually (like Google Flow)
      console.log('\n📝 Manual authentication required\n');
      await this.handleSecurityWarnings();

      const success = await this.waitForManualAuthentication();
      
      if (success) {
        // Give page a moment to fully stabilize
        await this.page.waitForTimeout(2000);
        
        // Capture and save session
        const sessionData = await this.captureSession();
        if (sessionData) {
          this.saveSession(sessionData);
        }
        return true;
      } else {
        // Timeout - still try to capture if authenticated
        console.log('⏳ Checking current authentication status...');
        if (await this.isAuthenticated()) {
          const sessionData = await this.captureSession();
          if (sessionData) {
            this.saveSession(sessionData);
            return true;
          }
        }
        return false;
      }
    } catch (error) {
      console.error(`❌ Error during login: ${error.message}`);
      return false;
    } finally {
      // Keep browser open for inspection if needed
      console.log('\n💡 Browser remains open for manual verification. Close when done.');
    }
  }

  /**
   * Validate existing session
   */
  async validateSession() {
    const savedSession = this.loadSession();
    if (!savedSession) {
      console.log('❌ No saved session found');
      return false;
    }

    if (!await this.launchBrowser()) {
      return false;
    }

    try {
      console.log('📍 Navigating to ChatGPT...');
      await this.page.goto('https://chatgpt.com');
      await this.page.waitForTimeout(1000);

      console.log('💾 Applying saved session...');
      await this.applySavedSession(savedSession);
      await this.page.reload({ waitUntil: 'networkidle0' });
      await this.page.waitForTimeout(3000);

      if (await this.isLoggedIn()) {
        console.log('✅ Session is valid and working!');
        return true;
      } else {
        console.log('❌ Session is invalid or expired');
        return false;
      }
    } catch (error) {
      console.error(`❌ Validation error: ${error.message}`);
      return false;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  /**
   * Close browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// CLI Handler
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      options.email = args[++i];
    } else if (args[i] === '--password' && args[i + 1]) {
      options.password = args[++i];
    }
  }

  const manager = new ChatGPTSessionManager(options);

  if (args.includes('--validate')) {
    // Validate existing session
    const isValid = await manager.validateSession();
    process.exit(isValid ? 0 : 1);
  } else if (args.includes('--refresh')) {
    // Refresh session (login again)
    console.log('🔄 Refreshing ChatGPT session...\n');
    const success = await manager.login();
    process.exit(success ? 0 : 1);
  } else {
    // Default: login with session saving
    console.log('🔐 ChatGPT Auto-Login & Session Manager\n');
    console.log('Commands:');
    console.log('  node chatgpt-auto-login.js [--email EMAIL] [--password PASSWORD]');
    console.log('  node chatgpt-auto-login.js --validate     (check session validity)');
    console.log('  node chatgpt-auto-login.js --refresh      (refresh session)\n');

    const success = await manager.login();
    process.exit(success ? 0 : 1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { ChatGPTSessionManager };
