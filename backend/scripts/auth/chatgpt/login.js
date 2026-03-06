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
import LogClient from '../../../utils/LogClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

puppeteer.use(StealthPlugin());

// 💫 Use same path as ChatGPTService for session sharing
const CHATGPT_PROFILE_BASE = path.join(path.dirname(__dirname), 'data', 'chatgpt-profiles');
const SESSION_PATH = path.join(CHATGPT_PROFILE_BASE, 'default', 'session.json');
const CHATGPT_PROFILE_DIR = path.join(CHATGPT_PROFILE_BASE, 'default');  // Shared default profile
const DATA_DIR = path.dirname(SESSION_PATH);

// Ensure all directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(CHATGPT_PROFILE_DIR)) {
  fs.mkdirSync(CHATGPT_PROFILE_DIR, { recursive: true });
}

class ChatGPTSessionManager {
  constructor(options = {}) {
    this.email = options.email;
    this.password = options.password;
    this.browser = null;
    this.page = null;
    this.sessionPath = options.sessionPath || SESSION_PATH;
    this.logClient = options.logClient || new LogClient(); // 💫 Default LogClient if not provided
  }

  /**
   * 💫 Helper method to log to both console and remote server
   */
  async log(message, level = 'info') {
    // Always log to console
    const prefix = {
      'info': '📋',
      'warn': '⚠️ ',
      'error': '❌',
      'success': '✅'
    }[level] || '📝';
    console.log(`${prefix} ${message}`);

    // Also send to LogClient if available
    try {
      await this.logClient[level](message);
    } catch (e) {
      // Silently fail - don't interrupt the main process
    }
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
      // 💫 Ensure session directory exists before saving
      const sessionDir = path.dirname(this.sessionPath);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
        console.log(`   📁 Created session directory: ${sessionDir}`);
      }

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
    
    // Use dedicated ChatGPT profile directory to persist session
    console.log(`📁 Using ChatGPT profile: ${CHATGPT_PROFILE_DIR}`);

