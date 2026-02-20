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
  console.log(' Test Grok Session Reuse');
  console.log('==================================================');
  console.log('');
  
  // Load session
  const sessionData = await loadSession();
  
  // Filter essential cookies
  const essentialCookies = await filterEssentialCookies(sessionData.cookies);
  console.log(`🍪 Essential cookies: ${essentialCookies.length}`);
  essentialCookies.forEach(c => console.log(`   - ${c.name}`));
  
  // Filter essential localStorage
  const essentialLocalStorage = await filterEssentialLocalStorage(sessionData.localStorage);
  console.log(`💾 Essential localStorage: ${Object.keys(essentialLocalStorage).length} keys`);
  
  // Launch browser
  console.log('');
  console.log('🚀 Launching browser...');
  
  const browser = await puppeteer.launch({
    channel: 'chrome',
    headless: false,
    args: [
      `--user-data-dir=${chromeUserDataDir}`,
      '--profile-directory=Profile 1',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-features=IsolateOrigins,site-per-process'
    ],
    defaultViewport: { width: 1280, height: 800 }
  });

  try {
    const page = await browser.newPage();
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate to grok.com
    console.log('📍 Navigating to https://grok.com...');
    await page.goto('https://grok.com', { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('✅ Page loaded');
    
    // Inject cookies
    console.log('🍪 Injecting essential cookies...');
    for (const cookie of essentialCookies) {
      try {
        // Clean up cookie for puppeteer
        const cleanCookie = {
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path || '/',
          expires: cookie.expires,
          httpOnly: cookie.httpOnly || false,
          secure: cookie.secure || true,
          sameSite: cookie.sameSite || 'None'
        };
        await page.setCookie(cleanCookie);
        console.log(`   ✅ ${cookie.name}`);
      } catch (error) {
        console.log(`   ❌ ${cookie.name}: ${error.message}`);
      }
    }
    
    // Inject localStorage
    console.log('💾 Injecting essential localStorage...');
    await page.evaluate((storageData) => {
      for (const [key, value] of Object.entries(storageData)) {
        try {
          localStorage.setItem(key, value);
        } catch (e) {
          console.log(`Error setting ${key}:`, e.message);
        }
      }
    }, essentialLocalStorage);
    console.log('   ✅ localStorage injected');
    
    // Wait a bit for any redirects
    console.log('⏳ Waiting for page to settle...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // First, try to trigger Cloudflare by refreshing or interacting
    console.log('');
    console.log('🔄 Triggering Cloudflare check...');
    await page.reload({ waitUntil: 'networkidle0' }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Poll for login status (with Cloudflare detection)
    console.log('');
    console.log('🔍 Checking login status (will poll for 2 minutes)...');
    
    let status = null;
    let checkCount = 0;
    const maxChecks = 60; // 60 * 2s = 2 minutes
    const checkInterval = 2000;
    let cfRetryCount = 0;
    
    while (!status?.isLoggedIn && checkCount < maxChecks) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      checkCount++;
      
      status = await checkLoginStatus(page);
      
      if (status.isCloudflare) {
        cfRetryCount++;
        console.log(`🔄 Check #${checkCount}: ☁️ CLOUDFLARE DETECTED!`);
        
        // Try to wait it out - the cf_clearance cookie should eventually work
        // Sometimes Cloudflare needs a few seconds to validate the cookie
        if (cfRetryCount >= 3 && cfRetryCount % 5 === 0) {
          console.log('   ↳ Trying to wait out Cloudflare (cf_clearance cookie should help)...');
          // Try refreshing the page
          await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
        }
      } else if (status.isLoggedIn) {
        console.log(`✅ Check #${checkCount}: LOGGED IN!`);
        break;
      } else {
        console.log(`🔄 Check #${checkCount}: ${status.url}`);
      }
    }
    
    console.log('');
    console.log('📊 Final Login Status:');
    console.log(`   URL: ${status?.url}`);
    console.log(`   Logged in: ${status?.isLoggedIn ? '✅ YES' : '❌ NO'}`);
    console.log(`   Cloudflare: ${status?.isCloudflare ? '☁️ YES' : '❌ NO'}`);
    console.log(`   Has chat input: ${status?.hasChatInput ? '✅' : '❌'}`);
    console.log(`   Has Grok UI: ${status?.hasGrokUI ? '✅' : '❌'}`);
    console.log(`   Has Sign in: ${status?.hasSignIn ? '⚠️ YES' : '✅ NO'}`);
    
    if (status?.isLoggedIn) {
      console.log('');
      console.log('🎉 SUCCESS! Session reuse worked!');
    } else if (status?.isCloudflare) {
      console.log('');
      console.log('⚠️  CLOUDLARE BLOCKING - Please click verify checkbox');
      console.log('   The script will wait for you to complete verification...');
      
      // Wait for user to complete Cloudflare
      checkCount = 0;
      while (!status?.isLoggedIn && checkCount < 30) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        checkCount++;
        status = await checkLoginStatus(page);
        
        if (status?.isLoggedIn) {
          console.log(`✅ User completed verification! Logged in!`);
          break;
        } else if (status?.isCloudflare) {
          console.log(`⏳ Still waiting for verification... (#${checkCount})`);
        } else {
          console.log(`🔄 Check #${checkCount}: ${status?.url}`);
        }
      }
    } else {
      console.log('');
      console.log('⚠️  Login not detected');
    }
    
    // Keep browser open for verification
    console.log('');
    console.log('Browser will stay open for 60 seconds...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log('🔒 Closing browser...');
    await browser.close();
    console.log('✅ Done');
  }
}

main().catch(console.error);
