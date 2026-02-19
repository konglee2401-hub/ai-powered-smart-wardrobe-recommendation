import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';

// Use stealth plugin to bypass Cloudflare bot detection
puppeteer.use(StealthPlugin());

// ==================== GROK CHAT CONFIGURATION ====================

const GROK_CONFIG = {
  baseUrl: 'https://grok.com',
  apiUrl: 'https://grok.com/rest/app-chat',
  timeout: 120000,
  waitForResponse: 60000
};

// ==================== ANALYZE WITH GROK (PURE API) ====================

export async function analyzeWithGrokAPI(imagePath, prompt) {
  const GROK_SSO = process.env.GROK_SSO;
  const GROK_SSO_RW = process.env.GROK_SSO_RW;
  const GROK_USER_ID = process.env.GROK_USER_ID;
  
  if (!GROK_SSO || !GROK_SSO_RW || !GROK_USER_ID) {
    throw new Error('Grok credentials not configured');
  }

  console.log(`   👁️  Analyzing with Grok API...`);

  let browser = null;
  
  try {
    // Build cookies string
    const cookies = `sso=${GROK_SSO}; sso-rw=${GROK_SSO_RW}; x-userid=${GROK_USER_ID}; i18nextLng=en`;

    // Launch browser for file upload with stealth mode
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    const page = await browser.newPage();

    // Set cookies
    await page.setCookie(
      {
        name: 'sso',
        value: GROK_SSO,
        domain: '.grok.com',
        path: '/',
        httpOnly: true,
        secure: true
      },
      {
        name: 'sso-rw',
        value: GROK_SSO_RW,
        domain: '.grok.com',
        path: '/',
        httpOnly: true,
        secure: true
      },
      {
        name: 'x-userid',
        value: GROK_USER_ID,
        domain: '.grok.com',
        path: '/',
        httpOnly: false,
        secure: true
      }
    );

    console.log(`   🌐 Navigating to Grok...`);
    await page.goto(GROK_CONFIG.baseUrl, {
      waitUntil: 'networkidle2',
      timeout: GROK_CONFIG.timeout
    });

    // Wait for chat interface
    console.log(`   ⏳ Waiting for chat interface...`);
    await page.waitForSelector('textarea, input[type="text"], [contenteditable="true"]', {
      timeout: 30000
    });

    // Upload image
    console.log(`   📤 Uploading image...`);
    const fileInput = await page.$('input[type="file"]');
    
    if (fileInput) {
      await fileInput.uploadFile(imagePath);
      await page.waitForTimeout(3000);
      console.log(`   ✅ Image uploaded`);
    } else {
      console.log(`   ⚠️  No file upload found, using text only`);
    }

    // Type prompt
    console.log(`   ⌨️  Typing prompt...`);
    const textArea = await page.$('textarea, [contenteditable="true"]');
    if (textArea) {
      await textArea.click();
      await page.waitForTimeout(500);
      await textArea.type(prompt, { delay: 20 });
      await page.waitForTimeout(1000);
    }

    // Send message
    console.log(`   📨 Sending message...`);
    const sendButton = await page.$('button[type="submit"], button:has-text("Send"), button:has-text("Grok")');
    if (sendButton) {
      await sendButton.click();
    } else {
      await page.keyboard.press('Enter');
    }

    // Wait for response
    console.log(`   ⏳ Waiting for response...`);
    await page.waitForTimeout(8000);

    // Extract response - try multiple selectors
    let responseText = '';
    
    // Try various selectors
    const selectors = [
      '[class*="message"]',
      '[class*="response"]',
      '[class*="answer"]',
      '[data-testid*="message"]',
      '.markdown',
      'article'
    ];
    
    for (const selector of selectors) {
      try {
        const elements = await page.$$(selector);
        for (const el of elements) {
          const text = await el.evaluate(node => node.textContent);
          if (text && text.length > 100 && !text.includes(prompt.substring(0, 50))) {
            responseText = text;
            break;
          }
        }
        if (responseText) break;
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // Fallback: get all text content
    if (!responseText || responseText.length < 50) {
      const bodyText = await page.evaluate(() => document.body.innerText);
      const lines = bodyText.split('\n').filter(line => line.length > 100);
      responseText = lines[lines.length - 1] || bodyText;
    }

    if (!responseText || responseText.length < 50) {
      throw new Error('No response received from Grok');
    }

    console.log(`   ✅ Analysis complete (${responseText.length} chars)`);

    return responseText;

  } catch (error) {
    console.error(`   ❌ Grok analysis failed:`, error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log(`   🌐 Browser closed`);
    }
  }
}

// ==================== CHECK AVAILABILITY ====================

export function isGrokAvailable() {
  return !!(process.env.GROK_SSO && process.env.GROK_SSO_RW && process.env.GROK_USER_ID);
}

// ==================== GET SETUP INSTRUCTIONS ====================

export function getGrokSetupInstructions() {
  return `
╔════════════════════════════════════════════════════════════════╗
║                  GROK CHAT SETUP GUIDE                     ║
╚════════════════════════════════════════════════════════════════╝

Grok (by xAI) provides powerful AI chat with image analysis.

📝 STEP-BY-STEP INSTRUCTIONS:

1. Go to https://grok.com/
2. Login with your X (Twitter) account
3. Open Developer Tools (F12)
4. Go to Application tab → Cookies
5. Find these cookies:
   - sso
   - sso-rw
   - x-userid
6. Copy their values
7. Add to your .env file:

   GROK_SSO=your_sso_cookie_value
   GROK_SSO_RW=your_sso_rw_cookie_value
   GROK_USER_ID=your_user_id_value

8. Restart your backend server

⚠️  IMPORTANT NOTES:
- Requires X (Twitter) account
- Cookies expire after session timeout
- Uses Grok-3 model (latest)
- Supports image analysis
- FREE for X Premium users

✅ FEATURES:
- Image analysis with Grok-3
- High quality responses
- Fast processing
- Conversation memory

🎨 MODELS:
- Grok-3 (Latest, best quality)
- Supports vision tasks

💡 TIP: Keep your cookies updated for uninterrupted service!
`;
}
