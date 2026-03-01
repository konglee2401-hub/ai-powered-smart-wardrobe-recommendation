/**
 * Grok Auto-Login - IMPROVED Cloudflare Bypass
 * 
 * CRITICAL TIMING FIX:
 * OLD (WRONG):
 *   1. Inject cookies first
 *   2. Navigate (Cloudflare blocks because cf_clearance may be invalid)
 * 
 * NEW (CORRECT):
 *   1. Navigate FIRST (let Cloudflare verify)
 *   2. Inject additional cookies
 *   3. Reload page
 * 
 * This is the CORRECT sequence for Cloudflare bypass
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = path.join(__dirname, '../.sessions/grok-session-complete.json');

/**
 * Detect if page is blocked by Cloudflare
 * Checks for multiple indicators:
 * 1. Cloudflare challenge container
 * 2. Verification iframe
 * 3. Challenge text content
 * 4. Cloudflare-specific DOM markers
 */
async function isCloudflareBlocked(page) {
  try {
    const blockInformation = await page.evaluate(() => {
      // Check for Cloudflare challenge elements
      const cfChallenge = document.querySelector('[id*="challenge"]') || 
                         document.querySelector('[class*="challenge"]') ||
                         document.querySelector('[class*="cloudflare"]') ||
                         document.getElementById('challenge-form') ||
                         document.querySelector('iframe[src*="challenges"]');
      
      // Check for verification checkbox (the interactive challenge)
      const verificationCheckbox = document.querySelector('input[type="checkbox"]') ||
                                  document.querySelector('[role="checkbox"]');
      
      // Check page content
      const bodyText = document.body.innerText.toLowerCase();
      const hasChallenge = bodyText.includes('challenge') || 
                          bodyText.includes('verify') ||
                          bodyText.includes('cloudflare') ||
                          bodyText.includes('checking');
      
      // Check for hidden challenge iframes that may be loading the challenge
      const iframes = document.querySelectorAll('iframe');
      let challengeIframe = false;
      for (const iframe of iframes) {
        const src = iframe.getAttribute('src') || '';
        if (src.includes('challenges') || src.includes('challenge-platform') || iframe.className.includes('challenge')) {
          challengeIframe = true;
          break;
        }
      }
      
      return {
        hasCfDiv: !!cfChallenge,
        hasCheckbox: !!verificationCheckbox,
        hasText: hasChallenge,
        hasIframe: challengeIframe,
        documentReady: document.readyState,
        url: window.location.href
      };
    });
    
    // Blocked if ANY of these are true
    return blockInformation.hasCfDiv || 
           blockInformation.hasCheckbox || 
           blockInformation.hasText ||
           blockInformation.hasIframe;
  } catch (err) {
    return false;
  }
}

/**
 * Wait for Cloudflare challenge to complete
 * Detects both automatic and interactive (checkbox) challenges
 * Waits for the challenge elements to actually disappear from DOM
 */
