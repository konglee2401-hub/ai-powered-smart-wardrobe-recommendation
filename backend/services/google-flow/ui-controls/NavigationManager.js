/**
 * NavigationManager - Handles UI navigation, tabs, and routing
 * 
 * Consolidated from:
 * - selectTab() - Select tab by label/text
 * - selectRadixTab() - Select Radix UI tab by selector
 * - selectVideoFromComponents() - Switch to video mode
 * - switchToVideoTab() - Activate video tab
 * - clickCreate() - Click generate button
 * 
 * Uses: DOMElementFinder, MouseInteractionHelper
 * 
 * @example
 * const manager = new NavigationManager(page);
 * await manager.selectTab('Image');
 * await manager.clickCreate();
 */

import { DOMElementFinder, MouseInteractionHelper } from '../index.js';

class NavigationManager {
  constructor(page, options = {}) {
    this.page = page;
    this.options = options;
    this.debugMode = options.debugMode || false;
    
    // Bind utilities to this page instance
    DOMElementFinder.page = page;
    MouseInteractionHelper.page = page;
  }

  /**
   * Select tab by label or text content
   * Searches for button[role="tab"] matching text
   * Uses mouse movement clicks (Radix UI compatible)
   * 
   * @param {string} label - Tab label to select
   * @returns {boolean} - Success status
   */
  async selectTab(label) {
    console.log(`   > Selecting "${label}" tab...`);
    
    try {
      // Find button by text
      const buttonInfo = await this.page.evaluate((targetLabel) => {
        const buttons = Array.from(document.querySelectorAll('button[role="tab"]'));
        
        for (const btn of buttons) {
          const text = btn.textContent.trim();
          
          if (text === targetLabel || text.includes(targetLabel.trim())) {
            const rect = btn.getBoundingClientRect();
            
            if (rect.width === 0 || rect.height === 0) {
              return { found: false, error: 'Button not visible' };
            }
            
            return {
              found: true,
              x: Math.round(rect.left + rect.width / 2),
              y: Math.round(rect.top + rect.height / 2),
              ariaSelected: btn.getAttribute('aria-selected'),
              text: text
            };
          }
        }
        
        return { found: false, error: `No tab found with label "${targetLabel}"` };
      }, label);

      if (!buttonInfo.found) {
        console.log(`   🔴 Not found: ${buttonInfo.error}`);
        return false;
      }

      console.log(`   ✓ Found: "${buttonInfo.text}"`);
      console.log(`   🖱️  Clicking...`);
      
      // Use mouse movement click
      await this.page.mouse.move(buttonInfo.x, buttonInfo.y);
      await this.page.waitForTimeout(100);
      await this.page.mouse.down();
      await this.page.waitForTimeout(50);
      await this.page.mouse.up();
      
      await this.page.waitForTimeout(300);
      return true;

    } catch (error) {
      console.warn(`   ❌ Error selecting tab: ${error.message}`);
      return false;
    }
  }

  /**
   * Select Radix UI tab by CSS selector
   * More reliable for complex tab systems
   * 
   * @param {string} selector - CSS selector of button
   * @param {string} displayName - Display name for logging
   * @returns {boolean} - Success status
   */
  async selectRadixTab(selector, displayName) {
    console.log(`   > Selecting ${displayName}...`);
    
    try {
      const buttonInfo = await this.page.evaluate((sel) => {
        const btn = document.querySelector(sel);
        
        if (!btn) {
          return { found: false, error: `Button not found with selector: ${sel}` };
        }
        
        const rect = btn.getBoundingClientRect();
        
        if (rect.width === 0 || rect.height === 0) {
          return { found: false, error: 'Button found but not visible' };
        }
        
        return {
          found: true,
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
          text: btn.textContent.trim().substring(0, 50),
          ariaSelected: btn.getAttribute('aria-selected')
        };
      }, selector);

      if (!buttonInfo.found) {
        console.warn(`   ⚠️  ${buttonInfo.error}`);
        return false;
      }

      console.log(`   ✓ Found button: "${buttonInfo.text}"`);
      console.log(`   🖱️  Clicking with mouse movement...`);
      
      await this.page.mouse.move(buttonInfo.x, buttonInfo.y);
      await this.page.waitForTimeout(100);
      await this.page.mouse.down();
      await this.page.waitForTimeout(50);
      await this.page.mouse.up();
      
      await this.page.waitForTimeout(300);
      return true;

    } catch (error) {
      console.warn(`   ❌ Error selecting tab: ${error.message}`);
      return false;
    }
  }

  /**
   * Switch to video mode/tab
   * Looks for "Video" tab in settings
   */
  async switchToVideoTab() {
    console.log('📹 Switching to Video tab...');
    const switched = await this.selectTab('Video');
    if (switched) {
      console.log('✅ Video tab active');
      await this.page.waitForTimeout(1000);
    } else {
      console.log('⚠️  Video tab not found - continuing without explicit switch');
    }
    return switched;
  }

