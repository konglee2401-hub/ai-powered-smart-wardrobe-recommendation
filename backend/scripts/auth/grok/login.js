/**
 * Grok Auto-Login & Session Restoration Script
 * 
 * Purpose:
 *   - Load previously captured session data
 *   - Automatically inject cookies and localStorage
 *   - Bypass Cloudflare challenge with cf_clearance
 *   - Resume authenticated state without manual login
 * 
 * Session Components:
 *   1. cf_clearance: Cloudflare challenge bypass
 *      - Prevents "Access Denied" errors
 *      - Required for undetected browser access
 *      - Expires ~30 days
 * 
 *   2. sso / sso-rw: Session tokens
 *      - Maintains authentication state
 *      - Synced with Grok backend
 *      - Expires based on server config (usually 30 days)
 * 
 *   3. localStorage (critical items):
 *      - anonUserId: Identifies anonymous user
 *      - anonPrivateKey: Encryption key for anon requests
 *      - chat-preferences: UI preferences
 *      - age-verif: Age verification state
 * 
 * Usage:
 *   import { restoreGrokSession } from './scripts/grok-auto-login.js';
 *   
 *   const page = await browser.newPage();
 *   const restored = await restoreGrokSession(page);
 *   if (restored) {
 *     // Page now has authenticated session
 *   }
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = path.join(__dirname, '../.sessions/grok-session-complete.json');

/**
 * Restore Grok session from saved file
 * 
 * @param {Page} page - Puppeteer page object
 * @param {Object} options - Configuration options
 * @returns {Promise<boolean>} - True if session restored successfully
 * 
 * Pattern (CRITICAL ORDER):
 *   1. Navigate to page FIRST (initializes page)
 *   2. Set ESSENTIAL cookies only (cf_clearance, sso, sso-rw)
 *   3. Inject localStorage items
 *   4. RELOAD page (crucial to activate cookies)
 *   5. Verify session is active
 */
export async function restoreGrokSession(page, options = {}) {
  try {
    // 1. Load session file
    if (!fs.existsSync(SESSION_FILE)) {
      console.log('⚠️  No saved session found. Skipping auto-login.');
      return false;
    }

    let sessionData;
    try {
      sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    } catch (e) {
      console.log('⚠️  Invalid session file. Skipping auto-login.');
      return false;
    }

    // 2. Check session expiration
    const expiresAt = new Date(sessionData.expiresAt);
    if (new Date() > expiresAt) {
      console.log(`⚠️  Session expired (${expiresAt.toLocaleString()}). Manual login required.`);
      return false;
    }

    console.log('🔐 Restoring Grok session...');

    // 3. Set ESSENTIAL cookies (Critical: Only grok.com cookies)
    // These cookies are required for authentication and Cloudflare bypass
    const essentialCookieNames = [
      'cf_clearance',  // Cloudflare bypass
      '__cf_bm',       // Cloudflare bot management
      'sso',           // Session token
      'sso-rw',        // Read-write session token
      'x-userid',      // User ID cookie
    ];

    if (sessionData.cookies && Array.isArray(sessionData.cookies)) {
      console.log(`  🍪 Injecting ${sessionData.cookies.length} cookies...`);
      
      let injectedCount = 0;
      for (const cookie of sessionData.cookies) {
        try {
          // Inject both grok.com and x.ai domain cookies
          if (cookie.domain && (cookie.domain.includes('grok.com') || cookie.domain.includes('x.ai'))) {
            // Prepare cookie object with proper format
            const cookieObj = {
              name: cookie.name,
              value: cookie.value,
              domain: cookie.domain,
              path: cookie.path || '/',
              httpOnly: cookie.httpOnly || false,
              secure: cookie.secure !== false ? true : false
            };

            // Add expires if available
            if (cookie.expires && cookie.expires > 0) {
              cookieObj.expires = cookie.expires;
            }

            // Add sameSite if available
            if (cookie.sameSite) {
              cookieObj.sameSite = cookie.sameSite;
            }

            await page.setCookie(cookieObj);
            injectedCount++;

            // Log critical cookies
            if (essentialCookieNames.includes(cookie.name)) {
              console.log(`     ✓ ${cookie.name}`);
            }
          }
        } catch (e) {
          // Skip problematic cookies
          if (essentialCookieNames.includes(cookie.name)) {
            console.log(`     ⚠️  Failed to set ${cookie.name}: ${e.message}`);
          }
        }
      }
      console.log(`  ✅ ${injectedCount} cookies injected`);
    }

    // 4. Inject localStorage items
    if (sessionData.localStorage && typeof sessionData.localStorage === 'object') {
      console.log(`  💾 Injecting localStorage (${Object.keys(sessionData.localStorage).length} items)...`);

      // Critical keys to always restore
      const criticalKeys = ['anonUserId', 'anonPrivateKey', 'age-verif'];

      await page.evaluate((storage) => {
        for (const [key, value] of Object.entries(storage)) {
          try {
            window.localStorage.setItem(key, value);
          } catch (e) {
            // Storage quota might be exceeded, skip
          }
        }
      }, sessionData.localStorage);

      // Verify critical items
      const injected = await page.evaluate((keys) => {
        const result = {};
        for (const key of keys) {
          result[key] = window.localStorage.getItem(key) ? '✓' : '✗';
        }
        return result;
      }, criticalKeys);

      for (const [key, status] of Object.entries(injected)) {
        console.log(`     ${status === '✓' ? '✓' : '⚠️'} ${key}`);
      }
    }

    // 5. CRITICAL: Reload page to activate cookies and session
    console.log('  🔄 Reloading page to activate session...');
    try {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log('  ✅ Page reloaded');
    } catch (e) {
      console.log(`  ⚠️  Reload timeout: ${e.message}`);
      // Continue anyway, sometimes page loads despite timeout
    }

    // 6. Brief wait for page to stabilize
    await page.waitForTimeout(1500);

    // 7. Verify session is active
    const isLoggedIn = await verifyGrokLogin(page);
    if (!isLoggedIn) {
      console.log('  ⚠️  Could not verify login. Session may be invalid.');
      return false;
    }

    console.log('✅ Session restored successfully\n');
    return true;

  } catch (error) {
    console.log(`❌ Session restoration failed: ${error.message}\n`);
    return false;
  }
}

