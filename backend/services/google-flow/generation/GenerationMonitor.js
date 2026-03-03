/**
 * GenerationMonitor - Monitors generation progress and detects completion
 * 
 * Consolidated from:
 * - monitorGeneration() - Wait for generation to complete
 * - findGeneratedImage() - Find newly generated image
 * - checkAndRetryFailedItemOnce() - Detect single failed item
 * - detectAndHandleFailures() - Detect and retry all failures
 * 
 * Uses: VirtuosoQueryHelper, MouseInteractionHelper
 * 
 * @example
 * const monitor = new GenerationMonitor(page);
 * const success = await monitor.monitorGeneration(180); // 3 minutes timeout
 */

import { VirtuosoQueryHelper, MouseInteractionHelper } from '../index.js';

class GenerationMonitor {
  constructor(page, options = {}) {
    this.page = page;
    this.options = options;
    this.uploadedImageRefs = options.uploadedImageRefs || {};
    
    // Bind utilities
    VirtuosoQueryHelper.page = page;
    MouseInteractionHelper.page = page;
  }

  /**
   * Monitor generation progress
   * Polls page for generation status up to timeout
   * Returns true when generation completes
   */
  async monitorGeneration(timeoutSeconds = 180) {
    console.log(`⏳ Monitoring generation (max ${timeoutSeconds}s)...`);
    
    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;
    let generationDetected = false;
    let lastStatus = '';
    let statusCheckCount = 0;

    try {
      while (Date.now() - startTime < timeoutMs) {
        statusCheckCount++;
        
        const status = await this.page.evaluate(() => {
          // Look for progress indicators
          const progressEl = document.querySelector('[aria-label*="progress"], [data-testid*="progress"], [aria-label*="Processing"]');
          if (progressEl) return 'generating';
          
          // Look for loading/spinner elements
          const spinner = document.querySelector('[role="status"], .loading, [aria-busy="true"]');
          if (spinner && spinner.textContent.toLowerCase().includes('generat')) return 'generating';
          
          // Check item count increase (more items = something happening)
          const items = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
          if (items.length > 5) return 'generating';
          
          // Look for download button (generation ready)
          const readyEl = document.querySelector('button[aria-label*="Download"]');
          if (readyEl) return 'ready';
          
          return 'unknown';
        });

        // Log status changes
        if (status !== lastStatus) {
          console.log(`   Status: ${status}`);
          lastStatus = status;
          if (status === 'generating') {
            generationDetected = true;
            console.log(`   🎬 Generation detected!`);
          }
        }

        if (status === 'ready') {
          console.log('✅ Generation completed');
          return true;
        }
        
        // Log periodically
        if (statusCheckCount % 10 === 0 && !generationDetected) {
          console.log(`   ⏳ Still waiting for generation to start... (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`);
        }

        await this.page.waitForTimeout(2000);
      }

      if (!generationDetected) {
        console.warn('⚠️  Generation never started - might be stuck or already completed');
      }
      console.warn('⚠️  Generation timeout');
      return false;

    } catch (error) {
      console.error('❌ Error monitoring:', error.message);
      return false;
    }
  }

  /**
   * Find newly generated image by comparing against uploaded refs
   * Generated images have different href+imgSrc than uploaded ones
   */
  async findGeneratedImage() {
    try {
      const generated = await this.page.evaluate((uploadedRefs) => {
        const items = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
        const itemsArray = Array.from(items);
        
        for (let i = 0; i < itemsArray.length; i++) {
          const linkEl = itemsArray[i];
          const href = linkEl.getAttribute('href');
          const imgEl = linkEl.querySelector('img');
          const imgSrc = imgEl ? imgEl.getAttribute('src') : null;
          const textContent = linkEl.textContent.trim();
          
          // Check if this matches any uploaded ref
          let isUploaded = false;
          for (const [key, ref] of Object.entries(uploadedRefs || {})) {
            if (ref.href === href && ref.imgSrc === imgSrc) {
              isUploaded = true;
              break;
            }
          }
          
          // If not uploaded, it's generated
          if (!isUploaded && href && imgSrc) {
            return {
              href,
              imgSrc,
              text: textContent.substring(0, 100),
              position: i
            };
          }
        }
        
        return null;
      }, this.uploadedImageRefs);
      
      return generated;

    } catch (error) {
      console.error(`Error finding generated image: ${error.message}`);
      return null;
    }
  }

