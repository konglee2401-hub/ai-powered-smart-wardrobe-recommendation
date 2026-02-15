// ⚠️ TEMPORARILY DISABLED - Cookie authentication issue
// Will be re-implemented using direct API calls when Z.AI provides official API access

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

// ==================== Z.AI CHAT CONFIGURATION ====================

const ZAI_CHAT_CONFIG = {
  url: 'https://chat.z.ai/',
  timeout: 60000,
  waitForResponse: 30000
};

// ==================== ANALYZE WITH Z.AI CHAT ====================

// TEMPORARILY DISABLED - Function throws error to prevent usage
export async function analyzeWithZAIChat(imagePath, prompt) {
  throw new Error('Z.AI Chat is temporarily disabled due to cookie authentication issues. Will be re-implemented with official API when available.');
  
  // Original implementation commented out below:
  /*
  const ZAI_SESSION = process.env.ZAI_SESSION;
  
  if (!ZAI_SESSION) {
    throw new Error('Z.AI session not configured');
  }

  console.log(`   👁️  Analyzing with Z.AI Chat (browser automation)...`);
  console.log(`   🌐 Opening browser...`);

  let browser = null;
  
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set session cookie
    await page.setCookie({
      name: 'session',
      value: ZAI_SESSION,
      domain: '.z.ai',
      path: '/',
      httpOnly: true,
      secure: true
    });

    console.log(`   🌐 Navigating to Z.AI Chat...`);
    await page.goto(ZAI_CHAT_CONFIG.url, {
      waitUntil: 'networkidle2',
      timeout: ZAI_CHAT_CONFIG.timeout
    });

    // Wait for chat interface
    console.log(`   ⏳ Waiting for chat interface...`);
    await page.waitForSelector('textarea, input[type="text"]', {
      timeout: 30000
    });

    // Upload image
    console.log(`   📤 Uploading image...`);
    const fileInput = await page.$('input[type="file"]');
    
    if (fileInput) {
      await fileInput.uploadFile(imagePath);
      await page.waitForTimeout(2000);
    } else {
      console.log(`   ⚠️  No file upload found, proceeding with text only`);
    }

    // Type prompt
    console.log(`   ⌨️  Typing prompt...`);
    const textArea = await page.$('textarea');
    if (textArea) {
      await textArea.type(prompt);
      await page.waitForTimeout(1000);
    }

    // Send message
    console.log(`   📨 Sending message...`);
    const sendButton = await page.$('button[type="submit"], button:has-text("Send")');
    if (sendButton) {
      await sendButton.click();
    } else {
      await page.keyboard.press('Enter');
    }

    // Wait for response
    console.log(`   ⏳ Waiting for response...`);
    await page.waitForTimeout(5000);

    // Extract response
    const messages = await page.$$eval('.message, .response, [class*="message"]', elements => {
      return elements.map(el => el.textContent.trim()).filter(text => text.length > 50);
    });

    const analysis = messages[messages.length - 1] || '';

    if (!analysis) {
      throw new Error('No response received from Z.AI Chat');
    }

    console.log(`   ✅ Analysis complete (${analysis.length} chars)`);

    return analysis;

  } catch (error) {
    console.error(`   ❌ Z.AI Chat failed:`, error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log(`   🌐 Browser closed`);
    }
  }
  */
}

// ==================== CHECK AVAILABILITY ====================

export function isZAIChatAvailable() {
  // Always return false since service is disabled
  return false;
}

// ==================== GET SETUP INSTRUCTIONS ====================

export function getZAIChatSetupInstructions() {
  return `
╔════════════════════════════════════════════════════════════════╗
║                  Z.AI CHAT SETUP GUIDE                         ║
║              ⚠️  TEMPORARILY DISABLED  ⚠️                    ║
╚════════════════════════════════════════════════════════════════╝

Z.AI Chat is currently disabled due to cookie authentication issues.

📝 STATUS:
- ❌ Temporarily unavailable
- Will be re-enabled when Z.AI provides official API access

📧 CONTACT:
- Check https://z.ai for API updates
- Monitor the project for updates

🔄 ALTERNATIVES:
The following vision models are available:
- Claude 3.5 Sonnet (Anthropic)
- GPT-4o (OpenAI)  
- Claude 3 Opus (Anthropic)
- Claude 3 Haiku (Anthropic)
- Gemini 2.5 Flash (Google)
- Gemini 2.5 Pro (Google)
- Gemini 1.5 Pro (Google)
- Gemini 1.5 Flash (Google)

✅ These models work without any browser automation!
`;
}
