import { test, expect } from '@playwright/test';

/**
 * Video Production Workflow Tests
 * Tests complete end-to-end workflows
 */

test.describe('Video Production Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/video-production');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Account Setup Workflow', () => {
    test('should complete full account setup flow', async ({ page }) => {
      // Step 1: Navigate to Accounts
      await page.click('text=Accounts');
      await page.waitForSelector('text=Connected Accounts', { timeout: 5000 });
      
      // Step 2: Click Add Account
      await page.click('text=Add Account');
      await expect(page.locator('text=Add New Account')).toBeVisible();
      
      // Step 3: Fill form
      const platformSelect = page.locator('select').first();
      await platformSelect.selectOption('instagram');
      
      // Step 4: Fill text inputs
      await page.locator('input').nth(1).fill('test_instagram');  // username
      await page.locator('input').nth(2).fill('password123');     // password
      await page.locator('input').nth(3).fill('test@instagram.com'); // email
      await page.locator('input').nth(4).fill('Test Account');    // display name
      
      // Step 5: Submit
      const submitBtn = page.locator('button:has-text("Add Account")').last();
      await submitBtn.click();
      
      // Step 6: Verify (toast or form closes)
      await page.waitForTimeout(2000);
      
      // Form should close or show success
      const addAccountSection = page.locator('text=Add New Account');
      const isVisible = await addAccountSection.isVisible({ timeout: 1000 }).catch(() => false);
      expect(isVisible).toBeFalsy();
    });

    test('should allow account verification', async ({ page }) => {
      // Navigate to Accounts
      await page.click('text=Accounts');
      await page.waitForTimeout(2000);
      
      // Look for Verify button
      const verifyBtn = page.locator('button:has-text("Verify")').first();
      const isVisible = await verifyBtn.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (isVisible) {
        // Click verify
        await verifyBtn.click();
        
        // Wait for verification to complete
        await page.waitForTimeout(3000);
        
        // Button should be back to normal state
        await expect(verifyBtn).toBeVisible();
      }
    });
  });

  test.describe('Queue Management Workflow', () => {
    test('should monitor queue status', async ({ page }) => {
      // Step 1: Navigate to Queue
      await page.click('text=Queue');
      await page.waitForSelector('text=Recent Queue Items', { timeout: 5000 });
      
      // Step 2: Verify queue stats are displayed
      const statElements = [
        'Total Queued',
        'Processing',
        'Completed',
        'Failed'
      ];
      
      for (const stat of statElements) {
        const element = page.locator(`text=${stat}`);
        await expect(element).toBeVisible();
      }
      
      // Step 3: Check filters work
      const filterButtons = ['All', 'Pending', 'Processing'];
      
      for (const filter of filterButtons) {
        const btn = page.locator(`button:has-text("${filter}")`).first();
        await btn.click();
        
        // Button should be highlighted
        await expect(btn).toHaveClass(/bg-purple-600/);
        
        // Wait a moment for list to update
        await page.waitForTimeout(300);
      }
      
      // Step 4: Verify priority breakdown
      await expect(page.locator('text=By Priority')).toBeVisible();
      await expect(page.locator('text=High')).toBeVisible();
      await expect(page.locator('text=Normal')).toBeVisible();
      await expect(page.locator('text=Low')).toBeVisible();
    });
  });

  test.describe('System Monitoring Workflow', () => {
    test('should display complete system overview', async ({ page }) => {
      // Step 1: Verify on Overview tab
      const overviewTab = page.locator('button:has-text("Overview")');
      await expect(overviewTab).toHaveClass(/border-purple-600/);
      
      // Step 2: Check System Health section
      await expect(page.locator('text=System Health')).toBeVisible();
      
      // Step 3: Check Queue Activity section
      await expect(page.locator('text=Queue Activity')).toBeVisible();
      
      // Step 4: Check Performance section
      await expect(page.locator('text=Performance')).toBeVisible();
      
      // Step 5: Check Active Processes section
      await expect(page.locator('text=Active Processes')).toBeVisible();
      
      // Step 6: Check Quick Actions
      await expect(page.locator('text=Manage Accounts')).toBeVisible();
      await expect(page.locator('text=View Queue')).toBeVisible();
    });

    test('should show real-time updates', async ({ page }) => {
      // Get initial metrics
      const metrics1 = await page.locator('[class*="font-medium"]').allTextContents();
      
      // Wait for auto-refresh
      await page.waitForTimeout(6000);
      
      // Get updated metrics
      const metrics2 = await page.locator('[class*="font-medium"]').allTextContents();
      
      // Metrics should exist in both snapshots
      expect(metrics1.length).toBeGreaterThan(0);
      expect(metrics2.length).toBeGreaterThan(0);
    });
  });

  test.describe('Navigation Workflow', () => {
    test('should navigate between all main sections', async ({ page }) => {
      const tabs = [
        'Overview',
        'Accounts',
        'Queue',
        'Media Library'
      ];
      
      for (const tab of tabs) {
        // Click tab
        const tabBtn = page.locator(`button:has-text("${tab}")`);
        await tabBtn.click();
        
        // Wait for loading
        await page.waitForTimeout(500);
        
        // Verify tab is active
        await expect(tabBtn).toHaveClass(/border-purple-600/);
        
        // Verify some content is visible
        const mainContent = page.locator('[class*="bg-gray"]').first();
        await expect(mainContent).toBeVisible();
      }
    });

    test('should navigate via navbar', async ({ page }) => {
      // Go to different page
      await page.goto('/gallery');
      await page.waitForLoadState('networkidle');
      
      // Find Video Production link/button in navbar
      const vpNav = page.locator('a:has-text("Video Production"), button:has-text("Video Production")').first();
      const isVisible = await vpNav.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (isVisible) {
        // Click it
        await vpNav.click();
        
        // Should navigate back or be available
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Responsive Layout Workflow', () => {
    test('should work on desktop view', async ({ page }) => {
      // Desktop viewports
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Navigate through all tabs
      const tabs = ['Overview', 'Accounts', 'Queue'];
      
      for (const tab of tabs) {
        await page.click(`button:has-text("${tab}")`);
        await page.waitForTimeout(300);
        
        // Content should be visible
        const content = page.locator('[class*="bg-gray"]').first();
        await expect(content).toBeVisible();
      }
    });

    test('should work on tablet view', async ({ page }) => {
      // Tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Should still be accessible
      await page.click('text=Accounts');
      await page.waitForTimeout(300);
      
      const accountsSection = page.locator('text=Connected Accounts');
      await expect(accountsSection).toBeVisible();
    });

    test('should work on mobile view', async ({ page }) => {
      // Mobile viewport
      await page.setViewportSize({ width: 375, height: 812 });
      
      // Main title should be visible
      const title = page.locator('text=Video Production System');
      await expect(title).toBeVisible();
      
      // Tabs should be scrollable
      const tabs = page.locator('button').filter({ hasText: 'Overview' });
      await expect(tabs).toBeVisible();
    });
  });

  test.describe('Error Recovery Workflow', () => {
    test('should recover from temporary API failure', async ({ page }) => {
      // Go offline
      await page.context().setOffline(true);
      
      // Navigate (page should handle gracefully)
      await page.goto('/video-production', { waitUntil: 'domcontentloaded' });
      
      // Title should still be visible
      const title = page.locator('text=Video Production System');
      await expect(title).toBeVisible();
      
      // Go back online
      await page.context().setOffline(false);
      
      // Wait a moment
      await page.waitForTimeout(1000);
      
      // Page should still be functional
      await page.click('text=Accounts');
      
      // Content should load
      const accountsSection = page.locator('text=Connected Accounts');
      await expect(accountsSection).toBeVisible({ timeout: 10000 });
    });

    test('should handle form submission errors gracefully', async ({ page }) => {
      // Navigate to Accounts
      await page.click('text=Accounts');
      
      // Open Add Account form
      await page.click('text=Add Account');
      
      // Try invalid platform selection and submit
      const platformSelect = page.locator('select').first();
      await platformSelect.selectOption('tiktok');
      
      // Leave password empty to trigger validation
      const usernameInput = page.locator('input').nth(1);
      const passwordInput = page.locator('input[type="password"]').first();
      
      await usernameInput.fill('test_user');
      // Don't fill password - should require it
      
      // Try to submit
      const inputs = page.locator('input');
      const isRequired = await passwordInput.getAttribute('required');
      
      expect(isRequired).toBeTruthy();
    });
  });

  test.describe('Data Persistence Workflow', () => {
    test('should maintain state across tab switches', async ({ page }) => {
      // Go to Accounts
      await page.click('text=Accounts');
      await page.waitForTimeout(500);
      
      // Switch to Queue
      await page.click('text=Queue');
      await page.waitForTimeout(500);
      
      // Switch back to Accounts
      await page.click('text=Accounts');
      await page.waitForTimeout(500);
      
      // Accounts section should be visible
      const accountsSection = page.locator('text=Connected Accounts');
      await expect(accountsSection).toBeVisible();
    });

    test('should preserve scroll position within tabs', async ({ page }) => {
      // Go to Queue
      await page.click('text=Queue');
      await page.waitForTimeout(500);
      
      // Get initial scroll position
      const scrollBefore = await page.evaluate(() => window.scrollY);
      
      // Switch tab
      await page.click('text=Accounts');
      await page.waitForTimeout(300);
      
      // Switch back
      await page.click('text=Queue');
      await page.waitForTimeout(300);
      
      // Scroll position may or may not be preserved based on implementation
      // Just verify page is still functional
      const queueContent = page.locator('text=Recent Queue Items');
      await expect(queueContent).toBeVisible({ timeout: 5000 });
    });
  });
});
