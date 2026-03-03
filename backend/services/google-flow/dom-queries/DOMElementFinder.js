/**
 * DOMElementFinder.js
 * 
 * Unified utility for finding elements in DOM across Google Flow interface
 * Consolidates all element queries (findByText, findBySelector, etc.) into one place
 * 
 * Flow: Query virtuoso list → Find elements by text → Get coordinates → Return position data
 * Used by: UI controls, event handlers, element interaction helpers
 */

export class DOMElementFinder {
  /**
   * Find elements by partial text match (case-insensitive)
   * @param {string} searchText - Text to search for
   * @param {string} selector - CSS selector to search within (default: all elements)
   * @param {boolean} exactMatch - Match exact text or partial
   * @returns {Array<Object>} - Array of {element, text, position}
   */
  static findElementsByText(searchText, selector = '*', exactMatch = false) {
    return this.page.evaluate((text, sel, exact) => {
      const results = [];
      const elements = document.querySelectorAll(sel);
      
      for (const el of elements) {
        const elementText = el.textContent.toLowerCase();
        const searchLower = text.toLowerCase();
        
        const matches = exact ? elementText === searchLower : elementText.includes(searchLower);
        if (matches) {
          const rect = el.getBoundingClientRect();
          results.push({
            text: el.textContent.trim().substring(0, 100),
            x: Math.round(rect.left + rect.width / 2),
            y: Math.round(rect.top + rect.height / 2),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            visible: el.offsetParent !== null,
            element: el
          });
        }
      }
      
      return results;
    }, searchText, selector, exactMatch);
  }

  /**
   * Find single element by text (returns first match)
   * @param {string} searchText - Text to search for
   * @param {string} selector - CSS selector to search within
   * @returns {Object|null} - Element position data or null
   */
  static async findElementByText(searchText, selector = '*') {
    const results = await this.findElementsByText(searchText, selector, false);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Find element by CSS selector and verify it exists
   * @param {string} selector - CSS selector
   * @returns {Object|null} - Position data or null if not found
   */
  static async getElementPosition(selector) {
    return this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      
      const rect = el.getBoundingClientRect();
      return {
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        visible: el.offsetParent !== null
      };
    }, selector);
  }

  /**
   * Find all buttons with specific text/icon pattern
   * Used for: action buttons (Submit, Generate, etc.)
   * @param {string} text - Button text to find
   * @returns {Object|null}
   */
  static async findButton(text) {
    return this.page.evaluate((buttonText) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      
      for (const btn of buttons) {
        const btnText = btn.textContent.toLowerCase();
        if (btnText.includes(buttonText.toLowerCase()) && btn.offsetParent !== null) {
          const rect = btn.getBoundingClientRect();
          return {
            x: Math.round(rect.left + rect.width / 2),
            y: Math.round(rect.top + rect.height / 2),
            disabled: btn.disabled,
            text: btn.textContent.trim()
          };
        }
      }
      
      return null;
    }, text);
  }

  /**
   * Wait for element to appear in DOM with timeout
   * @param {string} selector - CSS selector
   * @param {number} timeoutMs - Max wait time
   * @returns {boolean} - True if found, false if timeout
   */
  static async waitForElement(selector, timeoutMs = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const exists = await this.page.evaluate((sel) => {
        return !!document.querySelector(sel);
      }, selector);
      
      if (exists) return true;
      await this.page.waitForTimeout(500);
    }
    
    return false;
  }

  /**
   * Check if element is visible on page
   * @param {string} selector - CSS selector
   * @returns {boolean}
   */
  static async isVisible(selector) {
    return this.page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el && el.offsetParent !== null;
    }, selector);
  }

  /**
   * Count elements matching selector
   * @param {string} selector - CSS selector
   * @returns {number}
   */
  static async countElements(selector) {
    return this.page.evaluate((sel) => {
      return document.querySelectorAll(sel).length;
    }, selector);
  }
}

export default DOMElementFinder;
