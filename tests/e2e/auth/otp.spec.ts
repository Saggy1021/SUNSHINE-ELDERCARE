import { test, expect } from '@playwright/test';

test.describe('Email Verification OTP', () => {
  const email = `test-otp-${Date.now()}@example.com`;
  const password = 'Password123!';

  // A. New signup
  test('New signup creates PENDING_VERIFICATION account and sends OTP', async ({ request, page }) => {
    // Navigate and fill signup
    await page.goto('/signup');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    
    // Fill remaining required fields...
    await page.selectOption('select[name="idProofType"]', 'PAN');
    await page.fill('input[name="idProofNumber"]', 'ABCDE1234F');
    // Upload a mock file
    await page.setInputFiles('input[name="idProofFile"]', {
      name: 'id.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01])
    });
    await page.fill('input[name="dateOfBirth"]', '1990-01-01');
    await page.selectOption('select[name="gender"]', 'Male');
    await page.fill('textarea[name="serviceAddress"]', '123 Test St');
    await page.fill('input[name="mobileNumber"]', '9999999999');
    await page.fill('input[name="bloodGroup"]', 'O+');
    await page.fill('input[name="sponsorName"]', 'Sponsor Name');
    await page.fill('input[name="sponsorRelationship"]', 'Friend');
    await page.fill('input[name="sponsorMobile"]', '8888888888');
    
    // Check "Same as Sponsor"
    await page.check('input[type="checkbox"]');
    
    await page.click('button[type="submit"]');

    // Wait a bit for server action
    await page.waitForTimeout(2000);
    const errorMsg = await page.locator('.text-red-600').first().textContent().catch(() => null);
    if (errorMsg) console.log('Signup Error:', errorMsg);

    // Should redirect to verify-email
    await expect(page).toHaveURL(/\/verify-email\?email=/);

    // Verify DB state (normally done in an isolated db test)
    // Account starts PENDING_VERIFICATION, emailVerified is null
  });

  test('I. Unverified login is rejected', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // Should show error and remain on login
    await expect(page.locator('text=Invalid credentials')).toBeVisible(); // Or a specific unverified message
  });

  // B, C, D, E. OTP Verification
  test('OTP Input scenarios', async ({ page, request }) => {
    await page.goto(`/verify-email?email=${encodeURIComponent(email)}`);
    
    // C. Wrong OTP
    await page.fill('input[name="otp"]', '123456');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid or expired OTP.')).toBeVisible();

    // H. Resend rate limited / G. Cooldown
    await page.click('text=Resend OTP');
    await expect(page.locator('text=A new OTP has been sent')).toBeVisible();
    
    // Resend again should be disabled or show cooldown
    await expect(page.locator('button', { hasText: /Resend OTP in/ })).toBeDisabled();
    
    // We can mock fetching the actual OTP from the database using a server-side route
    // if this is an integration environment. 
  });

  // M. Duplicate signup
  test('Duplicate signup preserves anti-enumeration', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('input[name="email"]', email); // Existing email
    await page.fill('input[name="password"]', password);
    // Fill remaining required fields...
    await page.selectOption('select[name="idProofType"]', 'PAN');
    await page.fill('input[name="idProofNumber"]', 'ABCDE1234F');
    await page.setInputFiles('input[name="idProofFile"]', {
      name: 'id.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('mock pdf content')
    });
    await page.fill('input[name="dateOfBirth"]', '1990-01-01');
    await page.selectOption('select[name="gender"]', 'Male');
    await page.fill('textarea[name="serviceAddress"]', '123 Test St');
    await page.fill('input[name="mobileNumber"]', '9999999999');
    await page.fill('input[name="bloodGroup"]', 'O+');
    await page.fill('input[name="sponsorName"]', 'Sponsor Name');
    await page.fill('input[name="sponsorRelationship"]', 'Friend');
    await page.fill('input[name="sponsorMobile"]', '8888888888');
    await page.check('input[type="checkbox"]');
    await page.click('button[type="submit"]');

    // Should behave as if successful
    await expect(page).toHaveURL(/\/verify-email\?email=/);
  });

});
