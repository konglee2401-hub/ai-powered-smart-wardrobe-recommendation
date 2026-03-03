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
      console.log(`   ℹ️  Model: ${this.options.modelName} (trying 2K first)`);
    } else if (this.options.mediaType === 'image') {
      qualityOptions = ['1k', '1K'];
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

      // Select quality option
      let selectedQuality = null;
      for (const quality of qualityOptions) {
        const qualityInfo = await this.page.evaluate((targetQuality) => {
          const buttons = document.querySelectorAll('[role="menuitem"]');
          
          for (const btn of buttons) {
            const text = btn.textContent.toLowerCase();
            
            if (text.includes(targetQuality.toLowerCase())) {
              const rect = btn.getBoundingClientRect();
              return {
                found: true,
                quality: targetQuality,
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2)
              };
            }
          }
          
          return { found: false };
        }, quality);

        if (qualityInfo.found) {
          selectedQuality = quality;
          console.log(`   🖱️  Clicking ${quality}...`);
          
          const clickSuccess = await this.page.evaluate((targetQuality) => {
            const buttons = document.querySelectorAll('[role="menuitem"]');
            for (const btn of buttons) {
              if (btn.textContent.toLowerCase().includes(targetQuality.toLowerCase())) {
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
        }
      }

      if (!selectedQuality) {
        console.warn('   ⚠️  No quality option found, trying first available...');
        
        const firstOption = await this.page.evaluate(() => {
          const buttons = document.querySelectorAll('[role="menuitem"]');
          if (buttons.length > 0) {
            try {
              const rect = buttons[0].getBoundingClientRect();
              return {
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2)
              };
            } catch (e) {
              return null;
            }
          }
          return null;
        });

        if (firstOption) {
          await this.page.mouse.move(firstOption.x, firstOption.y);
          await this.page.waitForTimeout(150);
          await this.page.mouse.down();
          await this.page.waitForTimeout(100);
          await this.page.mouse.up();
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
        return path.join(this.options.outputDir, newFiles[0]);
      }

      // Check user Downloads folder
      if (fs.existsSync(this.options.userDownloadsDir)) {
        const downloadsFiles = fs.readdirSync(this.options.userDownloadsDir);
        const downloadedFiles = downloadsFiles.filter(f => {
          const hasAllowedExt = allowedExtensions.some(ext => f.toLowerCase().endsWith(ext));
          return hasAllowedExt && !f.endsWith('.crdownload') && !f.endsWith('.tmp') && !f.endsWith('.partial');
        });
        
        if (downloadedFiles.length > 0) {
          // Move to output directory
          const sourcePath = path.join(this.options.userDownloadsDir, downloadedFiles[0]);
          const destPath = path.join(this.options.outputDir, downloadedFiles[0]);
          
          try {
            fs.renameSync(sourcePath, destPath);
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

    return null;
  }
}

export default GenerationDownloader;
