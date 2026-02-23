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
      projectUrl: 'https://labs.google/fx/vi/tools/flow/project/3ba9e02e-0a33-4cf2-9d55-4c396941d7b7',
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
        generation: 180000
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

  async navigateToProject() {
    console.log('📍 Navigating to image generation project...');
    await this.page.goto(this.options.projectUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await this.page.waitForTimeout(2000);
    console.log('✓ Project loaded');
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
          if ((text.includes('Nano') && text.includes('Banana') && !text.includes('Pro')) ||
              text === 'Nano Banana') {
            option.click();
            return true;
          }
        }
        return false;
      });

      if (selectedNanoBanana) {
        console.log('✓ Selected Nano Banana');
      }
    }

    await this.page.waitForTimeout(this.options.timeouts.modelConfig);

    // Close config dialog
    await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const tuneBtn = buttons.find(btn => {
        const icon = btn.querySelector('i');
        return icon && icon.textContent.includes('tune');
      });
      if (tuneBtn) tuneBtn.click();
    });

    console.log('✓ Config dialog closed');
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
    console.log('📍 Entering prompt...');

    // Clean and split prompt
    const cleanPrompt = prompt.trim().replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ');
    const firstPart = cleanPrompt.substring(0, 10);
    const secondPart = cleanPrompt.substring(10);
    const expectedLength = cleanPrompt.length;

    console.log(`  Prompt (cleaned): "${cleanPrompt}"`);
    console.log(`  Split: "${firstPart}" + "${secondPart}"`);
    console.log(`  Target length: ${expectedLength} characters`);

    // Step 1: Focus and type first 10 characters
    await this.page.focus('#PINHOLE_TEXT_AREA_ELEMENT_ID');
    await this.page.waitForTimeout(300);
    console.log(`  → Typing first 10 chars: "${firstPart}"`);
    await this.page.keyboard.type(firstPart, { delay: 50 }); // Type each character slowly
    await this.page.waitForTimeout(200);

    // Step 2: Type remaining part (split into chunks for better React component recognition)
    if (secondPart.length > 0) {
      console.log(`  → Typing remaining ${secondPart.length} chars in chunks...`);
      const chunkSize = 50; // Type in 50-char chunks
      for (let i = 0; i < secondPart.length; i += chunkSize) {
        const chunk = secondPart.substring(i, i + chunkSize);
        await this.page.keyboard.type(chunk, { delay: 5 });
        await this.page.waitForTimeout(50); // Small delay between chunks
      }
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

    // Step 3: Wait for textarea content to match expected length
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

  async submitAndWaitForGeneration() {
    console.log('📍 Validating submission requirements...');

    // Comprehensive validation before submission
    const expectedLen = this.expectedPromptLength || 0;
    const submitValidation = await this.page.evaluate((expectedLength) => {
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

      // Check component count (must be exactly 2)
      if (closeCount !== 2) {
        return { valid: false, reason: `Expected 2 components, found ${closeCount}`, components: closeCount, textareaLength };
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
      console.log(`❌ Validation failed: ${submitValidation.reason}`);
      console.log(`   Textarea: ${submitValidation.textareaLength}/${expectedLen} chars`);
      console.log(`   Components: ${submitValidation.components}`);
      throw new Error(`Cannot submit: ${submitValidation.reason}`);
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

    // Monitor generation
    console.log('📍 Monitoring generation (max 3 min)...');
    let generationComplete = false;
    let placeholdersDetected = false;

    for (let i = 0; i < 180; i++) {
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

        const images = scroller.querySelectorAll('img[alt]');
        return {
          itemCount: items.length,
          imageCount: images.length,
          hasLoadingIndicators
        };
      });

      if (!state) {
        if (i % 20 === 0) process.stdout.write('.');
        await this.page.waitForTimeout(1000);
        continue;
      }

      if (state.hasLoadingIndicators && !placeholdersDetected) {
        placeholdersDetected = true;
        console.log(`\n✓ Generation started`);
      }

      if (placeholdersDetected && !state.hasLoadingIndicators && state.imageCount > 0) {
        generationComplete = true;
        console.log(`✓ Generation complete (${state.imageCount} results)\n`);
        break;
      }

      if (i % 20 === 0 && i > 0) process.stdout.write('.');
      await this.page.waitForTimeout(1000);
    }

    if (!generationComplete) {
      console.log('⚠️ Generation timeout, continuing...\n');
    }

    // Check for policy violation
    const policyViolation = await this.page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('chính sách') || text.includes('vi phạm');
    });

    if (policyViolation) {
      console.log('⚠️ Policy violation detected, retrying...');
      const retryClicked = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const wrapTextBtn = buttons.find(btn => {
          const icon = btn.querySelector('i');
          return icon && icon.textContent.includes('wrap_text');
        });
        if (wrapTextBtn) {
          wrapTextBtn.click();
          return true;
        }
        return false;
      });

      if (retryClicked) {
        console.log('✓ Retry initiated, waiting 3s...\n');
        await this.page.waitForTimeout(3000);
      }
    }
  }

  async configureAspectRatio(aspectRatio = '9:16') {
    console.log(`📐 Configuring aspect ratio: ${aspectRatio}...`);
    
    // For Google Labs Flow, aspect ratio is controlled via the "x2" button or similar
    // 9:16 = vertical (1x aspect), 16:9 = horizontal (x2 aspect)
    const isHorizontal = aspectRatio.includes('16:9') || aspectRatio.startsWith('16');
    
    if (isHorizontal) {
      // Click x2 button for horizontal aspect ratio
      const clickedX2 = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
          if (btn.textContent.includes('x2') || btn.textContent.includes('2x')) {
            btn.click();
            return true;
          }
        }
        return false;
      });
      
      if (clickedX2) {
        console.log('✓ Selected 16:9 (horizontal) aspect ratio');
        await this.page.waitForTimeout(500);
      }
    } else {
      // Default 9:16 (vertical) - usually the default
      console.log('✓ Using 9:16 (vertical) aspect ratio (default)');
    }
  }

  async downloadResults(outputDir, expectedItemCount = 2) {
    console.log('📍 Processing results...');
    
    // Wait a moment for DOM to settle after generation
    await this.page.waitForTimeout(500);

    // Wait for all expected items to appear in scroller
    console.log(`⏳ Waiting for ${expectedItemCount} items to appear in scroller...`);
    let itemsReady = false;
    for (let i = 0; i < 30; i++) {
      const itemCount = await this.page.evaluate((maxItems) => {
        const scroller = document.querySelector('[data-testid="virtuoso-scroller"]');
        if (!scroller) return 0;

        const allItems = scroller.querySelectorAll('[data-index]');
        let itemsWithImages = 0;

        allItems.forEach(item => {
          const images = item.querySelectorAll('img');
          if (images.length > 0) itemsWithImages++;
        });

        return itemsWithImages;
      }, expectedItemCount);

      console.log(`  Attempt ${i + 1}: Found ${itemCount} items with images...`);
      
      if (itemCount >= expectedItemCount) {
        itemsReady = true;
        console.log(`✓ All ${itemCount} items ready\n`);
        break;
      }

      await this.page.waitForTimeout(500);
    }

    if (!itemsReady) {
      console.log(`⚠️  Timeout waiting for all items. Proceeding with available items.\n`);
    }
    
    // Re-query scroller to ensure fresh DOM state
    await this.page.evaluate(() => {
      const scroller = document.querySelector('[data-testid="virtuoso-scroller"]');
      if (scroller) {
        // Force a small scroll to trigger any lazy-loading
        scroller.scrollTop = scroller.scrollTop;
      }
    });
    
    await this.page.waitForTimeout(500);

    const itemsData = await this.page.evaluate((maxItems) => {
      const scroller = document.querySelector('[data-testid="virtuoso-scroller"]');
      if (!scroller) return { items: [], totalItems: 0, lastItemIndices: [] };

      const allItems = scroller.querySelectorAll('[data-index]');
      const results = [];

      allItems.forEach((item, idx) => {
        const images = item.querySelectorAll('img');
        if (images.length > 0) results.push(idx);
      });

      // Only take the last 'maxItems' items (the ones just generated)
      const lastItemIndices = results.slice(-maxItems);
      
      return { 
        items: Array.from(lastItemIndices),
        totalItems: results.length,
        totalItemsInScroller: allItems.length,
        lastItemIndices: lastItemIndices
      };
    }, expectedItemCount);

    const { items: itemsWithImages, totalItems, totalItemsInScroller, lastItemIndices } = itemsData;

    if (itemsWithImages.length === 0) {
      console.log('❌ No results found');
      return [];
    }

    console.log(`ℹ️  Total items in scroller: ${totalItemsInScroller}`);
    console.log(`ℹ️  Total items with images: ${totalItems}`);
    console.log(`✓ Processing last ${itemsWithImages.length} items (generated this session)\n`);

    const downloadedFiles = [];
    const initialFiles = fs.readdirSync(this.downloadDir);

    for (let d = 0; d < lastItemIndices.length; d++) {
      const itemIdx = lastItemIndices[d];
      console.log(`💾 Downloading item ${d + 1}/${lastItemIndices.length}...`);

      let downloadSuccess = null;
      let retries = 0;

      while (retries < 3 && !downloadSuccess) {
        if (retries > 0) {
          await this.page.waitForTimeout(300);
        }

        downloadSuccess = await this.page.evaluate((idx) => {
          const scroller = document.querySelector('[data-testid="virtuoso-scroller"]');
          if (!scroller) return { error: 'No scroller' };

          const items = scroller.querySelectorAll('[data-index]');
          const item = items[idx];
          if (!item) return { error: 'Item not found' };

          const buttons = item.querySelectorAll('button');
          let downloadBtn = null;
          for (const btn of buttons) {
            const icon = btn.querySelector('i');
            if (icon && icon.textContent.includes('download')) {
              downloadBtn = btn;
              break;
            }
          }

          if (!downloadBtn) return { error: 'No download button' };

          downloadBtn.click();

          // Check if menu appears (Nano Banana Pro style)
          let allMenuItems = document.querySelectorAll('[role="menuitem"]');
          if (allMenuItems.length === 0) {
            allMenuItems = document.querySelectorAll('[role="option"], button[class*="menu"]');
          }

          // If no menu, it's Banana model (auto-downloads)
          if (allMenuItems.length === 0) {
            return { success: true, method: 'auto-download (Banana model)', modelType: 'Banana' };
          }

          // Nano Banana Pro: has menu, try to find 2K option
          for (let i = 0; i < allMenuItems.length; i++) {
            const text = allMenuItems[i].textContent.trim();
            if (text.includes('2K') && text.includes('Tải xuống') && !text.includes('4K') && !text.includes('1K')) {
              allMenuItems[i].click();
              return { success: true, method: '2K menu', modelType: 'Nano Banana Pro' };
            }
          }

          // Fallback: click second menu item
          if (allMenuItems.length >= 2) {
            allMenuItems[1].click();
            return { success: true, method: 'menu item 1', modelType: 'Nano Banana Pro' };
          }

          return { error: 'Could not find 2K option' };
        }, itemIdx);

        if (!downloadSuccess.success && retries < 2) {
          retries++;
        } else {
          break;
        }
      }

      if (downloadSuccess?.success) {
        console.log(`  ✓ Selected ${downloadSuccess.method}`);
        
        // Wait for upgrade message (nâng cấp hình ảnh) - mainly for Nano Banana Pro
        let upgradeDetected = false;
        for (let i = 0; i < 10; i++) {
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
        
        if (!upgradeDetected) {
          if (downloadSuccess.modelType === 'Banana') {
            console.log(`  ⚠️ No upgrade message (${downloadSuccess.modelType} model may skip this)`);
          } else {
            console.log(`  ⚠️ No upgrade message detected (may still be downloading)`);
          }
        }
        
        // Wait for file to be downloaded (max 15 seconds)
        let downloadedFilePath = null;
        for (let i = 0; i < 30; i++) {
          const currentFiles = fs.readdirSync(this.downloadDir);
          const newFiles = currentFiles.filter(f => !initialFiles.includes(f) && !f.endsWith('.crdownload'));
          
          if (newFiles.length > 0) {
            downloadedFilePath = path.join(this.downloadDir, newFiles[0]);
            console.log(`  ✓ File saved: ${newFiles[0]}`);
            downloadedFiles.push(downloadedFilePath);
            initialFiles.push(...newFiles);
            break;
          }
          
          await this.page.waitForTimeout(500);
        }
        
        if (!downloadedFilePath) {
          console.log(`  ⚠️ File download timeout (may still be downloading)`);
        }
      } else {
        console.log(`  ❌ ${downloadSuccess?.error || 'Unknown error'}`);
      }

      await this.page.waitForTimeout(500);
    }

    console.log(`✓ Download process complete (${downloadedFiles.length} files saved)\n`);
    console.log(`📊 Downloaded files:`, downloadedFiles);
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
    
    // 💫 NEW: Apply aspect ratio configuration
    if (config.aspectRatio) {
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
