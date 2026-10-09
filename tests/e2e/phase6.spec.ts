import { test, expect } from '@playwright/test';
import { db } from '../../lib/db';
import bcrypt from 'bcryptjs';

test.describe('Phase 6: Roles, Permissions & Secure Admin Invitations', () => {
  test.setTimeout(60000);

  test.beforeAll(async () => {
    // Verify e2e environment
    if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('sunshine_eldercare_prod')) {
      throw new Error('E2E tests must not run against production database.');
    }
  });

  test('Owner protection and Admin Invitations', async ({ page }) => {
    // We should log in as Owner, because only owners have ROLE_MANAGE by default
    // We assume test owner from other phases: e2e_admin@example.com / password123
    await page.goto('/login');
    await page.fill('input[name="email"]', 'e2e_admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    const uniqueSuffix = Date.now();
    const roleName = `Content Manager Phase6 ${uniqueSuffix}`;
    const inviteEmail = `phase6.admin.${uniqueSuffix}@example.com`;

    // 1. Check Roles page access
    await page.goto('/admin/roles');
    await expect(page.locator('h1')).toContainText('Roles');

    // 2. Create a new Role
    await page.click('button:has-text("New Role")');
    await page.fill('input[name="name"]', roleName);
    await page.fill('textarea[name="description"]', 'Can manage content');
    // Check CONTENT_MANAGE and MEMBER_VIEW
    await page.check('input[value="CONTENT_MANAGE"]');
    await page.check('input[value="CONTENT_VIEW"]');
    await page.check('input[value="MEMBER_VIEW"]');
    await page.click('button:has-text("Create Role")');
    
    // Verify role was created
    await expect(page.locator(`h3:has-text("${roleName}")`)).toBeVisible();

    // 3. Admin Users page
    await page.goto('/admin/admin-users');
    await expect(page.locator('h1')).toContainText('Admin Users');

    // 4. Invite Admin
    await page.click('button:has-text("New Admin")');
    await page.fill('input[name="name"]', 'Phase6 Test Admin');
    await page.fill('input[name="email"]', inviteEmail);
    // Select the new role
    await page.check(`label:has-text("${roleName}") input`);
    await page.click('button:has-text("Send Invitation")');

    // Verify it is in pending invitations
    await expect(page.locator('td', { hasText: inviteEmail })).toBeVisible();

    // 5. Override the token hash in DB to a known token 'testtoken123'
    const knownToken = 'testtoken123';
    const knownHash = await bcrypt.hash(knownToken, 10);
    const updated = await db.adminInvitation.update({
      where: { email: inviteEmail },
      data: { tokenHash: knownHash }
    });
    console.log("TEST UPDATED HASH:", updated.tokenHash);

    // 6. Accept the invitation
    await page.goto(`/admin-invite/${knownToken}`);
    await expect(page.locator('h2')).toContainText('Accept Invitation');
    
    await page.fill('input[name="password"]', 'Phase6Pass@123');
    await page.click('button[type="submit"]');

    // 7. Check if redirected to login and alert shows
    // Wait for redirect
    await page.waitForURL(/.*login/);
    
    // Log out owner, log in as new admin
    await page.goto('/login'); // Refresh
    await page.fill('input[name="email"]', inviteEmail);
    await page.fill('input[name="password"]', 'Phase6Pass@123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // Verify new admin CANNOT access Admin Users
    await page.goto('/admin/admin-users');
    await expect(page).toHaveURL(/.*admin$/); // redirected back to dashboard

    // But they CAN access Content
    await page.goto('/admin/content');
    await expect(page.locator('h1')).toContainText('Content Management (CMS)');

    // Revoke the test role and delete the test user (clean up not strictly required but good)
  });
});
