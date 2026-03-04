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
   * @param {object} page - Puppeteer page object
   * @param {string} text - Text to copy
   * @param {number} timeoutMs - Verification timeout
   * @returns {boolean} - Success status
   */
  static async copyToClipboard(page, text, timeoutMs = 1000) {
    console.log(`[CLIPBOARD] 📋 Copying ${text.length} chars to clipboard...`);
    
    try {
      // Clear clipboard first
      await page.evaluate(() => {
        return navigator.clipboard.writeText('').catch(() => {});
      });
      
      await page.waitForTimeout(100);
      
      // Write text
      const success = await page.evaluate((content) => {
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
      
      await page.waitForTimeout(200);
      return success;
    } catch (error) {
      console.error(`[CLIPBOARD] ❌ Copy failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Copy image data to clipboard
   * @param {object} page - Puppeteer page object
   * @param {string|Buffer} imagePathOrBuffer - Path to image file OR Buffer containing image data
   * @param {number} cooldownMs - Wait time after paste
   * @returns {boolean}
   */
  static async copyImageToClipboard(page, imagePathOrBuffer, cooldownMs = 500) {
    const fs = (await import('fs')).default;
    const path = (await import('path')).default;
    
    // Handle both file path and buffer
    let imageData;
    if (typeof imagePathOrBuffer === 'string') {
      console.log(`[CLIPBOARD] 🖼️  Copying image: ${path.basename(imagePathOrBuffer)}`);
      imageData = fs.readFileSync(imagePathOrBuffer);
    } else {
      console.log(`[CLIPBOARD] 🖼️  Copying image from buffer (${imagePathOrBuffer.length} bytes)`);
      imageData = imagePathOrBuffer;
    }
    
    try {
      const imageBase64 = Buffer.from(imageData).toString('base64');

      const success = await page.evaluate((base64Str) => {
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
      
      await page.waitForTimeout(cooldownMs);
      return success;
    } catch (error) {
      console.error(`[CLIPBOARD] ❌ Image copy failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Paste from clipboard to textbox (consolidated pattern)
   * @param {object} page - Puppeteer page object
   * @param {string} selector - Textbox selector
   * @param {number} waitAfterPaste - Wait time after paste
   * @returns {boolean}
   */
  static async pasteFromClipboard(page, selector, waitAfterPaste = 1000) {
    console.log('[CLIPBOARD] ✏️  Pasting from clipboard...');
    
    try {
      // Focus textbox
      await page.focus(selector);
      await page.waitForTimeout(100);
      
      // Paste with Ctrl+V
      await page.keyboard.down('Control');
      await page.keyboard.press('v');
      await page.keyboard.up('Control');
      
      console.log('[CLIPBOARD] ✅ Paste complete');
      await page.waitForTimeout(waitAfterPaste);
      return true;
    } catch (error) {
      console.error(`[CLIPBOARD] ❌ Paste failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Complete flow: Copy text → Focus → Paste to textbox
   * @param {object} page - Puppeteer page object
   * @param {string} text - Text to paste
   * @param {string} textboxSelector - Textbox CSS selector
   * @returns {boolean} - Success
   */
  static async copyAndPaste(page, text, textboxSelector) {
    const copySuccess = await this.copyToClipboard(page, text, 200);
    if (!copySuccess) return false;
    
    return this.pasteFromClipboard(page, textboxSelector, 1000);
  }

  /**
   * Clear textbox content using Ctrl+A + Backspace
   * Safe for Slate editor
   * @param {object} page - Puppeteer page object
   * @param {string} selector - Textbox selector
   * @returns {boolean}
   */
  static async clearTextbox(page, selector) {
    try {
      await page.focus(selector);
      await page.waitForTimeout(100);
      
      await page.keyboard.down('Control');
      await page.keyboard.press('a');
      await page.keyboard.up('Control');
      await page.waitForTimeout(100);
      
      await page.keyboard.press('Backspace');
      await page.waitForTimeout(300);
      
      return true;
    } catch (error) {
      console.error(`[CLIPBOARD] ❌ Clear failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Complete flow: Clear → Copy → Paste
   * @param {object} page - Puppeteer page object
   * @param {string} text - Text to enter
   * @param {string} textboxSelector - Textbox selector
   * @returns {boolean}
   */
  static async enterTextCompletely(page, text, textboxSelector) {
    // Clear
    if (!await this.clearTextbox(page, textboxSelector)) {
      return false;
    }

    // Copy and paste
    return this.copyAndPaste(page, text, textboxSelector);
  }
}

export default ClipboardHelper;
