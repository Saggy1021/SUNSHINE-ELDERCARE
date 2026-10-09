import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import os from 'os';

const prisma = new PrismaClient();
// NOTE: This test runs against localhost:3000 (configured in playwright.config.ts baseURL).
// The LIVE_URL is intentionally removed — use local Docker + Next.js dev server for E2E.
// Staging deployment is verified separately via Vercel CLI / deployment checks.

test.describe('Signup Flow (Local)', () => {
  let testFile: string;
  // Use Date.now() + random suffix to guarantee uniqueness even under parallel runs
  const testEmail = `local.signup.test.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@example.com`;

  test.beforeAll(async () => {
    // Create a dummy ID proof file for testing
    testFile = path.join(os.tmpdir(), 'dummy-id-proof.pdf');
    fs.writeFileSync(testFile, '%PDF-1.4\n%âãÏÓ\ndummy pdf content for testing');
  });

  test.afterAll(async () => {
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
    await prisma.$disconnect();
  });

  test('Signup and verify DB atomicity (local)', async ({ page }) => {
    // Allow up to 90s: registration with file upload + bcrypt + auto-login + navigation
    test.setTimeout(90_000);
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    // Use a unique fake IP per test run to avoid sharing rate-limit buckets across parallel tests
    const fakeIp = `203.0.113.${Math.floor(Math.random() * 255)}`;
    await page.setExtraHTTPHeaders({
      'x-forwarded-for': fakeIp,
      'x-real-ip': fakeIp
    });

    console.log(`[signup-e2e] navigating to /signup — email: ${testEmail} — ip: ${fakeIp}`);
    await page.goto('/signup');
    
    // Fill out the required form fields
    await page.fill('input[name="firstName"]', 'Staging');
    await page.fill('input[name="lastName"]', 'Tester');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'StrongPass123!');
    
    // Member Details
    await page.selectOption('select[name="idProofType"]', 'Passport');
    await page.fill('input[name="idProofNumber"]', 'PASS1234');
    await page.setInputFiles('input[name="idProofFile"]', testFile);
    await page.fill('input[name="dateOfBirth"]', '1950-01-01');
    await page.selectOption('select[name="gender"]', 'Male');
    await page.fill('textarea[name="serviceAddress"]', '123 Test St');
    await page.fill('input[name="mobileNumber"]', '1234567890');
    await page.fill('input[name="bloodGroup"]', 'O+');
    
    // Emergency Contact
    await page.fill('input[name="emergencyContactName"]', 'Emergency Contact');
    await page.fill('input[name="emergencyContactRelationship"]', 'Friend');
    await page.fill('input[name="emergencyContactMobile"]', '0987654321');
    
    // Sponsor Details
    await page.fill('input[name="sponsorName"]', 'Sponsor Name');
    await page.fill('input[name="sponsorRelationship"]', 'Son');
    await page.fill('input[name="sponsorMobile"]', '1122334455');
    
    // Authorization
    await page.check('input[name="shiftAuthorization"]');

    console.log('[signup-e2e] Waiting for hydration...');
    await page.waitForLoadState('networkidle');
    // Small random stagger (0–800ms) to reduce rate-limit collisions when multiple
    // signup tests run in parallel under fullyParallel: true
    await page.waitForTimeout(500 + Math.floor(Math.random() * 800));

    console.log('[signup-e2e] Checking for HTML5 validation errors...');
    const invalidFields = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return [];
      const invalid = Array.from(form.querySelectorAll(':invalid'));
      return invalid.map(el => el.getAttribute('name') || el.tagName);
    });
    if (invalidFields.length > 0) {
      console.error('[signup-e2e] Invalid fields before submit:', invalidFields);
    }

    console.log('[signup-e2e] Submitting form...');
    await page.click('button[type="submit"]');
    
    console.log('[signup-e2e] Waiting for navigation after submit (up to 60s)...');

    // Check for an immediate server-side error message (validation/rate-limit)
    const errorLocator = page.locator('.text-red-600');
    try {
      await expect(errorLocator).toBeVisible({ timeout: 4000 });
      const errorText = await errorLocator.innerText();
      // Fail fast with a clear message so the test output is readable
      throw new Error(`[signup-e2e] registerUser() returned an error: "${errorText}"`);
    } catch (e: any) {
      if (e.message.startsWith('[signup-e2e]')) throw e; // re-throw our error
      // No error message visible — continue to wait for navigation
    }

    // Wait for either /dashboard (success + auto-login) or /login (success + rate-limited auto-login)
    // Both outcomes mean the backend registration SUCCEEDED.
    // Timeout raised to 60s to accommodate local Next.js startup + bcrypt + file upload latency.
    await expect(page).toHaveURL(new RegExp('.*/(dashboard|login)'), { timeout: 60_000 });

    const currentUrl = page.url();
    console.log(`[signup-e2e] Navigation landed on: ${currentUrl}`);

    if (currentUrl.includes('/dashboard')) {
      // Auto-login succeeded
      await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10_000 });
      console.log('[signup-e2e] Auto-login succeeded — dashboard visible.');
    } else {
      // Auto-login was rate-limited; signup itself still succeeded.
      // The form redirected to /login?callbackUrl=/dashboard which is the correct fallback.
      console.log('[signup-e2e] Auto-login was rate-limited — landed on /login. Signup backend succeeded.');
      expect(currentUrl).toMatch(/\/login/);
    }

    // Verify database state
    console.log("Verifying Database State...");
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
      include: {
        memberProfile: {
          include: {
            idProofDocument: true
          }
        },
        ownedDocuments: true
      }
    }) as any;

    // Assert User exists
    expect(user).not.toBeNull();
    expect(user?.email).toBe(testEmail);

    // Assert MemberProfile exists
    expect(user?.memberProfile).not.toBeNull();
    
    // Assert MemberDocument exists and references correctly
    expect(user?.memberProfile?.idProofDocument).not.toBeNull();
    expect(user?.ownedDocuments.length).toBeGreaterThan(0);
    
    const doc = user?.ownedDocuments.find((d: any) => d.id === user.memberProfile?.idProofDocumentId);
    expect(doc).toBeDefined();
    expect(doc?.userId).toBe(user?.id);
    console.log("Database Verification Successful!");
  });
});
