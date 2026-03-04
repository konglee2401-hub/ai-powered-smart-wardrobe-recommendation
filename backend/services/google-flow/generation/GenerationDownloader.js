/**
 * GenerationDownloader - Downloads generated images and videos
 * 
 * Consolidated from:
 * - downloadItemViaContextMenu() - Right-click menu download
 * - downloadVideo() - Download video generation
 * - selectQualityOption() - Select download quality
 * 
 * Features:
 * - Detects resolution upgrade failures and fallbacks to lower quality
 * - Monitors download timeout (20-30s) and retries with fallback resolution
 * - Closes browser on final download failure
 * 
 * Uses: MouseInteractionHelper, file operations
 * 
 * @example
 * const downloader = new GenerationDownloader(page, options);
 * const filepath = await downloader.downloadItemViaContextMenu(href);
 */

import fs from 'fs';
import path from 'path';
import { MouseInteractionHelper } from '../index.js';

class GenerationDownloader {
  constructor(page, options = {}) {
    this.page = page;
    
    // Assign properties with explicit defaults, spread options FIRST so explicit assignments override
    const baseOptions = {
      ...options
    };
    
    this.options = {
      outputDir: baseOptions.outputDir || './downloads',
      modelName: baseOptions.modelName || 'Nano Banana Pro',
      mediaType: baseOptions.mediaType || 'image',
      userDownloadsDir: baseOptions.userDownloadsDir || path.join(process.env.USERPROFILE || '', 'Downloads')
    };
    
    // Handle downloadTimeoutSeconds carefully - ensure it's always a valid positive number
    let timeoutValue = baseOptions.downloadTimeoutSeconds;
    if (typeof timeoutValue === 'number' && timeoutValue > 0 && !isNaN(timeoutValue)) {
      this.options.downloadTimeoutSeconds = timeoutValue;
    } else {
      this.options.downloadTimeoutSeconds = 30;  // 30 seconds default (20-30s range)
    }
    
    console.log(`[DOWNLOADER-INIT] Timeout set to: ${this.options.downloadTimeoutSeconds}s`);
    
    // Bind utilities
    MouseInteractionHelper.page = page;
  }

  /**
   * Detect if a resolution upgrade error dialog has appeared
   * Looks for dialog/modal with text like "cannot upgrade to" or similar
   * 
   * @returns {object} - { detected: boolean, message: string|null }
   */
  async detectResolutionErrorDialog() {
    try {
      const dialogInfo = await this.page.evaluate(() => {
        // Check for various dialog/modal selectors
        const dialogs = document.querySelectorAll('dialog, [role="dialog"], [role="alertdialog"], .modal, [class*="modal"], [class*="dialog"]');
        
        for (const dialog of dialogs) {
          const text = dialog.textContent || '';
          const lowerText = text.toLowerCase();
          
          // Check for resolution-related error messages
          if (lowerText.includes('cannot') && lowerText.includes('resolution') ||
              lowerText.includes('upgrade') && lowerText.includes('fail') ||
              lowerText.includes('cannot upgrade') ||
              lowerText.includes('quality not available') ||
              lowerText.includes('không thể nâng cấp')) {
            return {
              detected: true,
              message: text.trim().substring(0, 200),
              visible: dialog.offsetHeight > 0 && dialog.offsetWidth > 0
            };
          }
        }
        
        return { detected: false, message: null };
      });
      
      return dialogInfo;
    } catch (error) {
      console.log(`   ⚠️  Error detecting dialog: ${error.message}`);
      return { detected: false };
    }
  }

  /**
   * Close any visible error dialog/modal
   * 
   * @returns {boolean} - true if dialog was closed
   */
  async closeErrorDialog() {
    try {
      const closed = await this.page.evaluate(() => {
        // Try various close methods
        const dialogs = document.querySelectorAll('dialog, [role="dialog"], [role="alertdialog"], .modal, [class*="modal"]');
        
        for (const dialog of dialogs) {
          // Try close button
          const closeBtn = dialog.querySelector('button[aria-label*="close" i], button[class*="close" i], [aria-label*="đóng" i]');
          if (closeBtn) {
            closeBtn.click();
            return true;
          }
          
          // Try ESC key on dialog
          if (dialog.tagName === 'DIALOG') {
            dialog.close();
            return true;
          }
          
          // Try clicking overlay outside dialog
          const overlay = dialog.parentElement;
          if (overlay && (overlay.className.includes('overlay') || overlay.className.includes('backdrop'))) {
            overlay.click();
            return true;
          }
        }
        
        // Try global ESC key
        const event = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' });
        document.dispatchEvent(event);
        return false;
      });
      
      if (closed) {
        console.log('   ✓ Error dialog closed');
        await this.page.waitForTimeout(1000);
      }
      return closed;
    } catch (error) {
      console.log(`   ⚠️  Error closing dialog: ${error.message}`);
      return false;
    }
  }

