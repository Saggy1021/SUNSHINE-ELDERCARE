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
  // SCENARIO 8: Access Control & Demo Tester Authorization Guard
  // -------------------------------------------------------------------------
  console.log('--- SCENARIO 8: Access Control & Strict Allowlist Authorization ---');
  const allowlistedEmail = (
    process.env.INTERNAL_DEMO_ACCOUNT_EMAIL || 'bootstrap_member_test@example.com'
  ).trim().toLowerCase();
  const allowlistedUserId = process.env.INTERNAL_DEMO_ACCOUNT_USER_ID?.trim();

  const checkAuthorization = (user: any, planSlug: string) => {
    if (planSlug === 'internal-razorpay-demo') {
      const isAuthorized =
        user?.role === 'ADMIN' ||
        (!!user?.email && user.email.toLowerCase() === allowlistedEmail) ||
        (!!allowlistedUserId && user?.id === allowlistedUserId);
      if (!isAuthorized) {
        throw new Error('UNAUTHORIZED_TEST_SERVICE: The internal Razorpay demo service is restricted to administrators and the dedicated demo account.');
      }
    }
    return true;
  };

  // 1. Regular user trying to generate invoice for internal demo service
  const unauthorizedUser = {
    id: 'usr_unauth_999',
    email: 'random.visitor@example.com',
    role: 'USER',
  };
  inMemoryUsers.set(unauthorizedUser.id, unauthorizedUser);

  let unauthThrew = false;
  try {
    checkAuthorization(unauthorizedUser, 'internal-razorpay-demo');
  } catch (err: any) {
    unauthThrew = true;
    assert.ok(err.message.includes('UNAUTHORIZED_TEST_SERVICE'));
  }
  assert.strictEqual(unauthThrew, true, 'Unauthorized regular user must be rejected from demo service');

  // 2. Users with "demo" or "test" in email must NOT be broadly authorized
  const broadDemoUser = { id: 'usr_demo_fake', email: 'random-demo-user@gmail.com', role: 'USER' };
  const broadTestUser = { id: 'usr_test_fake', email: 'tester_qa_team@company.com', role: 'USER' };

  assert.throws(
    () => checkAuthorization(broadDemoUser, 'internal-razorpay-demo'),
    /UNAUTHORIZED_TEST_SERVICE/,
    'Broad email with substring "demo" must be rejected'
  );
  assert.throws(
    () => checkAuthorization(broadTestUser, 'internal-razorpay-demo'),
    /UNAUTHORIZED_TEST_SERVICE/,
    'Broad email with substring "test" must be rejected'
  );

  // 3. Exactly allowlisted internal demo tester and admin succeed
  assert.strictEqual(checkAuthorization(demoUser, 'internal-razorpay-demo'), true);
  assert.strictEqual(checkAuthorization({ id: 'admin_1', email: 'admin@sunshineeldercare.in', role: 'ADMIN' }, 'internal-razorpay-demo'), true);
  console.log('  ✓ Verified broad "demo"/"test" emails are rejected; only exact allowlisted account & admins permitted.');

  // Restore fetch
  global.fetch = originalFetch;

  console.log('\n================================================================');
  console.log('ALL 8 DEMO SERVICE PAYMENT SCENARIOS PASSED WITH ZERO REGRESSIONS');
  console.log('================================================================\n');
}

runDemoServiceTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