async function waitForCloudflareBypass(page, timeout = 90000) {
  const startTime = Date.now();
  let noElementCounter = 0;
  const noElementThreshold = 8; // Must confirm no elements for 8 consecutive checks (16 seconds)
  
  console.log('   ⏳ Waiting for Cloudflare challenge to complete...');
  console.log('   ⏳ (May require manual verification if checkpoint appears)');
  
  while (Date.now() - startTime < timeout) {
    try {
      const pageInfo = await page.evaluate(() => {
        // Check for all Cloudflare challenge indicators
        const hasChallengeDiv = !!(document.querySelector('[id*="challenge"]') || 
                                   document.querySelector('[class*="challenge"]') ||
                                   document.querySelector('[class*="cloudflare"]'));
        
        const hasCheckbox = !!document.querySelector('input[type="checkbox"]');
        const hasIframe = !!document.querySelector('iframe[src*="challenges"]');
        
        // Also check if we've transitioned away from challenge page
        const pageContent = document.body.innerText.toLowerCase();
        const isChallengePage = pageContent.includes('challenge') || 
                               pageContent.includes('press and hold') ||
                               pageContent.includes('verify');
        
        return {
          hasChallengeDiv,
          hasCheckbox,
          hasIframe,
          isChallengePage,
          title: document.title,
          readyState: document.readyState,
          timestamp: Date.now()
        };
      });
      
      // Check if challenge elements are gone
      const stillBlocked = pageInfo.hasChallengeDiv || 
                          pageInfo.hasCheckbox || 
                          pageInfo.hasIframe ||
                          pageInfo.isChallengePage;
      
      if (!stillBlocked) {
        noElementCounter++;
        
        // Require consistent absence of challenge elements
        if (noElementCounter >= noElementThreshold) {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          console.log(`   ✅ Cloudflare challenge COMPLETE (${elapsed}s elapsed)`);
          return true;
        }
      } else {
        noElementCounter = 0; // Reset counter if challenge elements reappear
        
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        console.log(`   ⏳ Challenge still present (${elapsed}s) - ${
          pageInfo.hasCheckbox ? '🔲 checkbox' : ''
        } ${pageInfo.hasChallengeDiv ? '📦 div' : ''}`);
      }
      
      await page.waitForTimeout(2000);
    } catch (err) {
      console.log(`   ⚠️  Error checking: ${err.message}`);
      await page.waitForTimeout(2000);
    }
  }
  
  console.log(`   ⚠️  Cloudflare timeout (${Math.round(timeout / 1000)}s) - may need manual verification`);
  return false;
}

/**
 * Restore Grok session with CORRECT timing
 * 
 * @param {Page} page - Puppeteer page object
 * @param {Object} options - Configuration options
 *   - options.url: URL to navigate to (default: https://grok.com)
 * @returns {Promise<boolean>} - True if session restored successfully
 */
