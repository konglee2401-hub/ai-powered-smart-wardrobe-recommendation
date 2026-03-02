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
    
    // Wait for page to load - increased timeout as ChatGPT takes time to render
    console.log('⏳ Waiting for ChatGPT to load...');
    await this.page.waitForTimeout(15000); // Increased from 3s to 15s
    
    // Close any cookie/notification banners that might block input
    console.log('🍪 Closing cookie/notification popups...');
    let popupsClosed = 0;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const closed = await this.page.evaluate(() => {
          const closeButtons = document.querySelectorAll(
            'button[aria-label*="Close"], button[aria-label="close"], button[class*="close"], [role="button"][class*="dismiss"]'
          );
          for (const btn of closeButtons) {
            if (btn.offsetParent !== null) { // visible
              btn.click();
              return true;
            }
          }
          return false;
        });
        if (closed) {
          popupsClosed++;
          console.log(`   ✓ Closed popup ${popupsClosed}`);
          await this.page.waitForTimeout(800);
        }
      } catch (e) {
        // Continue
      }
    }
    if (popupsClosed > 0) {
      console.log(`✅ Closed ${popupsClosed} popup(s)`);
    }
    
    // Wait for textarea input to appear to ensure Chat interface is ready
    console.log('⏳ Waiting for chat interface (textarea)...');
    try {
      await this.page.waitForSelector('textarea', { timeout: 10000 });
      console.log('✅ Chat interface ready');
    } catch (e) {
      console.log('⚠️  Textarea not found after waiting, but continuing anyway...');
    }
    
    console.log('✅ ChatGPT initialized successfully');
  }


  /**
   * Generate text-only response from ChatGPT browser (no image upload)
   * Returns raw assistant text for downstream JSON extraction.
   * 
   * Note: Anonymous ChatGPT doesn't need login modal detection
   */
  async generateText(prompt) {
    console.log('\n🧠 ChatGPT BROWSER TEXT GENERATION');
    console.log('='.repeat(80));

    try {
      // Skip login modal check for anonymous mode - it causes text extraction to fail
      // if closeLoginModal() is called, the page structure changes and text cannot be extracted
      // Just wait for page to stabilize and look for input box
      console.log('⏳ Waiting for ChatGPT interface to stabilize...');
      await this.page.waitForTimeout(2000);

      const inputSelectors = [
        'textarea[placeholder*="Message"]',
        'textarea',
        '[contenteditable="true"]',
        '#prompt-textarea'
      ];

      let selector = null;
      console.log('[STEP 1] 🔍 Looking for input box with selectors...');
      
      // Retry loop - try to find input box, close popups if needed
      let foundInput = false;
      for (let attempt = 0; attempt < 3 && !foundInput; attempt++) {
        if (attempt > 0) {
          console.log(`[STEP 1] Attempt ${attempt + 1}/3 - Closing potential popups and retrying...`);
          // Try to close any popups that might be blocking
          await this.page.evaluate(() => {
            const closeButtons = document.querySelectorAll(
              'button[aria-label*="Close"], button[aria-label="close"], button[class*="close"], [role="button"][class*="dismiss"]'
            );
            for (const btn of closeButtons) {
              if (btn.offsetParent !== null) {
                btn.click();
              }
            }
          });
          await this.page.waitForTimeout(1000);
        }
        
        for (const s of inputSelectors) {
          const el = await this.page.$(s);
          if (el) {
            selector = s;
            console.log(`[STEP 1] ✅ Found input: ${s}`);
            foundInput = true;
            break;
          }
        }
      }

      if (!selector) {
        console.log('[STEP 1] ❌ No input box found after retries. Page content:');
        const bodyHTML = await this.page.evaluate(() => document.body.innerHTML.substring(0, 500));
        console.log(bodyHTML);
        throw new Error('Could not find ChatGPT input box');
      }

      // IMPORTANT: Insert full prompt in one shot (paste-style), avoid typing.
      // Typing multi-line prompts can emit Enter key events and submit prematurely.
      console.log(`[STEP 2] 📝 Inserting prompt (${prompt.length} chars)...`);
      const inserted = await this.page.evaluate((sel, fullPrompt) => {
        const elem = document.querySelector(sel);
        if (!elem) return { success: false, reason: 'element not found' };

        if (elem.tagName === 'TEXTAREA' || elem.tagName === 'INPUT') {
          elem.focus();
          elem.value = fullPrompt;
          elem.dispatchEvent(new Event('input', { bubbles: true }));
          elem.dispatchEvent(new Event('change', { bubbles: true }));
          return { success: true, method: 'textarea/input', valueLength: elem.value.length };
        }

        // contenteditable fallback
        if (elem.getAttribute('contenteditable') === 'true') {
          elem.focus();
          elem.textContent = fullPrompt;
          elem.dispatchEvent(new InputEvent('input', { bubbles: true, data: fullPrompt, inputType: 'insertText' }));
          elem.dispatchEvent(new Event('change', { bubbles: true }));
          return { success: true, method: 'contenteditable', valueLength: elem.textContent.length };
        }

        return { success: false, reason: 'unsupported element type: ' + elem.tagName };
      }, selector, prompt);

      if (!inserted.success) {
        throw new Error(`Failed to insert prompt: ${inserted.reason}`);
      }
      console.log(`[STEP 2] ✅ Prompt inserted via ${inserted.method} (${inserted.valueLength} chars)`);

      await this.page.waitForTimeout(300);

      // Submit explicitly via send button first (preferred), Enter as fallback.
      console.log('[STEP 3] 🖱️  Finding and clicking submit button...');
      const submittedByButton = await this.page.evaluate(() => {
        const candidates = [
          'button[data-testid="send-button"]',
          'button[aria-label*="Send"]',
          'button[aria-label*="send"]',
          'button[title*="Send"]',
          'button:has(svg)'
        ];

        for (const selector of candidates) {
          const buttons = document.querySelectorAll(selector);
          for (const btn of buttons) {
            const disabled = btn.disabled || btn.getAttribute('aria-disabled') === 'true';
            if (!disabled && btn.offsetParent !== null) {
              console.log('Found valid send button:', selector);
              btn.click();
              return { success: true, selector: selector };
            }
          }
        }
        return { success: false, foundButtons: document.querySelectorAll('button').length };
      });

      if (!submittedByButton.success) {
        console.log(`[STEP 3] ⚠️  Submit button not found (found ${submittedByButton.foundButtons} buttons total), using Enter key...`);
        await this.page.focus(selector);
        await this.page.keyboard.press('Enter');
      } else {
        console.log(`[STEP 3] ✅ Clicked submit button: ${submittedByButton.selector}`);
      }

      // Wait until assistant response is present and stable (increased from 9s to 20s)
      console.log('[STEP 4] ⏳ Waiting 20 seconds for response...');
      await this.page.waitForTimeout(20000);

      console.log('[STEP 5] 🔍 Extracting response text...');
      const debugInfo = await this.page.evaluate(() => {
        // First, let's see what's on the page
        const candidates = [
          '[data-message-author-role="assistant"]',
          'article',
          '.markdown'
        ];

        const foundElements = {};
        for (const selector of candidates) {
          const nodes = document.querySelectorAll(selector);
          foundElements[selector] = nodes.length;
        }

        // Try to find response
        for (const selector of candidates) {
          const nodes = document.querySelectorAll(selector);
          if (nodes.length > 0) {
            const last = nodes[nodes.length - 1];
            if (last?.innerText?.trim()) {
              return {
                found: true,
                selector: selector,
                textLength: last.innerText.trim().length,
                preview: last.innerText.substring(0, 100)
              };
            }
          }
        }

        const markdownBlocks = document.querySelectorAll('.markdown, pre, code');
        if (markdownBlocks.length > 0) {
          const last = markdownBlocks[markdownBlocks.length - 1];
          if (last?.innerText?.trim()) {
            return {
              found: true,
              selector: '.markdown/pre/code',
              textLength: last.innerText.trim().length,
              preview: last.innerText.substring(0, 100)
            };
          }
        }

        // Get sample of body text for debugging
        const bodyText = document.body.innerText || '';
        const bodyPreview = bodyText.substring(0, 150);
        
        return {
          found: false,
          foundElements: foundElements,
          bodyLength: bodyText.length,
          bodyPreview: bodyPreview,
          hasAssistantElements: !!document.querySelector('[data-message-author-role="assistant"]'),
          allText: document.querySelectorAll('*:not(script):not(style)').length
        };
      });

      if (!debugInfo.found) {
        console.log('[STEP 5] ❌ Response not found. Debug info:');
        console.log(JSON.stringify(debugInfo, null, 2));
        if (debugInfo.bodyPreview) {
          console.log(`   📝 Body preview: ${debugInfo.bodyPreview}`);
        }
        // Save page HTML for manual inspection
        const html = await this.page.content();
        const fs = (await import('fs')).default;
        const path = (await import('path')).default;
        const filePath = path.join(process.cwd(), 'temp', `chatgpt-response-debug-${Date.now()}.html`);
        fs.writeFileSync(filePath, html);
        console.log(`   📄 Page HTML saved: ${filePath}`);
        throw new Error('Could not extract text response from ChatGPT');
      }

      console.log(`[STEP 5] ✅ Found response via ${debugInfo.selector}`);
      console.log(`   📊 Text length: ${debugInfo.textLength} chars`);
      console.log(`   📝 Preview: ${debugInfo.preview.substring(0, 50)}...`);

      // Now get the actual response
      const response = await this.page.evaluate(() => {
        const candidates = [
          '[data-message-author-role="assistant"]',
          'article',
          '.markdown'
        ];

        for (const selector of candidates) {
          const nodes = document.querySelectorAll(selector);
          if (nodes.length > 0) {
            const last = nodes[nodes.length - 1];
            if (last?.innerText?.trim()) return last.innerText.trim();
          }
        }

        const markdownBlocks = document.querySelectorAll('.markdown, pre, code');
        if (markdownBlocks.length > 0) {
          const last = markdownBlocks[markdownBlocks.length - 1];
          if (last?.innerText?.trim()) return last.innerText.trim();
        }

        return '';
      });

      if (!response) {
        throw new Error('Could not extract text response from ChatGPT');
      }

      console.log(`✅ ChatGPT response length: ${response.length}`);
      return response;
    } catch (error) {
      console.error('❌ ChatGPT text generation failed:', error.message);
      await this.saveErrorDebugInfo('chatgpt-text');
      throw error;
    }
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

      // Step 1: Look for upload button or file input
      console.log('📍 STEP 1: Looking for attachment button...');
      
      const uploadSelectors = [
        'button[aria-label*="attach"], button[aria-label*="Attach"]',
        'button[aria-label*="image"], button[aria-label*="Image"]',
        'input[type="file"]',
        '[data-testid="attach-button"]'
      ];

      let uploadButton = null;
      let fileInput = null;

      for (const selector of uploadSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            if (selector.includes('input')) {
              fileInput = element;
              console.log(`   ✅ Found file input: ${selector}`);
              break;
            } else {
              uploadButton = element;
              console.log(`   ✅ Found: ${selector}`);
              break;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // Step 2: Upload all images
      console.log('📍 STEP 2: Uploading images...');
      for (const imagePath of imagePaths) {
        let uploadSucceeded = false;
        let retries = 0;
        const maxRetries = 3;

        while (!uploadSucceeded && retries < maxRetries) {
          try {
            console.log(`   📤 Uploading file: ${path.basename(imagePath)} (attempt ${retries + 1}/${maxRetries})`);
              
            // 💫 IMPROVED: Use setInputFiles directly (most stable)
            const inputElements = await this.page.$$('input[type="file"]');
            if (inputElements.length > 0) {
              try {
                console.log(`   └─ Using setInputFiles (found ${inputElements.length} file input)...`);
                await inputElements[0].uploadFile(imagePath);
                
                // Verify upload succeeded
                await this.page.waitForTimeout(2000);
                
                // Confirm image is in DOM
                const hasImage = await this.page.evaluate(() => {
                  const imgs = document.querySelectorAll('img');
                  return imgs.length > 0;
                });
                
                if (hasImage) {
                  console.log(`   ✅ File uploaded: ${path.basename(imagePath)}`);
                  uploadSucceeded = true;
                } else {
                  console.log(`   ⚠️  Upload processed but image not detected, retrying...`);
                  retries++;
                }
              } catch (setInputErr) {
                console.log(`   ⚠️  setInputFiles failed: ${setInputErr.message}`);
                retries++;
              }
            } else {
              console.log(`   ⚠️  No file input found, retrying...`);
              retries++;
            }
          } catch (e) {
            console.log(`   ⚠️  Attempt ${retries + 1} failed: ${e.message}`);
            retries++;
            
            if (retries < maxRetries) {
              console.log(`   ⏳ Waiting 2s before retry...`);
              await this.page.waitForTimeout(2000);
            }
          }
        }

        if (!uploadSucceeded) {
          console.error(`   ❌ Failed to upload ${path.basename(imagePath)} after ${maxRetries} attempts`);
          throw new Error(`Failed to upload ${path.basename(imagePath)} after ${maxRetries} attempts`);
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
      console.log('   ⌨️  Pressing Enter...');
      await this.page.keyboard.press('Enter');
      
      console.log('   ⏸️  Waiting 3s for message to send...');
      await this.page.waitForTimeout(3000);
      
      console.log('📍 STEP 6.5: Verify message was sent');
      const messageState = await this.page.evaluate(() => {
        const input = document.querySelector('textarea, [contenteditable="true"]');
        const assistantMsg = document.querySelector('[data-message-author-role="assistant"]');
        return {
          inputFound: !!input,
          inputLength: input ? (input.value || input.textContent || '').length : 0,
          assistantMsgFound: !!assistantMsg,
          bodyTextLength: (document.body.innerText || '').length,
          pageTitle: document.title
        };
      });
      
      console.log('   📊 Message state:', messageState);
      if (messageState.inputLength > 0) {
        console.warn('   ⚠️  Input still has text - message may not have sent!');
      }
      if (!messageState.assistantMsgFound) {
        console.warn('   ⚠️  No assistant message found yet - still waiting for response');
      }

      // Step 7: Wait for response
      console.log('📍 STEP 7: Waiting for ChatGPT response...');
      console.log('⏳ This may take up to 60 seconds...\n');
      
      let response = '';
      try {
        response = await this.waitForResponse(60000);
        console.log(`   ✅ Response received (${response.length} characters)`);
      } catch (waitError) {
        console.error('❌ Response wait failed:', waitError.message);
        console.error('⚠️  Attempting fallback extraction...');
        
        // Fallback: Try direct extraction without waiting
        try {
          response = await this.page.evaluate(() => {
            const assistant = document.querySelector('[data-message-author-role="assistant"]');
            if (assistant) {
              return assistant.innerText || assistant.textContent || '';
            }
            return '';
          });
          console.log(`   ⚠️  Fallback extracted: ${response.length} characters`);
        } catch (fallbackError) {
          console.error('❌ Fallback extraction also failed:', fallbackError.message);
          response = '';
        }
      }
      
      if (!response || response.length === 0) {
        throw new Error('Failed to extract any response from ChatGPT');
      }
      
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
    console.log(`⏱️  Timeout: ${maxWait}ms = ${Math.round(maxWait / 1000)}s`);
    
    const startTime = Date.now();
    let lastProgressLog = Date.now();
    let stableCount = 0;
    const stabileThreshold = 3;
    
    // Check initial state
    try {
      const initialState = await this.page.evaluate(() => {
        const messages = document.querySelectorAll('[role="article"]');
        return {
          messageCount: messages.length,
          lastMessageLength: messages.length > 0 ? (messages[messages.length - 1].innerText || '').length : 0
        };
      });
      console.log(`📊 Initial state: ${initialState.messageCount} messages, last message: ${initialState.lastMessageLength}ch`);
    } catch (e) {
      console.warn(`⚠️  Could not get initial state: ${e.message}`);
    }
    
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
    
    // Extract response text - support both JSON (new format) and text (old format)
    console.log('📍 STEP 11: Extracting response...');
    
    const response = await this.page.evaluate(() => {
      let fullText = '';
      let extractMethod = 'none';
      
      // ===== METHOD 1: Get text directly from assistant message element =====
      const assistantMessage = document.querySelector('[data-message-author-role="assistant"]');
      if (assistantMessage) {
        // Try innerText first (preserves formatting)
        let text = assistantMessage.innerText || assistantMessage.textContent || '';
        if (text.length > 100) {  // Require meaningful response
          fullText = text;
          extractMethod = 'direct-assistant-element';
        }
      }
      
      // ===== METHOD 2: Try markdown container inside assistant message =====
      if (fullText.length < 100) {
        const assistantMsg = document.querySelector('[data-message-author-role="assistant"]');
        if (assistantMsg) {
          // Look for markdown prose container
          const markdownDiv = assistantMsg.querySelector('.markdown, [class*="prose"], [class*="message-content"]');
          if (markdownDiv) {
            const text = markdownDiv.innerText || markdownDiv.textContent || '';
            if (text.length > 100) {
              fullText = text;
              extractMethod = 'markdown-container';
            }
          }
        }
      }
      
      // ===== METHOD 3: Try to extract from the main response div =====
      if (fullText.length < 100) {
        const assistantMsg = document.querySelector('[data-message-author-role="assistant"]');
        if (assistantMsg) {
          // Get all paragraph text
          const paragraphs = Array.from(assistantMsg.querySelectorAll('p, div, span'))
            .map(el => {
              const text = el.innerText || el.textContent || '';
              return text.trim();
            })
            .filter(t => t.length > 10)
            .join('\n');
          
          if (paragraphs.length > 100) {
            fullText = paragraphs;
            extractMethod = 'element-tree-combined';
          }
        }
      }
      
      // ===== FALLBACK: Get all assistant message content =====
      if (fullText.length < 100) {
        const allMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
        if (allMessages.length > 0) {
          const lastMsg = allMessages[allMessages.length - 1];
          const text = lastMsg.innerText || lastMsg.textContent || '';
          if (text.length > 100) {
            fullText = text;
            extractMethod = 'last-assistant-message';
          }
        }
      }
      
      // ===== FINAL FALLBACK: Search for response by markers (old format) =====
      if (fullText.length < 100) {
        const allText = document.body.innerText || document.body.textContent || '';
        const charProfileIndex = allText.lastIndexOf('*** CHARACTER PROFILE START ***');
        if (charProfileIndex > 0) {
          fullText = allText.substring(charProfileIndex);
          extractMethod = 'marker-body-split';
        }
      }
      
      // ===== Clean up response: Extract structured sections from old format =====
      let sections = [];
      if (fullText.length > 300 && fullText.includes('***')) {
        const charMatch = fullText.match(/\*\*\*\s*CHARACTER\s+PROFILE\s+START\s*\*\*\*([\s\S]*?)\*\*\*\s*CHARACTER\s+PROFILE\s+END\s*\*\*\*/i);
        const prodMatch = fullText.match(/\*\*\*\s*PRODUCT\s+DETAILS\s+START\s*\*\*\*([\s\S]*?)\*\*\*\s*PRODUCT\s+DETAILS\s+END\s*\*\*\*/i);
        const analysisMatch = fullText.match(/\*\*\*\s*ANALYSIS\s+START\s*\*\*\*([\s\S]*?)\*\*\*\s*ANALYSIS\s+END\s*\*\*\*/i);
        const recMatch = fullText.match(/\*\*\*\s*RECOMMENDATIONS\s+START\s*\*\*\*([\s\S]*?)\*\*\*\s*RECOMMENDATIONS\s+END\s*\*\*\*/i);
        
        // Build sections array
        if (charMatch) sections.push(charMatch[0]);
        if (prodMatch) sections.push(prodMatch[0]);
        if (analysisMatch) sections.push(analysisMatch[0]);
        if (recMatch) sections.push(recMatch[0]);
        
        // If we found sections, only return those (clean response)
        if (sections.length >= 2) {
          fullText = sections.join('\n\n');
          extractMethod += '-cleaned-to-sections';
        }
      }
      
      return {
        text: fullText.trim(),
        method: extractMethod,
        length: fullText.trim().length
      };
    });
    
    // Log extraction details in Node context
    console.log(`   📌 Method: ${response.method}`);
    console.log(`   📊 Length: ${response.length}ch`);
    
    if (response.length === 0) {
      console.error('❌ CRITICAL: Response is EMPTY!');
      console.error('   Extraction method:', response.method);
      console.error('   This means page.evaluate() returned empty text');
      
      // Try to get page state for debugging
      try {
        const debugInfo = await this.page.evaluate(() => {
          const assistant = document.querySelector('[data-message-author-role="assistant"]');
          const markdown = document.querySelector('.markdown');
          const paragraphs = Array.from(document.querySelectorAll('p'));
          
          return {
            hasAssistantElement: !!assistant,
            hasMarkdownElement: !!markdown,
            paragraphCount: paragraphs.length,
            bodyTextLength: (document.body.innerText || '').length,
            firstParagraphText: paragraphs[0]?.innerText?.substring(0, 100) || 'N/A',
            bodyText: (document.body.innerText || '').substring(0, 200)
          };
        });
        
        console.error('📋 Debug info from page:');
        console.error('   Assistant element found:', debugInfo.hasAssistantElement);
        console.error('   Markdown element found:', debugInfo.hasMarkdownElement);
        console.error('   Paragraphs found:', debugInfo.paragraphCount);
        console.error('   Body text length:', debugInfo.bodyTextLength);
        console.error('   First 100ch of body:', debugInfo.bodyText);
      } catch (debugErr) {
        console.error('   Could not get debug info:', debugErr.message);
      }
    }
    
    console.log(`✅ Response extracted: ${response.length} characters`);
    
    // Debug: Save screenshot if response seems incomplete
    if (response.length < 200) {
      console.log('⚠️  WARNING: Response seems incomplete, saving debug files...');
      try {
        const timestamp = Date.now();
        
        // Save screenshot
        const screenshotPath = path.join(process.cwd(), 'temp', `chatgpt-response-debug-${timestamp}.png`);
        await this.screenshot({ path: screenshotPath });
        console.log(`📸 Screenshot saved: ${screenshotPath}`);
        
        // Save page HTML for debugging
        const html = await this.page.content();
        const htmlPath = path.join(process.cwd(), 'temp', `chatgpt-response-debug-${timestamp}.html`);
        fs.writeFileSync(htmlPath, html);
        console.log(`📄 Page HTML saved: ${htmlPath}`);
      } catch (e) {
        console.log(`❌ Could not save debug files: ${e.message}`);
      }
    }
    
    // Verify response is valid (has analysis sections)
    try {
      const hasJson = /\{[\s\S]*\}/.test(response.text);
      const hasMarker = response.text.includes('*** CHARACTER PROFILE START ***');
      
      if (response.length > 100 && (hasJson || hasMarker)) {
        console.log('✅ Response validation: OK - contains valid analysis');
      } else if (response.length > 0 && hasJson) {
        console.log('✅ Response validation: OK - contains JSON structure');
      } else if (response.length > 0) {
        console.log('⚠️  Response validation: Incomplete - may need restructuring');
      }
    } catch (e) {
      // Validation check failed, but response still returned
    }
    
    console.log('='.repeat(80) + '\n');
    
    return response.text;
  }

  /**
   * Send text-only prompt to ChatGPT (no image required)
   * Perfect for video script generation, code generation, etc.
   */
  async sendPrompt(prompt, options = {}) {
    console.log('\n📝 ChatGPT TEXT PROMPT');
    console.log('='.repeat(80));
    console.log(`Prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`);
    console.log('');

    const maxWait = options.maxWait || 120000; // 120 seconds default
    const stabilityThreshold = options.stabilityThreshold || 50; // Characters to check for stability

    try {
      // Step 1: Find text input
      console.log('📍 STEP 1: Looking for message input...');
      
      const textInputSelectors = [
        'textarea[placeholder*="message"]',
        'textarea[placeholder*="Ask"]',
        'textarea[placeholder*="Message"]',
        'textarea[placeholder*="Send a message"]',
        'textarea',
        'div[contenteditable="true"]',
        '[contenteditable="true"]'
      ];

      let textInputSelector = null;
      
      for (const selector of textInputSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            const isVisible = await this.page.evaluate((sel) => {
              const el = document.querySelector(sel);
              return !!(el && el.offsetParent !== null);
            }, selector);
            
            if (isVisible) {
              textInputSelector = selector;
              console.log(`   ✅ Found input: ${selector}`);
              break;
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!textInputSelector) {
        throw new Error('Could not find message input field');
      }

      // Step 2: Focus input and clear existing text
      console.log('📍 STEP 2: Preparing input field...');
      try {
        await this.page.click(textInputSelector);
        await this.page.waitForTimeout(500);
        
        // Clear existing text
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
        
        await this.page.waitForTimeout(300);
        console.log('   ✅ Input cleared');
      } catch (error) {
        console.error(`   ❌ Error preparing input: ${error.message}`);
        throw error;
      }

      // Step 3: Type prompt into input
      console.log('📍 STEP 3: Entering prompt...');
      try {
        await this.page.evaluate((sel, text) => {
          const el = document.querySelector(sel);
          if (!el) throw new Error('Input field not found');
          
          // Set value directly
          if (el.tagName === 'TEXTAREA') {
            el.value = text;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (el.contentEditable === 'true') {
            el.textContent = text;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
          
          return true;
        }, textInputSelector, prompt);
        
        console.log(`   ✅ Prompt entered (${prompt.length} characters)`);
        await this.page.waitForTimeout(1000);
      } catch (error) {
        console.error(`   ❌ Error entering prompt: ${error.message}`);
        throw error;
      }

      // Step 4: Find and click send button
      console.log('📍 STEP 4: Sending message...');
      
      const sendButtonSelectors = [
        'button[aria-label*="send"]',
        'button[aria-label*="Send"]',
        'button[data-testid="send-button"]',
        'button[type="submit"]',
        'button:has-text("Send")',
        'button svg[viewBox*="send"]'
      ];

      let sendClicked = false;
      
      for (const selector of sendButtonSelectors) {
        try {
          const buttons = await this.page.$$(selector);
          for (const button of buttons) {
            const isEnabled = await this.page.evaluate((el) => {
              return !!(el && !el.disabled && el.offsetParent !== null);
            }, button);

            if (isEnabled) {
              console.log(`   ✅ Found send button: ${selector}`);
              await button.click();
              sendClicked = true;
              await this.page.waitForTimeout(500);
              break;
            }
          }
          if (sendClicked) break;
        } catch (e) {
          // Continue to next selector
        }
      }

      if (!sendClicked) {
        // Try pressing Ctrl+Enter or Enter
        console.log('   ⌨️  Pressing Enter to send...');
        await this.page.keyboard.press('Enter');
      }

      console.log('   ✅ Message sent');

      // Step 5: Wait for response to appear
      console.log('📍 STEP 5: Waiting for ChatGPT response...');
      await this.page.waitForTimeout(2000);

      // Step 6: Extract response with optimized completion detection
      let lastLength = 0;
      let stableCount = 0;
      let readyCount = 0;
      const startTime = Date.now();
      const requiredStableChecks = 4; // 💫 FIXED: Increased from 2 to 4 - ensure strong stability
      const requiredReadyChecks = 3;  // Keep stricter requirement
      const checkInterval = 500;      // Check every 500ms
      let consecutiveCompletionChecks = 0;

      while (Date.now() - startTime < maxWait) {
        try {
          const status = await this.page.evaluate(() => {
            // Find the last assistant message
            const messages = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
            
            if (messages.length === 0) {
              return { responseText: '', isComplete: false };
            }

            const lastMessage = messages[messages.length - 1];
            const text = lastMessage?.innerText || '';
            
            if (!text || text.length === 0) {
              return { responseText: '', isComplete: false };
            }

            // Multiple indicators that response is complete:
            
            // Indicator 1: No loading spinner/animation visible
            const hasSpinner = lastMessage.querySelector(
              '[class*="animate"], [class*="spinner"], [class*="loading"], .cursor-text'
            ) !== null;
            
            // Indicator 2: Input field is enabled (user can type)
            const inputSelectors = [
              'textarea[placeholder*="message"]',
              'textarea[placeholder*="Ask"]',
              'div[contenteditable="true"]',
              '[contenteditable="true"]'
            ];
            
            let inputEnabled = false;
            for (const sel of inputSelectors) {
              const input = document.querySelector(sel);
              if (input) {
                inputEnabled = !input.disabled && input.offsetParent !== null;
                break;
              }
            }
            
            // Indicator 3: Send button is enabled
            const sendButtonSelectors = [
              'button[aria-label*="send"]',
              'button[aria-label*="Send"]',
              'button[data-testid="send-button"]',
              'button[type="submit"]'
            ];
            
            let sendButtonEnabled = false;
            for (const sel of sendButtonSelectors) {
              const buttons = document.querySelectorAll(sel);
              for (const btn of buttons) {
                if (!btn.disabled && btn.offsetParent !== null) {
                  sendButtonEnabled = true;
                  break;
                }
              }
              if (sendButtonEnabled) break;
            }
            
            // Response is complete when:
            // - No spinning animation
            // - Input field is enabled
            // - Send button is enabled
            const isComplete = !hasSpinner && inputEnabled && sendButtonEnabled && text.length > 0;

            return {
              responseText: text,
              isComplete,
              indicators: {
                hasSpinner,
                inputEnabled,
                sendButtonEnabled,
                textLength: text.length
              }
            };
          });

          const { responseText, isComplete, indicators } = status;

          if (responseText && responseText.length > 0) {
            const currentLength = responseText.length;

            // Check if text has stabilized (not changing)
            if (Math.abs(currentLength - lastLength) < stabilityThreshold) {
              stableCount++;
            } else {
              stableCount = 0;
            }

            // Check if all completion indicators are true
            if (isComplete) {
              readyCount++;
              consecutiveCompletionChecks++;
            } else {
              readyCount = 0;
              consecutiveCompletionChecks = 0;
            }

            // � FIXED: Stricter exit strategy to prevent cut-off segments
            // For long content (scripts with multiple segments), require stronger stability
            const isMediumContent = currentLength > 500 && currentLength <= 3000;
            const isLongContent = currentLength > 3000;
            
            // Require MORE checks for longer content
            const requiredStableForLength = isLongContent ? 5 : (isMediumContent ? 4 : 2);
            
            // Exit if ALL conditions are true:
            // - Text has stabilized (not growing)
            // - All completion indicators are true
            // - Strong stability requirements based on content length
            if (isComplete && stableCount >= requiredStableForLength && consecutiveCompletionChecks >= requiredReadyChecks) {
              console.log(`   ✅ Response complete (${currentLength} characters) - Stable exit`);
              console.log(`      - Required stability: ${requiredStableForLength}, achieved: ${stableCount}`);
              console.log(`      - No spinner: ${!indicators.hasSpinner}`);
              console.log(`      - Input enabled: ${indicators.inputEnabled}`);
              console.log(`      - Send button enabled: ${indicators.sendButtonEnabled}`);
              break;
            }

            // 💫 FIXED: Stricter fallback - only for very long responses
            // Requires higher stability to prevent premature exit
            if (isLongContent && currentLength > 2000 && stableCount >= 4) {
              console.log(`   ✅ Response complete (${currentLength} characters) - Substantial + stable`);
              break;
            }

            lastLength = currentLength;
          }

          await this.page.waitForTimeout(checkInterval); // Check every 500ms instead of 2000ms
        } catch (e) {
          console.warn('   ⚠️  Error checking completion status:', e.message);
          await this.page.waitForTimeout(checkInterval);
        }
      }

      // Step 7: Extract final response with better text capture
      console.log('📍 STEP 7: Extracting response...');
      
      const response = await this.page.evaluate(() => {
        // Try to find the last assistant message
        const messages = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
        
        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          // 💫 FIXED: Use combination of methods for more complete text capture
          let text = lastMessage?.innerText || '';
          
          // Fallback: if innerText is empty or short, try textContent
          if (!text || text.length < 100) {
            text = lastMessage?.textContent || '';
          }
          
          // Ensure we scroll the element into full view
          if (lastMessage) {
            lastMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          
          return text;
        }

        return '';
      });

      if (!response || response.length === 0) {
        throw new Error('Could not extract response from ChatGPT');
      }

      // 💫 NEW: Log response preview to diagnose cut-off issues
      const preview = response.substring(0, 200) + (response.length > 200 ? '...' : '');
      console.log(`   ✅ Response extracted (${response.length} characters)`);
      console.log(`   📄 Preview: ${preview}`);
      console.log('='.repeat(80));
      console.log('✅ PROMPT COMPLETED\n');

      return response;

    } catch (error) {
      console.error('❌ ChatGPT prompt failed:', error.message);
      
      // Save debug info on error
      try {
        await this.saveErrorDebugInfo('chatgpt-prompt');
      } catch (e) {
        console.log('⚠️  Could not save error debug info');
      }
      
      throw error;
    }
  }
}

export default ChatGPTService;
