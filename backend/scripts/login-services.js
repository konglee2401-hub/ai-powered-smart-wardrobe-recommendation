#!/usr/bin/env node

/**
 * Login Script
 * 
 * Use this script to login to browser services (Z.AI Image, Grok)
 * Run this first before running tests that require authentication
 * 
 * Usage:
 *   node scripts/login-services.js           # Login to all services
 *   node scripts/login-services.js zai      # Login to Z.AI only
 *   node scripts/login-services.js grok     # Login to Grok only
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Apply stealth plugin
puppeteer.use(StealthPlugin());

const SERVICE_URLS = {
  zai: 'https://image.z.ai',
  grok: 'https://grok.com'
};

async function loginToZAI() {
  console.log('\n🔐 Logging into Z.AI Image...');
  console.log('='.repeat(60));
  
  const browser = await puppeteer.launch({
    channel: 'chrome',
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: null // Use default viewport
  });

  const page = await browser.newPage();
  
  try {
    await page.goto('https://image.z.ai', { waitUntil: 'networkidle0', timeout: 30000 });
    
    console.log('📍 Please login to Z.AI Image in the opened browser');
    console.log('⏳ Waiting for login to complete...');
    
    // Wait for user to login - check for logged in state
    await page.waitForFunction(() => {
      // Check if login is complete (different for each site)
      const url = window.location.href;
      const hasLoginButton = document.querySelector('button:contains("Login"), a:contains("Login")');
      const bodyText = document.body.innerText;
      
      // If we see the main interface, login is likely complete
      return url.includes('image.z.ai') && !url.includes('login') && !url.includes('signin');
    }, { timeout: 300000 }); // 5 minutes timeout for manual login
    
    console.log('✅ Z.AI Image login detected!');
    
    // Save cookies
    const cookies = await page.cookies();
    const fs = await import('fs');
    fs.writeFileSync(
      path.join(__dirname, '../data/sessions/zai-image-cookies.json'),
      JSON.stringify(cookies, null, 2)
    );
    console.log('💾 Saved Z.AI cookies');
    
  } catch (error) {
    console.log('⚠️ Login check timeout or error:', error.message);
    console.log('💾 Still saving cookies...');
    
    try {
      const cookies = await page.cookies();
      const fs = await import('fs');
      fs.writeFileSync(
        path.join(__dirname, '../data/sessions/zai-image-cookies.json'),
        JSON.stringify(cookies, null, 2)
      );
      console.log('💾 Saved Z.AI cookies');
    } catch (e) {
      console.log('❌ Could not save cookies');
    }
  }
  
  console.log('🔒 Please complete Z.AI login manually if not done yet');
  console.log('⏸️  Press Enter in this terminal when done (or wait 2 minutes)...');
  
  await new Promise(resolve => setTimeout(resolve, 120000));
  
  await browser.close();
  console.log('✅ Z.AI login session complete');
}

async function loginToGrok() {
  console.log('\n🔐 Logging into Grok...');
  console.log('='.repeat(60));
  
  const browser = await puppeteer.launch({
    channel: 'chrome',
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: null
  });

  const page = await browser.newPage();
  
  try {
    await page.goto('https://grok.com', { waitUntil: 'networkidle0', timeout: 30000 });
    
    console.log('📍 Please login to Grok in the opened browser');
    console.log('⏳ Waiting for login to complete...');
    
    await page.waitForFunction(() => {
      const url = window.location.href;
      return url.includes('grok.com') && !url.includes('login') && !url.includes('signin');
    }, { timeout: 300000 });
    
    console.log('✅ Grok login detected!');
    
    const cookies = await page.cookies();
    const fs = await import('fs');
    fs.writeFileSync(
      path.join(__dirname, '../data/sessions/grok-cookies.json'),
      JSON.stringify(cookies, null, 2)
    );
    console.log('💾 Saved Grok cookies');
    
  } catch (error) {
    console.log('⚠️ Login check timeout or error:', error.message);
    try {
      const cookies = await page.cookies();
      const fs = await import('fs');
      fs.writeFileSync(
        path.join(__dirname, '../data/sessions/grok-cookies.json'),
        JSON.stringify(cookies, null, 2)
      );
      console.log('💾 Saved Grok cookies');
    } catch (e) {
      console.log('❌ Could not save cookies');
    }
  }
  
  console.log('🔒 Please complete Grok login manually if not done yet');
  console.log('⏸️  Press Enter in this terminal when done (or wait 2 minutes)...');
  
  await new Promise(resolve => setTimeout(resolve, 120000));
  
  await browser.close();
  console.log('✅ Grok login session complete');
}

async function main() {
  const args = process.argv.slice(2);
  const target = args[0] || 'all';
  
  console.log('\n' + '='.repeat(60));
  console.log('🔐 BROWSER SERVICES LOGIN SCRIPT');
  console.log('='.repeat(60));
  console.log(`Target: ${target}`);
  console.log('');
  
  // Ensure data directory exists
  const fs = await import('fs');
  const dataDir = path.join(__dirname, '../data/sessions');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (target === 'all' || target === 'zai') {
    await loginToZAI();
  }
  
  if (target === 'all' || target === 'grok') {
    await loginToGrok();
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ All login sessions complete!');
  console.log('='.repeat(60));
  console.log('\nYou can now run tests with saved sessions.');
  console.log('Note: Cookies are saved to backend/data/sessions/');
}

main().catch(console.error);
