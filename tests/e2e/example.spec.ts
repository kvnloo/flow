import { test, expect } from '@playwright/test';

/**
 * Example E2E test
 *
 * This demonstrates end-to-end testing with Playwright.
 * Replace this with actual E2E tests for your application.
 */

test.describe('Example E2E Test Suite', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that the page title contains expected text
    await expect(page).toHaveTitle(/Flow/i);
  });

  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/');

    // Check for common navigation elements
    // Update these selectors based on your actual application
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
  });
});
