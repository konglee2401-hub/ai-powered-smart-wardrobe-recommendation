#!/usr/bin/env node

/**
 * Advanced Google Flow Session Capture - Deep Analysis
 * 
 * Purpose:
 * - Capture ALL localStorage, sessionStorage, cookies
 * - Find reCAPTCHA tokens and callbacks
 * - Find CSRF tokens and session tokens
 * - Find API headers needed for requests
 * - Save comprehensive session data
 * 
 * This script will help bypass reCAPTCHA 403 errors when automating
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

class DeepSessionCapture {
  constructor() {
    this.browser = null;
    this.page = null;
    this.sessionFilePath = path.join(__dirname, '../.sessions/google-flow-session-complete.json');
    this.capturedRequests = [];
    this.capturedHeaders = {};
  }

  async init() {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 ADVANCED GOOGLE FLOW SESSION CAPTURE');
    console.log('='.repeat(70) + '\n');
    
    const sessionsDir = path.dirname(this.sessionFilePath);
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true });
    }

    this.browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 800 });
    
    // Capture network requests without interception (just logging)
    await this.page.on('request', (req) => {
      if (req.url().includes('googleapis.com') || req.url().includes('labs.google')) {
        const headers = req.headers();
        this.capturedRequests.push({
          method: req.method(),
          url: req.url(),
          headers: headers
        });
        
        // Store important headers
        if (headers['authorization']) {
          this.capturedHeaders['authorization'] = headers['authorization'];
        }
        if (headers['x-goog-request-params']) {
          this.capturedHeaders['x-goog-request-params'] = headers['x-goog-request-params'];
        }
      }
    });

    console.log('✅ Browser initialized\n');
  }

  async navigateToFlow() {
    const flowUrl = 'https://labs.google/fx/vi/tools/flow';
    console.log(`🔗 Navigating to: ${flowUrl}\n`);
    
    try {
      await this.page.goto(flowUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      console.log('✅ Page loaded\n');
    } catch (error) {
      console.error(`❌ Failed to load: ${error.message}\n`);
      throw error;
    }
  }

  async waitForAuth() {
    console.log('⏳ Waiting for authentication (5 minutes max)...');
    console.log('   Please login if prompted.\n');
    
    const maxWaitTime = 5 * 60 * 1000;
    const startTime = Date.now();

    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        try {
          const isAuth = await this.page.evaluate(() => {
            const email = window.localStorage.getItem('EMAIL');
            const flowState = window.localStorage.getItem('FLOW_MAIN_PROMPT_BOX_STATE');
            return !!(email || flowState);
          });

          if (isAuth) {
            console.log('✅ Authentication detected\n');
            clearInterval(checkInterval);
            resolve();
            return;
          }

          if (Date.now() - startTime > maxWaitTime) {
            console.log('⏱️  Timeout - proceeding anyway\n');
            clearInterval(checkInterval);
            resolve();
          }
        } catch (e) {}
      }, 2000);
    });
  }

  async triggerReCaptcha() {
    console.log('🤖 TRIGGERING RECAPTCHA TOKEN GENERATION\n');

    try {
      console.log('   1️⃣  Finding prompt textbox...');
      const textbox = await this.page.$('[role="textbox"][data-slate-editor="true"]');
      
      if (!textbox) {
        console.log('      ⚠️  Textbox not found, skipping interaction\n');
        return;
      }
      console.log('      ✓ Textbox found');

      console.log('   2️⃣  Clicking textbox to trigger reCAPTCHA...');
      await this.page.evaluate(() => {
        const box = document.querySelector('[role="textbox"][data-slate-editor="true"]');
        if (box) {
          box.click();
          box.focus();
        }
      });
      await this.page.waitForTimeout(500);
      console.log('      ✓ Clicked');

      console.log('   3️⃣  Typing sample text to trigger validation...');
      await this.page.keyboard.type('test', { delay: 50 });
      console.log('      ✓ Text entered');

      console.log('   4️⃣  Waiting for reCAPTCHA to generate token (5 seconds)...');
      await this.page.waitForTimeout(5000);
      console.log('      ✓ Complete');

      // Check if token was generated
      const hasToken = await this.page.evaluate(() => {
        return !!window.localStorage.getItem('_grecaptcha');
      });

      if (hasToken) {
        console.log('      ✅ reCAPTCHA token GENERATED!\n');
      } else {
        console.log('      ⚠️  Token still not found\n');
      }

      console.log('   5️⃣  Clearing test text...');
      await this.page.evaluate(() => {
        const textbox = document.querySelector('[role="textbox"][data-slate-editor="true"]');
        if (textbox) textbox.textContent = '';
      });
      console.log('      ✓ Cleared\n');

    } catch (error) {
      console.error(`   ❌ Error during interaction: ${error.message}\n`);
    }
  }

  async captureDeep() {
    console.log('📋 CAPTURING DEEP SESSION DATA\n');

    try {
      const deepData = await this.page.evaluate(() => {
        // ============ LOCALSTORAGE ============
        const localStorage = {};
        const localStorageKeys = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          localStorageKeys.push(key);
          const value = window.localStorage.getItem(key);
          localStorage[key] = value;
        }

        // ============ SESSIONSTORAGE ============
        const sessionStorage = {};
        const sessionStorageKeys = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          sessionStorageKeys.push(key);
          const value = window.sessionStorage.getItem(key);
          sessionStorage[key] = value;
        }

        // ============ RECAPTCHA DETECTION ============
        const recaptchaData = {
          hasGreCaptcha: typeof window.grecaptcha !== 'undefined',
          hasGrecaptchaCallback: typeof window.__grecaptcha_cfg !== 'undefined',
          recaptchaScripts: Array.from(document.scripts)
            .filter(s => s.src.includes('recaptcha'))
            .map(s => ({ src: s.src, async: s.async, defer: s.defer })),
          recaptchaLocals: {}
        };

        // Try to find reCAPTCHA tokens
        const grecaptchaToken = window.localStorage.getItem('_grecaptcha');
        const rcA = window.localStorage.getItem('rc::a');
        const rcF = window.localStorage.getItem('rc::f');
        
        if (grecaptchaToken) recaptchaData.recaptchaLocals['_grecaptcha'] = grecaptchaToken;
        if (rcA) recaptchaData.recaptchaLocals['rc::a'] = rcA;
        if (rcF) recaptchaData.recaptchaLocals['rc::f'] = rcF;

        // ============ CSRF & NEXTAUTH ============
        const authData = {
          tokens: {},
          sessions: {}
        };

        // Look for auth-related items
        const authKeys = ['__Host-next-auth.csrf-token', '__Secure-next-auth.session-token', 'nextauth.message'];
        authKeys.forEach(key => {
          const value = window.localStorage.getItem(key) || window.sessionStorage.getItem(key);
          if (value) {
            authData.tokens[key] = value;
          }
        });

        // ============ FLOW SETTINGS ============
        const flowSettings = {
          mainPromptBoxState: window.localStorage.getItem('FLOW_MAIN_PROMPT_BOX_STATE'),
          tileGridSize: window.localStorage.getItem('FLOW_TILE_GRID_SIZE'),
          mostRecentImageModel: window.localStorage.getItem('MOST_RECENT_PINHOLE_IMAGE_MODEL_USED'),
          videoSettings: window.localStorage.getItem('PINHOLE_VIDEO_GENERATION_SETTINGS'),
          assetViewMediaType: window.localStorage.getItem('PINHOLE_ASSET_VIEW_MEDIA_TYPE')
        };

        // ============ GOOGLE AUTH COOKIES ============
        const googleAuthIndicators = {
          hasSID: !!window.localStorage.getItem('SID') || !!window.sessionStorage.getItem('SID'),
          hasGoogleSignin: !!document.querySelector('[data-signin]'),
          userEmail: window.localStorage.getItem('EMAIL')
        };

        // ============ DOCUMENT METADATA ============
        const metadata = {
          currentUrl: window.location.href,
          title: document.title,
          userAgent: navigator.userAgent,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine
        };

        // ============ WINDOW GLOBALS ============
        const windowGlobals = {
          hasGrecaptcha: typeof window.grecaptcha !== 'undefined',
          hasDataLayer: typeof window.dataLayer !== 'undefined',
          hasGA: typeof window.gtag !== 'undefined',
          hasNextAuth: typeof window.__NEXTAUTH__ !== 'undefined'
        };

        return {
          localStorage,
          sessionStorage,
          localStorageKeys,
          sessionStorageKeys,
          recaptchaData,
          authData,
          flowSettings,
          googleAuthIndicators,
          metadata,
          windowGlobals,
          captureTime: new Date().toISOString()
        };
      });

      return deepData;
    } catch (error) {
      console.error(`❌ Error during deep capture: ${error.message}`);
      throw error;
    }
  }

  async analyzeAndReport(deepData) {
    console.log('📊 SESSION DATA ANALYSIS\n');
    
    console.log('🔑 LOCALSTORAGE ITEMS:');
    console.log(`   Total items: ${deepData.localStorageKeys.length}`);
    deepData.localStorageKeys.forEach(key => {
      const value = deepData.localStorage[key];
      const preview = value.substring(0, 60) + (value.length > 60 ? '...' : '');
      console.log(`   • ${key}: ${preview}`);
    });

    console.log('\n💾 SESSIONSTORAGE ITEMS:');
    console.log(`   Total items: ${deepData.sessionStorageKeys.length}`);
    deepData.sessionStorageKeys.forEach(key => {
      const value = deepData.sessionStorage[key];
      const preview = value.substring(0, 60) + (value.length > 60 ? '...' : '');
      console.log(`   • ${key}: ${preview}`);
    });

    console.log('\n🤖 RECAPTCHA STATUS:');
    console.log(`   grecaptcha API available: ${deepData.recaptchaData.hasGreCaptcha ? '✅' : '❌'}`);
    console.log(`   Callback configured: ${deepData.recaptchaData.hasGrecaptchaCallback ? '✅' : '❌'}`);
    console.log(`   Scripts loaded: ${deepData.recaptchaData.recaptchaScripts.length}`);
    
    console.log('\n🔐 IMPORTANT RECAPTCHA TOKENS:');
    const hasRecaptchaTokens = Object.keys(deepData.recaptchaData.recaptchaLocals).length > 0;
    if (hasRecaptchaTokens) {
      Object.entries(deepData.recaptchaData.recaptchaLocals).forEach(([key, value]) => {
        const preview = value.substring(0, 50) + (value.length > 50 ? '...' : '');
        console.log(`   ✅ ${key}: ${preview}`);
      });
    } else {
      console.log(`   ❌ No reCAPTCHA tokens found in localStorage`);
    }

    console.log('\n🔐 NEXTAUTH & CSRF TOKENS:');
    if (Object.keys(deepData.authData.tokens).length > 0) {
      Object.entries(deepData.authData.tokens).forEach(([key, value]) => {
        const preview = value.substring(0, 50) + (value.length > 50 ? '...' : '');
        console.log(`   ✅ ${key}: ${preview}`);
      });
    } else {
      console.log(`   ❌ No auth tokens found`);
    }

    console.log('\n⚙️  FLOW SETTINGS:');
    Object.entries(deepData.flowSettings).forEach(([key, value]) => {
      if (value) {
        const preview = value.substring(0, 50) + (value.length > 50 ? '...' : '');
        console.log(`   ${key}: ${preview}`);
      }
    });

    console.log('\n👤 GOOGLE AUTH INDICATORS:');
    Object.entries(deepData.googleAuthIndicators).forEach(([key, value]) => {
      console.log(`   ${key}: ${value ? '✅' : '❌'}`);
    });

    console.log('\n' + '='.repeat(70) + '\n');
  }

  async savSession(deepData, cookies) {
    console.log('💾 SAVING COMPREHENSIVE SESSION...\n');

    // ✅ Filter to only keep same-domain cookies (avoid third-party cookie issues)
    const sameDomainCookies = cookies.filter(cookie => {
      if (!cookie.domain) return true; // No domain = safe
      return cookie.domain === 'labs.google' || cookie.domain === '.labs.google';
    });

    console.log(`   📊 Cookies filtered: ${cookies.length} total → ${sameDomainCookies.length} same-domain only`);

    const fullSession = {
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      url: deepData.metadata.currentUrl,
      
      // All storage data
      localStorage: deepData.localStorage,
      sessionStorage: deepData.sessionStorage,
      cookies: sameDomainCookies,  // ✅ Use filtered cookies
      
      // Extracted important tokens
      tokens: {
        recaptcha: deepData.recaptchaData.recaptchaLocals,
        auth: deepData.authData.tokens,
        headers: this.capturedHeaders
      },
      
      // Flow configuration
      flowConfig: deepData.flowSettings,
      
      // Metadata
      metadata: deepData.metadata,
      auth: deepData.googleAuthIndicators,
      
      // Diagnostic info
      diagnostics: {
        recaptchaAvailable: deepData.recaptchaData.hasGreCaptcha,
        recaptchaConfigured: deepData.recaptchaData.hasGrecaptchaCallback,
        authTokensPresent: Object.keys(deepData.authData.tokens).length > 0,
        recaptchaTokensPresent: Object.keys(deepData.recaptchaData.recaptchaLocals).length > 0,
        capturedRequests: this.capturedRequests.length
      }
    };

    try {
      const sessionJson = JSON.stringify(fullSession, null, 2);
      fs.writeFileSync(this.sessionFilePath, sessionJson, 'utf8');
      
      const fileSize = fs.statSync(this.sessionFilePath).size;
      console.log(`✅ SAVED: ${this.sessionFilePath}`);
      console.log(`   Size: ${(fileSize / 1024).toFixed(2)} KB\n`);

      console.log('📋 SUMMARY:');
      console.log(`   • localStorage items: ${deepData.localStorageKeys.length}`);
      console.log(`   • sessionStorage items: ${deepData.sessionStorageKeys.length}`);
      console.log(`   • Cookies: ${cookies.length}`);
      console.log(`   • reCAPTCHA tokens: ${Object.keys(deepData.recaptchaData.recaptchaLocals).length}`);
      console.log(`   • Auth tokens: ${Object.keys(deepData.authData.tokens).length}`);
      console.log(`   • Captured API requests: ${this.capturedRequests.length}\n`);

      return fullSession;
    } catch (error) {
      console.error(`❌ Error saving: ${error.message}`);
      throw error;
    }
  }

  async getCookies() {
    return await this.page.cookies();
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.init();
      await this.navigateToFlow();
      await this.waitForAuth();
      
      // Trigger reCAPTCHA token generation
      await this.triggerReCaptcha();
      
      const deepData = await this.captureDeep();
      const cookies = await this.getCookies();
      
      this.analyzeAndReport(deepData);
      const fullSession = await this.savSession(deepData, cookies);
      
      console.log('✅ SESSION CAPTURE COMPLETE!\n');
      console.log('⚠️  NEXT STEPS:');
      console.log('   1. Check the analysis above for any ❌ items');
      console.log('   2. If reCAPTCHA tokens are missing, manually trigger a reCAPTCHA on the page');
      console.log('   3. Run this script again to capture the tokens\n');
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    } finally {
      await this.close();
    }
  }
}

const capture = new DeepSessionCapture();
await capture.run();
