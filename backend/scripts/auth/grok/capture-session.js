/**
 * Grok Session Capture & Auto-Login Script
 * 
 * Purpose:
 *   - Capture Grok.com session data (cookies, localStorage, sessionStorage)
 *   - Store for persistent session reuse without manual login
 *   - Support auto-refresh when tokens expire
 * 
 * Session Structure:
 *   - cookies: Full authentication cookies including cf_clearance (Cloudflare bypass)
 *   - localStorage: User preferences, app state, anonymous user ID
 *   - sessionStorage: Temporary session data
 *   - metadata: Timestamp and validity info
 * 
 * Critical Tokens:
 *   1. cf_clearance: Cloudflare challenge bypass (expires ~30 days)
 *   2. sso: Session token (expires based on server config)
 *   3. sso-rw: Read-write session token
 *   4. anonUserId: Anonymous user identifier
 *   5. anonPrivateKey: Encryption key for anonymous requests
 * 
 * Usage:
 *   node scripts/grok-session-capture.js --mode capture   # Interactive: Opens browser, waits for manual login
 *   node scripts/grok-session-capture.js --mode auto       # Uses existing session, refreshes if needed
 *   node scripts/grok-session-capture.js --mode info       # Display saved session info
 *   node scripts/grok-session-capture.js --mode delete     # Delete saved session
 *   node scripts/grok-session-capture.js --mode refresh    # Force token refresh
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

puppeteer.use(StealthPlugin());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GROK_PROFILE_BASE = path.join(__dirname, '../../../data/grok-profiles');
const profileArgIndex = process.argv.indexOf('--profile');
const PROFILE_KEY = String(
  (profileArgIndex >= 0 ? process.argv[profileArgIndex + 1] : '') ||
  process.env.GROK_PROFILE_KEY ||
  'default'
).trim() || 'default';
const PROFILE_DIR = path.join(GROK_PROFILE_BASE, PROFILE_KEY);
const SESSION_FILE = path.join(PROFILE_DIR, 'session.json');
const BACKUP_FILE = path.join(PROFILE_DIR, 'session.backup.json');

if (!fs.existsSync(PROFILE_DIR)) {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
}

class GrokSessionCapture {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = 'https://grok.com';
  }

  /**
   * Interactive Mode: Launch browser and capture session after manual login
   */
  async captureSessionInteractive() {
    console.log('\n' + '═'.repeat(80));
    console.log('🚀 GROK SESSION CAPTURE - INTERACTIVE MODE');
    console.log('═'.repeat(80));
    console.log('\n📋 Steps:');
    console.log('  1. Fresh browser window will open (clean session)');
    console.log('  2. Navigate to Grok.com');
    console.log('  3. Try to login - test Cloudflare bypass');
    console.log('  4. If login succeeds, session will be auto-captured');
    console.log('  5. Session will be saved for future use\n');

    try {
      // Launch fresh browser (no profile loading)
      console.log('🚀 Launching fresh browser (clean session)...');
      
      const browserArgs = [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-resources',
        '--disable-client-side-phishing-detection',
        '--disable-popup-blocking',
        '--disable-plugins',
        '--disable-extensions',
        '--disable-sync',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-component-extensions-with-background-pages',
        '--disable-background-timer-throttling',
        '--disable-breakpad',
        '--disable-client-side-phishing-detection',
        '--disable-component-extensions-with-background-pages',
        '--disable-default-apps',
        '--disable-device-discovery-notifications',
        '--disable-extensions-file-access-check',
        '--disable-preconnect',
        '--disable-prompt-on-repost',
        '--disable-renderer-backgrounding',
        '--disable-sync',
        '--enable-automation=false',
        '--start-maximized'
      ];

      const launchPromise = puppeteer.launch({
        headless: false,
        executablePath: undefined,  // Use default Chromium
        args: browserArgs
      });

      // Set a timeout for browser launch
      const launchTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Browser launch timeout (30s)')), 30000)
      );

      try {
        this.browser = await Promise.race([launchPromise, launchTimeout]);
        console.log('✅ Browser launched\n');
      } catch (e) {
        console.error(`❌ Browser launch failed: ${e.message}`);
        console.log('\n⚠️  TROUBLESHOOTING:');
        console.log('   - Run this script on a machine with a display (not headless)');
        console.log('   - On Linux/Mac: Install xvfb for virtual display (xvfb-run node script.js)');
        console.log('   - On Windows: Run from PowerShell/CMD directly, not through remote connection\n');
        throw e;
      }

      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1280, height: 720 });

      // Navigate to Grok
      console.log('🌐 Opening Grok.com...\n');
      try {
        await this.page.goto(this.baseUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
      } catch (e) {
        console.log(`⚠️  Navigation timeout: ${e.message}`);
      }

      // Auto-detect login with polling (no user input needed)
      console.log('📍 Waiting for login... (auto-detecting in 5-second intervals)\n');
      let isLoggedIn = false;
      let attempts = 0;
      const maxAttempts = 120; // 10 minutes (120 * 5 seconds)

      while (!isLoggedIn && attempts < maxAttempts) {
        attempts++;
        await this.page.waitForTimeout(5000); // Check every 5 seconds

        isLoggedIn = await this.checkLoginStatus();
        if (isLoggedIn) {
          console.log('✅ Login detected! Capturing session...\n');
          break;
        }

        if (attempts % 6 === 0) { // Log every 30 seconds
          console.log(`⏳ Still waiting for login... (${attempts * 5}s elapsed)`);
        }
      }

      if (!isLoggedIn) {
        console.log('⚠️  Login timeout after 10 minutes. Session capture cancelled.\n');
        return;
      }

      // Capture session data
      await this.captureSessionData();
      console.log('\n✅ Session capture completed!');

    } catch (error) {
      console.error('❌ Error during interactive capture:', error.message);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  /**
   * Check if user is logged in by looking for specific page elements
   */
  async checkLoginStatus() {
    try {
      // Check for user profile or logged-in indicators
      const isLoggedIn = await this.page.evaluate(() => {
        // Multiple checks for logged-in state
        const hasUserMenu = document.querySelector('[aria-label*="user"], [aria-label*="profile"], [data-testid*="user"]');
        const hasSignedInText = document.body.innerText.includes('Sign out');
        const hasLogoutButton = document.querySelector('button[aria-label*="logout"], button[aria-label*="sign out"]');
        
        return !!(hasUserMenu || hasSignedInText || hasLogoutButton);
      });

      if (isLoggedIn) {
        console.log('✅ User logged in detected\n');
      } else {
        console.log('⚠️  Could not confirm login status\n');
      }

      return isLoggedIn;
    } catch (error) {
      console.log(`⚠️  Login check failed: ${error.message}\n`);
      return false;
    }
  }

  /**
   * Capture all session data (cookies, localStorage, sessionStorage)
   */
  async captureSessionData() {
    console.log('📸 Capturing session data...\n');

    try {
      // 1. Capture cookies (from ALL domains, not just current page)
      console.log('  🍪 Capturing cookies...');
      const cookies = await this.page.browser().cookies();
      console.log(`     Found ${cookies.length} cookies from all domains`);

      // 2. Capture localStorage
      console.log('  💾 Capturing localStorage...');
      const localStorage = await this.page.evaluate(() => {
        const storage = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          storage[key] = window.localStorage.getItem(key);
        }
        return storage;
      });
      console.log(`     Found ${Object.keys(localStorage).length} items`);

      // 3. Capture sessionStorage
      console.log('  🔐 Capturing sessionStorage...');
      const sessionStorage = await this.page.evaluate(() => {
        const storage = {};
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          storage[key] = window.sessionStorage.getItem(key);
        }
        return storage;
      });
      console.log(`     Found ${Object.keys(sessionStorage).length} items`);

      // 4. Capture critical tokens for X/Twitter auth
      console.log('  🔑 Capturing authentication tokens...');
      const authData = await this.captureAuthTokens();
      console.log(`     Found ${Object.keys(authData).length} auth tokens`);

      // Save session
      const sessionData = {
        timestamp: new Date().toISOString(),
        expiresAt: this.calculateExpiration(),
        baseUrl: this.baseUrl,
        cookies,
        localStorage,
        sessionStorage,
        authTokens: authData,
        metadata: {
          captureMethod: 'manual-interactive',
          browserVersion: await this.page.browser().version(),
          userAgent: await this.page.evaluate(() => navigator.userAgent)
        }
      };

      // Create backup first
      if (fs.existsSync(SESSION_FILE)) {
        fs.copyFileSync(SESSION_FILE, BACKUP_FILE);
        console.log(`  📦 Backup created: ${path.basename(BACKUP_FILE)}`);
      }

      // Save session file
      fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
      console.log(`\n✅ Session saved to: ${SESSION_FILE}`);

      // Display summary
      this.displaySessionSummary(sessionData);

    } catch (error) {
      console.error('❌ Failed to capture session:', error.message);
      throw error;
    }
  }

  /**
   * Capture authentication and critical tokens
   */
  async captureAuthTokens() {
    try {
      return await this.page.evaluate(() => {
        const tokens = {};

        // Check for X/Twitter authentication
        if (window.__CSRF_TOKEN) {
          tokens.csrfToken = window.__CSRF_TOKEN;
        }

        // Check for auth headers in fetch/XHR
        const authHeader = document.querySelector('meta[name="authorization"]');
        if (authHeader) {
          tokens.authHeader = authHeader.getAttribute('content');
        }

        // Check for bearer token in window
        if (window.__AUTH_TOKEN) {
          tokens.bearerToken = window.__AUTH_TOKEN;
        }

        // Capture any JWT tokens in localStorage
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          const value = window.localStorage.getItem(key);
          
          // Look for JWT-like patterns or auth-related keys
          if (key.includes('token') || key.includes('auth') || key.includes('jwt')) {
            tokens[key] = value;
          }
        }

        return tokens;
      });
    } catch (error) {
      console.log(`  ⚠️  Could not capture auth tokens: ${error.message}`);
      return {};
    }
  }

  /**
   * Calculate session expiration time
   */
  calculateExpiration() {
    // Most sessions last 30 days, cf_clearance lasts ~30 days
    const expiresIn = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
    return new Date(Date.now() + expiresIn).toISOString();
  }

  /**
   * Display session summary
   */
  displaySessionSummary(sessionData) {
    console.log('\n' + '─'.repeat(80));
    console.log('📊 SESSION SUMMARY');
    console.log('─'.repeat(80));
    console.log(`  ✅ Captured: ${new Date(sessionData.timestamp).toLocaleString()}`);
    console.log(`  ⏰ Expires: ${new Date(sessionData.expiresAt).toLocaleString()}`);
    console.log(`  🍪 Cookies: ${sessionData.cookies.length}`);
    console.log(`  💾 LocalStorage: ${Object.keys(sessionData.localStorage).length}`);
    console.log(`  🔐 SessionStorage: ${Object.keys(sessionData.sessionStorage).length}`);
    console.log(`  🔑 Auth Tokens: ${Object.keys(sessionData.authTokens).length}`);

    // Show critical cookies
    const criticalCookies = ['cf_clearance', 'sso', 'sso-rw', '__cf_bm'];
    const found = sessionData.cookies.filter(c => criticalCookies.includes(c.name));
    if (found.length > 0) {
      console.log(`  ✓ Critical cookies found: ${found.map(c => c.name).join(', ')}`);
    }

    console.log('─'.repeat(80) + '\n');
  }

  /**
   * Load and display saved session info
   */
  displaySessionInfo() {
    if (!fs.existsSync(SESSION_FILE)) {
      console.log('❌ No saved session found');
      return;
    }

    try {
      const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
      const capturedTime = new Date(sessionData.timestamp);
      const expiresTime = new Date(sessionData.expiresAt);
      const now = new Date();
      const isExpired = now > expiresTime;
      const hoursLeft = Math.round((expiresTime - now) / (60 * 60 * 1000));

      console.log('\n' + '═'.repeat(80));
      console.log('📋 SAVED SESSION INFO');
      console.log('═'.repeat(80));
      console.log(`  📂 File: ${SESSION_FILE}`);
      console.log(`  📅 Captured: ${capturedTime.toLocaleString()}`);
      console.log(`  ⏰ Expires: ${expiresTime.toLocaleString()}`);
      console.log(`  ${isExpired ? '❌' : '✅'} Status: ${isExpired ? 'EXPIRED' : `Valid (${hoursLeft}h remaining)`}`);
      console.log(`\n  📊 Components:`);
      console.log(`     🍪 Cookies: ${sessionData.cookies?.length || 0}`);
      console.log(`     💾 LocalStorage: ${Object.keys(sessionData.localStorage || {}).length}`);
      console.log(`     🔐 SessionStorage: ${Object.keys(sessionData.sessionStorage || {}).length}`);
      console.log(`     🔑 Auth Tokens: ${Object.keys(sessionData.authTokens || {}).length}`);

      // List critical cookies
      const criticalCookies = ['cf_clearance', 'sso', 'sso-rw', '__cf_bm'];
      const found = (sessionData.cookies || []).filter(c => criticalCookies.includes(c.name));
      if (found.length > 0) {
        console.log(`\n  🔐 Critical Cookies:`);
        found.forEach(cookie => {
          const expiry = new Date(cookie.expires * 1000);
          const cookieValid = now < expiry ? '✅' : '❌';
          console.log(`     ${cookieValid} ${cookie.name} (expires ${expiry.toLocaleDateString()})`);
        });
      }

      console.log('═'.repeat(80) + '\n');

    } catch (error) {
      console.error('❌ Error reading session file:', error.message);
    }
  }

  /**
   * Delete saved session
   */
  deleteSession() {
    if (!fs.existsSync(SESSION_FILE)) {
      console.log('ℹ️  No session file to delete');
      return;
    }

    try {
      fs.unlinkSync(SESSION_FILE);
      console.log('✅ Session deleted: ' + SESSION_FILE);

      if (fs.existsSync(BACKUP_FILE)) {
        fs.unlinkSync(BACKUP_FILE);
        console.log('✅ Backup deleted: ' + BACKUP_FILE);
      }
    } catch (error) {
      console.error('❌ Error deleting session:', error.message);
    }
  }

  /**
   * Auto-refresh mode: Load session and check expiration
   */
  async autoRefreshMode() {
    console.log('\n' + '═'.repeat(80));
    console.log('🔄 GROK SESSION - AUTO REFRESH MODE');
    console.log('═'.repeat(80) + '\n');

    if (!fs.existsSync(SESSION_FILE)) {
      console.log('❌ No saved session found. Please run with --mode capture first\n');
      return;
    }

    try {
      const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
      const expiresTime = new Date(sessionData.expiresAt);
      const now = new Date();
      const hoursLeft = Math.round((expiresTime - now) / (60 * 60 * 1000));

      console.log(`📊 Session Status:`);
      console.log(`   Captured: ${new Date(sessionData.timestamp).toLocaleString()}`);
      console.log(`   Expires: ${expiresTime.toLocaleString()}`);
      console.log(`   Status: ${now < expiresTime ? `✅ Valid (${hoursLeft}h left)` : '❌ EXPIRED'}\n`);

      if (now > expiresTime) {
        console.log('⚠️  Session expired. Please re-capture with --mode capture\n');
        return;
      }

      // Optional: Refresh cf_clearance if close to expiration (within 3 days)
      if (hoursLeft < 72) {
        console.log('⚠️  Session expiring soon. Consider refreshing with --mode refresh\n');
      } else {
        console.log('✅ Session is still valid. No refresh needed.\n');
      }

    } catch (error) {
      console.error('❌ Error checking session:', error.message);
    }
  }

  /**
   * Force refresh: Re-capture session data
   */
  async refreshSession() {
    if (!fs.existsSync(SESSION_FILE)) {
      console.log('❌ No saved session to refresh. Run --mode capture first\n');
      return;
    }

    console.log('\n' + '═'.repeat(80));
    console.log('🔄 GROK SESSION - FORCED REFRESH');
    console.log('═'.repeat(80));
    console.log('\nRefreshing saved session by re-capturing from browser...\n');

    try {
      this.browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
      });

      this.page = await this.browser.newPage();
      
      // Load existing session cookies
      const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
      for (const cookie of sessionData.cookies || []) {
        try {
          await this.page.setCookie(cookie);
        } catch (e) {
          // Ignore invalid cookies
        }
      }

      // Navigate with session
      console.log('🌐 Navigating with existing session...');
      await this.page.goto(this.baseUrl, { waitUntil: 'domcontentloaded' });

      // Wait a bit for page to load
      await this.page.waitForTimeout(2000);

      // Check if still logged in
      const isLoggedIn = await this.checkLoginStatus();
      if (!isLoggedIn) {
        console.log('⚠️  Session appears invalid. Please re-capture with --mode capture\n');
      }

      // Capture fresh data
      await this.captureSessionData();

    } catch (error) {
      console.error('❌ Refresh failed:', error.message);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  /**
   * Wait for user input
   */
  waitForUserInput(prompt) {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question(prompt, () => {
        rl.close();
        resolve();
      });
    });
  }
}

