import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

test.describe('Phase 19E.1 Payment Security E2E Tests', () => {
  let userA: any;
  let userB: any;
  let invoiceA: any;
  let invoiceB: any;
  let carePlan: any;
  let renewalA: any;

  test.beforeAll(async () => {
    const passwordHash = await bcrypt.hash('SecurePass123!', 10);
    
    userA = await db.user.create({
      data: {
        name: 'User A',
        email: `usera_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@example.com`,
        passwordHash,
        role: 'USER',
        memberProfile: {
          create: { firstName: 'User', lastName: 'A' }
        }
      }
    });

    invoiceA = await db.invoice.create({
      data: {
        referenceNumber: `INV-A-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: userA.id,
        total: 15000,
        subtotal: 12000,
        taxAmount: 3000,
        currency: 'INR',
        lineItems: {
          create: { description: 'Test Package A', unitPrice: 12000, lineTotal: 15000 }
        }
      }
    });

    carePlan = await db.carePlan.create({
      data: {
        name: 'Test Care Plan',
        slug: `test-plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
      }
    });

    renewalA = await db.renewalRequest.create({
      data: {
        userId: userA.id,
        carePlanId: carePlan.id,
        variantType: 'SINGLE',
        durationMonths: 1,
        requestedStartDate: new Date(),
        calculatedEndDate: new Date(),
        planName: 'Test Care Plan',
        documentedTotal: 15000,
        status: 'APPROVED'
      }
    });

    userB = await db.user.create({
      data: {
        name: 'User B',
        email: `userb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}@example.com`,
        passwordHash,
        role: 'USER',
        memberProfile: {
          create: { firstName: 'User', lastName: 'B' }
        }
      }
    });

    invoiceB = await db.invoice.create({
      data: {
        referenceNumber: `INV-B-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: userB.id,
        total: 20000,
        currency: 'INR',
        lineItems: {
          create: { description: 'Test Package B', unitPrice: 20000, lineTotal: 20000 }
        }
      }
    });
  });

  test.afterAll(async () => {
    // Delete payments first (if any)
    if (invoiceA?.id) await db.payment.deleteMany({ where: { invoiceId: invoiceA.id } });
    if (invoiceB?.id) await db.payment.deleteMany({ where: { invoiceId: invoiceB.id } });
    
    // Delete invoices
    if (invoiceA?.id) await db.invoice.delete({ where: { id: invoiceA.id } });
    if (invoiceB?.id) await db.invoice.delete({ where: { id: invoiceB.id } });

    // Delete renewal and plan
    if (renewalA?.id) await db.renewalRequest.delete({ where: { id: renewalA.id } });
    if (carePlan?.id) await db.carePlan.delete({ where: { id: carePlan.id } });

    // Now safe to delete users
    if (userA?.id) await db.user.delete({ where: { id: userA.id } });
    if (userB?.id) await db.user.delete({ where: { id: userB.id } });
    await db.$disconnect();
  });

  test('Unauthenticated checkout redirects to login', async ({ page }) => {
    await page.goto(`/checkout/${invoiceA.id}`);
    await expect(page).toHaveURL(new RegExp('.*\/login.*'));
  });

  test('Provider-not-configured state does not claim payment success', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', userA.email);
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    
    // Add debug:
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });

    await page.goto(`/checkout/${invoiceA.id}`);
    
    // Depending on whether we have Cashfree environment variables, it might redirect or error.
    // If we click pay, it should definitely not redirect to a generic /success page claiming success.
    await page.click('button:has-text("Pay Online Now")');

    await expect(page).not.toHaveURL(/.*\/success/);
    
    // Verify invoice is still NOT paid
    const updatedInvoice = await db.invoice.findUnique({ where: { id: invoiceA.id }});
    expect(updatedInvoice?.status).not.toBe('PAID');
  });

  test('Unauthorized invoice access is blocked (IDOR)', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', userA.email);
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });

    const response = await page.goto(`/checkout/${invoiceB.id}`);
    expect(response?.status()).toBe(404);
  });

  test('Offline payment submission requires auth and prevents amount tampering', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', userA.email);
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });

    await page.goto(`/checkout/${invoiceA.id}?renewal=${renewalA.id}`);

    // Tamper with the amount field
    await page.evaluate(() => {
      const amountInput = document.querySelector('input[name="amount"]') as HTMLInputElement;
      if (amountInput) amountInput.value = '1';
    });

    await page.fill('input[name="reference"]', 'TAMPER-TEST-123');
    await page.click('button:has-text("Submit Verification Request")');

    // Wait for the action to complete. It should either throw an error (500) or redirect.
    // If it throws an Error("Amount mismatch"), the URL stays the same but the page is an error page.
    await page.waitForTimeout(2000); // Give server action time
    
    // Verify backend REJECTED the tampered amount and did NOT create the payment
    const payment = await db.payment.findFirst({
      where: { invoiceId: invoiceA.id, reference: 'TAMPER-TEST-123' }
    });

    expect(payment).toBeNull(); // It should be blocked!
  });
});
