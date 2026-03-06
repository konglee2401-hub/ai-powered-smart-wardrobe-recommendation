/**
 * PromptManager - Handles prompt entry, submission, and validation
 * 
 * Consolidated from:
 * - enterPrompt() - Enter text into prompt box with clipboard
 * - submit() - Submit prompt (via Enter key or button click)
 * - checkSendButton() - Check if send button is enabled
 * - waitForSendButtonEnabled() - Wait for send button to become enabled
 * 
 * Uses: ClipboardHelper for reliable text input
 * 
 * @example
 * const manager = new PromptManager(page);
 * await manager.enterPrompt("Generate a beautiful sunset");
 * await manager.submit();
 */

import { ClipboardHelper, MouseInteractionHelper } from '../index.js';

class PromptManager {
  constructor(page, options = {}) {
    this.page = page;
    this.options = options;
    this.debugMode = options.debugMode || false;
    
    // Bind utilities to this page instance
    // ClipboardHelper now accepts page as parameter - no binding needed
    MouseInteractionHelper.page = page;
  }

  /**
   * Enter prompt into textbox using 3-part strategy
   * Steps:
   * 1. Type first 20 characters
   * 2. Paste middle part via clipboard
   * 3. Type last 20 characters
   * 4. Wait for button to be enabled
   * 
   * This approach is more reliable for long prompts
   */
  async enterPrompt(prompts, modelName = 'Nano Banana 2') {
    console.log('📝 ENTERING PROMPT (3-Part Strategy)\n');

    // Support both string and array of prompts (for multi-segment video)
    const promptList = Array.isArray(prompts) ? prompts : [prompts];
    const prompt = promptList[0]; // Use first prompt if array provided

    try {
      // Find the main text input box
      const textbox = await this.page.$('.iTYalL[role="textbox"][data-slate-editor="true"]');
      
      if (!textbox) {
        throw new Error('Prompt textbox not found');
      }

      console.log('   ✓ Prompt textbox found');

      // Focus the textbox
      console.log('   🖱️  Focusing textbox...');
      const textboxSelector = '.iTYalL[role="textbox"][data-slate-editor="true"]';
      await this.page.evaluate(() => {
        const box = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
        if (box) box.focus();
      });
      await this.page.waitForTimeout(300);

      // Clear any existing text
      console.log('   🧹 Clearing existing text...');
      await ClipboardHelper.clearTextbox(this.page, textboxSelector);
      await this.page.waitForTimeout(200);

      // 💫 NEW: 3-Part Strategy for prompt entry
      console.log(`   📋 Entering prompt (${prompt.length} chars): "${prompt.substring(0, 60)}..."`);
      
      // PART 1: Type first 20 characters
      const charCount = 20;
      const part1 = prompt.substring(0, charCount);
      const part3Start = Math.max(charCount, prompt.length - charCount);
      const part2 = prompt.substring(charCount, part3Start);
      const part3 = prompt.substring(part3Start);
      
      console.log(`   📌 Part 1 (type first 20): "${part1}"`);
      console.log(`   📌 Part 2 (paste middle): ${part2.length} chars`);
      console.log(`   📌 Part 3 (type last 20): "${part3}"`);
      
      // Type Part 1
      console.log('   ✍️  Typing first 20 characters...');
      for (const char of part1) {
        await this.page.keyboard.type(char);
        await this.page.waitForTimeout(20);  // Small delay between chars
      }
      console.log('   ✓ Part 1 typed');
      await this.page.waitForTimeout(1000);  // 1s delay after part 1

      // Paste Part 2
      if (part2.length > 0) {
        console.log('   📋 Pasting middle part via clipboard...');
        await ClipboardHelper.copyAndPaste(this.page, part2, textboxSelector);
        console.log('   ✓ Part 2 pasted');
        await this.page.waitForTimeout(1000);  // 1s delay after part 2
      }

      // Type Part 3
      if (part3.length > 0) {
        console.log('   ✍️  Typing last 20 characters...');
        for (const char of part3) {
          await this.page.keyboard.type(char);
          await this.page.waitForTimeout(20);  // Small delay between chars
        }
        console.log('   ✓ Part 3 typed');
        await this.page.waitForTimeout(1000);  // 1s delay after part 3
      }

      // 💫 FIX: After entry, focus + type spaces to trigger Slate editor recognition
      console.log('   📍 Focusing textbox for Slate editor...');
      await this.page.focus(textboxSelector);
      await this.page.waitForTimeout(1000);  // 1s delay after focus

      // Type spaces to trigger validation
      console.log('   ✍️  Adding spaces to trigger Slate editor...');
      for (let i = 0; i < 5; i++) {
        await this.page.keyboard.press('Space');
        await this.page.waitForTimeout(100);
      }

      // Wait for editor to process
      console.log('   ⏳ Waiting 5s for Slate editor to process...');
      await this.page.waitForTimeout(5000);

      console.log('   ✓ Prompt entered with 3-part strategy');

      // Wait for send button to become enabled
      console.log('   ⏳ Waiting for send button to be enabled...');
      const isEnabled = await this.waitForSendButtonEnabled();
      
      if (!isEnabled) {
        console.warn('   ⚠️  Send button may not be enabled, continuing anyway...\n');
      } else {
        console.log('   ✓ Send button ready\n');
      }

      return true;

    } catch (error) {
      console.error(`   ❌ Error entering prompt: ${error.message}`);
      return false;
    }
  }

