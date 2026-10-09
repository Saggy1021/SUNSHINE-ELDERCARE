import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test.describe('Phase 4A Payment & Document Tests', () => {

  test.beforeAll(async () => {
    // Safety check
    const url = process.env.DATABASE_URL || '';
    if (!url.includes('e2e_db') && !url.includes('localhost')) {
      throw new Error('STOP: Not connected to isolated E2E database.');
    }
  });

  test.describe('Admin Payment Verification', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.goto('/login');
      await page.fill('input[name="email"]', 'e2e_admin@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard**');
    });

    test('admin can view payments list and navigate to details', async ({ page }) => {
      await page.goto('/admin/payments');
      await expect(page.locator('h1')).toContainText('Payment Verification');

      // Check if there are payments or empty state. 
      // If there's a View Details link, click it.
      const viewDetailsLinks = page.locator('text=View Details');
      const count = await viewDetailsLinks.count();
      if (count > 0) {
        await viewDetailsLinks.first().click();
        await page.waitForURL('**/admin/payments/**');
        await expect(page.locator('h1')).toContainText('Payment Details');
        await expect(page.locator('text=Amount')).toBeVisible();
      } else {
        await expect(page.locator('text=No pending payments found')).toBeVisible();
      }
    });

    test('admin can navigate to member details and see invoices and documents', async ({ page }) => {
      await page.goto('/admin/members');
      
      const firstMemberLink = page.locator('a[href^="/admin/members/cm"]');
      const count = await firstMemberLink.count();
      if (count > 0) {
        await firstMemberLink.first().click();
        await page.waitForURL('**/admin/members/**');
        await expect(page.locator('h1')).toContainText('Member Details', { timeout: 15000 });
        
        // Verify invoices section exists
        await expect(page.locator('h3:has-text("Invoices")')).toBeVisible();
        // Verify documents section exists
        await expect(page.locator('h3:has-text("Documents")')).toBeVisible();
      }
    });
  });

});
