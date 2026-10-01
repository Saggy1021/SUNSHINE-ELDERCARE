import { test, expect } from '@playwright/test';

test.describe('Admin Portal Tests', () => {
  test('Unauthorized access to admin portal is blocked', async ({ page }) => {
    // Attempt to hit admin routes as unauthenticated user
    const adminRoutes = [
      '/admin',
      '/admin/members',
      '/admin/payments',
      '/admin/content'
    ];

    for (const route of adminRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL(/.*\/login/);
    }
  });

  test.skip('Authenticated non-authorized user is denied admin access', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    // Login as a regular member (assuming e2e seed has this user or we use a standard one)
    await page.fill('input[name="email"]', 'member@example.com'); 
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    
    // Wait for login to complete (should redirect to dashboard or home)
    await page.waitForURL(/\/dashboard|\/$/);

    // Attempt to access admin routes
    const adminRoutes = [
      '/admin',
      '/admin/members',
      '/admin/payments',
      '/admin/content'
    ];

    for (const route of adminRoutes) {
      await page.goto(route);
      // Non-admins should be redirected to /dashboard per admin layout
      await expect(page).toHaveURL(/.*\/dashboard/);
    }
  });
});
