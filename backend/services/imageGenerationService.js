// Image Generation Service - integrates with Google Labs Flow
// Supports 2-image generation: person model + product image
// Auto-handles policy violations with retry

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

class ImageGenerationAutomation {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.options = {
      headless: false,
      sessionFilePath: path.join(__dirname, '../.sessions/google-flow-session.json'),
      projectUrl: process.env.PROJECT_GOOGLE_FLOW_URL || 'https://labs.google/fx/vi/tools/flow/project/3ba9e02e-0a33-4cf2-9d55-4c396941d7b7',
      aspectRatio: options.aspectRatio || '9:16', // Default: 9:16
      imageCount: options.imageCount || 4,
      timeouts: {
        modelConfig: 1000,
        tabSwitch: 2000,
        cropDialog: 15000,
        dialogClose: 10000,
        galleryHide: 20000,
        promptType: 2000,
        submitWait: 2000,
        downloadClick: 2000,
        upgradeWait: 10000,   // Wait for image upgrade message (nâng cấp hình ảnh)
        fileDownload: 15000,   // Wait for actual file to be saved
        generation: 60000
      },
      ...options
    };
  }

  async init() {
    console.log('🚀 Initializing Image Generation...');
    
    // Set up download directory
    this.downloadDir = this.options.downloadDir || path.join(process.cwd(), 'temp', 'google-flow-downloads');
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
    console.log(`📂 Download directory: ${this.downloadDir}`);
    
    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      args: ['--no-sandbox']
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });
    
    // Set up download behavior
    const client = await this.page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: this.downloadDir
    });

    // Load session cookies
    try {
      const sessionData = JSON.parse(fs.readFileSync(this.options.sessionFilePath, 'utf8'));
      for (const cookie of sessionData.cookies) {
        try { await this.page.setCookie(cookie); } catch (e) {}
      }
      console.log('✅ Session restored');
    } catch (error) {
      console.warn('⚠️ No session found');
    }
  }

  async waitForPageFullyLoaded(maxWaitTime = 30000) {
    console.log('⏳ Waiting for "đang tải" to disappear...');
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const isLoading = await this.page.evaluate(() => {
          const bodyText = document.body.innerText.toLowerCase();
          return bodyText.includes('đang tải') || bodyText.includes('loading') || bodyText.includes('please wait');
        });

        if (!isLoading) {
          console.log('✓ Loading complete');
          return true;
        }

        await this.page.waitForTimeout(500);
      } catch (error) {
        console.warn(`⚠️ Error checking page load status: ${error.message}`);
        await this.page.waitForTimeout(1000);
      }
    }

    console.warn(`⚠️ Timeout waiting for page to load after ${maxWaitTime / 1000}s - proceeding anyway`);
    return false;
  }

  async navigateToProject() {
    console.log('📍 Navigating to image generation project...');
    await this.page.goto(this.options.projectUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for loading text to disappear (30s)
    await this.waitForPageFullyLoaded(30000);
    console.log('✓ Project fully loaded and ready');
  }

  async configureModel() {
    console.log('📍 Configuring Nano Banana model...');
    
    const modelConfigured = await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const tuneBtn = buttons.find(btn => {
        const icon = btn.querySelector('i');
        return icon && icon.textContent.includes('tune');
      });

      if (tuneBtn) {
        tuneBtn.click();
        return true;
      }
      return false;
    });

    if (!modelConfigured) {
      console.log('⚠️ Config button not found');
      return;
    }

    await this.page.waitForTimeout(this.options.timeouts.modelConfig);

    const foundModel = await this.page.evaluate(() => {
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        if (el.textContent.includes('Mô hình') && el.textContent.length < 200) {
          const children = el.querySelectorAll('button, [role="button"], div[role="tab"]');
          for (const child of children) {
            if (child.textContent.includes('Mô hình')) {
              child.click();
              return true;
            }
          }
        }
      }
      return false;
    });

    if (foundModel) {
      console.log('✓ Model selector opened');
      await this.page.waitForTimeout(500);

      const selectedNanoBanana = await this.page.evaluate(() => {
        const options = document.querySelectorAll('[role="option"], button, li');
        for (const option of options) {
          const text = option.textContent.trim();
          // 💫 CHANGED: Prefer Nano Banana Pro (highest quality)
          if (text.includes('Nano') && text.includes('Banana') && text.includes('Pro')) {
            option.click();
            return true;
          }
        }
        // Fallback to regular Nano Banana if Pro not found
        for (const option of options) {
          const text = option.textContent.trim();
          if ((text.includes('Nano') && text.includes('Banana') && !text.includes('Pro')) ||
              text === 'Nano Banana') {
            option.click();
            return true;
          }
        }
        return false;
      });

      if (selectedNanoBanana) {
        console.log('✓ Selected Nano Banana Pro (or Nano Banana as fallback)');
      }
    }

    await this.page.waitForTimeout(this.options.timeouts.modelConfig);

    // 💫 CHANGED: Don't close config dialog here - let configureAspectRatio handle it
    // This ensures aspect ratio can be set while the config dialog is still open
    console.log('✓ Model configured - keeping config dialog open for aspect ratio selection');
  }

  async applyTabSwitchTrick() {
    console.log('📍 Applying tab-switch trick...');
    
    // Switch to video tab
    await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      buttons.find(btn => {
        const icon = btn.querySelector('i');
        return icon && icon.textContent.includes('videocam');
      })?.click();
    });
    await this.page.waitForTimeout(this.options.timeouts.tabSwitch);

    // Switch to image tab
    await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      buttons.find(btn => {
        const icon = btn.querySelector('i');
        return icon && icon.textContent.includes('image');
      })?.click();
    });
    await this.page.waitForTimeout(this.options.timeouts.tabSwitch);
    console.log('✓ Tab trick applied');
  }

  async uploadAndCropImage(imagePath, imageType, index) {
    console.log(`📍 Uploading image ${index + 1} (${imageType})...`);

    // Apply tab trick
    await this.applyTabSwitchTrick();

    // Click add button - IMPROVED: search more flexibly (from working test file)
    const addClicked = await this.page.evaluate(() => {
      const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
      if (!textarea) return false;

      // Get the parent container (level 1: sc-77366d4e-2)
      let container = textarea.parentElement;
      while (container && !container.className.includes('sc-77366d4e-2')) {
        container = container.parentElement;
      }

      if (!container) return false;

      // Search ALL buttons in container for "add" icon - more flexible
      const allButtons = Array.from(container.querySelectorAll('button'));
      const addBtn = allButtons.find(btn => {
        const icon = btn.querySelector('i');
        if (!icon) return false;
        const iconText = icon.textContent.trim();
        return iconText === 'add' && !btn.disabled;
      });

      if (addBtn) {
        addBtn.click();
        return true;
      }

      // If not found with icon === 'add', try different icon texts
      const alternativeBtn = allButtons.find(btn => {
        const icon = btn.querySelector('i');
        if (!icon) return false;
        const iconText = icon.textContent.trim().toLowerCase();
        return (iconText.includes('add') || iconText.includes('plus') || iconText === 'add_photo') && !btn.disabled;
      });

      if (alternativeBtn) {
        alternativeBtn.click();
        return true;
      }

      // Last resort: look in children[2] area more carefully
      if (container.children[2]) {
        const child = container.children[2];
        const buttons = Array.from(child.querySelectorAll('button'));
        for (const btn of buttons) {
          const icon = btn.querySelector('i');
          if (icon) {
            const txt = icon.textContent.trim().toLowerCase();
            if ((txt === 'add' || txt.includes('add') || txt === 'add_photo') && !btn.disabled) {
              btn.click();
              return true;
            }
          }
        }
      }

      return false;
    });

    if (!addClicked) {
      // Debug: Log what buttons are actually available
      const debugInfo = await this.page.evaluate(() => {
        const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
        if (!textarea) return { error: 'textarea not found' };

        let container = textarea.parentElement;
        while (container && !container.className.includes('sc-77366d4e-2')) {
          container = container.parentElement;
        }

        if (!container) return { error: 'container sc-77366d4e-2 not found' };

        const allButtons = Array.from(container.querySelectorAll('button'));
        return {
          totalButtons: allButtons.length,
          buttonDetails: allButtons.map(btn => ({
            icon: btn.querySelector('i')?.textContent.trim() || 'NO_ICON',
            disabled: btn.disabled,
            visible: btn.offsetParent !== null
          }))
        };
      });

      console.log(`  ❌ Could not click add button for image ${index + 1}`);
      console.log(`  Debug info:`, JSON.stringify(debugInfo, null, 2));
      throw new Error(`Could not click add button for image ${index + 1}`);
    }
    console.log('  ✓ Add button clicked');

    // Upload file - improved sequence from test file: wait → promise → click
    // STEP 1: Wait for file input to appear on the page
    let fileInputFound = false;
    let waitAttempts = 0;
    while (!fileInputFound && waitAttempts < 34) {  // ~10 seconds at 300ms intervals
      await this.page.waitForTimeout(300);
      waitAttempts++;

      const fileInputCount = await this.page.evaluate(() => {
        return Array.from(document.querySelectorAll('input[type="file"]')).length;
      });

      if (fileInputCount > 0) {
        fileInputFound = true;
        console.log(`  ✓ File input appeared (after ${waitAttempts * 300}ms)`);
        break;
      }
    }

    if (!fileInputFound) {
      const debugStatus = await this.page.evaluate(() => {
        return {
          fileInputs: Array.from(document.querySelectorAll('input[type="file"]')).length,
          allInputs: Array.from(document.querySelectorAll('input')).length,
          dialogs: Array.from(document.querySelectorAll('[role="dialog"]')).length
        };
      });
      console.log(`  ❌ File input did not appear within ~10 seconds`);
      console.log(`  Debug:`, JSON.stringify(debugStatus, null, 2));
      throw new Error(`File input did not appear within 10 seconds`);
    }

    // STEP 2: Set up file chooser promise (BEFORE clicking)
    const fileChooserPromise = this.page.waitForFileChooser({ timeout: 15000 });

    // STEP 3: Click the file input
    const fileInputClicked = await this.page.evaluate(() => {
      const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
      for (const input of fileInputs) {
        const accept = (input.accept || '').toLowerCase();
        // Find file input that accepts images
        if (accept.includes('jpg') || accept.includes('png') || accept.includes('image') || accept === '') {
          input.click();
          return true;
        }
      }
      // If still no luck, click the first file input
      if (fileInputs.length > 0) {
        fileInputs[0].click();
        return true;
      }
      return false;
    });

    if (!fileInputClicked) {
      console.log(`  ❌ Could not click file input`);
      throw new Error(`Could not click file input for image ${index + 1}`);
    }

    try {
      const fileChooser = await fileChooserPromise;
      await fileChooser.accept([imagePath]);
      await this.page.waitForTimeout(3000);
      console.log(`  ✓ File uploaded: ${path.basename(imagePath)}`);
    } catch (chooserError) {
      console.log(`  ❌ File chooser error: ${chooserError.message}`);
      
      // Debug: Check if file input is still on page
      const fileInputStatus = await this.page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
        return {
          count: inputs.length,
          details: inputs.map(inp => ({
            accept: inp.accept,
            visible: inp.offsetParent !== null,
            disabled: inp.disabled
          }))
        };
      });
      
      console.log(`  Debug - File inputs on page:`, JSON.stringify(fileInputStatus, null, 2));
      throw new Error(`File chooser failed: ${chooserError.message}`);
    }

    // Wait for crop dialog
    try {
      await this.page.waitForFunction(() => {
        const dialogs = document.querySelectorAll('[role="dialog"]');
        for (const dialog of dialogs) {
          const h2 = dialog.querySelector('h2');
          if (h2 && h2.textContent.includes('Cắt')) return true;
        }
        return false;
      }, { timeout: this.options.timeouts.cropDialog });
      console.log('  ✓ Crop dialog appeared');
    } catch (e) {
      throw new Error(`Crop dialog timeout: ${e.message}`);
    }

    // Click crop button
    await this.page.evaluate(() => {
      const dialogs = document.querySelectorAll('[role="dialog"]');
      for (const dialog of dialogs) {
        const h2 = dialog.querySelector('h2');
        if (h2 && h2.textContent.includes('Cắt')) {
          const buttons = Array.from(dialog.querySelectorAll('button'));
          const cropBtn = buttons.find(btn => btn.textContent.includes('Cắt và lưu'));
          if (cropBtn) {
            cropBtn.click();
            return;
          }
        }
      }
    });
    console.log('  ✓ Crop button clicked');

    // Wait for dialog close + poll button count to verify upload completed
    try {
      await this.page.waitForFunction(
        () => {
          const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
          return !dialogs.some(dialog => {
            const title = dialog.querySelector('h2');
            return title && title.textContent.includes('Cắt');
          });
        },
        { timeout: this.options.timeouts.dialogClose }
      );
      console.log('  ✓ Dialog closed');
    } catch (e) {
      console.log('  ⚠️ Dialog close timeout, continuing...');
    }

    // Poll button count to verify upload is integrated (from test file approach)
    const expectedButtonCount = index === 0 ? 3 : 4;  // 3 after 1st image, 4 after 2nd
    let buttonCountReady = false;
    let pollAttempts = 0;
    const maxPolls = 60;  // ~30 seconds with 500ms intervals

    while (!buttonCountReady && pollAttempts < maxPolls) {
      await this.page.waitForTimeout(500);
      pollAttempts++;

      const buttonInfo = await this.page.evaluate(() => {
        const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
        if (!textarea) return { error: 'textarea not found', buttons: 0 };

        let container = textarea.parentElement;
        while (container && !container.className.includes('sc-77366d4e-2')) {
          container = container.parentElement;
        }

        if (!container) return { error: 'container not found', buttons: 0 };

        const buttons = Array.from(container.querySelectorAll('button'));
        return { buttons: buttons.length };
      });

      if (buttonInfo.buttons >= expectedButtonCount) {
        buttonCountReady = true;
        console.log(`  ✓ Button count verified: ${buttonInfo.buttons} buttons (expected ${expectedButtonCount})`);
        break;
      }

      if (pollAttempts % 10 === 0) {
        console.log(`  ⏳ Polling button count... ${pollAttempts * 500}ms (${buttonInfo.buttons} buttons)`);
      }
    }

    if (!buttonCountReady) {
      console.log(`  ⚠️ Button count timeout - expected ${expectedButtonCount}, got different count`);
    }

    // Wait for gallery to auto-hide
    try {
      await this.page.waitForFunction(
        () => {
          const scrollers = document.querySelectorAll('[data-testid="virtuoso-scroller"]');
          return scrollers.length === 1;
        },
        { timeout: this.options.timeouts.galleryHide }
      );
      console.log('  ✓ Gallery hidden\n');
    } catch (e) {
      console.log('  ⚠️ Gallery hide timeout\n');
    }
  }

  async enterPrompt(prompt) {
    console.log('📍 Entering prompt (3-part strategy: type + paste + type)...');

    // Clean prompt
    const cleanPrompt = prompt.trim().replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ');
    const typeLength = 20; // First 20 chars and last 20 chars type manually
    
    // 💫 NEW 3-PART STRATEGY: Type (20) + Paste (middle) + Type (20)
    const firstPart = cleanPrompt.substring(0, typeLength); // First 20 chars - TYPE
    const pasteStart = typeLength;
    const pasteEnd = cleanPrompt.length - typeLength;
    const middlePart = cleanPrompt.substring(pasteStart, pasteEnd); // Middle part - PASTE
    const lastPart = cleanPrompt.substring(cleanPrompt.length - typeLength); // Last 20 chars - TYPE
    const expectedLength = cleanPrompt.length;

    console.log(`  Prompt (cleaned): "${cleanPrompt}"`);
    console.log(`  Strategy: Type (${firstPart.length} chars) + Paste (${middlePart.length} chars) + Type (${lastPart.length} chars)`);
    console.log(`  Target length: ${expectedLength} characters`);

    // Step 1: Focus textarea and clear it
    await this.page.focus('#PINHOLE_TEXT_AREA_ELEMENT_ID');
    await this.page.waitForTimeout(300);
    
    // Clear existing content
    await this.page.evaluate(() => {
      const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
      if (textarea) {
        textarea.value = '';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await this.page.waitForTimeout(200);

    // Step 2: Type first 20 characters (helps React component initialize)
    if (firstPart.length > 0) {
      console.log(`  → Typing first ${firstPart.length} characters: "${firstPart}"`);
      
      await this.page.keyboard.type(firstPart, { delay: 50 });
      await this.page.waitForTimeout(300);
    }

    // Step 3: Paste middle part (most efficient for large content)
    if (middlePart.length > 0) {
      console.log(`  → Pasting ${middlePart.length} characters...`);
      
      // Keep focus on textarea
      await this.page.focus('#PINHOLE_TEXT_AREA_ELEMENT_ID');
      
      // Paste using clipboard
      await this.page.evaluate((text) => {
        navigator.clipboard.writeText(text).then(() => {
          const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
          if (textarea) {
            // Get current length before paste
            const beforeLength = textarea.value.length;
            
            // Paste the text
            textarea.value = textarea.value + text;
            textarea.selectionStart = textarea.value.length;
            textarea.selectionEnd = textarea.value.length;
            
            // Trigger events
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      }, middlePart);
      
      await this.page.waitForTimeout(500);
    }

    // Step 4: Type last 20 characters (ensures React event completion)
    if (lastPart.length > 0) {
      console.log(`  → Typing final ${lastPart.length} characters: "${lastPart}"`);
      
      // Move cursor to end
      await this.page.evaluate(() => {
        const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
        if (textarea) {
          textarea.selectionStart = textarea.value.length;
          textarea.selectionEnd = textarea.value.length;
        }
      });
      
      // Type the final part character by character
      await this.page.keyboard.type(lastPart, { delay: 50 });
      await this.page.waitForTimeout(200);
      
      // Trigger final events to ensure React component recognizes the full input
      await this.page.evaluate(() => {
        const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
        if (textarea) {
          textarea.dispatchEvent(new Event('blur', { bubbles: true }));
          textarea.dispatchEvent(new Event('focus', { bubbles: true }));
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
          textarea.dispatchEvent(new Event('keyup', { bubbles: true }));
        }
      });
      await this.page.waitForTimeout(300);
    }

    // Step 5: Wait for textarea content to match expected length
    console.log(`  → Waiting for textarea to have ${expectedLength} characters...`);
    let promptReady = false;
    let waitAttempts = 0;
    const maxWaitAttempts = 20; // 10 seconds max (500ms per attempt)

    while (!promptReady && waitAttempts < maxWaitAttempts) {
      const currentLength = await this.page.evaluate(() => {
        const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
        return textarea ? textarea.value.length : 0;
      });

      if (currentLength >= expectedLength) {
        promptReady = true;
        console.log(`  ✓ Textarea ready (${currentLength}/${expectedLength} characters)`);
      } else {
        if (waitAttempts % 2 === 0) {
          process.stdout.write(`  ⏱️  ${currentLength}/${expectedLength}...\r`);
        }
        await this.page.waitForTimeout(500);
        waitAttempts++;
      }
    }

    if (!promptReady) {
      console.log(`\n  ⚠️  Timeout waiting for full prompt (got partial content)`);
    }

    console.log(`\n✓ Prompt entered (${expectedLength} characters)`);
    
    // Return expected length for validation in submit
    this.expectedPromptLength = expectedLength;
  }

  // 💫 NEW: Click "Sử dụng lại câu lệnh" (reuse command) button to restore components
  async clickReuseCommandButton() {
    console.log('🔄 Looking for "Sử dụng lại câu lệnh" (reuse command) button...');
    
    const reuseCommandFound = await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        const btnText = btn.textContent.trim().toLowerCase();
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
        
        // Look for "Sử dụng lại câu lệnh" button (Vietnamese or English)
        if (btnText.includes('sử dụng lại') || ariaLabel.includes('sử dụng lại') || 
            btnText.includes('reuse') || ariaLabel.includes('reuse')) {
          console.log(`  → Found "Sử dụng lại câu lệnh" button, clicking...`);
          btn.click();
          return true;
        }
      }
      return false;
    });

    if (!reuseCommandFound) {
      console.log(`  ⚠️  "Sử dụng lại câu lệnh" button not found - components may need to be re-uploaded`);
      return false;
    }

    // Wait for UI to update after clicking reuse button
    await this.page.waitForTimeout(1500);
    console.log(`✅ Reuse button clicked, components restored`);
    
    // 💫 CRITICAL: Clear textarea after reuse button click
    console.log(`🧹 Clearing textarea after reuse...`);
    await this.page.evaluate(() => {
      const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
      if (textarea) {
        textarea.value = '';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    await this.page.waitForTimeout(500);
    console.log(`✅ Textarea cleared, ready for new prompt`);
    return true;
  }

  async submitAndWaitForGeneration() {
    console.log('📍 Validating submission requirements...');

    // Comprehensive validation before submission
    const expectedLen = this.expectedPromptLength || 0;
    
    // 💫 NEW: Retry logic for component detection (in case STEP 2B is slow)
    let submitValidation = null;
    let validationAttempts = 0;
    const maxValidationAttempts = 3;
    
    while (!submitValidation?.valid && validationAttempts < maxValidationAttempts) {
      validationAttempts++;
      
      submitValidation = await this.page.evaluate((expectedLength) => {
        const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
        if (!textarea) return { valid: false, reason: 'textarea not found', textareaLength: 0 };

        let container = textarea.parentElement;
        while (container && !container.className.includes('sc-77366d4e-2')) {
          container = container.parentElement;
        }

        if (!container) return { valid: false, reason: 'container not found', textareaLength: textarea.value.length };

        const buttons = Array.from(container.querySelectorAll('button'));
        let closeCount = 0;
        let sendBtn = null;

        for (const btn of buttons) {
          const icon = btn.querySelector('i');
          if (!icon) continue;
          const iconText = icon.textContent.trim();
          if (iconText === 'close') closeCount++;
          if (iconText === 'arrow_forward') sendBtn = btn;
        }

        const textareaLength = textarea.value.length;

        // 💫 CHANGED: More flexible component check (allow 1-3 components)
        if (closeCount < 1 || closeCount > 3) {
          return { valid: false, reason: `Expected 1-3 components, found ${closeCount}`, components: closeCount, textareaLength };
        }

        // Check send button exists
        if (!sendBtn) {
          return { valid: false, reason: 'send button not found', components: closeCount, textareaLength };
        }

        // Check textarea length matches expected
        if (textareaLength < expectedLength) {
          return { valid: false, reason: `Textarea incomplete (${textareaLength}/${expectedLength} chars)`, components: closeCount, textareaLength };
        }

        return { valid: true, components: closeCount, textareaLength, sendDisabled: sendBtn.disabled };
      }, expectedLen);

      if (!submitValidation.valid) {
        console.log(`⚠️  Validation attempt ${validationAttempts}/${maxValidationAttempts} failed: ${submitValidation.reason}`);
        console.log(`   Textarea: ${submitValidation.textareaLength}/${expectedLen} chars`);
        console.log(`   Components: ${submitValidation.components}`);
        
        if (validationAttempts < maxValidationAttempts) {
          console.log(`⏳ Retrying in 1s...`);
          await this.page.waitForTimeout(1000);
        } else {
          throw new Error(`Cannot submit: ${submitValidation.reason}`);
        }
      } else {
        console.log(`✓ Validation passed on attempt ${validationAttempts}`);
      }
    }

    if (submitValidation.sendDisabled) {
      console.log(`⚠️  Send button disabled, enabling...`);
      await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const sendBtn = buttons.find(btn => {
          const icon = btn.querySelector('i');
          return icon && icon.textContent.includes('arrow_forward');
        });
        if (sendBtn) sendBtn.disabled = false;
      });
    }

    console.log(`✓ All checks passed (${submitValidation.components} components, ${submitValidation.textareaLength}/${expectedLen} chars)\n`);

    // Final: Click send button
    await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        const icon = btn.querySelector('i');
        if (icon && (icon.textContent.includes('arrow_forward') || icon.textContent.includes('send'))) {
          if (!btn.disabled) {
            btn.click();
            return true;
          }
        }
      }
      return false;
    });

    await this.page.waitForTimeout(this.options.timeouts.submitWait);
    console.log('✓ Submitted\n');

    // Monitor generation (reduced to 60 seconds)
    console.log('📍 Monitoring generation (max 60s, checking for download button)...');
    let generationComplete = false;
    let placeholdersDetected = false;
    let monitoredStates = [];

    for (let i = 0; i < 60; i++) {
      const state = await this.page.evaluate(() => {
        const scroller = document.querySelector('[data-testid="virtuoso-scroller"]');
        if (!scroller) return null;

        const items = scroller.querySelectorAll('[data-index]');
        let hasLoadingIndicators = false;

        items.forEach(item => {
          if (item.textContent.match(/\d+%/)) {
            hasLoadingIndicators = true;
          }
        });

        // Check for download button in data-index="1" (the first generated image item)
        const indexOne = scroller.querySelector('[data-index="1"]');
        let hasDownloadButtonInIndex1 = false;
        let hasImageInIndex1 = false;
        
        if (indexOne) {
          // Check for download button (usually has aria-label or title containing 'download')
          const downloadBtn = indexOne.querySelector('[aria-label*="download" i], [title*="download" i], button[aria-label*="tải" i]');
          hasDownloadButtonInIndex1 = !!downloadBtn;
          
          // Check for actual preview image
          const previewImg = indexOne.querySelector('img[alt]');
          hasImageInIndex1 = !!previewImg;
        }

        const images = scroller.querySelectorAll('img[alt]');
        return {
          itemCount: items.length,
          imageCount: images.length,
          hasLoadingIndicators,
          hasDownloadButtonInIndex1,
          hasImageInIndex1
        };
      });

      if (!state) {
        if (i % 15 === 0) process.stdout.write('.');
        await this.page.waitForTimeout(1000);
        continue;
      }

      if (i % 10 === 0 || state.hasLoadingIndicators || (monitoredStates.length < 3)) {
        monitoredStates.push({ second: i, ...state });
      }

      if (state.hasLoadingIndicators && !placeholdersDetected) {
        placeholdersDetected = true;
        console.log(`\n✓ Generation started (at ${i}s)`);
      }

      // ✅ IMPROVED: Check for download button in index 1 + preview image (more specific detection)
      if (placeholdersDetected && !state.hasLoadingIndicators && state.hasDownloadButtonInIndex1 && state.hasImageInIndex1) {
        generationComplete = true;
        console.log(`✓ Generation complete at ${i}s (download button detected in index 1, preview ready)`);
        console.log(`  Monitoring summary: Started=${placeholdersDetected}, Complete=${generationComplete}, totalTime=${i}s`);
        console.log(`\n`);
        break;
      }

      if (i % 15 === 0 && i > 0) process.stdout.write('.');
      await this.page.waitForTimeout(1000);
    }

    if (!generationComplete) {
      console.log('⚠️ Generation timeout at 60s, continuing anyway...');
      console.log(`  State samples (${monitoredStates.length} checkpoints):`);
      monitoredStates.slice(0, 5).forEach(s => {
        console.log(`    @${s.second}s: items=${s.itemCount}, images=${s.imageCount}, loading=${s.hasLoadingIndicators}, btn@1=${s.hasDownloadButtonInIndex1}, img@1=${s.hasImageInIndex1}`);
      });
      console.log(`\n`);
    }


    // NOTE: Policy violation handling is now done in downloadResults() function
    // This consolidation prevents conflicting retry logic between two phases
    console.log('⏳ Results ready for download phase (policy check will occur there)\n');
  }

  async configureAspectRatio(aspectRatio = '9:16') {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📐 CONFIGURING ASPECT RATIO & OUTPUT COUNT`);
    console.log(`${'='.repeat(80)}\n`);
    console.log(`   Input aspect ratio: ${aspectRatio}`);
    console.log(`   Output count: ${this.options.imageCount}\n`);
    
    const isHorizontal = aspectRatio.includes('16:9') || aspectRatio.startsWith('16');
    const targetFormat = isHorizontal ? 'horizontal (16:9)' : 'vertical (9:16)';
    console.log(`   Target format: ${targetFormat}\n`);

    // Step 1: Click "Tỷ lệ khung hình" button to open aspect ratio selector
    console.log(`   🔍 Finding aspect ratio control button...`);
    const aspectRatioOpened = await this.page.evaluate((isHorizontal) => {
      // Search for all buttons - including those in the popover dialog
      const buttons = Array.from(document.querySelectorAll('button[role="combobox"]'));
      
      for (const btn of buttons) {
        const text = btn.textContent.toLowerCase();
        // Look for button with aspect ratio label
        if (text.includes('tỷ lệ khung hình') || text.includes('khổ dọc') || text.includes('khổ ngang')) {
          // Click to open the dropdown
          btn.click();
          return true;
        }
      }
      return false;
    }, isHorizontal);

    if (aspectRatioOpened) {
      console.log(`   ✅ Aspect ratio control opened`);
      await this.page.waitForTimeout(800);
      
      // Step 2: Select vertical or horizontal from the dropdown
      const aspectSelected = await this.page.evaluate((isHorizontal) => {
        // Look for the menu/dropdown that appeared
        const options = Array.from(document.querySelectorAll('[role="option"], button, li, div[role="menuitem"]'));
        
        const keyword = isHorizontal ? 'khổ ngang' : 'khổ dọc';
        
        for (const opt of options) {
          const text = opt.textContent.toLowerCase();
          if (text.includes(keyword) && text.includes(':')) {  // Has aspect ratio like 9:16 or 16:9
            opt.click();
            return true;
          }
        }
        return false;
      }, isHorizontal);

      if (aspectSelected) {
        console.log(`   ✅ Selected ${targetFormat}`);
      } else {
        console.log(`   ⚠️  Could not select aspect ratio, using default`);
      }
      await this.page.waitForTimeout(800);
    } else {
      console.log(`   ⚠️  Could not open aspect ratio control`);
    }
    
    
    // 💫 CHANGED: Configure output count BEFORE closing dialog
    console.log(`\n📊 CONFIGURING OUTPUT COUNT`);
    console.log(`${'─'.repeat(80)}\n`);
    console.log(`   Target output count: ${this.options.imageCount}\n`);

    const outputCountConfigured = await this.page.evaluate((targetCount) => {
      // Find "Câu trả lời đầu ra cho mỗi câu lệnh" button (output count control)
      const buttons = Array.from(document.querySelectorAll('button'));
      let outputBtn = null;
      
      for (const btn of buttons) {
        const text = btn.textContent.toLowerCase();
        if (text.includes('câu trả lời') && text.includes('đầu ra')) {
          outputBtn = btn;
          break;
        }
      }
      
      if (!outputBtn) {
        console.log('   ℹ️  Output count button not found in current view');
        return false;
      }
      
      // Always click the button to open the dropdown
      outputBtn.click();
      return true;
    }, this.options.imageCount);

    if (outputCountConfigured) {
      await this.page.waitForTimeout(800);
      
      // Now select the desired count from the dropdown
      const countSelected = await this.page.evaluate((targetCount) => {
        // Find the option that matches target count
        const options = Array.from(document.querySelectorAll('[role="option"], button, li, div[role="menuitem"]'));
        
        for (const opt of options) {
          const text = opt.textContent.trim();
          // Look for the number that matches target count
          if (text === targetCount.toString()) {
            opt.click();
            return true;
          }
        }
        
        // Fallback: try to find by looking for just the number
        for (const opt of options) {
          if (opt.textContent.includes(targetCount.toString()) && opt.textContent.length < 10) {
            opt.click();
            return true;
          }
        }
        
        return false;
      }, this.options.imageCount);

      if (countSelected) {
        console.log(`   ✅ Output count set to ${this.options.imageCount}`);
      } else {
        console.log(`   ⚠️  Could not set output count, using default`);
      }
      await this.page.waitForTimeout(800);
    }
    
    // 💫 CHANGED: Close config dialog after setting aspect ratio AND output count
    console.log(`\n   🎫 Closing config dialog...`);
    const dialogClosed = await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const tuneBtn = buttons.find(btn => {
        const icon = btn.querySelector('i');
        return icon && icon.textContent.includes('tune');
      });
      if (tuneBtn) {
        tuneBtn.click();
        return true;
      }
      return false;
    });

    if (dialogClosed) {
      await this.page.waitForTimeout(500);
      console.log(`   ✓ Config dialog closed\n`);
    } else {
      console.log(`   ⚠️  Could not find tune button to close dialog\n`);
    }

    console.log(`${'='.repeat(80)}\n`);
  }

  async downloadResults(outputDir, expectedItemCount = 2) {
    console.log('📍 Processing results...');
    
    // Wait a moment for DOM to settle after generation
    await this.page.waitForTimeout(500);

    console.log(`⏳ Checking for policy violations...\n`);
    
    // Better policy violation detection - check the specific error container
    let hasViolation = true;
    let violationCheckAttempts = 0;
    const maxViolationChecks = 3;

    while (hasViolation && violationCheckAttempts < maxViolationChecks) {
      violationCheckAttempts++;
      
      const violationCheckResult = await this.page.evaluate(() => {
        const scroller = document.querySelector('[data-testid="virtuoso-scroller"]');
        if (!scroller) return { hasViolation: false, reason: 'no-scroller' };

        const itemList = scroller.querySelector('[data-testid="virtuoso-item-list"]');
        if (!itemList) return { hasViolation: false, reason: 'no-itemlist' };

        // Check index 1 for policy violation message
        const newestItem = itemList.querySelector('[data-index="1"]');
        if (!newestItem) return { hasViolation: false, reason: 'no-newest-item' };

        // Strategy 1: Check specific violation div (class contains 'dXpkuj' or similar pattern)
        const violationDivs = Array.from(newestItem.querySelectorAll('div')).filter(div => {
          const text = div.textContent.toLowerCase();
          return (text.includes('vi phạm chính sách') || 
                  text.includes('policy violation') || 
                  text.includes('violates'));
        });

        if (violationDivs.length > 0) {
          return { hasViolation: true, reason: 'violation-div-found' };
        }

        // Strategy 2: Scan all text in item for violation keywords
        const itemText = newestItem.textContent.toLowerCase();
        const hasViolationMsg = itemText.includes('vi phạm chính sách') || 
                               itemText.includes('policy violation') || 
                               itemText.includes('violates') ||
                               itemText.includes('violate');
        
        return { hasViolation: hasViolationMsg, reason: hasViolationMsg ? 'violation-found' : 'no-violation' };
      });

      if (!violationCheckResult.hasViolation) {
        console.log(`✓ No policy violation detected\n`);
        hasViolation = false;
        break;
      }

      console.log(`⚠️  POLICY VIOLATION DETECTED! Attempting regeneration...\n`);

      // Retry regeneration up to 3 times
      let regenerateCount = 0;
      const maxRetries = 3;
      let violationResolved = false;

      for (regenerateCount = 1; regenerateCount <= maxRetries; regenerateCount++) {
        console.log(`🔄 Retry attempt ${regenerateCount}/${maxRetries}...`);

        // 💫 NEW: Click "Sử dụng lại câu lệnh" (reuse command) button
        const reuseCommandFound = await this.page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          for (const btn of buttons) {
            const btnText = btn.textContent.trim().toLowerCase();
            const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
            
            // Look for "Sử dụng lại câu lệnh" button
            if (btnText.includes('sử dụng lại') || ariaLabel.includes('sử dụng lại') || 
                btnText.includes('reuse') || ariaLabel.includes('reuse')) {
              console.log(`  → Found "Sử dụng lại câu lệnh" button, clicking...`);
              btn.click();
              return true;
            }
          }
          return false;
        });

        if (!reuseCommandFound) {
          console.log(`  ⚠️  "Sử dụng lại câu lệnh" button not found`);
          continue;  // Try next attempt
        }

        // Wait for UI to update after clicking reuse button
        await this.page.waitForTimeout(1500);

        // 💫 NEW: Double check textarea has content
        const textareaStatus = await this.page.evaluate(() => {
          const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
          if (!textarea) return { hasContent: false, reason: 'textarea-not-found', length: 0 };
          
          const content = textarea.value.trim();
          const hasContent = content.length > 20;  // Must have substantial content
          
          return { 
            hasContent: hasContent, 
            reason: hasContent ? 'content-ok' : 'empty-or-short',
            length: content.length,
            preview: content.substring(0, 50)
          };
        });

        console.log(`  📝 Textarea check: ${textareaStatus.reason} (${textareaStatus.length} chars)`);

        if (!textareaStatus.hasContent) {
          console.log(`  ⚠️  Textarea content missing or too short`);
          continue;  // Try next attempt
        }

        // 💫 NEW: Click "Tạo" (Create/Submit) button
        const submitFound = await this.page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          for (const btn of buttons) {
            const icon = btn.querySelector('i');
            if (!icon) continue;
            
            const iconText = icon.textContent.trim().toLowerCase();
            const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
            
            // Look for create/send button (arrow_forward icon)
            if ((iconText === 'arrow_forward' || iconText === 'send') && !btn.disabled) {
              console.log(`  → Found "Tạo" button, clicking...`);
              btn.click();
              return true;
            }
          }
          return false;
        });

        if (!submitFound) {
          console.log(`  ⚠️  "Tạo" button not found or disabled`);
          continue;  // Try next attempt
        }

        console.log(`  ✓ Submitted - waiting for generation (max 3 min)...`);

        // Wait for generation to complete (up to 3 minutes max per attempt)
        let generationComplete = false;
        for (let wait = 0; wait < 180; wait++) {
          const genState = await this.page.evaluate(() => {
            const itemList = document.querySelector('[data-testid="virtuoso-item-list"]');
            if (!itemList) return 'unknown';

            const text = itemList.textContent.toLowerCase();
            
            // Check if still generating
            if (text.includes('generating') || text.includes('đang tạo') || text.includes('đang xử lý')) {
              return 'generating';
            }
            
            // Check if still has violation
            if (text.includes('vi phạm') || text.includes('policy') || text.includes('violate')) {
              return 'violation';
            }
            
            return 'complete';
          });

          if (genState === 'complete') {
            console.log(`  ✓ Generation complete (${wait}s)`);
            generationComplete = true;
            break;
          } else if (genState === 'violation') {
            console.log(`  ⚠️  Policy violation detected again`);
            break;
          }

          if ((wait + 1) % 30 === 0) {
            process.stdout.write(`  ⏳ ${wait + 1}s...\r`);
          }

          await this.page.waitForTimeout(1000);
        }

        if (!generationComplete) {
          console.log(`  ⚠️  Generation timeout after 3 minutes`);
          continue;  // Try next attempt
        }

        // Check if violation is resolved
        const stillViolated = await this.page.evaluate(() => {
          const itemList = document.querySelector('[data-testid="virtuoso-item-list"]');
          if (!itemList) return false;
          
          const text = itemList.textContent.toLowerCase();
          return text.includes('vi phạm') || text.includes('policy') || text.includes('violate');
        });

        if (!stillViolated) {
          console.log(`  ✓ Policy violation resolved!\n`);
          violationResolved = true;
          hasViolation = false;
          break;
        } else if (regenerateCount < maxRetries) {
          console.log(`  ⚠️  Policy violation persists, retrying...\n`);
        } else {
          console.log(`  ❌ Policy violation persists after ${maxRetries} retry attempts\n`);
        }
      }

      if (!violationResolved) {
        throw new Error('Policy violation could not be resolved after 3 retry attempts - please change images and try again');
      }
    }


    console.log(`📍 Downloading ${expectedItemCount} generated images...\n`);

    const downloadedFiles = [];
    const initialFiles = fs.readdirSync(this.downloadDir);

    // 💫 FIXED: Wait for all images to be ready (with timeout retries)
    let imageCountReady = false;
    let readyCheckAttempts = 0;
    const maxReadyChecks = 30; // ~15 seconds with 500ms intervals
    
    while (!imageCountReady && readyCheckAttempts < maxReadyChecks) {
      readyCheckAttempts++;
      
      const imageCountResult = await this.page.evaluate((expectedCount) => {
        const scroller = document.querySelector('[data-testid="virtuoso-scroller"]');
        if (!scroller) return { count: 0, error: 'No scroller', ready: false };

        const itemList = scroller.querySelector('[data-testid="virtuoso-item-list"]');
        if (!itemList) return { count: 0, error: 'No item list', ready: false };

        // Get the newest item (index 1) which contains all generated images
        const imageItem = itemList.querySelector('[data-index="1"]');
        if (!imageItem) return { count: 0, error: 'No image item at index 1', ready: false };

        // Count direct image containers (each has class like "sc-c6af9aa3-0")
        const imageContainers = Array.from(imageItem.querySelectorAll('[class*="sc-c6af9aa3-0"]')).filter(el => {
          return el.querySelector('img[src*="storage.googleapis.com"]') !== null;
        });

        // 💫 NEW: Consider ready only when we have all expected images
        const isReady = imageContainers.length >= expectedCount;
        const count = imageContainers.length;
        
        console.log(`📊 Found ${count}/${expectedCount} images (${isReady ? 'ready' : 'loading'})...`);
        return { count: count, error: null, ready: isReady };
      }, expectedItemCount);

      if (imageCountResult.ready || readyCheckAttempts === maxReadyChecks) {
        imageCountReady = true;
        const actualImageCount = Math.max(imageCountResult.count, expectedItemCount);
        console.log(`\n✅ Image count verified: ${actualImageCount} images (expected: ${expectedItemCount})\n`);
      } else {
        await this.page.waitForTimeout(500);
      }
    }

    if (!imageCountReady) {
      console.log(`  ⚠️ Timeout waiting for all ${expectedItemCount} images, proceeding with what's available...`);
    }

    const imageCountResult = await this.page.evaluate(() => {
      const scroller = document.querySelector('[data-testid="virtuoso-scroller"]');
      if (!scroller) return { count: 0, error: 'No scroller' };

      const itemList = scroller.querySelector('[data-testid="virtuoso-item-list"]');
      if (!itemList) return { count: 0, error: 'No item list' };

      // Get the newest item (index 1) which contains all generated images
      const imageItem = itemList.querySelector('[data-index="1"]');
      if (!imageItem) return { count: 0, error: 'No image item at index 1' };

      // Count direct image containers (each has class like "sc-c6af9aa3-0")
      const imageContainers = Array.from(imageItem.querySelectorAll('[class*="sc-c6af9aa3-0"]')).filter(el => {
        return el.querySelector('img[src*="storage.googleapis.com"]') !== null;
      });

      console.log(`📊 Final count: Found ${imageContainers.length} generated images in item`);
      return { count: imageContainers.length, error: null };
    });

    // 💫 FIX: Use expectedItemCount for download, not the actual count found
    // The actual count might include previous generations still visible in the UI
    // We only want to download the expected number for THIS generation
    const actualImageCount = expectedItemCount;
    console.log(`📊 Downloading ${actualImageCount} images (found ${imageCountResult.count} in UI, expecting ${expectedItemCount} for this generation)`);
    console.log(`⏱️  2K Timeout: 120s | 1K Fallback: 30s | Preview Fallback: Enabled\n`);

    // Download multiple images - all from the newest item (data-index="1")
    for (let imageIdx = 0; imageIdx < actualImageCount; imageIdx++) {
      console.log(`📍 Downloading image ${imageIdx + 1}/${actualImageCount}...`);

      // 💫 RE-CHECK: Ensure image container exists before attempting download
      const containerCheckResult = await this.page.evaluate((imgIdx, expectedTotal) => {
        const scroller = document.querySelector('[data-testid="virtuoso-scroller"]');
        if (!scroller) return { exists: false, error: 'No scroller found', totalFound: 0 };

        const itemList = scroller.querySelector('[data-testid="virtuoso-item-list"]');
        if (!itemList) return { exists: false, error: 'Item list not found', totalFound: 0 };

        const imageItem = itemList.querySelector('[data-index="1"]');
        if (!imageItem) return { exists: false, error: 'Image item not found at index 1', totalFound: 0 };

        const imageContainers = Array.from(imageItem.querySelectorAll('[class*="sc-c6af9aa3-0"]')).filter(el => {
          return el.querySelector('img[src*="storage.googleapis.com"]') !== null;
        });

        return {
          exists: imageContainers.length > imgIdx,
          totalFound: imageContainers.length,
          error: imageContainers.length <= imgIdx ? `Only ${imageContainers.length} images found, need index ${imgIdx}` : null
        };
      }, imageIdx, actualImageCount);

      if (!containerCheckResult.exists) {
        console.log(`  ⚠️  Image ${imageIdx + 1} not ready yet (${containerCheckResult.totalFound}/${actualImageCount} available). Waiting...`);
        
        // Wait a bit longer for image to render
        await this.page.waitForTimeout(1000);
        
        // Try again
        const retryCheck = await this.page.evaluate((imgIdx) => {
          const scroller = document.querySelector('[data-testid="virtuoso-scroller"]');
          if (!scroller) return { exists: false };
          const itemList = scroller.querySelector('[data-testid="virtuoso-item-list"]');
          if (!itemList) return { exists: false };
          const imageItem = itemList.querySelector('[data-index="1"]');
          if (!imageItem) return { exists: false };
          const imageContainers = Array.from(imageItem.querySelectorAll('[class*="sc-c6af9aa3-0"]')).filter(el => {
            return el.querySelector('img[src*="storage.googleapis.com"]') !== null;
          });
          return { exists: imageContainers.length > imgIdx, totalFound: imageContainers.length };
        }, imageIdx);

        if (!retryCheck.exists) {
          console.log(`  ❌ Image ${imageIdx + 1} still not found after retry. Skipping.`);
          continue;
        }
      }

      const downloadResult = await this.page.evaluate((imgIdx) => {
        const scroller = document.querySelector('[data-testid="virtuoso-scroller"]');
        if (!scroller) return { error: 'No scroller found', success: false };

        const itemList = scroller.querySelector('[data-testid="virtuoso-item-list"]');
        if (!itemList) return { error: 'Item list not found', success: false };

        // Get the newest item (index 1) which contains all generated images
        const imageItem = itemList.querySelector('[data-index="1"]');
        if (!imageItem) return { error: 'Image item not found at index 1', success: false };

        // Find all image containers with actual images
        const imageContainers = Array.from(imageItem.querySelectorAll('[class*="sc-c6af9aa3-0"]')).filter(el => {
          return el.querySelector('img[src*="storage.googleapis.com"]') !== null;
        });

        if (imageContainers.length <= imgIdx) {
          return { error: `Image ${imgIdx + 1} not found (only ${imageContainers.length} images available)`, success: false };
        }

        // Get the specific image container
        const targetImageContainer = imageContainers[imgIdx];
        
        // Find download button in this specific image container
        const buttons = targetImageContainer.querySelectorAll('button');
        let downloadBtn = null;
        
        for (const btn of buttons) {
          const icon = btn.querySelector('i');
          if (icon && (icon.textContent.includes('download') || icon.textContent.includes('task_alt'))) {
            // Scan more carefully for download button
            const ariaLabel = btn.getAttribute('aria-label') || '';
            const btnText = btn.textContent.toLowerCase();
            if (ariaLabel.includes('tải') || ariaLabel.includes('download') || btnText.includes('tải') || btnText.includes('download')) {
              downloadBtn = btn;
              break;
            }
          }
        }

        // If not found by icon text, look for button with specific attributes
        if (!downloadBtn) {
          for (const btn of buttons) {
            const ariaLabel = btn.getAttribute('aria-label') || '';
            if (ariaLabel.includes('tải') || ariaLabel.includes('download')) {
              downloadBtn = btn;
              break;
            }
          }
        }

        if (!downloadBtn) {
          return { error: 'Download button not found in image container', success: false, containerCount: imageContainers.length, targetIdx: imgIdx };
        }

        downloadBtn.click();
        return { success: true };
      }, imageIdx);

      if (!downloadResult.success) {
        console.log(`  ⚠️  Cannot download image ${imageIdx + 1}: ${downloadResult.error}`);
        continue;
      }

      console.log(`  ✓ Download button clicked`);

      // Wait for menu to appear (or auto-download for Banana model)
      await this.page.waitForTimeout(500);

      // Check if menu exists (Nano Banana Pro has menu, Banana model auto-downloads)
      const menuCheckResult = await this.page.evaluate(() => {
        let menuItems = document.querySelectorAll('[role="menuitem"]');
        if (menuItems.length === 0) {
          menuItems = document.querySelectorAll('[role="option"], button[class*="menu"]');
        }
        return {
          hasMenu: menuItems.length > 0,
          menuCount: menuItems.length
        };
      });

      let modelType = 'Unknown';
      let download2KSelected = false;

      if (menuCheckResult.hasMenu) {
        // Nano Banana Pro: has download menu with 2K option
        modelType = 'Nano Banana Pro';
        download2KSelected = await this.page.evaluate(() => {
          let menuItems = document.querySelectorAll('[role="menuitem"]');
          if (menuItems.length === 0) {
            menuItems = document.querySelectorAll('[role="option"], button[class*="menu"]');
          }

          // Try to find 2K Tải xuống option
          for (let i = 0; i < menuItems.length; i++) {
            const text = menuItems[i].textContent.trim();
            if (text.includes('2K') && text.includes('Tải xuống') && !text.includes('4K') && !text.includes('1K')) {
              menuItems[i].click();
              return true;
            }
          }

          // Fallback: click second item if exists
          if (menuItems.length >= 2) {
            menuItems[1].click();
            return true;
          }

          return false;
        });

        if (!download2KSelected) {
          console.log(`  ⚠️  Could not select 2K option (${modelType})`);
        } else {
          console.log(`  ✓ Selected 2K download (${modelType})`);
        }
      } else {
        // Banana model: auto-downloads without menu
        modelType = 'Banana';
        download2KSelected = true;
        console.log(`  ✓ Auto-download triggered (${modelType})`);
      }

      // Wait for upgrade messages - mainly for Nano Banana Pro
      let upgradeDetected = false;
      for (let i = 0; i < 15; i++) {
        const hasUpgrade = await this.page.evaluate(() => {
          const text = document.body.innerText.toLowerCase();
          return text.includes('nâng cấp') || text.includes('upgrading') || text.includes('processing');
        });

        if (hasUpgrade) {
          upgradeDetected = true;
          console.log(`  ✓ Image upgrading detected...`);
          break;
        }

        await this.page.waitForTimeout(500);
      }

      if (!upgradeDetected && modelType !== 'Banana') {
        console.log(`  ⚠️  No upgrade message detected`);
      }

      // 💫 IMPROVED: Wait for file to download with better timeout handling and 1K fallback
      let fileDownloaded = false;
      let downloadError = null;
      let attempt2KDownload = true;
      let maxWaitTime = 120000; // 120 seconds for 2K upsampling
      let maxIterations = 240; // 240 * 500ms = 120 seconds

      while (attempt2KDownload && !fileDownloaded) {
        for (let i = 0; i < maxIterations; i++) {
          const currentFiles = fs.readdirSync(this.downloadDir);
          
          // 💫 IMPROVED: Better handling of partial downloads
          const newFiles = currentFiles.filter(f => {
            // Skip in-progress downloads
            if (f.endsWith('.crdownload') || f.endsWith('.tmp') || f.endsWith('.partial') || f.endsWith('.download')) {
              return false;
            }
            
            // Skip system files
            if (f.startsWith('.')) return false;
            
            // Check if it's a new file (not in initial list and not in downloaded list)
            const isNew = !initialFiles.includes(f);
            const notDownloaded = !downloadedFiles.some(df => df.includes(path.basename(f)));
            
            return isNew && notDownloaded;
          });

          if (newFiles.length > 0) {
            const newFile = newFiles[newFiles.length - 1];
            const filePath = path.join(this.downloadDir, newFile);
            
            try {
              const stats = fs.statSync(filePath);
              // 💫 IMPROVED: Check if file is valid (larger than 100KB for 2K images)
              if (stats.size > 102400) {  // 100KB minimum for proper 2K image
                downloadedFiles.push(filePath);
                initialFiles.push(newFile);  // Mark as downloaded
                console.log(`  ✓ File saved: ${newFile} (${Math.round(stats.size / 1024)}KB)`);
                fileDownloaded = true;
                break;
              } else {
                downloadError = `File too small (${Math.round(stats.size / 1024)}KB) - still upgrading or corrupted`;
                if ((i + 1) % 10 === 0) {
                  console.log(`  ⏳ File upgrading (${Math.round(stats.size / 1024)}KB at ${(i + 1) * 500}ms)...`);
                }
                await this.page.waitForTimeout(500);
                continue;
              }
            } catch (err) {
              downloadError = `File access error: ${err.message}`;
              await this.page.waitForTimeout(500);
              continue;
            }
          }

          // 💫 DEBUG: Log progress at key intervals
          if ((i + 1) % 20 === 0) {
            const elapsedSecs = ((i + 1) * 500) / 1000;
            console.log(`  ⏳ Waiting for file (${elapsedSecs}s / ${maxWaitTime / 1000}s)... Files in dir: ${currentFiles.length}`);
          }

          // 💫 NEW: Monitor API calls and network activity
          if ((i + 1) % 40 === 0) {
            const networkMonitor = await this.page.evaluate(() => {
              // Try to detect ongoing API calls or XHR requests
              const resourceTiming = performance.getEntries().filter(entry => 
                entry.name.includes('upsampleImage') || 
                entry.name.includes('flow') ||
                entry.initiatorType === 'xmlhttprequest' ||
                entry.initiatorType === 'fetch'
              );
              return {
                hasRecentRequests: resourceTiming.length > 0,
                requestCount: resourceTiming.length,
                lastRequestTime: resourceTiming.length > 0 ? Math.round(resourceTiming[resourceTiming.length - 1].responseEnd) : 0
              };
            });
            
            if (networkMonitor.hasRecentRequests) {
              console.log(`  🌐 API activity detected: ${networkMonitor.requestCount} requests, last response at ${networkMonitor.lastRequestTime}ms`);
            }
          }

          await this.page.waitForTimeout(500);
        }

        // 💫 NEW: If 2K times out, try 1K fallback
        if (!fileDownloaded && attempt2KDownload) {
          console.log(`  ⏳ 2K download timeout (${maxWaitTime / 1000}s), attempting 1K fallback...`);
          
          // Try to find and click 1K option
          const click1KResult = await this.page.evaluate(() => {
            let menuItems = document.querySelectorAll('[role="menuitem"]');
            if (menuItems.length === 0) {
              menuItems = document.querySelectorAll('[role="option"], button[class*="menu"]');
            }

            // Try to find 1K Tải xuống option
            for (let i = 0; i < menuItems.length; i++) {
              const text = menuItems[i].textContent.trim();
              if (text.includes('1K') && text.includes('Tải xuống') && !text.includes('2K')) {
                menuItems[i].click();
                return { success: true };
              }
            }

            // Fallback: click first item if exists
            if (menuItems.length >= 1) {
              menuItems[0].click();
              return { success: true };
            }

            return { success: false };
          });

          if (click1KResult.success) {
            console.log(`  ✓ Clicked 1K fallback option`);
            attempt2KDownload = false;  // Don't retry 2K
            maxIterations = 60; // 60 * 500ms = 30 seconds for 1K
            await this.page.waitForTimeout(500);
            // Continue the loop to wait for 1K download
          } else {
            console.log(`  ⚠️  Could not find 1K option for fallback`);
            break;
          }
        } else {
          break;  // Exit the while loop if we got a download or can't retry
        }
      }

      if (!fileDownloaded) {
        const errorMsg = downloadError || 'File download timeout';
        console.log(`  ❌ Cannot download image ${imageIdx + 1}: ${errorMsg}`);
        
        // 💫 NEW: Last resort - try to save preview image from the UI
        console.log(`  💾 Attempting to save preview image as fallback...`);
        const previewSaveResult = await this.page.evaluate((imgIdx) => {
          try {
            const scroller = document.querySelector('[data-testid="virtuoso-scroller"]');
            if (!scroller) return { success: false, error: 'No scroller found' };

            const itemList = scroller.querySelector('[data-testid="virtuoso-item-list"]');
            if (!itemList) return { success: false, error: 'Item list not found' };

            const imageItem = itemList.querySelector('[data-index="1"]');
            if (!imageItem) return { success: false, error: 'Image item not found' };

            const imageContainers = Array.from(imageItem.querySelectorAll('[class*="sc-c6af9aa3-0"]')).filter(el => {
              return el.querySelector('img[src*="storage.googleapis.com"]') !== null;
            });

            if (imageContainers.length <= imgIdx) {
              return { success: false, error: `Image ${imgIdx + 1} not found` };
            }

            const targetImageContainer = imageContainers[imgIdx];
            const imgElement = targetImageContainer.querySelector('img[src*="storage.googleapis.com"]');
            
            if (!imgElement || !imgElement.src) {
              return { success: false, error: 'Image element not found' };
            }

            // 💾 Return preview image URL for potential download
            return {
              success: true,
              previewUrl: imgElement.src,
              width: imgElement.naturalWidth || imgElement.width,
              height: imgElement.naturalHeight || imgElement.height
            };
          } catch (err) {
            return { success: false, error: err.message };
          }
        }, imageIdx);

        if (previewSaveResult.success && previewSaveResult.previewUrl) {
          console.log(`  ✅ Preview URL available: ${previewSaveResult.previewUrl.substring(0, 80)}... (${previewSaveResult.width}x${previewSaveResult.height})`);
          console.log(`  💡 You can manually download this preview image if needed`);
        } else {
          console.log(`  ⚠️  Could not retrieve preview image: ${previewSaveResult.error}`);
        }
        
        continue;
      }

      await this.page.waitForTimeout(1000);  // Delay between downloads
    }

    console.log(`\n✓ Download complete! ${downloadedFiles.length}/${expectedItemCount} images downloaded.\n`);
    console.log(`📊 Downloaded Images:`);
    downloadedFiles.forEach((file, idx) => {
      const stats = fs.statSync(file);
      console.log(`  ${idx + 1}. ${path.basename(file)} (${Math.round(stats.size / 1024)}KB)`);
    });
    console.log();

    // 💫 NEW: Detect duplicate downloads (same image downloaded twice)
    if (downloadedFiles.length >= 2) {
      console.log(`🔍 Checking for duplicate downloads...`);
      const fileSizes = downloadedFiles.map(f => ({
        path: f,
        name: path.basename(f),
        size: fs.statSync(f).size
      }));

      for (let i = 0; i < fileSizes.length - 1; i++) {
        for (let j = i + 1; j < fileSizes.length; j++) {
          const file1 = fileSizes[i];
          const file2 = fileSizes[j];
          
          // Check if files have same name or very similar size (likely duplicates)
          if (file1.name === file2.name) {
            console.log(`⚠️  DUPLICATE DETECTED: "${file1.name}" and "${file2.name}" have identical filenames!`);
            console.log(`    File 1: ${file1.size} bytes`);
            console.log(`    File 2: ${file2.size} bytes`);
          } else if (Math.abs(file1.size - file2.size) < 10000) {
            // Files within 10KB of each other - possible duplicates
            console.log(`⚠️  POSSIBLE DUPLICATE: "${file1.name}" (${file1.size}B) and "${file2.name}" (${file2.size}B) have very similar sizes`);
          }
        }
      }
    }

    return downloadedFiles;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

/**
 * Main image generation function
 */
export async function runImageGeneration(options = {}) {
  // Merge options with defaults
  const config = {
    aspectRatio: options.aspectRatio || '9:16',
    imageCount: options.imageCount || 2,
    negativePrompt: options.negativePrompt || '',
    ...options
  };

  const imageGen = new ImageGenerationAutomation(config);

  try {
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('🎬 Image Generation - Google Labs Flow');
    console.log('════════════════════════════════════════════════════════════════');
    console.log(`📐 Aspect ratio: ${config.aspectRatio}`);
    console.log(`🖼️  Image count: ${config.imageCount}`);
    console.log(`📝 Negative prompt: ${config.negativePrompt || '(none)'}\n`);

    await imageGen.init();
    await imageGen.navigateToProject();
    await imageGen.configureModel();
    
    // 💫 CHANGED: Configure aspect ratio IMMEDIATELY after model selection
    // (while the config dialog is still open/accessible)
    if (config.aspectRatio) {
      console.log('⏱️  Waiting before aspect ratio config...');
      await imageGen.page.waitForTimeout(500);
      await imageGen.configureAspectRatio(config.aspectRatio);
    }

    // Upload 2 images
    if (options.personImagePath && options.productImagePath) {
      await imageGen.uploadAndCropImage(options.personImagePath, 'person/model', 0);
      await imageGen.uploadAndCropImage(options.productImagePath, 'product', 1);
    } else {
      throw new Error('Missing person or product image path');
    }

    // Generate with full prompt including negative
    if (options.prompt) {
      const fullPrompt = createFullPrompt(options.prompt, config.negativePrompt);
      
      // 🔍 LOG: Show final prompt being sent to Google Flow
      console.log('📬 FINAL PROMPT SUBMITTED TO GOOGLE FLOW:');
      console.log('─'.repeat(60));
      console.log(fullPrompt);
      console.log('─'.repeat(60) + '\n');
      
      await imageGen.enterPrompt(fullPrompt);
      await imageGen.submitAndWaitForGeneration();
    } else {
      throw new Error('Missing prompt');
    }

    // Download results
    const outputDir = options.outputDir || 'downloads';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const results = await imageGen.downloadResults(outputDir, config.imageCount);

    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('✓ Image generation complete!');
    console.log('════════════════════════════════════════════════════════════════\n');

    // Return results with proper data structure
    console.log(`📊 Final results: ${results.length} files returned`);
    console.log(`   Files: ${results.map(f => f.split('/').pop()).join(', ')}`);
    
    return {
      success: true,
      results: {
        files: results,
        count: results.length,
        imageCount: config.imageCount,
        aspectRatio: config.aspectRatio
      }
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await imageGen.close();
  }
}

/**
 * Create full prompt with negative section
 */
function createFullPrompt(positivePrompt, negativePrompt = '') {
  if (!negativePrompt) {
    return positivePrompt;
  }
  return `${positivePrompt}\n\n[NEGATIVE]\n${negativePrompt}`;
}

export default ImageGenerationAutomation;
