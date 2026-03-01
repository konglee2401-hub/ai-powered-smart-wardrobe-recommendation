#!/usr/bin/env node

/**
 * Cookie Inspector
 * 
 * Opens Google Flow project and shows ALL cookies
 * Helpful for debugging cookie clearing issues
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

const PROJECT_ID = '58d791d4-37c9-47a8-ae3b-816733bc3ec0';
const SESSION_FILE = path.join(__dirname, '../.sessions/google-flow-session-complete.json');

async function inspectCookies() {
  console.log('\n' + '='.repeat(80));
  console.log('  COOKIE INSPECTOR');
  console.log('='.repeat(80) + '\n');

  let browser = null;
  let page = null;

  try {
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Load session
    if (fs.existsSync(SESSION_FILE)) {
      console.log('📁 Loading session...');
      const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
      
      for (const cookie of (sessionData.cookies || [])) {
        try {
          await page.setCookie(cookie);
        } catch (e) {
          // Ignore
        }
      }
      console.log(`✅ Loaded ${(sessionData.cookies || []).length} cookies\n`);
    }

    // Navigate
    const url = `https://labs.google/fx/vi/tools/flow/project/${PROJECT_ID}`;
    console.log(`🌐 Navigating to: ${url}\n`);
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    } catch (e) {
      console.log('⏱️  Navigation timeout (expected if page is loading)\n');
    }

    await page.waitForTimeout(3000);

    // Get cookies via multiple methods
    console.log('📋 Fetching cookies via different methods...\n');

    // Method 1: page.cookies() - current domain only
    console.log('1️⃣  page.cookies() - Current domain only:');
    const currentCookies = await page.cookies();
    console.log(`   Found: ${currentCookies.length} cookies`);
    for (const cookie of currentCookies) {
      const highlight = cookie.name.toLowerCase().includes('captcha') ? ' 🔴' : '';
      console.log(`   - ${cookie.name} (domain: ${cookie.domain})${highlight}`);
    }
    console.log();

    // Method 2: CDP - ALL domains
    console.log('2️⃣  CDP Network.getAllCookies - ALL domains:');
    try {
      const cdpSession = await page.target().createCDPSession();
      const result = await cdpSession.send('Network.getAllCookies');
      const allCookies = result.cookies || [];
      console.log(`   Found: ${allCookies.length} cookies`);
      
      const grecaptchaCookies = allCookies.filter(c => 
        c.name.toLowerCase().includes('captcha') ||
        c.name.toLowerCase().startsWith('rc::')
      );
      
      if (grecaptchaCookies.length > 0) {
        console.log(`\n   🔴 GRECAPTCHA COOKIES FOUND (${grecaptchaCookies.length}):`);
        for (const cookie of grecaptchaCookies) {
          console.log(`      - ${cookie.name} (domain: ${cookie.domain})`);
        }
      } else {
        console.log(`   ✅ No grecaptcha cookies found`);
      }
      
      console.log(`\n   📊 All cookies by domain:`);
      const byDomain = {};
      for (const cookie of allCookies) {
        const domain = cookie.domain || '(no domain)';
        if (!byDomain[domain]) byDomain[domain] = [];
        byDomain[domain].push(cookie.name);
      }
      
      for (const [domain, names] of Object.entries(byDomain)) {
        console.log(`      ${domain}: ${names.length} cookies`);
        for (const name of names.slice(0, 5)) {
          const highlight = name.toLowerCase().includes('captcha') ? ' 🔴' : '';
          console.log(`         - ${name}${highlight}`);
        }
        if (names.length > 5) {
          console.log(`         ... and ${names.length - 5} more`);
        }
      }
      
      await cdpSession.detach();
    } catch (cdpError) {
      console.log(`   ❌ CDP failed: ${cdpError.message}`);
    }
    console.log();

    // Method 3: localStorage
    console.log('3️⃣  localStorage:');
    const lsItems = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        items[key] = window.localStorage.getItem(key);
      }
      return items;
    });
    
    const lsKeys = Object.keys(lsItems);
    const grecaptchaLsKeys = lsKeys.filter(k => k.toLowerCase().includes('captcha'));
    
    console.log(`   Found: ${lsKeys.length} items`);
    if (grecaptchaLsKeys.length > 0) {
      console.log(`   🔴 GRECAPTCHA KEYS (${grecaptchaLsKeys.length}):`);
      for (const key of grecaptchaLsKeys) {
        const value = lsItems[key];
        const preview = value.substring(0, 50) + (value.length > 50 ? '...' : '');
        console.log(`      - ${key}: "${preview}"`);
      }
    } else {
      console.log(`   ✅ No grecaptcha keys found`);
    }
    console.log();

    // Ask user what to do
    console.log('═'.repeat(80));
    console.log('\n💡 Menu:');
    console.log('   1. Try to clear grecaptcha cookies (via CDP)');
    console.log('   2. Manually test in browser (press ENTER when done)');
    console.log('   3. Exit\n');

    const choice = await new Promise(resolve => {
      process.stdout.write('Choose (1-3): ');
      process.stdin.once('data', data => {
        resolve(data.toString().trim());
      });
    });

    if (choice === '1') {
      console.log('\n🧹 Attempting to clear grecaptcha cookies...\n');
      
      try {
        const cdpSession = await page.target().createCDPSession();
        const result = await cdpSession.send('Network.getAllCookies');
        const allCookies = result.cookies || [];
        
        let cleared = 0;
        for (const cookie of allCookies) {
          const nameLower = cookie.name.toLowerCase();
          if (nameLower.includes('captcha') || nameLower.startsWith('rc::')) {
            await cdpSession.send('Network.deleteCookies', {
              name: cookie.name,
              domain: cookie.domain,
              path: cookie.path
            });
            console.log(`✅ Deleted: ${cookie.name}`);
            cleared++;
          }
        }
        
        await cdpSession.detach();
        
        console.log(`\n✅ Cleared ${cleared} cookies\n`);
        
        // Show remaining cookies
        console.log('📋 Cookies after clearing:');
        const result2 = await cdpSession.send('Network.getAllCookies');
        const remaining = result2.cookies || [];
        const grecaptchaRemaining = remaining.filter(c => 
          c.name.toLowerCase().includes('captcha')
        );
        
        if (grecaptchaRemaining.length > 0) {
          console.log(`❌ Still found ${grecaptchaRemaining.length} grecaptcha cookies:`);
          for (const c of grecaptchaRemaining) {
            console.log(`   - ${c.name}`);
          }
        } else {
          console.log('✅ All grecaptcha cookies cleared!');
        }
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    } else if (choice === '2') {
      console.log('\n⏳ Browser open for manual testing. Press ENTER when done...\n');
      await new Promise(resolve => {
        process.stdin.once('data', () => resolve());
      });
    }

    console.log('\n✅ Done\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
    process.exit(0);
  }
}

inspectCookies().catch(error => {
  console.error('Fatal:', error);
  process.exit(1);
});
