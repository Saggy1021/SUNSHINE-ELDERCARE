import { test, expect } from '@playwright/test';

test.describe('Phase 5 CMS Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'e2e_admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');
  });

  test('admin can manage website pages', async ({ page }) => {
    await page.goto('/admin/content/pages');
    await expect(page.locator('h1')).toContainText('Manage Website Pages', { timeout: 15000 });
    
    // Create new page
    await page.click('button:has-text("Add Page")');
    await page.fill('input[type="text"]:near(label:has-text("Slug"))', 'test-phase5-page');
    await page.fill('input[type="text"]:near(label:has-text("Title"))', 'Test Phase 5 Page');
    await page.click('button:has-text("Save Page")');
    
    // Verify page exists in list
    await expect(page.locator('td:has-text("test-phase5-page")')).toBeVisible({ timeout: 15000 });
  });

  test('admin can manage FAQs', async ({ page }) => {
    await page.goto('/admin/content/faqs');
    await expect(page.locator('h1')).toContainText('Manage FAQs', { timeout: 15000 });
    
    // Add FAQ
    await page.click('button:has-text("Add FAQ")');
    await page.fill('input[type="text"]:near(label:has-text("Question"))', 'Test FAQ Phase 5?');
    await page.fill('textarea:near(label:has-text("Answer"))', 'Yes, it works.');
    await page.click('button:has-text("Save FAQ")');
    
    // Verify FAQ in list
    await expect(page.locator('td:has-text("Test FAQ Phase 5?")')).toBeVisible({ timeout: 15000 });
  });

  test('admin can manage Testimonials', async ({ page }) => {
    await page.goto('/admin/content/testimonials');
    await expect(page.locator('h1')).toContainText('Manage Testimonials', { timeout: 15000 });
    
    // Add Testimonial
    await page.click('button:has-text("Add Testimonial")');
    await page.fill('input[type="text"]:near(label:has-text("Author Name"))', 'Test Author P5');
    await page.fill('textarea:near(label:has-text("Quote"))', 'This is a test testimonial.');
    await page.click('button:has-text("Save Testimonial")');
    
    // Verify
    await expect(page.locator('td:has-text("Test Author P5")')).toBeVisible({ timeout: 15000 });
  });

  test('admin can manage Settings', async ({ page }) => {
    await page.goto('/admin/content/settings');
    await expect(page.locator('h1')).toContainText('Website Settings', { timeout: 15000 });
    
    // Add setting
    await page.click('button:has-text("Add Setting")');
    await page.fill('input[type="text"]:near(label:has-text("Key"))', 'TEST_SETTING_P5');
    await page.fill('textarea:near(label:has-text("Value"))', 'SettingValueP5');
    await page.click('button:has-text("Save Setting")');
    
    // Verify
    await expect(page.locator('td:has-text("TEST_SETTING_P5")')).toBeVisible({ timeout: 15000 });
  });

  test('public about-us page does not crash and has no Gurus', async ({ page, context }) => {
    // Clear cookies to simulate public user
    await context.clearCookies();
    await page.goto('/about-us');
    
    // Ensure it renders correctly (No 500 error)
    await expect(page).toHaveTitle(/About Us/i);
    
    // Ensure there is no employee count or staff directory
    // We removed Gurus, so "Meet Our Gurus" should not be there.
    const gurusCount = await page.locator('text=Meet Our Gurus').count();
    expect(gurusCount).toBe(0);
  });
});
