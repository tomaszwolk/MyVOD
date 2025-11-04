import { test, expect } from '@playwright/test';

test('has correct page title', async ({ page }) => {
  // 1. Navigate to the home page.
  await page.goto('/');

  // 2. Assert that the page has the correct title.
  await expect(page).toHaveTitle(/myvod/);
});
