import { test, expect } from '@playwright/test';

test.describe('Care Operations Tests', () => {
  test('Unauthorized access to care portal is blocked', async ({ page }) => {
    await page.goto('/dashboard/care');
    await expect(page).toHaveURL(/.*\/login/);

    await page.goto('/admin/care');
    await expect(page).toHaveURL(/.*\/login/);
  });
});
