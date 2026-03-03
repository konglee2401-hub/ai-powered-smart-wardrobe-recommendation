/**
 * MouseInteractionHelper.js
 * 
 * Consolidated mouse interaction patterns (click, right-click, hover, drag)
 * CONSOLIDATES: clickMenuItemByText, clickElement, rightClickAndSelect patterns
 * 
 * Flow: Find element → Move mouse → Press button(s) → Verify state
 * Used by: UI controls, element interactions, menu operations
 */

export class MouseInteractionHelper {
  /**
   * Move mouse, click, and wait (universal click pattern)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {Object} options - {button, delay, verify}
   * @returns {boolean}
   */
  static async moveAndClick(x, y, options = {}) {
    const { button = 'left', delay = 50, verify = false } = options;
    
    console.log(`[MOUSE] 🖱️  Click at (${x}, ${y})`);
    
    try {
      await this.page.mouse.move(x, y);
      await this.page.waitForTimeout(100);
      
      await this.page.mouse.down({ button });
      await this.page.waitForTimeout(delay);
      await this.page.mouse.up({ button });
      
      if (verify) {
        // Check if element is still visible (didn't navigate away)
        await this.page.waitForTimeout(500);
        const pageExists = await this.page.evaluate(() => {
          return document.body.children.length > 0;
        });
        
        if (!pageExists) {
          console.warn('[MOUSE] ⚠️  Page may have navigated after click');
          return false;
        }
      }
      
      console.log('[MOUSE] ✅ Click complete');
      return true;
    } catch (error) {
      console.error(`[MOUSE] ❌ Click failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Right-click (equivalent to context menu)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} waitMs - Wait for context menu to appear
   * @returns {boolean}
   */
  static async rightClick(x, y, waitMs = 1000) {
    console.log(`[MOUSE] 🖱️  Right-click at (${x}, ${y})`);
    
    try {
      await this.page.mouse.move(x, y);
      await this.page.waitForTimeout(100);
      
      await this.page.mouse.up({ button: 'right' });
      await this.page.waitForTimeout(50);
      await this.page.mouse.down({ button: 'right' });
      
      console.log('[MOUSE] ✅ Right-click complete');
      await this.page.waitForTimeout(waitMs);
      return true;
    } catch (error) {
      console.error(`[MOUSE] ❌ Right-click failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Combined: Right-click → Wait for menu → Find item → Click
   * Use case: Download menu, context menus, action menus
   * @param {number} x - Right-click position X
   * @param {number} y - Right-click position Y
   * @param {string} menuItemText - Text to find in menu
   * @param {number} menuWaitMs - Wait for menu to appear
   * @returns {Object} - {success, itemPosition}
   */
  static async rightClickAndSelect(x, y, menuItemText, menuWaitMs = 2000) {
    console.log(`[MOUSE] 🔄 Right-click and select: "${menuItemText}"`);
    
    // Right-click
    const rightClickOk = await this.rightClick(x, y, menuWaitMs);
    if (!rightClickOk) return { success: false };
    
    // Find menu item
    const itemPos = await this.page.evaluate((text) => {
      const menuItems = document.querySelectorAll('[role="menuitem"]');
      
      for (const item of menuItems) {
        if (item.textContent.toLowerCase().includes(text.toLowerCase())) {
          const rect = item.getBoundingClientRect();
          return {
            x: Math.round(rect.left + rect.width / 2),
            y: Math.round(rect.top + rect.height / 2)
          };
        }
      }
      
      return null;
    }, menuItemText);
    
    if (!itemPos) {
      console.warn(`[MOUSE] ⚠️  Menu item not found: "${menuItemText}"`);
      return { success: false };
    }
    
    // Click menu item
    const clickOk = await this.moveAndClick(itemPos.x, itemPos.y);
    
    return {
      success: clickOk,
      itemPosition: itemPos
    };
  }

  /**
   * Hover over element (move mouse, don't click)
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} durationMs - How long to hover
   * @returns {boolean}
   */
  static async hover(x, y, durationMs = 500) {
    console.log(`[MOUSE] 🎯 Hover at (${x}, ${y}) for ${durationMs}ms`);
    
    try {
      await this.page.mouse.move(x, y);
      await this.page.waitForTimeout(durationMs);
      return true;
    } catch (error) {
      console.error(`[MOUSE] ❌ Hover failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Double-click operation
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean}
   */
  static async doubleClick(x, y) {
    console.log(`[MOUSE] 🖱️🖱️  Double-click at (${x}, ${y})`);
    
    try {
      await this.page.mouse.move(x, y);
      
      // First click
      await this.page.mouse.down();
      await this.page.waitForTimeout(50);
      await this.page.mouse.up();
      
      // Second click
      await this.page.waitForTimeout(100);
      await this.page.mouse.down();
      await this.page.waitForTimeout(50);
      await this.page.mouse.up();
      
      console.log('[MOUSE] ✅ Double-click complete');
      return true;
    } catch (error) {
      console.error(`[MOUSE] ❌ Double-click failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Drag from one point to another
   * @param {number} startX - Start X
   * @param {number} startY - Start Y
   * @param {number} endX - End X
   * @param {number} endY - End Y
   * @param {number} stepCount - Number of steps in drag
   * @returns {boolean}
   */
  static async drag(startX, startY, endX, endY, stepCount = 10) {
    console.log(`[MOUSE] 🎯 Drag from (${startX},${startY}) to (${endX},${endY})`);
    
    try {
      await this.page.mouse.move(startX, startY);
      await this.page.waitForTimeout(100);
      
      await this.page.mouse.down();
      
      const xStep = (endX - startX) / stepCount;
      const yStep = (endY - startY) / stepCount;
      
      for (let i = 0; i < stepCount; i++) {
        const x = startX + xStep * (i + 1);
        const y = startY + yStep * (i + 1);
        await this.page.mouse.move(x, y);
        await this.page.waitForTimeout(50);
      }
      
      await this.page.mouse.up();
      console.log('[MOUSE] ✅ Drag complete');
      return true;
    } catch (error) {
      console.error(`[MOUSE] ❌ Drag failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Click element via JavaScript (more reliable for disabled elements)
   * @param {string} selector - CSS selector
   * @returns {boolean}
   */
  static async clickViaJavaScript(selector) {
    console.log(`[MOUSE] 🖱️  JS click: ${selector}`);
    
    try {
      const clicked = await this.page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        
        try {
          el.click();
          return true;
        } catch (e) {
          console.error(`JS click failed: ${e.message}`);
          return false;
        }
      }, selector);
      
      return clicked;
    } catch (error) {
      console.error(`[MOUSE] ❌ JS click failed: ${error.message}`);
      return false;
    }
  }
}

export default MouseInteractionHelper;
