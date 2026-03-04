/**
 * SettingsManager - Handles Google Flow settings configuration
 * 
 * Consolidated from:
 * - configureSettings() - Main settings configuration flow
 * - clickSettingsButton() - Open settings menu
 * - selectTab() - Tab selection in settings
 * - selectVideoReferenceType() - Video reference type selection
 * - debugSettingsButtons() - Debug settings buttons
 * 
 * Configuration steps:
 * 1. Open settings menu
 * 2. Select Image/Video tab
 * 3. Select aspect ratio (9:16, 16:9, etc)
 * 4. Select count (x1, x2, x3, x4)
 * 5. Select model (Nano Banana Pro, Veo 3.1, etc)
 * 6. Close settings
 * 
 * Uses: DOMElementFinder, MouseInteractionHelper
 * 
 * @example
 * const settings = new SettingsManager(page);
 * await settings.configureSettings({
 *   imageCount: 1,
 *   aspectRatio: '9:16',
 *   model: 'Nano Banana Pro'
 * });
 */

import { DOMElementFinder, MouseInteractionHelper } from '../index.js';

class SettingsManager {
  constructor(page, options = {}) {
    this.page = page;
    this.options = {
      type: options.type || 'image', // 'image' or 'video'
      imageCount: options.imageCount || 1,
      videoCount: options.videoCount || 1,
      aspectRatio: options.aspectRatio || '9:16',
      model: options.model || 'Nano Banana Pro',
      videoReferenceType: options.videoReferenceType || 'ingredients',
      ...options
    };
    this.debugMode = options.debugMode || false;
    
    // Bind utilities (only MouseInteractionHelper is currently active)
    MouseInteractionHelper.page = page;
  }