// Export for importing as module
export { GrokSessionCapture };

// Main execution
async function main() {
  const mode = process.argv[process.argv.indexOf('--mode') + 1] || 'interactive';

  const capture = new GrokSessionCapture();

  switch (mode) {
    case 'capture':
      await capture.captureSessionInteractive();
      break;
    case 'auto':
      await capture.autoRefreshMode();
      break;
    case 'info':
      capture.displaySessionInfo();
      break;
    case 'delete':
      capture.deleteSession();
      break;
    case 'refresh':
      await capture.refreshSession();
      break;
    default:
      console.log('\n📖 GROK SESSION CAPTURE TOOL');
      console.log('═'.repeat(80));
      console.log('\nUsage:');
      console.log('  node scripts/grok-session-capture.js --mode <mode>');
      console.log('\nModes:');
      console.log('  capture   - Interactive: Open browser, login manually, capture session');
      console.log('  auto      - Auto: Load session, check expiration, refresh if needed');
      console.log('  info      - Display current saved session info');
      console.log('  delete    - Delete saved session');
      console.log('  refresh   - Force refresh session data');
      console.log('\nExample:');
      console.log('  node scripts/grok-session-capture.js --mode capture');
      console.log('═'.repeat(80) + '\n');
  }
}

// Only run main() if this is the entry point (being run directly),
// not if it's being imported as a module (from login.js)
const isEntryPoint = import.meta.url.replace('file://', '').replace(/^\/([A-Z]:)/, '$1') === process.argv[1] || 
                     process.argv[1]?.endsWith('capture-session.js');

if (isEntryPoint) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}
