#!/usr/bin/env node

/**
 * Smart-Wardrobe Project Info Sender to Grok
 * 
 * Gửi thông tin về dự án Smart-Wardrobe lên Grok project
 * Để Grok có thể giúp review, suggest improvements, etc.
 * 
 * Usage:
 *   node scripts/send-project-to-grok.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { restoreGrokSession } from './grok-auto-login-v2-cloudflare-fix.js';
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

function generateProjectSummary() {
  const summary = `
# Smart-Wardrobe Project Context

## Project Overview
- **Name**: Smart-Wardrobe Affiliate AI
- **Purpose**: AI-powered affiliate marketing with image/video generation and content automation
- **Repository**: c:/Work/Affiliate-AI/smart-wardrobe
- **Stack**: Node.js, Puppeteer, Express, Docker

## Current Status
### ✅ RECENTLY COMPLETED (March 1, 2026)
1. **Grok Session Management System**
   - Created session capture/restore scripts
   - Implemented Cloudflare bypass using "timing fix" method
   - Scripts: grok-session-capture.js, grok-auto-login-v2-cloudflare-fix.js
   - Tested: Method 1 (timing fix) = SUCCESS
   - Session valid for 30 days with critical cookies (cf_clearance, sso, sso-rw)

2. **GrokServiceV2 Integration**
   - Integrated tested Cloudflare bypass into main service
   - Simplified from 150+ lines to clean function call
   - Handles both .grok.com and .x.ai domains
   - Auto-restores session before each image generation

3. **Browser Automation Improvements**
   - Fixed cookie injection timing (navigate → cookies → reload)
   - Support for both .grok.com and .x.ai cookies
   - Enhanced stealth to avoid Cloudflare detection

## Project Structure
\`\`\`
smart-wardrobe/
├── backend/
│   ├── scripts/
│   │   ├── grok-*.js (session management)
│   │   └── test-cloudflare-methods.js
│   ├── services/
│   │   ├── grokServiceV2.js (UPDATED with Cloudflare bypass)
│   │   └── browser/
│   │       ├── browserService.js
│   │       └── sessionManager.js
│   ├── .sessions/
│   │   ├── grok-session-complete.json (user's real session)
│   │   └── grok-session-backup-*.json
│   └── docs/
│       └── CLOUDFLARE_BYPASS_STRATEGIES.md
├── frontend/
│   └── [React/Vue UI components]
└── docker-compose.yml
\`\`\`

## Key Challenges & Solutions

### Challenge 1: Cloudflare Protection
**Problem**: Grok.com blocks Puppeteer with Cloudflare protection
**Solution**: Timing fix method (navigate first, then cookies)
**Status**: ✅ SOLVED - Tested successfully

### Challenge 2: Session Management
**Problem**: Sessions expire, cookies need refresh
**Solution**: Auto-capture system, session file storage
**Status**: ✅ SOLVED - 30-day session validated

### Challenge 3: Cookie Domain Issues
**Problem**: Grok uses .grok.com AND .x.ai domains
**Solution**: Updated capture to get ALL browser cookies
**Status**: ✅ SOLVED - 13 cookies from both domains

## Technology Stack
- **Puppeteer**: Browser automation with stealth plugin
- **Node.js**: Server runtime
- **Express**: API framework
- **Docker**: Containerization
- **FFmpeg**: Video processing
- **ImageMagick**: Image processing
- **n8n**: Workflow automation

## User's Account
- **Grok Account**: Active with Grok-420 model unlocked
- **Session Tokens**: Valid for 180 days (from 2026-03-01)
- **Anonymous User ID**: cf864f79-fd01-4ae2-94fd-a48bdf708123
- **Preferred Language**: Vietnamese (vi)

## Next Steps / Todo
[ ] Test GrokServiceV2 in actual image generation workflow
[ ] Create integration tests
[ ] Monitor session expiry and implement auto-refresh
[ ] Implement direct API calls (for production scale)
[ ] Set up automated session refresh (every 20 days)

## Questions for Grok
1. Có cách nào tốt hơn để handle Cloudflare protection không?
2. Should we implement direct API calls instead of browser automation for scaling?
3. Có best practices nào cho session management trong production?
4. Performance improvement suggestions cho project này?

---
Date Generated: ${new Date().toLocaleString()}
`;

  return summary;
}

async function sendProjectInfoToGrok() {
  console.log('\n' + '═'.repeat(80));
  console.log('📤 SMART-WARDROBE PROJECT INFO → GROK');
  console.log('═'.repeat(80) + '\n');

  let browser;

  try {
    // Get project URL
    const projectUrl = await askQuestion(
      'Enter Grok project URL\n(default: https://grok.com/project/7fce8c87-7f2f-4325-9e7e-80ba2705d30f): '
    );
    
    const finalUrl = projectUrl.trim() || 'https://grok.com/project/7fce8c87-7f2f-4325-9e7e-80ba2705d30f';

    // Generate project summary
    console.log('📋 Generating project summary...');
    const summary = generateProjectSummary();
    console.log('✅ Summary generated\n');

    // Ask what to do
    console.log('Options:');
    console.log('  1. Send project summary to Grok');
    console.log('  2. Ask a specific question about the project');
    console.log('  3. Review the summary first (in console)\n');

    const choice = await askQuestion('What would you like to do? (1/2/3): ');

    if (choice === '3') {
      console.log('\n' + '─'.repeat(80));
      console.log(summary);
      console.log('─'.repeat(80) + '\n');
      const proceed = await askQuestion('Proceed to send to Grok? (y/n): ');
      if (proceed.toLowerCase() !== 'y') {
        console.log('Aborted.\n');
        process.exit(0);
      }
    }

    let messageToSend = '';

    if (choice === '1') {
      messageToSend = `Please review this Smart-Wardrobe project summary and provide feedback:\n\n${summary}`;
    } else if (choice === '2') {
      const customQuestion = await askQuestion('\nAsk Grok (in English or Vietnamese): ');
      messageToSend = `${customQuestion}\n\nProject context:\n${summary}`;
    } else {
      messageToSend = `Please review this Smart-Wardrobe project summary and provide feedback:\n\n${summary}`;
    }

    // Launch browser
    console.log('\n🌐 Launching browser...');
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
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    console.log('✅ Browser launched\n');

    // Restore session
    console.log('🔐 Restoring session...');
    const sessionRestored = await restoreGrokSession(page);
    if (!sessionRestored) {
      console.log('⚠️  Session restore incomplete\n');
    } else {
      console.log('✅ Session restored\n');
    }

    // Navigate to project
    console.log(`📍 Navigating to: ${finalUrl}\n`);
    try {
      await page.goto(finalUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      console.log('✅ Project loaded\n');
    } catch (e) {
      console.log(`⚠️  Navigation: ${e.message}\n`);
    }

    await page.waitForTimeout(3000);

    // Send message
    console.log('✉️  Sending message to Grok...\n');
    
    // Click on chat input
    try {
      const inputSelector = '[contenteditable="true"]';
      
      // Find and click
      const inputElement = await page.$(inputSelector);
      if (!inputElement) {
        console.log('⚠️  Chat input not found. Trying screenshot method...');
        const screenshotPath = path.join(__dirname, '../grok-chat-screenshot.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`📸 Screenshot: ${screenshotPath}\n`);
      } else {
        // Click and type
        await page.click(inputSelector);
        await page.waitForTimeout(500);

        // Type the message (in chunks if very long)
        const chunks = messageToSend.match(/[\s\S]{1,500}/g) || [];
        for (const chunk of chunks) {
          await page.type(inputSelector, chunk, { delay: 10 });
        }

        await page.waitForTimeout(1000);

        // Find send button and click
        const sendButtons = await page.$$('button');
        let sent = false;

        for (const btn of sendButtons) {
          const text = await page.evaluate(el => el.textContent || el.innerText, btn);
          if (text.includes('Send') || text.includes('→') || text.includes('➤')) {
            await btn.click();
            sent = true;
            console.log('✅ Message sent!');
            break;
          }
        }

        if (!sent) {
          console.log('⚠️  Send button not found');
        }
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}\n`);
    }

    // Wait and show result
    console.log('\n⏳ Waiting for Grok to process...');
    await page.waitForTimeout(5000);

    // Screenshot final state
    const finalScreenshot = path.join(__dirname, '../grok-final-state.png');
    await page.screenshot({ path: finalScreenshot, fullPage: true });
    console.log(`📸 Current state: ${finalScreenshot}\n`);

    // Ask to keep open
    const keepOpen = await askQuestion('Keep browser open? (y/n): ');
    if (keepOpen.toLowerCase() !== 'y') {
      await browser.close();
    } else {
      console.log('\n📌 Browser is open. Close when done.\n');
    }

    console.log('═'.repeat(80));
    console.log('✅ COMPLETE\n');

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    if (browser) await browser.close();
    process.exit(1);
  }
}

sendProjectInfoToGrok().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
