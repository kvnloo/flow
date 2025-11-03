import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate from landing page to session', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/NeuroFlow/);

    await page.click('text=Start Session');

    await expect(page).toHaveURL('/session');
  });

  test('should navigate to calibration page', async ({ page }) => {
    await page.goto('/');

    await page.click('text=Calibrate');

    await expect(page).toHaveURL('/calibration');
  });

  test('should navigate to analytics page', async ({ page }) => {
    await page.goto('/');

    await page.click('text=Analytics');

    await expect(page).toHaveURL('/analytics');
  });

  test('should show tutorial overlay on first visit', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/session');

    await expect(page.locator('[data-testid="tutorial-overlay"]')).toBeVisible();
  });

  test('should not show tutorial after completion', async ({ page }) => {
    await page.goto('/session');

    const tutorial = page.locator('[data-testid="tutorial-overlay"]');
    if (await tutorial.isVisible()) {
      await page.click('text=Skip Tutorial');
    }

    await page.reload();

    await expect(tutorial).not.toBeVisible();
  });
});
