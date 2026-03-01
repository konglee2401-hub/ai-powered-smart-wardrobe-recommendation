#!/usr/bin/env node

/**
 * Capture Google Flow Session & reCAPTCHA Token
 * 
 * Purpose:
 * - Open lab.google Flow in browser
 * - Wait for user to login/authenticate
 * - Capture localStorage (including reCAPTCHA tokens)
 * - Capture cookies from browser
 * - Save session to JSON for later reuse
 * 
 * Usage:
 * node scripts/capture-google-flow-session.js
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

class GoogleFlowSessionCapture {
  constructor() {
    this.browser = null;
    this.page = null;
    this.sessionFilePath = path.join(__dirname, '../.sessions/google-flow-session-advanced.json');
  }

  async init() {
    console.log('🚀 Initializing Google Flow Session Capture...\n');
    
    // Create sessions directory if doesn't exist
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
    
    // Enable request interception to capture API calls
    await this.page.on('request', (req) => {
      // Log Google API calls
      if (req.url().includes('googleapis.com') || req.url().includes('labs.google')) {
        console.log(`[API] ${req.method()} ${req.url().substring(0, 100)}`);
      }
      req.continue();
    });

    console.log('✅ Browser initialized\n');
  }

  async navigateToFlow() {
    const flowUrl = 'https://labs.google/fx/vi/tools/flow';
    console.log(`🔗 Navigating to Google Flow: ${flowUrl}\n`);
    
    try {
      await this.page.goto(flowUrl, { 
        waitUntil: 'networkidle2', 
        timeout: 60000 
      });
      console.log('✅ Page loaded\n');
    } catch (error) {
      console.error(`❌ Failed to load page: ${error.message}`);
      throw error;
    }
  }

  async waitForAuthentication() {
    console.log('⏳ Waiting for you to login/authenticate...');
    console.log('   (Browser is open - please login if prompted)\n');
    
    // Wait for user to complete authentication
    // Check for NextAuth session token presence
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes
    const startTime = Date.now();

    return new Promise((resolve) => {
      const checkInterval = setInterval(async () => {
        try {
          const hasSession = await this.page.evaluate(() => {
            // Check localStorage for session indicators
            const flowState = localStorage.getItem('FLOW_MAIN_PROMPT_BOX_STATE');
            const userId = localStorage.getItem('EMAIL');
            return !!(flowState || userId);
          });

          if (hasSession) {
            console.log('✅ Authentication detected!\n');
            clearInterval(checkInterval);
            resolve();
            return;
          }

          // Check for timeout
          if (Date.now() - startTime > maxWaitTime) {
            console.warn('⏱️  Authentication timeout (5 minutes). Proceeding as-is.\n');
            clearInterval(checkInterval);
            resolve();
          }
        } catch (error) {
          // Page might be closed
        }
      }, 2000);
    });
  }

  async captureSession() {
    console.log('📋 Capturing session data...\n');

    try {
      // STEP 1: Capture localStorage
      console.log('   📝 Capturing localStorage...');
      const localStorage = await this.page.evaluate(() => {
        const items = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          items[key] = window.localStorage.getItem(key);
        }
        return items;
      });
      console.log(`      ✓ Captured ${Object.keys(localStorage).length} localStorage items`);

      // STEP 2: Capture cookies
      console.log('   🍪 Capturing cookies...');
      const cookies = await this.page.cookies();
      console.log(`      ✓ Captured ${cookies.length} cookies`);

      // STEP 3: Extract important cookies for authentication
      const importantCookies = cookies.filter(c => 
        c.name.includes('next-auth') || 
        c.name.includes('PSID') || 
        c.name.includes('__Secure') ||
        c.name.includes('AEC') ||
        c.domain.includes('google')
      );
      console.log(`      ✓ Important cookies: ${importantCookies.length}`);

      // STEP 4: Get reCAPTCHA token
      console.log('   🔐 Checking for reCAPTCHA tokens...');
      const recaptchaInfo = await this.page.evaluate(() => {
        // Get reCAPTCHA token from localStorage
        const grecaptcha = localStorage.getItem('_grecaptcha');
        // Check window for reCAPTCHA object
        const hasRecaptcha = !!(window.grecaptcha || window.__grecaptcha);
        return {
          localStorageToken: grecaptcha,
          hasRecaptchaAPI: hasRecaptcha,
          timestamp: new Date().toISOString()
        };
      });
      console.log(`      ✓ reCAPTCHA localStorage token: ${recaptchaInfo.localStorageToken ? '✅' : '❌'}`);
      console.log(`      ✓ reCAPTCHA API available: ${recaptchaInfo.hasRecaptchaAPI ? '✅' : '❌'}`);

      // STEP 5: Get authorization header (from API interaction)
      console.log('   🔑 Extracting authorization info...');
      const authInfo = await this.page.evaluate(() => {
        // Try to get from various sources
        const sessionStorage = {};
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          sessionStorage[key] = window.sessionStorage.getItem(key);
        }
        return {
          hasSessionStorage: Object.keys(sessionStorage).length > 0,
          sessionStorageKeys: Object.keys(sessionStorage)
        };
      });

      // Build comprehensive session object
      const session = {
        timestamp: new Date().toISOString(),
        url: this.page.url(),
        localStorage: localStorage,
        cookies: cookies,
        importantCookies: importantCookies,
        recaptchaInfo: recaptchaInfo,
        authenticationStatus: {
          hasSession: !!localStorage.FLOW_MAIN_PROMPT_BOX_STATE,
          hasEmail: !!localStorage.EMAIL,
          hasCookies: cookies.length > 0,
          hasImportantCookies: importantCookies.length > 0
        },
        metadata: {
          capturedAt: new Date().toISOString(),
          userAgent: await this.page.evaluate(() => navigator.userAgent),
          timezone: await this.page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone)
        }
      };

      return session;
    } catch (error) {
      console.error(`❌ Error capturing session: ${error.message}`);
      throw error;
    }
  }

  async saveSession(session) {
    console.log('\n💾 Saving session to file...');
    
    try {
      // Format for readability
      const sessionJson = JSON.stringify(session, null, 2);
      fs.writeFileSync(this.sessionFilePath, sessionJson, 'utf8');
      
      const fileSize = fs.statSync(this.sessionFilePath).size;
      console.log(`✅ Session saved to: ${this.sessionFilePath}`);
      console.log(`   File size: ${(fileSize / 1024).toFixed(2)} KB\n`);

      // Summarize what was saved
      console.log('📊 Session Summary:');
      console.log(`   • localStorage items: ${Object.keys(session.localStorage).length}`);
      console.log(`   • Total cookies: ${session.cookies.length}`);
      console.log(`   • Important cookies: ${session.importantCookies.length}`);
      console.log(`   • Authentication status: ${session.authenticationStatus.hasSession ? '✅ Authenticated' : '❌ Not authenticated'}`);
      console.log(`   • reCAPTCHA token: ${session.recaptchaInfo.localStorageToken ? '✅ Available' : '❌ Not found'}\n`);

      // Show key localStorage items
      console.log('🔑 Key localStorage items:');
      const keyItems = ['EMAIL', 'FLOW_MAIN_PROMPT_BOX_STATE', '_grecaptcha'];
      keyItems.forEach(key => {
        const value = session.localStorage[key];
        if (value) {
          const preview = value.substring(0, 50) + (value.length > 50 ? '...' : '');
          console.log(`   • ${key}: ${preview}`);
        }
      });

      console.log('\n✅ Session capture complete!');
      console.log('   You can now use this session for automated image generation.\n');

    } catch (error) {
      console.error(`❌ Error saving session: ${error.message}`);
      throw error;
    }
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
      await this.waitForAuthentication();
      const session = await this.captureSession();
      await this.saveSession(session);
    } catch (error) {
      console.error(`\n❌ Error: ${error.message}`);
      process.exit(1);
    } finally {
      await this.close();
    }
  }
}

// Run the script
const capture = new GoogleFlowSessionCapture();
await capture.run();
