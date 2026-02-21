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
        generation: 180000
      },
      ...options
    };
  }

  async init() {
    console.log('🚀 Initializing Image Generation...');
    
    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      args: ['--no-sandbox']
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });

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

    // Click add button
    const addClicked = await this.page.evaluate(() => {
      const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
      if (!textarea) return false;

      let container = textarea.parentElement;
      while (container && !container.className.includes('sc-77366d4e-2')) {
        container = container.parentElement;
      }

      if (!container || !container.children[2]) return false;

      const buttons = Array.from(container.children[2].querySelectorAll('button'));
      const addBtn = buttons.find(btn => {
        const icon = btn.querySelector('i');
        return icon && icon.textContent.trim() === 'add' && !btn.disabled;
      });

      if (addBtn) {
        addBtn.click();
        return true;
      }
      return false;
    });

    if (!addClicked) {
      throw new Error(`Could not click add button for image ${index + 1}`);
    }
    console.log('  ✓ Add button clicked');

    // Upload file
    const fileChooser = await this.page.waitForFileChooser();
    await fileChooser.accept([imagePath]);
    await this.page.waitForTimeout(2000);
    console.log(`  ✓ File uploaded: ${path.basename(imagePath)}`);

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

    // Wait for dialog close
    try {
      await this.page.waitForFunction(
        () => !document.querySelector('div[role="dialog"]'),
        { timeout: this.options.timeouts.dialogClose }
      );
      console.log('  ✓ Dialog closed');
    } catch (e) {
      console.log('  ⚠️ Dialog close timeout, continuing...');
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

    // Focus textarea
    await this.page.focus('#PINHOLE_TEXT_AREA_ELEMENT_ID');
    await this.page.waitForTimeout(200);

    // Type first 5-7 characters
    const typedChars = Math.min(7, prompt.length);
    const firstPart = prompt.substring(0, typedChars);
    const remainingPart = prompt.substring(typedChars);

    await this.page.keyboard.type(firstPart, { delay: 1 });

    // Paste remaining part via evaluate
    if (remainingPart) {
      await this.page.evaluate((remaining) => {
        const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
        if (textarea) {
          textarea.value += remaining;
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, remainingPart);
    }

    await this.page.waitForTimeout(this.options.timeouts.promptType);
    console.log('✓ Prompt entered');
  }

  async submitAndWaitForGeneration() {
    console.log('📍 Submitting and waiting for generation...');

    // Check send button state
    const sendBtnState = await this.page.evaluate(() => {
      const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
      if (!textarea) return null;

      let container = textarea.parentElement;
      while (container && !container.className.includes('sc-77366d4e-2')) {
        container = container.parentElement;
      }

      if (!container) return null;

      const buttons = Array.from(container.querySelectorAll('button'));
      const sendBtn = buttons.find(btn => {
        const icon = btn.querySelector('i');
        return icon && icon.textContent.trim() === 'arrow_forward';
      });

      return sendBtn ? { found: true, disabled: sendBtn.disabled } : null;
    });

    if (!sendBtnState?.found) throw new Error('Send button not found');
    if (sendBtnState.disabled) {
      console.log('  Enabling send button...');
      await this.page.evaluate(() => {
        const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
        let container = textarea.parentElement;
        while (container && !container.className.includes('sc-77366d4e-2')) {
          container = container.parentElement;
        }
        const buttons = Array.from(container.querySelectorAll('button'));
        const sendBtn = buttons.find(btn => {
          const icon = btn.querySelector('i');
          return icon && icon.textContent.trim() === 'arrow_forward';
        });
        if (sendBtn && sendBtn.disabled) {
          sendBtn.disabled = false;
        }
      });
    }

    // Click send button
    await this.page.evaluate(() => {
      const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
      let container = textarea.parentElement;
      while (container && !container.className.includes('sc-77366d4e-2')) {
        container = container.parentElement;
      }
      const buttons = Array.from(container.querySelectorAll('button'));
      const sendBtn = buttons.find(btn => {
        const icon = btn.querySelector('i');
        return icon && icon.textContent.trim() === 'arrow_forward';
      });
      if (sendBtn) sendBtn.click();
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

  async downloadResults(outputDir) {
    console.log('📍 Processing results...');

    const itemsWithImages = await this.page.evaluate(() => {
      const scroller = document.querySelector('[data-testid="virtuoso-scroller"]');
      if (!scroller) return [];

      const items = scroller.querySelectorAll('[data-index]');
      const results = [];

      items.forEach((item, idx) => {
        const images = item.querySelectorAll('img');
        if (images.length > 0) results.push(idx);
      });

      return results;
    });

    if (itemsWithImages.length === 0) {
      console.log('❌ No results found');
      return [];
    }

    console.log(`✓ Found ${itemsWithImages.length} items with images\n`);

    const downloadedFiles = [];

    for (let d = 0; d < itemsWithImages.length; d++) {
      const itemIdx = itemsWithImages[d];
      console.log(`💾 Downloading item ${d + 1}/${itemsWithImages.length}...`);

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

          let allMenuItems = document.querySelectorAll('[role="menuitem"]');
          if (allMenuItems.length === 0) {
            allMenuItems = document.querySelectorAll('[role="option"], button[class*="menu"]');
          }

          if (allMenuItems.length === 0) {
            return { error: 'No menuitem found' };
          }

          for (let i = 0; i < allMenuItems.length; i++) {
            const text = allMenuItems[i].textContent.trim();
            if (text.includes('2K') && text.includes('Tải xuống') && !text.includes('4K') && !text.includes('1K')) {
              allMenuItems[i].click();
              return { success: true, method: '2K menu' };
            }
          }

          if (allMenuItems.length >= 2) {
            allMenuItems[1].click();
            return { success: true, method: 'index 1' };
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
        await this.page.waitForTimeout(this.options.timeouts.downloadClick);
        downloadedFiles.push(`item-${d + 1}`);
      } else {
        console.log(`  ⚠️ ${downloadSuccess?.error || 'Unknown error'}`);
      }

      await this.page.waitForTimeout(500);
    }

    console.log(`✓ Download process complete\n`);
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
  const imageGen = new ImageGenerationAutomation(options);

  try {
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('🎬 Image Generation - Google Labs Flow');
    console.log('════════════════════════════════════════════════════════════════\n');

    await imageGen.init();
    await imageGen.navigateToProject();
    await imageGen.configureModel();

    // Upload 2 images
    if (options.personImagePath && options.productImagePath) {
      await imageGen.uploadAndCropImage(options.personImagePath, 'person/model', 0);
      await imageGen.uploadAndCropImage(options.productImagePath, 'product', 1);
    } else {
      throw new Error('Missing person or product image path');
    }

    // Generate
    if (options.prompt) {
      await imageGen.enterPrompt(options.prompt);
      await imageGen.submitAndWaitForGeneration();
    } else {
      throw new Error('Missing prompt');
    }

    // Download results
    const outputDir = options.outputDir || 'downloads';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const results = await imageGen.downloadResults(outputDir);

    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('✓ Image generation complete!');
    console.log('════════════════════════════════════════════════════════════════\n');

    return { success: true, results };

  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  } finally {
    await imageGen.close();
  }
}

export default ImageGenerationAutomation;