  /**
   * Download generated item via context menu (right-click)
   * 
   * Steps:
   * 1. Find item by href
   * 2. Right-click to open context menu
   * 3. Click "Tải xuống" (Download)
   * 4. Select quality option with error detection
   * 5. Wait for file with timeout fallback
   * 6. On timeout/error, retry with lower quality
   * 7. On final failure, close browser
   * 
   * @param {string} newHref - Item href to download
   * @returns {string|null} - Downloaded file path or null
   */
  async downloadItemViaContextMenu(newHref) {
    const mediaType = this.options.mediaType === 'video' ? 'video' : 'image';
    const mediaExt = this.options.mediaType === 'video' ? '.mp4' : '.jpg';
    
    // Determine quality preferences
    let qualityOptions = [];
    if (this.options.mediaType === 'image' && this.options.modelName === 'Nano Banana Pro') {
      qualityOptions = ['2k', '2K', '1k', '1K'];
      console.log(`   ℹ️  Image Model: ${this.options.modelName} (trying 2K first)`);
    } else if (this.options.mediaType === 'image') {
      qualityOptions = ['2k', '2K', '1k', '1K'];  // 💫 Default: Try 2K first, then 1K
      console.log(`   ℹ️  Image (trying 2K first)`);
    } else {
      qualityOptions = ['1080p', '1080P', '720p', '720P'];
      console.log(`   ℹ️  Video (trying 1080P first)`);
    }
    
    console.log(`⬇️  DOWNLOADING ${mediaType.toUpperCase()} VIA CONTEXT MENU\n`);

    try {
      // Find item by href
      const linkData = await this.page.evaluate((targetHref) => {
        const allLinks = Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]'));
        
        for (const link of allLinks) {
          const href = link.getAttribute('href');
          if (href === targetHref) {
            const rect = link.getBoundingClientRect();
            return {
              found: true,
              x: Math.round(rect.left + rect.width / 2),
              y: Math.round(rect.top + rect.height / 2),
              linkCount: allLinks.length
            };
          }
        }
        
        return { found: false, linkCount: allLinks.length };
      }, newHref);

      if (!linkData.found) {
        console.warn(`   ⚠️  Item not found: ${newHref.substring(0, 60)}...`);
        return null;
      }

      console.log(`   ✓ Found ${mediaType} (${linkData.linkCount} total items)`);

      // Right-click on item
      console.log(`   🖱️  Right-clicking...`);
      await this.page.mouse.move(linkData.x, linkData.y);
      await this.page.waitForTimeout(100);
      await this.page.mouse.down({ button: 'right' });
      await this.page.waitForTimeout(50);
      await this.page.mouse.up({ button: 'right' });
      
      console.log('   ⏳ Waiting for context menu...');
      await this.page.waitForTimeout(2000);

      // Click "Tải xuống" (Download)
      console.log('   🖱️  Clicking "Tải xuống"...');
      const downloadClicked = await this.page.evaluate(() => {
        const items = document.querySelectorAll('[role="menuitem"]');
        for (const item of items) {
          const text = item.textContent.toLowerCase();
          const hasDownloadIcon = item.innerHTML.includes('download');
          
          if ((text.includes('tải') || text.includes('download')) && hasDownloadIcon) {
            try {
              item.click();
              return true;
            } catch (e) {
              console.error(`Failed to click download: ${e.message}`);
            }
          }
        }
        return false;
      });

      if (!downloadClicked) {
        console.warn('   ⚠️  Failed to click download button');
        return null;
      }

      // Wait for submenu
      console.log('   ⏳ Waiting for submenu...');
      await this.page.waitForTimeout(2000);

      // Verify submenu is ready
      const submenuReady = await this.page.evaluate(() => {
        const submenu = document.querySelector('[data-radix-menu-content][aria-labelledby]');
        if (!submenu) return false;
        const buttons = submenu.querySelectorAll('button[role="menuitem"]');
        return buttons.length > 0;
      });

      if (!submenuReady) {
        console.warn('   ⚠️  Quality submenu not ready!');
        return null;
      }

      console.log('   ✓ Quality submenu ready\n');

      // ═══════════════════════════════════════════════════════════════════
      // TWO-ATTEMPT STRATEGY:
      // 1. Try first quality (2K/1080p)
      // 2. If dialog or timeout → close dialog and retry with fallback (1K/720p)
      // 3. If that fails → close browser
      // ═══════════════════════════════════════════════════════════════════
      
      const qualityAttempts = [
        { quality: qualityOptions[0], isFallback: false },  // First: 2K/1080p
        { quality: qualityOptions[qualityOptions.length > 1 ? 1 : 0], isFallback: true }  // Second: 1K/720p (or first if only one)
      ];
      
      for (let attemptIdx = 0; attemptIdx < qualityAttempts.length; attemptIdx++) {
        const { quality, isFallback } = qualityAttempts[attemptIdx];
        const attemptNum = attemptIdx + 1;
        
        if (isFallback && quality === qualityAttempts[0].quality) {
          console.log('   ⏭️  Skipping fallback (only one quality available)\n');
          continue;
        }
        
        console.log(`   📍 ATTEMPT ${attemptNum}: Trying ${quality}${isFallback ? ' (fallback)' : ''}...`);
        
        // Find and click quality option in submenu
        const qualityInfo = await this.page.evaluate((targetQuality) => {
          // Re-check submenu exists (might be closed from previous click)
          const submenu = document.querySelector('[data-radix-menu-content][aria-labelledby]');
          if (!submenu || submenu.offsetHeight === 0) {
            return { found: false, disabled: true, reason: 'submenu not visible' };
          }
          
          // Search for matching quality button
          const buttons = submenu.querySelectorAll('button[role="menuitem"]');
          for (const btn of buttons) {
            const isDisabled = btn.getAttribute('aria-disabled') === 'true';
            
            let matchesQuality = false;
            for (const span of btn.querySelectorAll('span')) {
              if (span.textContent.trim().toUpperCase() === targetQuality.toUpperCase()) {
                matchesQuality = true;
                break;
              }
            }
            
            if (matchesQuality && !isDisabled) {
              return { found: true, disabled: false };
            } else if (matchesQuality && isDisabled) {
              return { found: true, disabled: true, reason: 'disabled' };
            }
          }
          
          return { found: false, disabled: true, reason: 'not in submenu' };
        }, quality);

        if (!qualityInfo.found) {
          console.log(`   ℹ️  ${quality} not found (${qualityInfo.reason})`);
          if (attemptIdx < qualityAttempts.length - 1) {
            console.log(`   🔄 Trying fallback quality...\n`);
          }
          continue;
        }

        if (qualityInfo.disabled) {
          console.log(`   ℹ️  ${quality} found but disabled (${qualityInfo.reason})`);
          if (attemptIdx < qualityAttempts.length - 1) {
            console.log(`   🔄 Trying fallback quality...\n`);
          }
          continue;
        }

        console.log(`   ✓ Found enabled option: ${quality}`);
        console.log(`   🖱️  Clicking ${quality}...`);
        
        // Click the quality option
        const clickSuccess = await this.page.evaluate((targetQuality) => {
          const submenu = document.querySelector('[data-radix-menu-content][aria-labelledby]');
          if (!submenu) return false;
          
          const buttons = submenu.querySelectorAll('button[role="menuitem"]');
          for (const btn of buttons) {
            const isDisabled = btn.getAttribute('aria-disabled') === 'true';
            
            let matchesQuality = false;
            for (const span of btn.querySelectorAll('span')) {
              if (span.textContent.trim().toUpperCase() === targetQuality.toUpperCase()) {
                matchesQuality = true;
                break;
              }
            }
            
            if (matchesQuality && !isDisabled) {
              try {
                btn.click();
                return true;
              } catch (e) {
                console.error(`Failed to click ${targetQuality}: ${e.message}`);
              }
            }
          }
          return false;
        }, quality);

        if (!clickSuccess) {
          console.log(`   ⚠️  Failed to click ${quality}`);
          if (attemptIdx < qualityAttempts.length - 1) {
            console.log(`   🔄 Trying fallback quality...\n`);
          }
          continue;
        }

        console.log(`   ✅ ${quality} selected (${isFallback ? 'fallback' : 'preferred'}). Waiting for download...\n`);
        console.log(`   ⏳ Monitoring download (${this.options.downloadTimeoutSeconds}s timeout)...`);
        console.log(`   📋 Watching for: file completion OR error dialog\n`);

        // ═══════════════════════════════════════════════════════════════════
        // TIMEOUT + DIALOG DETECTION DURING DOWNLOAD
        // Race condition: download completion vs timeout+dialog check
        // ═══════════════════════════════════════════════════════════════════
        const timeoutMs = this.options.downloadTimeoutSeconds * 1000;  // 30s default
        const dialogCheckInterval = 2000;  // Check every 2s
        
        let downloadCompleated = false;
        let dialogDetected = false;
        let timeoutOccurred = false;
        
        // Start timeout timer
        const timeoutPromise = new Promise(resolve => 
          setTimeout(() => {
            timeoutOccurred = true;
            resolve('TIMEOUT');
          }, timeoutMs)
        );
        
        // Start dialog check loop
        const dialogCheckPromise = (async () => {
          const startTime = Date.now();
          while (!downloadCompleated && !dialogDetected && !timeoutOccurred) {
            // Check for error dialog
            const dialogInfo = await this.detectResolutionErrorDialog();
            if (dialogInfo.detected) {
              console.log(`\n   ⚠️  Resolution error dialog detected: ${dialogInfo.message}`);
              dialogDetected = true;
              
              // Try to close the dialog
              await this.closeErrorDialog();
              return 'DIALOG_DETECTED';
            }
            
            // Check periodically (less spam)
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            if (elapsed % 15 === 0 && elapsed > 0) {
              console.log(`   ⏳ Still waiting... (${elapsed}s/${this.options.downloadTimeoutSeconds}s)`);
            }
            
            await this.page.waitForTimeout(dialogCheckInterval);
          }
          return 'DOWNLOAD_OK';
        })();
        
        // Start download completion check
        const downloadPromise = (async () => {
          const downloadFile = await this.waitForDownloadCompletion();
          downloadCompleated = true;
          return downloadFile;
        })();
        
        // Race: download vs timeout vs dialog
        const downloadedFile = await Promise.race([
          downloadPromise,
          timeoutPromise,
          dialogCheckPromise
        ]);

        // Check what happened
        if (downloadedFile && typeof downloadedFile === 'string' && downloadedFile.includes(path.sep)) {
          // SUCCESS! File downloaded
          const fileSize = fs.statSync(downloadedFile).size;
          console.log(`\n   ✓ Downloaded: ${path.basename(downloadedFile)} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);
          console.log(`✅ Download confirmed (${quality})\n`);
          return downloadedFile;
        } else if (timeoutOccurred) {
          console.log(`\n   ❌ Download timeout (${this.options.downloadTimeoutSeconds}s) with ${quality}`);
          if (attemptIdx < qualityAttempts.length - 1) {
            console.log(`   🔄 Trying fallback quality...\n`);
          }
          continue;  // Try next quality
        } else if (dialogDetected) {
          console.log(`\n   ❌ Resolution upgrade error dialog with ${quality}`);
          console.log(`   ℹ️  This quality may not be available for your current settings`);
          if (attemptIdx < qualityAttempts.length - 1) {
            console.log(`   🔄 Trying fallback quality...\n`);
          }
          continue;  // Try next quality
        } else {
          console.log(`\n   ⚠️  Unexpected download result with ${quality}`);
          if (attemptIdx < qualityAttempts.length - 1) {
            console.log(`   🔄 Trying fallback quality...\n`);
          }
          continue;  // Try next quality
        }
      }

      // Both attempts exhausted with no success
      console.warn('\n   ⚠️  All quality attempts exhausted (no successful download)\n');
      return null;

    } catch (error) {
      console.error(`   ❌ Error downloading: ${error.message}\n`);
      return null;
    }
  }

  /**
   * Close the browser when download completely fails
   * Called after all retries are exhausted
   */
  async closeBrowserOnFailure() {
    try {
      console.log('\n❌ DOWNLOAD FAILED - All retries exhausted');
      console.log('🔴 Closing browser...');
      
      if (this.page && this.page.browser()) {
        const browser = this.page.browser();
        await browser.close();
        console.log('✓ Browser closed');
      }
    } catch (error) {
      console.error(`⚠️  Error closing browser: ${error.message}`);
    }
  }

  /**
   * Download latest video from gallery
   */
  async downloadVideo() {
    console.log('📥 Downloading generated video...');
    
    try {
      // Get the latest (first) video href
      const latestHref = await this.page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]'));
        if (items.length > 0) {
          return items[0].getAttribute('href');
        }
        return null;
      });

      if (!latestHref) {
        console.warn('⚠️  No video found to download');
        return null;
      }

      console.log(`   Found video: ${latestHref.substring(0, 60)}...`);

      // Use context menu download
      return await this.downloadItemViaContextMenu(latestHref);

    } catch (error) {
      console.error('❌ Error downloading video:', error.message);
      return null;
    }
  }

  /**
   * Wait for download to complete
   * Checks output directory and user Downloads folder
   * Returns path to downloaded file
   */
  async waitForDownloadCompletion() {
    const initialFiles = fs.readdirSync(this.options.outputDir);
    const maxWaitAttempts = 300; // 150 seconds
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
    const videoExtensions = ['.mp4', '.mkv', '.mov', '.avi'];
    const allowedExtensions = this.options.mediaType === 'video' ? videoExtensions : imageExtensions;

    // 🔍 DEBUG: Log initial state
    console.log(`\n🔥 DEBUG: waitForDownloadCompletion() started`);
    console.log(`   outputDir: ${this.options.outputDir}`);
    console.log(`   mediaType: ${this.options.mediaType}`);
    console.log(`   initialFiles count: ${initialFiles.length}`);
    if (initialFiles.length <= 10) {
      console.log(`   initialFiles: ${initialFiles.join(', ')}`);
    }

    for (let attempt = 0; attempt < maxWaitAttempts; attempt++) {
      // Check output directory
      let currentFiles = fs.readdirSync(this.options.outputDir);
      
      let newFiles = currentFiles.filter(f => {
        if (f.endsWith('.crdownload') || f.endsWith('.tmp') || f.endsWith('.partial')) {
          return false;
        }
        const hasAllowedExt = allowedExtensions.some(ext => f.toLowerCase().endsWith(ext));
        return hasAllowedExt && !initialFiles.includes(f);
      });

      if (newFiles.length > 0) {
        // 🔍 DEBUG: Found new files
        console.log(`   ✅ Found ${newFiles.length} new file(s) at attempt ${attempt}:`);
        newFiles.forEach((f, idx) => {
          const fullPath = path.join(this.options.outputDir, f);
          const fileSize = fs.existsSync(fullPath) ? (fs.statSync(fullPath).size / 1024).toFixed(2) : 'N/A';
          console.log(`      [${idx}] ${f} (${fileSize}KB)`);
        });
        const result = path.join(this.options.outputDir, newFiles[0]);
        console.log(`   Returning: ${result}`);
        return result;
      }

      // Check user Downloads folder
      if (fs.existsSync(this.options.userDownloadsDir)) {
        const downloadsFiles = fs.readdirSync(this.options.userDownloadsDir);
        const downloadedFiles = downloadsFiles.filter(f => {
          const hasAllowedExt = allowedExtensions.some(ext => f.toLowerCase().endsWith(ext));
          return hasAllowedExt && !f.endsWith('.crdownload') && !f.endsWith('.tmp') && !f.endsWith('.partial');
        });
        
        if (downloadedFiles.length > 0) {
          // 🔍 DEBUG: Found files in Downloads
          console.log(`   ✅ Found ${downloadedFiles.length} file(s) in Downloads folder`);
          console.log(`      files: ${downloadedFiles.slice(0, 3).join(', ')}`);
          // Move to output directory
          const sourcePath = path.join(this.options.userDownloadsDir, downloadedFiles[0]);
          const destPath = path.join(this.options.outputDir, downloadedFiles[0]);
          
          try {
            fs.renameSync(sourcePath, destPath);
            console.log(`   Moved: ${downloadedFiles[0]}`);
            return destPath;
          } catch (err) {
            console.log(`   ⚠️  Could not move file: ${err.message}`);
            return sourcePath;
          }
        }
      }

      // Log progress periodically
      if (attempt % 30 === 0 && attempt > 0) {
        console.log(`   ⏳ Waiting... (${(attempt * 0.5).toFixed(0)}s)`);
      }

      await this.page.waitForTimeout(500);
    }

    console.log(`   ❌ Timeout - no new files found after ${maxWaitAttempts} attempts (${(maxWaitAttempts * 0.5).toFixed(0)}s)`);
    return null;
  }
}

export default GenerationDownloader;
