#!/usr/bin/env node

/**
 * Test Cloudflare Bypass Methods
 * 
 * Compares different approaches to see what works best
 * 
 * Usage:
 *   node scripts/test-cloudflare-methods.js
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

async function testMethod1_TimingFix() {
  console.log('\n' + '─'.repeat(80));
  console.log('🔧 METHOD 1: Timing Fix (Load page FIRST, then cookies)');
  console.log('─'.repeat(80) + '\n');

  let browser;

  try {
    console.log('1️⃣  Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    console.log('2️⃣  Navigate to grok.com FIRST (let Cloudflare verify)...');
    try {
      await page.goto('https://grok.com', {
        waitUntil: 'networkidle2',
        timeout: 20000
      });
    } catch (e) {
      console.log(`   (Navigation timeout - normal with Cloudflare)`);
    }

    console.log('3️⃣  Check current URL and status:');
    const url = page.url();
    const title = await page.title();
    console.log(`   URL: ${url}`);
    console.log(`   Title: ${title}`);

    const isCloudflareChallenge = title.includes('Challenge') || url.includes('challenge');
    console.log(`   ${isCloudflareChallenge ? '❌' : '✅'} Cloudflare challenge: ${isCloudflareChallenge ? 'YES' : 'NO'}\n`);

    // Load session
    const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));

    console.log('4️⃣  Inject cookies from session (AFTER page load)...');
    const grokCookies = sessionData.cookies
      .filter(c => c.domain?.includes('grok.com') || c.domain?.includes('x.ai'));

    let injected = 0;
    for (const cookie of grokCookies) {
      try {
        await page.setCookie({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path || '/',
          httpOnly: cookie.httpOnly || false,
          secure: cookie.secure !== false,
          expires: cookie.expires || undefined,
          sameSite: cookie.sameSite || 'None'
        });
        
        if (['cf_clearance', 'sso', 'sso-rw', '__cf_bm'].includes(cookie.name)) {
          console.log(`   ✅ ${cookie.name}`);
        }
        injected++;
      } catch (e) {
        console.log(`   ⚠️  ${cookie.name}: ${e.message}`);
      }
    }
    console.log(`   Total: ${injected} cookies\n`);

    console.log('5️⃣  Reload page to activate cookies...');
    try {
      await page.reload({ waitUntil: 'networkidle2', timeout: 15000 });
      console.log('   ✅ Reload successful\n');
    } catch (e) {
      console.log(`   ⚠️  Reload timeout: ${e.message}\n`);
    }

    console.log('6️⃣  Check page after reload:');
    const newUrl = page.url();
    const newTitle = await page.title();
    console.log(`   URL: ${newUrl}`);
    console.log(`   Title: ${newTitle}\n`);

    const cookies = await page.cookies();
    const hasCfClearance = cookies.find(c => c.name === 'cf_clearance');
    const hasSso = cookies.find(c => c.name === 'sso');

    console.log('7️⃣  Check critical cookies:');
    console.log(`   ${hasCfClearance ? '✅' : '❌'} cf_clearance`);
    console.log(`   ${hasSso ? '✅' : '❌'} sso`);

    console.log('\n✨ METHOD 1 RESULT: ' + (
      hasCfClearance && hasSso ? '✅ SUCCESS' : '⚠️  PARTIAL'
    ) + '\n');

    await browser.close();
    return hasCfClearance && hasSso;

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (browser) await browser.close();
    return false;
  }
}

async function testMethod2_HeadlessFalse() {
  console.log('\n' + '─'.repeat(80));
  console.log('🔧 METHOD 2: Headless False (You solve manually)');
  console.log('─'.repeat(80) + '\n');

  let browser;

  try {
    const shouldTest = await askQuestion(
      'This requires interaction. Test it? (y/n): '
    );

    if (shouldTest !== 'y') {
      console.log('Skipped.\n');
      return null;
    }

    console.log('\n1️⃣  Launching browser VISIBLY...');
    browser = await puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    console.log('2️⃣  Navigating to grok.com...');
    console.log('   👁️  Browser is visible. If Cloudflare appears, solve it manually.\n');

    try {
      await page.goto('https://grok.com', {
        waitUntil: 'networkidle2',
        timeout: 60000  // Longer timeout for manual solving
      });
    } catch (e) {
      console.log(`   (Navigation timeout)`);
    }

    console.log('\n3️⃣  Waiting for you to solve Cloudflare (if needed)...');
    const manualWait = await askQuestion(
      'Once you\'ve solved the challenge (if needed), press Enter...'
    );

    console.log('\n4️⃣  Checking page status...');
    const cookies = await page.cookies();
    const hasCfClearance = cookies.find(c => c.name === 'cf_clearance');
    const hasSso = cookies.find(c => c.name === 'sso');

    console.log(`   ${hasCfClearance ? '✅' : '❌'} cf_clearance`);
    console.log(`   ${hasSso ? '✅' : '❌'} sso`);

    console.log('\n✨ METHOD 2 RESULT: ' + (
      hasCfClearance && hasSso ? '✅ SUCCESS - Manual solve works!' : '❌ FAILED'
    ) + '\n');

    const keepOpen = await askQuestion('Keep browser open? (y/n): ');
    if (keepOpen === 'y') {
      console.log('Browser is open. Close it when done.\n');
      return null;
    }

    await browser.close();
    return hasCfClearance && hasSso;

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (browser) await browser.close();
    return false;
  }
}

async function showComparison() {
  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 CLOUDFLARE BYPASS METHODS COMPARISON');
  console.log('═'.repeat(80) + '\n');

  console.log('Method                     | Ease | Speed | Reliability | Automation');
  console.log('────────────────────────────┼──────┼───────┼─────────────┼────────────');
  console.log('Timing Fix (Method 1)      |  ⭐⭐  | ⭐⭐⭐⭐⭐ |    ⭐⭐⭐    |    ✅ Yes');
  console.log('Headless: False (Method 2) |  ⭐⭐⭐ | ⭐⭐   |    ⭐⭐⭐⭐⭐ |    ❌ Manual');
  console.log('Undetected-Chromium        | ⭐⭐⭐⭐ | ⭐⭐⭐  |    ⭐⭐⭐⭐  |    ✅ Yes');
  console.log('Direct API Calls           | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |    ⭐⭐⭐⭐⭐ |    ✅ Yes');

  console.log('\n' + '═'.repeat(80));
  console.log('RECOMMENDATION:');
  console.log('─'.repeat(80));
  console.log(`
✅ PRIMARY: Use Method 1 (Timing Fix)
   - Simplest implementation
   - Works with existing code
   - No extra packages needed

⏸️  FALLBACK: Use Method 2 (Headless: False)
   - If Method 1 fails
   - You solve challenges manually
   - 100% reliable but needs interaction

🚀 FUTURE: Consider Direct API Calls
   - When scaling to many images
   - 10x faster than browser automation
   - Still needs valid session but no Cloudflare issues

  `);

  console.log('═'.repeat(80) + '\n');
}

async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('🧪 CLOUDFLARE BYPASS TEST');
  console.log('═'.repeat(80));

  console.log('\nAvailable methods:');
  console.log('  1. Timing Fix (automated)');
  console.log('  2. Headless: False (manual)\n');

  const method = await askQuestion('Which method to test? (1/2 or both): ');

  let results = {
    method1: null,
    method2: null
  };

  if (method === '1' || method === 'both') {
    results.method1 = await testMethod1_TimingFix();
  }

  if (method === '2' || method === 'both') {
    results.method2 = await testMethod2_HeadlessFalse();
  }

  // Show comparison
  await showComparison();

  // Summary
  console.log('RESULTS:');
  console.log('─'.repeat(80));
  if (results.method1 !== null) {
    console.log(`Method 1 (Timing Fix):      ${results.method1 ? '✅ SUCCESS' : '❌ FAILED'}`);
  }
  if (results.method2 !== null) {
    console.log(`Method 2 (Headless False):  ${results.method2 ? '✅ SUCCESS' : '❌ FAILED'}`);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('Next steps:');
  console.log('  1. If Method 1 worked: Update GrokServiceV2 to use grok-auto-login-v2-cloudflare-fix.js');
  console.log('  2. If Method 2 worked: Use headless: false for session capture');
  console.log('  3. Read: backend/docs/CLOUDFLARE_BYPASS_STRATEGIES.md for more options\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
