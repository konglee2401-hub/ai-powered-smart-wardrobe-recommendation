import BrowserService from './browserService.js';
import fs from 'fs';
import path from 'path';

/**
 * ChatGPT Browser Service
 * Automates ChatGPT for image analysis via web UI
 */
class ChatGPTService extends BrowserService {
  constructor(options = {}) {
    super(options);
    this.baseUrl = 'https://chatgpt.com';
    this.debug = options.debug || false; // Enable debug mode to save screenshots/HTML
  }

  /**
   * Initialize ChatGPT (no login needed for web interface)
   */
  async initialize() {
    console.log('🚀 Starting ChatGPT initialization...');
    
    await this.launch();
    
    console.log(`📍 Navigating to ${this.baseUrl}...`);
    await this.goto(this.baseUrl);
    
    // Wait for page to load
    console.log('⏳ Waiting for ChatGPT to load...');
    await this.page.waitForTimeout(3000);
    
    console.log('✅ ChatGPT initialized successfully');
  }

  /**
   * Close login modal if it appears
   */
  async closeLoginModal() {
    try {
      console.log('🔍 Checking for login modal...');
      
      // Check if modal exists
      const modal = await this.page.$('[role="dialog"], .modal, [aria-modal="true"]');
      
      if (!modal) {
        console.log('✅ No login modal detected');
        return true;
      }

      console.log('⚠️  Login modal detected, attempting to close...');
      
      // Try to find close button (X button)
      const closeButtonSelectors = [
        'button[aria-label*="Close"]',
        'button[aria-label="Close dialog"]',
        'button:has-text("×")',
        'button[class*="close"]',
        '[role="dialog"] button:first-child'
      ];

      for (const selector of closeButtonSelectors) {
        try {
          const closeBtn = await this.page.$(selector);
          if (closeBtn) {
            const isVisible = await this.page.evaluate((sel) => {
              const el = document.querySelector(sel);
              return !!(el && el.offsetParent !== null);
            }, selector);

            if (isVisible) {
              console.log(`   ✅ Found close button: ${selector}`);
              await closeBtn.click();
              await this.page.waitForTimeout(1500);
              console.log('   ✅ Modal closed');
              return true;
            }
          }
        } catch (e) {
          // Try next selector
        }
      }

      // Try pressing Escape
      console.log('   ⌨️  Trying to close with Escape key...');
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(1500);

      // Verify modal is closed
      const stillOpen = await this.page.$('[role="dialog"], .modal');
      if (stillOpen) {
        console.log('   ⚠️  Modal still open');
        return false;
      }

      console.log('   ✅ Modal closed with Escape');
      return true;
    } catch (error) {
      console.log('⚠️  Error closing modal:', error.message);
      return false;
    }
  }

  /**
   * Save debug information (screenshot and HTML)
   * Only saves if debug mode is enabled
   */
  async saveDebugInfo(prefix) {
    if (!this.debug) {
      return; // Skip if debug mode not enabled
    }

    try {
      const timestamp = Date.now();
      
      // Save screenshot
      const screenshotPath = path.join(process.cwd(), 'temp', `${prefix}-${timestamp}.png`);
      await this.screenshot({ path: screenshotPath });
      console.log(`   📸 Screenshot: ${screenshotPath}`);

      // Save HTML
      const html = await this.page.content();
      const htmlPath = path.join(process.cwd(), 'temp', `${prefix}-${timestamp}.html`);
      fs.writeFileSync(htmlPath, html);
      console.log(`   📄 HTML: ${htmlPath}`);
    } catch (e) {
      console.log(`   ⚠️  Could not save debug info: ${e.message}`);
    }
  }

  /**
   * Save error debug information (always saves on error)
   */
  async saveErrorDebugInfo(prefix) {
    try {
      const timestamp = Date.now();
      
      // Save screenshot
      const screenshotPath = path.join(process.cwd(), 'temp', `${prefix}-error-${timestamp}.png`);
      await this.screenshot({ path: screenshotPath });
      console.log(`   📸 Error screenshot: ${screenshotPath}`);

      // Save HTML
      const html = await this.page.content();
      const htmlPath = path.join(process.cwd(), 'temp', `${prefix}-error-${timestamp}.html`);
      fs.writeFileSync(htmlPath, html);
      console.log(`   📄 Error HTML: ${htmlPath}`);
    } catch (e) {
      console.log(`   ⚠️  Could not save error debug info: ${e.message}`);
    }
  }

