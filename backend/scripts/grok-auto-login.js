#!/usr/bin/env node

/**
 * Test Grok Session Reuse Script
 * 
 * This script will:
 * 1. Load saved session from grok-session.json
 * 2. Inject essential cookies
 * 3. Inject essential localStorage
 * 4. Navigate to grok.com
 * 5. Check if login is successful
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Apply stealth plugin
puppeteer.use(StealthPlugin());

const SESSION_FILE = path.join(process.cwd(), '.sessions', 'grok-session.json');

// Essential cookies to inject (based on analysis)
const ESSENTIAL_COOKIES = [
  'cf_clearance',
  '__cf_bm', 
  'sso',
  'sso-rw',
  'x-userid'
];

// Essential localStorage keys
const ESSENTIAL_LOCALSTORAGE = [
  'xai-ff-bu',
  'chat-preferences', 
  'user-settings',
  'anonUserId'
];

// Get Chrome User Data directory
const chromeUserDataDir = path.join(
  process.env.LOCALAPPDATA || os.homedir(),
  'Google',
  'Chrome',
  'User Data'
);

async function loadSession() {
  if (!fs.existsSync(SESSION_FILE)) {
    throw new Error(`Session file not found: ${SESSION_FILE}`);
  }
  
  const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
  console.log('✅ Session loaded from file');
  return sessionData;
}

async function filterEssentialCookies(cookies) {
  return cookies.filter(c => ESSENTIAL_COOKIES.includes(c.name));
}

async function filterEssentialLocalStorage(localStorage) {
  const filtered = {};
  for (const key of ESSENTIAL_LOCALSTORAGE) {
    if (localStorage[key] !== undefined) {
      filtered[key] = localStorage[key];
    }
  }
  return filtered;
}

/**
 * Detect Cloudflare challenge/turnstile
 */
async function detectCloudflare(page) {
  try {
    const cf = await page.evaluate(() => {
      // Check for Cloudflare challenge page
      const bodyText = document.body.innerText.toLowerCase();
      const isChallenge = bodyText.includes('checking your browser') || 
                         bodyText.includes('cloudflare') ||
                         bodyText.includes('please wait');
      
      // Check for Turnstile checkbox (in iframe)
      const iframes = document.querySelectorAll('iframe');
      let hasTurnstile = false;
      for (const iframe of iframes) {
        try {
          if (iframe.src && iframe.src.includes('cloudflare')) {
            hasTurnstile = true;
            break;
          }
        } catch (e) {
          // Cross-origin iframe
        }
      }
      
      // Check for Turnstile widget
      const hasTurnstileWidget = document.querySelector('.cf-turnstile') !== null ||
                                document.querySelector('[data-sitekey]') !== null;
      
      // Check for challenge element
      const hasChallengeElement = document.getElementById('challenge-running') !== null ||
                                  document.querySelector('.challenge-running') !== null;
      
      return {
        isChallenge,
        hasTurnstile,
        hasTurnstileWidget,
        hasChallengeElement,
        bodyText: bodyText.substring(0, 200)
      };
    });
    return cf;
  } catch (error) {
    return { isChallenge: false, error: error.message };
  }
}

async function checkLoginStatus(page) {
  try {
    // First check for Cloudflare
    const cf = await detectCloudflare(page);
    
    if (cf.isChallenge || cf.hasTurnstile || cf.hasTurnstileWidget || cf.hasChallengeElement) {
      return {
        isLoggedIn: false,
        isCloudflare: true,
        hasTurnstile: cf.hasTurnstile,
        hasChallengeElement: cf.hasChallengeElement,
        url: page.url()
      };
    }
    
    const status = await page.evaluate(() => {
      const bodyText = document.body.innerText.toLowerCase();
      
      const hasSignIn = bodyText.includes('sign in') || bodyText.includes('sign up');
      const hasChatInput = document.querySelector('textarea') !== null ||
                          document.querySelector('[contenteditable="true"]') !== null;
      const hasGrokUI = bodyText.includes('bận dạng nghĩ') || 
                        bodyText.includes('ask anything') ||
                        bodyText.includes('what\'s on your mind');
      
      return {
        isLoggedIn: !hasSignIn && (hasChatInput || hasGrokUI),
        hasSignIn,
        hasChatInput,
        hasGrokUI,
        url: window.location.href
      };
    });
    return { ...status, isCloudflare: false };
  } catch (error) {
    console.error('Error checking login:', error.message);
    return { isLoggedIn: false, error: error.message };
  }
}

