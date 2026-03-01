#!/usr/bin/env node

/**
 * Grok Session Capture - IMPROVED Cloudflare Bypass
 * 
 * Key Changes:
 * 1. Uses CORRECT timing: Navigate FIRST, then check for Cloudflare bypass
 * 2. Waits for network idle (not just page load)
 * 3. Detects if stuck in Cloudflare challenge
 * 4. Headless: false for manual solve (you see the browser and can solve manually)
 * 5. Enhanced stealth to avoid detection
 * 
 * Usage:
 *   node scripts/grok-capture-cloudflare-safe.js
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

puppeteer.use(StealthPlugin());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = path.join(__dirname, '../.sessions/grok-session-complete.json');
const BACKUP_FILE = path.join(__dirname, '../.sessions/grok-session-backup.json');

async function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase());
    });
  });
}

async function detectCloudflareChallenge(page) {
  try {
    const isBlocked = await page.evaluate(() => {
      // Check for Cloudflare challenge page
      const hasChallenge = document.body.innerText.includes('Challenge') ||
                          document.title.includes('Challenge') ||
                          document.body.innerHTML.includes('cf_clearance') ||
                          document.querySelector('[data-test-id="challenge"]') ||
                          document.querySelector('.cloudflare-challenge');
      
      return hasChallenge;
    });
    
    return isBlocked;
  } catch (e) {
    return false;
  }
}

async function waitForCloudflareBypass(page, maxWaitTime = 30000) {
  console.log('⏳ Waiting for Cloudflare challenge...');
  
  const startTime = Date.now();
  let lastCheck = startTime;

  while (Date.now() - startTime < maxWaitTime) {
    try {
      // Check if we're past Cloudflare
      const isBlocked = await detectCloudflareChallenge(page);
      
      if (!isBlocked) {
        console.log('✅ Cloudflare challenge bypassed!\n');
        return true;
      }

      // Log progress every 5 seconds
      if (Date.now() - lastCheck > 5000) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`  ⏳ Still waiting... (${elapsed}s)`);
        lastCheck = Date.now();
      }

      await page.waitForTimeout(1000);
    } catch (e) {
      //ignore
    }
  }

  console.log('\n⚠️  Cloudflare challenge timeout. You may need to solve manually.\n');
  return false;
}

async function captureSession() {
  console.log('\n' + '═'.repeat(80));
  console.log('🔐 GROK SESSION CAPTURE - CLOUDFLARE SAFE MODE');
  console.log('═'.repeat(80) + '\n');

  // Check if cookies are from fresh capture
  const useExisting = await askQuestion(
    'Do you have cookies from a recent Grok session? (This helps avoid Cloudflare) (y/n): '
  );

  let browser;
  let page;

  try {
    console.log('\n🌐 Launching browser...');
    console.log('   ⚠️  Browser will open VISIBLY so you can solve Cloudflare if needed\n');

    // IMPORTANT: headless: false so you can see and interact with browser
    browser = await puppeteer.launch({
      headless: false,  // KEY: Show browser for manual Cloudflare solving
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-resources',
        '--disable-blink-features=AutomationControlled',
        '--disable-popup-blocking',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-sync',
        '--no-first-run',
        '--no-default-browser-check',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-service-autorun',
        '--password-store=basic',
        '--no-pings',
        '--window-size=1280,720',
        '--start-maximized'
      ],
      timeout: 30000
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Add user agent spoofing
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    // Add extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    });

    console.log('✅ Browser launched\n');

    // STEP 1: Navigate to Grok WITHOUT cookies first
    console.log('📋 STEP 1: Navigate to Grok (let Cloudflare solve)\n');
    console.log('🌐 Loading https://grok.com...\n');

    try {
      await page.goto('https://grok.com', {
        waitUntil: 'networkidle2',  // Wait for network to be mostly idle
        timeout: 30000
      });
    } catch (error) {
      console.log(`⚠️  Navigation timeout (normal with Cloudflare): ${error.message}\n`);
    }

    // STEP 2: Wait for Cloudflare to be solved
    console.log('📋 STEP 2: Wait for Cloudflare Challenge\n');
    await waitForCloudflareBypass(page, 60000);

    // Additional wait for JS to load
    console.log('⏳ Waiting for page to fully load...');
    await page.waitForTimeout(3000);
    console.log('✅ Page loaded\n');

    // STEP 3: Capture cookies (from ALL domains)
    console.log('📋 STEP 3: Capture Session Data\n');
    console.log('  🍪 Capturing cookies from all domains...');
    
    // Get cookies from browser (all domains)
    const cookies = await page.browser().cookies();
    const grokCookies = cookies.filter(c => 
      c.domain?.includes('grok.com') || c.domain?.includes('x.ai')
    );

    console.log(`     Found ${grokCookies.length} cookies from grok.com/x.ai domains\n`);

    // Verify critical cookies
    const criticalCookies = ['cf_clearance', 'sso', 'sso-rw'];
    const foundCritical = grokCookies.filter(c => criticalCookies.includes(c.name));

    if (foundCritical.length < criticalCookies.length) {
      console.log('⚠️  WARNING: Missing some critical cookies:');
      criticalCookies.forEach(name => {
        const found = grokCookies.find(c => c.name === name);
        console.log(`     ${found ? '✅' : '❌'} ${name}`);
      });
      console.log('\n  This might be okay if you just need to refresh session.\n');
    } else {
      console.log('  ✅ All critical cookies found!\n');
    }

    // Capture localStorage
    console.log('  💾 Capturing localStorage...');
    const localStorage = await page.evaluate(() => {
      const storage = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        storage[key] = window.localStorage.getItem(key);
      }
      return storage;
    });
    console.log(`     Found ${Object.keys(localStorage).length} items\n`);

    // Capture sessionStorage
    console.log('  🔐 Capturing sessionStorage...');
    const sessionStorage = await page.evaluate(() => {
      const storage = {};
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        storage[key] = window.sessionStorage.getItem(key);
      }
      return storage;
    });
    console.log(`     Found ${Object.keys(sessionStorage).length} items\n`);

    // Create session file
    const sessionData = {
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      baseUrl: 'https://grok.com',
      cookies: grokCookies,
      localStorage,
      sessionStorage,
      authTokens: {},
      metadata: {
        captureMethod: 'interactive-cloudflare-safe',
        captureTime: new Date().toLocaleString(),
        domain: 'grok.com, x.ai',
        note: 'Captured with proper Cloudflare bypass timing'
      }
    };

    // Create backup
    if (fs.existsSync(SESSION_FILE)) {
      const backupTime = new Date().getTime();
      const backupPath = SESSION_FILE.replace('.json', `-backup-${backupTime}.json`);
      fs.copyFileSync(SESSION_FILE, backupPath);
      console.log(`📦 Backup created: ${path.basename(backupPath)}`);
    }

    // Create session directory if needed
    const sessionDir = path.dirname(SESSION_FILE);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    // Save session
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
    console.log(`✅ Session saved: ${SESSION_FILE}\n`);

    // Summary
    console.log('═'.repeat(80));
    console.log('✅ SESSION CAPTURE COMPLETE');
    console.log('═'.repeat(80));
    console.log(`\n  📅 Timestamp: ${new Date(sessionData.timestamp).toLocaleString()}`);
    console.log(`  🍪 Cookies: ${grokCookies.length}`);
    console.log(`  💾 LocalStorage: ${Object.keys(localStorage).length}`);
    console.log(`  🔐 SessionStorage: ${Object.keys(sessionStorage).length}`);
    console.log(`\n✨ Session ready to use!\n`);

    // Option to keep browser open
    const keepOpen = await askQuestion('Keep browser open? (y/n): ');
    if (keepOpen === 'y') {
      console.log('\n📌 Browser is open. You can manually test or close when done.\n');
      // Keep browser open
      return;
    }

    await browser.close();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
}

// Run
captureSession().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
