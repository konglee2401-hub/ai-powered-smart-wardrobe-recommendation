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

// Step 6: Click input and type prompt
      console.log('📍 STEP 6: Entering prompt...');
      try {
        await this.page.click(textInputSelector);
        console.log('   ✅ Input focused');
        await this.page.waitForTimeout(1000);
        
        // Clear any existing text
        await this.page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (el) {
            if (el.tagName === 'TEXTAREA') {
              el.value = '';
            } else if (el.contentEditable === 'true') {
              el.textContent = '';
            }
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, textInputSelector);
        await this.page.waitForTimeout(500);

        // Use paste method instead of typing character by character
        console.log(`   ⌨️  Pasting prompt (${prompt.length} chars)...`);
        
        await this.page.evaluate((sel, text) => {
          const el = document.querySelector(sel);
          if (!el) return false;
          
          // Method 1: Direct clipboard paste
          const evt = new ClipboardEvent('paste', {
            clipboardData: new DataTransfer(),
            bubbles: true
          });
          evt.clipboardData.setData('text/plain', text);
          
          if (el.tagName === 'TEXTAREA') {
            el.value = text;
          } else if (el.contentEditable === 'true') {
            el.textContent = text;
          }
          
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }, textInputSelector, prompt);
        
        await this.page.waitForTimeout(1000);
        console.log('   ✅ Prompt entered');
      } catch (error) {
        console.error(`   ❌ Error entering prompt: ${error.message}`);
        throw error;
      }

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

  /**
   * Upload multiple images and analyze
   */
  async analyzeMultipleImages(imagePaths, prompt) {
    console.log('\n📊 ChatGPT BROWSER MULTI-IMAGE ANALYSIS');
    console.log('='.repeat(80));
    console.log(`Images: ${imagePaths.map(p => path.basename(p)).join(', ')}`);
    console.log(`Prompt: ${prompt.substring(0, 80)}${prompt.length > 80 ? '...' : ''}`);
    console.log('');

    try {
      // Verify all image files exist
      for (const imagePath of imagePaths) {
        if (!fs.existsSync(imagePath)) {
          throw new Error(`Image file not found: ${imagePath}`);
        }
      }

      // Step 1: Look for upload button
      console.log('📍 STEP 1: Looking for attachment button...');
      
      const uploadSelectors = [
        'button[aria-label*="attach"], button[aria-label*="Attach"]',
        'button[aria-label*="image"], button[aria-label*="Image"]',
        'input[type="file"]',
        '[data-testid="attach-button"]'
      ];

      let uploadButton = null;

      for (const selector of uploadSelectors) {
        try {
          uploadButton = await this.page.$(selector);
          if (uploadButton) {
            console.log(`   ✅ Found: ${selector}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // Step 2: Upload all images
      console.log('📍 STEP 2: Uploading images...');
      for (const imagePath of imagePaths) {
        try {
          // Click upload button each time
          if (uploadButton) {
            await uploadButton.click();
            await this.page.waitForTimeout(500);
          }
          
          // Upload the file
          await this.uploadFile('input[type="file"]', imagePath);
          console.log(`   ✅ File uploaded: ${path.basename(imagePath)}`);
          
          // Wait for image to process
          await this.page.waitForTimeout(1500);
        } catch (e) {
          console.log(`   ❌ Failed to upload ${path.basename(imagePath)}: ${e.message}`);
          throw e;
        }
      }

      // Step 3: Handle login modal if appears
      console.log('📍 STEP 3: Handling login modal...');
      const modalClosed = await this.closeLoginModal();
      if (!modalClosed) {
        console.log('   ⚠️  Could not close modal, continuing anyway...');
      }

      // Step 4: Look for text input
      console.log('📍 STEP 4: Looking for message input...');
      
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

      // Step 5: Type prompt
      console.log('📍 STEP 5: Entering prompt...');
      try {
        await this.page.click(textInputSelector);
        await this.page.waitForTimeout(1000);
        
        // Clear existing text
        await this.page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return;
          if (el.tagName === 'TEXTAREA') {
            el.value = '';
          } else if (el.contentEditable === 'true') {
            el.textContent = '';
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }, textInputSelector);
        
        await this.page.waitForTimeout(500);
        
        // Paste prompt instead of typing
        console.log(`   ⌨️  Pasting prompt (${prompt.length} chars)...`);
        await this.page.evaluate((sel, text) => {
          const el = document.querySelector(sel);
          if (!el) return false;
          
          if (el.tagName === 'TEXTAREA') {
            el.value = text;
          } else if (el.contentEditable === 'true') {
            el.textContent = text;
          }
          
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }, textInputSelector, prompt);
        
        await this.page.waitForTimeout(1000);
        console.log(`   ✅ Prompt entered (${prompt.length} characters)`);
      } catch (error) {
        console.error(`   ❌ Error entering prompt: ${error.message}`);
        throw error;
      }

      // Step 6: Send message
      console.log('📍 STEP 6: Sending message...');
      const enterKey = true;
      if (enterKey) {
        await this.page.keyboard.press('Enter');
      } else {
        const submitButton = await this.page.$('button[type="submit"], button[aria-label*="Send"], button[aria-label*="submit"]');
        if (submitButton) {
          await submitButton.click();
        }
      }
      await this.page.waitForTimeout(2000);

      // Step 7: Wait for response
      console.log('📍 STEP 7: Waiting for ChatGPT response...');
      const response = await this.waitForResponse(60000);
      
      console.log(`   ✅ Response received (${response.length} characters)`);
      console.log('='.repeat(80));
      console.log('✅ MULTI-IMAGE ANALYSIS COMPLETE\n');

      return response;

    } catch (error) {
      console.error('❌ ChatGPT multi-image analysis failed:', error.message);
      
      // Save debug info on error
      try {
        await this.saveErrorDebugInfo('chatgpt');
      } catch (e) {
        console.log('⚠️  Could not save error debug info');
      }
      
      throw error;
    }
  }

  /**
   * Wait for ChatGPT to finish responding
   */
  async waitForResponse(maxWait = 120000) {
    console.log('⏳ Waiting for ChatGPT response...');
    
    const startTime = Date.now();
    let lastProgressLog = Date.now();
    let stableCount = 0;
    const stabileThreshold = 3; // 3 consecutive checks with stable content = done
    
    while (Date.now() - startTime < maxWait) {
      // Check page state
      const state = await this.page.evaluate(() => {
        // Get last message (response)
        const messages = document.querySelectorAll('[role="article"]');
        if (messages.length < 2) return { hasContent: false, length: 0, isLoading: true };
        
        const lastMessage = messages[messages.length - 1];
        const text = lastMessage.innerText || lastMessage.textContent || '';
        
        // Check for loading indicators
        const hasLoadingSpinner = !!document.querySelector('[class*="animate"], .animate-spin, .spinner');
        const hasLoadingText = text.includes('thinking') || text.includes('generating');
        
        return {
          hasContent: text.length > 50,
          length: text.length,
          isLoading: hasLoadingSpinner || hasLoadingText,
          text: text.substring(0, 200)
        };
      });
      
      // Progress logging every 10 seconds
      const now = Date.now();
      if (now - lastProgressLog > 10000) {
        const elapsed = Math.round((now - startTime) / 1000);
        console.log(`⏳ (${elapsed}s) Content: ${state.length}ch, Loading: ${state.isLoading ? '🔄 yes' : '✅ no'}`);
        lastProgressLog = now;
      }
      
      // Check if response is complete
      if (state.hasContent && !state.isLoading) {
        stableCount++;
        if (stableCount >= stabileThreshold) {
          console.log(`✅ Response complete! (${state.length} characters)`);
          break;
        }
      } else {
        stableCount = 0;
        if (!state.hasContent) {
          console.log(`⏳ Waiting for content (${state.length}ch)...`);
        }
        if (state.isLoading) {
          console.log(`🔄 ChatGPT is processing...`);
        }
      }
      
      await this.page.waitForTimeout(1000);
    }
    
    const totalSeconds = Math.round((Date.now() - startTime) / 1000);
    console.log(`Response wait completed after ${totalSeconds}s`);
    
    // Extract response text with multiple fallback methods
    const response = await this.page.evaluate(() => {
      console.log('🔍 DEBUG: Starting response extraction...');
      
      let fullText = '';
      let method = 'none';
      
      // ===== METHOD 1: Try [role="article"] (ChatGPT's message bubble) =====
      console.log('📌 Method 1: Looking for [role="article"]...');
      const articles = document.querySelectorAll('[role="article"]');
      console.log(`   Found ${articles.length} articles`);
      
      if (articles.length >= 2) {
        const lastArticle = articles[articles.length - 1];
        fullText = lastArticle.innerText || lastArticle.textContent || '';
        if (fullText.length > 100) {
          method = `article[${articles.length}]`;
          console.log(`   ✅ Got ${fullText.length}ch from last article`);
        }
      }
      
      // ===== METHOD 2: Try message container divs =====
      if (fullText.length < 100) {
        console.log('📌 Method 2: Looking for message containers...');
        const messageContainers = document.querySelectorAll('[class*="message"], [class*="response"], [class*="message-bubble"]');
        console.log(`   Found ${messageContainers.length} containers`);
        
        if (messageContainers.length > 0) {
          const lastContainer = messageContainers[messageContainers.length - 1];
          fullText = lastContainer.innerText || lastContainer.textContent || '';
          if (fullText.length > 100) {
            method = `message-container`;
            console.log(`   ✅ Got ${fullText.length}ch from message container`);
          }
        }
      }
      
      // ===== METHOD 3: Try finding by content markers =====
      if (fullText.length < 100) {
        console.log('📌 Method 3: Looking for content by markers...');
        const allText = document.body.innerText || document.body.textContent || '';
        
        // Split by "You:" or "Assistant:" to get response part
        if (allText.includes('Assistant:') || allText.includes('ChatGPT:')) {
          const parts = allText.split(/(?:Assistant:|ChatGPT:)/gi);
          if (parts.length > 1) {
            fullText = parts[parts.length - 1].trim();
            method = 'body-split';
            console.log(`   ✅ Got ${fullText.length}ch from body split`);
          }
        }
      }
      
      // ===== METHOD 4: Get all divs and find largest text content =====
      if (fullText.length < 100) {
        console.log('📌 Method 4: Finding largest text element...');
        const allDivs = document.querySelectorAll('div, section, article');
        let maxText = '';
        let maxDiv = null;
        
        for (const div of allDivs) {
          const text = div.innerText || div.textContent || '';
          // Skip if too small or if it's a control/button
          if (text.length > maxText.length && text.length > 200 && !div.querySelector('button, input')) {
            maxText = text;
            maxDiv = div;
          }
        }
        
        if (maxText.length > 100) {
          fullText = maxText;
          method = 'largest-text';
          console.log(`   ✅ Got ${fullText.length}ch from largest element`);
        }
      }
      
      // ===== METHOD 5: Get all visible text from main content area =====
      if (fullText.length < 100) {
        console.log('📌 Method 5: Extracting from main content area...');
        const main = document.querySelector('main, [role="main"], .main-content');
        if (main) {
          fullText = main.innerText || main.textContent || '';
          if (fullText.length > 100) {
            method = 'main-element';
            console.log(`   ✅ Got ${fullText.length}ch from main element`);
          }
        }
      }
      
      console.log(`📊 Final: Method=${method}, Length=${fullText.length}ch`);
      console.log(`📄 Preview: ${fullText.substring(0, 100)}...`);
      
      return fullText.trim();
    });
    
    console.log(`📥 Response extracted: ${response.length} characters`);
    
    // Debug: Save screenshot if response seems incomplete
    if (response.length < 100) {
      console.log('⚠️  WARNING: Response seems incomplete, saving screenshot for debugging...');
      try {
        const timestamp = Date.now();
        const screenshotPath = path.join(process.cwd(), 'temp', `chatgpt-response-debug-${timestamp}.png`);
        await this.screenshot({ path: screenshotPath });
        console.log(`📸 Screenshot saved: ${screenshotPath}`);
      } catch (e) {
        console.log(`❌ Could not save screenshot: ${e.message}`);
      }
    }
    
    return response;
  }
}

export default ChatGPTService;
