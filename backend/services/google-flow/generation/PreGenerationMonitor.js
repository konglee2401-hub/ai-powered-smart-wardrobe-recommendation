/**
 * PreGenerationMonitor - Captures href baseline BEFORE generation starts.
 *
 * Tracks Flow tiles by `data-tile-id` and only considers `/edit/` links so
 * we don't accidentally treat policy/help links as generated media.
 */

import { VirtuosoQueryHelper } from '../index.js';

class PreGenerationMonitor {
  constructor(page, options = {}) {
    this.page = page;
    this.options = options;
    this.baselineHrefs = new Set();
    this.verbose = options.verbose === true;
  }

  async captureBaselineHrefs() {
    try {
      const selectorExists = await this.page.evaluate(() => {
        return !!document.querySelector('[data-testid="virtuoso-item-list"]');
      });

      if (!selectorExists && this.verbose) {
        console.log('   [BASELINE] Selector [data-testid="virtuoso-item-list"] not found');
      }

      const items = await this.page.evaluate(() => {
        const tiles = Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] [data-tile-id]'));
        const uniqueItems = new Map();

        for (const [index, tile] of tiles.entries()) {
          const link = tile.querySelector('a[href*="/edit/"]');
          if (!link) {
            continue;
          }

          const href = link.getAttribute('href');
          if (!href || !href.includes('/edit/')) {
            continue;
          }

          const rect = tile.getBoundingClientRect();
          const visible = rect.width > 0 && rect.height > 0;
          if (!visible || uniqueItems.has(href)) {
            continue;
          }

          const tileText = (tile.textContent || '').replace(/\s+/g, ' ').trim();
          const iconTexts = Array.from(tile.querySelectorAll('i.google-symbols, i.material-icons'))
            .map((node) => (node.textContent || '').trim().toLowerCase());
          const videoEl = tile.querySelector('video[src], video');
          const imgEl = tile.querySelector('img[src]');
          const hasVideo = !!videoEl || iconTexts.includes('videocam') || iconTexts.includes('play_circle');
          const hasImg = !!imgEl;
          const hasWarning = iconTexts.includes('warning') || /kh�ng th�nh c�ng|d� x?y ra l?i|failed/i.test(tileText);
          const hasProgress = /\b\d+%\b/.test(tileText) || !!tile.querySelector('[role="progressbar"], [class*="progress"]');

          uniqueItems.set(href, {
            href,
            hasImg,
            hasVideo,
            hasMediaTag: hasImg || hasVideo,
            mediaType: hasVideo ? 'video' : (hasImg ? 'image' : 'unknown'),
            position: index,
            visible,
            label: tileText.slice(0, 120),
            hasWarning,
            hasProgress,
            isDownloadReady: (hasImg || hasVideo) && !hasWarning && !hasProgress
          });
        }

        return Array.from(uniqueItems.values()).slice(0, 30);
      });

      this.baselineHrefs = new Set(items.map((item) => item.href));
      const imgCount = items.filter((item) => item.hasImg && !item.hasVideo).length;
      const videoCount = items.filter((item) => item.hasVideo).length;
      const noMediaCount = items.filter((item) => !item.hasMediaTag).length;

      if (this.verbose) {
        console.log(`   [BASELINE] Captured ${items.length} items (${imgCount} images, ${videoCount} videos, ${noMediaCount} without media tag)`);
      }

      return items;
    } catch (error) {
      console.error(`Error capturing baseline: ${error.message}`);
      return [];
    }
  }

  async refreshBaseline() {
    try {
      if (this.verbose) {
        console.log('   Refreshing baseline...');
      }
      const hrefs = await this.captureBaselineHrefs();
      if (this.verbose) {
        console.log(`   Baseline refreshed: ${hrefs.length} hrefs`);
      }
      return hrefs;
    } catch (error) {
      console.error(`Error refreshing baseline: ${error.message}`);
      return [];
    }
  }

  async findNewHref() {
    try {
      const baselineArray = Array.from(this.baselineHrefs);

      const result = await this.page.evaluate((baselineArray, preferredMediaType) => {
        const baseline = new Set(baselineArray);
        const tiles = Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] [data-tile-id]'));
        const uniqueItems = new Map();

        for (const [index, tile] of tiles.entries()) {
          const link = tile.querySelector('a[href*="/edit/"]');
          if (!link) {
            continue;
          }

          const href = link.getAttribute('href');
          if (!href || !href.includes('/edit/')) {
            continue;
          }

          const rect = tile.getBoundingClientRect();
          const visible = rect.width > 0 && rect.height > 0;
          if (!visible || uniqueItems.has(href)) {
            continue;
          }

          const tileText = (tile.textContent || '').replace(/\s+/g, ' ').trim();
          const iconTexts = Array.from(tile.querySelectorAll('i.google-symbols, i.material-icons'))
            .map((node) => (node.textContent || '').trim().toLowerCase());
          const videoEl = tile.querySelector('video[src], video');
          const imgEl = tile.querySelector('img[src]');
          const hasVideo = !!videoEl || iconTexts.includes('videocam') || iconTexts.includes('play_circle');
          const hasImg = !!imgEl;
          const hasWarning = iconTexts.includes('warning') || /kh�ng th�nh c�ng|d� x?y ra l?i|failed/i.test(tileText);
          const hasProgress = /\b\d+%\b/.test(tileText) || !!tile.querySelector('[role="progressbar"], [class*="progress"]');

          uniqueItems.set(href, {
            href,
            hasImg,
            hasVideo,
            hasMediaTag: hasImg || hasVideo,
            mediaType: hasVideo ? 'video' : (hasImg ? 'image' : 'unknown'),
            position: index,
            isNew: !baseline.has(href),
            label: tileText.slice(0, 160),
            hasWarning,
            hasProgress,
            isDownloadReady: (hasImg || hasVideo) && !hasWarning && !hasProgress
          });
        }

        const allItems = Array.from(uniqueItems.values()).slice(0, 30);
        const strictCandidates = allItems.filter((item) => item.isNew && item.isDownloadReady && (preferredMediaType === 'video' ? item.hasVideo : item.hasMediaTag));
        const looseCandidates = allItems.filter((item) => item.isNew && !item.hasWarning);
        const pendingCandidates = allItems.filter((item) => item.isNew && !item.hasWarning && !item.isDownloadReady);

        let bestNewHref = strictCandidates[0] || looseCandidates[0] || null;
        let fallbackMatched = false;

        if (!bestNewHref && preferredMediaType === 'video') {
          const videos = Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] video[src]'));
          for (const video of videos) {
            const tile = video.closest('[data-tile-id]');
            const link = tile?.querySelector('a[href*="/edit/"]');
            const href = link?.getAttribute('href');
            const tileText = (tile?.textContent || '').replace(/\s+/g, ' ').trim();
            const iconTexts = Array.from(tile?.querySelectorAll('i.google-symbols, i.material-icons') || [])
              .map((node) => (node.textContent || '').trim().toLowerCase());
            const hasWarning = iconTexts.includes('warning') || /kh�ng th�nh c�ng|d� x?y ra l?i|failed/i.test(tileText);
            const hasProgress = /\b\d+%\b/.test(tileText) || !!tile?.querySelector('[role="progressbar"], [class*="progress"]');
            if (href && href.includes('/edit/') && !baseline.has(href) && !hasWarning && !hasProgress) {
              bestNewHref = {
                href,
                hasImg: !!tile.querySelector('img[src]'),
                hasVideo: true,
                hasMediaTag: true,
                mediaType: 'video',
                position: allItems.findIndex((item) => item.href === href),
                isNew: true,
                label: tileText.slice(0, 160),
                hasWarning,
                hasProgress,
                isDownloadReady: true
              };
              fallbackMatched = true;
              break;
            }
          }
        }

        return {
          allItems,
          newHref: bestNewHref,
          totalItems: allItems.length,
          baselineCount: baseline.size,
          strictNewCount: strictCandidates.length,
          looseNewCount: looseCandidates.length,
          pendingNewCount: pendingCandidates.length,
          pendingItems: pendingCandidates.slice(0, 5),
          fallbackMatched
        };
      }, baselineArray, this.options.preferredMediaType || 'image');

      if (!result) {
        return null;
      }

      const existingCount = result.allItems.filter((item) => !item.isNew).length;
      const newWithMediaCount = result.strictNewCount;
      const newWithoutMediaCount = result.looseNewCount - result.strictNewCount;
      const newImages = result.allItems.filter((item) => item.isNew && item.hasImg && !item.hasVideo).length;
      const newVideos = result.allItems.filter((item) => item.isNew && item.hasVideo).length;
      if (this.verbose) {
        console.log(`   [BASELINE] Tile analysis: total=${result.totalItems}, baseline=${result.baselineCount}, existing=${existingCount}, withMedia=${newWithMediaCount}, pending=${result.pendingNewCount || 0}`);
        if (result.fallbackMatched) {
          console.log('   [BASELINE] Fallback matched a video[src] tile directly');
        }
      }

      if (result.newHref) {
        const mediaType = result.newHref.hasVideo ? 'VIDEO' : (result.newHref.hasImg ? 'IMAGE' : 'HREF-ONLY');
        if (this.verbose) {
          console.log(`   [BASELINE] Found new ${mediaType.toLowerCase()} at position ${result.newHref.position}: ${result.newHref.href.substring(0, 80)}`);
        }
        return {
          href: result.newHref.href,
          hasImg: result.newHref.hasImg,
          hasVideo: result.newHref.hasVideo,
          mediaType: result.newHref.mediaType,
          position: result.newHref.position,
          totalItems: result.totalItems,
          newCount: result.strictNewCount > 0 ? result.strictNewCount : (result.looseNewCount > 0 ? 1 : 0),
          newCountStrict: result.strictNewCount,
          newCountPending: result.pendingNewCount || 0,
          existingCount,
          newCountLoose: result.looseNewCount,
          newHrefs: result.allItems.filter((item) => item.isNew).map((item) => item.href),
          pendingHrefs: (result.pendingItems || []).map((item) => item.href)
        };
      }

      console.log('   No new items found yet');
      return {
        href: null,
        newCount: result.strictNewCount > 0 ? result.strictNewCount : (result.looseNewCount > 0 ? 1 : 0),
        newCountStrict: result.strictNewCount,
        newCountPending: result.pendingNewCount || 0,
        existingCount,
        totalItems: result.totalItems,
        newCountLoose: result.looseNewCount,
        newHrefs: result.allItems.filter((item) => item.isNew).map((item) => item.href),
        pendingHrefs: (result.pendingItems || []).map((item) => item.href)
      };
    } catch (error) {
      console.error(`Error finding new href: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all current hrefs with img status (for debugging)
   */
  async getCurrentHrefs() {
    try {
      const current = await this.page.evaluate(() => {
        const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href*="/edit/"]');
        return Array.from(links).map((link, i) => {
          const href = link.getAttribute('href');
          const img = link.querySelector('img');
          const video = link.querySelector('video');
          return {
            position: i,
            href,
            hasImg: !!img,
            hasVideo: !!video
          };
        });
      });

      return current;
    } catch (error) {
      console.error(`Error getting current hrefs: ${error.message}`);
      return [];
    }
  }

  async findItemByHref(targetHref) {
    try {
      if (!targetHref) return null;

      const item = await this.page.evaluate((hrefToFind) => {
        const tiles = Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] [data-tile-id]'));
        const uniqueItems = [];
        const seen = new Set();

        for (const [index, tile] of tiles.entries()) {
          const link = tile.querySelector('a[href*="/edit/"]');
          if (!link) continue;

          const href = link.getAttribute('href');
          if (!href || !href.includes('/edit/') || seen.has(href)) continue;

          const rect = tile.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) continue;

          seen.add(href);
          const tileText = (tile.textContent || '').replace(/\s+/g, ' ').trim();
          uniqueItems.push({
            href,
            position: uniqueItems.length,
            domIndex: index,
            label: tileText.slice(0, 160),
            x: Math.round(rect.left + rect.width / 2),
            y: Math.round(rect.top + rect.height / 2)
          });
        }

        return uniqueItems.find((item) => item.href === hrefToFind) || null;
      }, targetHref);

      if (item) {
        console.log(`   [BASELINE] Matched href at position ${item.position}: ${item.href.substring(0, 80)}`);
      }

      return item;
    } catch (error) {
      console.error(`Error finding item by href: ${error.message}`);
      return null;
    }
  }

  getBaseline() {
    return Array.from(this.baselineHrefs);
  }

  clearBaseline() {
    this.baselineHrefs.clear();
    console.log('   Baseline cleared');
  }
}

export default PreGenerationMonitor;
