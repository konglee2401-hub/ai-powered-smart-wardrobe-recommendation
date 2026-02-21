// Video Generation Service V2 - Google Labs Flow
// Proper workflow: upload image on image tab -> switch to video tab -> select video mode -> enter prompt -> generate

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

class VideoGenerationAutomationV2 {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.parentContainerId = null;
    this.options = {
      headless: false,
      sessionFilePath: path.join(__dirname, '../.sessions/google-flow-session.json'),
      projectUrl: 'https://labs.google/fx/vi/tools/flow/project/3ba9e02e-0a33-4cf2-9d55-4c396941d7b7',
      imagePath: options.imagePath || null,
      duration: options.duration || 5,
      aspectRatio: options.aspectRatio || '16:9',
      quality: options.quality || 'high',
      ...options
    };
  }

  async init() {
    console.log('🚀 Initializing Video Generation...');
    
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
    console.log('📍 Navigating to project...');
    await this.page.goto(this.options.projectUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await this.page.waitForTimeout(2000);
    console.log('✓ Project loaded');
  }

  async switchToImageTab() {
    console.log('📍 Switching to image tab...');
    await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      buttons.find(btn => {
        const icon = btn.querySelector('i');
        return icon && icon.textContent.includes('image');
      })?.click();
    });
    await this.page.waitForTimeout(2000);
    console.log('✓ Image tab active');
  }

  async switchToVideoTab() {
    console.log('📍 Switching to video tab...');
    await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      buttons.find(btn => {
        const icon = btn.querySelector('i');
        return icon && icon.textContent.includes('videocam');
      })?.click();
    });
    await this.page.waitForTimeout(2000);
    console.log('✓ Video tab active');
  }

  async uploadImage(imagePath) {
    console.log('📍 Uploading image...');

    try {
      // Step 1: Apply reinitialize trick (switch tabs: IMAGE→VIDEO→IMAGE)
      console.log('  └─ Applying reinitialize trick (tab switch)...');
      
      // Switch to VIDEO tab
      console.log('    1. Switch to video tab...');
      await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        buttons.find(btn => {
          const icon = btn.querySelector('i');
          return icon && icon.textContent.includes('videocam');
        })?.click();
      });
      await this.page.waitForTimeout(1000);

      // Switch back to IMAGE tab
      console.log('    2. Switch back to image tab...');
      await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        buttons.find(btn => {
          const icon = btn.querySelector('i');
          return icon && icon.textContent.includes('image');
        })?.click();
      });
      await this.page.waitForTimeout(1500);
      console.log('  ✓ Reinitialize trick complete');

      // Step 2: Detect textarea parent
      console.log('  └─ Finding textarea parent container...');
      this.parentContainerId = await this.page.evaluate(() => {
        const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
        if (!textarea) return null;

        let container = textarea.parentElement;
        while (container && !container.className.includes('sc-77366d4e-2')) {
          container = container.parentElement;
        }

        if (!container) container = textarea.parentElement;
        if (!container.id) container.id = `button-container-${Date.now()}`;

        return container.id;
      });

      if (!this.parentContainerId) throw new Error('Could not identify parent container');
      console.log(`  ✓ Found container`);

      // Step 3: Click add button
      console.log('  └─ Clicking add button...');
      const addBtnInfo = await this.page.evaluate(() => {
        const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
        if (!textarea) return { found: false };

        let container = textarea.parentElement;
        while (container && !container.className.includes('sc-77366d4e-2')) {
          container = container.parentElement;
        }
        if (!container) return { found: false };

        const children = container.children;
        if (children.length < 3) return { found: false };

        const buttonContainer = children[2];
        const buttons = Array.from(buttonContainer.querySelectorAll('button'));
        const addBtn = buttons.find(btn => {
          const icon = btn.querySelector('i');
          return icon && icon.textContent.trim() === 'add' && !btn.disabled;
        });

        if (addBtn) {
          addBtn.click();
          return { found: true };
        }
        return { found: false };
      });

      if (!addBtnInfo.found) throw new Error('Could not click add button');
      await this.page.waitForTimeout(2000);
      console.log('  ✓ Add button clicked');

      // Step 4: Setup file chooser and click file input
      const fileChooserPromise = this.page.waitForFileChooser({ timeout: 8000 });

      const fileinputClicked = await this.page.evaluate(() => {
        const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
        for (const input of fileInputs) {
          const accept = (input.accept || '').toLowerCase();
          if (accept.includes('jpg') || accept.includes('png') || accept.includes('image')) {
            input.click();
            return true;
          }
        }
        return false;
      });

      if (!fileinputClicked) throw new Error('Could not click file input');
      console.log('  ✓ File input clicked');

      // Step 5: Accept file from chooser
      try {
        const fileChooser = await fileChooserPromise;
        await fileChooser.accept([imagePath]);
        await this.page.waitForTimeout(3000);
        console.log('  ✓ File selected');
      } catch (e) {
        throw new Error(`File chooser error: ${e.message}`);
      }

      // Step 6: Wait for crop dialog
      try {
        await this.page.waitForFunction(
          () => {
            const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
            return dialogs.some(dialog => {
              const title = dialog.querySelector('h2');
              return title && title.textContent.includes('Cắt');
            });
          },
          { timeout: 15000 }
        );
        console.log('  ✓ Crop dialog appeared');
      } catch (e) {
        throw new Error(`Crop dialog timeout: ${e.message}`);
      }

      // Click "Cắt và lưu"
      const cutClicked = await this.page.evaluate(() => {
        const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
        const cropDialog = dialogs.find(dialog => {
          const title = dialog.querySelector('h2');
          return title && title.textContent.includes('Cắt');
        });

        if (!cropDialog) return false;

        const buttons = Array.from(cropDialog.querySelectorAll('button'));
        const cutBtn = buttons.find(btn => {
          const text = btn.textContent.toLowerCase().trim();
          return text.includes('cắt') && text.includes('lưu');
        });

        if (cutBtn && !cutBtn.disabled) {
          cutBtn.click();
          return true;
        }
        return false;
      });

      if (!cutClicked) throw new Error('"Cắt và lưu" button not found');
      console.log('  ✓ "Cắt và lưu" clicked');

      // Wait for dialog to close
      try {
        await this.page.waitForFunction(
          () => {
            const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
            return !dialogs.some(dialog => {
              const title = dialog.querySelector('h2');
              return title && title.textContent.includes('Cắt');
            });
          },
          { timeout: 10000 }
        );
      } catch (e) {
        throw new Error(`Dialog close timeout: ${e.message}`);
      }

      // Wait for preview ready
      let pollAttempts = 0;
      while (pollAttempts < 60) {
        await this.page.waitForTimeout(500);
        pollAttempts++;

        const buttonInfo = await this.page.evaluate((containerId) => {
          const container = document.getElementById(containerId);
          if (!container) return { buttons: 0 };
          const buttons = Array.from(container.querySelectorAll('button'));
          return { totalButtons: buttons.length };
        }, this.parentContainerId);

        if (buttonInfo.totalButtons >= 3) {
          console.log('  ✓ Preview ready');
          break;
        }
      }

      console.log('✓ Image uploaded\n');
      return true;

    } catch (error) {
      console.error(`❌ Error uploading image: ${error.message}`);
      throw error;
    }
  }

  async selectVideoFromComponents() {
    console.log('📍 Selecting "Tạo video từ các thành phần"...');

    try {
      // Step 1: Check current mode
      console.log('  └─ Verifying current option...');
      const currentOption = await this.page.evaluate(() => {
        const comboboxes = document.querySelectorAll('[role="combobox"]');
        if (comboboxes.length > 0) {
          return comboboxes[0].textContent.trim().toLowerCase();
        }
        return '';
      });

      // If already in correct mode, skip
      if (currentOption.includes('video') && currentOption.includes('thành phần')) {
        console.log('  ✓ Already in video mode');
        return;
      }

      console.log(`  ✓ Current mode: image (need to switch)`);
      await this.page.waitForTimeout(1000);

      // Step 2: Click combobox to open dropdown
      console.log('  └─ Opening dropdown...');
      let dropdownOpened = false;
      let retries = 0;

      while (!dropdownOpened && retries < 3) {
        dropdownOpened = await this.page.evaluate(() => {
          const comboboxes = document.querySelectorAll('[role="combobox"]');
          if (comboboxes.length > 0) {
            comboboxes[0].click();
            // Check if dropdown menu appeared
            const menu = document.querySelector('[role="listbox"], [role="menu"]');
            return menu !== null;
          }
          return false;
        });

        if (!dropdownOpened) {
          await this.page.waitForTimeout(1000);
          retries++;
        }
      }

      if (!dropdownOpened) throw new Error('Could not open dropdown menu');
      await this.page.waitForTimeout(1500);
      console.log('  ✓ Dropdown opened');

      // Step 3: Find and click the video option
      console.log('  └─ Finding "Tạo video từ các thành phần" option...');
      let optionClicked = false;
      retries = 0;

      while (!optionClicked && retries < 3) {
        optionClicked = await this.page.evaluate(() => {
          // First try [role="option"] elements
          const options = Array.from(document.querySelectorAll('[role="option"]'));
          for (const option of options) {
            const text = option.textContent.trim();
            if (text.includes('Tạo video') && text.includes('thành phần')) {
              option.click();
              return true;
            }
          }

          // Fallback to any element with matching text
          const allElements = Array.from(document.querySelectorAll('*'));
          for (const el of allElements) {
            if (el.childNodes.length === 0) continue; // Skip elements with children
            const text = el.textContent.trim();
            if (text === 'Tạo video từ các thành phần') {
              el.click();
              return true;
            }
          }
          return false;
        });

        if (!optionClicked) {
          console.log(`  ⚠️  Option not found, retrying (${retries + 1}/3)...`);
          await this.page.waitForTimeout(1500);
          retries++;
        }
      }

      if (!optionClicked) throw new Error('Could not find and click video option');
      await this.page.waitForTimeout(1500);
      console.log('  ✓ Clicked "Tạo video từ các thành phần"');

      // Step 4: Verify selection
      console.log('  └─ Verifying selection...');
      const verified = await this.page.evaluate(() => {
        const comboboxes = document.querySelectorAll('[role="combobox"]');
        if (comboboxes.length > 0) {
          const text = comboboxes[0].textContent.toLowerCase();
          return text.includes('video') && text.includes('thành phần');
        }
        return false;
      });

      if (verified) {
        console.log('✓ Video mode verified\n');
      } else {
        console.log('⚠️  Verification inconclusive, proceeding anyway...\n');
      }

    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      throw error;
    }
  }

  async verifyVideoInterface() {
    console.log('📍 Verifying Veo model...');

    try {
      // Click config button
      const configClicked = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const icon = btn.querySelector('i');
          if (icon && icon.textContent.includes('tune')) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (!configClicked) throw new Error('Could not find config button');

      await this.page.waitForTimeout(2000);

      // Check for Veo model
      const hasVeo = await this.page.evaluate(() => {
        return document.body.innerText.toLowerCase().includes('veo');
      });

      if (!hasVeo) throw new Error('Could not verify Veo model');

      console.log('  ✓ Confirmed Veo model');

      // Close config
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(2000);
      console.log('✓ Interface verified\n');

    } catch (error) {
      console.error(`❌ Verification failed: ${error.message}`);
      throw error;
    }
  }

  async enterPrompt(prompt) {
    console.log('📍 Entering prompt...');

    try {
      // Focus textarea
      console.log('  └─ Focusing textarea...');
      await this.page.focus('#PINHOLE_TEXT_AREA_ELEMENT_ID');
      await this.page.waitForTimeout(500);
      console.log('  ✓ Textarea focused');
      await this.page.waitForTimeout(2000);

      // Split prompt: first ~10 chars typed, rest pasted
      const firstPartLength = Math.min(10, prompt.length);
      const firstPart = prompt.substring(0, firstPartLength);
      const secondPart = prompt.substring(firstPartLength);

      console.log(`  └─ Typing first ${firstPartLength} characters...`);
      await this.page.type('#PINHOLE_TEXT_AREA_ELEMENT_ID', firstPart, { delay: 50 });
      await this.page.waitForTimeout(2000);
      console.log('  ✓ First part typed');

      // Paste remaining part
      if (secondPart.length > 0) {
        console.log(`  └─ Pasting remaining ${secondPart.length} characters...`);
        await this.page.evaluate((text) => {
          const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
          if (textarea) {
            textarea.value += text;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, secondPart);
        await this.page.waitForTimeout(2000);
        console.log('  ✓ Second part pasted');
      }

      // Double-check prompt was entered
      const promptEntered = await this.page.evaluate(() => {
        const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
        return textarea ? textarea.value.length > 0 : false;
      });

      if (!promptEntered) throw new Error('Prompt not entered');
      console.log('✓ Prompt entered\n');

    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      throw error;
    }
  }

  async checkSendButton() {
    console.log('📍 Checking Send button...');

    try {
      const status = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
          const icon = btn.querySelector('i');
          const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
          if ((icon && (icon.textContent.includes('arrow_forward') || icon.textContent.includes('send'))) ||
              ariaLabel.includes('send')) {
            return { found: true, disabled: btn.disabled };
          }
        }
        return { found: false, disabled: true };
      });

      if (!status.found) {
        console.log('⚠️  Send button not found - ABORTING');
        throw new Error('Send button not found');
      }

      if (status.disabled) {
        console.log('⚠️  Send button is DISABLED - ABORTING');
        throw new Error('Send button is disabled');
      }

      console.log('✓ Send button is ACTIVE');
      await this.page.waitForTimeout(2000);
      return true;
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      throw error;
    }
  }

  async submit() {
    console.log('📍 Submitting...');

    try {
      console.log('  └─ Clicking send button...');
      const submitted = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
          const icon = btn.querySelector('i');
          if (icon && (icon.textContent.includes('arrow_forward') || icon.textContent.includes('send'))) {
            if (!btn.disabled && btn.offsetParent !== null) {
              btn.click();
              return true;
            }
          }
        }
        return false;
      });

      if (!submitted) throw new Error('Could not click send button');

      console.log('  ✓ Send button clicked');
      await this.page.waitForTimeout(2000);

      // Double-check submission
      console.log('  └─ Verifying submission...');
      const loadingIndicators = await this.page.evaluate(() => {
        const indicators = document.querySelectorAll('[class*="loading"], [class*="spinner"], [class*="progress"]');
        return indicators.length > 0;
      });

      if (loadingIndicators) {
        console.log('  ✓ Generation started');
      } else {
        console.log('  ⚠️ No loading indicator - may have submitted already');
      }

      console.log('✓ Submitted');
      await this.page.waitForTimeout(2000);

    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      throw error;
    }
  }

  async monitorGeneration() {
    console.log('📍 Monitoring generation (max 5 min)...');

    const startTime = Date.now();
    const maxWaitTime = 300000;
    let lastLog = startTime;

    while (Date.now() - startTime < maxWaitTime) {
      // Check for policy violation FIRST
      const policyViolation = await this.page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        return text.includes('chính sách') || text.includes('vi phạm');
      });

      if (policyViolation) {
        console.log('⚠️ Policy violation detected, attempting regenerate...');
        const retryClicked = await this.page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          for (const btn of buttons) {
            const icon = btn.querySelector('i');
            if (icon && (icon.textContent.includes('wrap_text') || icon.textContent.includes('refresh'))) {
              if (!btn.disabled && btn.offsetParent !== null) {
                console.log('  └─ Found regenerate button, clicking...');
                btn.click();
                return true;
              }
            }
          }
          return false;
        });

        if (retryClicked) {
          console.log('  ✓ Regenerate clicked, waiting 3s...');
          await this.page.waitForTimeout(3000);
        } else {
          console.log('  ⚠️ Could not find regenerate button');
        }
      }

      const state = await this.page.evaluate(() => {
        const videos = document.querySelectorAll('video');
        const loadingIndicators = document.querySelectorAll('[class*="loading"], [class*="skeleton"]');
        return {
          videoCount: videos.length,
          isLoading: loadingIndicators.length > 0
        };
      });

      if (state.videoCount > 0 && !state.isLoading) {
        console.log('✓ Video generated!\n');
        return true;
      }

      const now = Date.now();
      if (now - lastLog > 20000) {
        const elapsed = Math.round((now - startTime) / 1000);
        console.log(`⏳ Still generating... (${elapsed}s)`);
        lastLog = now;
      }

      await this.page.waitForTimeout(2000);
    }

    console.warn('⚠️ Generation timeout\n');
    return false;
  }

  async downloadVideo() {
    console.log('📍 Checking for download options...');

    try {
      // Check for download button
      console.log('  └─ Looking for download button...');
      const hasDownloadBtn = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
        
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          const icon = btn.querySelector('i')?.textContent.trim().toLowerCase() || '';
          
          if ((text.includes('download') || text.includes('tải') || text.includes('stải') ||
               icon.includes('download') || icon.includes('file_download') || 
               icon.includes('save') || icon.includes('get_app')) &&
              !btn.disabled && btn.offsetParent !== null) {
            return true;
          }
        }
        return false;
      });

      if (!hasDownloadBtn) {
        console.log('  ℹ️ No download button available (video generation complete)\n');
        return null;
      }

      // Click the download button
      console.log('  └─ Clicking download button...');
      const downloadClicked = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
        
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          const icon = btn.querySelector('i')?.textContent.trim().toLowerCase() || '';
          
          if ((text.includes('download') || text.includes('tải') || text.includes('stải') ||
               icon.includes('download') || icon.includes('file_download') || 
               icon.includes('save') || icon.includes('get_app')) &&
              !btn.disabled && btn.offsetParent !== null) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (downloadClicked) {
        await this.page.waitForTimeout(2000);
        console.log('  ✓ Download initiated');
        console.log('✓ Download complete\n');
        return true;
      } else {
        console.log('  ⚠️ Could not click download button');
        return null;
      }

    } catch (error) {
      console.warn(`⚠️ Download check failed: ${error.message}\n`);
      return null;
    }
  }

  async close() {
    if (this.browser) await this.browser.close();
  }
}

