/**
 * GenerationDownloader - Downloads generated images and videos
 * 
 * Consolidated from:
 * - downloadItemViaContextMenu() - Right-click menu download
 * - downloadVideo() - Download video generation
 * - selectQualityOption() - Select download quality
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
    this.options = {
      outputDir: options.outputDir || './downloads',
      modelName: options.modelName || 'Nano Banana Pro',
      mediaType: options.mediaType || 'image',
      userDownloadsDir: options.userDownloadsDir || path.join(process.env.USERPROFILE || '', 'Downloads'),
      ...options
    };
    
    // Bind utilities
    MouseInteractionHelper.page = page;
  }

  /**
   * Download generated item via context menu (right-click)
   * 
   * Steps:
   * 1. Find item by href
   * 2. Right-click to open context menu
   * 3. Click "Tải xuống" (Download)
   * 4. Select quality option
   * 5. Wait for file to appear in output directory
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

      console.log('   ✓ Quality submenu ready');

      // Select quality option - SCOPED TO QUALITY SUBMENU ONLY
      let selectedQuality = null;
      for (const quality of qualityOptions) {
        console.log(`   🔍 Checking for quality: ${quality}...`);
        
        const qualityInfo = await this.page.evaluate((targetQuality) => {
          // Find the QUALITY submenu (not main menu) - it has aria-labelledby attribute
          const submenu = document.querySelector('[data-radix-menu-content][aria-labelledby]');
          if (!submenu || submenu.offsetHeight === 0) {
            return { found: false, disabled: true, reason: 'submenu not visible' };
          }
          
          // Search ONLY in quality submenu buttons
          const buttons = submenu.querySelectorAll('button[role="menuitem"]');
          
          for (const btn of buttons) {
            const isDisabled = btn.getAttribute('aria-disabled') === 'true';
            
            // Match quality by exact span text (not textContent.includes)
            let matchesQuality = false;
            for (const span of btn.querySelectorAll('span')) {
              if (span.textContent.trim().toUpperCase() === targetQuality.toUpperCase()) {
                matchesQuality = true;
                break;
              }
            }
            
            // Check if button matches quality and is enabled
            if (matchesQuality && !isDisabled) {
              const rect = btn.getBoundingClientRect();
              return {
                found: true,
                quality: targetQuality,
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2),
                disabled: false
              };
            } else if (matchesQuality && isDisabled) {
              return { found: true, disabled: true, reason: 'disabled' };
            }
          }
          
          return { found: false, disabled: true, reason: 'not in submenu' };
        }, quality);

        if (qualityInfo.found) {
          if (qualityInfo.disabled) {
            console.log(`   ℹ️  ${quality} found but disabled (${qualityInfo.reason})`);
            continue;
          }
          
          selectedQuality = quality;
          console.log(`   ✓ Found enabled option: ${quality}`);
          console.log(`   🖱️  Clicking ${quality}...`);
          
          const clickSuccess = await this.page.evaluate((targetQuality) => {
            // Find the QUALITY submenu (not main menu)
            const submenu = document.querySelector('[data-radix-menu-content][aria-labelledby]');
            if (!submenu) return false;
            
            // Search ONLY in quality submenu buttons
            const buttons = submenu.querySelectorAll('button[role="menuitem"]');
            for (const btn of buttons) {
              const isDisabled = btn.getAttribute('aria-disabled') === 'true';
              
              // Match quality by exact span text
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

          if (clickSuccess) {
            console.log(`   ✅ ${quality} selected`);
            break;
          }
        } else {
          console.log(`   ℹ️  ${quality} not found (${qualityInfo.reason})`);
        }
      }

      if (!selectedQuality) {
        console.warn('   ⚠️  None of the preferred qualities found. Trying 1K as fallback...');
        
        const fallbackClicked = await this.page.evaluate(() => {
          // Find the QUALITY submenu
          const submenu = document.querySelector('[data-radix-menu-content][aria-labelledby]');
          if (!submenu) return false;
          
          const buttons = submenu.querySelectorAll('button[role="menuitem"]');
          
          // Specifically look for 1K, not just any first button
          for (const btn of buttons) {
            const isDisabled = btn.getAttribute('aria-disabled') === 'true';
            if (isDisabled) continue;
            
            // Look for 1K span
            for (const span of btn.querySelectorAll('span')) {
              if (span.textContent.trim().toUpperCase() === '1K') {
                try {
                  btn.click();
                  return true;
                } catch (e) {
                  console.error(`Failed to click 1K: ${e.message}`);
                }
              }
            }
          }
          return false;
        });

        if (fallbackClicked) {
          console.log(`   ✅ 1K selected (fallback)`);
          selectedQuality = '1K';
        } else {
          console.warn('   ⚠️  Could not select any quality option');
        }
      }

      console.log('   ✓ Download started, waiting for file...');
      
      // Wait for file to appear
      const downloadedFile = await this.waitForDownloadCompletion();
      
      if (downloadedFile) {
        const fileSize = fs.statSync(downloadedFile).size;
        console.log(`   ✓ Downloaded: ${path.basename(downloadedFile)} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);
        console.log(`\n✅ Download confirmed\n`);
        return downloadedFile;
      } else {
        console.warn('   ⚠️  Download timeout\n');
        return null;
      }

    } catch (error) {
      console.error(`   ❌ Error downloading: ${error.message}\n`);
      return null;
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
