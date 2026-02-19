import BrowserService from './browserService.js';
import SessionManager from '../utils/sessionManager.js';
import fs from 'fs';
import path from 'path';

/**
 * Grok Browser Service
 * Automates grok.com (x.ai) for image analysis
 */
class GrokService extends BrowserService {
  constructor(options = {}) {
    // Create session manager for Grok
    const sessionManager = new SessionManager('grok');
    
    // Pass session manager to parent
    super({ ...options, sessionManager });
    this.baseUrl = 'https://grok.com';
    this.sessionManager = sessionManager;
  }

  /**
   * Initialize Grok
   */
  async initialize() {
    await this.launch();
    await this.goto(this.baseUrl);
    
    // Wait for page to load
    console.log('⏳ Waiting for Grok to load...');
    await this.page.waitForTimeout(3000);
    
    // Check if login required (Grok requires X/Twitter login)
    const isLoginPage = await this.page.evaluate(() => {
      return document.body.innerText.includes('Sign in') || 
             document.body.innerText.includes('Log in') ||
             document.body.innerText.includes('Continue with') ||
             document.body.innerText.includes('Sign up');
    });
    
    if (isLoginPage) {
      console.log('\n╔════════════════════════════════════════════════════════╗');
      console.log('║         🔐 GROK AUTHENTICATION REQUIRED                  ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');
      console.log('⚠️  Login required. Please complete X/Twitter login in the browser window.\n');
      console.log('📝 Steps:');
      console.log('  1. Sign in with your X/Twitter account');
      console.log('  2. Complete any 2FA verification (if enabled)');
      console.log('  3. Wait for Grok dashboard to load\n');
      
      // Wait for manual login (if not headless)
      if (!this.options.headless) {
        console.log('⏳ Waiting 120 seconds for manual login (browser window should be visible)...\n');
        
        // Poll for successful login
        let loggedIn = false;
        let waitTime = 0;
        const maxWait = 120000; // 120 seconds
        const pollInterval = 3000; // Check every 3 seconds
        
        while (!loggedIn && waitTime < maxWait) {
          await this.page.waitForTimeout(pollInterval);
          waitTime += pollInterval;
          
          const stillOnLogin = await this.page.evaluate(() => {
            return document.body.innerText.includes('Sign in') || 
                   document.body.innerText.includes('Log in') ||
                   document.body.innerText.includes('Continue with') ||
                   document.body.innerText.includes('Sign up');
          });
          
          if (!stillOnLogin) {
            loggedIn = true;
            console.log('✅ Login successful! Session will be saved.\n');
          } else {
            const secondsLeft = Math.round((maxWait - waitTime) / 1000);
            process.stdout.write(`\r⏳ Waiting for login... (${secondsLeft}s remaining)`);
          }
        }
        
        if (!loggedIn) {
          throw new Error('Login timeout. Please try again.');
        }
        
        // Save session after successful login
        await this.page.waitForTimeout(2000); // Wait for page to fully load
        const saved = await this.saveSession();
        if (saved) {
          console.log('💾 Session saved - you won\'t need to login again!');
        }
      } else {
        throw new Error('Grok requires authentication. Please run in non-headless mode for manual login.');
      }
    } else {
      console.log('✅ Already logged in (using saved session)');
      
      // Also save current cookies (session refresh)
      try {
        await this.saveSession();
      } catch (error) {
        // Silent fail - session update not critical
      }
    }
    
    console.log('✅ Grok initialized');
  }