  /**
   * Analyze image using ChatGPT
   */
  async analyzeImage(imagePath, prompt) {
    console.log('\n📊 ChatGPT BROWSER ANALYSIS');
    console.log('='.repeat(80));
    console.log(`Image: ${path.basename(imagePath)}`);
    console.log(`Prompt: ${prompt.substring(0, 80)}${prompt.length > 80 ? '...' : ''}`);
    console.log('');

    try {
      // Verify the image file exists
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
      }

      // Step 1: Look for upload button or input
      console.log('📍 STEP 1: Looking for attachment button...');
      
      const uploadSelectors = [
        'button[aria-label*="attach"], button[aria-label*="Attach"]',
        'button[aria-label*="image"], button[aria-label*="Image"]',
        'input[type="file"]',
        '[data-testid="attach-button"]',
        'button:has-text("Attach")'
      ];

      let uploadButton = null;
      let uploadInput = null;

      // First try to find and click the attachment button
      for (const selector of uploadSelectors) {
        try {
          uploadButton = await this.page.$(selector);
          if (uploadButton) {
            console.log(`   ✅ Found: ${selector}`);
            await uploadButton.click();
            await this.page.waitForTimeout(1000);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // Look for file input
      uploadInput = await this.page.$('input[type="file"]');
      
      if (!uploadInput) {
        throw new Error('Could not find file upload input');
      }

      // Step 2: Upload image
      console.log('📍 STEP 2: Uploading image file...');
      await this.uploadFile('input[type="file"]', imagePath);
      console.log(`   ✅ File uploaded: ${path.basename(imagePath)}`);
      
      // Wait for image to process
      console.log('📍 STEP 3: Waiting for image to process...');
      await this.page.waitForTimeout(2000);

      // Step 4: Close login modal if appears
      console.log('📍 STEP 4: Handling login modal...');
      const modalClosed = await this.closeLoginModal();
      if (!modalClosed) {
        console.log('   ⚠️  Could not close modal, continuing anyway...');
      }

      // Step 5: Look for text input
      console.log('📍 STEP 5: Looking for message input...');
      
      const textInputSelectors = [
        'textarea[placeholder*="message"]',
        'textarea[placeholder*="Ask"]',
        'textarea[placeholder*="Message"]',
        'textarea',
        '[contenteditable="true"]'
      ];

      let textInputSelector = null;
      
      for (const selector of textInputSelectors) {
        try {
          const element = await this.page.waitForSelector(selector, {
            timeout: 2000,
            state: 'visible'
          });
          
          if (element) {
            const isVisible = await this.page.evaluate((sel) => {
              const el = document.querySelector(sel);
              return !!(el && el.offsetParent !== null);
            }, selector);
            
            if (isVisible) {
              textInputSelector = selector;
              console.log(`   ✅ Found: ${selector}`);
              break;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!textInputSelector) {
        throw new Error('Could not find message input');
      }

      // Step 6: Click input and type prompt character by character
      console.log('📍 STEP 6: Entering prompt...');
      await this.page.click(textInputSelector);
      console.log('   ✅ Input focused');
      await this.page.waitForTimeout(500);
      
      // Clear any existing text first
      await this.page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) {
          el.textContent = '';
          el.innerText = '';
          el.value = '';
        }
      }, textInputSelector);

      // Type the prompt slowly for better detection
      console.log(`   ⌨️  Typing "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);
      await this.page.keyboard.type(prompt, { delay: 5 });
      await this.page.waitForTimeout(500);

      console.log('   ✅ Prompt entered');

      // Step 7: Find and click send button
      console.log('📍 STEP 7: Sending message...');
      
      const sendButtonSelectors = [
        'button[aria-label*="send"], button[aria-label*="Send"]',
        'button[data-testid="send-button"]',
        'button[type="submit"]',
        'button:visible'
      ];

      let sendClicked = false;
      
      for (const selector of sendButtonSelectors) {
        try {
          const sendButton = await this.page.$(selector);
          if (sendButton) {
            const isEnabled = await this.page.evaluate((sel) => {
              const el = document.querySelector(sel);
              return !!(el && !el.disabled && el.offsetParent !== null);
            }, selector);

            if (isEnabled) {
              console.log(`   ✅ Found send button: ${selector}`);
              await sendButton.click();
              sendClicked = true;
              await this.page.waitForTimeout(500);
              break;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!sendClicked) {
        // Try pressing Enter instead
        console.log('   ⌨️  Pressing Enter to send...');
        await this.page.keyboard.press('Enter');
      }

      console.log('   ✅ Message sent');

      // Step 8: Wait for login modal after sending
      console.log('📍 STEP 8: Checking for modal after sending...');
      await this.page.waitForTimeout(2000);
      const modalAfterSend = await this.closeLoginModal();
      if (!modalAfterSend) {
        console.log('   ⚠️  Could not close modal, waiting anyway...');
      }

      // Step 9: Wait for response
      console.log('📍 STEP 9: Waiting for response from ChatGPT...');

      // Wait for response to start generating
      await this.page.waitForTimeout(2000);

      // Wait for response to complete
      let lastLength = 0;
      let stableCount = 0;
      const maxWait = 120000; // 120 seconds max
      const startTime = Date.now();

      while (Date.now() - startTime < maxWait) {
        try {
          const responseText = await this.page.evaluate(() => {
            // Look for the last assistant message
            const messages = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
            
            if (messages.length > 0) {
              const lastMessage = messages[messages.length - 1];
              return lastMessage?.innerText || '';
            }
            
            return '';
          });

          if (responseText && responseText.length > 0) {
            const currentLength = responseText.length;

            if (Math.abs(currentLength - lastLength) < 50) {
              stableCount++;
              if (stableCount >= 3) {
                // Response hasn't changed much for 3 checks, likely done
                console.log(`   ✅ Response complete (${currentLength} chars)`);
                break;
              }
            } else {
              stableCount = 0;
            }

            lastLength = currentLength;
          }

          await this.page.waitForTimeout(1000);
        } catch (e) {
          // Continue waiting
          await this.page.waitForTimeout(1000);
        }
      }

      // Step 10: Extract response
      console.log('📍 STEP 10: Extracting response...');
      
      const response = await this.page.evaluate(() => {
        // Try to find the last assistant message
        const messages = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
        
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          return lastMessage?.innerText || '';
        }

        return '';
      });

      if (!response || response.length === 0) {
        throw new Error('Could not extract response from ChatGPT');
      }

      console.log(`   ✅ Response extracted (${response.length} characters)`);
      console.log('='.repeat(80));
      console.log('✅ ANALYSIS COMPLETE\n');

      return response;

    } catch (error) {
      console.error('❌ ChatGPT analysis failed:', error.message);
      
      // Save debug info on error
      try {
        await this.saveErrorDebugInfo('chatgpt');
      } catch (e) {
        console.log('⚠️  Could not save error debug info');
      }
      
      throw error;
    }
  }
}

export default ChatGPTService;
