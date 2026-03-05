#!/usr/bin/env node
/**
 * BFL Playground Manual Login Script
 * 
 * This script opens a browser for manual login to BFL Playground,
 * then captures and saves the session for automated use.
 * 
 * Usage:
 *   node scripts/bfl-login.js
 *   node scripts/bfl-login.js --profile "Profile 2"
 *   node scripts/bfl-login.js --clear
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Apply stealth plugin
puppeteer.use(StealthPlugin());

const SESSION_DIR = path.join(__dirname, '../sessions');
const SESSION_FILE = path.join(SESSION_DIR, 'bfl-session.json');

// Parse command line args
const args = process.argv.slice(2);
const profileArg = args.find(a => a.startsWith('--profile'));
const profileName = profileArg ? profileArg.split('=')[1] || args[args.indexOf(profileArg) + 1] : 'Profile 1';
const shouldClear = args.includes('--clear');

/**
 * Create readline interface for user input
 */
function createRL() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Prompt user for input
 */
function prompt(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Clear saved session
 */
function clearSession() {
  if (fs.existsSync(SESSION_FILE)) {
    fs.unlinkSync(SESSION_FILE);
    console.log('🗑️  Cleared existing session');
  }
}

/**
 * Main login flow
 */
async function main() {
  console.log('\n🔑 BFL PLAYGROUND MANUAL LOGIN');
  console.log('='.repeat(60));
  console.log('');
  
  if (shouldClear) {
    clearSession();
  }
  
  // Check for existing session
  if (fs.existsSync(SESSION_FILE)) {
    const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    const age = Date.now() - (session.timestamp || 0);
    const hours = Math.floor(age / (1000 * 60 * 60));
    
    console.log('📦 Found existing session:');
    console.log(`   Saved: ${session.metadata?.savedAt || 'Unknown'}`);
    console.log(`   Age: ${hours} hours`);
    console.log(`   Cookies: ${session.cookies?.length || 0}`);
    console.log('');
    
    const rl = createRL();
    const answer = await prompt(rl, 'Use existing session? (Y/n/r to renew): ');
    rl.close();
    
    if (answer.toLowerCase() === 'r') {
      clearSession();
    } else if (answer.toLowerCase() !== 'n') {
      console.log('✅ Using existing session');
      console.log('   Run test script: node scripts/bfl-test.js');
      process.exit(0);
    }
  }
  
  console.log(`🌐 Launching browser with Chrome profile: ${profileName}`);
  console.log('');
  
  // Get Chrome User Data directory
  const chromeUserDataDir = path.join(
    process.env.LOCALAPPDATA || process.env.HOME,
    'Google',
    'Chrome',
    'User Data'
  );
  
  console.log(`📁 Chrome User Data: ${chromeUserDataDir}`);
  console.log('');
  
  // Launch browser
  const browser = await puppeteer.launch({
    channel: 'chrome',
    headless: false,
    args: [
      `--user-data-dir=${chromeUserDataDir}`,
      `--profile-directory=${profileName}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--start-maximized'
    ],
    defaultViewport: null
  });
  
  const page = await browser.newPage();
  
  // Inject stealth measures
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.chrome = { runtime: {} };
  });
  
  // Navigate to BFL Playground
  console.log('🌐 Navigating to BFL Playground...');
  await page.goto('https://playground.bfl.ai/lab/flux-2-klein', {
    waitUntil: 'networkidle2',
    timeout: 60000
  });
  
  console.log('');
  console.log('📱 INSTRUCTIONS:');
  console.log('   1. Log in to your BFL account in the browser window');
  console.log('   2. Complete any 2FA if required');
  console.log('   3. Make sure you can see the generation interface');
  console.log('   4. Come back here and press ENTER to save session');
  console.log('');
  
  const rl = createRL();
  await prompt(rl, 'Press ENTER after you have logged in successfully...');
  
  // Capture session
  console.log('');
  console.log('📦 Capturing session...');
  
  try {
    // Get cookies
    const cookies = await page.cookies();
    
    // Get localStorage
    const localStorage = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        items[key] = window.localStorage.getItem(key);
      }
      return items;
    });
    
    // Get sessionStorage
    const sessionStorage = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        items[key] = window.sessionStorage.getItem(key);
      }
      return items;
    });
    
    // Get current state
    const url = page.url();
    const title = await page.title();
    
    // Save session
    const session = {
      timestamp: Date.now(),
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      url,
      title,
      cookies,
      localStorage,
      sessionStorage,
      metadata: {
        provider: 'bfl',
        savedAt: new Date().toISOString(),
        profile: profileName
      }
    };
    
    // Ensure directory exists
    if (!fs.existsSync(SESSION_DIR)) {
      fs.mkdirSync(SESSION_DIR, { recursive: true });
    }
    
    fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2));
    
    console.log('');
    console.log('✅ SESSION SAVED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`📁 File: ${SESSION_FILE}`);
    console.log(`🍪 Cookies: ${cookies.length}`);
    console.log(`💾 localStorage: ${Object.keys(localStorage).length} items`);
    console.log(`🔗 URL: ${url}`);
    console.log('');
    console.log('Next steps:');
    console.log('   - Test session: node scripts/bfl-test.js');
    console.log('   - Generate image: use BFLPlaygroundService in your code');
    console.log('');
    
  } catch (error) {
    console.error(`❌ Failed to save session: ${error.message}`);
  }
  
  rl.close();
  
  // Ask if should close browser
  const rl2 = createRL();
  const closeBrowser = await prompt(rl2, 'Close browser? (Y/n): ');
  rl2.close();
  
  if (closeBrowser.toLowerCase() !== 'n') {
    await browser.close();
  }
  
  console.log('👋 Done!');
}

main().catch(console.error);
