#!/usr/bin/env node

/**
 * Session Refresh - Get Fresh Cookies + Tokens
 * 
 * When session cookies expire (NextAuth, GA, etc), use this to:
 * 1. Open Google Flow in browser
 * 2. Capture ALL fresh cookies
 * 3. Capture fresh reCAPTCHA tokens
 * 4. Save to session file with current timestamp
 * 5. Updates expires in 5 minutes for reCAPTCHA safety
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

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

    const sessionPath = path.join(__dirname, '../.sessions/google-flow-session-complete.json');

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

    // Get httpOnly cookies from Puppeteer (FILTER: only same-domain, avoid third-party cookies)
    const allCookies = await page.cookies();
    
    // Filter to only keep cookies from labs.google domain
    // This avoids third-party cookie issues from SameSite=None cookies
    const sameDomainCookies = allCookies.filter(cookie => {
      if (!cookie.domain) return true; // No domain = safe
      return cookie.domain === 'labs.google' || cookie.domain === '.labs.google';
    });
    
    console.log('📋 CAPTURED DATA:\n');
    console.log(`   • Cookies found: ${allCookies.length} total`);
    console.log(`   • Same-domain cookies: ${sameDomainCookies.length} (third-party excluded)`);
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
      cookies: sameDomainCookies,  // ✅ Use filtered same-domain cookies only
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
        authTokensPresent: sameDomainCookies.some(c => c.name.includes('auth')),  // ✅ Updated
        recaptchaTokensPresent: recaptchaCount === 3,
        capturedRequests: 0
      }
    };

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
