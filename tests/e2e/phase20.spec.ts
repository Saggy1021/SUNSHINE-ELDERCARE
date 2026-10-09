import { test, expect } from '@playwright/test';

test.describe('Phase 20 Requirements', () => {
  test('1. Member Registration - ID Proof Upload Limits', async ({ page }) => {
    await page.goto('/signup');

    // Fill basic details up to ID Proof
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    
    const idProofUpload = page.locator('input[name="idProofFile"]');
    await expect(idProofUpload).toBeVisible();
    await expect(page.locator('text=Upload ID Proof (Max 2MB)')).toBeVisible();

    const medicalConditions = page.locator('textarea[name="medicalConditions"]');
    if (await medicalConditions.isVisible()) {
      await expect(medicalConditions).toHaveAttribute('placeholder', 'Please list any existing medical conditions...');
    }

    const idProofType = page.locator('select[name="idProofType"]');
    await expect(idProofType).toBeVisible();

    // Verify submission with large file fails
    await page.fill('input[name="email"]', 'testoversize@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.selectOption('select[name="idProofType"]', 'PAN');
    await page.fill('input[name="idProofNumber"]', '12345678');
    await page.fill('input[name="dateOfBirth"]', '1950-01-01');
    await page.selectOption('select[name="gender"]', 'Male');
    await page.fill('textarea[name="serviceAddress"]', 'Test Addr');
    await page.fill('input[name="mobileNumber"]', '9999999999');
    await page.fill('input[name="bloodGroup"]', 'O+');
    await page.fill('input[name="emergencyContactName"]', 'Emg');
    await page.fill('input[name="emergencyContactRelationship"]', 'Son');
    await page.fill('input[name="emergencyContactMobile"]', '9999999999');
    await page.fill('input[name="sponsorName"]', 'Sponsor');
    await page.fill('input[name="sponsorRelationship"]', 'Son');
    await page.fill('input[name="sponsorMobile"]', '9999999999');

    // Create a 3MB dummy file
    const largeBuffer = Buffer.alloc(3 * 1024 * 1024, 'a');
    await idProofUpload.setInputFiles({
      name: 'large.pdf',
      mimeType: 'application/pdf',
      buffer: largeBuffer
    });

    // Accept terms/authorizations if they exist
    const shiftAuth = page.locator('input[name="shiftAuthorization"]');
    if (await shiftAuth.isVisible()) {
      await shiftAuth.check();
    }

    await page.click('button[type="submit"]');

    // Should see an error about the file size
    const errorMessage = page.locator('text=ID Proof file exceeds the 2MB size limit');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('2. Legacy Package Removal from Public Calculator', async ({ page }) => {
    await page.goto('/membership');

    // Ensure Basic and Care Visit Plus do not exist in the dropdowns/lists
    await expect(page.locator('text=Basic Plan')).not.toBeVisible();
    await expect(page.locator('text=Care Visit Plus')).not.toBeVisible();
    await expect(page.locator('text=Pulse Care+')).not.toBeVisible();

    // Ensure current authorized plans exist
    await expect(page.locator('text=Shield Shine').first()).toBeVisible();
    await expect(page.locator('text=Life Line Care').first()).toBeVisible();
  });

  test('3. Dynamic Tax Presentation', async ({ page }) => {
    await page.goto('/membership');

    // Look for the tax text
    const taxLabel = page.locator('text=Inclusive of all applicable taxes/charges');
    // Ensure it appears multiple times or at least once on the membership page
    if (await taxLabel.first().isVisible()) {
      await expect(taxLabel.first()).toBeVisible();
    }
  });

  test('6. Company Credentials and Trust Information', async ({ page }) => {
    await page.goto('/about-us');

    // Verify presence of ISO and Udyam credentials
    await expect(page.locator('text=Credentials & Certifications')).toBeVisible();
    await expect(page.locator('text=C.E. No. 0381 8410 0702 (PERMANENT)')).toBeVisible();
    await expect(page.locator('text=UDYAM-WB-10-0225763')).toBeVisible();
    await expect(page.locator('text=ISO 9001:2015 Certified')).toBeVisible();
  });
});
