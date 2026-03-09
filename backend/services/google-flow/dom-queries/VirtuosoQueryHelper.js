/**
 * VirtuosoQueryHelper.js
 * 
 * Consolidated util for querying virtuoso list (Google Flow generated items)
 * CONSOLIDATES: getHrefsFromVirtuosoList, findNewHref, findHrefByPosition, findGeneratedImage
 * 
 * Flow: Query page → Extract hrefs/hashes → Filter by position/status → Return results
 * Used by: Generation monitor, image finder, href tracking
 */

export class VirtuosoQueryHelper {
  static normalizeTileText(text = '') {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Get all hrefs from virtuoso list (generated items)
   * @param {Object} page - Puppeteer page object
   * @param {Object} filterOptions - {excludeLoading, excludeError, includeOnlyNew}
   * @returns {Array<string>} - Array of hrefs
   */
  static async getHrefsFromVirtuosoList(page, filterOptions = {}) {
    return page.evaluate((options) => {
      const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
      const hrefs = [];
      
      for (const link of links) {
        const href = link.getAttribute('href');
        if (!href) continue;
        
        const parent = link.closest('[data-tile-id]');
        const parentText = (parent?.textContent || '').toLowerCase();
        
        // Skip loading items if requested (have %)
        if (options.excludeLoading && parentText.includes('%')) continue;
        
        // Skip error items if requested (have 'Không thành công')
        if (options.excludeError && parentText.includes('không thành công')) continue;
        
        hrefs.push(href);
      }
      
      return hrefs;
    }, filterOptions);
  }

  /**
   * Find NEW hrefs not in previous set
   * @param {Object} page - Puppeteer page object
   * @param {Array<string>} previousHrefs - Known hrefs to exclude (as array, not Set)
   * @returns {Array<Object>} - Array of {href, isNew, position}
   */
  static async findNewHrefs(page, previousHrefs) {
    return page.evaluate((prevArray) => {
      const newItems = [];
      const links = Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]'));
      
      links.forEach((link, position) => {
        const href = link.getAttribute('href');
        // Use array.includes() instead of set.has() - works with JSON-serializable data
        if (href && !prevArray.includes(href)) {
          const parent = link.closest('[data-tile-id]');
          newItems.push({
            href,
            position,
            isNew: true,
            tileId: parent?.getAttribute('data-tile-id') || null
          });
        }
      });
      
      return newItems;
    }, previousHrefs);  // Pass array directly, not as new Set()
  }

  /**
   * Get item at specific position in virtuoso list
   * @param {Object} page - Puppeteer page object
   * @param {number} position - Position index (0 = first/newest)
   * @returns {string|null} - href of item at position
   */
  static async getHrefByPosition(page, position) {
    return page.evaluate((pos) => {
      const links = Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]'));
      if (position < 0 || position >= links.length) return null;
      return links[pos].getAttribute('href');
    }, position);
  }

  /**
   * Find generated image item (has image preview thumbnail)
   * @param {Object} page - Puppeteer page object
   * @returns {Object|null} - {href, thumbnail, dimensions}
   */
  static async findGeneratedImageItem(page) {
    return page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]'));
      
      for (const link of links) {
        const img = link.querySelector('img');
        if (img && img.src && !img.src.includes('placeholder')) {
          const rect = img.getBoundingClientRect();
          return {
            href: link.getAttribute('href'),
            thumbnailUrl: img.src,
            width: img.width,
            height: img.height,
            itemRect: {
              x: Math.round(rect.left),
              y: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            }
          };
        }
      }
      
      return null;
    });
  }

  /**
   * Get item count in virtuoso list
   * @param {Object} page - Puppeteer page object
   * @returns {number}
   */
  static async getItemCount(page) {
    return page.evaluate(() => {
      return Array.from(document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]')).length;
    });
  }

  /**
   * Check if item exists with href in virtuoso
   * @param {Object} page - Puppeteer page object
   * @param {string} href - Href to find
   * @returns {boolean}
   */
  static async hrefExists(page, href) {
    return page.evaluate((targetHref) => {
      const links = document.querySelectorAll('[data-testid="virtuoso-item-list"] a[href]');
      return Array.from(links).some(link => link.getAttribute('href') === targetHref);
    }, href);
  }

  /**
   * Get all tile data with detailed status
   * @param {Object} page - Puppeteer page object
   * @returns {Array<Object>}
   */
  static async getAllTileData(page) {
    return page.evaluate(() => {
      const tiles = [];
      const allTiles = document.querySelectorAll('[data-testid="virtuoso-item-list"] [data-tile-id]');
      
      for (const tile of allTiles) {
        const link = tile.querySelector('a[href]');
        const tileText = (tile.textContent || '').toLowerCase();
        const hasError = tileText.includes('không thành công') && !tileText.includes('%');
        const isLoading = tileText.includes('%');
        const buttonCount = tile.querySelectorAll('button').length;
        
        tiles.push({
          tileId: tile.getAttribute('data-tile-id'),
          href: link?.getAttribute('href') || null,
          hasLink: !!link,
          hasError,
          isLoading,
          buttonCount,
          text: tileText.substring(0, 100)
        });
      }
      
      return tiles;
    });
  }

  /**
   * Get a richer snapshot of visible virtuoso tiles.
   * Useful for upload detection where href/img may appear at different times.
   */
  static async getVisibleTileSnapshots(page, options = {}) {
    return page.evaluate((opts) => {
      const limit = Number.isFinite(opts?.limit) ? opts.limit : 20;
      const allTiles = Array.from(
        document.querySelectorAll('[data-testid="virtuoso-item-list"] [data-tile-id]')
      ).slice(0, limit);

      const normalize = (value = '') =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .trim();

      return allTiles.map((tile, idx) => {
        const link = tile.querySelector('a[href]');
        const img = tile.querySelector('img');
        const video = tile.querySelector('video');
        const text = normalize((tile.textContent || '').trim());
        const href = link?.getAttribute('href') || null;
        const tileId = tile.getAttribute('data-tile-id') || null;
        const hasProgress = /\b\d{1,3}%\b/.test(text);
        const hasErrorText = /khong thanh cong|failed|error|try again|warning/.test(text);

        return {
          idx,
          tileId,
          href,
          hasLink: !!link,
          hasImg: !!img,
          hasVideo: !!video,
          imgSrc: img?.getAttribute('src') || null,
          videoSrc: video?.getAttribute('src') || null,
          text,
          isLoading: hasProgress,
          hasError: hasErrorText && !hasProgress
        };
      });
    }, options);
  }
}

export default VirtuosoQueryHelper;