  /**
   * Check for and retry a single failed item
   * Called frequently during monitoring
   * Returns true if failure was detected and retry triggered
   */
  async checkAndRetryFailedItemOnce() {
    try {
      const failureInfo = await this.page.evaluate(() => {
        const items = document.querySelectorAll('[data-testid="virtuoso-item-list"] [data-tile-id]');
        
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          
          // Look for warning icon
          const warningIcon = item.querySelector('i.google-symbols');
          const hasWarningText = item.querySelector('[class*="dEfdsQ"], [class*="error"], [role="alert"]');
          
          const isFailed = (warningIcon && warningIcon.textContent.trim() === 'warning') || 
                          (hasWarningText && hasWarningText.textContent.toLowerCase().includes('không thành công'));
          
          if (isFailed) {
            // Find retry button
            const retryBtn = Array.from(item.querySelectorAll('button')).find(btn => {
              const icon = btn.querySelector('i.google-symbols');
              return (icon && (icon.textContent.trim() === 'refresh' || icon.textContent.trim() === 'restart_alt'));
            });

            if (retryBtn) {
              const rect = retryBtn.getBoundingClientRect();
              return {
                found: true,
                position: i,
                message: hasWarningText ? hasWarningText.textContent.trim() : 'Unknown error',
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2)
              };
            }
          }
        }
        
        return { found: false };
      });

      if (!failureInfo.found) {
        return false; // No failures
      }

      // Found a failure - click retry
      console.log(`[FAILURES] ❌ Failed item at position #${failureInfo.position}: "${failureInfo.message}"`);
      console.log(`[FAILURES]    🔄 Retrying in 5 seconds...`);
      
      await this.page.waitForTimeout(5000);
      
      // Click retry button
      await this.page.mouse.move(failureInfo.x, failureInfo.y);
      await this.page.waitForTimeout(150);
      await this.page.mouse.down();
      await this.page.waitForTimeout(100);
      await this.page.mouse.up();
      
      await this.page.waitForTimeout(1000);
      console.log(`[FAILURES]    ✓ Retry triggered`);
      return true;

    } catch (error) {
      console.log(`[FAILURES] ⚠️  Error during retry check: ${error.message}`);
      return false;
    }
  }

  /**
   * Detect and handle all failed items (legacy full version)
   * Retries each failed item up to maxAttempts times
   */
  async detectAndHandleFailures(maxAttempts = 5) {
    console.log('[FAILURES] 🔍 Checking for failed items...');
    
    let retryCount = 0;
    let isCleared = false;

    while (retryCount < maxAttempts && !isCleared) {
      await this.page.waitForTimeout(500);
      
      const failureInfo = await this.page.evaluate(() => {
        const items = document.querySelectorAll('[data-testid="virtuoso-item-list"] [data-tile-id]');
        
        // Check TOP 5 items
        for (let i = 0; i < Math.min(5, items.length); i++) {
          const item = items[i];
          
          const warningIcon = item.querySelector('i.google-symbols:not([style*="display"])');
          
          if (warningIcon && warningIcon.textContent.trim() === 'warning') {
            const errorMsg = item.querySelector('[class*="dEfdsQ"]');
            const retryBtn = Array.from(item.querySelectorAll('button')).find(btn => {
              const icon = btn.querySelector('i.google-symbols');
              return icon && (icon.textContent.includes('refresh') || icon.textContent.includes('Thử lại'));
            });

            if (retryBtn) {
              const rect = retryBtn.getBoundingClientRect();
              return {
                found: true,
                position: i,
                message: errorMsg ? errorMsg.textContent.trim() : 'Unknown error',
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2)
              };
            }
          }
        }
        
        return { found: false };
      });

      if (!failureInfo.found) {
        console.log('[FAILURES] ✅ No failed items detected');
        isCleared = true;
        break;
      }

      retryCount++;
      console.log(`[FAILURES] ❌ Failed item detected at position #${failureInfo.position}`);
      console.log(`[FAILURES]    Error: "${failureInfo.message}"`);
      console.log(`[FAILURES]    Retry attempt ${retryCount}/${maxAttempts}...`);
      
      await this.page.mouse.move(failureInfo.x, failureInfo.y);
      await this.page.waitForTimeout(150);
      await this.page.mouse.down();
      await this.page.waitForTimeout(100);
      await this.page.mouse.up();
      
      console.log(`[FAILURES]    ⏳ Waiting for retry to process...`);
      await this.page.waitForTimeout(3000);
    }

    if (retryCount >= maxAttempts && !isCleared) {
      throw new Error(`[FAILURES] ❌ Item failed after ${maxAttempts} retry attempts. Generation aborted.`);
    }

    console.log('[FAILURES] ✓ All items checked - no failures\n');
  }

  /**
   * Get all generated items from virtuoso list
   */
  async getAllGeneratedItems() {
    try {
      return await VirtuosoQueryHelper.getAllTileData();
    } catch (error) {
      console.error(`Error getting generated items: ${error.message}`);
      return [];
    }
  }

  /**
   * Count total items in gallery
   */
  async getItemCount() {
    try {
      return await VirtuosoQueryHelper.getItemCount();
    } catch (error) {
      console.error(`Error getting item count: ${error.message}`);
      return 0;
    }
  }
}

export default GenerationMonitor;
