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
    ClipboardHelper.page = page;
    MouseInteractionHelper.page = page;
  }

  /**
   * Enter prompt into textbox using clipboard
   * Steps:
   * 1. Find textbox
   * 2. Focus textbox
   * 3. Clear any existing text
   * 4. Copy prompt to clipboard
   * 5. Paste via Ctrl+V
   * 6. Wait for button to be enabled
   */
  async enterPrompt(prompts, modelName = 'Nano Banana Pro') {
    console.log('📝 ENTERING PROMPT\n');

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
      await this.page.evaluate(() => {
        const box = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
        if (box) box.focus();
      });
      await this.page.waitForTimeout(300);

      // Clear any existing text
      console.log('   🧹 Clearing existing text...');
      await this.page.evaluate(() => {
        const box = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
        if (box) {
          // Clear all children (slate editor structure)
          box.innerHTML = '';
          // Also clear contenteditable content
          box.textContent = '';
        }
      });
      await this.page.waitForTimeout(200);

      // Use ClipboardHelper to paste prompt
      console.log(`   📋 Entering prompt: "${prompt.substring(0, 60)}..."`);
      await ClipboardHelper.enterTextCompletely(prompt);

      console.log('   ✓ Prompt entered');

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
   * Submit prompt via keyboard Enter key (more reliable than button click)
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
      // Focus textbox first
      await this.page.evaluate(() => {
        const box = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
        if (box) box.focus();
      });
      await this.page.waitForTimeout(200);

      // Press Enter to submit
      console.log('   ⌨️  Pressing Enter key...');
      await this.page.keyboard.press('Enter');

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
