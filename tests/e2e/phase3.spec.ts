import { test, expect } from '@playwright/test';

test.describe('Phase 3 Focused Tests', () => {

  test.describe('Member Search', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.goto('/login');
      await page.fill('input[name="email"]', 'e2e_admin@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard**');
    });

    test('can search by name and email', async ({ page }) => {
      await page.goto('/admin/members');
      await expect(page.locator('h1')).toContainText('Members');

      const searchInput = page.getByPlaceholder(/search members/i);
      await expect(searchInput).toBeVisible();

      await searchInput.fill('xyz123nonexistent');
      await expect(page.locator('text=No members found')).toBeVisible({ timeout: 10000 });

      await searchInput.fill('Searchable Test Member');
      await expect(page.locator('text=Searchable Test Member')).toBeVisible();
    });
  });

  test.describe('CMS Dynamic Pages', () => {
    test('public user cannot see unpublished CMS page', async ({ page }) => {
      const response = await page.goto('/this-is-a-draft-page');
      expect(response?.status()).toBe(404);
    });

    test('public user cannot access CMS editor', async ({ page }) => {
      await page.goto('/admin/content/pages');
      await expect(page).toHaveURL(/.*login/);
    });

    test.describe('Admin CMS Management', () => {
      test.beforeEach(async ({ page }) => {
        // Login as admin
        await page.goto('/login');
        await page.fill('input[name="email"]', 'e2e_admin@example.com');
        await page.fill('input[name="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('**/dashboard**');
      });

      test('admin can create and view published page', async ({ page }) => {
        await page.goto('/admin/content/pages');
        
        await expect(page.getByRole('heading', { name: 'Pages' }).or(page.locator('text=Website Pages')).first()).toBeVisible();

        await page.getByRole('button', { name: 'Add Page' }).click();
        await page.fill('input[type="text"]', 'test-slug-123'); 
        await page.locator('input').nth(1).fill('Test Page Title'); 
        await page.locator('textarea').first().fill('<p>This is test content</p>'); 
        await page.selectOption('select', 'PUBLISHED'); 
        
        await page.getByRole('button', { name: 'Save Page' }).click();

        await expect(page.locator('text=Test Page Title')).toBeVisible();

        await page.goto('/test-slug-123');
        await expect(page.locator('h1')).toContainText('Test Page Title');
        await expect(page.locator('text=This is test content')).toBeVisible();
      });
    });
  });

});
