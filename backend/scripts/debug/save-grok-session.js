#!/usr/bin/env node

/**
 * Save Grok Session Script
 * 
 * This script will:
 * 1. Launch browser with existing Chrome profile
 * 2. Navigate to grok.com (user must be logged in)
 * 3. Save session (cookies + localStorage) to file
 * 
 * Run: node scripts/save-grok-session.js
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Apply stealth plugin
puppeteer.use(StealthPlugin());

const SESSION_FILE = path.join(process.cwd(), 'backend', '.sessions', 'grok-session.json');

// Get Chrome User Data directory
const chromeUserDataDir = path.join(
  process.env.LOCALAPPDATA || os.homedir(),
  'Google',
  'Chrome',
  'User Data'
);

async function saveSession() {
  console.log('==================================================');
  console.log(' Save Grok Session');
  console.log('==================================================');
  console.log('');
  
  // Launch browser
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
      '--disable-gpu'
    ],
    defaultViewport: { width: 1280, height: 800 }
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate to grok.com
    console.log('📍 Navigating to https://grok.com...');
    await page.goto('https://grok.com', { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('✅ Page loaded');
    
    // Wait for user to login (if not already logged in)
    console.log('');
    console.log('⏳ Please login to Grok if not already logged in...');
    console.log('   (The script will wait for you to be logged in)');
    
    // Wait for login status
    let isLoggedIn = false;
    let checkCount = 0;
    
    while (!isLoggedIn && checkCount < 120) { // 2 minutes max
      await new Promise(resolve => setTimeout(resolve, 1000));
      checkCount++;
      
      const status = await page.evaluate(() => {
        const bodyText = document.body.innerText.toLowerCase();
        const hasSignIn = bodyText.includes('sign in') || bodyText.includes('sign up');
        const hasChatInput = document.querySelector('textarea') !== null ||
                            document.querySelector('[contenteditable="true"]') !== null;
        return { isLoggedIn: !hasSignIn && hasChatInput, hasChatInput };
      });
      
      if (status.isLoggedIn) {
        isLoggedIn = true;
        console.log('✅ Logged in detected!');
        break;
      }
      
      if (checkCount % 10 === 0) {
        process.stdout.write(`\r   Waiting for login... ${checkCount}s`);
      }
    }
    console.log('');
    
    if (!isLoggedIn) {
      throw new Error('Login not detected within 2 minutes. Please login manually and run script again.');
    }
    
    // Wait a bit for page to fully load
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Save session
    console.log('');
    console.log('💾 Saving session...');
    
    // Get all cookies
    const cookies = await page.cookies();
    console.log(`   Cookies: ${cookies.length}`);
    
    // Get localStorage
    const localStorage = await page.evaluate(() => {
      const data = {};
      const keys = ['xai-ff-bu', 'chat-preferences', 'user-settings', 'anonUserId', 'user-prefs', 'grok-ui-prefs'];
      for (const key of keys) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            data[key] = value;
          }
        } catch (e) {}
      }
      return data;
    });
    console.log(`   LocalStorage: ${Object.keys(localStorage).length} keys`);
    
    const sessionData = {
      service: 'grok',
      savedAt: new Date().toISOString(),
      cookies,
      localStorage
    };
    
    // Ensure directory exists
    const dir = path.dirname(SESSION_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
    console.log('');
    console.log(`✅ Session saved to: ${SESSION_FILE}`);
    console.log('');
    console.log('🎉 Session saved successfully!');
    console.log('   You can now use this session for automated Grok operations.');
    
    // Keep browser open for 10 seconds for verification
    console.log('');
    console.log('Browser will stay open for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('');
    console.error('❌ Error:', error.message);
  } finally {
    console.log('');
    console.log('🔒 Closing browser...');
    await browser.close();
    console.log('✅ Done');
  }
}

saveSession().catch(console.error);
