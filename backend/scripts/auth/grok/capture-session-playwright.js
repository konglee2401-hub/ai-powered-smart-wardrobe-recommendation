/**
 * Grok Session Capture using Playwright
 * 
 * Playwright has better Cloudflare bypass support:
 * - Better stealth against bot detection
 * - More realistic browser behavior
 * - Better with Cloudflare challenges
 * 
 * Usage:
 *   node capture-session-playwright.js --mode capture
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = path.join(__dirname, '../../../.sessions/grok-session-complete.json');
const BACKUP_FILE = path.join(__dirname, '../../../.sessions/grok-session-backup.json');

class GrokSessionCapturePlaywright {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = 'https://grok.com';
  }

  async captureSessionInteractive() {
    console.log('\n' + '═'.repeat(80));
    console.log('🎭 GROK SESSION CAPTURE - PLAYWRIGHT MODE');
    console.log('═'.repeat(80));
    console.log('\n📋 Steps:');
    console.log('  1. Fresh Playwright browser will open');
    console.log('  2. Load saved cookies if available (to bypass Cloudflare)');
    console.log('  3. Navigate to Grok.com and handle Cloudflare challenge');
    console.log('  4. Login manually if needed');
    console.log('  5. Auto-detect and capture session\n');

    try {
      // Check if saved cookies exist
      const savedCookiesPath = path.join(path.dirname(SESSION_FILE), 'grok-cookies.json');
      let savedCookies = [];
      
      if (fs.existsSync(savedCookiesPath)) {
        try {
          const cookieData = fs.readFileSync(savedCookiesPath, 'utf8');
          savedCookies = JSON.parse(cookieData);
          console.log(`✅ Loaded ${savedCookies.length} saved cookies from: ${savedCookiesPath}\n`);
        } catch (e) {
          console.log(`⚠️  Could not parse saved cookies: ${e.message}\n`);
        }
      } else {
        console.log('ℹ️  No saved cookies found. Will require manual Cloudflare bypass.\n');
        console.log('💡 To skip Cloudflare challenges:');
        console.log(`   1. Export cookies from Chrome DevTools`);
        console.log(`   2. Save to: ${savedCookiesPath}\n`);
      }

      // Launch browser with timeout
      console.log('🚀 Launching Playwright Chromium...');
      
      const launchPromise = chromium.launch({
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-blink-features=AutomationControlled',
          '--disable-popup-blocking',
          '--disable-web-resources',
        ]
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
        console.log('   - Make sure you have display (not headless environment)');
        console.log('   - Check if Playwright Chromium is installed\n');
        throw e;
      }

      // Create context and page
      const context = await this.browser.createBrowserContext({
        viewport: { width: 1280, height: 720 }
      });

      this.page = await context.newPage();

      // Pre-load saved cookies BEFORE navigating
      if (savedCookies.length > 0) {
        console.log('🍪 Injecting saved cookies...');
        try {
          // Convert cookies to Playwright format if needed
          const playwrightCookies = savedCookies.map(c => ({
            name: c.name || c.key,
            value: c.value,
            domain: c.domain || 'grok.com',
            path: c.path || '/',
            httpOnly: c.httpOnly,
            secure: c.secure,
            sameSite: c.sameSite || 'Lax',
            expires: c.expires || undefined
          }));
          
          await context.addCookies(playwrightCookies);
          console.log(`✅ Injected ${playwrightCookies.length} cookies\n`);
        } catch (e) {
          console.log(`⚠️  Could not inject cookies: ${e.message}\n`);
        }
      }

      // Set up request/response monitoring
      this.page.on('response', response => {
        if (response.status() === 403 && response.url().includes('grok.com')) {
          console.log('⚠️  Cloudflare 403 response - may need fresh cookies...');
        }
      });

      // Navigate to Grok
      console.log('🌐 Opening Grok.com...');
      try {
        // Set longer timeout for Cloudflare challenge
        await this.page.goto(this.baseUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: 60000  // 60 seconds for Cloudflare
        });
        console.log('✅ Grok.com loaded\n');
      } catch (e) {
        console.log(`⚠️  Navigation took longer than expected (timeout): ${e.message}`);
        console.log('   This is normal if Cloudflare is processing...\n');
        
        // Try to wait a bit more for Cloudflare to complete
        try {
          await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
          console.log('✅ Page stabilized\n');
        } catch (e2) {
          console.log('⏳ Still waiting for Cloudflare...\n');
        }
      }

      // Auto-detect login
      console.log('📍 Waiting for login... (auto-detecting every 5 seconds)\n');
      let isLoggedIn = false;
      let attempts = 0;
      const maxAttempts = 120; // 10 minutes

      while (!isLoggedIn && attempts < maxAttempts) {
        attempts++;
        await this.page.waitForTimeout(5000);

        try {
          isLoggedIn = await this.checkLoginStatus();
          if (isLoggedIn) {
            console.log('✅ Login detected! Capturing session...\n');
            break;
          }
        } catch (e) {
          // Silent fail, continue checking
        }

        if (attempts % 6 === 0) {
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
      if (error.stack) console.error(error.stack);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  /**
   * Check if user is logged in
   */
  async checkLoginStatus() {
    try {
      const isLoggedIn = await this.page.evaluate(() => {
        // Check for user profile elements
        const hasUserMenu = !!document.querySelector('[aria-label*="user"], [aria-label*="profile"], button[data-testid*="user"]');
        const hasSignOut = document.body.innerText.includes('Sign out');
        const hasLogout = !!document.querySelector('button[aria-label*="logout"], button[aria-label*="sign out"]');
        
        return !!(hasUserMenu || hasSignOut || hasLogout);
      });

      return isLoggedIn;
    } catch (error) {
      return false;
    }
  }

  /**
   * Capture session data (cookies, localStorage, etc.)
   */
  async captureSessionData() {
    try {
      console.log('  📸 Capturing session data...');

      // Get cookies
      console.log('  🍪 Capturing cookies...');
      const cookies = await this.page.context().cookies();
      console.log(`     ✓ ${cookies.length} cookies captured`);

      // Get localStorage
      console.log('  💾 Capturing localStorage...');
      const localStorage = await this.page.evaluate(() => {
        const storage = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          storage[key] = window.localStorage.getItem(key);
        }
        return storage;
      });
      console.log(`     ✓ ${Object.keys(localStorage).length} items captured`);

      // Create session file
      const sessionData = {
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        baseURL: this.baseUrl,
        cookies: cookies,
        localStorage: localStorage,
        captureMethod: 'playwright'
      };

      // Create sessions directory if needed
      const sessionsDir = path.dirname(SESSION_FILE);
      if (!fs.existsSync(sessionsDir)) {
        fs.mkdirSync(sessionsDir, { recursive: true });
      }

      // Backup existing session
      if (fs.existsSync(SESSION_FILE)) {
        fs.copyFileSync(SESSION_FILE, BACKUP_FILE);
        console.log('  📦 Previous session backed up');
      }

      // Save new session
      fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
      console.log(`  ✅ Session saved to: ${SESSION_FILE}`);

      // Display summary
      console.log('\n📊 Session Summary:');
      console.log(`  Cookies: ${cookies.length}`);
      console.log(`  localStorage: ${Object.keys(localStorage).length} items`);
      
      // Show critical cookies
      const criticalCookies = cookies.filter(c => 
        ['cf_clearance', '__cf_bm', 'sso', 'sso-rw'].includes(c.name)
      );
      if (criticalCookies.length > 0) {
        console.log(`  🔑 Critical cookies: ${criticalCookies.map(c => c.name).join(', ')}`);
      }

    } catch (error) {
      console.error('  ❌ Error capturing session:', error.message);
      throw error;
    }
  }

  /**
   * Display session info
   */
  displaySessionInfo() {
    if (!fs.existsSync(SESSION_FILE)) {
      console.log('❌ No saved session found');
      return;
    }

    const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    const expiresAt = new Date(sessionData.expiresAt);
    const isValid = new Date() < expiresAt;

    console.log('\n📊 Session Information:');
    console.log(`  ✓ Captured: ${new Date(sessionData.timestamp).toLocaleString()}`);
    console.log(`  ${isValid ? '✓' : '❌'} Expires: ${expiresAt.toLocaleString()}`);
    console.log(`  🍪 Cookies: ${sessionData.cookies?.length || 0}`);
    console.log(`  💾 localStorage: ${Object.keys(sessionData.localStorage || {}).length}`);
  }

  /**
   * Delete session
   */
  deleteSession() {
    if (fs.existsSync(SESSION_FILE)) {
      fs.unlinkSync(SESSION_FILE);
      console.log('✓ Session deleted');
    }
  }
}

// Only run main if this is the entry point
const isEntryPoint = import.meta.url.replace('file://', '').replace(/^\/([A-Z]:)/, '$1') === process.argv[1] || 
                     process.argv[1]?.endsWith('capture-session-playwright.js');

if (isEntryPoint) {
  const mode = process.argv[process.argv.indexOf('--mode') + 1] || 'capture';
  const capture = new GrokSessionCapturePlaywright();

  switch (mode) {
    case 'capture':
      await capture.captureSessionInteractive();
      break;
    case 'info':
      capture.displaySessionInfo();
      break;
    case 'delete':
      capture.deleteSession();
      break;
    default:
      console.log('Usage: node capture-session-playwright.js --mode <capture|info|delete>');
  }
}

export { GrokSessionCapturePlaywright };