    try {
      this.browser = await puppeteer.launch({
        channel: 'chrome',
        headless: false,
        args: [
          `--user-data-dir=${CHATGPT_PROFILE_DIR}`,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--start-maximized',
          '--disable-sync',
          '--disable-extensions',
          '--disable-popup-blocking'
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
      
      // 🔐 CRITICAL: Validate auth token is actually present
      const hasAuthToken = cookies.some(c => 
        c.name === '__Secure-next-auth.session-token' || 
        c.name.includes('auth') && c.name.includes('token')
      );
      console.log(`      - Auth token present: ${hasAuthToken ? '✅' : '⚠️  MISSING'}`);
      
      if (!hasAuthToken) {
        console.warn('⚠️  WARNING: Auth token cookie not found in captured session!');
        console.warn('   This session will NOT be reusable for future logins.');
        console.warn('   User will need to login again next time.');
      }
      
      return sessionData;
    } catch (error) {
      console.error(`❌ Failed to capture session: ${error.message}`);
      return null;
    }
  }

  async isAuthenticated() {
    try {
      // First, quick URL check - if we're not on chatgpt.com main domain, we're not authenticated
      const currentUrl = this.page.url();
      if (!currentUrl.includes('chatgpt.com')) {
        return false;
      }
      // If we're on auth pages, not authenticated yet
      if (currentUrl.includes('auth.openai.com') || currentUrl.includes('/auth/')) {
        return false;
      }

      // Direct and simple element checks from actual ChatGPT DOM
      const authStatus = await this.page.evaluate(() => {
        try {
          // Check 1: Main chat textarea (id="prompt-textarea")
          const hasTextarea = !!document.querySelector('textarea[id="prompt-textarea"]') || 
                             !!document.querySelector('textarea[name="prompt-textarea"]') ||
                             !!document.querySelector('textarea[placeholder*="Ask"]');

          // Check 2: Profile button with user name/image
          const hasProfileButton = !!document.querySelector('img[alt="Profile image"]') ||
                                  !!document.querySelector('[class*="profile"]');

          // Check 3: Create new chat button (data-testid="create-new-chat-button")
          const hasCreateButton = !!document.querySelector('[data-testid="create-new-chat-button"]');

          // Check 4: No login button visible
          const loginButtons = Array.from(document.querySelectorAll('button, a'))
            .filter(el => {
              const text = el.textContent.toLowerCase();
              return (text.includes('log in') || 
                      text.includes('sign in') || 
                      text.includes('sign up'));
            })
            .filter(el => {
              // Filter for visible elements only
              return el.offsetHeight > 0 && el.offsetWidth > 0;
            });
          const hasLoginButton = loginButtons.length > 0;

          // Check 5: Page title should be ChatGPT
          const isCorrectPage = document.title.includes('ChatGPT') || 
                               document.body.innerText.includes('What are you working on');

          // Determine authentication status
          const isAuthed = (hasTextarea && hasCreateButton && !hasLoginButton) ||
                          (hasProfileButton && hasCreateButton && !hasLoginButton);

          return {
            hasTextarea,
            hasProfileButton,
            hasCreateButton,
            hasLoginButton,
            isCorrectPage,
            isAuthed,
            pageTitle: document.title
          };
        } catch (e) {
          return { isAuthed: false, error: e.message };
        }
      });

      // Log detailed authentication checks
      console.log('   📋 Authentication Checks:');
      console.log(`     ✓ Chat textarea: ${authStatus.hasTextarea ? '✅' : '❌'}`);
      console.log(`     ✓ Profile button: ${authStatus.hasProfileButton ? '✅' : '❌'}`);
      console.log(`     ✓ Create chat button: ${authStatus.hasCreateButton ? '✅' : '❌'}`);
      console.log(`     ✓ No login button: ${!authStatus.hasLoginButton ? '✅' : '❌'}`);
      console.log(`     ✓ Correct page: ${authStatus.isCorrectPage ? '✅' : '❌'}`);
      console.log(`   📄 Page title: ${authStatus.pageTitle}`);

      return authStatus.isAuthed;
    } catch (error) {
      console.log(`   ⚠️  Error checking authentication: ${error.message}`);
      return false;
    }
  }

  /**
   * Wait for user to manually login and press Enter (with timeout auto-check)
   */
  async waitForManualLoginWithEnter(timeoutSeconds = 120) {
    console.log('\n🔓 MANUAL LOGIN REQUIRED\n');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('A browser window will open. Please:');
    console.log('  1. Login to ChatGPT with your email and password');
    console.log('  2. Complete any 2FA if needed');
    console.log('  3. When logged in successfully, press ENTER in this terminal');
    console.log('  4. Or wait 120 seconds for auto-check\n');
    console.log('═══════════════════════════════════════════════════════════════════\n');
    
    return new Promise((resolve) => {
      let resolved = false;
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      // Ask user to press ENTER
      rl.question('⏳ Press ENTER when logged in (or wait for auto-check...): ', () => {
        rl.close();
        if (!resolved) {
          resolved = true;
          console.log('\n✅ Got your confirmation!');
          console.log('⏳ Checking authentication status...\n');
          resolve(true);
        }
      });

      // Auto-check after timeout
      const timeoutHandle = setTimeout(async () => {
        if (!resolved) {
          resolved = true;
          rl.close();
          console.log('\n⏱️  Timeout reached! Starting auto-check...');
          console.log('⏳ Checking authentication status...\n');
          resolve(true);
        }
      }, timeoutSeconds * 1000);

      // Cleanup timeout on early resolution
      rl.on('close', () => {
        clearTimeout(timeoutHandle);
      });
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
    console.log('\n🚀 Starting ChatGPT Auto-Login Script');
    console.log('═════════════════════════════════════════════════════════\n');
    
    if (!await this.launchBrowser()) {
      return false;
    }

    try {
      // Navigate to ChatGPT
      console.log('📍 Navigating to ChatGPT...');
      await this.page.goto('https://chatgpt.com', { waitUntil: 'networkidle2', timeout: 120000 });
      console.log('✅ Page loaded\n');
      
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

      // Wait for user to press Enter
      await this.waitForManualLoginWithEnter();
      
      // Give page a moment to stabilize
      await this.page.waitForTimeout(2000);
      
      // Check if authenticated now
      console.log('🔍 Verifying authentication...');
      const isAuthed = await this.isAuthenticated();
      
      if (isAuthed) {
        console.log('\n✅ Authentication confirmed!\n');
        
        // Capture and save session
        const sessionData = await this.captureSession();
        if (sessionData) {
          this.saveSession(sessionData);
          console.log('✅ Session saved successfully!\n');
        }
        return true;
      } else {
        console.log('\n⚠️  Authentication not detected. Checking if page loaded correctly...');
        
        // Try refreshing and checking again (sometimes page needs a moment)
        console.log('🔄 Refreshing page and retrying...');
        await this.page.reload({ waitUntil: 'networkidle2' });
        await this.page.waitForTimeout(3000);
        
        const isAuthedRetry = await this.isAuthenticated();
        if (isAuthedRetry) {
          console.log('\n✅ Authentication confirmed on retry!\n');
          const sessionData = await this.captureSession();
          if (sessionData) {
            this.saveSession(sessionData);
            console.log('✅ Session saved successfully!\n');
          }
          return true;
        }
        
        console.log('❌ Still not authenticated. Please check:');
        console.log('  1. Did you see the browser window open?');
        console.log('  2. Did you complete the login process?');
        console.log('  3. Are you logged in to ChatGPT in the browser?\n');
        return false;
      }
    } catch (error) {
      console.error(`❌ Error during login: ${error.message}`);
      return false;
    } finally {
      // Close browser after a delay to allow user inspection
      setTimeout(async () => {
        try {
          if (this.browser) {
            await this.browser.close();
            console.log('🔒 Browser closed.\n');
          }
        } catch (e) {
          // Browser already closed
        }
      }, 2000);
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
  let logSessionId = null;
  let logServerUrl = 'http://localhost:5000';

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      options.email = args[++i];
    } else if (args[i] === '--password' && args[i + 1]) {
      options.password = args[++i];
    } else if (args[i] === '--log-session' && args[i + 1]) {
      logSessionId = args[++i];
    } else if (args[i] === '--log-server' && args[i + 1]) {
      logServerUrl = args[++i];
    }
  }

  // 💫 Create LogClient if session ID is provided
  if (logSessionId) {
    options.logClient = new LogClient(logSessionId, logServerUrl);
  }

  const manager = new ChatGPTSessionManager(options);

  if (args.includes('--validate')) {
    // Validate existing session
    const isValid = await manager.validateSession();
    process.exit(isValid ? 0 : 1);
  } else if (args.includes('--refresh')) {
    // Refresh session (login again)
    await manager.log('🔄 Refreshing ChatGPT session...\n', 'info');
    const success = await manager.login();
    if (manager.logClient?.enabled) {
      await manager.logClient.endSession(success ? 'completed' : 'failed');
    }
    process.exit(success ? 0 : 1);
  } else {
    // Default: login with session saving
    await manager.log('🔐 ChatGPT Auto-Login & Session Manager', 'info');
    await manager.log('Commands:', 'info');
    await manager.log('  node chatgpt-auto-login.js [--email EMAIL] [--password PASSWORD]', 'info');
    await manager.log('  node chatgpt-auto-login.js --validate     (check session validity)', 'info');
    await manager.log('  node chatgpt-auto-login.js --refresh      (refresh session)\n', 'info');

    const success = await manager.login();
    if (manager.logClient?.enabled) {
      await manager.logClient.endSession(success ? 'completed' : 'failed');
    }
    process.exit(success ? 0 : 1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

export { ChatGPTSessionManager };
