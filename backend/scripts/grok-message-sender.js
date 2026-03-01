#!/usr/bin/env node

/**
 * Grok Service Integration - Send Messages to Grok Projects
 * 
 * Thực hiện tích hợp GrokServiceV2 vào dự án và gửi tin nhắn/câu hỏi
 * 
 * Usage:
 *   node scripts/grok-message-sender.js --url <project-url> --message "Your message here"
 *   
 * Example:
 *   node scripts/grok-message-sender.js \
 *     --url "https://grok.com/project/7fce8c87-7f2f-4325-9e7e-80ba2705d30f" \
 *     --message "Hãy giúp tôi review code này"
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { restoreGrokSession } from './grok-auto-login-v2-cloudflare-fix.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

puppeteer.use(StealthPlugin());

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function sendMessageToGrok(projectUrl, message) {
  console.log('\n' + '═'.repeat(80));
  console.log('🤖 GROK SERVICE - MESSAGE SENDER');
  console.log('═'.repeat(80) + '\n');

  let browser;

  try {
    console.log('1️⃣  Launching browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Add stealth headers
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    console.log('✅ Browser launched\n');

    // STEP 1: Restore session with Cloudflare bypass
    console.log('2️⃣  Restoring session...');
    const sessionRestored = await restoreGrokSession(page);
    
    if (!sessionRestored) {
      console.log('⚠️  Session restore incomplete, but continuing...\n');
    } else {
      console.log('✅ Session restored\n');
    }

    // STEP 2: Navigate to project URL
    console.log(`3️⃣  Navigating to project: ${projectUrl}\n`);
    try {
      await page.goto(projectUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      console.log('✅ Project page loaded\n');
    } catch (error) {
      console.log(`⚠️  Navigation timeout: ${error.message}\n`);
    }

    // Wait for page to stabilize
    await page.waitForTimeout(3000);

    // STEP 3: Find and focus chat input
    console.log('4️⃣  Finding chat input...');
    
    // Multiple selectors for chat input (try different Grok UI versions)
    const inputSelectors = [
      '[contenteditable="true"]',
      'textarea',
      '[role="textbox"]',
      'input[type="text"]',
      '.chat-input',
      '[data-testid*="message"]',
      '[placeholder*="Ask"]',
      '[placeholder*="Type"]'
    ];

    let found = false;
    for (const selector of inputSelectors) {
      try {
        const exists = await page.$(selector);
        if (exists) {
          console.log(`   ✅ Found: ${selector}\n`);
          found = true;
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }

    if (!found) {
      console.log('❌ Could not find chat input. Trying alternative method...\n');
      
      // Take screenshot for debugging
      const screenshotPath = path.join(__dirname, '../debug-screenshot.png');
      await page.screenshot({ path: screenshotPath });
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
      console.log('   Check screenshot to see current page state\n');
    }

    // STEP 4: Send message
    if (message) {
      console.log('5️⃣  Sending message...\n');
      console.log(`📝 Message:\n${message}\n`);

      try {
        // Try to click and type in chat input
        const inputSelector = '[contenteditable="true"]';
        
        // Click on input
        await page.click(inputSelector);
        await page.waitForTimeout(500);

        // Type message
        await page.evaluate((text) => {
          const input = document.querySelector('[contenteditable="true"]');
          if (input) {
            input.textContent = text;
            // Trigger input event
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, message);

        await page.waitForTimeout(1000);

        // Find and click send button
        const sendButtonSelectors = [
          'button[aria-label*="Send"]',
          'button[aria-label*="send"]',
          '[data-testid*="send"]',
          'button[title*="Send"]',
          '.send-button',
          'button:has-text("Send")'
        ];

        let foundSendButton = false;
        for (const selector of sendButtonSelectors) {
          try {
            const buttons = await page.$$(selector.replace(':has-text', ''));
            for (const btn of buttons) {
              const text = await page.evaluate(el => el.innerText || el.textContent, btn);
              if (text.toLowerCase().includes('send') || text.includes('➤') || text.includes('→')) {
                await btn.click();
                foundSendButton = true;
                break;
              }
            }
            if (foundSendButton) break;
          } catch (e) {
            // Try next selector
          }
        }

        if (foundSendButton) {
          console.log('✅ Message sent!\n');
          
          // Wait for response
          console.log('6️⃣  Waiting for Grok\'s response (30 seconds)...\n');
          await page.waitForTimeout(5000);

          // Capture response
          const response = await page.evaluate(() => {
            // Try to get the last message from Grok
            const messages = document.querySelectorAll('[role="article"], .message, [data-testid*="message"]');
            if (messages.length > 0) {
              const lastMessage = messages[messages.length - 1];
              return lastMessage?.innerText || 'Response received but could not extract text';
            }
            return 'No response captured';
          });

          console.log('📨 Grok Response:\n');
          console.log(response);
          console.log('\n');
        } else {
          console.log('⚠️  Could not find send button. Message may not be sent.\n');
        }

      } catch (error) {
        console.error(`❌ Error sending message: ${error.message}\n`);
      }
    }

    // STEP 5: Keep browser open or close
    console.log('═'.repeat(80));
    console.log('\n✅ Operation complete\n');

    const keepOpen = await askQuestion('Keep browser open for verification? (y/n): ');
    if (keepOpen.toLowerCase() === 'y') {
      console.log('\n📌 Browser will stay open. Close it manually when done.\n');
      return;
    }

    await browser.close();

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let projectUrl = '';
  let message = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--url' && i + 1 < args.length) {
      projectUrl = args[i + 1];
    }
    if (args[i] === '--message' && i + 1 < args.length) {
      message = args[i + 1];
    }
  }

  // If no URL provided, ask for it
  if (!projectUrl) {
    console.log('\n📖 GROK PROJECT MESSAGE SENDER\n');
    projectUrl = await askQuestion('Enter Grok project URL: ');
  }

  // If no message provided, ask for it
  if (!message) {
    message = await askQuestion('\nEnter your message/question: ');
  }

  // Validate URL
  if (!projectUrl.includes('grok.com')) {
    console.log('❌ Invalid URL. Must be a grok.com project URL.');
    process.exit(1);
  }

  // Send message
  await sendMessageToGrok(projectUrl, message);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