  /**
   * Submit prompt via multiple methods for reliability:
   * 1. Remove trailing spaces added during entry
   * 2. Try Enter key (most common)
   * 3. Fall back to clicking send button if needed
   * 
   * In debug mode: skip submission
   */
  async submit() {
    if (this.debugMode) {
      console.log('🔧 [DEBUG] Submit skipped (debug mode)\n');
      return false;
    }

    console.log('⏳ Submitting prompt...');

    try {
      const textboxSelector = '.iTYalL[role="textbox"][data-slate-editor="true"]';
      
      // 💫 FIX: Remove trailing spaces we added for Slate editor recognition
      console.log('   🧹 Removing trailing spaces from prompt...');
      await this.page.evaluate((selector) => {
        const box = document.querySelector(selector);
        if (box) {
          // Remove trailing spaces (we added 5)
          let text = box.textContent || '';
          text = text.replace(/\s+$/, '');  // Remove all trailing spaces
          // Trigger input event to update Slate editor
          box.focus();
          // Use keyboard to delete trailing spaces
        }
      }, textboxSelector);
      
      // Delete trailing spaces by pressing Backspace 5 times
      for (let i = 0; i < 5; i++) {
        await this.page.keyboard.press('Backspace');
        await this.page.waitForTimeout(50);
      }
      
      console.log('   ✓ Trailing spaces removed');

      // Focus textbox first
      await this.page.evaluate((selector) => {
        const box = document.querySelector(selector);
        if (box) box.focus();
      }, textboxSelector);
      await this.page.waitForTimeout(200);

      // 💫 FIX: Try Enter key first
      console.log('   ⌨️  Attempting to submit with Enter key...');
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(500);

      // Check if submission worked by checking if prompt is being processed
      const stillInTextbox = await this.page.evaluate((selector) => {
        const box = document.querySelector(selector);
        return box && box.textContent.trim().length > 0;
      }, textboxSelector);

      if (stillInTextbox) {
        // Enter key didn't work, try clicking send button
        console.log('   ⚠️  Enter key may not have worked, trying send button click...');
        const sendClicked = await this.page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          for (const btn of buttons) {
            const icon = btn.querySelector('i.google-symbols');
            // Look for send/submit button (arrow_forward or send icon)
            if (icon && (icon.textContent.includes('arrow_forward') || icon.textContent.includes('send'))) {
              if (!btn.disabled) {
                btn.click();
                return true;
              }
            }
          }
          return false;
        });

        if (!sendClicked) {
          console.log('   ⚠️  Could not find or click send button');
          // Try one more time with Ctrl+Enter
          console.log('   🎯 Trying Ctrl+Enter as final attempt...');
          await this.page.keyboard.down('Control');
          await this.page.keyboard.press('Enter');
          await this.page.keyboard.up('Control');
        }
      }

      console.log('✅ Prompt submitted\n');
      await this.page.waitForTimeout(1000);
      return true;

    } catch (error) {
      console.error(`   ❌ Error submitting: ${error.message}\n`);
      return false;
    }
  }

  /**
   * Check if send button is currently enabled
   * Returns boolean indicating if button can be clicked
   */
  async checkSendButton() {
    try {
      return await this.page.evaluate(() => {
        // Find send button (arrow_forward icon in parent)
        const buttons = Array.from(document.querySelectorAll('button'));
        
        for (const btn of buttons) {
          const icon = btn.querySelector('i.google-symbols');
          if (icon && icon.textContent.includes('arrow_forward')) {
            return !btn.disabled;
          }
        }
        
        return false;
      });
    } catch (error) {
      console.error(`Error checking send button: ${error.message}`);
      return false;
    }
  }

  /**
   * Wait for send button to be enabled
   * Polls button state with timeout
   * Default timeout: 10 seconds
   */
  async waitForSendButtonEnabled(timeoutSeconds = 10) {
    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;

    while (Date.now() - startTime < timeoutMs) {
      const isEnabled = await this.checkSendButton();
      
      if (isEnabled) {
        return true;
      }

      await this.page.waitForTimeout(500);
    }

    return false;
  }

  /**
   * Get current prompt text from textbox
   */
  async getPromptText() {
    try {
      return await this.page.evaluate(() => {
        const box = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
        return box ? box.textContent : '';
      });
    } catch (error) {
      console.error(`Error getting prompt text: ${error.message}`);
      return '';
    }
  }

  /**
   * Focus the prompt textbox
   */
  async focusPromptBox() {
    try {
      await this.page.evaluate(() => {
        const box = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
        if (box) box.focus();
      });
      return true;
    } catch (error) {
      console.error(`Error focusing prompt box: ${error.message}`);
      return false;
    }
  }

  /**
   * Clear prompt textbox
   */
  async clearPrompt() {
    try {
      await this.page.evaluate(() => {
        const box = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
        if (box) {
          box.innerHTML = '';
          box.textContent = '';
        }
      });
      return true;
    } catch (error) {
      console.error(`Error clearing prompt: ${error.message}`);
      return false;
    }
  }
}

export default PromptManager;
