import { test, expect } from '@playwright/test';

test.describe('Authentication Tests', () => {
  test('Signup page loads', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { level: 1, name: 'Join the Family' })).toBeVisible();
  });

  test('Login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome Back' })).toBeVisible();
  });

  test('Protected route without authentication redirects to login', async ({ page }) => {
    // Attempt to access member dashboard
    await page.goto('/dashboard');
    // Verify redirect to login
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('Invalid credentials shows error message', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');
    // Assert an error message is shown instead of logging in
    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });
});
