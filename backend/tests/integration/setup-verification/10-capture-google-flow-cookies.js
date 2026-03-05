#!/usr/bin/env node

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

puppeteer.use(StealthPlugin());

const SESSION_FILE = path.join(__dirname, '../../.sessions/google-flow-session.json');

async function captureAndTestCookies() {
  console.log('\n════════════════════════════════════════════════════════════════════════════════');
  console.log('🔐 Capture & Test Fresh Cookies in Real-Time');
  console.log('════════════════════════════════════════════════════════════════════════════════\n');

  let browser;
  try {
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    console.log('\n🌐 Opening Google...');
    await page.goto('https://google.com', { waitUntil: 'networkidle2' });
    
    console.log('\n📋 STEP 1: You need to MANUALLY LOGIN in the browser window\n');
    console.log('   1. Click on your profile icon (top right)');
    console.log('   2. Select your Google account (modluffy90@gmail.com)');
    console.log('   3. Complete any login prompts\n');
    
    console.log('⏳ Waiting for you to login (60 seconds)...');
    console.log('   Once logged in, press Enter here to continue:\n');
    
    // Wait for user to press Enter
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });

    console.log('\n✓ Continuing...\n');

    // Now navigate to Lab Flow
    console.log('🌐 Navigating to Lab Flow...');
    await page.goto('https://labs.google/fx/vi/tools/flow', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✓ Page loaded\n');

    // Check if on login page
    const isOnLogin = await page.evaluate(() => {
      return document.body.innerText.includes('Try signing in') ||
             document.body.innerText.includes('Sign in');
    });

    if (isOnLogin) {
      console.log('❌ Still on login page - session expired');
      console.log('   Please try again - login must happen immediately before running this script\n');
      return;
    }

    console.log('✅ Logged in! Capturing cookies...\n');

    // Capture cookies from current page
    const allCookies = await page.cookies();
    
    console.log(`📦 Captured ${allCookies.length} cookies\n`);

    // Organize by domain
    const byDomain = {};
    allCookies.forEach(cookie => {
      const domain = cookie.domain || 'unknown';
      byDomain[domain] = (byDomain[domain] || 0) + 1;
    });

    console.log('📊 Cookies by domain:');
    Object.entries(byDomain).forEach(([domain, count]) => {
      console.log(`  - ${domain}: ${count} cookies`);
    });

    // Save to session file
    const sessionData = {
      service: 'google-flow',
      savedAt: new Date().toISOString(),
      method: 'realtime-capture-from-logged-in-session',
      userEmail: 'modluffy90@gmail.com',
      capturedAt: new Date().toLocaleString(),
      domains: Object.keys(byDomain),
      cookies: allCookies
    };

    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
    console.log(`\n✓ Session saved to: ${SESSION_FILE}\n`);

    // Test the cookies immediately
    console.log('🧪 Testing cookies immediately...\n');
    
    const testPage = await browser.newPage();
    testPage.setViewport({ width: 1280, height: 720 });

    // Set all captured cookies
    for (const cookie of allCookies) {
      try {
        await testPage.setCookie(cookie);
      } catch (e) {
        // Ignore
      }
    }

    // Navigate with cookies
    console.log('🌐 Navigating to Lab Flow with captured cookies...');
    const response = await testPage.goto('https://labs.google/fx/vi/tools/flow', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log(`✓ Status: ${response.status()}\n`);

    const testUrl = testPage.url();
    const isOnLoginAfterTest = await testPage.evaluate(() => {
      return document.body.innerText.includes('Try signing in') ||
             document.body.innerText.includes('Sign in');
    });

    console.log(`📍 Final URL: ${testUrl}`);

    if (isOnLoginAfterTest) {
      console.log('\n❌ Cookies expired too quickly');
      console.log('   (This is normal - OAuth tokens expire fast)\n');
    } else {
      console.log('\n✅ SUCCESS! Cookies are FRESH and VALID!');
      console.log('   Session file saved and tested successfully\n');
    }

    console.log('📸 Taking screenshot...');
    await testPage.screenshot({ path: 'live-test-result.png' });
    console.log('✓ Screenshot: live-test-result.png\n');

    console.log('⏳ Browsers will close in 10 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n✓ Done!');
    }
  }
}

captureAndTestCookies();