export async function restoreGrokSession(page, options = {}) {
  const navigationUrl = options.url || 'https://grok.com';
  
  try {
    // Check if session file exists
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

    // Check expiration
    const expiresAt = new Date(sessionData.expiresAt);
    if (new Date() > expiresAt) {
      console.log(`⚠️  Session expired (${expiresAt.toLocaleString()}). Manual login required.`);
      return false;
    }

    console.log('🔐 Restoring Grok session (Cloudflare-safe method)...\n');

    // ============================================
    // CRITICAL: CORRECT TIMING FOR CLOUDFLARE
    // ============================================

    // STEP 1: Navigate FIRST (without cookies) to let Cloudflare verify
    console.log('  📋 Step 1: Navigate to page (let Cloudflare verify)');
    try {
      await page.goto(navigationUrl, {
        waitUntil: 'networkidle2',
        timeout: 20000
      });
    } catch (e) {
      console.log(`     ⚠️  Navigation timeout (normal with Cloudflare)`);
    }

    // STEP 2: Inject cookies EXCEPT cf_clearance (do timing fix)
    console.log('  📋 Step 2: Inject cookies (EXCEPT cf_clearance - timing fix)');
    let cfClearanceCookie = null;
    
    if (sessionData.cookies && Array.isArray(sessionData.cookies)) {
      let injectedCount = 0;
      const domainBreakdown = {};

      for (const cookie of sessionData.cookies) {
        try {
          // SPECIAL: Save cf_clearance for later
          if (cookie.name === 'cf_clearance') {
            cfClearanceCookie = cookie;
            console.log(`     ⏳ cf_clearance SAVED FOR LATER (after Cloudflare detection)`);
            continue;
          }

          // Both .grok.com and .x.ai domains
          if (cookie.domain && (cookie.domain.includes('grok.com') || cookie.domain.includes('x.ai'))) {
            const cookieObj = {
              name: cookie.name,
              value: cookie.value,
              domain: cookie.domain,
              path: cookie.path || '/',
              httpOnly: cookie.httpOnly || false,
              secure: cookie.secure !== false ? true : false
            };

            if (cookie.expires && cookie.expires > 0) {
              cookieObj.expires = cookie.expires;
            }

            if (cookie.sameSite) {
              cookieObj.sameSite = cookie.sameSite;
            }

            await page.setCookie(cookieObj);
            injectedCount++;

            // Track by domain
            if (!domainBreakdown[cookie.domain]) {
              domainBreakdown[cookie.domain] = [];
            }
            domainBreakdown[cookie.domain].push(cookie.name);
          }
        } catch (e) {
          // Skip problematic cookies
          if (['sso', 'sso-rw', '__cf_bm'].includes(cookie.name)) {
            console.log(`     ⚠️  Failed to set ${cookie.name}`);
          }
        }
      }

      for (const [domain, names] of Object.entries(domainBreakdown)) {
        console.log(`     ✅ ${domain}: ${names.length} cookies (cf_clearance pending)`);
      }
    }

    // STEP 3: Detect Cloudflare challenge
    console.log('  📋 Step 3: Detect Cloudflare challenge');
    const isBlocked = await isCloudflareBlocked(page);
    if (isBlocked) {
      console.log('     ⚠️  Cloudflare CHALLENGE DETECTED');
      console.log('     🔄 Waiting for challenge to complete (up to 60 seconds)...');
      
      // Wait for Cloudflare bypass to complete
      // This includes waiting for user interaction with checkbox if needed
      const bypassCompleted = await waitForCloudflareBypass(page, 60000);
      
      if (!bypassCompleted) {
        console.log('     ⚠️  Timeout waiting for Cloudflare - cf_clearance may be invalid');
        console.log('     💡 If stuck on checkpoint: User may need to verify manually in browser');
      }
      
      // Inject cf_clearance NOW that we'll try to proceed
      if (cfClearanceCookie) {
        try {
          const cfCookie = {
            name: cfClearanceCookie.name,
            value: cfClearanceCookie.value,
            domain: cfClearanceCookie.domain,
            path: cfClearanceCookie.path || '/',
            httpOnly: cfClearanceCookie.httpOnly || false,
            secure: cfClearanceCookie.secure !== false ? true : false
          };

          if (cfClearanceCookie.expires && cfClearanceCookie.expires > 0) {
            cfCookie.expires = cfClearanceCookie.expires;
          }

          if (cfClearanceCookie.sameSite) {
            cfCookie.sameSite = cfClearanceCookie.sameSite;
          }

          await page.setCookie(cfCookie);
          console.log('     ✅ cf_clearance INJECTED (if available)');
        } catch (e) {
          console.log(`     ⚠️  Failed to inject cf_clearance: ${e.message}`);
        }
      }
    } else {
      console.log('     ✅ NO Cloudflare challenge detected - proceeding normally');
    }

    // STEP 4: Inject localStorage
    console.log('  📋 Step 4: Inject localStorage');
    if (sessionData.localStorage && typeof sessionData.localStorage === 'object') {
      await page.evaluate((storage) => {
        for (const [key, value] of Object.entries(storage)) {
          try {
            window.localStorage.setItem(key, value);
          } catch (e) {
            // Storage quota might be exceeded
          }
        }
      }, sessionData.localStorage);

      const criticalKeys = ['anonUserId', 'anonPrivateKey', 'age-verif'];
      const verified = await page.evaluate((keys) => {
        const result = {};
        for (const key of keys) {
          result[key] = window.localStorage.getItem(key) ? '✓' : '✗';
        }
        return result;
      }, criticalKeys);

      for (const [key, status] of Object.entries(verified)) {
        if (status === '✓') {
          console.log(`     ✓ ${key}`);
        } else {
          console.log(`     ⚠️  ${key} - NOT SET`);
        }
      }
    }

    // STEP 5: RELOAD page to activate session with cf_clearance
    console.log('  📋 Step 5: Reload page to activate all cookies');
    try {
      await page.reload({ waitUntil: 'networkidle2', timeout: 15000 });
      console.log('     ✅ Page reloaded successfully');
    } catch (e) {
      console.log(`     ⚠️  Reload timeout: ${e.message}`);
    }

    // STEP 6: Final verification
    console.log('  📋 Step 6: Verify session activated');
    const finalBlocked = await isCloudflareBlocked(page);
    
    if (!finalBlocked) {
      console.log('     ✅ Session ACTIVE - Cloudflare BYPASSED');
    } else {
      console.log('     ⚠️  Still showing Cloudflare challenge - manual verification may be needed');
    }

    // Wait for page to stabilize
    await page.waitForTimeout(2000);

    // STEP 7: Verify login
    console.log('  📋 Step 7: Verify login');
    const isLoggedIn = await verifyGrokLogin(page);
    if (isLoggedIn) {
      console.log('     ✅ Login verified\n');
    } else {
      console.log('     ⚠️  Could not verify login\n');
    }

    // STEP 8: Update cf_clearance token if it changed after manual verification
    console.log('  📋 Step 8: Checking for updated Cloudflare token...');
    try {
      const currentCookies = await page.cookies();
      const newCfClearance = currentCookies.find(c => c.name === 'cf_clearance');
      
      if (newCfClearance) {
        const oldCfClearance = sessionData.cookies.find(c => c.name === 'cf_clearance');
        
        if (oldCfClearance && oldCfClearance.value !== newCfClearance.value) {
          console.log('     🔄 cf_clearance token CHANGED after manual verification');
          console.log(`        Old: ${oldCfClearance.value.substring(0, 20)}...`);
          console.log(`        New: ${newCfClearance.value.substring(0, 20)}...`);
          
          // Update the token in sessionData
          oldCfClearance.value = newCfClearance.value;
          if (newCfClearance.expires) {
            oldCfClearance.expires = newCfClearance.expires;
          }
          
          // Write updated session to file
          try {
            fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2), 'utf8');
            console.log('     ✅ Session file UPDATED with new cf_clearance token');
            console.log('     💡 Next run will use the updated token (likely to pass automatically)');
          } catch (writeError) {
            console.log(`     ⚠️  Could not update session file: ${writeError.message}`);
          }
        } else if (oldCfClearance) {
          console.log('     ✅ cf_clearance token unchanged (fresh token confirmed)');
        } else {
          console.log('     ℹ️  No previous cf_clearance token to compare');
        }
      } else {
        console.log('     ⚠️  No cf_clearance token found in current cookies');
      }
    } catch (tokenError) {
      console.log(`     ⚠️  Could not check token update: ${tokenError.message}`);
    }

    console.log('✅ Session restoration complete\n');
    return true;

  } catch (error) {
    console.log(`❌ Session restoration failed: ${error.message}\n`);
    return false;
  }
}

/**
 * Verify that Grok session is active
 */
export async function verifyGrokLogin(page) {
  try {
    const isLoggedIn = await page.evaluate(() => {
      // Check for user menu
      const userMenu = document.querySelector('[aria-label*="user"], [aria-label*="profile"], button[data-testid*="user-menu"]');
      if (userMenu) return true;

      // Check for logout button
      const logoutBtn = document.querySelector('button[aria-label*="sign out"], button[aria-label*="logout"]');
      if (logoutBtn) return true;

      // Check page text
      const pageText = document.body.innerText;
      if (pageText.includes('Sign out') || pageText.includes('Logout')) return true;

      // Check auth indicators
      const authMarker = document.querySelector('[data-authenticated="true"], .logged-in, .auth-indicator');
      if (authMarker) return true;

      // Check localStorage
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
 * Get session info
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

export default {
  restoreGrokSession,
  verifyGrokLogin,
  getSessionInfo
};
