import { test, expect } from '@playwright/test';

test.describe('Payment / Invoice Tests', () => {
  test('Unauthorized user cannot access invoice checkout', async ({ page }) => {
    // Attempt to view a mock invoice URL without being logged in
    await page.goto('/checkout/INV-12345');
    await expect(page).toHaveURL(/.*\/login/);
  });
});
