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
    this.downloadedFilePath = null;  // 💫 Track downloaded file path
    this.options = {
      headless: false,
      sessionFilePath: path.join(__dirname, '../.sessions/google-flow-session.json'),
      projectUrl: process.env.PROJECT_GOOGLE_FLOW_URL || 'https://labs.google/fx/vi/tools/flow/project/3ba9e02e-0a33-4cf2-9d55-4c396941d7b7',
      imagePath: options.imagePath || null,
      duration: options.duration || 5,
      aspectRatio: options.aspectRatio || '16:9',
      quality: options.quality || 'high',
      outputDir: options.outputDir || null,  // 💫 Accept outputDir for downloads
      ...options
    };
  }

  async init() {
    console.log('🚀 Initializing Video Generation...');
    
    // 💫 Setup custom downloads path if outputDir provided
    const downloadBehavior = {
      behavior: 'allow',
      downloadPath: this.options.outputDir || path.join(__dirname, '../downloads')
    };

    this.browser = await puppeteer.launch({
      headless: this.options.headless,
      args: ['--no-sandbox']
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });

    // 💫 Set download behavior using CDP
    const client = await this.page.target().createCDPSession();
    try {
      await client.send('Browser.setDownloadBehavior', downloadBehavior);
      if (this.options.outputDir) {
        console.log(`✅ Download path set to: ${this.options.outputDir}`);
      }
    } catch (error) {
      console.warn(`⚠️ Could not set download path: ${error.message}`);
    }

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
    console.log('📍 Navigating to video generation project...');
    await this.page.goto(this.options.projectUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for loading text to disappear (30s)
    await this.waitForPageFullyLoaded(30000);
    console.log('✓ Project fully loaded and ready');
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
    // 💫 FIXED: Increased wait time for DOM stabilization
    await this.page.waitForTimeout(2500);
    
    // Verify tab is active by checking for textarea
    try {
      await this.page.waitForFunction(
        () => {
          const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
          return textarea && textarea.offsetParent !== null;
        },
        { timeout: 3000 }
      );
    } catch (e) {
      console.warn('  ⚠️  Image tab elements not fully ready, continuing anyway...');
    }
    
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
    // 💫 FIXED: Increased wait time and added explicit verification
    await this.page.waitForTimeout(3000);
    
    // Verify video tab is fully loaded - wait for video elements to be ready
    try {
      await this.page.waitForFunction(
        () => {
          const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
          return textarea && textarea.offsetParent !== null;
        },
        { timeout: 5000 }
      );
    } catch (e) {
      console.warn('  ⚠️  Video tab elements not fully ready, continuing anyway...');
    }
    
    console.log('✓ Video tab active and ready');
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
      // 💫 FIXED: Increased wait time for DOM to stabilize
      await this.page.waitForTimeout(2000);

      // Switch back to IMAGE tab
      console.log('    2. Switch back to image tab...');
      await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        buttons.find(btn => {
          const icon = btn.querySelector('i');
          return icon && icon.textContent.includes('image');
        })?.click();
      });
      // 💫 FIXED: Increased wait time for IMAGE tab to be fully ready for upload
      await this.page.waitForTimeout(2500);
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

      // 💫 FIXED: Wait longer for preview to be fully rendered and stable
      await this.page.waitForTimeout(3000);

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
      // 💫 FIXED: Wait longer after clicking to ensure selection is processed
      await this.page.waitForTimeout(2500);
      console.log('  ✓ Clicked "Tạo video từ các thành phần"');

      // Step 4: Verify selection - wait for dropdown to show new selection
      console.log('  └─ Verifying selection...');
      let verificationAttempts = 0;
      let verified = false;
      
      while (!verified && verificationAttempts < 5) {
        verified = await this.page.evaluate(() => {
          const comboboxes = document.querySelectorAll('[role="combobox"]');
          if (comboboxes.length > 0) {
            const text = comboboxes[0].textContent.toLowerCase();
            return text.includes('video') && text.includes('thành phần');
          }
          return false;
        });

        if (!verified) {
          verificationAttempts++;
          await this.page.waitForTimeout(500);
        }
      }

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

      // 💫 FIXED: Wait longer for config modal to appear
      await this.page.waitForTimeout(2500);

      // Verify config modal is visible
      try {
        await this.page.waitForFunction(
          () => {
            const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
            return dialogs.length > 0;
          },
          { timeout: 5000 }
        );
      } catch (e) {
        console.warn('  ⚠️  Config modal not fully visible, proceeding anyway...');
      }

      // Check for Veo model
      const hasVeo = await this.page.evaluate(() => {
        return document.body.innerText.toLowerCase().includes('veo');
      });

      if (!hasVeo) throw new Error('Could not verify Veo model');

      console.log('  ✓ Confirmed Veo model');

      // 💫 FIXED: Set aspect ratio with proper waits
      await this.setAspectRatio(this.options.aspectRatio);
      await this.page.waitForTimeout(1500);

      // 💫 FIXED: Set output quantity with proper waits
      await this.setOutputQuantity(1);
      await this.page.waitForTimeout(1500);

      // Close config
      await this.page.keyboard.press('Escape');
      // 💫 FIXED: Wait longer for modal to fully close before continuing
      await this.page.waitForTimeout(2500);
      
      // Verify modal is closed
      try {
        await this.page.waitForFunction(
          () => {
            const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
            return dialogs.length === 0;
          },
          { timeout: 3000 }
        );
      } catch (e) {
        console.warn('  ⚠️  Modal close verification failed, proceeding anyway...');
      }
      
      console.log('✓ Interface verified\n');

    } catch (error) {
      console.error(`❌ Verification failed: ${error.message}`);
      throw error;
    }
  }

  async setAspectRatio(aspectRatio) {
    const displayRatio = aspectRatio || '16:9';
    console.log(`  └─ Setting aspect ratio to ${displayRatio}...`);
    
    try {
      const aspectMapping = {
        '16:9': ['16:9', 'khổ ngang', 'landscape'],
        '9:16': ['9:16', 'khổ dọc', 'portrait'],
        'landscape': ['16:9', 'khổ ngang'],
        'portrait': ['9:16', 'khổ dọc']
      };
      
      const targetRatio = aspectMapping[displayRatio] || aspectMapping['16:9'];
      
      // Step 1: Wait for dialog to be fully visible
      console.log(`  → Waiting for dialog to load (2s)...`);
      await this.page.waitForTimeout(2000);
      
      // Step 2: Scroll to ensure button is in viewport
      await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button[role="combobox"]'));
        for (const btn of buttons) {
          const text = btn.innerText.toLowerCase();
          if (text.includes('tỷ lệ khung hình') || text.includes('ratio')) {
            btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            break;
          }
        }
      });
      
      await this.page.waitForTimeout(1000);
      
      // Step 3: Find the aspect ratio button
      const currentValue = await this.page.evaluate(() => {
        // 💫 FIX: Look for button within dialog/popover visibility context
        const buttons = Array.from(document.querySelectorAll('button[role="combobox"]'));
        
        for (const btn of buttons) {
          const text = btn.innerText.toLowerCase();
          if (text.includes('tỷ lệ khung hình') || text.includes('ratio')) {
            // Check if button or its parent is visible
            const style = window.getComputedStyle(btn);
            if (style.display !== 'none' && style.visibility !== 'hidden') {
              const valueSpan = btn.querySelector('[class*="sc-4b3fbad9-5"], span');
              if (valueSpan) {
                const currentVal = valueSpan.innerText.trim().toLowerCase();
                return { found: true, currentVal: currentVal };
              }
            }
          }
        }
        return { found: false, currentVal: null };
      });
      
      if (!currentValue?.found) {
        console.log(`  ⚠️  Aspect ratio button not visible. Trying alternative approach...`);
        
        // 💫 FIX: Try clicking via keyboard instead
        console.log(`  → Trying keyboard navigation for aspect ratio...`);
        await this.page.keyboard.press('Tab');
        await this.page.keyboard.press('Tab');
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(1000);
        
        // Try finding the dropdown now
        const dropdownFound = await this.page.evaluate((target) => {
          const menus = Array.from(document.querySelectorAll('[role="listbox"], [role="menu"], [role="dialog"]'));
          return menus.length > 0;
        });
        
        if (!dropdownFound) {
          console.log(`  ⚠️  Could not open aspect ratio dropdown`);
          return;
        }
      }
      
      console.log(`  📍 Current aspect ratio: ${currentValue?.currentVal || 'unknown'}`);
      
      // Step 4: Check if already set correctly
      const isAlreadySet = targetRatio.some(val => 
        currentValue?.currentVal?.includes(val) || false
      );
      
      if (isAlreadySet) {
        console.log(`  ✓ Aspect ratio already set to ${displayRatio}`);
        return;
      }
      
      // Step 5: Click button to open dropdown
      console.log(`  → Clicking aspect ratio button...`);
      const clicked = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button[role="combobox"]'));
        for (const btn of buttons) {
          const text = btn.innerText.toLowerCase();
          if (text.includes('tỷ lệ khung hình') || text.includes('ratio')) {
            // 💫 FIX: Ensure button is clickable by forcing focus first
            btn.focus();
            btn.click();
            return true;
          }
        }
        return false;
      });
      
      if (!clicked) {
        console.log(`  ⚠️  Could not find/click aspect ratio button`);
        return;
      }
      
      await this.page.waitForTimeout(1500);
      
      // Step 6: Find and click the target aspect ratio in dropdown
      console.log(`  → Looking for "${displayRatio}" in dropdown menu...`);
      
      const optionClicked = await this.page.evaluate((target) => {
        const validAspectRatios = ['16:9', '9:16', 'landscape', 'portrait', 'khổ ngang', 'khổ dọc'];
        
        // 💫 FIX: Look for dropdown in portals/modals
        const menus = Array.from(document.querySelectorAll(
          '[role="listbox"], [role="menu"], [role="dialog"] [role="option"], body > div'
        ));
        
        for (const menu of menus) {
          const options = Array.from(menu.querySelectorAll('[role="option"], li, div'));
          
          for (const option of options) {
            const text = option.innerText?.toLowerCase().trim() || '';
            
            // Only process valid aspect ratio options
            if (!validAspectRatios.some(valid => text.includes(valid))) {
              continue;
            }
            
            // Check if this matches our target
            if (target.some(t => text.includes(t))) {
              const style = window.getComputedStyle(option);
              if (style.display !== 'none' && style.visibility !== 'hidden') {
                option.click();
                option.focus();
                return true;
              }
            }
          }
        }
        
        return false;
      }, targetRatio);
      
      if (optionClicked) {
        console.log(`  ✓ Aspect ratio set to ${displayRatio}`);
        await this.page.waitForTimeout(1000);
      } else {
        console.log(`  ⚠️  Could not click aspect ratio option "${displayRatio}"`);
      }
      
    } catch (error) {
      console.warn(`  ⚠️  Error setting aspect ratio: ${error.message}`);
    }
  }


  async setOutputQuantity(quantity) {
    console.log(`  └─ Setting output quantity to ${quantity}x...`);
    
    try {
      // Step 1: Find the output quantity button with current value
      console.log(`  → Finding output quantity button...`);
      const buttonInfo = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button[role="combobox"]'));
        
        for (const btn of buttons) {
          const text = btn.innerText.toLowerCase();
          if (text.includes('câu trả lời đầu ra') || text.includes('output')) {
            // Get current value
            const spans = btn.querySelectorAll('span');
            let currentVal = '';
            for (const span of spans) {
              const val = span.innerText.trim();
              if (val === '1' || val === '2' || val === '3') {
                currentVal = val;
                break;
              }
            }
            
            // Get menu id from aria-controls
            const menuId = btn.getAttribute('aria-controls');
            return { id: menuId, currentVal: currentVal };
          }
        }
        return { id: null, currentVal: null };
      });

      if (!buttonInfo.id) {
        console.log('  ⚠️  Could not find output quantity button');
        return;
      }

      console.log(`  📍 Current: ${buttonInfo.currentVal}, Target: ${quantity}`);

      // Step 2: Check if already correct
      if (buttonInfo.currentVal === String(quantity)) {
        console.log(`  ✓ Output already set to ${quantity}x`);
        return;
      }

      // Step 3: Click the button to open dropdown
      console.log(`  → Clicking button...`);
      await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button[role="combobox"]'));
        for (const btn of buttons) {
          const text = btn.innerText.toLowerCase();
          if (text.includes('câu trả lời đầu ra') || text.includes('output')) {
            btn.click();
            return;
          }
        }
      });
      
      // Wait for dropdown to appear
      await this.page.waitForTimeout(1000);

      // Step 4: Click the "1" option in dropdown
      console.log(`  → Clicking option "${quantity}"...`);
      const clicked = await this.page.evaluate((qty) => {
        // Find all divs/buttons with role option in ALL dropdowns
        const allOptions = Array.from(document.querySelectorAll('[role="option"], [data-option], li'));
        
        for (const option of allOptions) {
          const text = option.innerText.trim();
          const value = option.getAttribute('data-value') || option.getAttribute('value') || '';
          
          // Try multiple matching strategies
          if (text === String(qty) || 
              value === String(qty) || 
              text === `x${qty}` ||
              (text.trim().length <= 2 && text.includes(qty))) {
            option.click();
            return true;
          }
        }
        
        // Fallback: try to find by searching all clickable elements in visible dropdowns
        const visibleElements = Array.from(document.querySelectorAll('button, div[role="button"], li'));
        for (const el of visibleElements) {
          // Check if element is visible
          if (el.offsetParent === null) continue;
          
          const text = el.innerText?.trim() || '';
          if (text === String(qty) || text === `x${qty}`) {
            el.click();
            return true;
          }
        }
        
        return false;
      }, quantity);

      if (clicked) {
        console.log(`  ✓ Option "${quantity}" clicked`);
        await this.page.waitForTimeout(1500);
      } else {
        console.log(`  ⚠️  Could not click option "${quantity}"`);
        
        // Debug: log all visible options
        await this.page.evaluate((qty) => {
          const allOptions = Array.from(document.querySelectorAll('[role="option"], button, div, li'));
          const visibleOptions = allOptions
            .filter(el => el.offsetParent !== null)
            .slice(0, 10)
            .map(el => el.innerText?.trim());
          console.log(`Available options: ${visibleOptions.join(', ')}`);
        }, quantity);
      }

    } catch (error) {
      console.warn(`  ⚠️  Error setting output quantity: ${error.message}`);
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

    try {
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
      const maxWaitAttempts = 20;  // 10 seconds max (500ms per attempt)

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

      console.log(`\n✓ Prompt entered (${expectedLength} characters)\n`);
      
      // Store for validation in submit
      this.expectedPromptLength = expectedLength;

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
    console.log('📍 Validating submission requirements...');

    try {
      // 💫 ALIGNED WITH IMAGE GENERATION: Comprehensive validation before submission
      const expectedLen = this.expectedPromptLength || 0;
      const submitValidation = await this.page.evaluate((expectedLength) => {
        const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
        if (!textarea) return { valid: false, reason: 'textarea not found', textareaLength: 0 };

        // Find parent container
        let container = textarea.parentElement;
        while (container && !container.className.includes('sc-77366d4e-2')) {
          container = container.parentElement;
        }

        if (!container) return { valid: false, reason: 'container not found', textareaLength: textarea.value.length };

        const buttons = Array.from(container.querySelectorAll('button'));
        let sendBtn = null;

        // Find send button
        for (const btn of buttons) {
          const icon = btn.querySelector('i');
          if (!icon) continue;
          const iconText = icon.textContent.trim();
          if (iconText === 'arrow_forward' || iconText === 'send') {
            sendBtn = btn;
            break;
          }
        }

        const textareaLength = textarea.value.length;

        // Validate send button exists
        if (!sendBtn) {
          return { valid: false, reason: 'send button not found', textareaLength };
        }

        // Validate textarea length matches expected
        if (textareaLength < expectedLength) {
          return { valid: false, reason: `Textarea incomplete (${textareaLength}/${expectedLength} chars)`, textareaLength };
        }

        return { valid: true, textareaLength, sendDisabled: sendBtn.disabled };
      }, expectedLen);

      if (!submitValidation.valid) {
        console.log(`❌ Validation failed: ${submitValidation.reason}`);
        console.log(`   Textarea: ${submitValidation.textareaLength}/${expectedLen} chars`);
        throw new Error(`Cannot submit: ${submitValidation.reason}`);
      }

      // Enable send button if disabled
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

      console.log(`✓ All checks passed (${submitValidation.textareaLength}/${expectedLen} chars)\n`);

      // Click send button
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
      console.log('✓ Submitted\n');

    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      throw error;
    }
  }

  async monitorGeneration() {
    console.log('📍 Monitoring video generation...');
    console.log('  └─ Checking index 1 for video element (max 10 min)...');

    const startTime = Date.now();
    const maxWaitTime = 600000;  // 10 minutes for video rendering
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

      // 💫 Check if index 1 has VIDEO element with src (rendering complete)
      const renderState = await this.page.evaluate(() => {
        // Find element with data-index="1"
        const indexOneItem = document.querySelector('[data-index="1"]');
        
        if (!indexOneItem) {
          return {
            hasVideo: false,
            videoReady: false,
            hasErrorMessage: false
          };
        }

        // Check if it contains a video element
        const videoElement = indexOneItem.querySelector('video');
        const hasVideo = videoElement !== null;
        const videoReady = hasVideo && videoElement.src && videoElement.src.length > 0;

        // Check for error message "Không tạo được"
        const itemText = indexOneItem.innerText;
        const hasErrorMessage = itemText.includes('Không tạo được') || 
                                itemText.includes('không được') ||
                                itemText.includes('lỗi');

        return {
          hasVideo,
          videoReady,
          hasErrorMessage,
          errorMessage: hasErrorMessage ? itemText.substring(0, 150) : null
        };
      });

      // Check for render failure and trigger regenerate
      if (renderState.hasErrorMessage && renderState.errorMessage) {
        console.log(`⚠️ Render failed: "${renderState.errorMessage}"`);
        console.log('  └─ Triggering regenerate...');
        const regenerated = await this.regenerateVideoSegment();
        if (regenerated) {
          console.log('✓ Regenerate submitted, monitoring again...\n');
          lastLog = Date.now();
          continue;
        } else {
          console.log('⚠️ Regenerate failed');
          return false;
        }
      }

      // Check if rendering is complete (video element with src found)
      if (renderState.videoReady) {
        console.log('✅ Video rendering complete!');
        console.log('  └─ Video element found with src');
        console.log('  └─ Ready for download\n');
        return true;
      }

      // Log progress every 15 seconds
      const now = Date.now();
      if (now - lastLog > 15000) {
        const elapsed = Math.round((now - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        console.log(`⏳ Still rendering... (${minutes}m ${seconds}s)`);
        lastLog = now;
      }

      // Check every 1 second instead of 2 for faster response
      await this.page.waitForTimeout(1000);
    }

    console.warn(`⚠️ Generation timeout after ${Math.round((Date.now() - startTime) / 1000)}s\n`);
    return false;
  }
  async regenerateVideoSegment() {
    console.log('  📍 Regenerating video segment...');
    console.log('    └─ Finding "Sử dụng lại câu lệnh" button...');

    try {
      // Find the regenerate button in the failed item
      const regenerateClicked = await this.page.evaluate(() => {
        // Find virtuoso container and item at index 1
        const container = document.querySelector('[data-testid*="virtuoso"], [class*="virtuoso"]');
        if (!container) return false;

        const item1 = container.querySelector('[data-index="1"]');
        if (!item1) return false;

        // Look for "Sử dụng lại câu lệnh" button (wrap_text icon)
        const buttons = Array.from(item1.querySelectorAll('button'));
        for (const btn of buttons) {
          const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
          const buttonText = btn.textContent.toLowerCase();
          const icon = btn.querySelector('i')?.textContent.toLowerCase() || '';

          if ((ariaLabel.includes('sử dụng') && ariaLabel.includes('câu')) ||
              (buttonText.includes('sử dụng') && buttonText.includes('câu')) ||
              icon.includes('wrap_text')) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (!regenerateClicked) {
        console.log('    ⚠️ Could not find regenerate button');
        return false;
      }

      console.log('    ✓ Regenerate button clicked');
      await this.page.waitForTimeout(2000);

      // Since image is already selected, just find and click the send button
      console.log('    └─ Sending regenerate request (image already selected)...');
      const sent = await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const btn of buttons) {
          const icon = btn.querySelector('i')?.textContent.trim().toLowerCase() || '';
          if ((icon.includes('arrow_forward') || icon.includes('send')) && !btn.disabled) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (!sent) {
        console.log('    ⚠️ Could not find send button');
        return false;
      }

      console.log('    ✓ Regenerate request sent (no image re-upload needed)');
      return true;

    } catch (error) {
      console.warn(`    ⚠️ Error during regenerate: ${error.message}`);
      return false;
    }
  }

  async downloadVideo() {
    console.log('📍 Downloading video...');

    try {
      // 💫 NEW: Wait brief moment to ensure download button is available
      await this.page.waitForTimeout(2000);
      
      // Check for download button with retries
      let downloadBtnFound = false;
      let retries = 0;
      const maxRetries = 3;
      
      while (!downloadBtnFound && retries < maxRetries) {
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

        if (hasDownloadBtn) {
          downloadBtnFound = true;
          console.log('  └─ Download button found');
        } else {
          retries++;
          if (retries < maxRetries) {
            console.log(`  ⏳ Download button not ready, retry ${retries}/${maxRetries} (waiting 2s)...`);
            await this.page.waitForTimeout(2000);
          }
        }
      }

      if (!downloadBtnFound) {
        console.log('  ℹ️ No download button available (video may still be processing)\n');
        return null;
      }

      // 💫 Get files BEFORE downloading to detect new file
      const outputDir = this.options.outputDir;
      const filesBefore = outputDir && fs.existsSync(outputDir) 
        ? fs.readdirSync(outputDir).filter(f => f.endsWith('.mp4') || f.endsWith('.webm'))
        : [];

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
        // 💫 NEW: Wait for download modal to appear
        console.log('  ✓ Download clicked, waiting for modal...');
        await this.page.waitForTimeout(1500);

        // 💫 NEW: Wait for modal to appear and select quality
        const qualitySelected = await this.waitForDownloadModalAndSelectQuality();
        if (!qualitySelected) {
          console.log('  ⚠️ Could not handle download modal');
        }

        // 💫 Wait for download to complete and find new file
        console.log('  ✓ Download initiated, waiting for file...');
        await this.page.waitForTimeout(3000);
        
        // Look for newly created file
        if (outputDir && fs.existsSync(outputDir)) {
          let newFile = null;
          let attempts = 0;
          const maxAttempts = 30;  // 30 * 500ms = 15 seconds
          
          while (!newFile && attempts < maxAttempts) {
            const filesAfter = fs.readdirSync(outputDir)
              .filter(f => (f.endsWith('.mp4') || f.endsWith('.webm')) && !f.startsWith('segment-'));
            
            const newly = filesAfter.find(f => !filesBefore.includes(f));
            if (newly) {
              newFile = newly;
              console.log(`  ✓ Downloaded file: ${newFile}`);
            } else {
              if (attempts % 3 === 0) {
                process.stdout.write(`  ⏳ Waiting for file... (${attempts * 500}ms)\r`);
              }
              await this.page.waitForTimeout(500);
              attempts++;
            }
          }
          
          if (newFile) {
            this.downloadedFilePath = path.join(outputDir, newFile);
            console.log(`  ✓ File path: ${this.downloadedFilePath}`);
            console.log('✓ Download complete\n');
            return this.downloadedFilePath;
          } else {
            console.log('  ⚠️ Timeout waiting for downloaded file');
          }
        }
        
        console.log('✓ Download button clicked\n');
        return true;  // Return true even if file detection failed
      } else {
        console.log('  ⚠️ Could not click download button');
        return null;
      }

    } catch (error) {
      console.warn(`⚠️ Download failed: ${error.message}\n`);
      return null;
    }
  }

  async waitForDownloadModalAndSelectQuality() {
    console.log('    └─ Checking for download modal...');

    try {
      // Wait for modal to appear (up to 10 seconds)
      let modalFound = false;
      let attempts = 0;
      const maxAttempts = 20;  // 20 * 500ms = 10 seconds

      while (!modalFound && attempts < maxAttempts) {
        const hasModal = await this.page.evaluate(() => {
          // Modal typically appears at the bottom of the page in a new div
          // Look for radix menu or dropdown with download options
          const modals = document.querySelectorAll('[role="dialog"], [role="menu"], [data-radix-popover-content], [data-popover]');
          for (const modal of modals) {
            const text = modal.innerText.toLowerCase();
            if (text.includes('1080') || text.includes('720') || text.includes('phân giải') || text.includes('độ phân giải')) {
              return true;
            }
          }
          return false;
        });

        if (hasModal) {
          modalFound = true;
          console.log('    ✓ Download modal appeared');
        } else {
          attempts++;
          if (attempts < maxAttempts) {
            await this.page.waitForTimeout(500);
          }
        }
      }

      if (!modalFound) {
        console.log('    ℹ️  No download modal detected (may not be available)');
        return false;
      }

      // Select quality: Prefer 720p to save credits, fallback to 1080p
      console.log('    └─ Selecting video quality (720p preferred to save credits)...');
      const qualitySelected = await this.page.evaluate(() => {
        // Find all clickable options in modal
        const modals = document.querySelectorAll('[role="dialog"], [role="menu"], [data-radix-popover-content], [data-popover]');
        
        for (const modal of modals) {
          const options = Array.from(modal.querySelectorAll('button, a, [role="option"], [role="menuitem"], div[role="button"]'));
          
          // First pass: Look for 720p option (original quality - saves credits)
          for (const option of options) {
            const text = option.textContent.toLowerCase();
            if ((text.includes('720') || text.includes('gốc') || text.includes('original')) && !option.disabled) {
              option.click();
              return { selected: true, quality: '720p' };
            }
          }
          
          // Second pass: Look for 1080p fallback (if 720p not available)
          for (const option of options) {
            const text = option.textContent.toLowerCase();
            if ((text.includes('1080') || text.includes('tăng độ phân giải')) && !option.disabled) {
              option.click();
              return { selected: true, quality: '1080p' };
            }
          }
        }
        
        return { selected: false, quality: null };
      });

      if (qualitySelected.selected) {
        console.log(`    ✓ Selected quality: ${qualitySelected.quality}`);
        await this.page.waitForTimeout(1000);
        return true;
      } else {
        console.log('    ℹ️  Could not find quality options in modal');
        return false;
      }

    } catch (error) {
      console.warn(`    ⚠️  Error handling download modal: ${error.message}`);
      return false;
    }
  }

  async close() {
    if (this.browser) await this.browser.close();
  }

  /**
   * 💫 REUSE OPTIMIZATION: Click "wrap_text" button to reuse command from previous generation
   * This copies the image and previous prompt into textarea, allowing segment update
   */
  async clickReuseCommandButton() {
    console.log('📍 Clicking Reuse Command button (wrap_text)...');

    try {
      const clicked = await this.page.evaluate(() => {
        // Find virtuoso container and item at index 1 (previous generation)
        const container = document.querySelector('[data-testid*="virtuoso"], [class*="virtuoso"]');
        if (!container) return false;

        const item1 = container.querySelector('[data-index="1"]');
        if (!item1) return false;

        // Look for "Sử dụng lại câu lệnh" button (wrap_text icon)
        const buttons = Array.from(item1.querySelectorAll('button'));
        for (const btn of buttons) {
          const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
          const buttonText = btn.textContent.toLowerCase();
          const icon = btn.querySelector('i')?.textContent.toLowerCase() || '';

          if ((ariaLabel.includes('sử dụng') && ariaLabel.includes('câu')) ||
              (buttonText.includes('sử dụng') && buttonText.includes('câu')) ||
              icon.includes('wrap_text')) {
            btn.click();
            return true;
          }
        }
        return false;
      });

      if (clicked) {
        console.log('   ✅ Reuse command button clicked');
        await this.page.waitForTimeout(1500);
        return true;
      } else {
        console.log('   ⚠️  Reuse command button not found');
        return false;
      }
    } catch (error) {
      console.error(`   ❌ Error clicking reuse button: ${error.message}`);
      return false;
    }
  }

  /**
   * 💫 REUSE OPTIMIZATION: Clear textarea and enter new segment script
   * Call this AFTER clickReuseCommandButton() to replace the script
   */
  async updateSegmentScript(newScript) {
    console.log(`📍 Updating segment script (${newScript.length} chars)...`);

    try {
      // Wait for textarea to be filled with previous command
      await this.page.waitForTimeout(1000);

      // Clear textarea
      console.log('   └─ Clearing previous script...');
      await this.page.evaluate(() => {
        const textarea = document.getElementById('PINHOLE_TEXT_AREA_ELEMENT_ID');
        if (textarea) {
          textarea.value = '';
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await this.page.waitForTimeout(500);

      // Enter new script using same 3-part strategy as enterPrompt
      console.log(`   └─ Entering new script (${newScript.length} chars)...`);
      await this.enterPrompt(newScript);

      console.log('   ✅ Script updated');
      return true;
    } catch (error) {
      console.error(`   ❌ Error updating script: ${error.message}`);
      throw error;
    }
  }

  /**
   * 💫 REUSE OPTIMIZATION: Generate video from segment using reuse button
   * For 2nd, 3rd, 4th segments - avoids re-uploading images
   */
  async generateSegmentVideo(segmentScript) {
    console.log(`\n📍 GENERATING SEGMENT VIDEO ${segmentScript.length} chars...`);

    try {
      // Step 1: Click reuse command button (copies previous generation)
      const reuseClicked = await this.clickReuseCommandButton();
      if (!reuseClicked) {
        console.warn('   ⚠️  Could not click reuse button, falling back to manual entry');
      }

      // Step 2: Update segment script (clears and enters new script)
      await this.updateSegmentScript(segmentScript);

      // Step 3: Check send button
      await this.checkSendButton();

      // Step 4: Submit and monitor generation
      await this.submit();

      // Step 5: Monitor generation
      const renderComplete = await this.monitorGeneration();
      if (!renderComplete) {
        console.warn('   ⚠️  Generation did not complete within timeout');
        return null;
      }

      // Step 6: Download video
      const videoPath = await this.downloadVideo();
      console.log(`   ✅ Segment video generated and downloaded`);
      return videoPath;

    } catch (error) {
      console.error(`   ❌ Error generating segment video: ${error.message}`);
      throw error;
    }
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
      // 💫 FIXED: Wait extra time to ensure upload is fully processed before switching tabs
      await videoGen.page.waitForTimeout(2000);
    }

    // Switch to video tab and select video mode
    console.log('\n⏱️  Ensuring upload complete before switching tabs...');
    await videoGen.switchToVideoTab();
    // 💫 FIXED: Wait to ensure tab switch is stable before selecting video mode
    await videoGen.page.waitForTimeout(2000);
    
    await videoGen.selectVideoFromComponents();
    // 💫 FIXED: Wait to ensure video mode is set before verifying interface
    await videoGen.page.waitForTimeout(2000);

    // Verify Veo model
    await videoGen.verifyVideoInterface();

    // Enter prompt
    if (!options.prompt) throw new Error('Prompt is required');
    await videoGen.enterPrompt(options.prompt);

    // Check send button
    await videoGen.checkSendButton();

    // Submit and monitor
    await videoGen.submit();
    const renderComplete = await videoGen.monitorGeneration();

    // Only download if rendering completed successfully
    let downloadResult = null;
    if (renderComplete) {
      // Download video
      downloadResult = await videoGen.downloadVideo();
    } else {
      console.warn('⚠️ Rendering did not complete within timeout - skipping download');
    }

    await videoGen.close();

    console.log('═'.repeat(70));
    console.log('✅ VIDEO GENERATION COMPLETE');
    console.log('═'.repeat(70) + '\n');

    return {
      success: true,
      duration: options.duration,
      quality: options.quality,
      aspectRatio: options.aspectRatio,
      videoPath: typeof downloadResult === 'string' ? downloadResult : null,  // 💫 Include video path
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
