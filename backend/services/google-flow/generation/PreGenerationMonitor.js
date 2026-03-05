/**
 * PreGenerationMonitor - Captures href baseline BEFORE generation starts
 * 
 * Purpose:
 * - After upload completes: capture all current hrefs (baseline = uploads + any existing)
 * - Before submit prompt: refresh baseline capture (to ensure accurate comparison)
 * - During generation: GenerationMonitor finds hrefs NOT in this baseline
 * 
 * This ensures:
 * 1. Upload monitoring knows when 2 new uploads appear
 * 2. Generation monitoring correctly isolates NEW generated hrefs
 * 3. Distinction between uploaded originals and generated output
 * 
 * @example
 * const preGen = new PreGenerationMonitor(page);
 * 
 * // After upload step
 * await preGen.captureBaselineHrefs(); // Stores all current hrefs
 * 
 * // Before submit prompt
 * await preGen.refreshBaseline(); // Update to catch any page changes
 * 
 * // During generation monitoring
 * const newHref = await preGen.findNewHref(); // Find href NOT in baseline
 */

import { VirtuosoQueryHelper } from '../index.js';

class PreGenerationMonitor {
  constructor(page, options = {}) {
    this.page = page;
    this.options = options;
    this.baselineHrefs = new Set(); // Hrefs that exist BEFORE generation
  }

  /**
   * Capture current state of virtuoso list as baseline
   * Call this:
   * - After upload completes (knows we have 2 new items)
   * - Before submit prompt (final snapshot before generation)
   */
  async captureBaselineHrefs() {
    try {
      // � DEBUG: First check if selector exists at all
      const selectorExists = await this.page.evaluate(() => {
        return !!document.querySelector('[data-testid="virtuoso-item-list"]');
      });
      
      if (!selectorExists) {
        console.log(`   ⚠️  [BASELINE] Selector [data-testid="virtuoso-item-list"] NOT FOUND`);
      }
      
      // 💫 ENHANCED: Check both href AND img/video tags for stricter detection
      // Only count items that have both href and media tag (img or video) present
      // 💫 VIRTUALIZATION FIX: Only check first 15 items (tail items disappear in virtuoso)
      const items = await this.page.evaluate(() => {
        const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
        const firstLinks = Array.from(links).slice(0, 15);  // Only first 15
        return firstLinks.map(link => {
          const href = link.getAttribute('href');
          const img = link.querySelector('img');
          const video = link.querySelector('video');
          const hasImg = !!img;
          const hasVideo = !!video;
          const hasMediaTag = hasImg || hasVideo;
          const mediaType = hasVideo ? 'video' : (hasImg ? 'image' : 'unknown');
          return { href, hasImg, hasVideo, hasMediaTag, mediaType };
        }).filter(item => item.href);
      });
      
      // Store items with both href and media tag (img or video), or all hrefs for comparison
      this.baselineHrefs = new Set(items.map(item => item.href));
      const imgCount = items.filter(i => i.hasImg).length;
      const videoCount = items.filter(i => i.hasVideo).length;
      const noMediaCount = items.filter(i => !i.hasMediaTag).length;
      
      console.log(`   📸 [BASELINE] Captured: ${items.length} items`);
      console.log(`      - ${imgCount} images (with <img> tag)`);
      console.log(`      - ${videoCount} videos (with <video> tag)`);
      console.log(`      - ${noMediaCount} items without media tag`);
      
      // Log each item for debugging
      items.forEach((item, idx) => {
        const icon = item.hasVideo ? '🎬' : (item.hasImg ? '📸' : '❓');
        const mediaInfo = item.hasMediaTag ? `${item.mediaType}` : 'no-media';
        console.log(`      [${idx}] ${icon} ${mediaInfo.padEnd(8)} | ${item.href.substring(0, 70)}...`);
      });
      
      return items;
    } catch (error) {
      console.error(`❌ [BASELINE] Error capturing baseline: ${error.message}`);
      return [];
    }
  }

  /**
   * Refresh baseline capture (call before generation to account for any page reloads)
   */
  async refreshBaseline() {
    try {
      console.log('   🔄 Refreshing baseline...');
      const hrefs = await this.captureBaselineHrefs();
      console.log(`   ✅ Baseline refreshed: ${hrefs.length} hrefs`);
      return hrefs;
    } catch (error) {
      console.error(`❌ Error refreshing baseline: ${error.message}`);
      return [];
    }
  }