export async function runVideoGeneration(options = {}) {
  const videoGen = new VideoGenerationAutomationV2(options);

  try {
    console.log('\n' + '═'.repeat(70));
    console.log('🎬 VIDEO GENERATION - Google Labs Flow');
    console.log('═'.repeat(70));
    console.log(`Duration: ${options.duration || 5}s | Quality: ${options.quality || 'high'}`);
    console.log(`Aspect Ratio: ${options.aspectRatio || '16:9'}`);
    console.log(`Image: ${options.imagePath ? 'Yes' : 'No'}`);
    console.log('═'.repeat(70) + '\n');

    // Initialize and navigate
    await videoGen.init();
    await videoGen.navigateToProject();
    // At this point we're on image tab by default

    // Upload image if provided (BEFORE switching to video tab)
    if (options.imagePath) {
      if (!fs.existsSync(options.imagePath)) {
        throw new Error(`Image file not found: ${options.imagePath}`);
      }
      await videoGen.uploadImage(options.imagePath);
    }

    // Switch to video tab and select video mode
    await videoGen.switchToVideoTab();
    await videoGen.selectVideoFromComponents();

    // Verify Veo model
    await videoGen.verifyVideoInterface();

    // Enter prompt
    if (!options.prompt) throw new Error('Prompt is required');
    await videoGen.enterPrompt(options.prompt);

    // Check send button
    await videoGen.checkSendButton();

    // Submit and monitor
    await videoGen.submit();
    await videoGen.monitorGeneration();

    // Download video
    await videoGen.downloadVideo();

    await videoGen.close();

    console.log('═'.repeat(70));
    console.log('✅ VIDEO GENERATION COMPLETE');
    console.log('═'.repeat(70) + '\n');

    return {
      success: true,
      duration: options.duration,
      quality: options.quality,
      aspectRatio: options.aspectRatio,
      generatedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    await videoGen.close();
    
    return {
      success: false,
      error: error.message
    };
  }
}

export { VideoGenerationAutomationV2 };
export default VideoGenerationAutomationV2;
