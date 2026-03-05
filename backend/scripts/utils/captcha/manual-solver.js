#!/usr/bin/env node

/**
 * Manual CAPTCHA Solver
 * 
 * Opens Google Flow project and waits for you to manually solve CAPTCHA
 * After solving, session is automatically saved for future use
 * 
 * Usage:
 *   node manual-captcha-solver.js
 * 
 * Steps:
 * 1. Script opens browser to Google Flow
 * 2. If CAPTCHA appears, solve it manually
 * 3. Page will auto-reload after CAPTCHA solve
 * 4. Script waits for page to stabilize (30 seconds)
 * 5. Session is saved automatically
 * 6. Browser closes
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

const PROJECT_ID = '58d791d4-37c9-47a8-ae3b-816733bc3ec0';
const SESSION_FILE = path.join(__dirname, '../.sessions/google-flow-session-complete.json');

async function askUser(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function solveCaptchaManually() {
  console.log('\n' + '='.repeat(80));
  console.log('  MANUAL CAPTCHA SOLVER');
  console.log('='.repeat(80) + '\n');

  let browser = null;
  let page = null;

  try {
    // Launch browser
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      headless: false,  // Show browser so user can see CAPTCHA
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Load existing session if available
    if (fs.existsSync(SESSION_FILE)) {
      console.log('📁 Loading existing session...');
      const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
      
      for (const cookie of (sessionData.cookies || [])) {
        try {
          if (cookie.domain && (cookie.domain === 'labs.google' || cookie.domain === '.labs.google')) {
            await page.setCookie(cookie);
          }
        } catch (e) {
          // Ignore cookie errors
        }
      }
      console.log(`✅ Loaded ${(sessionData.cookies || []).length} cookies\n`);
    }

    // Navigate to Google Flow
    const url = `https://labs.google/fx/vi/tools/flow/project/${PROJECT_ID}`;
    console.log(`🌐 Navigating to: ${url}\n`);
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    } catch (navError) {
      console.log('⏱️  Navigation timeout (might be waiting for CAPTCHA)');
    }

    // Wait a bit for page to load
    await page.waitForTimeout(2000);

    // Check if CAPTCHA is visible
    const hasCaptcha = await page.evaluate(() => {
      const captchaSelectors = [
        'iframe[src*="recaptcha"]',
        'iframe[src*="google.com/recaptcha"]',
        '[data-captcha-rendered="true"]',
        '.g-recaptcha',
        '#recaptcha'
      ];

      for (const selector of captchaSelectors) {
        if (document.querySelector(selector)) {
          return true;
        }
      }

      // Also check for common CAPTCHA text
      const bodyText = document.body.innerText.toLowerCase();
      return bodyText.includes('verify that you\'re human') || 
             bodyText.includes('verify you\'re not a robot');
    });

    if (hasCaptcha) {
      console.log('🤖 CAPTCHA DETECTED!\n');
      console.log('📋 Instructions:');
      console.log('   1. Look at the browser window');
      console.log('   2. Complete the CAPTCHA manually');
      console.log('   3. After solving, the page will reload automatically');
      console.log('   4. This script will wait for the page to stabilize\n');
      
      console.log('⏳ Waiting for CAPTCHA to be solved...');
      console.log('   (Timeout: 5 minutes or press ENTER to skip check)\n');

      // Set up page reload/navigation listener
      let pageNavigated = false;
      page.on('framenavigated', () => {
        pageNavigated = true;
        console.log('   📄 Page navigated detected');
      });

      // Wait for page to reload after CAPTCHA is solved
      let solved = false;
      const startTime = Date.now();
      const timeout = 5 * 60 * 1000; // 5 minutes

      // Also listen for user pressing Enter
      const userPressedEnter = new Promise((resolve) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        console.log('   💡 Or press ENTER to continue manually\n');
        
        rl.on('line', () => {
          rl.close();
          resolve(true);
        });
      });

      // Race between CAPTCHA solve detection and timeout
      const captchaCheckPromise = (async () => {
        while (!solved && (Date.now() - startTime) < timeout) {
          try {
            // Check 1: If page navigated, give it more time to load
            if (pageNavigated) {
              console.log('   🔄 Page reloading after CAPTCHA solve. Waiting for content...');
              for (let i = 0; i < 10 && !solved; i++) {
                await page.waitForTimeout(1000);
                
                const hasContent = await page.evaluate(() => {
                  return document.querySelector('[data-testid="virtuoso-item-list"]') !== null ||
                         document.querySelector('[role="main"]') !== null;
                });

                if (hasContent) {
                  solved = true;
                  console.log('   ✅ Content loaded!');
                  break;
                }
              }
              if (solved) break;
            }

            // Check 2: Direct CAPTCHA detection
            const stillHasCaptcha = await page.evaluate(() => {
              const captchaSelectors = [
                'iframe[src*="recaptcha"]',
                'iframe[src*="google.com/recaptcha"]',
                '[data-captcha-rendered="true"]',
                '.g-recaptcha'
              ];

              for (const selector of captchaSelectors) {
                const el = document.querySelector(selector);
                if (el) {
                  const rect = el.getBoundingClientRect();
                  if (rect.height > 0 && rect.width > 0) {
                    return true;
                  }
                }
              }
              return false;
            });

            // Check 3: If CAPTCHA is gone, page loaded, and main content visible
            if (!stillHasCaptcha) {
              const hasContent = await page.evaluate(() => {
                const content = document.querySelector('[data-testid="virtuoso-item-list"]') ||
                               document.querySelector('[role="main"]');
                return content !== null && content.innerHTML.length > 100;
              });

              if (hasContent) {
                solved = true;
                console.log('   ✅ CAPTCHA solved! Page loaded successfully\n');
              }
            }

            await page.waitForTimeout(1000);
          } catch (checkError) {
            // Page might be reloading, ignore and retry
            await page.waitForTimeout(1000);
          }
        }

        return solved;
      })();

      // Wait for either CAPTCHA solve or user pressing Enter
      const result = await Promise.race([
        captchaCheckPromise,
        userPressedEnter
      ]);

      if (result === true && !solved) {
        console.log('   ✅ Continuing (you pressed ENTER)\n');
      } else if (!solved && (Date.now() - startTime) >= timeout) {
        console.warn('\n⚠️  CAPTCHA timeout - script will continue anyway\n');
      }
    } else {
      console.log('✅ No CAPTCHA detected - page loaded normally\n');
    }

    // Wait for page to be fully ready
    console.log('⏳ Waiting for page to stabilize (30 seconds)...');
    await page.waitForTimeout(30000);

    // Check page readiness
    const pageReady = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      const hasFileInput = document.querySelector('input[type="file"]') !== null;
      const hasContent = document.querySelector('[data-testid="virtuoso-item-list"]') !== null;
      
      return buttons.length > 0 && hasFileInput && hasContent;
    });

    if (pageReady) {
      console.log('   ✅ Page is ready\n');
    } else {
      console.log('   ⚠️  Page might not be fully loaded\n');
    }

    // Ask user if they want to save session
    const shouldSave = await askUser('💾 Save current session? (y/n): ');

    if (shouldSave.toLowerCase() === 'y' || shouldSave.toLowerCase() === 'yes') {
      console.log('\n📝 Saving session...');

      // Get current cookies using proper CDP session
      let cookies = [];
      try {
        const cdpSession = await page.target().createCDPSession();
        const allCookies = await cdpSession.send('Network.getAllCookies');
        cookies = (allCookies.cookies || []).filter(c => {
          const domain = c.domain || '';
          return domain.includes('labs.google') || domain.includes('google.com');
        });
        await cdpSession.detach();
      } catch (cdpError) {
        console.warn(`⚠️  Could not get all cookies via CDP: ${cdpError.message}`);
        // Fallback: use page.cookies() which only gets current domain
        cookies = await page.cookies();
      }

      // Get localStorage
      const localStorage = await page.evaluate(() => {
        const items = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && !key.includes('grecaptcha')) {
            items[key] = window.localStorage.getItem(key);
          }
        }
        return items;
      });

      // Save session
      const sessionData = {
        timestamp: new Date().toISOString(),
        projectId: PROJECT_ID,
        cookies,
        localStorage,
        metadata: {
          browser: 'puppeteer',
          captchaSolved: true
        }
      };

      fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
      fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2), 'utf8');

      console.log(`✅ Session saved to: ${SESSION_FILE}`);
      console.log(`   📊 Cookies: ${cookies.length}`);
      console.log(`   📚 localStorage items: ${Object.keys(localStorage).length}\n`);
    }

    console.log('ℹ️  Keeping browser open for 10 more seconds (close manually if needed)...\n');
    await page.waitForTimeout(10000);

    console.log('✅ Done! Session ready for use.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // Ignore close errors
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('  SOLVER COMPLETED');
    console.log('='.repeat(80) + '\n');
    
    process.exit(0);
  }
}

// Run the solver
solveCaptchaManually().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
