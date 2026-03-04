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
    this.uploadedImageRefs = options.uploadedImageRefs || {}; // Legacy: for ErrorRecovery compatibility
    this.preGenerationMonitor = null; // NEW: Reference to PreGenerationMonitor for baseline comparison
    
    // Bind utilities
    // VirtuosoQueryHelper now accepts page as parameter - no binding needed
    MouseInteractionHelper.page = page;
  }

  /**
   * Set reference to PreGenerationMonitor for baseline-based generation detection
   */
  setPreGenerationMonitor(preGenMonitor) {
    this.preGenerationMonitor = preGenMonitor;
  }

  /**
   * Monitor generation progress
   * Polls page for generation status up to timeout
   * Returns {success, href} object when generation completes
   */
  async monitorGeneration(timeoutSeconds = 300, expectedNewHrefs = 1) {
    console.log(`⏳ [MONITOR] Starting generation monitoring (max ${timeoutSeconds}s, expecting ${expectedNewHrefs} new image${expectedNewHrefs > 1 ? 's' : ''})...`);
    
    // 🔥 DEBUG: Check if PreGenerationMonitor baseline is available
    if (this.preGenerationMonitor) {
      const baseline = this.preGenerationMonitor.getBaseline();
      console.log(`   📍 [MONITOR] Using PreGenerationMonitor baseline: ${baseline.length} items`);
    } else {
      console.log(`   ⚠️  [MONITOR] No PreGenerationMonitor set (using uploadedImageRefs detection)`);
    }
    
    const startTime = Date.now();
    const timeoutMs = timeoutSeconds * 1000;
    let generationDetected = false;
    let lastStatus = '';
    let statusCheckCount = 0;
    let lastHrefCount = 0;  // Track href count to detect completion

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
          
          // 🔴 REMOVED: Bad logic - checking item.length > 5 incorrectly marked any page as "generating"
          // After generation, page still has > 5 items (old + new), so it never detected "ready"
          
          // Look for download button (generation ready)
          const readyEl = document.querySelector('button[aria-label*="Download"]');
          if (readyEl) return 'ready';
          
          // 💫 NEW: Check if there's an error message (must check first tile specifically)
          // Google Flow shows errors on tiles with data-tile-id, with warning icon + "Không thành công" text
          const firstTile = document.querySelector('[data-testid="virtuoso-item-list"] [data-tile-id]');
          if (firstTile) {
            const tileText = firstTile.textContent.toLowerCase();
            // 💫 NEW: Check if tile is still generating (has progress %)
            const progressEl = firstTile.querySelector('[role="progressbar"], [class*="progress"]');
            const hasProgressPercent = /\d+%/.test(firstTile.textContent);
            
            // Only report error if NO progress indicator (not generating)
            if (!hasProgressPercent && !progressEl) {
              // Check for Google Flow error indicators
              if (tileText.includes('không thành công') || 
                  tileText.includes('đã xảy ra lỗi') ||
                  tileText.includes('lỗi') ||
                  tileText.includes('failed')) {
                // Also check for warning icon
                const warningIcon = firstTile.querySelector('i.google-symbols[font-size="1rem"]');
                if (warningIcon && warningIcon.textContent.includes('warning')) {
                  return 'error';
                }
              }
            } else if (hasProgressPercent || progressEl) {
              // Still generating, not an error
              return 'generating';
            }
          }
          
          return 'unknown';
        });

        // 💫 NEW: Check PreGenerationMonitor for href completion (call ONCE, reuse result)
        let preGenStatus = null;
        let hrefAnalysis = null;  // Store for reuse
        let newHrefCount = 0;      // Track new href count for display
        
        if (this.preGenerationMonitor && status !== 'error') {
          try {
            hrefAnalysis = await this.preGenerationMonitor.findNewHref();
            newHrefCount = hrefAnalysis?.newCount || 0;
            
            // 🔥 DEBUG: Log detailed href analysis
            console.log(`      📊 [MONITOR] Href analysis (check ${statusCheckCount}):`);
            console.log(`         New (strict): ${hrefAnalysis?.newCount || 0}/${expectedNewHrefs}`);
            console.log(`         New (loose): ${hrefAnalysis?.newCountLoose || 0}`);
            console.log(`         Existing: ${hrefAnalysis?.existingCount || 0}`);
            console.log(`         Total items: ${hrefAnalysis?.totalItems || 0}`);
            
            // If we found expected number of new hrefs, generation is complete
            if (newHrefCount === expectedNewHrefs) {
              preGenStatus = 'ready-by-hrefs';
              console.log(`      ✅ DETECTED: ${expectedNewHrefs} new href${expectedNewHrefs > 1 ? 's' : ''} found via PreGenerationMonitor`);
            } else if (newHrefCount > lastHrefCount) {
              lastHrefCount = newHrefCount;
              console.log(`      📈 Progress: ${newHrefCount}/${expectedNewHrefs} new href${expectedNewHrefs > 1 ? 's' : ''} found so far`);
            }
          } catch (e) {
            console.warn(`      ⚠️  PreGenerationMonitor check error: ${e.message}`);
          }
        }

        // Use PreGen detection if available and better
        let effectiveStatus = status;
        if (preGenStatus === 'ready-by-hrefs') {
          effectiveStatus = 'ready';
        }

        // 💫 NEW: Log every check iteration with href status
        const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
        console.log(`   [CHECK ${statusCheckCount}] ${elapsedSeconds}s elapsed | Status: ${status}${preGenStatus ? ` (→ ${preGenStatus})` : ''}`);
        
        // 💫 NEW: Check if first tile is generating (show progress)
        if (status === 'error' || status === 'unknown') {
          try {
            const tileProgress = await this.page.evaluate(() => {
              const firstTile = document.querySelector('[data-testid="virtuoso-item-list"] [data-tile-id]');
              if (firstTile) {
                const match = firstTile.textContent.match(/(\d+)%/);
                const hasProgress = !!match;
                const percent = match ? match[1] : null;
                return { hasProgress, percent, tileText: firstTile.textContent.substring(0, 100) };
              }
              return { hasProgress: false };
            });
            
            if (tileProgress.hasProgress) {
              console.log(`      🔄 Tile is generating: ${tileProgress.percent}% complete`);
            }
          } catch (e) {
            // Skip progress check if error
          }
        }

        // Show href count if available (from already-captured analysis)
        if (hrefAnalysis && (status === 'generating' || effectiveStatus === 'generating')) {
          const totalNew = hrefAnalysis.newCount || 0;
          console.log(`      📊 New hrefs found: ${totalNew}/2`);
          if (totalNew > 0 && hrefAnalysis.href) {
            console.log(`         ↳ ${hrefAnalysis.href.substring(0, 60)}`);
          }
        }

        // Log status changes (track effective status, not just button status)
        if (effectiveStatus !== lastStatus) {
          console.log(`   ℹ️  STATUS CHANGE: ${lastStatus || 'start'} → ${effectiveStatus}`);
          lastStatus = effectiveStatus;
          if (effectiveStatus === 'generating') {
            generationDetected = true;
            console.log(`   🎬 Generation detected!`);
          }
        }

        // Handle error status
        if (effectiveStatus === 'error') {
          console.warn('⚠️  Generation error detected on page');
          
          // 💫 NEW: Try to get the failed tile's href for retry
          let failedTileHref = null;
          let tileStatus = null;  // Track what we found
          try {
            failedTileHref = await this.page.evaluate(() => {
              const firstTile = document.querySelector('[data-testid="virtuoso-item-list"] [data-tile-id]');
              if (firstTile) {
                const link = firstTile.querySelector('a[href]');
                return link ? link.getAttribute('href') : null;
              }
              return null;
            });
            tileStatus = failedTileHref ? 'found' : 'no_href';
          } catch (e) {
            // Silently skip if we can't get href
            tileStatus = 'query_error';
          }
          
          console.log(`[ERROR] Failed tile href: ${failedTileHref ? failedTileHref.substring(0, 60) + '...' : 'not found'} (${tileStatus})`);
          return { success: false, href: failedTileHref, error: 'Generation error detected on tile' };
        }

        if (effectiveStatus === 'ready') {
          console.log('✅ Generation completed');
          
          // Find the generated image using PreGenerationMonitor baseline
          let generatedImage;
          if (this.preGenerationMonitor) {
            console.log('   📍 Using PreGenerationMonitor baseline to find generated image...');
            generatedImage = await this.preGenerationMonitor.findNewHref();
            if (generatedImage && generatedImage.href) {
              console.log(`   📸 Found generated image: ${generatedImage.href.substring(0, 50)}`);
              return { success: true, href: generatedImage.href };
            }
          } else {
            // Fallback: old method using uploadedImageRefs 
            console.log('   ⚠️  PreGenerationMonitor not available, falling back to uploadedImageRefs method');
            generatedImage = await this.findGeneratedImage();
            if (generatedImage && generatedImage.href) {
              console.log(`   📸 Found generated image: ${generatedImage.href.substring(0, 50)}`);
              return { success: true, href: generatedImage.href };
            }
          }
          
          console.warn('⚠️  Could not find generated image href');
          return { success: false, href: null };
        }
        
        // Log periodically with more info
        if (statusCheckCount % 10 === 0 && !generationDetected) {
          const elapsedSec = Math.round((Date.now() - startTime) / 1000);
          const remainingSec = timeoutSeconds - elapsedSec;
          console.log(`   ⏳ Still waiting... (${elapsedSec}s/${timeoutSeconds}s | ${remainingSec}s remaining)`);
        }

        await this.page.waitForTimeout(2000);
      }

      if (!generationDetected) {
        console.warn('⚠️  Generation never started - might be stuck or already completed');
      }

      // 💫 NEW: Before giving up, check if hrefs were generated anyway (timeout but succeeded)
      if (this.preGenerationMonitor) {
        try {
          console.log('⏰ Timeout reached - checking if images were generated via PreGenerationMonitor...');
          const finalCheck = await this.preGenerationMonitor.findNewHref();
          if (finalCheck && finalCheck.newCount === expectedNewHrefs) {
            console.log(`✅ SUCCESS: ${expectedNewHrefs} new href${expectedNewHrefs > 1 ? 's' : ''} found, generation completed (despite timeout/status detection failure)`);
            return { success: true, href: finalCheck.href };
          } else if (finalCheck && finalCheck.newCount > 0) {
            console.log(`⚠️  Partial: Only ${finalCheck.newCount}/${expectedNewHrefs} href${expectedNewHrefs > 1 ? 's' : ''} found`);
            return { success: false, href: null, partial: true, found: finalCheck.newCount };
          }
        } catch (e) {
          console.warn(`⚠️  Final PreGenerationMonitor check failed: ${e.message}`);
        }
      }

      console.warn('⚠️  Generation timeout');
      return { success: false, href: null };

    } catch (error) {
      console.error('❌ Error monitoring:', error.message);
      return { success: false, href: null };
    }
  }

  /**
   * Find newly generated image/video by comparing against uploaded refs
   * STRICT: Must have both href AND media tag (img or video), not just href
   * Generated images have different href+imgSrc than uploaded ones
   * Generated videos have <video> tag instead of <img>
   */
  async findGeneratedImage() {
    try {
      // 💫 ENHANCED: Stricter check - requires BOTH href and media tag (img or video)
      // 💫 VIRTUALIZATION FIX: Only check first 15 items (tail items disappear in virtuoso)
      const generated = await this.page.evaluate((uploadedRefs) => {
        const items = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
        const itemsArray = Array.from(items).slice(0, 15);  // Only first 15
        
        const allCandidates = [];
        
        for (let i = 0; i < itemsArray.length; i++) {
          const linkEl = itemsArray[i];
          const href = linkEl.getAttribute('href');
          const imgEl = linkEl.querySelector('img');
          const videoEl = linkEl.querySelector('video');
          const hasImg = !!imgEl;  // 💫 Track if img exists
          const hasVideo = !!videoEl;  // 💫 NEW: Track if video exists
          const hasMediaTag = hasImg || hasVideo;  // Has either img or video
          const mediaType = hasVideo ? 'video' : (hasImg ? 'image' : 'unknown');  // 💫 NEW
          const imgSrc = imgEl ? imgEl.getAttribute('src') : null;
          const textContent = linkEl.textContent.trim();
          
          if (!href) continue;  // Skip items without href
          
          // Check if this matches any uploaded ref
          let isUploaded = false;
          for (const [key, ref] of Object.entries(uploadedRefs || {})) {
            if (ref.href === href && ref.imgSrc === imgSrc) {
              isUploaded = true;
              break;
            }
          }
          
          // 💫 STRICT: Only count as generated if NOT uploaded AND has media tag (img OR video)
          if (!isUploaded && hasMediaTag) {
            allCandidates.push({
              href,
              imgSrc,
              hasImg: hasImg,
              hasVideo: hasVideo,  // 💫 NEW: Track video
              mediaType: mediaType,  // 💫 NEW: Track media type
              text: textContent.substring(0, 100),
              position: i,
              isGenerated: true
            });
          } else if (!isUploaded && !hasMediaTag) {
            // Found href without media tag - might be error/policy removal
            allCandidates.push({
              href,
              imgSrc: null,
              hasImg: false,
              hasVideo: false,
              mediaType: 'unknown',
              text: textContent.substring(0, 100),
              position: i,
              isGenerated: false,
              reason: 'missing_media_tag'
            });
          }
        }
        
        // Return first generated image/video (with media tag)
        const generated = allCandidates.find(c => c.isGenerated);
        return generated || (allCandidates.length > 0 ? allCandidates[0] : null);
      }, this.uploadedImageRefs);
      
      if (generated) {
        // 💫 ENHANCED: Log media type (image or video)
        if (generated.isGenerated) {
          const typeIcon = generated.hasVideo ? '🎬' : '📸';
          console.log(`   ✅ Found generated ${generated.mediaType.toUpperCase()}: ${typeIcon} ${generated.href.substring(0, 60)}`);
        } else if (!generated.hasMediaTag) {
          console.log(`   ⚠️  Found href without media tag (might be policy removed): ${generated.href.substring(0, 60)}`);
        }
      }
      
      return generated;

    } catch (error) {
      console.error(`Error finding generated image/video: ${error.message}`);
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
      return await VirtuosoQueryHelper.getAllTileData(this.page);
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
      return await VirtuosoQueryHelper.getItemCount(this.page);
    } catch (error) {
      console.error(`Error getting item count: ${error.message}`);
      return 0;
    }
  }
}

export default GenerationMonitor;
