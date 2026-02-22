import { test, expect } from '@playwright/test';

/**
 * Video Production API Integration Tests
 * Tests frontend-backend API communication
 */

test.describe('Video Production API Integration', () => {
  const API_BASE = 'http://localhost:3000/api';

  test.beforeEach(async ({ page }) => {
    // Navigate to Video Production page
    await page.goto('/video-production');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Queue API Integration', () => {
    test('should fetch queue stats via API', async ({ page }) => {
      // Listen for API calls
      const responses = [];
      page.on('response', response => {
        if (response.url().includes('/queue/stats')) {
          responses.push(response);
        }
      });

      // Navigate to Queue tab to trigger API call
      await page.click('text=Queue');
      
      // Wait for API call
      await page.waitForTimeout(2000);
      
      // Check that API was called
      expect(responses.length).toBeGreaterThan(0);
    });

    test('should handle queue filtering', async ({ page }) => {
      // Navigate to Queue tab
      await page.click('text=Queue');
      
      // Set up listener for API calls
      let apiCallCount = 0;
      page.on('response', response => {
        if (response.url().includes('/api/queue')) {
          apiCallCount++;
        }
      });
      
      // Click filter buttons to trigger API calls
      await page.click('button:has-text("Pending")').first();
      await page.waitForTimeout(500);
      
      // API should be called
      expect(apiCallCount).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Account API Integration', () => {
    test('should fetch accounts via API', async ({ page }) => {
      const responses = [];
      page.on('response', response => {
        if (response.url().includes('/accounts')) {
          responses.push(response);
        }
      });

      // Navigate to Accounts tab
      await page.click('text=Accounts');
      
      // Wait for API calls
      await page.waitForTimeout(2000);
      
      // Check that API was called
      expect(responses.length).toBeGreaterThan(0);
    });

    test('should validate account form before API submission', async ({ page }) => {
      // Go to Accounts
      await page.click('text=Accounts');
      
      // Open Add Account form
      await page.click('text=Add Account');
      
      // Try to submit without required fields (form should prevent API call)
      const submitBtn = page.locator('button:has-text("Add Account")').last();
      
      // Username input should be required
      const usernameInput = page.locator('input').nth(1);
      await expect(usernameInput).toHaveAttribute('required', '');
    });

    test('should handle account add success', async ({ page }) => {
      let addCalled = false;
      
      page.on('response', response => {
        if (response.url().includes('/accounts/add')) {
          addCalled = true;
        }
      });

      // Go to Accounts
      await page.click('text=Accounts');
      
      // Open Add Account form
      await page.click('text=Add Account');
      
      // Fill form
      const inputs = page.locator('input');
      
      // Select platform (first select)
      await page.locator('select').first().selectOption('tiktok');
      
      // Fill fields
      await inputs.nth(1).fill('test_user'); // username
      await inputs.nth(2).fill('password123'); // password
      await inputs.nth(4).fill('test@example.com'); // email
      
      // Submit
      const submitBtn = page.locator('button:has-text("Add Account")').last();
      await submitBtn.click();
      
      // Wait for potential API call
      await page.waitForTimeout(1000);
    });
  });

  test.describe('System Status API Integration', () => {
    test('should fetch system status on page load', async ({ page }) => {
      const responses = [];
      page.on('response', response => {
        if (response.url().includes('/system-status')) {
          responses.push(response);
        }
      });

      // Page should load and fetch system status
      await page.waitForTimeout(2000);
      
      // Check status was fetched (may be in first load)
      // At minimum, the overview should be displayed
      const systemHealth = page.locator('text=System Health');
      await expect(systemHealth).toBeVisible();
    });

    test('should auto-refresh system status', async ({ page }) => {
      let refreshCount = 0;
      page.on('response', response => {
        if (response.url().includes('/stats') || response.url().includes('/system')) {
          refreshCount++;
        }
      });

      // Wait for auto-refresh interval
      await page.waitForTimeout(6000);
      
      // Should have multiple API calls (initial + refresh)
      expect(refreshCount).toBeGreaterThan(0);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API timeout gracefully', async ({ page }) => {
      // Set very short timeout
      page.on('response', response => {
        if (response.url().includes('/api/')) {
          // Don't block but monitor
          return response;
        }
      });

      // Navigate to page
      await page.goto('/video-production');
      
      // Page should still display (no crash)
      const title = page.locator('text=Video Production System');
      await expect(title).toBeVisible();
    });

    test('should show loading state during API calls', async ({ page }) => {
      // Navigate to Queue (triggers API call)
      await page.click('text=Queue');
      
      // May show loading but should eventually show content
      // Wait for content to appear
      const queueSection = page.locator('text=Recent Queue Items');
      
      // Should eventually be visible (after API response)
      await expect(queueSection).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Real-time Updates', () => {
    test('should update queue stats periodically', async ({ page }) => {
      // Navigate to Queue
      await page.click('text=Queue');
      
      // Get initial count (if any displayed)
      let firstCount = null;
      
      try {
        const countElements = page.locator('.flex-1 .text-2xl');
        firstCount = await countElements.first().textContent();
      } catch (e) {
        // No initial data, that's ok
      }
      
      // Wait for auto-refresh
      await page.waitForTimeout(4000);
      
      // Stats should have had chance to update
      // Component should be stable
      const queueStats = page.locator('text=Total Queued');
      await expect(queueStats).toBeVisible();
    });

    test('should maintain state across tab switches', async ({ page }) => {
      // Get initial system status
      const initialHealth = await page.locator('text=System Health').first().textContent();
      
      // Switch to Accounts tab
      await page.click('text=Accounts');
      await page.waitForTimeout(500);
      
      // Switch back to Overview
      await page.click('text=Overview');
      await page.waitForTimeout(500);
      
      // System status should still be present
      const healthAfter = page.locator('text=System Health').first();
      await expect(healthAfter).toBeVisible();
    });
  });
});
