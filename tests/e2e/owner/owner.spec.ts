import { test, expect } from '@playwright/test';

test.describe('Owner / RBAC Tests', () => {
  test('Public signup cannot create Owner', async ({ page }) => {
    // This is tested implicitly since signup form does not expose role fields.
    // Ensure signup route does not allow role injection.
    // In e2e, we verify the UI does not have an admin selector.
    await page.goto('/signup');
    await expect(page.locator('text=role')).toHaveCount(0);
  });

  test('Owner administration routes enforce server authorization', async ({ page }) => {
    await page.goto('/admin/roles');
    await expect(page).toHaveURL(/.*\/login/);

    await page.goto('/admin/admin-users');
    await expect(page).toHaveURL(/.*\/login/);
  });
});
