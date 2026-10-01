import { test, expect } from '@playwright/test';

test.describe('Member Portal Tests', () => {
  // A helper function to login, but since we don't have seed users explicitly 
  // known in this environment yet, we will just test the boundaries.
  // Full authenticated tests would run against seeded test accounts.

  test('Unauthorized access to member portal is blocked', async ({ page }) => {
    await page.goto('/dashboard/profile');
    await expect(page).toHaveURL(/.*\/login/);

    await page.goto('/dashboard/membership');
    await expect(page).toHaveURL(/.*\/login/);

    await page.goto('/dashboard/documents');
    await expect(page).toHaveURL(/.*\/login/);
  });
});