async function main() {
  console.log('==================================================');
  console.log(' Grok Auto-Login (Chrome Profile)');
  console.log('==================================================');
  console.log('');
  console.log('ℹ️  Using Chrome profile with existing Grok session');
  console.log('   Profile: ' + chromeUserDataDir);
  console.log('');
  
  // Launch browser with existing Chrome profile
  console.log('🚀 Launching browser with existing Chrome profile...');
  
  const browser = await puppeteer.launch({
    channel: 'chrome',
    headless: false,
    args: [
      `--user-data-dir=${chromeUserDataDir}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-web-resources'
    ],
    defaultViewport: { width: 1280, height: 800 }
  });

  try {
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate to grok.com - Chrome profile cookies will be used automatically
    console.log('📍 Navigating to https://grok.com...');
    console.log('   (Chrome profile cookies will be used automatically)');
    await page.goto('https://grok.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('✅ Page loaded');
    
    // Wait for page to fully settle
    console.log('⏳ Waiting for page to settle...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Poll for login status with LONGER timeout for Cloudflare
    console.log('');
    console.log('🔍 Checking Grok status (will wait up to 10 minutes for Cloudflare)...');
    
    let status = null;
    let checkCount = 0;
    const maxChecks = 300; // 300 * 2s = 10 minutes
    const checkInterval = 2000;
    let cfRetryCount = 0;
    
    while (!status?.isLoggedIn && checkCount < maxChecks) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      checkCount++;
      
      status = await checkLoginStatus(page);
      
      if (status.isCloudflare) {
        cfRetryCount++;
        process.stdout.write(`\r🔄 Check #${checkCount}/${maxChecks}: ☁️ CLOUDFLARE DETECTED (waiting to verify...)`);
        
        // Every 15 seconds, try a page reload to help Cloudflare process
        if (cfRetryCount % 8 === 0) {
          console.log('');
          console.log(`   ↳ Attempt #${Math.floor(cfRetryCount/8)}: Reloading page to verify Cloudflare...`);
          await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } else if (status.isLoggedIn) {
        console.log('');
        console.log(`✅ Check #${checkCount}: LOGGED IN!`);
        break;
      } else if (checkCount % 10 === 0) {
        console.log('');
        console.log(`🔄 Check #${checkCount}: Waiting for Grok to load...`);
      }
    }
    
    console.log('');
    console.log('📊 Final Status:');
    console.log(`   URL: ${status?.url}`);
    console.log(`   Logged in: ${status?.isLoggedIn ? '✅ YES' : '❌ NO'}`);
    console.log(`   Cloudflare: ${status?.isCloudflare ? '☁️ BLOCKING' : '✅ PASSED'}`);
    console.log(`   Has chat input: ${status?.hasChatInput ? '✅' : '❌'}`);
    console.log(`   Has Grok UI: ${status?.hasGrokUI ? '✅' : '❌'}`);
    console.log(`   Has Sign in: ${status?.hasSignIn ? '⚠️ YES' : '✅ NO'}`);
    
    if (status?.isLoggedIn) {
      console.log('');
      console.log('🎉 SUCCESS! Grok is ready to use!');
    } else if (status?.isCloudflare) {
      console.log('');
      console.log('⚠️  CLOUDFLARE VERIFICATION REQUIRED');
      console.log('   Please complete the verification in the browser window');
      console.log('   The script will wait for you to verify (max 5 more minutes)...');
      
      // Wait additional 5 minutes for user to manually verify
      let verifyCount = 0;
      const maxVerifyChecks = 150; // 150 * 2s = 5 minutes
      
      while (!status?.isLoggedIn && verifyCount < maxVerifyChecks) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        verifyCount++;
        status = await checkLoginStatus(page);
        
        if (status?.isLoggedIn) {
          console.log('');
          console.log(`✅ Verification complete! Grok is ready!`);
          break;
        } else if (verifyCount % 15 === 0) {
          console.log(`⏳ Still waiting for verification... (${verifyCount}/${maxVerifyChecks})`);
        }
      }
    } else {
      console.log('');
      console.log('⚠️  Unable to determine login status');
    }
    
    // Keep browser open for user to use
    console.log('');
    console.log('Browser will stay open. Close the window when done.');
    console.log('Press Ctrl+C to exit the script.');
    
    // Wait indefinitely or until user closes browser
    await new Promise(resolve => setTimeout(resolve, 24 * 60 * 60 * 1000)); // 24 hours
  
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log('');
    console.log('🔒 Closing browser...');
    try {
      await browser.close();
    } catch (e) {
      console.log('Browser already closed');
    }
    console.log('✅ Done');
  }
}

main().catch(console.error);