  /**
   * Find newly generated image by comparing against baseline
   * Returns first href that was NOT in baseline AND has an img tag (strict check)
   * 
   * @returns {Object|null} - {href, position, hasImg} or null if not found
   */
  async findNewHref() {
    try {
      // 💫 FIX: Convert Set to Array before passing to page.evaluate()
      // Sets don't serialize - need to pass as array and reconstruct in evaluate()
      const baselineArray = Array.from(this.baselineHrefs);
      
      const result = await this.page.evaluate((baselineArray) => {
        // Reconstruct Set from array inside evaluate()
        const baseline = new Set(baselineArray);
        
        // 💫 ENHANCED: Check BOTH href AND img tags for stricter detection
        // 💫 VIRTUALIZATION FIX: Only check first 15 items
        const items = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
        const firstItems = Array.from(items).slice(0, 15);  // Only first 15
        const allItems = [];
        
        // Collect ALL items with href and media tag (img or video) status for analysis
        for (let i = 0; i < firstItems.length; i++) {
          const link = firstItems[i];
          const href = link.getAttribute('href');
          if (href) {
            const img = link.querySelector('img');
            const video = link.querySelector('video');
            const hasImg = !!img;
            const hasVideo = !!video;
            const hasMediaTag = hasImg || hasVideo;
            const mediaType = hasVideo ? 'video' : (hasImg ? 'image' : 'unknown');
            allItems.push({
              href,
              hasImg,
              hasVideo,
              hasMediaTag,
              mediaType,
              position: i,
              isNew: !baseline.has(href)
            });
          }
        }
        
        // Find first NEW item with BOTH href and media tag (img or video - strict mode)
        const newHref = allItems.find(item => item.isNew && item.hasMediaTag);
        
        // Count strict vs loose
        const strictNewCount = allItems.filter(item => item.isNew && item.hasMediaTag).length;
        const looseNewCount = allItems.filter(item => item.isNew).length;
        
        return {
          allItems,
          newHref: newHref || null,
          totalItems: firstItems.length,  // Limited to first 15
          baselineCount: baseline.size,
          strictNewCount,  // New items with BOTH href + img
          looseNewCount    // New items with just href
        };
      }, baselineArray);  // 💫 Pass array instead of Set
      
      if (result) {
        // 💫 ENHANCED: Detailed logging with href+media tag validation (img or video)
        console.log(`   📊 GENERATION MONITOR - HREF+MEDIA TAG ANALYSIS:`);
        console.log(`      Total items on page: ${result.totalItems}`);
        console.log(`      Baseline size: ${result.baselineCount}`);
        
        // Count by category
        const existingCount = result.allItems.filter(i => !i.isNew).length;
        const newWithMediaCount = result.strictNewCount;  // New + has img or video
        const newWithoutMediaCount = result.looseNewCount - result.strictNewCount;  // New but no media tag
        const newImages = result.allItems.filter(i => i.isNew && i.hasImg).length;
        const newVideos = result.allItems.filter(i => i.isNew && i.hasVideo).length;
        console.log(`      Existing items: ${existingCount}`);
        console.log(`      New items (with media): ${newWithMediaCount} (${newImages} images, ${newVideos} videos)`);
        console.log(`      New items (no media): ${newWithoutMediaCount}`);

        if (result.newHref) {
          const mediaType = result.newHref.hasVideo ? 'VIDEO' : 'IMAGE';
          const mediaIcon = result.newHref.hasVideo ? '🎬' : '📸';
          console.log(`   ✅ FOUND NEW ${mediaType} (href + media tag):`);
          console.log(`      Position: ${result.newHref.position}`);
          console.log(`      Type: ${mediaIcon} ${mediaType}`);
          console.log(`      Has img: ${result.newHref.hasImg ? '✓' : '✗'}`);
          console.log(`      Has video: ${result.newHref.hasVideo ? '✓' : '✗'}`);
          console.log(`      URL: ${result.newHref.href.substring(0, 80)}`);
          return {
            href: result.newHref.href,
            hasImg: result.newHref.hasImg,
            hasVideo: result.newHref.hasVideo,
            mediaType: result.newHref.mediaType,
            position: result.newHref.position,
            totalItems: result.totalItems,
            newCount: result.strictNewCount,      // 💫 STRICT: Only count items with both href + media tag
            existingCount,
            newCountLoose: result.looseNewCount,  // For debugging
            newHrefs: result.allItems.filter(i => i.isNew && i.hasMediaTag).map(i => i.href)
          };
        } else {
          console.log(`   ⏳ No new media found yet (checking for href + media tag both present)`);
          if (result.looseNewCount > 0) {
            console.log(`      ⚠️  Note: ${result.looseNewCount} new href(s) found but missing media tag (img or video)`);
          }
          // 💫 STRICT: Return strict count (items with both href + media tag)
          return {
            href: null,
            newCount: result.strictNewCount,  // 💫 STRICT COUNT
            existingCount,
            totalItems: result.totalItems,
            newCountLoose: result.looseNewCount,
            newHrefs: result.allItems.filter(i => i.isNew && i.hasMediaTag).map(i => i.href)
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Error finding new href: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all current hrefs with img status (for debugging)
   */
  async getCurrentHrefs() {
    try {
      // 💫 ENHANCED: Include img tag presence in debug output
      const current = await this.page.evaluate(() => {
        const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
        return Array.from(links).map((link, i) => {
          const href = link.getAttribute('href');
          const img = link.querySelector('img');
          const hasImg = !!img;
          return {
            position: i,
            href,
            hasImg,
            imgStatus: hasImg ? '✓' : '✗'
          };
        });
      });
      
      return current;
    } catch (error) {
      console.error(`❌ Error getting current hrefs: ${error.message}`);
      return [];
    }
  }

  /**
   * Get baseline hrefs (for debugging/logging)
   */
  getBaseline() {
    return Array.from(this.baselineHrefs);
  }

  /**
   * Clear baseline (if needed to reset state)
   */
  clearBaseline() {
    this.baselineHrefs.clear();
    console.log('   🧹 Baseline cleared');
  }
}

export default PreGenerationMonitor;