  /**
   * Select video generation mode
   * Looks for "Video Components" or similar button
   */
  async selectVideoFromComponents() {
    console.log('🎬 Selecting video generation mode...');
    
    try {
      const selected = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        
        // Look for "Video" or "Video Components" button
        for (const btn of buttons) {
          const text = btn.textContent.toLowerCase();
          if (text.includes('video') && !btn.disabled) {
            try {
              btn.click();
              return true;
            } catch (e) {
              // Continue searching
            }
          }
        }
        
        return false;
      });

      if (selected) {
        console.log('✅ Video mode selected');
        await this.page.waitForTimeout(800);
      } else {
        console.log('⚠️  Video mode button not found - UI might already be in video mode');
      }
      return selected;

    } catch (error) {
      console.error('❌ Error selecting video mode:', error.message);
      return false;
    }
  }

  /**
   * Click the generate button (primary action button)
   * Handles both button click and Enter key fallback
   */
  async clickCreate() {
    if (this.debugMode) {
      console.log('🔧 [DEBUG] Generate button click skipped (debug mode)\n');
      return false;
    }

    console.log('🎬 CLICKING GENERATE BUTTON\n');

    try {
      console.log('   🔍 Finding Generate button...');
      
      const generateBtnInfo = await this.page.evaluate(() => {
        // Find button with arrow_forward icon
        const buttons = Array.from(document.querySelectorAll('button'));
        let targetBtn = buttons.find(btn => 
          btn.innerHTML.includes('arrow_forward') && 
          !btn.textContent.includes('crop_16_9')
        );
        
        // Look in the right sidebar container as fallback
        if (!targetBtn) {
          const container = document.querySelector('[class*="cYyugN"]');
          if (container) {
            const containerBtns = container.querySelectorAll('button');
            targetBtn = containerBtns[containerBtns.length - 1];
          }
        }
        
        if (!targetBtn) {
          return { found: false, error: 'Generate button not found' };
        }
        
        const rect = targetBtn.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          return { found: false, error: 'Generate button not visible' };
        }
        
        if (targetBtn.disabled) {
          return { found: false, error: 'Generate button is disabled' };
        }
        
        return {
          found: true,
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
          text: targetBtn.textContent.trim().substring(0, 50),
          hasArrow: targetBtn.innerHTML.includes('arrow_forward')
        };
      });

      if (!generateBtnInfo.found) {
        throw new Error(generateBtnInfo.error);
      }

      console.log(`   ✓ Found Generate button\n`);
      console.log(`   Text: "${generateBtnInfo.text}"`);
      console.log(`   Has arrow_forward: ${generateBtnInfo.hasArrow}`);
      console.log(`   Position: (${generateBtnInfo.x}, ${generateBtnInfo.y})\n`);

      console.log('   🖱️  Clicking with mouse movement...');
      await this.page.mouse.move(generateBtnInfo.x, generateBtnInfo.y);
      await this.page.waitForTimeout(150);
      await this.page.mouse.down();
      await this.page.waitForTimeout(100);
      await this.page.mouse.up();

      console.log('   ✓ Generate button clicked\n');
      await this.page.waitForTimeout(1000);

    } catch (error) {
      console.error(`   ⚠️  Button click failed: ${error.message}`);
      console.log('   📝 Falling back to Enter key submission...\n');
      
      try {
        const textboxExists = await this.page.$('.iTYalL[role="textbox"][data-slate-editor="true"]');
        if (!textboxExists) {
          throw new Error('Prompt textbox not found for Enter fallback');
        }

        console.log('   🖱️  Focusing prompt textbox...');
        await this.page.evaluate(() => {
          const textbox = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
          if (textbox) textbox.focus();
        });
        await this.page.waitForTimeout(200);

        console.log('   ⌨️  Pressing Enter key to submit...');
        await this.page.keyboard.press('Enter');

        console.log('   ✓ Generate triggered (via Enter key)\n');
        await this.page.waitForTimeout(1000);

      } catch (fallbackError) {
        console.error(`   ❌ Both button click and Enter fallback failed: ${fallbackError.message}`);
        throw fallbackError;
      }
    }
  }

  /**
   * Navigate back to home/project list
   */
  async goHome() {
    console.log('🏠 Navigating home...');
    try {
      await this.page.goto(this.options.baseUrl || 'https://labs.google/fx/vi/tools/flow', {
        waitUntil: 'networkidle2'
      });
      return true;
    } catch (error) {
      console.error(`Error navigating home: ${error.message}`);
      return false;
    }
  }
}

export default NavigationManager;
