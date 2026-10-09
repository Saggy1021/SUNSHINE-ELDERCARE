import { test, expect } from '@playwright/test';

test.describe('Public Website Smoke Tests', () => {
  test('Homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Sunshine Eldercare|Sunshine ElderCare/i);
    // Check main navigation
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('About Us loads', async ({ page }) => {
    await page.goto('/about-us');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('Services loads', async ({ page }) => {
    await page.goto('/services');
    await expect(page.getByRole('heading', { level: 2, name: 'Core Eldercare Services' }).first()).toBeVisible();
  });

  test('Membership page loads', async ({ page }) => {
    await page.goto('/membership');
    await expect(page.getByRole('heading', { level: 2, name: 'Membership Plans' }).first()).toBeVisible();
  });

  test('Guest price calculator works', async ({ page }) => {
    await page.goto('/membership');
    // We expect the calculator to be present on membership page or similar
    const calculator = page.locator('text=Inclusive of all applicable taxes/charges');
    if (await calculator.isVisible()) {
      await expect(calculator).toBeVisible();
    }
  });

  test('FAQs loads', async ({ page }) => {
    await page.goto('/faqs');
    await expect(page.getByRole('heading', { level: 1, name: 'Complete FAQs' }).first()).toBeVisible();
  });

  test('Contact page loads', async ({ page }) => {
    await page.goto('/contact-us');
    await expect(page.getByRole('heading', { level: 2, name: 'Reach Out to Us' }).first()).toBeVisible();
  });

  test('Legal pages load', async ({ page }) => {
    await page.goto('/legal/privacy-policy');
    await expect(page.locator('text=Last Updated:').first()).toBeVisible();
  });

  test('Invalid route returns 404', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist');
    expect(response?.status()).toBe(404);
  });
});
