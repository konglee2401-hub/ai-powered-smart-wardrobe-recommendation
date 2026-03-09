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
      modelName: baseOptions.modelName || 'Nano Banana 2',
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

  getPreferredQualityOptions() {
    if (this.options.mediaType === 'video') {
      return ['1080p', '720p'];
    }

    return ['2k', '1k'];
  }

  /**
   * Detect if a resolution upgrade success OR error dialog has appeared
   * 
   * SUCCESS: "QuÃ¡ trÃ¬nh nÃ¢ng cáº¥p cháº¥t lÆ°á»£ng Ä‘Ã£ hoÃ n táº¥t vÃ  hÃ¬nh áº£nh cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c táº£i xuá»‘ng!"
   * ERROR: "KhÃ´ng nÃ¢ng cáº¥p Ä‘Æ°á»£c" or similar error messages
   * 
   * @returns {object} - { type: 'success'|'error'|null, message: string|null }
   */
  async detectUpgradeDialog() {
    try {
      const dialogInfo = await this.page.evaluate(() => {
        // Check for various dialog/modal selectors
        const dialogs = document.querySelectorAll('dialog, [role="dialog"], [role="alertdialog"], .modal, [class*="modal"], [class*="dialog"], [data-sonner-toast]');
        
        for (const dialog of dialogs) {
          const text = dialog.textContent || '';
          const lowerText = text.toLowerCase();
          const normalizedText = text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          
          // Check for UPGRADING modal first (intermediate state)
          // "Äang nÃ¢ng cáº¥p" modal appears and blocks other actions
          if (lowerText.includes('Ä‘ang nÃ¢ng cáº¥p') ||
              normalizedText.includes('dang nang cap') ||
              lowerText.includes('upgrading') ||
              lowerText.includes('upgrading your image')) {
            return {
              type: 'upgrading',
              message: text.trim().substring(0, 200),
              visible: dialog.offsetHeight > 0 && dialog.offsetWidth > 0
            };
          }
          
          // Check for SUCCESS messages (upgrade completed and downloaded)
          if (lowerText.includes('hoÃ n táº¥t') && lowerText.includes('táº£i xuá»‘ng') ||
              normalizedText.includes('hoan tat') && normalizedText.includes('tai xuong') ||
              lowerText.includes('Ä‘Æ°á»£c táº£i xuá»‘ng') ||
              normalizedText.includes('duoc tai xuong') ||
              lowerText.includes('download completed') ||
              lowerText.includes('upgrade completed')) {
            return {
              type: 'success',
              message: text.trim().substring(0, 200),
              visible: dialog.offsetHeight > 0 && dialog.offsetWidth > 0
            };
          }
          
          // ðŸ’« Check for ERROR messages (cannot upgrade to higher resolution)
          // Including "KhÃ´ng tÄƒng Ä‘á»™ phÃ¢n giáº£i Ä‘Æ°á»£c" (Cannot increase resolution)
          if (lowerText.includes('khÃ´ng thá»ƒ nÃ¢ng cáº¥p') ||
              normalizedText.includes('khong the nang cap') ||
              lowerText.includes('khÃ´ng tÄƒng Ä‘á»™ phÃ¢n giáº£i') ||
              normalizedText.includes('khong tang do phan giai') ||
              normalizedText.includes('khong nang cap duoc do phan giai') ||
              normalizedText.includes('khong the nang cap do phan giai') ||
              lowerText.includes('cannot') && lowerText.includes('resolution') ||
              normalizedText.includes('cannot increase resolution') ||
              lowerText.includes('upgrade') && lowerText.includes('fail') ||
              lowerText.includes('cannot upgrade') ||
              lowerText.includes('quality not available') ||
              lowerText.includes('cannot upscale') ||
              lowerText.includes('resolution limit')) {
            return {
              type: 'error',
              message: text.trim().substring(0, 200),
              visible: dialog.offsetHeight > 0 && dialog.offsetWidth > 0
            };
          }
        }
        
        return { type: null, message: null };
      });
      
      return dialogInfo;
    } catch (error) {
      console.log(`   âš ï¸  Error detecting dialog: ${error.message}`);
      return { type: null };
    }
  }

  /**
   * Close any visible upgrade dialog/modal (success or error)
   * 
   * @returns {boolean} - true if dialog was closed
   */
  async closeUpgradeDialog() {
    try {
      const closed = await this.page.evaluate(() => {
        // Try Sonner toast close button first
        const sonnerToasts = document.querySelectorAll('[data-sonner-toast]');
        for (const toast of sonnerToasts) {
          // Sonner toast has a close button inside
          const closeBtn = toast.querySelector('button');
          if (closeBtn) {
            closeBtn.click();
            console.log('Clicked Sonner toast close button');
            return true;
          }
        }
        
        // Try various dialog/modal selectors
        const dialogs = document.querySelectorAll('dialog, [role="dialog"], [role="alertdialog"], .modal, [class*="modal"]');
        
        for (const dialog of dialogs) {
          // Try close button
          const closeBtn = dialog.querySelector('button[aria-label*="close" i], button[class*="close" i], [aria-label*="Ä‘Ã³ng" i]');
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
        console.log('   âœ“ Dialog/Toast closed');
        await this.page.waitForTimeout(1000);
      }
      return closed;
    } catch (error) {
      console.log(`   âš ï¸  Error closing dialog: ${error.message}`);
      return false;
    }
  }

  /**
   * Download generated item via context menu (right-click)
   * 
   * Steps:
   * 1. Find item by href
   * 2. Right-click to open context menu
   * 3. Click "Táº£i xuá»‘ng" (Download)
   * 4. Select quality option with error detection
   * 5. Wait for file with timeout fallback
   * 6. On timeout/error, retry with lower quality
   * 7. On final failure, close browser
   * 
   * @param {string} newHref - Item href to download
   * @returns {string|null} - Downloaded file path or null
   */

  /**
   * Get currently visible menu items for debugging selector issues.
   *
   * @returns {Promise<string[]>}
   */
  async getVisibleMenuItems() {
    return this.page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('[role="menuitem"], button[role="menuitem"], [data-radix-collection-item]'));

      return nodes
        .map((node) => {
          const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
          const rect = node.getBoundingClientRect();
          const visible = rect.width > 0 && rect.height > 0;
          return { text, visible };
        })
        .filter((item) => item.visible && item.text)
        .map((item) => item.text);
    });
  }

  /**
   * Find and click the context menu download action using robust selectors.
   *
   * @returns {Promise<boolean>}
   */
  async clickDownloadMenuItem() {
    const candidate = await this.page.evaluate(() => {
      const selectors = [
        '[role="menuitem"]',
        'button[role="menuitem"]',
        '[data-radix-collection-item]'
      ];

      const nodes = Array.from(document.querySelectorAll(selectors.join(',')));
      const normalize = (value) => (value || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');

      const candidates = nodes
        .map((node) => {
          const rect = node.getBoundingClientRect();
          const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
          return {
            text,
            normalizedText: normalize(text),
            hasDownloadIcon: /download/i.test(node.innerHTML || ''),
            visible: rect.width > 0 && rect.height > 0,
            x: Math.round(rect.left + rect.width / 2),
            y: Math.round(rect.top + rect.height / 2)
          };
        })
        .filter((item) => item.visible && item.text);

      const bestMatch = candidates.find((item) =>
        item.normalizedText.includes('tai xuong') ||
        item.normalizedText === 'tai' ||
        item.normalizedText.includes('download')
      ) || candidates.find((item) => item.hasDownloadIcon);

      return {
        bestMatch,
        snapshot: candidates.map((item) => item.text)
      };
    });

    if (!candidate?.bestMatch) {
      console.warn('   [DOWNLOAD] No download menu item found. Visible items: ' + JSON.stringify(candidate?.snapshot || []));
      return false;
    }

    const mouseClicked = await MouseInteractionHelper.moveAndClick(candidate.bestMatch.x, candidate.bestMatch.y, { verify: true });
    if (mouseClicked) {
      return true;
    }

    return this.page.evaluate((targetText) => {
      const selectors = [
        '[role="menuitem"]',
        'button[role="menuitem"]',
        '[data-radix-collection-item]'
      ];
      const normalize = (value) => (value || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
      const nodes = Array.from(document.querySelectorAll(selectors.join(',')));

      for (const node of nodes) {
        const text = (node.textContent || '').replace(/\s+/g, ' ').trim();
        const normalizedText = normalize(text);
        if (normalizedText === targetText) {
          node.click();
          return true;
        }
      }

      return false;
    }, candidate.bestMatch.normalizedText);
  }

  /**
   * Locate the currently visible quality submenu container.
   *
   * @returns {Promise<boolean>}
   */
  async isQualitySubmenuReady() {
    return this.page.evaluate(() => {
      const submenus = Array.from(document.querySelectorAll('[data-radix-menu-content], [role="menu"]'));

      return submenus.some((submenu) => {
        const rect = submenu.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          return false;
        }

        const buttons = submenu.querySelectorAll('[role="menuitem"]');
        return buttons.length > 0;
      });
    });
  }

  /**
   * Find one quality menu item in the currently visible submenu.
   *
   * @param {string} targetQuality
   * @returns {Promise<object>}
   */
  async findQualityOption(targetQuality) {
    return this.page.evaluate((quality) => {
      const submenus = Array.from(document.querySelectorAll('[data-radix-menu-content], [role="menu"]'));
      const normalizedTarget = quality.trim().toUpperCase();

      for (const submenu of submenus) {
        const rect = submenu.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          continue;
        }

        const buttons = Array.from(submenu.querySelectorAll('[role="menuitem"]'));
        for (const btn of buttons) {
          const btnRect = btn.getBoundingClientRect();
          const isVisible = btnRect.width > 0 && btnRect.height > 0;
          if (!isVisible) {
            continue;
          }

          const isDisabled = btn.getAttribute('aria-disabled') === 'true' || btn.hasAttribute('disabled');
          const allTexts = [btn.textContent || '', ...Array.from(btn.querySelectorAll('span')).map((span) => span.textContent || '')]
            .map((text) => text.trim().toUpperCase())
            .filter(Boolean);

          const matchesQuality = allTexts.some((text) => text === normalizedTarget || text.includes(normalizedTarget));

          if (matchesQuality) {
            return {
              found: true,
              disabled: isDisabled,
              x: Math.round(btnRect.left + btnRect.width / 2),
              y: Math.round(btnRect.top + btnRect.height / 2)
            };
          }
        }
      }

      return { found: false, disabled: true, reason: 'not in submenu' };
    }, targetQuality);
  }

  /**
   * Click a quality option from the visible submenu.
   *
   * @param {string} targetQuality
   * @returns {Promise<boolean>}
   */
  async clickQualityOption(targetQuality) {
    const option = await this.findQualityOption(targetQuality);
    if (!option.found || option.disabled) {
      return false;
    }

    const mouseClicked = await MouseInteractionHelper.moveAndClick(option.x, option.y, { verify: true });
    if (mouseClicked) {
      return true;
    }

    return this.page.evaluate((quality) => {
      const submenus = Array.from(document.querySelectorAll('[data-radix-menu-content], [role="menu"]'));
      const normalizedTarget = quality.trim().toUpperCase();

      for (const submenu of submenus) {
        const rect = submenu.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          continue;
        }

        const buttons = Array.from(submenu.querySelectorAll('[role="menuitem"]'));
        for (const btn of buttons) {
          const isDisabled = btn.getAttribute('aria-disabled') === 'true' || btn.hasAttribute('disabled');
          const allTexts = [btn.textContent || '', ...Array.from(btn.querySelectorAll('span')).map((span) => span.textContent || '')]
            .map((text) => text.trim().toUpperCase())
            .filter(Boolean);

          const matchesQuality = allTexts.some((text) => text === normalizedTarget || text.includes(normalizedTarget));

          if (matchesQuality && !isDisabled) {
            btn.click();
            return true;
          }
        }
      }

      return false;
    }, targetQuality);
  }

  async downloadItemViaContextMenu(newHref) {
    const mediaType = this.options.mediaType === 'video' ? 'video' : 'image';
    const mediaExt = this.options.mediaType === 'video' ? '.mp4' : '.jpg';
    const qualityOptions = this.getPreferredQualityOptions();
    
    if (this.options.mediaType === 'image') {
      console.log(`[DOWNLOAD] Image model: ${this.options.modelName}`);
      console.log(`[DOWNLOAD] Image download preference: 2K first, 1K fallback if unavailable or rejected`);
    } else {
      console.log(`[DOWNLOAD] Video download preference: 1080P first, 720P fallback`);
    }
    
    console.log(`[DOWNLOAD] DOWNLOADING ${mediaType.toUpperCase()} VIA CONTEXT MENU\n`);

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
        console.warn(`   âš ï¸  Item not found: ${newHref.substring(0, 60)}...`);
        return null;
      }

      console.log(`   âœ“ Found ${mediaType} (${linkData.linkCount} total items)`);

      let downloadClicked = false;
      const contextMenuAttempts = 5;

      for (let menuAttempt = 1; menuAttempt <= contextMenuAttempts; menuAttempt++) {
        if (menuAttempt > 1) {
          console.log(`   [DOWNLOAD] Retry ${menuAttempt}/${contextMenuAttempts}: waiting for item to become downloadable...`);
          await this.page.keyboard.press('Escape').catch(() => {});
          await this.page.waitForTimeout(3000);
        }

        const freshLinkData = await this.page.evaluate((targetHref) => {
          const allLinks = Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]'));

          for (const link of allLinks) {
            if (link.getAttribute('href') === targetHref) {
              const rect = link.getBoundingClientRect();
              return {
                found: true,
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2),
                hasImage: !!link.querySelector('img'),
                hasVideo: !!link.querySelector('video')
              };
            }
          }

          return { found: false };
        }, newHref);

        if (!freshLinkData.found) {
          console.warn('   [DOWNLOAD] Target item disappeared before context menu opened');
          break;
        }

        console.log(`   [DOWNLOAD] Menu attempt ${menuAttempt}/${contextMenuAttempts} | hasImage=${freshLinkData.hasImage} | hasVideo=${freshLinkData.hasVideo}`);
        console.log('   Right-clicking...');
        await this.page.mouse.move(freshLinkData.x, freshLinkData.y);
        await this.page.waitForTimeout(100);
        await this.page.mouse.down({ button: 'right' });
        await this.page.waitForTimeout(50);
        await this.page.mouse.up({ button: 'right' });

        console.log('   Waiting for context menu...');
        await this.page.waitForTimeout(1500);

        downloadClicked = await this.clickDownloadMenuItem();
        if (downloadClicked) {
          break;
        }

        const visibleMenuItems = await this.getVisibleMenuItems();
        console.warn('   [DOWNLOAD] Download action not available yet. Visible items: ' + JSON.stringify(visibleMenuItems));
      }

      if (!downloadClicked) {
        const visibleMenuItems = await this.getVisibleMenuItems();
        console.warn('   [DOWNLOAD] Failed to click download button. Visible items: ' + JSON.stringify(visibleMenuItems));
        return null;
      }
      // Wait for submenu
      console.log('   â³ Waiting for submenu...');
      await this.page.waitForTimeout(2000);

      // Verify submenu is ready
      const submenuReady = await this.isQualitySubmenuReady();

      if (!submenuReady) {
        const visibleMenuItems = await this.getVisibleMenuItems();
        console.warn('   [DOWNLOAD] Quality submenu not ready. Visible items: ' + JSON.stringify(visibleMenuItems));
        return null;
      }

      console.log('   Quality submenu ready\n');

      const qualityAttempts = [
        { quality: qualityOptions[0], isFallback: false },  // First: 2K/1080p
        { quality: qualityOptions[1] || qualityOptions[0], isFallback: true }  // Second: 1K/720p (guaranteed to be different)
      ];
      
      for (let attemptIdx = 0; attemptIdx < qualityAttempts.length; attemptIdx++) {
        const { quality, isFallback } = qualityAttempts[attemptIdx];
        const attemptNum = attemptIdx + 1;
        
        if (isFallback && quality === qualityAttempts[0].quality) {
          console.log('   â­ï¸  Skipping fallback (only one quality available)\n');
          continue;
        }
        
        console.log(`   ðŸ“ ATTEMPT ${attemptNum}: Trying ${quality}${isFallback ? ' (fallback)' : ''}...`);
        
        // ðŸ’« FIX: If fallback attempt and submenu is closed, use context menu retry
        if (isFallback) {
          const submenuVisible = await this.isQualitySubmenuReady();
          
          if (!submenuVisible) {
            console.log(`   ðŸ”„ Submenu closed - using context menu retry instead...`);
            // Don't try to find button, instead right-click image again and select quality
            const contextMenuClicked = await this.page.evaluate((targetHref) => {
              // Find the item again
              const allLinks = Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]'));
              for (const link of allLinks) {
                if (link.getAttribute('href') === targetHref) {
                  const rect = link.getBoundingClientRect();
                  const x = Math.round(rect.left + rect.width / 2);
                  const y = Math.round(rect.top + rect.height / 2);
                  // Simulate right-click via context menu show
                  const event = new MouseEvent('contextmenu', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: x,
                    clientY: y
                  });
                  link.dispatchEvent(event);
                  return true;
                }
              }
              return false;
            }, newHref);
            
            if (contextMenuClicked) {
              console.log(`   âœ“ Context menu triggered`);
              await this.page.waitForTimeout(2000);
              // Find and click Download option in context menu
              const downloadContextClicked = await this.clickDownloadMenuItem();

              if (downloadContextClicked) {
                console.log(`   âœ“ Download menu opened`);
                await this.page.waitForTimeout(1500);
              } else {
                console.log(`   âš ï¸  Could not open download menu from context`);
                continue;
              }
            } else {
              console.log(`   âš ï¸  Could not trigger context menu for retry`);
              continue;
            }
          }
        }
        
        // Find and click quality option in submenu
        const qualityInfo = await this.findQualityOption(quality);

        if (!qualityInfo.found) {
          console.log(`   â„¹ï¸  ${quality} not found (${qualityInfo.reason})`);
          if (attemptIdx < qualityAttempts.length - 1) {
            console.log(`   ðŸ”„ Trying fallback quality...\n`);
          }
          continue;
        }

        if (qualityInfo.disabled) {
          console.log(`   â„¹ï¸  ${quality} found but disabled (${qualityInfo.reason})`);
          if (attemptIdx < qualityAttempts.length - 1) {
            console.log(`   ðŸ”„ Trying fallback quality...\n`);
          }
          continue;
        }

        console.log(`   âœ“ Found enabled option: ${quality}`);
        console.log(`   ðŸ–±ï¸  Clicking ${quality}...`);
        
        // Click the quality option
        const clickSuccess = await this.clickQualityOption(quality);

        if (!clickSuccess) {
          console.log(`   âš ï¸  Failed to click ${quality}`);
          if (attemptIdx < qualityAttempts.length - 1) {
            console.log(`   ðŸ”„ Trying fallback quality...\n`);
          }
          continue;
        }

        console.log(`   âœ… ${quality} selected (${isFallback ? 'fallback' : 'preferred'}). Waiting for download...\n`);

        // ðŸ’« FIX: Recapture initialFiles RIGHT BEFORE download starts
        // This ensures we ignore any partial/incomplete downloads from previous attempts
        // and handle Chrome's virus scan temporary files
        // CRITICAL: This must be AFTER quality selection but BEFORE waitForDownloadCompletion
        const initialFilesForThisAttempt = fs.readdirSync(this.options.outputDir);
        console.log(`   ðŸ“‹ Baseline files (${initialFilesForThisAttempt.length}): ${initialFilesForThisAttempt.slice(0, 3).map(f => f.substring(0, 40)).join(', ')}${initialFilesForThisAttempt.length > 3 ? '...' : ''}`);

        // ðŸ’« FIX: Wait minimum 10 seconds after clicking button for process to start
        // Google Flow needs time to initiate the download/upgrade process
        console.log(`   â³ Giving server 10s to start download process...`);
        await this.page.waitForTimeout(10000);
        console.log(`   âœ… Checking for download/upgrade dialog...\n`);

        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
        // TIMEOUT + DIALOG DETECTION DURING DOWNLOAD
        // Race condition: download completion vs timeout+dialog check
        // Handles both SUCCESS (dismiss and continue) and ERROR dialogs
        // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

        // Validate timeout value
        let timeoutSeconds = this.options.downloadTimeoutSeconds;
        if (typeof timeoutSeconds !== 'number' || timeoutSeconds <= 0 || isNaN(timeoutSeconds)) {
          console.log(`   âš ï¸  Invalid timeout value: ${timeoutSeconds}, using default 30s`);
          timeoutSeconds = 30;
        }

        // ðŸ’« FIX: Increased timeout to 60s for better download reliability
        // Use 30s base + 30s buffer = 60s total (was 15+20=35s)
        // Longer timeout prevents premature fallback when server is slow
        const baseTimeout = 30;  // Increased from 15s
        const extraBufferTime = 30;  // Increased from 20s
        const totalTimeoutSeconds = baseTimeout + extraBufferTime;

        console.log(`   â³ Monitoring download (${totalTimeoutSeconds}s timeout)...`);
        console.log(`   ðŸ“‹ Watching for: file completion OR error dialog\n`);
        
        const timeoutMs = totalTimeoutSeconds * 1000;
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
            // Check for upgrade dialog (SUCCESS, UPGRADING, or ERROR)
            const dialogInfo = await this.detectUpgradeDialog();
            
            // ðŸ’« Handle UPGRADING modal - just close it and wait
            if (dialogInfo.type === 'upgrading') {
              console.log(`\n   â³ "Äang nÃ¢ng cáº¥p" modal detected...`);
              await this.closeUpgradeDialog();
              console.log(`   âœ“ Upgrading modal closed - continuing to monitor...`);
              await this.page.waitForTimeout(2000);
              continue;
            }
            
            if (dialogInfo.type === 'success') {
              console.log(`\n   âœ“ SUCCESS dialog detected: "${dialogInfo.message.substring(0, 80)}..."`);
              console.log(`   âœ… Quality upgrade completed - closing notification...`);
              
              // ðŸ’« CRITICAL FIX: Close success modal IMMEDIATELY
              // Don't wait for file - close the modal and exit timeout loop
              // This allows error detection for next attempt
              await this.closeUpgradeDialog();
              console.log(`   âœ“ Success modal closed`);
              return 'SUCCESS_HANDLED';
            } else if (dialogInfo.type === 'error') {
              console.log(`\n   âš ï¸  ERROR dialog detected: "${dialogInfo.message}"`);
              console.log(`   âš ï¸  Cannot upgrade to this quality - will try fallback...`);
              dialogDetected = true;
              
              // Try to close the error dialog
              await this.closeUpgradeDialog();
              return 'ERROR_DIALOG';
            }
            
            // Check periodically (less spam)
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            if (elapsed % 15 === 0 && elapsed > 0) {
              console.log(`   â³ Still waiting... (${elapsed}s/${timeoutSeconds}s)`);
            }
            
            await this.page.waitForTimeout(dialogCheckInterval);
          }
          // ðŸ’« FIX: Let downloadPromise take over once initial dialog check is done
          return null;
        })();
        
        // ðŸ’« FIX: Pass initialFilesForThisAttempt to waitForDownloadCompletion
        // Start download completion check
        const downloadPromise = (async () => {
          const downloadFile = await this.waitForDownloadCompletion(initialFilesForThisAttempt);
          downloadCompleated = true;
          return downloadFile;
        })();
        
        // Race: download vs timeout vs dialog
        const result = await Promise.race([
          downloadPromise,
          timeoutPromise,
          dialogCheckPromise
        ]);

        // ðŸ’« FIX: If downloadPromise wins and has a valid file path, use it
        // (even if dialogCheckPromise was still running)
        const downloadedFile = result;
        
        // Check what happened
        if (downloadedFile && typeof downloadedFile === 'string' && downloadedFile.includes(path.sep)) {
          // SUCCESS! File downloaded (valid file path)
          const fileSize = fs.statSync(downloadedFile).size;
          console.log(`\n   âœ“ Downloaded: ${path.basename(downloadedFile)} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);
          console.log(`âœ… Download confirmed (${quality})\n`);
          return downloadedFile;
        } else if (timeoutOccurred) {
          console.log(`\n   â±ï¸  Download timeout (${totalTimeoutSeconds}s) with ${quality}`);
          
          // ðŸ’« FIX: Timeout means file didn't appear in time
          // Close any dialogs and try fallback quality
          if (quality !== '1K' && quality !== 'original' && attemptIdx < qualityAttempts.length - 1) {
            console.log(`   â„¹ï¸  File didn't complete in ${totalTimeoutSeconds}s`);
            console.log(`   ðŸ”„ Trying fallback quality...\n`);
            // Close any hanging dialogs
            try {
              await this.closeUpgradeDialog();
            } catch (e) {
              // Ignore close errors
            }
          } else if (quality === '2k' || quality === '4k') {
            // If we're at 2K/4K and NO fallback available, force 1K despite it not being in menu
            console.log(`   â„¹ï¸  File didn't complete in ${totalTimeoutSeconds}s`);
            console.log(`   ðŸ’¡ No fallback in menu, will attempt 1K original...\n`);
          }
          continue;  // Try next quality
        } else if (dialogDetected) {
          console.log(`\n   âŒ Cannot upgrade to ${quality} quality`);
          console.log(`   â„¹ï¸  This quality may not be available for your current settings`);
          
          // ðŸ’« FIX: If 2K/4K upgrade failed, automatically try 1K original size
          if (quality !== '1K' && quality !== 'original' && attemptIdx < qualityAttempts.length - 1) {
            console.log(`   ðŸ”„ Trying fallback quality...\n`);
            continue;  // Try next quality in list
          } else if ((quality === '2k' || quality === '4k') && attemptIdx >= qualityAttempts.length - 1) {
            // If we're at last quality (was trying 2k/4k), force try 1K original
            console.log(`   ðŸ’¡ Attempting 1K original size as final fallback...\n`);
            
            // Close the submenu first
            await this.page.evaluate(() => {
              const submenu = document.querySelector('[data-radix-menu-content][aria-labelledby]');
              if (submenu) {
                document.body.click();  // Click outside to close
              }
            });
            
            await this.page.waitForTimeout(1000);
            
            // Reopen quality submenu and select 1K
            const openedAgain = await this.page.evaluate(() => {
              const downloadBtn = document.querySelector('button[aria-label*="Download"]') || 
                                  document.querySelector('button[aria-label*="download"]') ||
                                  Array.from(document.querySelectorAll('button')).find(b => 
                                    b.textContent.includes('Download') || 
                                    b.ariaLabel?.includes('Download')
                                  );
              if (downloadBtn) {
                downloadBtn.click();
                return true;
              }
              return false;
            });
            
            if (openedAgain) {
              await this.page.waitForTimeout(1500);
              
              // Try to click 1K original
              const oneKSuccess = await this.page.evaluate(() => {
                const submenu = document.querySelector('[data-radix-menu-content][aria-labelledby]');
                if (!submenu) return false;
                
                const buttons = submenu.querySelectorAll('button[role="menuitem"]');
                for (const btn of buttons) {
                  const isDisabled = btn.getAttribute('aria-disabled') === 'true';
                  let matchesQuality = false;
                  
                  for (const span of btn.querySelectorAll('span')) {
                    const text = span.textContent.trim().toUpperCase();
                    if (text === '1K' || text === 'ORIGINAL') {
                      matchesQuality = true;
                      break;
                    }
                  }
                  
                  if (matchesQuality && !isDisabled) {
                    try {
                      btn.click();
                      return true;
                    } catch (e) {
                      return false;
                    }
                  }
                }
                return false;
              });
              
              if (oneKSuccess) {
                console.log(`   âœ… 1K original selected. Waiting for download...\n`);
                console.log(`   â³ Giving server 10s to start download process...`);
                await this.page.waitForTimeout(10000);
                
                // Now wait for 1K download
                const oneKFile = await this.waitForDownloadCompletion();
                if (oneKFile) {
                  const fileSize = fs.statSync(oneKFile).size;
                  console.log(`\n   âœ“ Downloaded: ${path.basename(oneKFile)} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);
                  console.log(`âœ… Download confirmed (1K original)\n`);
                  return oneKFile;
                }
              }
            }
            
            continue;
          } else {
            if (attemptIdx < qualityAttempts.length - 1) {
              console.log(`   ðŸ”„ Trying fallback quality...\n`);
            }
            continue;
          }
        } else {
          // ðŸ’« FIX: If race returned a string but not a file path (like 'DIALOG_DISMISSED'),
          // this means dialog was dismissed but file hasn't downloaded yet. 
          // Wait a bit longer for the file.
          console.log(`   â„¹ï¸  Dialog processed, waiting additional time for file download...`);
          const extraWaitFile = await this.waitForDownloadCompletion();
          if (extraWaitFile) {
            const fileSize = fs.statSync(extraWaitFile).size;
            console.log(`\n   âœ“ Downloaded: ${path.basename(extraWaitFile)} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`);
            console.log(`âœ… Download confirmed (${quality})\n`);
            return extraWaitFile;
          }
          
          console.log(`\n   âš ï¸  Unexpected download result with ${quality}`);
          if (attemptIdx < qualityAttempts.length - 1) {
            console.log(`   ðŸ”„ Trying fallback quality...\n`);
          }
          continue;  // Try next quality
        }
      }

      // Both attempts exhausted with no success
      console.warn('\n   âš ï¸  All quality attempts exhausted (no successful download)\n');
      return null;

    } catch (error) {
      console.error(`   âŒ Error downloading: ${error.message}\n`);
      return null;
    }
  }

  /**
   * Close the browser when download completely fails
   * Called after all retries are exhausted
   */
  async closeBrowserOnFailure() {
    try {
      console.log('\nâŒ DOWNLOAD FAILED - All retries exhausted');
      console.log('ðŸ”´ Closing browser...');
      
      if (this.page && this.page.browser()) {
        const browser = this.page.browser();
        await browser.close();
        console.log('âœ“ Browser closed');
      }
    } catch (error) {
      console.error(`âš ï¸  Error closing browser: ${error.message}`);
    }
  }

  /**
   * Download latest video from gallery
   */
  async downloadVideo() {
    console.log('ðŸ“¥ Downloading generated video...');
    
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
        console.warn('âš ï¸  No video found to download');
        return null;
      }

      console.log(`   Found video: ${latestHref.substring(0, 60)}...`);

      // Use context menu download
      return await this.downloadItemViaContextMenu(latestHref);

    } catch (error) {
      console.error('âŒ Error downloading video:', error.message);
      return null;
    }
  }

  /**
   * Wait for download to complete
   * Checks output directory and user Downloads folder
   * Returns path to downloaded file
   */
  async waitForDownloadCompletion(initialFilesFromCaller = null) {
    // ðŸ’« FIX: Accept initialFiles from caller (captured right before download)
    // If caller didn't provide, capture now (fallback for old callers)
    const initialFiles = initialFilesFromCaller || fs.readdirSync(this.options.outputDir);
    const maxWaitAttempts = 300; // 150 seconds
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
    const videoExtensions = ['.mp4', '.mkv', '.mov', '.avi'];
    const allowedExtensions = this.options.mediaType === 'video' ? videoExtensions : imageExtensions;

    // ðŸ” DEBUG: Log initial state
    console.log(`\nðŸ”¥ DEBUG: waitForDownloadCompletion() started`);
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
        // ðŸ’« FIX: Ignore more incomplete/temporary file types (Chrome virus scan, .download, etc)
        const ignorePatterns = [
          '.crdownload',    // Chrome in-progress
          '.tmp',           // Temporary
          '.partial',       // Partial download
          '.download',      // Some browsers mark as .download during scan
          '.quarantine',    // Chrome virus scan quarantine
          '.incomplete',    // Firefox mark
          '.checking',      // Custom checking flag
          '.virus',         // Chrome virus scanning in progress
          '~',              // Windows temporary
          '.zip',           // Sometimes created as temp
        ];
        
        for (const pattern of ignorePatterns) {
          if (f.toLowerCase().endsWith(pattern) || f.toLowerCase().includes(pattern + '.')) {
            return false;
          }
        }
        
        // ðŸ’« FIX: Also ignore tiny files (< 10KB) which are likely metadata/virus scan files
        try {
          const fullPath = path.join(this.options.outputDir, f);
          const stats = fs.statSync(fullPath);
          if (stats.size < 10240) {  // Less than 10KB
            return false;
          }
        } catch (e) {
          // If we can't stat it, ignore it
          return false;
        }
        
        const hasAllowedExt = allowedExtensions.some(ext => f.toLowerCase().endsWith(ext));
        return hasAllowedExt && !initialFiles.includes(f);
      });

      if (newFiles.length > 0) {
        // ðŸ” DEBUG: Found new files
        console.log(`   âœ… Found ${newFiles.length} new file(s) at attempt ${attempt}:`);
        newFiles.forEach((f, idx) => {
          const fullPath = path.join(this.options.outputDir, f);
          const fileSize = fs.existsSync(fullPath) ? (fs.statSync(fullPath).size / 1024).toFixed(2) : 'N/A';
          console.log(`      [${idx}] ${f} (${fileSize}KB)`);
        });
        const result = path.join(this.options.outputDir, newFiles[0]);
        console.log(`   Returning: ${result}`);
        return result;
      }

      // Check user Downloads folder (fallback only - primary downloads go to outputDir)
      // âš ï¸  Since Chrome now configured to download directly to outputDir,
      // this fallback is only useful if user manually downloads or Chrome prefs fail
      if (fs.existsSync(this.options.userDownloadsDir)) {
        const downloadsFiles = fs.readdirSync(this.options.userDownloadsDir);
        const downloadedFiles = downloadsFiles.filter(f => {
          // ðŸ’« FIX: Use same robust filtering as output directory
          const ignorePatterns = [
            '.crdownload', '.tmp', '.partial', '.download', '.quarantine',
            '.incomplete', '.checking', '.virus', '~', '.zip'
          ];
          
          for (const pattern of ignorePatterns) {
            if (f.toLowerCase().endsWith(pattern) || f.toLowerCase().includes(pattern + '.')) {
              return false;
            }
          }
          
          // Ignore tiny files (< 10KB)
          try {
            const fullPath = path.join(this.options.userDownloadsDir, f);
            const stats = fs.statSync(fullPath);
            if (stats.size < 10240) {
              return false;
            }
          } catch (e) {
            return false;
          }
          
          const hasAllowedExt = allowedExtensions.some(ext => f.toLowerCase().endsWith(ext));
          return hasAllowedExt;
        });
        
        if (downloadedFiles.length > 0) {
          // ðŸ” DEBUG: Found files in Downloads
          console.log(`   âœ… Found ${downloadedFiles.length} file(s) in Downloads folder`);
          console.log(`      files: ${downloadedFiles.slice(0, 3).join(', ')}`);
          // Move to output directory
          const sourcePath = path.join(this.options.userDownloadsDir, downloadedFiles[0]);
          const destPath = path.join(this.options.outputDir, downloadedFiles[0]);
          
          try {
            fs.renameSync(sourcePath, destPath);
            console.log(`   Moved: ${downloadedFiles[0]}`);
            return destPath;
          } catch (err) {
            console.log(`   âš ï¸  Could not move file: ${err.message}`);
            return sourcePath;
          }
        }
      }

      // Log progress periodically
      if (attempt % 30 === 0 && attempt > 0) {
        console.log(`   â³ Waiting... (${(attempt * 0.5).toFixed(0)}s)`);
      }

      await this.page.waitForTimeout(500);
    }

    console.log(`   âŒ Timeout - no new files found after ${maxWaitAttempts} attempts (${(maxWaitAttempts * 0.5).toFixed(0)}s)`);
    return null;
  }
}

export default GenerationDownloader;

