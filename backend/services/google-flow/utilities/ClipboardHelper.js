/**
 * ClipboardHelper.js
 * 
 * Consolidated clipboard + paste operations for prompt/text input
 * CONSOLIDATES: clipboard operations from enterPrompt, pasteImageToTextbox, handleGenerationFailureRetry
 * 
 * Flow: Clear clipboard → Write/paste data → Verify completion → Handle errors
 * Used by: Prompt manager, upload manager, retry handlers
 */

export class ClipboardHelper {
  /**
   * Copy text to clipboard with error handling
   * @param {string} text - Text to copy
   * @param {number} timeoutMs - Verification timeout
   * @returns {boolean} - Success status
   */
  static async copyToClipboard(text, timeoutMs = 1000) {
    console.log(`[CLIPBOARD] 📋 Copying ${text.length} chars to clipboard...`);
    
    try {
      // Clear clipboard first
      await this.page.evaluate(() => {
        return navigator.clipboard.writeText('').catch(() => {});
      });
      
      await this.page.waitForTimeout(100);
      
      // Write text
      const success = await this.page.evaluate((content) => {
        return navigator.clipboard.writeText(content)
          .then(() => true)
          .catch((e) => {
            console.error(`Clipboard write failed: ${e.message}`);
            return false;
          });
      }, text);
      
      if (!success) {
        console.warn('[CLIPBOARD] ⚠️  Clipboard write may have failed');
      }
      
      await this.page.waitForTimeout(200);
      return success;
    } catch (error) {
      console.error(`[CLIPBOARD] ❌ Copy failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Paste image data to clipboard
   * @param {string} imagePath - Path to image file
   * @param {number} cooldownMs - Wait time after paste
   * @returns {boolean}
   */
  static async copyImageToClipboard(imagePath, cooldownMs = 500) {
    const fs = (await import('fs')).default;
    const path = (await import('path')).default;
    
    console.log(`[CLIPBOARD] 🖼️  Copying image: ${path.basename(imagePath)}`);
    
    try {
      const imageData = fs.readFileSync(imagePath);
      const imageBase64 = Buffer.from(imageData).toString('base64');

      const success = await this.page.evaluate((base64Str) => {
        return fetch(`data:image/png;base64,${base64Str}`)
          .then(res => res.blob())
          .then(blob => navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]))
          .then(() => true)
          .catch((e) => {
            console.error(`Image copy failed: ${e.message}`);
            return false;
          });
      }, imageBase64);
      
      if (!success) {
        console.warn('[CLIPBOARD] ⚠️  Image copy may have failed');
      }
      
      await this.page.waitForTimeout(cooldownMs);
      return success;
    } catch (error) {
      console.error(`[CLIPBOARD] ❌ Image copy failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Paste from clipboard to textbox (consolidated pattern)
   * @param {string} selector - Textbox selector
   * @param {number} waitAfterPaste - Wait time after paste
   * @returns {boolean}
   */
  static async pasteFromClipboard(selector, waitAfterPaste = 1000) {
    console.log('[CLIPBOARD] ✏️  Pasting from clipboard...');
    
    try {
      // Focus textbox
      await this.page.focus(selector);
      await this.page.waitForTimeout(100);
      
      // Paste with Ctrl+V
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('v');
      await this.page.keyboard.up('Control');
      
      console.log('[CLIPBOARD] ✅ Paste complete');
      await this.page.waitForTimeout(waitAfterPaste);
      return true;
    } catch (error) {
      console.error(`[CLIPBOARD] ❌ Paste failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Complete flow: Copy text → Focus → Paste to textbox
   * @param {string} text - Text to paste
   * @param {string} textboxSelector - Textbox CSS selector
   * @returns {boolean} - Success
   */
  static async copyAndPaste(text, textboxSelector) {
    const copySuccess = await this.copyToClipboard(text, 200);
    if (!copySuccess) return false;
    
    return this.pasteFromClipboard(textboxSelector, 1000);
  }

  /**
   * Clear textbox content using Ctrl+A + Backspace
   * Safe for Slate editor
   * @param {string} selector - Textbox selector
   * @returns {boolean}
   */
  static async clearTextbox(selector) {
    try {
      await this.page.focus(selector);
      await this.page.waitForTimeout(100);
      
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('a');
      await this.page.keyboard.up('Control');
      await this.page.waitForTimeout(100);
      
      await this.page.keyboard.press('Backspace');
      await this.page.waitForTimeout(300);
      
      return true;
    } catch (error) {
      console.error(`[CLIPBOARD] ❌ Clear failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Complete flow: Clear → Copy → Paste
   * @param {string} text - Text to enter
   * @param {string} textboxSelector - Textbox selector
   * @returns {boolean}
   */
  static async enterTextCompletely(text, textboxSelector) {
    // Clear
    if (!await this.clearTextbox(textboxSelector)) {
      return false;
    }

    // Copy and paste
    return this.copyAndPaste(text, textboxSelector);
  }
}

export default ClipboardHelper;