  /**
   * Configure all settings
   * Main orchestration method for complete settings setup
   */
  async configureSettings() {
    console.log('⚙️  CONFIGURING SETTINGS\n');

    try {
      // STEP 0: Open settings menu
      console.log('   🔧 STEP 0: Opening settings menu...');
      const settingsOpened = await this.clickSettingsButton();
      if (!settingsOpened) {
        console.warn('   ⚠️  Settings button may have failed, continuing...');
      } else {
        console.log('   ✅ Settings menu opened');
      }
      await this.page.waitForTimeout(500);

      // STEP 1: Select Image/Video Tab
      console.log('   📋 STEP 1: Select Image/Video Tab');
      console.log(`   > type: ${this.options.type}`);
      if (this.options.type === 'image') {
        const selector = 'button[id*="IMAGE"][role="tab"]';
        await this.selectRadixTab(selector, 'IMAGE tab');
      } else {
        const selector = 'button[id*="VIDEO"][role="tab"]';
        await this.selectRadixTab(selector, 'VIDEO tab');
      }
      console.log(`   ✅ Tab selected`);
      await this.page.waitForTimeout(500);

      // STEP 2: Select Aspect Ratio
      console.log('\n   📐 STEP 2: Select Aspect Ratio');
      const isVertical = this.options.aspectRatio.includes('9:16');
      const targetRatio = isVertical ? 'PORTRAIT' : 'LANDSCAPE';
      const ratioSelector = `button[id*="${targetRatio}"][role="tab"]`;
      await this.selectRadixTab(ratioSelector, `${targetRatio} (${this.options.aspectRatio})`);
      await this.page.waitForTimeout(500);

      // STEP 3: Select Count
      console.log('\n   🔢 STEP 3: Select Count');
      const count = this.options.type === 'image' ? this.options.imageCount : this.options.videoCount;
      console.log(`   > Count: x${count}`);
      const countSelected = await this.selectTab(`x${count}`);
      if (countSelected) {
        console.log(`   ✅ Count x${count} selected`);
      } else {
        console.log(`   ⚠️  Count x${count} selection may have failed`);
      }
      await this.page.waitForTimeout(500);

      // STEP 4: Select VIDEO Reference Type (if VIDEO)
      if (this.options.type === 'video') {
        console.log('\n   📽️  STEP 4: Select VIDEO Reference Type');
        await this.selectVideoReferenceType(this.options.videoReferenceType);
        await this.page.waitForTimeout(500);
      }

      // STEP 5: Select Model
      console.log(`\n   🤖 STEP ${this.options.type === 'image' ? 4 : 5}: Select Model`);
      const targetModel = this.options.model;
      const allowedImageModels = ['Nano Banana Pro', 'Nano Banana 2'];
      let effectiveTargetModel = targetModel;

      if (this.options.type === 'image' && !allowedImageModels.includes(targetModel)) {
        console.log(`   ⚠️  Unsupported image model "${targetModel}", fallback to "Nano Banana Pro"`);
        effectiveTargetModel = 'Nano Banana Pro';
      }

      console.log(`   > Target model: "${targetModel}"`);
      console.log(`   > Effective model: "${effectiveTargetModel}"`);
      
      try {
        console.log(`   > Searching for model dropdown button...`);
        
        const modelDropdownButton = await this.page.evaluate(() => {
          const settingsContainer = document.querySelector('[data-radix-menu-content].DropdownMenuContent, [data-radix-menu-content][role="menu"]');

          const findButtonByArrowIcon = (root) => {
            if (!root) return null;
            const icons = Array.from(root.querySelectorAll('i.google-symbols'));
            for (const icon of icons) {
              const iconText = (icon.textContent || '').trim();
              if (!iconText.includes('arrow_drop_down')) continue;

              const btn = icon.closest('button[aria-haspopup="menu"], button');
              if (!btn) continue;

              const rect = btn.getBoundingClientRect();
              if (rect.width <= 0 || rect.height <= 0) continue;

              return {
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2),
                text: (btn.textContent || '').trim().substring(0, 60),
                source: root === settingsContainer ? 'settings-container' : 'document-fallback'
              };
            }
            return null;
          };

          // Try in settings container first
          const byContainer = findButtonByArrowIcon(settingsContainer);
          if (byContainer) return { found: true, ...byContainer };

          // Fallback: full document
          const byDocument = findButtonByArrowIcon(document);
          if (byDocument) return { found: true, ...byDocument };

          return { found: false };
        });

        if (modelDropdownButton?.found) {
          console.log(`   ✓ Found model dropdown (${modelDropdownButton.source}): "${modelDropdownButton.text}"`);
          console.log(`   🖱️  Clicking...`);
          await this.page.mouse.move(modelDropdownButton.x, modelDropdownButton.y);
          await this.page.waitForTimeout(120);
          await this.page.mouse.down({ button: 'left' });
          await this.page.waitForTimeout(60);
          await this.page.mouse.up({ button: 'left' });
          
          console.log(`   ✓ Model dropdown opened, waiting for menu...`);
          await this.page.waitForTimeout(1000);
          
          // Try to select model from menu
          const modelSelectionResult = await this.page.evaluate((target, type) => {
            const normalize = (text = '') => text
              .normalize('NFKC')
              .replace(/🍌/g, '')
              .replace(/\s+/g, ' ')
              .trim()
              .toLowerCase();

            const allowedImageModels = new Set(['nano banana pro', 'nano banana 2']);
            const normalizedTarget = normalize(target);

            const candidateMenus = Array.from(document.querySelectorAll(
              '[role="menu"][data-state="open"], [data-radix-menu-content][data-state="open"], [role="menu"], [data-radix-menu-content]'
            ));

            let menu = null;
            let maxItemCount = 0;

            for (const candidate of candidateMenus) {
              const itemCount = candidate.querySelectorAll('[role="menuitem"]').length;
              if (itemCount > maxItemCount) {
                maxItemCount = itemCount;
                menu = candidate;
              }
            }

            if (!menu || maxItemCount === 0) {
              return { selected: false, selectedModel: null };
            }

            const items = Array.from(menu.querySelectorAll('[role="menuitem"]'));

            // Try exact match first
            for (const item of items) {
              const btn = item.querySelector('button') || item;
              const text = normalize(btn.textContent || item.textContent || '');

              if (type === 'image' && !allowedImageModels.has(text)) {
                continue;
              }

              if (text === normalizedTarget) {
                try {
                  if (btn && !btn.disabled) {
                    btn.click();
                    return { selected: true, selectedModel: text };
                  }
                } catch (e) {
                  // Continue
                }
              }
            }

            // Fallback: click first item
            if (type === 'image' && items.length > 0) {
              const firstItem = items[0];
              const firstBtn = firstItem.querySelector('button');
              if (firstBtn && !firstBtn.disabled) {
                try {
                  firstBtn.click();
                  return { selected: true, selectedModel: 'nano banana pro' };
                } catch (e) {
                  return { selected: false };
                }
              }
            }

            return { selected: false, selectedModel: null };
          }, effectiveTargetModel, this.options.type);
          
          if (modelSelectionResult?.selected) {
            console.log(`   ✓ ${effectiveTargetModel} selected\n`);
          } else {
            console.log(`   ⚠️  Could not select ${effectiveTargetModel}\n`);
          }
        } else {
          console.log(`   ⚠️  Could not open model dropdown\n`);
        }
      } catch (modelErr) {
        console.warn(`   ⚠️  Error selecting model: ${modelErr.message}\n`);
      }

      await this.page.waitForTimeout(500);

      // STEP 6: Close settings menu
      console.log('\n   🔧 STEP 6: Closing settings menu...');
      try {
        const settingsClosed = await this.clickSettingsButton();
        if (settingsClosed) {
          console.log('   ✓ Settings menu closed\n');
        } else {
          console.log('   ⚠️  Could not close settings, sending Escape...\n');
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(500);
        }
      } catch (closeErr) {
        console.log('   ⚠️  Error closing menu, trying Escape...');
        try {
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(300);
        } catch (kbErr) {
          console.log('   ⚠️  Escape also failed, continuing anyway...');
        }
      }

      console.log('   ✅ Settings configuration complete\n');
      return true;

    } catch (error) {
      console.error('   ❌ Error configuring settings:', error.message);
      console.warn('   ⚠️  Continuing with current settings...');
      return false;
    }
  }

  /**
   * Click settings button to open settings menu
   */
  async clickSettingsButton() {
    try {
      console.log('[SETTINGS] Finding settings button...');
      
      const btnInfo = await this.page.evaluate(() => {
        // 💫 NEW: Try finding settings via class "iRwVpo" container first (more reliable)
        let settingsBtn = document.querySelector('.iRwVpo button[aria-haspopup="menu"]');
        
        if (!settingsBtn) {
          // Fallback: search all dropdown buttons
          const allButtons = document.querySelectorAll('button[aria-haspopup="menu"]');
          
          for (const btn of allButtons) {
            const text = btn.textContent.toLowerCase();
            const box = btn.getBoundingClientRect();
            
            const isBananaModel = text.includes('banana');
            const hasRatioMarker = text.includes('crop') || btn.innerHTML.includes('crop_');
            const hasCount = /x[1-4]/.test(text);
            
            if ((isBananaModel || (hasRatioMarker && hasCount)) && 
                box.width > 100 && box.height > 30 && 
                box.top > 50) {
              settingsBtn = btn;
              break;
            }
          }
        }
        
        if (!settingsBtn) {
          return null;
        }
        
        const box = settingsBtn.getBoundingClientRect();
        return {
          x: Math.round(box.x + box.width / 2),
          y: Math.round(box.y + box.height / 2),
          visible: box.width > 0 && box.height > 0,
          text: settingsBtn.textContent.substring(0, 50)
        };
      });

      if (!btnInfo) {
        console.log('[SETTINGS] ❌ Settings button not found');
        return false;
      }

      if (!btnInfo.visible) {
        console.log('[SETTINGS] ❌ Settings button not visible');
        return false;
      }

      console.log(`[SETTINGS] Found button "${btnInfo.text}"`);
      
      // Click
      await this.page.mouse.move(btnInfo.x, btnInfo.y);
      await this.page.waitForTimeout(100);
      await this.page.mouse.down();
      await this.page.waitForTimeout(50);
      await this.page.mouse.up();

      console.log('[SETTINGS] Waiting for menu to appear...');
      await this.page.waitForTimeout(1000);

      return true;

    } catch (error) {
      console.error('[SETTINGS] ❌ Error:', error.message);
      return false;
    }
  }

  /**
   * Select tab by label text
   */
  async selectTab(label) {
    console.log(`   > Selecting "${label}" tab...`);
    
    try {
      const buttonInfo = await this.page.evaluate((targetLabel) => {
        const buttons = Array.from(document.querySelectorAll('button[role="tab"]'));
        
        for (const btn of buttons) {
          const text = btn.textContent.trim();
          
          if (text === targetLabel || text.includes(targetLabel.trim())) {
            const rect = btn.getBoundingClientRect();
            
            if (rect.width === 0 || rect.height === 0) {
              return { found: false };
            }
            
            return {
              found: true,
              x: Math.round(rect.left + rect.width / 2),
              y: Math.round(rect.top + rect.height / 2),
              text: text
            };
          }
        }
        
        return { found: false };
      }, label);

      if (!buttonInfo.found) {
        console.log(`   🔴 Not found`);
        return false;
      }

      await this.page.mouse.move(buttonInfo.x, buttonInfo.y);
      await this.page.waitForTimeout(100);
      await this.page.mouse.down();
      await this.page.waitForTimeout(50);
      await this.page.mouse.up();
      
      return true;

    } catch (error) {
      console.warn(`   ❌ Error: ${error.message}`);
      return false;
    }
  }

  /**
   * Select Radix UI tab by CSS selector
   */
  async selectRadixTab(selector, displayName) {
    console.log(`   > Selecting ${displayName}...`);
    
    try {
      const buttonInfo = await this.page.evaluate((sel) => {
        const btn = document.querySelector(sel);
        
        if (!btn) {
          return { found: false };
        }
        
        const rect = btn.getBoundingClientRect();
        
        if (rect.width === 0 || rect.height === 0) {
          return { found: false };
        }
        
        return {
          found: true,
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
          text: btn.textContent.trim().substring(0, 50)
        };
      }, selector);

      if (!buttonInfo.found) {
        console.warn(`   ⚠️  Not found`);
        return false;
      }

      await this.page.mouse.move(buttonInfo.x, buttonInfo.y);
      await this.page.waitForTimeout(100);
      await this.page.mouse.down();
      await this.page.waitForTimeout(50);
      await this.page.mouse.up();
      
      await this.page.waitForTimeout(300);
      return true;

    } catch (error) {
      console.warn(`   ❌ Error: ${error.message}`);
      return false;
    }
  }

  /**
   * Select video reference type (Ingredients/Frames)
   */
  async selectVideoReferenceType(referenceType = 'ingredients') {
    const type = (referenceType || 'ingredients').toLowerCase();
    const displayName = type === 'frames' ? 'Frames' : 'Ingredients';
    
    console.log(`   > Selecting VIDEO reference type: ${displayName}...`);
    
    try {
      const found = await this.page.evaluate((targetType) => {
        const buttons = document.querySelectorAll('button[role="tab"]');
        
        for (const btn of buttons) {
          const text = btn.textContent.trim().toLowerCase();
          if (text.includes(targetType)) {
            const rect = btn.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              return {
                found: true,
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2),
                text: btn.textContent.trim()
              };
            }
          }
        }
        return { found: false };
      }, type);

      if (found.found) {
        await this.page.mouse.move(found.x, found.y);
        await this.page.waitForTimeout(100);
        await this.page.mouse.down();
        await this.page.waitForTimeout(50);
        await this.page.mouse.up();
        
        return true;
      } else {
        console.log(`   ℹ️  Reference type selector not found, continuing...`);
        return true;
      }

    } catch (error) {
      console.warn(`   ⚠️  Error: ${error.message}`);
      return true; // Don't fail
    }
  }
}

export default SettingsManager;
