/**
 * ErrorRecoveryManager - Handles generation failures and retry logic
 * 
 * Consolidated from:
 * - handleGenerationFailureRetry() - Complete failure recovery flow
 * - detectAndHandleFailures() - Detect and retry failures
 * - checkAndRetryFailedItemOnce() - Single failure retry
 * 
 * Recovery steps:
 * 1. Wait for UI stabilization
 * 2. Restore uploaded images to prompt
 * 3. Clear and re-enter original prompt
 * 4. Re-submit for generation
 * 
 * Uses: ClipboardHelper, MouseInteractionHelper, VirtuosoQueryHelper
 * 
 * @example
 * const recovery = new ErrorRecoveryManager(page);
 * await recovery.handleGenerationFailureRetry(originalPrompt, uploadedImages);
 */

import { ClipboardHelper, MouseInteractionHelper, VirtuosoQueryHelper } from '../index.js';

class ErrorRecoveryManager {
  constructor(page, options = {}) {
    this.page = page;
    this.options = options;
    this.uploadedImageRefs = options.uploadedImageRefs || {};
    this.lastPrompt = null;
    
    // Bind utilities
    // ClipboardHelper and VirtuosoQueryHelper now accept page as parameter - no binding needed
    MouseInteractionHelper.page = page;
  }

  /**
   * Handle complete generation failure recovery
   * 
   * Procedure:
   * 1. Wait 5s for UI to stabilize
   * 2. Re-add uploaded images to prompt
   * 3. Paste original prompt again
   * 4. Re-submit
   * 
   * @param {string} prompt - Original prompt to retry
   * @param {Object} uploadedRefs - Uploaded image references
   * @returns {boolean} - Success status
   */
  async handleGenerationFailureRetry(prompt, uploadedRefs = {}) {
    console.log('\n🔄 HANDLING GENERATION FAILURE - RETRYING...\n');
    
    if (!prompt || !uploadedRefs) {
      console.warn('⚠️  Missing prompt or image references, cannot retry');
      return false;
    }

    try {
      // Step 1: Wait for UI stabilization
      console.log('   ⏳ [1] Waiting 5 seconds for UI to stabilize...');
      await this.page.waitForTimeout(5000);
      console.log('   ✓ Stabilized\n');
      
      // Step 2: Re-add uploaded images
      const imageKeys = Object.keys(uploadedRefs);
      const maxRetries = 5;
      
      for (let keyIdx = 0; keyIdx < imageKeys.length; keyIdx++) {
        const key = imageKeys[keyIdx];
        const ref = uploadedRefs[key];
        
        console.log(`   🖱️  [2.${keyIdx + 1}] Re-adding "${key}" image...`);
        
        let addSuccess = false;
        let attemptCount = 0;
        
        while (!addSuccess && attemptCount < maxRetries) {
          attemptCount++;
          
          if (attemptCount > 1) {
            console.log(`   🔄 Attempt ${attemptCount}/${maxRetries}...`);
          }
          
          try {
            // Query current position
            console.log(`   🔍 Querying position of "${key}" image...`);
            const linkData = await this.page.evaluate((targetHref) => {
              const link = document.querySelector(`a[href="${targetHref}"]`);
              if (!link) return { found: false };
              
              const rect = link.getBoundingClientRect();
              return {
                found: true,
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2)
              };
            }, ref.href);
            
            if (!linkData.found) {
              console.log(`   ⚠️  "${key}" image not found${attemptCount < maxRetries ? ', retrying...' : ''}`);
              
              if (attemptCount < maxRetries) {
                await this.page.waitForTimeout(1000);
                continue;
              } else {
                break;
              }
            }
            
            console.log(`   ✓ Found at (${linkData.x}, ${linkData.y})`);
            
            // Right-click on image
            console.log(`   🖱️  Right-clicking...`);
            await this.page.mouse.move(linkData.x, linkData.y);
            await this.page.waitForTimeout(300);
            await this.page.mouse.down({ button: 'right' });
            await this.page.waitForTimeout(50);
            await this.page.mouse.up({ button: 'right' });
            await this.page.waitForTimeout(800);
            
            // Find and click "Thêm vào câu lệnh" button
            const addBtn = await this.page.evaluate(() => {
              const buttons = document.querySelectorAll('button[role="menuitem"]');
              for (const btn of buttons) {
                const text = btn.textContent.trim();
                if (text.includes('Thêm vào')) {
                  return {
                    x: Math.floor(btn.getBoundingClientRect().left + btn.getBoundingClientRect().width / 2),
                    y: Math.floor(btn.getBoundingClientRect().top + btn.getBoundingClientRect().height / 2)
                  };
                }
              }
              return null;
            });
            
            if (!addBtn) {
              console.log(`   ⚠️  "Thêm vào" button not found${attemptCount < maxRetries ? ', retrying...' : ''}`);
              
              await this.page.mouse.move(100, 100);
              await this.page.waitForTimeout(300);
              
              if (attemptCount < maxRetries) {
                await this.page.waitForTimeout(1000);
                continue;
              } else {
                break;
              }
            }
            
            // Click "Thêm vào" button
            console.log(`   ✓ Clicking "Thêm vào câu lệnh"...`);
            await this.page.mouse.move(addBtn.x, addBtn.y);
            await this.page.waitForTimeout(200);
            await this.page.mouse.down();
            await this.page.waitForTimeout(100);
            await this.page.mouse.up();
            await this.page.waitForTimeout(1200);
            
            console.log(`   ✓ "${key}" image added\n`);
            addSuccess = true;
            
            // Move mouse away
            await this.page.mouse.move(100, 100);
            await this.page.waitForTimeout(300);
            
          } catch (e) {
            console.log(`   ❌ Error on attempt ${attemptCount}: ${e.message}${attemptCount < maxRetries ? ', retrying...' : ''}`);
            
            await this.page.mouse.move(100, 100);
            await this.page.waitForTimeout(300);
            
            if (attemptCount < maxRetries) {
              await this.page.waitForTimeout(1500);
            }
          }
        }
        
        if (!addSuccess) {
          console.warn(`   ⚠️  Could not add "${key}" after ${maxRetries} attempts\n`);
        }
      }
      
      // Step 3: Re-paste original prompt
      console.log(`   📋 [3] Re-entering original prompt...\n`);
      
      // Focus textbox
      await this.page.evaluate(() => {
        const textbox = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
        if (textbox) textbox.focus();
      });
      await this.page.waitForTimeout(300);
      
      // Copy prompt to clipboard
      await this.page.evaluate((promptText) => {
        navigator.clipboard.writeText(promptText).catch(() => {});
      }, prompt);
      await this.page.waitForTimeout(200);
      
      // Paste with Ctrl+V
      await this.page.keyboard.down('Control');
      await this.page.waitForTimeout(50);
      await this.page.keyboard.press('v');
      await this.page.waitForTimeout(50);
      await this.page.keyboard.up('Control');
      
      console.log(`   ✓ Prompt re-pasted\n`);
      console.log('   ⏳ [4] Waiting 5s for prompt to process...');
      await this.page.waitForTimeout(5000);
      console.log('   ✓ Ready\n');
      
      // Step 4: Click submit button
      console.log(`   🖱️  [5] Clicking submit button...`);
      const submitClicked = await this.page.evaluate(() => {
        const textbox = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
        if (!textbox) return { found: false };
        
        let container = textbox.parentElement;
        for (let i = 0; i < 3; i++) {
          if (container.parentElement) container = container.parentElement;
        }
        
        const buttons = container.querySelectorAll('button');
        for (const btn of buttons) {
          const icon = btn.querySelector('i.google-symbols');
          if (icon && icon.textContent.includes('arrow_forward')) {
            if (!btn.disabled) {
              const rect = btn.getBoundingClientRect();
              return {
                found: true,
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2)
              };
            }
          }
        }
        return { found: false };
      });
      
