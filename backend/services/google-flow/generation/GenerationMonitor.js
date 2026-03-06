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
   * 
   * @param {number} timeoutSeconds - Timeout in seconds
   * @param {number} expectedNewHrefs - Expected number of new hrefs
   * @param {string} promptText - Original prompt text (for recovery Strategy 3)
   */
  async monitorGeneration(timeoutSeconds = 300, expectedNewHrefs = 1, promptText = null) {
    console.log(`⏳ [MONITOR] Starting generation monitoring (max ${timeoutSeconds}s, expecting ${expectedNewHrefs} new image${expectedNewHrefs > 1 ? 's' : ''})...`);
    
    // 💾 IMPORTANT: Save prompt for Strategy 3 recovery
    const originalPrompt = promptText || 'unknown prompt';
    
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
    let errorRetryCount = 0;  // 💫 NEW: Track how many times we've retried on error
    let lastNewHrefTime = Date.now();  // 💫 Track last time we found a new href
    const MAX_SIMPLE_RETRIES = 3;  // Max direct retry button clicks
    const PARTIAL_TIMEOUT_MS = 30000;  // 30s - if no new hrefs in 30s, assume partial failure

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
            
            // If we found expected number of new hrefs (or more), generation is complete
            if (newHrefCount >= expectedNewHrefs) {
              preGenStatus = 'ready-by-hrefs';
              console.log(`      ✅ DETECTED: ${newHrefCount}/${expectedNewHrefs} new href${expectedNewHrefs > 1 ? 's' : ''} via PreGenerationMonitor`);
            } else if (newHrefCount > lastHrefCount) {
              lastHrefCount = newHrefCount;
              lastNewHrefTime = Date.now();  // 💫 Update time when new href found
              console.log(`      📈 Progress: ${newHrefCount}/${expectedNewHrefs} new href${expectedNewHrefs > 1 ? 's' : ''} found so far`);
            } else if (newHrefCount > 0 && Date.now() - lastNewHrefTime > PARTIAL_TIMEOUT_MS) {
              // 💫 NEW: Partial success - no new hrefs for 30s but we have some
              console.log(`      ⚠️  PARTIAL: No new hrefs for ${PARTIAL_TIMEOUT_MS/1000}s, assuming ${newHrefCount}/${expectedNewHrefs} are all that will generate`);
              preGenStatus = 'partial-ready';
            }
          } catch (e) {
            console.warn(`      ⚠️  PreGenerationMonitor check error: ${e.message}`);
          }
        }

        // Use PreGen detection if available and better
        let effectiveStatus = status;
        if (preGenStatus === 'ready-by-hrefs') {
          effectiveStatus = 'ready';
        } else if (preGenStatus === 'partial-ready') {
          effectiveStatus = 'partial-ready';  // 💫 Handle partial success
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
          console.log(`      📊 New hrefs found: ${totalNew}/${expectedNewHrefs}`);
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
          errorRetryCount++;
          
          // 💫 NEW: Delete all failed items before retrying
          console.log('   🗑️  Cleaning up failed items before retry...');
          const deletedCount = await this.deleteFailedItems();
          if (deletedCount > 0) {
            console.log(`   ✅ Deleted ${deletedCount} failed item(s)`);
            await this.page.waitForTimeout(1000);  // Wait after deletion
          }
          
          // 💫 ESCALATION STRATEGY:
          // 1. Retries 1-3: Click retry button (simple recovery)
          // 2. Retry 4: Click "Use Again" button + Submit 2x (medium recovery)
          // 3. Retry 5+: Re-enter prompt + Submit (full recovery)
          
          console.log(`   [RETRY ${errorRetryCount}/${MAX_SIMPLE_RETRIES + 2}] Escalating error recovery...`);
          
          try {
            // 💫 COMMENTED OUT: Strategy 1 (retry button) - not effective
            // if (errorRetryCount <= MAX_SIMPLE_RETRIES) {
            //   console.log(`🔄 [Strategy 1] Clicking retry button...`);
            //   // ... retry button click code ...
            // }
            
            // 💫 NEW: Strategy 2 replaces Strategy 1 - Click "Use Again" 3x with focus+spaces+wait+submit
            if (errorRetryCount >= 1 && errorRetryCount <= MAX_SIMPLE_RETRIES + 1) {
              const maxUseAgainRetries = 3;
              const useAgainAttempt = Math.min(errorRetryCount, maxUseAgainRetries);
              
              console.log(`🔄 [Strategy 2] Using 'Use Again' button attempt ${useAgainAttempt}/${maxUseAgainRetries}...`);
              
              const useAgainResult = await this.page.evaluate(() => {
                const firstTile = document.querySelector('[data-testid="virtuoso-item-list"] [data-tile-id]');
                if (!firstTile) return { found: false };
                
                // 💫 FIX: Find "Sử dụng lại câu lệnh" button (undo icon)
                // It's at same level as retry button
                const buttons = Array.from(firstTile.querySelectorAll('button'));
                const useAgainBtn = buttons.find(btn => {
                  const icons = btn.querySelectorAll('i.google-symbols');
                  const spans = btn.querySelectorAll('span');
                  
                  // Check for undo icon (this is "Sử dụng lại câu lệnh" button)
                  for (const icon of icons) {
                    const iconText = icon.textContent.trim();
                    if (iconText === 'undo') {
                      return true;
                    }
                  }
                  
                  // Check text content in span
                  for (const span of spans) {
                    const spanText = span.textContent.toLowerCase();
                    if (spanText.includes('sử dụng lại câu lệnh') || spanText.includes('use command')) {
                      return true;
                    }
                  }
                  
                  return false;
                });
                
                if (useAgainBtn) {
                  useAgainBtn.click();
                  return { found: true };
                }
                
                return { found: false };
              });
              
              if (useAgainResult.found) {
                console.log(`✅ Clicked 'Use Again' button (${useAgainAttempt}/${maxUseAgainRetries})`);
                await this.page.waitForTimeout(2000);
                
                // 💫 NEW: Focus and add spaces
                console.log(`📝 Focusing textbox and adding spaces...`);
                const textboxSelector = '.iTYalL[role="textbox"][data-slate-editor="true"]';
                await this.page.focus(textboxSelector);
                await this.page.waitForTimeout(300);
                
                // Add spaces
                for (let i = 0; i < 3; i++) {
                  await this.page.keyboard.press('Space');
                  await this.page.waitForTimeout(100);
                }
                
                // Wait 3 seconds
                console.log(`⏳ Waiting 3 seconds for input processing...`);
                await this.page.waitForTimeout(3000);
                
                // 💫 FIX: Submit by pressing Enter key (not looking for submit button)
                console.log(`📤 Submitting with Enter key...`);
                await this.page.keyboard.press('Enter');
                console.log(`✅ Submitted after 'Use Again' (${useAgainAttempt}/${maxUseAgainRetries})`);
                await this.page.waitForTimeout(3000);
                continue;
              } else {
                console.log(`⚠️  'Use Again' button not found`);
              }
            }
            
            // 💫 NEW: Strategy 3 after all "Use Again" attempts fail - Full rehash
            if (errorRetryCount > MAX_SIMPLE_RETRIES + 1) {
              console.log(`🔄 [Strategy 3] All 'Use Again' attempts failed, need full rehash regeneration...`);
              // Return error so main flow triggers handleGenerationFailureRetry (full recovery)
              return { success: false, error: 'Use Again recovery failed, triggering full rehash' };
            }
            
          } catch (e) {
            console.log(`❌ Error during recovery strategy: ${e.message}`);
          }
          
          // If all Use Again attempts exhausted, need full rehash
          if (errorRetryCount > MAX_SIMPLE_RETRIES + 1) {
            console.log(`❌ ERROR: 'Use Again' recovery exhausted (attempt ${errorRetryCount}), need full rehash`);
            return { success: false, error: 'Use Again recovery exhausted, triggering full rehash' };
          }
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

        // 💫 Handle partial success (some images generated, others failed)
        if (effectiveStatus === 'partial-ready') {
          console.log(`⚠️  Partial success: Some images generated, others may have failed`);
          
          if (this.preGenerationMonitor) {
            const partialResult = await this.preGenerationMonitor.findNewHref();
            if (partialResult && partialResult.href) {
              console.log(`   📊 Returning partial success: ${partialResult.newCount}/${expectedNewHrefs} image(s)`);
              console.log(`      Will download ${partialResult.newCount} images, can retry for remaining ${expectedNewHrefs - partialResult.newCount}`);
              return { 
                success: true,  // 💫 Consider it success since we have some images
                href: partialResult.href, 
                partial: true,
                found: partialResult.newCount,
                expected: expectedNewHrefs
              };
            }
          }
          
          console.warn('⚠️  Could not retrieve partial images');
          return { success: false, href: null, partial: true, found: 0 };
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
          if (finalCheck && finalCheck.newCount >= expectedNewHrefs) {
            console.log(`✅ SUCCESS: ${finalCheck.newCount}/${expectedNewHrefs} new href${expectedNewHrefs > 1 ? 's' : ''} found, generation completed (despite timeout/status detection failure)`);
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
   * 💫 NEW: Delete all failed/unsuccessful items before retry
   * Scans for items with error indicators (warning icon + "Không thành công")
   * Clicks trash/delete button for each failed item
   * 
   * @returns {number} Number of items deleted
   */
  async deleteFailedItems() {
    try {
      console.log('🗑️  Scanning for failed items to delete...');
      
      // Repeat deletion until no more failed items found
      let totalDeleted = 0;
      let deleteAttempt = 0;
      const maxDeleteAttempts = 10;  // Safety limit
      
      while (deleteAttempt < maxDeleteAttempts) {
        deleteAttempt++;
        
        // Find first failed item with error indicators
        const failureInfo = await this.page.evaluate(() => {
          const items = document.querySelectorAll('[data-testid="virtuoso-item-list"] [data-tile-id]');
          
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const tileText = item.textContent.toLowerCase();
            
            // 💫 Look for error indicators: warning icon + "Không thành công" text
            const warningIcon = item.querySelector('i.google-symbols');
            const hasWarningIcon = warningIcon && warningIcon.textContent.trim() === 'warning';
            const hasErrorText = tileText.includes('không thành công') || 
                                 tileText.includes('đã xảy ra lỗi') ||
                                 tileText.includes('failed');
            
            if (hasWarningIcon && hasErrorText) {
              // Found failed item - find delete/trash button
              const buttons = Array.from(item.querySelectorAll('button'));
              
              for (const btn of buttons) {
                const icon = btn.querySelector('i.google-symbols');
                if (icon && (icon.textContent.trim() === 'delete' || icon.textContent.trim() === 'close' || icon.textContent.trim() === 'trash')) {
                  // Found delete button
                  const rect = btn.getBoundingClientRect();
                  return {
                    found: true,
                    position: i,
                    x: Math.round(rect.left + rect.width / 2),
                    y: Math.round(rect.top + rect.height / 2),
                    error: item.textContent.substring(0, 80)
                  };
                }
              }
              
              // If no delete button found but error exists, try clicking any close/delete icon in item
              const allButtons = Array.from(item.querySelectorAll('button'));
              for (const btn of allButtons) {
                const icon = btn.querySelector('i.google-symbols');
                if (icon) {
                  const iconText = icon.textContent.trim();
                  if (iconText === 'close' || iconText === 'delete' || iconText === 'clear') {
                    const rect = btn.getBoundingClientRect();
                    return {
                      found: true,
                      position: i,
                      x: Math.round(rect.left + rect.width / 2),
                      y: Math.round(rect.top + rect.height / 2),
                      error: item.textContent.substring(0, 80)
                    };
                  }
                }
              }
            }
          }
          
          return { found: false };
        });
        
        if (!failureInfo.found) {
          console.log(`✅ No more failed items found (deleted ${totalDeleted} total)`);
          return totalDeleted;
        }
        
        // Click delete button
        console.log(`   [DELETE ${deleteAttempt}] Found failed item #${failureInfo.position + 1}: \"${failureInfo.error}...\")`);
        console.log(`   🖱️  Clicking delete button...`);
        
        try {
          // Move to button and click
          await this.page.mouse.move(failureInfo.x, failureInfo.y);
          await this.page.waitForTimeout(200);
          await this.page.mouse.click(failureInfo.x, failureInfo.y);
          await this.page.waitForTimeout(1000);  // Wait for item to be deleted
          
          totalDeleted++;
          console.log(`   ✅ Deleted failed item #${failureInfo.position + 1}`);
        } catch (clickError) {
          console.warn(`   ⚠️  Failed to click delete button: ${clickError.message}`);
          // Try keyboard delete
          try {
            await this.page.keyboard.press('Delete');
            await this.page.waitForTimeout(500);
            console.log(`   ✅ Deleted via keyboard Delete key`);
            totalDeleted++;
          } catch (keyError) {
            console.warn(`   ⚠️  Keyboard delete also failed, skipping this item`);
            break;  // Exit to avoid infinite loop
          }
        }
      }
      
      console.log(`🗑️  Deletion complete: ${totalDeleted} failed items removed`);
      return totalDeleted;
      
    } catch (error) {
      console.error(`❌ Error deleting failed items: ${error.message}`);
      return 0;
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
