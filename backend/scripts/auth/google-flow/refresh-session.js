#!/usr/bin/env node

/**
 * Session Refresh - Get Fresh Cookies + Tokens
 * 
 * Applied ChatGPT Shared Profile Pattern for Google Flow:\n * - Uses a SHARED session file across all flows: google-flow-profiles/default/session.json
 * - Each flow gets its own Chrome user data directory (per-flow profile)
 * - Session data from this script is loaded by all flows automatically
 * - Cookies/localStorage are captured on close() and reused on next init()\n * When session cookies expire (NextAuth, GA, etc), use this to:
 * 1. Open Google Flow in browser
 * 2. Capture ALL fresh cookies
 * 3. Capture fresh reCAPTCHA tokens
 * 4. Save to SHARED session file for use by all flows
 * 5. Next GoogleFlowAutomationService.init() will auto-restore this session\n * BENEFITS:\n * ✅ No repeated logins when running multiple flows
 * ✅ Each flow has isolated Chrome profile (no conflicts)
 * ✅ All flows share latest auth data automatically
 * ✅ Cookies persist in Chrome profile + session file
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

// 🔐 Define shared profile paths (same as SessionManager)
// File location: backend/scripts/auth/google-flow/refresh-session.js
// Target: backend/data/google-flow-profiles/default/session.json
// Go up 3 levels from google-flow → backend, then into data/
const GOOGLE_FLOW_PROFILE_BASE = path.join(__dirname, '../../../data/google-flow-profiles');
const GOOGLE_FLOW_DEFAULT_SESSION = path.join(GOOGLE_FLOW_PROFILE_BASE, 'default', 'session.json');

async function refreshSession() {
  console.log('======================================================================');
  console.log('🔄 SESSION REFRESH - Get Fresh Cookies & Tokens');
  console.log('======================================================================\n');

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    const sessionPath = GOOGLE_FLOW_DEFAULT_SESSION;  // 💫 Use SHARED profile path

    console.log('📝 INSTRUCTIONS:\n');
    console.log('   The browser will open Google Flow.');
    console.log('   You may need to login if your session expired.\n');
    console.log('   Once authenticated, this script will automatically capture:\n');
    console.log('   ✅ All cookies (NextAuth, GA, etc)');
    console.log('   ✅ localStorage items');
    console.log('   ✅ reCAPTCHA tokens\n');
    console.log('   Then it will save everything to the session file.\n');

    console.log('🌐 Navigating to Google Flow...\n');
    await page.goto('https://labs.google/fx/vi/tools/flow', {
      waitUntil: 'networkidle2',
      timeout: 120000
    });

    console.log('✅ Page loaded\n');
    console.log('⏳ Waiting for authentication (30 seconds)...\n');
    console.log('   If you see a login page, please log in now.\n');

    // Wait for authentication
    await page.waitForTimeout(60000);

    // Verify we're authenticated
    const isAuthenticated = await page.evaluate(() => {
      // Check for indicators of authentication
      const hasMainContent = !!document.querySelector('[data-testid="virtuoso-item-list"]') ||
                            !!document.querySelector('[role="main"]');
      const hasLogoutButton = !!document.querySelector('button[aria-label*="Sign out"]') ||
                             !!document.querySelector('button[aria-label*="account"]');
      return hasMainContent || hasLogoutButton;
    });

    if (!isAuthenticated) {
      console.log('⚠️  You may not be fully logged in yet.');
      console.log('⏳ Waiting another 15 seconds...\n');
      await page.waitForTimeout(15000);
    }

    // Trigger reCAPTCHA token generation by interacting with the form
    console.log('🔄 Generating reCAPTCHA tokens...\n');
    console.log('   Clicking prompt box...');
    
    try {
      await page.waitForSelector('textarea, input[placeholder*="prompt" i], [contenteditable="true"]', { timeout: 5000 });
      
      // Click the prompt box
      const promptBox = await page.$('textarea, input[placeholder*="prompt" i], [contenteditable="true"]');
      if (promptBox) {
        await promptBox.click();
        await page.waitForTimeout(500);
        
        // Type something to trigger reCAPTCHA
        console.log('   Typing test prompt...');
        await page.keyboard.type('test flow session', { delay: 50 });
        await page.waitForTimeout(1000);
        
        // Clear the input
        console.log('   Clearing input...');
        await page.keyboard.press('Control');
        await page.keyboard.press('A');
        await page.keyboard.press('Delete');
        await page.waitForTimeout(500);
      }
    } catch (promptError) {
      console.log('   ℹ️  Could not interact with prompt (may not be needed for token generation)');
    }
    
    // Wait a bit for reCAPTCHA tokens to be generated
    console.log('   ⏳ Waiting for tokens to be generated...\n');
    await page.waitForTimeout(2000);

    console.log('📊 Capturing session data...\n');

    // Capture everything
    const sessionData = await page.evaluate(() => {
      // Get cookies from page (note: can only see non-httpOnly cookies from JS)
      const cookies = document.cookie
        .split(';')
        .map(c => c.trim())
        .filter(c => c)
        .map(c => {
          const [name, value] = c.split('=');
          return { name, value };
        });

      // Get localStorage
      const localStorage = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        localStorage[key] = window.localStorage.getItem(key);
      }

      // Get reCAPTCHA tokens
      const recaptchaTokens = {
        '_grecaptcha': window.localStorage.getItem('_grecaptcha'),
        'rc::a': window.localStorage.getItem('rc::a'),
        'rc::f': window.localStorage.getItem('rc::f')
      };

      return {
        cookies,
        localStorage,
        recaptchaTokens
      };
    });

    // Get httpOnly cookies from Puppeteer (KEEP ALL - like SessionManager does)
    const allCookies = await page.cookies();
    
    console.log('📋 CAPTURED DATA:\n');
    console.log(`   • Cookies found: ${allCookies.length} total`);
    console.log(`   • localStorage items: ${Object.keys(sessionData.localStorage).length}`);

    const recaptchaCount = Object.values(sessionData.recaptchaTokens).filter(v => v).length;
    console.log(`   • reCAPTCHA tokens: ${recaptchaCount}/3\n`);

    if (recaptchaCount < 3) {
      console.log('   ⚠️  IMPORTANT: Some reCAPTCHA tokens missing!');
      console.log('   💡 Tokens may be generated on-demand during form submission\n');
    }

    // Check if file exists to read old data
    let existingData = {
      auth: {},
      flowConfig: {},
      metadata: {},
      diagnostics: {}
    };

    if (fs.existsSync(sessionPath)) {
      try {
        existingData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
      } catch (e) {
        console.log('   ⚠️  Could not read existing session file\n');
      }
    }

    // Build new session file
    const newSession = {
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      url: 'https://labs.google/fx/vi/tools/flow',
      localStorage: sessionData.localStorage,
      sessionStorage: {}, // Can't capture from page.evaluate
      cookies: allCookies,  // ✅ Save ALL cookies (like SessionManager)
      tokens: {
        recaptcha: sessionData.recaptchaTokens,
        capturedAt: new Date().toISOString()
      },
      flowConfig: existingData.flowConfig || {},
      metadata: {
        currentUrl: 'https://labs.google/fx/vi/tools/flow',
        title: 'Flow - Affiliate AI',
        userAgent: await page.evaluate(() => navigator.userAgent),
        timezone: 'Asia/Saigon',
        language: 'en-US',
        cookieEnabled: true,
        onLine: true
      },
      auth: existingData.auth || {},
      diagnostics: {
        recaptchaAvailable: true,
        recaptchaConfigured: false,
        authTokensPresent: allCookies.some(c => c.name.includes('auth')),  // ✅ Updated
        recaptchaTokensPresent: recaptchaCount === 3,
        capturedRequests: 0
      }
    };

    // 💾 Ensure session directory exists before saving
    const sessionDir = path.dirname(sessionPath);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
      console.log(`📁 Created session directory: ${sessionDir}\n`);
    }

    // Save to file
    fs.writeFileSync(sessionPath, JSON.stringify(newSession, null, 2));

    console.log('✅ SUCCESS! Session file updated:\n');
    console.log(`   📁 ${sessionPath}\n`);
    console.log('📊 SESSION INFO:\n');
    console.log(`   • Timestamp: ${newSession.timestamp}`);
    console.log(`   • Expires: ${newSession.expiresAt}`);
    console.log(`   • Cookies: ${allCookies.length}`);
    console.log(`   • localStorage items: ${Object.keys(sessionData.localStorage).length}`);
    console.log(`   • reCAPTCHA tokens: ${recaptchaCount}/3\n`);

    console.log('🔄 USAGE:\n');
    console.log('   Service will use this session automatically on next init():\n');
    console.log('   ```javascript');
    console.log('   const service = new GoogleFlowAutomationService({...});');
    console.log('   await service.init(); // Uses fresh session');
    console.log('   ```\n');

    console.log('⏰ TOKEN VALIDITY:\n');
    console.log('   • Session cookies: 24 hours');
    console.log('   • reCAPTCHA tokens: 5 minutes (auto-refreshed on next init)\n');

    console.log('Press any key to close browser...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. You have internet connection');
    console.log('   2. Google Flow is accessible');
    console.log('   3. You can authenticate with your account\n');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

refreshSession().catch(console.error);