      if (submitClicked.found) {
        await this.page.mouse.move(submitClicked.x, submitClicked.y);
        await this.page.waitForTimeout(100);
        await this.page.mouse.down();
        await this.page.waitForTimeout(50);
        await this.page.mouse.up();
        console.log(`   ✓ Submitted\n`);
        
        return true;
      } else {
        console.warn('   ⚠️  Submit button not found');
        return false;
      }
      
    } catch (error) {
      console.error(`\n❌ Retry failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Set uploaded image references for retry
   */
  setUploadedImageRefs(refs) {
    this.uploadedImageRefs = refs;
  }

  /**
   * Store the last prompt for retry
   */
  setLastPrompt(prompt) {
    this.lastPrompt = prompt;
  }

  /**
   * Get the last stored prompt
   */
  getLastPrompt() {
    return this.lastPrompt;
  }

  /**
   * Retry generation via clicking refresh/undo buttons (lighter approach)
   * Tries up to 3 times with context menu retry options
   * 
   * Flow:
   * 1. Right-click on failed item → look for "Thử lại" option → click it
   * 2. If not found, look for "Sử dụng lại câu lệnh" button (undo)
   * 3. If found, click it and submit again
   * 
   * @param {string} targetHref - href of the failed generation item
   * @param {number} maxRetries - number of retry attempts
   * @returns {boolean} - success status
   */
  async retryGenerationViaClickButtons(targetHref, maxRetries = 3) {
    console.log(`\n[RETRY-BUTTONS] 🔄 Attempting retry via click buttons (max ${maxRetries} attempts)...\n`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[RETRY-BUTTONS] Attempt ${attempt}/${maxRetries}`);
        
        // Find the failed item position
        const itemResult = await this.page.evaluate((href) => {
          const link = document.querySelector(`a[href="${href}"]`);
          if (!link) return { found: false };
          const rect = link.getBoundingClientRect();
          return {
            found: true,
            x: Math.round(rect.left + rect.width / 2),
            y: Math.round(rect.top + rect.height / 2)
          };
        }, targetHref);

        if (!itemResult.found) {
          console.log(`[RETRY-BUTTONS] ⚠️  Item link not found`);
          await this.page.waitForTimeout(5000);
          continue;
        }

        // Right-click on the failed item
        console.log(`[RETRY-BUTTONS] 🖱️  Right-clicking at (${itemResult.x}, ${itemResult.y})`);
        await this.page.mouse.move(itemResult.x, itemResult.y);
        await this.page.waitForTimeout(300);
        await this.page.mouse.down({ button: 'right' });
        await this.page.waitForTimeout(50);
        await this.page.mouse.up({ button: 'right' });
        await this.page.waitForTimeout(1000);

        // Look for retry option in context menu
        const menuOption = await this.page.evaluate(() => {
          const items = document.querySelectorAll('[role="menuitem"]');
          for (const item of items) {
            const text = item.textContent || '';
            const lowerText = text.toLowerCase();
            
            // Look for retry/reuse/undo options
            if (text.includes('Thử lại') || text.includes('Sử dụng lại') ||
                text.includes('hoàn tác') || text.includes('khôi phục') ||
                lowerText.includes('retry') || lowerText.includes('undo') ||
                lowerText.includes('restore')) {
              const rect = item.getBoundingClientRect();
              return {
                found: true,
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2),
                text: text.substring(0, 50)
              };
            }
          }
          return { found: false };
        });

        if (menuOption.found) {
          console.log(`[RETRY-BUTTONS] ✓ Found option: "${menuOption.text}"`);
          
          // Click the retry option
          await this.page.mouse.move(menuOption.x, menuOption.y);
          await this.page.waitForTimeout(200);
          await this.page.mouse.down();
          await this.page.waitForTimeout(100);
          await this.page.mouse.up();
          await this.page.waitForTimeout(1500);

          // Check if it's "Sử dụng lại câu lệnh" (reuse) - need to submit
          if (menuOption.text.includes('Sử dụng lại')) {
            console.log(`[RETRY-BUTTONS] 📤 Reuse detected, clicking submit button...`);
            
            const submitBtn = await this.page.evaluate(() => {
              const textbox = document.querySelector('.iTYalL[role="textbox"][data-slate-editor="true"]');
              if (!textbox) return { found: false };
              let container = textbox;
              for (let i = 0; i < 5; i++) {
                container = container.parentElement;
              }
              const buttons = container.querySelectorAll('button');
              for (const btn of buttons) {
                const icon = btn.querySelector('i.google-symbols');
                if (icon && icon.textContent.includes('arrow_forward') && !btn.disabled) {
                  const rect = btn.getBoundingClientRect();
                  return {
                    found: true,
                    x: Math.round(rect.left + rect.width / 2),
                    y: Math.round(rect.top + rect.height / 2)
                  };
                }
              }
              return { found: false };
            });

            if (submitBtn.found) {
              await this.page.mouse.move(submitBtn.x, submitBtn.y);
              await this.page.waitForTimeout(100);
              await this.page.mouse.down();
              await this.page.waitForTimeout(50);
              await this.page.mouse.up();
              console.log(`[RETRY-BUTTONS] ✓ Submit clicked`);
            }
          }

          console.log(`[RETRY-BUTTONS] ✅ Retry triggered on attempt ${attempt}\n`);
          return true;
        } else {
          console.log(`[RETRY-BUTTONS] ⚠️  No menu option found`);
        }

        // Wait before next attempt
        await this.page.waitForTimeout(5000);

      } catch (err) {
        console.error(`[RETRY-BUTTONS] ❌ Error on attempt ${attempt}: ${err.message}`);
        await this.page.waitForTimeout(5000);
      }
    }

    console.log(`[RETRY-BUTTONS] ❌ Failed after ${maxRetries} attempts\n`);
    return false;
  }

  /**
   * Determine if error is retryable
   */
  isRetryableError(errorMessage) {
    const retryablePatterns = [
      'không thành công',
      'failed',
      'error',
      'timeout',
      'generation failed',
      'tạo không thành công'
    ];

    return retryablePatterns.some(pattern =>
      errorMessage.toLowerCase().includes(pattern)
    );
  }
}

export default ErrorRecoveryManager;
