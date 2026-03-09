/**
 * MouseInteractionHelper.js
 *
 * Consolidated mouse interaction patterns (click, right-click, hover, drag).
 */

export class MouseInteractionHelper {
  static getActivePage() {
    const page = this.page;
    if (!page) {
      return null;
    }

    try {
      if (typeof page.isClosed === 'function' && page.isClosed()) {
        return null;
      }
    } catch (error) {
      return null;
    }

    if (!page.mouse) {
      return null;
    }

    return page;
  }

  static async moveAndClick(x, y, options = {}) {
    const { button = 'left', delay = 50, verify = false } = options;
    const page = this.getActivePage();

    console.log(`[MOUSE] Click at (${x}, ${y})`);
    if (!page) {
      console.log('[MOUSE] Skipping click because page is no longer active');
      return false;
    }

    try {
      await page.mouse.move(x, y);
      await page.waitForTimeout(100);

      await page.mouse.down({ button });
      await page.waitForTimeout(delay);
      await page.mouse.up({ button });

      if (verify) {
        await page.waitForTimeout(500);
        const pageExists = await page.evaluate(() => document.body.children.length > 0);
        if (!pageExists) {
          console.warn('[MOUSE] Page may have navigated after click');
          return false;
        }
      }

      console.log('[MOUSE] Click complete');
      return true;
    } catch (error) {
      console.error(`[MOUSE] Click failed: ${error.message}`);
      return false;
    }
  }

  static async rightClick(x, y, waitMs = 1000) {
    const page = this.getActivePage();
    console.log(`[MOUSE] Right-click at (${x}, ${y})`);
    if (!page) {
      console.log('[MOUSE] Skipping right-click because page is no longer active');
      return false;
    }

    try {
      await page.mouse.move(x, y);
      await page.waitForTimeout(100);

      await page.mouse.up({ button: 'right' });
      await page.waitForTimeout(50);
      await page.mouse.down({ button: 'right' });

      console.log('[MOUSE] Right-click complete');
      await page.waitForTimeout(waitMs);
      return true;
    } catch (error) {
      console.error(`[MOUSE] Right-click failed: ${error.message}`);
      return false;
    }
  }

  static async rightClickAndSelect(x, y, menuItemText, menuWaitMs = 2000) {
    const page = this.getActivePage();
    console.log(`[MOUSE] Right-click and select: "${menuItemText}"`);
    if (!page) {
      console.log('[MOUSE] Skipping menu selection because page is no longer active');
      return { success: false };
    }

    const rightClickOk = await this.rightClick(x, y, menuWaitMs);
    if (!rightClickOk) return { success: false };

    const itemPos = await page.evaluate((text) => {
      const menuItems = document.querySelectorAll('[role="menuitem"]');
      for (const item of menuItems) {
        if ((item.textContent || '').toLowerCase().includes(text.toLowerCase())) {
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
      console.warn(`[MOUSE] Menu item not found: "${menuItemText}"`);
      return { success: false };
    }

    const clickOk = await this.moveAndClick(itemPos.x, itemPos.y);
    return {
      success: clickOk,
      itemPosition: itemPos
    };
  }

  static async hover(x, y, durationMs = 500) {
    const page = this.getActivePage();
    console.log(`[MOUSE] Hover at (${x}, ${y}) for ${durationMs}ms`);
    if (!page) {
      console.log('[MOUSE] Skipping hover because page is no longer active');
      return false;
    }

    try {
      await page.mouse.move(x, y);
      await page.waitForTimeout(durationMs);
      return true;
    } catch (error) {
      console.error(`[MOUSE] Hover failed: ${error.message}`);
      return false;
    }
  }

  static async doubleClick(x, y) {
    const page = this.getActivePage();
    console.log(`[MOUSE] Double-click at (${x}, ${y})`);
    if (!page) {
      console.log('[MOUSE] Skipping double-click because page is no longer active');
      return false;
    }

    try {
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.waitForTimeout(50);
      await page.mouse.up();
      await page.waitForTimeout(100);
      await page.mouse.down();
      await page.waitForTimeout(50);
      await page.mouse.up();
      console.log('[MOUSE] Double-click complete');
      return true;
    } catch (error) {
      console.error(`[MOUSE] Double-click failed: ${error.message}`);
      return false;
    }
  }

  static async drag(startX, startY, endX, endY, stepCount = 10) {
    const page = this.getActivePage();
    console.log(`[MOUSE] Drag from (${startX},${startY}) to (${endX},${endY})`);
    if (!page) {
      console.log('[MOUSE] Skipping drag because page is no longer active');
      return false;
    }

    try {
      await page.mouse.move(startX, startY);
      await page.waitForTimeout(100);
      await page.mouse.down();

      const xStep = (endX - startX) / stepCount;
      const yStep = (endY - startY) / stepCount;

      for (let i = 0; i < stepCount; i++) {
        const x = startX + xStep * (i + 1);
        const y = startY + yStep * (i + 1);
        await page.mouse.move(x, y);
        await page.waitForTimeout(50);
      }

      await page.mouse.up();
      console.log('[MOUSE] Drag complete');
      return true;
    } catch (error) {
      console.error(`[MOUSE] Drag failed: ${error.message}`);
      return false;
    }
  }

  static async clickViaJavaScript(selector) {
    const page = this.getActivePage();
    console.log(`[MOUSE] JS click: ${selector}`);
    if (!page) {
      console.log('[MOUSE] Skipping JS click because page is no longer active');
      return false;
    }

    try {
      const clicked = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        try {
          el.click();
          return true;
        } catch (error) {
          console.error(`JS click failed: ${error.message}`);
          return false;
        }
      }, selector);

      return clicked;
    } catch (error) {
      console.error(`[MOUSE] JS click failed: ${error.message}`);
      return false;
    }
  }
}

export default MouseInteractionHelper;
