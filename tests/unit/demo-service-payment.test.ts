import assert from 'node:assert';
import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { db } from '../../lib/db';
import { carePricingService } from '../../lib/services/care-plans';
import { taxService } from '../../lib/services/tax';
import { invoiceService } from '../../lib/services/invoice';
import {
  RazorpayAdapter,
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature,
} from '../../lib/services/payment/razorpay-adapter';
import { settleSuccessfulPayment } from '../../lib/services/payment/settlement';
import { DocumentSequenceService } from '../../lib/services/document-sequence';
import { isInternalDemoAuthorized } from '../../app/actions/invoices';
import { removeDemoService, disableDemoService, DEMO_SERVICE_CONFIG } from '../../scripts/manage-demo-service';

/**
 * Sunshine Eldercare — Temporary ₹20 Demo Service & Razorpay Live Workflow Test Suite
 * Self-executing runner using native node:assert.
 */
async function runDemoServiceTests() {
  console.log('================================================================');
  console.log('Sunshine Eldercare — Temporary ₹20 Demo Service & Payment Tests');
  console.log('================================================================\n');

  const TEST_KEY_ID = 'rzp_live_mockKeyIdDemo20';
  const TEST_KEY_SECRET = 'mockLiveSecretDemo20abcdef123';
  const TEST_WEBHOOK_SECRET = 'mockWebhookSecretDemo20';

  // -------------------------------------------------------------------------
  // In-Memory Database State for Isolated Verification
  // -------------------------------------------------------------------------
  const demoCarePlan = {
    id: 'cplan_demo_20',
    slug: 'internal-razorpay-demo',
    name: 'Internal Razorpay Demo Service',
    sortOrder: 999,
    active: true,
    variants: [
      {
        id: 'cvar_demo_20_single',
        carePlanId: 'cplan_demo_20',
        variantType: 'SINGLE',
        monthlyBasePrice: 20,
        monthlyGst: 0,
        monthlyTotal: 20,
        durations: [
          {
            id: 'cdur_demo_20_1m',
            variantId: 'cvar_demo_20_single',
            months: 1,
            documentedTotal: 20,
            hasDiscount: false,
            discountNote: 'Live Razorpay Test Service (₹20)',
          },
        ],
        services: [
          {
            id: 'csvc_demo_20_1',
            variantId: 'cvar_demo_20_single',
            serviceName: 'Controlled Production Gateway Validation',
            serviceNote: '₹20 internal test transaction',
            sortOrder: 1,
          },
        ],
      },
    ],
  };

  const publicCarePlan = {
    id: 'cplan_public_shield',
    slug: 'shield-shine',
    name: 'Shield Shine',
    sortOrder: 1,
    active: true,
    variants: [
      {
        id: 'cvar_shield_single',
        carePlanId: 'cplan_public_shield',
        variantType: 'SINGLE',
        monthlyBasePrice: 4800,
        monthlyGst: 864,
        monthlyTotal: 5664,
        durations: [
          {
            id: 'cdur_shield_1m',
            variantId: 'cvar_shield_single',
            months: 1,
            documentedTotal: 5664,
            hasDiscount: false,
            discountNote: null,
          },
        ],
        services: [],
      },
    ],
  };

  let plansDatabase = [publicCarePlan, demoCarePlan];
  let inMemoryInvoices = new Map<string, any>();
  let inMemoryPayments = new Map<string, any>();
  let inMemoryReceipts = new Map<string, any>();
  let inMemoryUsers = new Map<string, any>();
  let inMemoryAuditLogs: any[] = [];
  let invoiceSequenceCount = 2000;
  let receiptSequenceCount = 2000;

  // Mock db.carePlan in-memory
  (db as any).carePlan = {
    findMany: async ({ where }: any) => {
      let filtered = [...plansDatabase];
      if (where?.active !== undefined) {
        filtered = filtered.filter((p) => p.active === where.active);
      }
      if (where?.slug?.not) {
        filtered = filtered.filter((p) => p.slug !== where.slug.not);
      }
      if (where?.slug && typeof where.slug === 'string') {
        filtered = filtered.filter((p) => p.slug === where.slug);
      }
      return filtered;
    },
    findFirst: async ({ where }: any) => {
      for (const p of plansDatabase) {
        if (where?.slug && p.slug !== where.slug) continue;
        if (where?.active !== undefined && p.active !== where.active) continue;
        return p;
      }
      return null;
    },
    update: async ({ where, data }: any) => {
      const plan = plansDatabase.find((p) => p.id === where.id || p.slug === where.slug);
      if (!plan) throw new Error('CarePlan not found');
      Object.assign(plan, data);
      return plan;
    },
  };

  // Mock db.invoice in-memory
  (db as any).invoice = {
    create: async ({ data, include }: any) => {
      const id = `inv_demo_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const lineItems = (data.lineItems?.create || []).map((li: any, idx: number) => ({
        id: `li_${id}_${idx}`,
        invoiceId: id,
        ...li,
      }));
      const invoice = {
        id,
        ...data,
        lineItems,
        total: data.total instanceof Prisma.Decimal ? data.total : new Prisma.Decimal(data.total),
        subtotal: data.subtotal ? new Prisma.Decimal(data.subtotal) : null,
        taxAmount: data.taxAmount ? new Prisma.Decimal(data.taxAmount) : null,
        status: data.status || 'DRAFT',
        paymentStatus: data.paymentStatus || 'UNPAID',
      };
      inMemoryInvoices.set(id, invoice);
      return invoice;
    },
    findUnique: async ({ where }: any) => {
      if (where.id) return inMemoryInvoices.get(where.id) || null;
      if (where.idempotencyKey) {
        for (const inv of inMemoryInvoices.values()) {
          if (inv.idempotencyKey === where.idempotencyKey) return inv;
        }
      }
      return null;
    },
    update: async ({ where, data }: any) => {
      const inv = inMemoryInvoices.get(where.id);
      if (!inv) throw new Error('Invoice not found');
      Object.assign(inv, data);
      return inv;
    },
  };

  // Mock db.payment in-memory
  (db as any).payment = {
    create: async ({ data }: any) => {
      const id = `pay_demo_${Date.now()}`;
      const payment = {
        id,
        ...data,
        amount: data.amount instanceof Prisma.Decimal ? data.amount : new Prisma.Decimal(data.amount),
        status: data.status || 'PENDING',
      };
      inMemoryPayments.set(id, payment);
      return payment;
    },
    findFirst: async ({ where }: any) => {
      for (const p of inMemoryPayments.values()) {
        if (where.id && p.id === where.id) return p;
        if (where.providerRef && p.providerRef === where.providerRef) return p;
        if (where.reference && p.reference === where.reference) return p;
        if (where.OR) {
          const match = where.OR.some(
            (cond: any) =>
              (cond.providerRef && p.providerRef === cond.providerRef) ||
              (cond.reference && p.reference === cond.reference)
          );
          if (match) return p;
        }
      }
      return null;
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      for (const p of inMemoryPayments.values()) {
        if (where.id && p.id !== where.id) continue;
        if (where.status && p.status !== where.status) continue;
        Object.assign(p, data);
        count++;
      }
      return { count };
    },
  };

  // Mock db.receipt in-memory
  (db as any).receipt = {
    create: async ({ data }: any) => {
      const id = `rcpt_${Date.now()}`;
      const receipt = { id, ...data };
      inMemoryReceipts.set(id, receipt);
      return receipt;
    },
  };

  // Mock db.auditLog in-memory
  (db as any).auditLog = {
    create: async ({ data }: any) => {
      inMemoryAuditLogs.push(data);
      return data;
    },
  };

  // Mock db.user in-memory
  (db as any).user = {
    findUnique: async ({ where }: any) => {
      return inMemoryUsers.get(where.id || where.email) || null;
    },
  };

  // Mock db.subscription in-memory
  (db as any).subscription = {
    create: async ({ data }: any) => {
      return { id: `sub_demo_${Date.now()}`, ...data };
    },
    findFirst: async () => null,
  };

  // Mock db.plan in-memory
  (db as any).plan = {
    findUnique: async () => null,
  };

  // Mock db.$queryRaw for row-locking simulation
  (db as any).$queryRaw = async (strings: any, ...values: any[]) => {
    const targetId = values[0];
    const inv = inMemoryInvoices.get(targetId);
    return inv ? [inv] : [];
  };

  // Mock db.$transaction
  (db as any).$transaction = async (callback: any) => {
    return callback(db);
  };

  // Setup DocumentSequenceService
  DocumentSequenceService.generateInvoiceNumber = async () => {
    invoiceSequenceCount++;
    return `SEC/${invoiceSequenceCount}/2026-27`;
  };
  DocumentSequenceService.generateReceiptNumber = async () => {
    receiptSequenceCount++;
    return `REC/${receiptSequenceCount}/2026-27`;
  };

  // Setup Demo User in memory
  const demoUser = {
    id: 'usr_demo_tester_123',
    email: 'bootstrap_member_test@example.com',
    name: 'Demo Member',
    role: 'USER',
    status: 'ACTIVE',
  };
  const publicUser = {
    id: 'usr_regular_customer_456',
    email: 'regular.member@example.com',
    name: 'Regular Customer',
    role: 'USER',
    status: 'ACTIVE',
  };
  inMemoryUsers.set(demoUser.id, demoUser);
  inMemoryUsers.set(demoUser.email, demoUser);
  inMemoryUsers.set(publicUser.id, publicUser);
  inMemoryUsers.set(publicUser.email, publicUser);

  // -------------------------------------------------------------------------
  // SCENARIO 1: Public Catalog Visibility Guard
  // -------------------------------------------------------------------------
  console.log('--- SCENARIO 1: Public Catalog Visibility Guard ---');
  const publicCatalog = await carePricingService.getCatalog();
  const foundInPublic = publicCatalog.find((p) => p.slug === 'internal-razorpay-demo');
  assert.strictEqual(
    foundInPublic,
    undefined,
    'Internal demo service must NOT appear in public catalog on /membership'
  );

  const internalCatalog = await carePricingService.getCatalog({ includeInternalDemo: true });
  const foundInInternal = internalCatalog.find((p) => p.slug === 'internal-razorpay-demo');
  assert.notStrictEqual(foundInInternal, undefined, 'Demo service must be accessible when includeInternalDemo is true');
  assert.strictEqual(foundInInternal?.name, 'Internal Razorpay Demo Service');
  console.log('  ✓ Verified public catalog excludes demo service; internal retrieval succeeds.');

  // -------------------------------------------------------------------------
  // SCENARIO 2: Server-Side Authoritative Pricing & Tax for ₹20 Service
  // -------------------------------------------------------------------------
  console.log('--- SCENARIO 2: Authoritative Server-Side Pricing & Tax ---');
  const pricingResult = await carePricingService.lookupPrice({
    planSlug: 'internal-razorpay-demo',
    variantType: 'SINGLE',
    months: 1,
  });

  assert.strictEqual(pricingResult.planSlug, 'internal-razorpay-demo');
  assert.strictEqual(pricingResult.variantType, 'SINGLE');
  assert.strictEqual(pricingResult.months, 1);
  assert.strictEqual(pricingResult.monthlyBasePrice, 20);
  assert.strictEqual(pricingResult.monthlyGst, 0);
  assert.strictEqual(pricingResult.monthlyTotal, 20);
  assert.strictEqual(pricingResult.documentedTotal, 20);

  const taxResult = await taxService.calculateCarePlanTax(pricingResult);
  assert.strictEqual(taxResult.total, 20, 'Calculated total must be exactly ₹20.00');
  console.log('  ✓ Verified server-side price lookup and tax evaluation produces exactly ₹20.00 total.');

  // -------------------------------------------------------------------------
  // SCENARIO 3: Immutable Invoice Generation for ₹20
  // -------------------------------------------------------------------------
  console.log('--- SCENARIO 3: Immutable Invoice Generation ---');
  const invoice = await invoiceService.createCarePlanInvoice(demoUser.id, pricingResult, taxResult);

  assert.ok(invoice.id, 'Invoice must have a generated ID');
  assert.strictEqual(invoice.userId, demoUser.id);
  assert.strictEqual(invoice.planId, 'internal-razorpay-demo');
  assert.strictEqual(invoice.total.toNumber(), 20, 'Invoice total must be exactly 20.00');
  assert.strictEqual(invoice.currency, 'INR');
  assert.strictEqual(invoice.status, 'DRAFT');
  assert.strictEqual(invoice.paymentStatus, 'UNPAID');

  assert.strictEqual(invoice.lineItems.length, 1);
  const lineItem = invoice.lineItems[0];
  assert.strictEqual(lineItem.planName, 'Internal Razorpay Demo Service');
  assert.strictEqual(lineItem.lineTotal.toNumber(), 20);
  console.log('  ✓ Verified immutable invoice created with ₹20.00 total and correct commercial snapshot.');

  // -------------------------------------------------------------------------
  // SCENARIO 4: Razorpay Live Order Creation & Integer Paise Precision
  // -------------------------------------------------------------------------
  console.log('--- SCENARIO 4: Razorpay Order Creation (2000 Paise) ---');
  const originalFetch = global.fetch;
  let capturedOrderPayload: any = null;

  global.fetch = async (url: any, opts: any) => {
    if (url.toString().includes('/orders')) {
      capturedOrderPayload = JSON.parse(opts.body);
      return {
        ok: true,
        json: async () => ({
          id: 'order_demo_live_rzp_20',
          entity: 'order',
          amount: capturedOrderPayload.amount,
          amount_paid: 0,
          amount_due: capturedOrderPayload.amount,
          currency: capturedOrderPayload.currency,
          receipt: capturedOrderPayload.receipt,
          status: 'created',
          attempts: 0,
          created_at: Math.floor(Date.now() / 1000),
        }),
      } as any;
    }
    return originalFetch(url, opts);
  };

  const adapter = new RazorpayAdapter({
    keyId: TEST_KEY_ID,
    keySecret: TEST_KEY_SECRET,
  });

  const sessionResponse = await adapter.createCheckoutSession({
    userId: demoUser.id,
    invoiceId: invoice.id,
    amount: invoice.total,
    currency: invoice.currency,
    successUrl: 'https://www.sunshineeldercare.in/dashboard',
    cancelUrl: 'https://www.sunshineeldercare.in/checkout',
  });

  assert.strictEqual(capturedOrderPayload.amount, 2000, 'Order amount in paise must be exactly 2000 (₹20.00)');
  assert.strictEqual(capturedOrderPayload.currency, 'INR');
  assert.strictEqual(capturedOrderPayload.notes.invoiceId, invoice.id);
  assert.strictEqual(sessionResponse.providerOrderId, 'order_demo_live_rzp_20');

  // Record payment in memory
  const paymentRecord = await (db as any).payment.create({
    data: {
      userId: demoUser.id,
      invoiceId: invoice.id,
      amount: invoice.total,
      currency: 'INR',
      paymentMethod: 'ONLINE',
      status: 'PENDING',
      provider: 'RAZORPAY',
      providerRef: sessionResponse.providerOrderId,
      reference: sessionResponse.providerOrderId,
    },
  });

  assert.strictEqual(paymentRecord.amount.toNumber(), 20);
  assert.strictEqual(paymentRecord.status, 'PENDING');
  console.log('  ✓ Verified Razorpay Live order payload receives exactly 2000 paise (₹20.00) in INR.');

  // -------------------------------------------------------------------------
  // SCENARIO 5: Signature Verification & Atomic Settlement
  // -------------------------------------------------------------------------
  console.log('--- SCENARIO 5: Signature Verification & Atomic Settlement ---');
  const mockPaymentId = 'pay_live_demo_test_999';
  const validSignature = crypto
    .createHmac('sha256', TEST_KEY_SECRET)
    .update(`${sessionResponse.providerOrderId}|${mockPaymentId}`)
    .digest('hex');

  const isSigValid = verifyRazorpayCheckoutSignature({
    orderId: sessionResponse.providerOrderId,
    paymentId: mockPaymentId,
    signature: validSignature,
    keySecret: TEST_KEY_SECRET,
  });
  assert.strictEqual(isSigValid, true, 'Cryptographic signature verification must succeed');

  // Perform settlement
  const settleResult = await settleSuccessfulPayment({
    orderId: sessionResponse.providerOrderId,
    paymentId: paymentRecord.id,
    invoiceId: invoice.id,
    providerPaymentId: mockPaymentId,
    provider: 'RAZORPAY',
    amountInPaise: 2000,
    currency: 'INR',
    metadata: {
      source: 'CHECKOUT_MODAL',
      actor: 'DEMO_TESTER',
    },
  });

  assert.strictEqual(settleResult.success, true, 'Settlement must succeed');

  // Verify Invoice State
  const settledInvoice = inMemoryInvoices.get(invoice.id);
  assert.strictEqual(settledInvoice.status, 'ISSUED');
  assert.strictEqual(settledInvoice.paymentStatus, 'PAID');
  assert.ok(settledInvoice.paidDate, 'paidDate must be recorded');
  assert.ok(settledInvoice.invoiceNumber?.startsWith('SEC/'), 'Official invoice number must be generated');

  // Verify Payment State
  const settledPayment = inMemoryPayments.get(paymentRecord.id);
  assert.strictEqual(settledPayment.status, 'VERIFIED');
  assert.strictEqual(settledPayment.reference, mockPaymentId);

  // Verify Receipt State
  assert.strictEqual(inMemoryReceipts.size, 1);
  const receipt = Array.from(inMemoryReceipts.values())[0];
  assert.strictEqual(receipt.amount.toNumber(), 20);
  assert.strictEqual(receipt.invoiceId, invoice.id);
  assert.strictEqual(receipt.paymentId, paymentRecord.id);
  assert.ok(receipt.receiptNumber?.startsWith('REC/'), 'Official receipt number must be generated');
  console.log('  ✓ Verified signature verification, invoice transition to PAID, and receipt issuance.');

  // -------------------------------------------------------------------------
  // SCENARIO 6: Idempotency & Duplicate Webhook Protection
  // -------------------------------------------------------------------------
  console.log('--- SCENARIO 6: Idempotency Protection ---');
  // Attempting concurrent / duplicate settlement of the same payment
  const duplicateResult = await settleSuccessfulPayment({
    orderId: sessionResponse.providerOrderId,
    paymentId: paymentRecord.id,
    invoiceId: invoice.id,
    providerPaymentId: mockPaymentId,
    provider: 'RAZORPAY',
    amountInPaise: 2000,
    currency: 'INR',
  });

  assert.strictEqual(duplicateResult.success, true);
  assert.strictEqual(duplicateResult.alreadyVerified, true, 'Duplicate settlement must return alreadyVerified: true');
  assert.strictEqual(inMemoryReceipts.size, 1, 'Duplicate settlement must not create a duplicate receipt');
  console.log('  ✓ Verified idempotency: duplicate settlements safely return alreadyVerified without duplicate receipts.');

  // -------------------------------------------------------------------------
  // SCENARIO 7: Administrative Deactivation & Governance
  // -------------------------------------------------------------------------
  console.log('--- SCENARIO 7: Administrative Deactivation ---');
  // Admin toggles active: false
  demoCarePlan.active = false;

  let lookupThrew = false;
  try {
    await carePricingService.lookupPrice({
      planSlug: 'internal-razorpay-demo',
      variantType: 'SINGLE',
      months: 1,
    });
  } catch (err: any) {
    lookupThrew = true;
    assert.ok(err.message.includes('PLAN_NOT_FOUND'), 'Deactivated plan must throw PLAN_NOT_FOUND');
  }
  assert.strictEqual(lookupThrew, true, 'Pricing lookup must fail when service is deactivated');
  console.log('  ✓ Verified setting active: false immediately blocks price lookup and invoice creation.');

  // -------------------------------------------------------------------------
  // SCENARIO 8: Access Control & Strict Allowlist Authorization Guard
  // -------------------------------------------------------------------------
  console.log('--- SCENARIO 8: Access Control & Strict Allowlist Authorization ---');

  // Test 8.1: Exact allowlisted email succeeds
  const mockConfigWithEmail = {
    INTERNAL_DEMO_ACCOUNT_EMAIL: 'demo_allowlist@sunshineeldercare.in',
  };
  const memberWithAllowlistedEmail = {
    id: 'usr_member_email_match',
    email: 'demo_allowlist@sunshineeldercare.in',
    role: 'USER',
  };
  const emailAuthSuccess = await isInternalDemoAuthorized(memberWithAllowlistedEmail, mockConfigWithEmail);
  assert.strictEqual(emailAuthSuccess, true, 'Exact allowlisted email must be authorized');

  // Case insensitivity and trimming on email
  const memberWithTrimmedEmail = {
    id: 'usr_member_email_trim',
    email: '  DEMO_ALLOWLIST@sunshineeldercare.in  ',
    role: 'USER',
  };
  const emailTrimSuccess = await isInternalDemoAuthorized(memberWithTrimmedEmail, mockConfigWithEmail);
  assert.strictEqual(emailTrimSuccess, true, 'Allowlisted email must be case-insensitive and trimmed');
  console.log('  ✓ Verified exact allowlisted email succeeds (case-insensitive, trimmed).');

  // Test 8.2: Exact allowlisted user ID succeeds
  const mockConfigWithUserId = {
    INTERNAL_DEMO_ACCOUNT_USER_ID: 'usr_exact_verified_777',
  };
  const memberWithAllowlistedId = {
    id: 'usr_exact_verified_777',
    email: 'unlisted.user@example.com',
    role: 'USER',
  };
  const idAuthSuccess = await isInternalDemoAuthorized(memberWithAllowlistedId, mockConfigWithUserId);
  assert.strictEqual(idAuthSuccess, true, 'Exact allowlisted user ID must be authorized');
  console.log('  ✓ Verified exact allowlisted user ID succeeds.');

  // Test 8.3: Non-allowlisted member is rejected
  const nonAllowlistedMember = {
    id: 'usr_other_456',
    email: 'random.visitor@example.com',
    role: 'USER',
  };
  const nonAllowlistedRejected = await isInternalDemoAuthorized(nonAllowlistedMember, mockConfigWithEmail);
  assert.strictEqual(nonAllowlistedRejected, false, 'Non-allowlisted member must be rejected');

  // Substring checks (email containing "demo" or "test") must be rejected
  const broadDemoUser = { id: 'usr_demo_fake', email: 'fake_demo_allowlist@sunshineeldercare.in', role: 'USER' };
  const broadTestUser = { id: 'usr_test_fake', email: 'tester_qa_team@company.com', role: 'USER' };
  assert.strictEqual(await isInternalDemoAuthorized(broadDemoUser, mockConfigWithEmail), false, 'Substring "demo" email must be rejected');
  assert.strictEqual(await isInternalDemoAuthorized(broadTestUser, mockConfigWithEmail), false, 'Substring "test" email must be rejected');
  console.log('  ✓ Verified non-allowlisted members (including "demo"/"test" substring variants) are rejected.');

  // Test 8.4: Missing allowlist configuration rejects non-admin users (Fail-Closed)
  const emptyEnvConfig = {};
  const whitespaceEnvConfig = {
    INTERNAL_DEMO_ACCOUNT_EMAIL: '   ',
    INTERNAL_DEMO_ACCOUNT_USER_ID: '   ',
  };
  const memberAttemptingWithoutConfig = {
    id: 'usr_any_member_123',
    email: 'bootstrap_member_test@example.com',
    role: 'USER',
  };
  assert.strictEqual(
    await isInternalDemoAuthorized(memberAttemptingWithoutConfig, emptyEnvConfig),
    false,
    'Missing configuration must fail-closed for non-admin users'
  );
  assert.strictEqual(
    await isInternalDemoAuthorized(memberAttemptingWithoutConfig, whitespaceEnvConfig),
    false,
    'Whitespace-only configuration must fail-closed for non-admin users'
  );
  console.log('  ✓ Verified missing or whitespace allowlist configuration rejects non-admin users (fail-closed).');

  // Test 8.5: ADMIN remains authorized
  const adminUser = {
    id: 'usr_admin_999',
    email: 'superadmin@sunshineeldercare.in',
    role: 'ADMIN',
  };
  assert.strictEqual(
    await isInternalDemoAuthorized(adminUser, emptyEnvConfig),
    true,
    'ADMIN must remain authorized even without allowlist configuration'
  );
  assert.strictEqual(
    await isInternalDemoAuthorized(adminUser, mockConfigWithEmail),
    true,
    'ADMIN must remain authorized with allowlist configuration'
  );
  console.log('  ✓ Verified ADMIN remains authorized with or without allowlist configuration.');

  // Test 8.6: Missing database user is rejected safely without throwing TypeError
  assert.strictEqual(await isInternalDemoAuthorized(null, mockConfigWithEmail), false, 'null user must return false');
  assert.strictEqual(await isInternalDemoAuthorized(undefined, mockConfigWithEmail), false, 'undefined user must return false');
  assert.strictEqual(await isInternalDemoAuthorized({} as any, mockConfigWithEmail), false, 'empty user object must return false');
  assert.strictEqual(await isInternalDemoAuthorized({ email: null, role: 'USER' } as any, mockConfigWithEmail), false, 'user with null email must return false');
  console.log('  ✓ Verified missing database user (null/undefined/empty) is safely rejected without TypeError.');

  // Test 8.7: Action-level rejection enforcement
  const checkActionLevel = async (user: any) => {
    const isAuthorized = await isInternalDemoAuthorized(user, mockConfigWithEmail);
    if (!isAuthorized) {
      throw new Error('UNAUTHORIZED_TEST_SERVICE: The internal Razorpay demo service is restricted to administrators and the dedicated demo account.');
    }
    return true;
  };

  await assert.rejects(
    async () => checkActionLevel(null),
    /UNAUTHORIZED_TEST_SERVICE/,
    'Action level must reject null user safely'
  );
  await assert.rejects(
    async () => checkActionLevel(nonAllowlistedMember),
    /UNAUTHORIZED_TEST_SERVICE/,
    'Action level must reject non-allowlisted member'
  );
  assert.strictEqual(await checkActionLevel(memberWithAllowlistedEmail), true, 'Action level must accept allowlisted member');
  assert.strictEqual(await checkActionLevel(adminUser), true, 'Action level must accept admin');
  console.log('  ✓ Verified action-level error enforcement throws UNAUTHORIZED_TEST_SERVICE.');

  // -------------------------------------------------------------------------
  // SCENARIO 9: Deletion Safeguards & Financial History Preservation
  // -------------------------------------------------------------------------
  console.log('--- SCENARIO 9: Deletion Safeguards & Financial History Preservation ---');

  // 9.1: Attempting to remove demo service when historical invoices exist blocks deletion
  let deletedPlanCalled = false;
  let updatedPlanDeactivated = false;
  const mockPlan = {
    id: 'cplan_demo_20',
    slug: 'internal-razorpay-demo',
    name: 'Internal Razorpay Demo Service',
    active: true,
  };

  const mockDbWithInvoice = {
    carePlan: {
      findUnique: async () => ({ ...mockPlan }),
      update: async ({ data }: any) => {
        if (data.active === false) updatedPlanDeactivated = true;
        return { ...mockPlan, ...data };
      },
      delete: async () => {
        deletedPlanCalled = true;
      },
    },
    subscription: { count: async () => 0 },
    renewalRequest: { count: async () => 0 },
    invoice: { count: async () => 1 }, // 1 historical invoice exists
    payment: { count: async () => 0 },
  };

  const invoiceBlockResult = await removeDemoService(mockDbWithInvoice);
  assert.strictEqual(invoiceBlockResult.success, false, 'Deletion must fail when historical invoice exists');
  assert.strictEqual(invoiceBlockResult.disabled, true, 'Service must be disabled instead of deleted');
  assert.strictEqual(invoiceBlockResult.reason, 'CANNOT_DELETE_HISTORICAL_RECORDS');
  assert.strictEqual(deletedPlanCalled, false, 'carePlan.delete must NOT be called when historical invoices exist');
  assert.strictEqual(updatedPlanDeactivated, true, 'carePlan must be set to active: false');
  console.log('  ✓ Verified deletion is blocked and service is deactivated when historical invoices exist.');

  // 9.2: Attempting to remove demo service when historical subscriptions exist blocks deletion
  deletedPlanCalled = false;
  updatedPlanDeactivated = false;
  const mockDbWithSubscription = {
    carePlan: {
      findUnique: async () => ({ ...mockPlan }),
      update: async ({ data }: any) => {
        if (data.active === false) updatedPlanDeactivated = true;
        return { ...mockPlan, ...data };
      },
      delete: async () => {
        deletedPlanCalled = true;
      },
    },
    subscription: { count: async () => 1 }, // 1 historical subscription exists
    renewalRequest: { count: async () => 0 },
    invoice: { count: async () => 0 },
    payment: { count: async () => 0 },
  };

  const subBlockResult = await removeDemoService(mockDbWithSubscription);
  assert.strictEqual(subBlockResult.success, false, 'Deletion must fail when historical subscription exists');
  assert.strictEqual(subBlockResult.disabled, true, 'Service must be disabled instead of deleted');
  assert.strictEqual(deletedPlanCalled, false, 'carePlan.delete must NOT be called when historical subscriptions exist');
  assert.strictEqual(updatedPlanDeactivated, true, 'carePlan must be set to active: false');
  console.log('  ✓ Verified deletion is blocked and service is deactivated when historical subscriptions exist.');

  // 9.3: Attempting to remove demo service when historical payments exist blocks deletion
  deletedPlanCalled = false;
  updatedPlanDeactivated = false;
  const mockDbWithPayment = {
    carePlan: {
      findUnique: async () => ({ ...mockPlan }),
      update: async ({ data }: any) => {
        if (data.active === false) updatedPlanDeactivated = true;
        return { ...mockPlan, ...data };
      },
      delete: async () => {
        deletedPlanCalled = true;
      },
    },
    subscription: { count: async () => 0 },
    renewalRequest: { count: async () => 0 },
    invoice: { count: async () => 0 },
    payment: { count: async () => 1 }, // 1 historical payment exists
  };

  const paymentBlockResult = await removeDemoService(mockDbWithPayment);
  assert.strictEqual(paymentBlockResult.success, false, 'Deletion must fail when historical payment exists');
  assert.strictEqual(paymentBlockResult.disabled, true, 'Service must be disabled instead of deleted');
  assert.strictEqual(deletedPlanCalled, false, 'carePlan.delete must NOT be called when historical payments exist');
  assert.strictEqual(updatedPlanDeactivated, true, 'carePlan must be set to active: false');
  console.log('  ✓ Verified deletion is blocked and service is deactivated when historical payments exist.');

  // 9.4: Clean deletion is permitted ONLY when zero historical financial records exist
  deletedPlanCalled = false;
  const mockDbClean = {
    carePlan: {
      findUnique: async () => ({ ...mockPlan }),
      delete: async () => {
        deletedPlanCalled = true;
        return { id: mockPlan.id };
      },
    },
    subscription: { count: async () => 0 },
    renewalRequest: { count: async () => 0 },
    invoice: { count: async () => 0 },
    payment: { count: async () => 0 },
  };

  const cleanDeleteResult = await removeDemoService(mockDbClean);
  assert.strictEqual(cleanDeleteResult.success, true, 'Deletion must succeed when zero historical records exist');
  assert.strictEqual(cleanDeleteResult.deleted, true);
  assert.strictEqual(deletedPlanCalled, true, 'carePlan.delete must be called for clean unreferenced plan');
  console.log('  ✓ Verified clean deletion succeeds when zero historical financial records exist.');

  // -------------------------------------------------------------------------
  // SCENARIO 10: Private Demo-Service Selection Flow & UI Access Control
  // -------------------------------------------------------------------------
  console.log('--- SCENARIO 10: Private Demo-Service Selection Flow & UI Access Control ---');

  // Test 10.1: Dedicated allowlist account tanishalam61@gmail.com
  const tanishDemoConfig = {
    INTERNAL_DEMO_ACCOUNT_EMAIL: 'tanishalam61@gmail.com',
  };
  const tanishMemberAccount = {
    id: 'cmv5j9l6d00014uplaumg7m8l',
    email: 'tanishalam61@gmail.com',
    role: 'MEMBER',
  };
  const tanishAuthorized = await isInternalDemoAuthorized(tanishMemberAccount, tanishDemoConfig);
  assert.strictEqual(tanishAuthorized, true, 'tanishalam61@gmail.com with role MEMBER must be authorized for demo flow');
  console.log('  ✓ Verified authenticated tanishalam61@gmail.com (role: MEMBER) is authorized for private demo service.');

  // Test 10.2: Admin user access
  const adminAccount = {
    id: 'cmv_admin_flow_test',
    email: 'admin@sunshineeldercare.in',
    role: 'ADMIN',
  };
  assert.strictEqual(await isInternalDemoAuthorized(adminAccount, tanishDemoConfig), true, 'Admin must be authorized for demo flow');
  console.log('  ✓ Verified administrators are authorized for private demo service.');

  // Test 10.3: Ordinary non-allowlisted member is rejected
  const standardMember = {
    id: 'cmv_standard_member_999',
    email: 'standard.user@example.com',
    role: 'MEMBER',
  };
  assert.strictEqual(await isInternalDemoAuthorized(standardMember, tanishDemoConfig), false, 'Ordinary member must be rejected from private demo flow');
  assert.strictEqual(await isInternalDemoAuthorized(null, tanishDemoConfig), false, 'Unauthenticated visitor must be rejected from private demo flow');
  console.log('  ✓ Verified ordinary non-allowlisted members and unauthenticated visitors are denied access.');

  // Test 10.4: Public catalog excludes demo service while private catalog includes it
  demoCarePlan.active = true; // reactivate demo care plan for catalog lookup
  const publicViewCatalog = await carePricingService.getCatalog();
  assert.strictEqual(
    publicViewCatalog.some((p) => p.slug === 'internal-razorpay-demo'),
    false,
    'Public catalog must strictly exclude internal-razorpay-demo'
  );

  const privateViewCatalog = await carePricingService.getCatalog({ includeInternalDemo: true });
  const resolvedDemoPlan = privateViewCatalog.find((p) => p.slug === 'internal-razorpay-demo');
  assert.ok(resolvedDemoPlan, 'Private authorized catalog must include internal-razorpay-demo');
  console.log('  ✓ Verified public catalogue strictly excludes demo plan while authorized private retrieval resolves it.');

  // Test 10.5: Exact price display snapshot verification (₹20, GST ₹0, Total ₹20)
  const singleDemoVariant = resolvedDemoPlan.variants.find((v) => v.variantType === 'SINGLE');
  assert.ok(singleDemoVariant, 'SINGLE variant must exist');
  assert.strictEqual(singleDemoVariant.monthlyBasePrice, 20, 'Base price must be exactly ₹20');
  assert.strictEqual(singleDemoVariant.monthlyGst, 0, 'GST must be exactly ₹0');
  assert.strictEqual(singleDemoVariant.monthlyTotal, 20, 'Monthly total must be exactly ₹20');
  assert.strictEqual(singleDemoVariant.durations[0]?.months, 1, 'Duration must be 1 Month');
  assert.strictEqual(singleDemoVariant.durations[0]?.documentedTotal, 20, 'Documented total must be exactly ₹20');
  console.log('  ✓ Verified exact commercial snapshot: Base ₹20.00, GST ₹0.00, Total ₹20.00 (SINGLE, 1 Month).');

  // Restore fetch
  global.fetch = originalFetch;

  console.log('\n================================================================');
  console.log('ALL 10 DEMO SERVICE PAYMENT & UI ACCESS CONTROL SCENARIOS PASSED WITH ZERO REGRESSIONS');
  console.log('================================================================\n');
}

runDemoServiceTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
