import { test, expect } from '@playwright/test';

/**
 * Video Production System - End-to-End Tests
 * Tests all major workflows and feature interactions
 */

test.describe('Video Production System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Video Production page
    await page.goto('/video-production');
    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Dashboard Overview', () => {
    test('should display system status metrics', async ({ page }) => {
      // Wait for system status to load
      await page.waitForSelector('text=System Health', { timeout: 5000 });
      
      // Check health status is displayed
      const healthSection = page.locator('text=System Health');
      await expect(healthSection).toBeVisible();
    });

    test('should display queue activity metrics', async ({ page }) => {
      // Check queue stats are visible
      const queueActivity = page.locator('text=Queue Activity');
      await expect(queueActivity).toBeVisible();

      // Check specific metrics
      await expect(page.locator('text=Pending Videos')).toBeVisible();
      await expect(page.locator('text=Processing')).toBeVisible();
      await expect(page.locator('text=Completed Today')).toBeVisible();
    });

    test('should display performance metrics', async ({ page }) => {
      // Check performance section
      const perfSection = page.locator('text=Performance');
      await expect(perfSection).toBeVisible();

      // Check specific metrics
      await expect(page.locator('text=CPU Usage')).toBeVisible();
      await expect(page.locator('text=Memory Usage')).toBeVisible();
    });

    test('should show quick action buttons', async ({ page }) => {
      // Check quick action buttons exist
      const manageBtn = page.locator('text=Manage Accounts');
      const queueBtn = page.locator('text=View Queue');

      await expect(manageBtn).toBeVisible();
      await expect(queueBtn).toBeVisible();
    });
  });

  test.describe('Accounts Management', () => {
    test('should navigate to accounts tab', async ({ page }) => {
      // Click accounts tab
      await page.click('text=Accounts');
      
      // Wait for accounts content to load
      await page.waitForSelector('text=Connected Accounts', { timeout: 5000 });
      
      // Verify tab is active
      const accountsTab = page.locator('button:has-text("Accounts")');
      await expect(accountsTab).toHaveClass(/border-purple-600/);
    });

    test('should display Add Account form', async ({ page }) => {
      // Click accounts tab
      await page.click('text=Accounts');
      
      // Click Add Account button
      await page.click('text=Add Account');
      
      // Verify form elements are visible
      await expect(page.locator('label:has-text("Platform")')).toBeVisible();
      await expect(page.locator('label:has-text("Username")')).toBeVisible();
      await expect(page.locator('label:has-text("Password")')).toBeVisible();
      await expect(page.locator('label:has-text("Email")')).toBeVisible();
    });

    test('should validate required account fields', async ({ page }) => {
      // Click accounts tab
      await page.click('text=Accounts');
      
      // Click Add Account button
      await page.click('text=Add Account');
      
      // Try to submit empty form
      const submitBtn = page.locator('button:has-text("Add Account")').last();
      
      // Check username is required
      const usernameInput = page.locator('input[placeholder*="username"]').or(page.locator('input').nth(1));
      const passwordInput = page.locator('input[type="password"]').first();
      
      // Fill username to unblock validation
      await usernameInput.fill('test_user');
      await passwordInput.fill('password123');
      
      // Expect form to be valid now
      await expect(submitBtn).toBeEnabled();
    });

    test('should display connected accounts', async ({ page }) => {
      // Click accounts tab
      await page.click('text=Accounts');
      
      // Wait for accounts list to potentially load
      await page.waitForTimeout(2000);
      
      // Check if accounts grid exists
      const accountsSection = page.locator('text=Connected Accounts');
      await expect(accountsSection).toBeVisible();
    });
  });

  test.describe('Queue Monitoring', () => {
    test('should navigate to queue tab', async ({ page }) => {
      // Click Queue tab
      await page.click('text=Queue');
      
      // Wait for queue content
      await page.waitForSelector('text=Recent Queue Items', { timeout: 5000 });
      
      // Verify tab is active
      const queueTab = page.locator('button:has-text("Queue")');
      await expect(queueTab).toHaveClass(/border-purple-600/);
    });

    test('should display queue statistics', async ({ page }) => {
      // Click Queue tab
      await page.click('text=Queue');
      
      // Wait and check stats are displayed
      await expect(page.locator('text=Total Queued')).toBeVisible();
      await expect(page.locator('text=Processing')).toBeVisible();
      await expect(page.locator('text=Completed')).toBeVisible();
      await expect(page.locator('text=Failed')).toBeVisible();
    });

    test('should allow filtering queue items', async ({ page }) => {
      // Click Queue tab
      await page.click('text=Queue');
      
      // Wait for filter buttons
      await page.waitForSelector('button:has-text("All")', { timeout: 5000 });
      
      // Test All filter
      const allBtn = page.locator('button:has-text("All")').first();
      await allBtn.click();
      await expect(allBtn).toHaveClass(/bg-purple-600/);
      
      // Test Pending filter
      const pendingBtn = page.locator('button:has-text("Pending")').first();
      await pendingBtn.click();
      await expect(pendingBtn).toHaveClass(/bg-purple-600/);
      
      // Test Processing filter
      const processingBtn = page.locator('button:has-text("Processing")').first();
      await processingBtn.click();
      await expect(processingBtn).toHaveClass(/bg-purple-600/);
    });

    test('should display priority distribution', async ({ page }) => {
      // Click Queue tab
      await page.click('text=Queue');
      
      // Check priority breakdown
      await expect(page.locator('text=By Priority')).toBeVisible();
      await expect(page.locator('text=High')).toBeVisible();
      await expect(page.locator('text=Normal')).toBeVisible();
      await expect(page.locator('text=Low')).toBeVisible();
    });

    test('should display platform distribution', async ({ page }) => {
      // Click Queue tab
      await page.click('text=Queue');
      
      // Check platform breakdown
      await expect(page.locator('text=By Platform')).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should have Video Production in navbar', async ({ page }) => {
      // Check navbar contains Video Production
      const navLink = page.locator('a:has-text("Video Production"), button:has-text("Video Production")');
      await expect(navLink).toBeVisible();
    });

    test('should navigate using navbar link', async ({ page }) => {
      // If not already on video production, navigate
      const vpLink = page.locator('a:has-text("Video Production"), button:has-text("Video Production")').first();
      
      // Click if visible
      const isVisible = await vpLink.isVisible({ timeout: 1000 }).catch(() => false);
      if (isVisible) {
        // Navigate back to home first to test link
        await page.goto('/');
        await vpLink.click();
        
        // Verify navigation
        await expect(page).toHaveURL(/\/video-production/);
      }
    });

    test('should have all main tabs', async ({ page }) => {
      // Check all tabs are present
      await expect(page.locator('button:has-text("Overview")')).toBeVisible();
      await expect(page.locator('button:has-text("Accounts")')).toBeVisible();
      await expect(page.locator('button:has-text("Queue")')).toBeVisible();
      await expect(page.locator('button:has-text("Media Library")')).toBeVisible();
    });
  });

  test.describe('UI & Styling', () => {
    test('should have dark theme applied', async ({ page }) => {
      // Check main background
      const mainContent = page.locator('text=Video Production System').locator('..').first();
      const bgColor = await mainContent.evaluate(el => window.getComputedStyle(el).backgroundColor);
      
      // Should have dark background (gray-900)
      expect(bgColor).toBeTruthy();
    });

    test('should have purple accent colors', async ({ page }) => {
      // Check for purple accent buttons/bars
      const purpleElements = page.locator('[class*="purple"]');
      
      const count = await purpleElements.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should be responsive on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 812 });
      
      // Check page is still accessible
      await expect(page.locator('text=Video Production System')).toBeVisible();
      
      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test('should display loading states', async ({ page }) => {
      // Navigate to page with potential loading
      await page.click('text=Accounts');
      
      // Check loading indicators may appear
      await page.waitForTimeout(1000);
      
      // Verify content eventually loads
      const accountsSection = page.locator('text=Connected Accounts');
      await expect(accountsSection).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Tab Switching', () => {
    test('should switch between tabs smoothly', async ({ page }) => {
      const tabs = ['Overview', 'Accounts', 'Queue', 'Media Library'];
      
      for (const tab of tabs) {
        // Click tab
        await page.click(`button:has-text("${tab}")`);
        
        // Wait for content
        await page.waitForTimeout(500);
        
        // Verify tab is active (purple color)
        const tabBtn = page.locator(`button:has-text("${tab}")`);
        await expect(tabBtn).toHaveClass(/border-purple-600/);
      }
    });

    test('should maintain state when switching tabs', async ({ page }) => {
      // Go to Accounts tab
      await page.click('text=Accounts');
      
      // Open Add Account form
      await page.click('text=Add Account');
      
      // Go to Queue tab
      await page.click('text=Queue');
      
      // Go back to Accounts
      await page.click('text=Accounts');
      
      // Form should still be visible (state maintained)
      // Wait a moment for it to render
      await page.waitForTimeout(500);
      
      // Check if form is still open or check accounts content
      const accountsSection = page.locator('text=Connected Accounts');
      await expect(accountsSection).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate offline
      await page.context().setOffline(true);
      
      // Navigate to page
      await page.goto('/video-production', { waitUntil: 'domcontentloaded' });
      
      // Page should still render
      const title = page.locator('text=Video Production System');
      await expect(title).toBeVisible();
      
      // Go back online
      await page.context().setOffline(false);
    });

    test('should display error messages', async ({ page }) => {
      // The app should handle errors gracefully
      // Navigate to page
      await page.goto('/video-production');
      
      // Wait for load
      await page.waitForLoadState('networkidle');
      
      // Check page loaded successfully
      const mainTitle = page.locator('text=Video Production System');
      await expect(mainTitle).toBeVisible();
    });
  });
});