  /**
   * Upload image and get analysis
   */
  async analyzeImage(imagePath, prompt) {
    console.log('\n📊 GROK BROWSER ANALYSIS');
    console.log('='.repeat(80));
    console.log(`Image: ${path.basename(imagePath)}`);
    console.log(`Prompt: ${prompt}`);
    console.log('');

    try {
      // Look for new chat or input area
      console.log('🔍 Looking for chat interface...');
      
      // Wait for chat interface to load
      await this.page.waitForTimeout(2000);

      // Look for file upload button/input
      console.log('🔍 Looking for upload button...');
      
      const uploadSelectors = [
        'input[type="file"]',
        'input[accept*="image"]',
        '[data-testid="file-upload"]',
        '[aria-label*="upload"]',
        '[aria-label*="attach"]',
        'button[aria-label*="image"]'
      ];

      let uploadInput = null;
      for (const selector of uploadSelectors) {
        uploadInput = await this.page.$(selector);
        if (uploadInput) {
          console.log(`✅ Found upload input: ${selector}`);
          break;
        }
      }

      // If no direct input, try to click attach button
      if (!uploadInput) {
        const attachButtons = await this.page.$$('button');
        for (const button of attachButtons) {
          const ariaLabel = await button.getAttribute('aria-label');
          const title = await button.getAttribute('title');
          
          if (
            (ariaLabel && (ariaLabel.includes('attach') || ariaLabel.includes('image') || ariaLabel.includes('upload'))) ||
            (title && (title.includes('attach') || title.includes('image') || title.includes('upload')))
          ) {
            await button.click();
            await this.page.waitForTimeout(1000);
            uploadInput = await this.page.$('input[type="file"]');
            if (uploadInput) {
              console.log('✅ Found upload input after clicking attach button');
              break;
            }
          }
        }
      }

      if (!uploadInput) {
        throw new Error('Could not find file upload input. Grok may have changed its UI.');
      }

      // Upload image
      await this.uploadFile('input[type="file"]', imagePath);
      console.log('⏳ Waiting for image to upload...');
      await this.page.waitForTimeout(3000);

      // Look for text input
      console.log('🔍 Looking for text input...');
      
      const textInputSelectors = [
        'textarea[placeholder*="Ask"]',
        'textarea[placeholder*="Message"]',
        'textarea',
        '[contenteditable="true"]',
        'input[type="text"]'
      ];

      let textInput = null;
      for (const selector of textInputSelectors) {
        textInput = await this.page.$(selector);
        if (textInput) {
          console.log(`✅ Found text input: ${selector}`);
          break;
        }
      }

      if (!textInput) {
        throw new Error('Could not find text input');
      }

      // Type prompt
      console.log('⌨️  Typing prompt...');
      await this.typeText(textInputSelectors.find(s => textInput), prompt);
      await this.page.waitForTimeout(1000);

      // Find and click send button
      console.log('🔍 Looking for send button...');
      
      const sendSelectors = [
        'button[type="submit"]',
        'button[aria-label*="send"]',
        'button[aria-label*="Submit"]',
        'button:has-text("Send")'
      ];

      let sendButton = null;
      for (const selector of sendSelectors) {
        sendButton = await this.page.$(selector);
        if (sendButton) {
          console.log(`✅ Found send button: ${selector}`);
          break;
        }
      }

      if (!sendButton) {
        // Try pressing Enter
        console.log('⌨️  Pressing Enter to send...');
        await this.page.keyboard.press('Enter');
      } else {
        await sendButton.click();
      }

      console.log('✅ Message sent');
      console.log('⏳ Waiting for Grok to respond...');

      // Wait for response
      await this.page.waitForTimeout(5000);

      // Monitor for response completion
      let lastLength = 0;
      let stableCount = 0;
      const maxWait = 90000; // 90 seconds for Grok
      const startTime = Date.now();

      while (Date.now() - startTime < maxWait) {
        const currentText = await this.page.evaluate(() => document.body.innerText);
        const currentLength = currentText.length;

        // Check if "thinking" or "typing" indicator is gone
        const isThinking = await this.page.evaluate(() => {
          const text = document.body.innerText.toLowerCase();
          return text.includes('thinking') || 
                 text.includes('typing') || 
                 text.includes('generating');
        });

        if (!isThinking && currentLength === lastLength) {
          stableCount++;
          if (stableCount >= 3) {
            break;
          }
        } else {
          stableCount = 0;
        }

        lastLength = currentLength;
        await this.page.waitForTimeout(1000);
      }

      console.log('✅ Response received');

      // Extract response
      console.log('📝 Extracting response...');
      
      const response = await this.page.evaluate(() => {
        // Try to find Grok's response messages
        const messageSelectors = [
          '[data-testid*="message"]',
          '[class*="message"]',
          '[class*="response"]',
          '[role="article"]'
        ];

        for (const selector of messageSelectors) {
          const messages = Array.from(document.querySelectorAll(selector));
          if (messages.length > 0) {
            // Get the last message (should be Grok's response)
            const lastMessage = messages[messages.length - 1];
            const text = lastMessage.innerText;
            
            // Filter out user's message
            if (!text.includes('Ask') && text.length > 50) {
              return text;
            }
          }
        }

        // Fallback: try to extract from page
        const allText = document.body.innerText;
        const lines = allText.split('\n').filter(line => line.trim().length > 0);
        
        // Find substantial text blocks (likely the response)
        const substantialLines = lines.filter(line => line.length > 100);
        if (substantialLines.length > 0) {
          return substantialLines.join('\n');
        }

        return allText;
      });

      console.log('='.repeat(80));
      console.log('✅ ANALYSIS COMPLETE');
      console.log(`Response length: ${response.length} characters`);
      console.log('='.repeat(80) + '\n');

      return response;

    } catch (error) {
      console.error('❌ Grok analysis failed:', error.message);
      
      // Take screenshot for debugging
      await this.screenshot({ path: path.join(process.cwd(), 'temp', `grok-error-${Date.now()}.png`) });
      
      throw error;
    }
  }
}

export default GrokService;