/**
 * Verify that Grok session is active
 * 
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<boolean>} - True if logged in
 */
export async function verifyGrokLogin(page) {
  try {
    const isLoggedIn = await page.evaluate(() => {
      // Multiple verification methods
      
      // Method 1: Check for user menu
      const userMenu = document.querySelector('[aria-label*="user"], [aria-label*="profile"], button[data-testid*="user-menu"]');
      if (userMenu) return true;

      // Method 2: Check for logout/sign-out button
      const logoutBtn = document.querySelector('button[aria-label*="sign out"], button[aria-label*="logout"]');
      if (logoutBtn) return true;

      // Method 3: Check page text for logged-in indicators
      const pageText = document.body.innerText;
      if (pageText.includes('Sign out') || pageText.includes('Logout')) return true;

      // Method 4: Check for authenticated markers in DOM
      const authMarker = document.querySelector('[data-authenticated="true"], .logged-in, .auth-indicator');
      if (authMarker) return true;

      // Method 5: Check localStorage for auth indicators
      return !!(
        window.localStorage.getItem('anonUserId') ||
        window.localStorage.getItem('sso') ||
        document.cookie.includes('sso=')
      );
    });

    return isLoggedIn;
  } catch (error) {
    return false;
  }
}

/**
 * Get session information
 * 
 * @returns {Object} - Session metadata
 */
export function getSessionInfo() {
  if (!fs.existsSync(SESSION_FILE)) {
    return { exists: false };
  }

  try {
    const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    const expiresAt = new Date(sessionData.expiresAt);
    const isValid = new Date() < expiresAt;

    return {
      exists: true,
      isValid,
      capturedAt: new Date(sessionData.timestamp),
      expiresAt,
      cookieCount: sessionData.cookies?.length || 0,
      localStorageCount: Object.keys(sessionData.localStorage || {}).length,
      hoursRemaining: Math.round((expiresAt - new Date()) / (60 * 60 * 1000))
    };
  } catch (error) {
    return { exists: true, error: error.message };
  }
}

/**
 * Integrate with GrokServiceV2
 * 
 * Usage in grokServiceV2.js:
 * 
 *   import { restoreGrokSession } from './scripts/grok-auto-login.js';
 *   
 *   async initialize() {
 *     await this.launch();
 *     
 *     // Restore saved session
 *     const sessionRestored = await restoreGrokSession(this.page);
 *     
 *     if (sessionRestored) {
 *       console.log('✅ Using saved session');
 *     } else {
 *       console.log('⚠️  Manual login may be required');
 *     }
 *     
 *     // Continue with rest of initialization...
 *   }
 * 
 * Integration pattern:
 *   1. At start of initialize(), call restoreGrokSession(this.page)
 *   2. If it returns true, session is restored, skip manual login
 *   3. If it returns false, handle manual login flow
 *   4. After successful session establishment, call sessionManager.saveSession(this.page)
 */

export default {
  restoreGrokSession,
  verifyGrokLogin,
  getSessionInfo
};

/**
 * CLI Entry Point
 * Allows script to be executed via: node login.js --capture --log-session <id>
 * Can use --playwright flag to use Playwright instead of Puppeteer
 */
async function main() {
  // Parse command-line arguments
  const args = new Map();
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i].replace(/^--/, '');
    const value = process.argv[i + 1] || true;
    args.set(key, value);
  }

  const logSession = args.get('log-session');
  const capture = args.has('capture');
  const refresh = args.has('refresh');
  const validate = args.has('validate');
  const usePlaywright = args.has('playwright');

  try {
    if (capture) {
      if (usePlaywright) {
        // Use Playwright version for better Cloudflare handling
        console.log('🎭 Using Playwright backend for Cloudflare bypass...');
        const { GrokSessionCapturePlaywright } = await import('./capture-session-playwright.js');
        const captureInstance = new GrokSessionCapturePlaywright();
        await captureInstance.captureSessionInteractive();
      } else {
        // Use Puppeteer version (original)
        const { GrokSessionCapture } = await import('./capture-session.js');
        const captureInstance = new GrokSessionCapture();
        await captureInstance.captureSessionInteractive();
      }
    } else if (refresh) {
      console.log('🔄 Refresh mode not yet implemented');
      process.exit(1);
    } else if (validate) {
      console.log('✅ Validate mode not yet implemented');
      process.exit(1);
    } else {
      console.log('ℹ️  No mode specified. Use --capture, --refresh, or --validate');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Check if this file is being run directly (not imported)
// import.meta.url is like "file:///path/to/login.js"
// process.argv[1] is like "/path/to/login.js"
const scriptPath = import.meta.url.replace('file://', '').replace(/^\/([A-Z]:)/, '$1');
if (scriptPath === process.argv[1] || process.argv[1]?.endsWith('login.js')) {
  main();
}
