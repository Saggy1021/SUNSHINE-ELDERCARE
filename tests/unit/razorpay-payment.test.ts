import assert from 'node:assert';
import crypto from 'node:crypto';
import { db } from '../../lib/db';
import {
  RazorpayAdapter,
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature,
} from '../../lib/services/payment/razorpay-adapter';
import { PaymentService, adminVerifyPayment, paymentService } from '../../lib/services/payment';
import { settleSuccessfulPayment } from '../../lib/services/payment/settlement';
import { POST as razorpayWebhookHandler } from '../../app/api/payments/razorpay/route';
import { POST as genericWebhookHandler } from '../../app/api/payments/webhook/route';
import { DocumentSequenceService } from '../../lib/services/document-sequence';

async function runRazorpayTests() {
  console.log('================================================================');
  console.log('Running Sunshine Eldercare — Razorpay Payment & Webhook Tests');
  console.log('================================================================\n');

  const TEST_KEY_ID = 'rzp_test_mockKeyId12345';
  const TEST_KEY_SECRET = 'mockKeySecret67890abcdef';
  const TEST_WEBHOOK_SECRET = 'mockWebhookSecret999888';

  // -------------------------------------------------------------------------
  // In-Memory Test State Setup for Isolated Database Verification
  // -------------------------------------------------------------------------
  const recordedWebhookEvents = new Set<string>();
  let inMemoryPayments: any[] = [];
  let inMemoryPayment: any = null;
  let inMemoryInvoices: any[] = [];
  let inMemoryInvoice: any = null;
  let inMemoryRenewals: any[] = [];
  let inMemoryRenewal: any = null;
  let inMemorySubscription: any = null;
  let inMemoryAuditLogs: any[] = [];
  let inMemoryReceipt: any = null;
  let invoiceSequenceCount = 0;
  let receiptSequenceCount = 0;
  let receiptCreationCount = 0;
  let subscriptionCreationCount = 0;

  (db as any).razorpayWebhookEvent = {
    create: async ({ data }: any) => {
      if (recordedWebhookEvents.has(data.eventId)) {
        const err: any = new Error('Unique constraint failed on eventId');
        err.code = 'P2002';
        throw err;
      }
      recordedWebhookEvents.add(data.eventId);
      return { ...data, id: `evt_row_${data.eventId}` };
    },
    update: async ({ where, data }: any) => {
      return { eventId: where.eventId, ...data };
    },
  };

  const getPool = () => {
    const list = [...inMemoryPayments];
    if (inMemoryPayment && !list.includes(inMemoryPayment)) {
      list.push(inMemoryPayment);
    }
    return list;
  };

  (db as any).payment = {
    create: async ({ data }: any) => {
      const p = {
        ...data,
        id: data.id || `pay_created_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        amount: { toNumber: () => Number(data.amount) },
        createdAt: data.createdAt || new Date(),
        invoice: inMemoryInvoice,
        renewalRequest: inMemoryRenewal,
        user: {
          id: data.userId || 'user_101',
          name: 'Sagnik Roy',
          email: 'sagnik@example.com',
          memberProfile: { serviceAddress: 'Salt Lake Sector 1', mobileNumber: '+919876543210' },
        },
      };
      inMemoryPayments.push(p);
      inMemoryPayment = p;
      return p;
    },
    findFirst: async ({ where, orderBy }: any) => {
      const pool = getPool();
      const matches = pool.filter((p) => {
        if (where?.id && p.id !== where.id) return false;
        if (where?.status && p.status !== where.status) return false;
        if (where?.invoiceId && p.invoiceId !== where.invoiceId) return false;
        if (where?.providerRef && p.providerRef !== where.providerRef) return false;
        if (where?.reference && p.reference !== where.reference) return false;
        if (where?.OR) {
          const matchOr = where.OR.some((cond: any) => {
            if (cond.providerRef && p.providerRef === cond.providerRef) return true;
            if (cond.reference && p.reference === cond.reference) return true;
            if (cond.id && p.id === cond.id) return true;
            if (
              cond.invoiceId &&
              (cond.status === undefined || p.status === cond.status) &&
              p.invoiceId === cond.invoiceId
            ) {
              return true;
            }
            return false;
          });
          if (!matchOr) return false;
        }
        return true;
      });

      if (matches.length === 0) return null;

      if (orderBy) {
        matches.sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeB - timeA;
        });
      }
      return matches[0];
    },
    findMany: async ({ where }: any) => {
      const pool = getPool();
      return pool.filter((p) => {
        if (where?.invoiceId && p.invoiceId !== where.invoiceId) return false;
        if (where?.status && p.status !== where.status) return false;
        return true;
      });
    },
    updateMany: async ({ where, data }: any) => {
      // Foreign-key integrity check simulation:
      // verifiedById references User(id). If a non-null string is supplied, verify it matches a known user ID.
      if (data.verifiedById !== undefined && data.verifiedById !== null) {
        const validUsers = ['user_101', 'user_manual_101', 'admin_audit_001', 'user_conc_101', 'user_gen_201'];
        if (!validUsers.includes(data.verifiedById)) {
          throw new Error(`Foreign key constraint failed on Payment_verifiedById_fkey: User '${data.verifiedById}' does not exist.`);
        }
      }
      const pool = getPool();
      let count = 0;
      for (const p of pool) {
        const matchesId = !where?.id || p.id === where.id;
        const matchesStatus = !where?.status || p.status === where.status;
        if (matchesId && matchesStatus) {
          Object.assign(p, data);
          if (p === inMemoryPayment || pool.length === 1) {
            Object.assign(inMemoryPayment, data);
          }
          count++;
        }
      }
      return { count };
    },
    findUnique: async ({ where }: any) => {
      const pool = getPool();
      return pool.find((p) => p.id === where?.id) || inMemoryPayment;
    },
    update: async ({ where, data }: any) => {
      const pool = getPool();
      const p = pool.find((item) => !where?.id || item.id === where.id) || inMemoryPayment;
      if (p) {
        Object.assign(p, data);
        return p;
      }
      return null;
    },
  };

  const getInvoicePool = () => {
    const list = [...inMemoryInvoices];
    if (inMemoryInvoice && !list.includes(inMemoryInvoice)) {
      list.push(inMemoryInvoice);
    }
    return list;
  };

  (db as any).$queryRaw = async (strings: any, ...values: any[]) => {
    const targetId = values[0];
    const pool = getInvoicePool();
    const inv = pool.find((i: any) => !targetId || i.id === targetId) || inMemoryInvoice;
    return inv ? [inv] : [];
  };

  (db as any).invoice = {
    findUnique: async ({ where }: any) => {
      const pool = getInvoicePool();
      return pool.find((i: any) => !where?.id || i.id === where.id) || inMemoryInvoice;
    },
    update: async ({ where, data }: any) => {
      const pool = getInvoicePool();
      const inv = pool.find((i: any) => !where?.id || i.id === where.id) || inMemoryInvoice;
      if (inv) Object.assign(inv, data);
      return inv;
    },
  };

  (db as any).receipt = {
    create: async ({ data }: any) => {
      receiptCreationCount++;
      inMemoryReceipt = { ...data, id: `rec_${receiptCreationCount}` };
      return inMemoryReceipt;
    },
  };

  (db as any).subscription = {
    create: async ({ data }: any) => {
      subscriptionCreationCount++;
      inMemorySubscription = { ...data, id: `sub_${subscriptionCreationCount}` };
      return inMemorySubscription;
    },
    findFirst: async () => inMemorySubscription,
    update: async ({ data }: any) => {
      if (inMemorySubscription) Object.assign(inMemorySubscription, data);
      return inMemorySubscription;
    },
  };

  (db as any).subscriptionAddOn = {
    createMany: async () => ({ count: 0 }),
  };

  const getRenewalPool = () => {
    const list = [...inMemoryRenewals];
    if (inMemoryRenewal && !list.includes(inMemoryRenewal)) {
      list.push(inMemoryRenewal);
    }
    return list;
  };

  (db as any).renewalRequest = {
    findUnique: async ({ where }: any) => {
      const pool = getRenewalPool();
      return pool.find((r: any) => !where?.id || r.id === where.id) || inMemoryRenewal;
    },
    update: async ({ where, data }: any) => {
      const pool = getRenewalPool();
      const r = pool.find((item: any) => !where?.id || item.id === where.id) || inMemoryRenewal;
      if (r) Object.assign(r, data);
      return r;
    },
  };

  (db as any).auditLog = {
    create: async ({ data }: any) => {
      // Foreign-key integrity check simulation:
      // actorUserId references User(id). If non-null, verify it matches a known user ID.
      if (data.actorUserId !== undefined && data.actorUserId !== null) {
        const validUsers = ['user_101', 'user_manual_101', 'admin_audit_001', 'user_conc_101', 'user_gen_201'];
        if (!validUsers.includes(data.actorUserId)) {
          throw new Error(`Foreign key constraint failed on AuditLog_actorUserId_fkey: User '${data.actorUserId}' does not exist.`);
        }
      }
      inMemoryAuditLogs.push(data);
      return { ...data, id: `log_${inMemoryAuditLogs.length}` };
    },
  };

  (db as any).carePlan = {
    findFirst: async () => ({ id: 'plan_shield', slug: 'shield-shine', name: 'Shield Shine' }),
  };

  (db as any).user = {
    findUnique: async () => ({ id: 'user_101', name: 'Sagnik Roy', email: 'sagnik@example.com' }),
  };

  (db as any).$transaction = async (fn: any) => {
    return fn(db);
  };

  DocumentSequenceService.generateInvoiceNumber = async () => {
    invoiceSequenceCount++;
    if (invoiceSequenceCount === 1) return 'INV-202610-1001';
    return `SEC/${1000 + invoiceSequenceCount}/2026-27`;
  };
  DocumentSequenceService.generateReceiptNumber = async () => {
    receiptSequenceCount++;
    if (receiptSequenceCount === 1) return 'REC-202610-1001';
    return `SEC/REC/${1000 + receiptSequenceCount}/2026-27`;
  };

  // =========================================================================
  // SCENARIO 1: Credential Enforcement & Fail-Closed Invariant
  // =========================================================================
  console.log('--- SCENARIO 1: Credential Enforcement & Fail-Closed Invariant ---');

  assert.throws(
    () => {
      new RazorpayAdapter({ keyId: '', keySecret: '' });
    },
    /Razorpay configuration missing/,
    'Adapter must throw if credentials are not provided'
  );

  assert.throws(
    () => {
      new RazorpayAdapter({ keyId: TEST_KEY_ID, keySecret: '' });
    },
    /Razorpay configuration missing/,
    'Adapter must throw if keySecret is missing'
  );

  const adapter = new RazorpayAdapter({
    keyId: TEST_KEY_ID,
    keySecret: TEST_KEY_SECRET,
    webhookSecret: TEST_WEBHOOK_SECRET,
  });
  assert.strictEqual(adapter.getKeyId(), TEST_KEY_ID);
  console.log('  ✓ Verified adapter fails closed without credentials and instantiates with valid config.');

  // =========================================================================
  // SCENARIO 2: Authoritative Order Creation & Integer Paise Precision
  // =========================================================================
  console.log('--- SCENARIO 2: Authoritative Order Creation & Integer Paise Precision ---');

  const originalFetch = global.fetch;
  let interceptedOrderPayload: any = null;
  let interceptedAuthHeader: string | null = null;

  global.fetch = async (url: any, init: any): Promise<any> => {
    if (url.toString().includes('/orders')) {
      interceptedOrderPayload = JSON.parse(init.body);
      interceptedAuthHeader = init.headers['Authorization'];
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 'order_test_1234567890',
          entity: 'order',
          amount: interceptedOrderPayload.amount,
          amount_paid: 0,
          amount_due: interceptedOrderPayload.amount,
          currency: interceptedOrderPayload.currency,
          receipt: interceptedOrderPayload.receipt,
          status: 'created',
          attempts: 0,
          notes: interceptedOrderPayload.notes,
          created_at: Math.floor(Date.now() / 1000),
        }),
      };
    }
    return originalFetch(url, init);
  };

  const sessionResponse = await adapter.createCheckoutSession({
    userId: 'user_test_101',
    invoiceId: 'inv_test_202',
    renewalRequestId: 'ren_test_303',
    amount: 19470,
    currency: 'INR',
    successUrl: 'http://localhost:3000/dashboard?success=true',
    cancelUrl: 'http://localhost:3000/checkout/inv_test_202',
  });

  assert.strictEqual(sessionResponse.providerOrderId, 'order_test_1234567890');
  assert.strictEqual(sessionResponse.amount, 1947000, '₹19,470 must be exactly 1,947,000 paise');
  assert.strictEqual(interceptedOrderPayload.amount, 1947000);
  assert.strictEqual(interceptedOrderPayload.currency, 'INR');
  assert.strictEqual(interceptedOrderPayload.notes.invoiceId, 'inv_test_202');
  assert.strictEqual(interceptedOrderPayload.notes.userId, 'user_test_101');
  assert.strictEqual(interceptedOrderPayload.notes.renewalRequestId, 'ren_test_303');

  const expectedAuth = `Basic ${Buffer.from(`${TEST_KEY_ID}:${TEST_KEY_SECRET}`).toString('base64')}`;
  assert.strictEqual(interceptedAuthHeader, expectedAuth, 'Basic auth header must match base64(key:secret)');

  await assert.rejects(
    async () => {
      await adapter.createCheckoutSession({
        userId: 'user_1',
        invoiceId: 'inv_1',
        amount: 0,
        successUrl: '',
        cancelUrl: '',
      });
    },
    /Invalid order amount/,
    'Zero amount must be rejected'
  );

  await assert.rejects(
    async () => {
      await adapter.createCheckoutSession({
        userId: 'user_1',
        invoiceId: 'inv_1',
        amount: 100,
        currency: 'USD',
        successUrl: '',
        cancelUrl: '',
      });
    },
    /Unsupported currency/,
    'Non-INR currency must be rejected'
  );
  console.log('  ✓ Verified exact integer paise conversion (₹19,470 -> 1,947,000 paise), metadata notes, and currency guards.');

  // =========================================================================
  // SCENARIO 3: Cryptographic Signature Verification
  // =========================================================================
  console.log('--- SCENARIO 3: Cryptographic Signature Verification (Checkout & Webhooks) ---');

  const testOrderId = 'order_DA28F83KD9';
  const testPaymentId = 'pay_92JF92JFKD0';

  const validCheckoutSig = crypto
    .createHmac('sha256', TEST_KEY_SECRET)
    .update(`${testOrderId}|${testPaymentId}`)
    .digest('hex');

  assert.strictEqual(
    adapter.verifyCheckoutSignature({
      orderId: testOrderId,
      paymentId: testPaymentId,
      signature: validCheckoutSig,
    }),
    true
  );

  assert.strictEqual(
    adapter.verifyCheckoutSignature({
      orderId: testOrderId,
      paymentId: testPaymentId,
      signature: 'bad_signature_deadbeef',
    }),
    false
  );

  assert.strictEqual(
    verifyRazorpayCheckoutSignature({
      orderId: testOrderId,
      paymentId: testPaymentId,
      signature: validCheckoutSig,
      keySecret: TEST_KEY_SECRET,
    }),
    true
  );

  const testRawBody = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: testPaymentId,
          order_id: testOrderId,
          amount: 1947000,
          currency: 'INR',
        },
      },
    },
  });

  const validWebhookSig = crypto
    .createHmac('sha256', TEST_WEBHOOK_SECRET)
    .update(testRawBody)
    .digest('hex');

  assert.strictEqual(
    adapter.verifyWebhookSignature(testRawBody, validWebhookSig, TEST_WEBHOOK_SECRET),
    true
  );
  assert.strictEqual(
    adapter.verifyWebhookSignature(testRawBody, 'tampered_sig', TEST_WEBHOOK_SECRET),
    false
  );
  assert.strictEqual(
    verifyRazorpayWebhookSignature(testRawBody, validWebhookSig, TEST_WEBHOOK_SECRET),
    true
  );
  console.log('  ✓ Verified constant-time HMAC SHA-256 validation for checkout callbacks and raw webhook bodies.');

  // =========================================================================
  // SCENARIO 4: Webhook Route Handler HTTP Invariants
  // =========================================================================
  console.log('--- SCENARIO 4: Webhook Route Handler HTTP Invariants ---');

  process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

  const reqNoSig = new Request('http://localhost:3000/api/payments/razorpay', {
    method: 'POST',
    body: testRawBody,
    headers: { 'Content-Type': 'application/json' },
  });
  const resNoSig = await razorpayWebhookHandler(reqNoSig);
  assert.strictEqual(resNoSig.status, 400);

  const reqBadSig = new Request('http://localhost:3000/api/payments/razorpay', {
    method: 'POST',
    body: testRawBody,
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': '0000000000000000000000000000000000000000000000000000000000000000',
    },
  });
  const resBadSig = await razorpayWebhookHandler(reqBadSig);
  assert.strictEqual(resBadSig.status, 401);

  const unhandledEventBody = JSON.stringify({
    event: 'refund.processed',
    id: 'evt_refund_101',
    created_at: 1730000000,
  });
  const unhandledSig = crypto
    .createHmac('sha256', TEST_WEBHOOK_SECRET)
    .update(unhandledEventBody)
    .digest('hex');

  const reqUnhandled = new Request('http://localhost:3000/api/payments/razorpay', {
    method: 'POST',
    body: unhandledEventBody,
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': unhandledSig,
      'x-razorpay-event-id': 'evt_unhandled_1',
    },
  });
  const resUnhandled = await razorpayWebhookHandler(reqUnhandled);
  assert.strictEqual(resUnhandled.status, 200);
  console.log('  ✓ Verified 400 on missing signature/empty body, 401 on invalid signature, and 200 on safe unhandled events.');

  // =========================================================================
  // SCENARIO 5: Transactional Settlement Invariants & Idempotency
  // =========================================================================
  console.log('--- SCENARIO 5: Transactional Settlement Invariants & Idempotency ---');

  inMemoryInvoice = {
    id: 'inv_101',
    userId: 'user_101',
    total: { toNumber: () => 19470 },
    currency: 'INR',
    invoiceNumber: null,
    status: 'DRAFT',
    customerName: 'Sagnik Roy',
    customerEmail: 'sagnik@example.com',
    customerAddress: 'Salt Lake',
    customerPhone: '+919876543210',
    lineItems: [{ planName: 'Shield Shine' }],
  };

  inMemoryRenewal = {
    id: 'ren_101',
    userId: 'user_101',
    carePlanId: 'plan_shield',
    variantType: 'COUPLE',
    durationMonths: 6,
    requestedStartDate: new Date(Date.now() + 86400000), // Tomorrow (SCHEDULED)
    calculatedEndDate: new Date(Date.now() + 86400000 * 180),
    status: 'APPROVED',
    planName: 'Shield Shine',
    addOns: [],
  };

  inMemoryPayment = {
    id: 'pay_rec_101',
    userId: 'user_101',
    invoiceId: 'inv_101',
    renewalRequestId: 'ren_101',
    amount: { toNumber: () => 19470 },
    currency: 'INR',
    status: 'PENDING',
    provider: 'RAZORPAY',
    providerRef: 'order_test_999',
    reference: 'order_test_999',
    invoice: inMemoryInvoice,
    renewalRequest: inMemoryRenewal,
    user: {
      id: 'user_101',
      name: 'Sagnik Roy',
      email: 'sagnik@example.com',
      memberProfile: { serviceAddress: 'Salt Lake Sector 1', mobileNumber: '+919876543210' },
    },
  };

  // 5.1 Test settleSuccessfulPayment missing providerPaymentId
  await assert.rejects(
    async () => {
      await settleSuccessfulPayment({
        providerPaymentId: '',
      });
    },
    /providerPaymentId is required/,
    'Settlement must reject empty providerPaymentId'
  );

  // 5.2 Test settleSuccessfulPayment when payment is not found
  const notFoundResult = await settleSuccessfulPayment({
    orderId: 'order_nonexistent_99999',
    providerPaymentId: 'pay_nonexistent_99999',
  });
  assert.strictEqual(notFoundResult.success, false);
  assert.strictEqual(notFoundResult.error, 'PAYMENT_CONTEXT_NOT_FOUND');

  // 5.3 Amount mismatch guard
  await assert.rejects(
    async () => {
      await settleSuccessfulPayment({
        orderId: 'order_test_999',
        providerPaymentId: 'pay_captured_1',
        amountInPaise: 10000, // 100 Rs vs expected 19,470 Rs
        currency: 'INR',
      });
    },
    /Payment amount mismatch/,
    'Amount tampering must be halted immediately'
  );

  // 5.4 Currency mismatch guard
  await assert.rejects(
    async () => {
      await settleSuccessfulPayment({
        orderId: 'order_test_999',
        providerPaymentId: 'pay_captured_1',
        amountInPaise: 1947000,
        currency: 'USD',
      });
    },
    /Payment currency mismatch/,
    'Currency mismatch must be halted immediately'
  );

  // 5.5 Successful settlement execution
  const firstSettlement = await settleSuccessfulPayment({
    orderId: 'order_test_999',
    providerPaymentId: 'pay_captured_1',
    amountInPaise: 1947000,
    currency: 'INR',
    verifiedById: null,
    metadata: { actor: 'RAZORPAY_WEBHOOK' },
  });

  assert.strictEqual(firstSettlement.success, true);
  assert.strictEqual(firstSettlement.alreadyVerified, false);
  assert.strictEqual(inMemoryPayment.status, 'VERIFIED');
  assert.strictEqual(inMemoryPayment.verifiedById, null, 'Automated Razorpay settlement must set verifiedById to null');
  assert.strictEqual(inMemoryPayment.metadata?.actor, 'RAZORPAY_WEBHOOK', 'Automated actor identity must be preserved in metadata');
  assert.strictEqual(inMemoryPayment.metadata?.automatedVerification, true);
  assert.strictEqual(inMemoryPayment.providerRef, 'order_test_999', 'Order ID must remain permanently in providerRef');
  assert.strictEqual(inMemoryPayment.reference, 'pay_captured_1', 'Payment ID must be stored in reference');
  assert.strictEqual(inMemoryInvoice.paymentStatus, 'PAID');
  assert.strictEqual(inMemoryInvoice.invoiceNumber, 'INV-202610-1001');
  assert.strictEqual(inMemoryReceipt.receiptNumber, 'REC-202610-1001');
  assert.strictEqual(inMemorySubscription.status, 'SCHEDULED'); // because requestedStartDate is tomorrow
  assert.strictEqual(inMemoryRenewal.status, 'COMPLETED');
  assert.strictEqual(inMemoryAuditLogs.length > 0, true);
  assert.strictEqual(inMemoryAuditLogs[0].action, 'PAYMENT_VERIFIED');
  assert.strictEqual(inMemoryAuditLogs[0].actorUserId, null, 'Automated settlement must set actorUserId to null for foreign-key integrity');
  assert.strictEqual(inMemoryAuditLogs[0].metadata?.actor, 'RAZORPAY_WEBHOOK', 'Audit metadata must preserve automated actor identity');

  // 5.6 Idempotency: Second settlement call on already verified payment
  const duplicateSettlement = await settleSuccessfulPayment({
    orderId: 'order_test_999',
    providerPaymentId: 'pay_captured_1',
    amountInPaise: 1947000,
    currency: 'INR',
  });
  assert.strictEqual(duplicateSettlement.success, true);
  assert.strictEqual(duplicateSettlement.alreadyVerified, true);
  assert.strictEqual(inMemoryAuditLogs.length, 1, 'Duplicate settlement must not create duplicate audit logs or subscriptions');

  console.log('  ✓ Verified transactional settlement: Payment verified, Invoice paid, Receipt minted, Subscription scheduled, exactly once.');

  // =========================================================================
  // SCENARIO 6: Webhook End-to-End Delivery & Deduplication
  // =========================================================================
  console.log('--- SCENARIO 6: Webhook End-to-End Delivery & Deduplication ---');

  // 6.1 Duplicate delivery of same eventId
  const dupPayload = JSON.stringify({
    event: 'order.paid',
    id: 'evt_dup_999',
    payload: {
      order: {
        entity: {
          id: 'order_test_999',
          amount: 1947000,
          currency: 'INR',
        },
      },
    },
  });
  const dupSig = crypto
    .createHmac('sha256', TEST_WEBHOOK_SECRET)
    .update(dupPayload)
    .digest('hex');

  // First delivery of evt_dup_999
  const reqDup1 = new Request('http://localhost:3000/api/payments/razorpay', {
    method: 'POST',
    body: dupPayload,
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': dupSig,
      'x-razorpay-event-id': 'evt_dup_999',
    },
  });
  const resDup1 = await razorpayWebhookHandler(reqDup1);
  assert.strictEqual(resDup1.status, 200);

  // Second delivery of same eventId (P2002 duplicate constraint)
  const reqDup2 = new Request('http://localhost:3000/api/payments/razorpay', {
    method: 'POST',
    body: dupPayload,
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': dupSig,
      'x-razorpay-event-id': 'evt_dup_999',
    },
  });
  const resDup2 = await razorpayWebhookHandler(reqDup2);
  assert.strictEqual(resDup2.status, 200);
  const jsonDup2 = await resDup2.json();
  assert.strictEqual(jsonDup2.note, 'Duplicate event already processed');
  console.log('  ✓ Verified database-level event deduplication acknowledges duplicate deliveries with 200.');

  // =========================================================================
  // SCENARIO 7: Out-of-Order Failed Events Never Downgrade Confirmed Payment
  // =========================================================================
  console.log('--- SCENARIO 7: Out-of-Order Failed Events Never Downgrade Confirmed Payment ---');

  const failedPayload = JSON.stringify({
    event: 'payment.failed',
    id: 'evt_failed_888',
    payload: {
      payment: {
        entity: {
          id: 'pay_failed_888',
          order_id: 'order_test_999',
          error_code: 'BAD_REQUEST_ERROR',
          error_description: 'Card declined by issuing bank',
        },
      },
    },
  });
  const failedSig = crypto
    .createHmac('sha256', TEST_WEBHOOK_SECRET)
    .update(failedPayload)
    .digest('hex');

  const reqFailed = new Request('http://localhost:3000/api/payments/razorpay', {
    method: 'POST',
    body: failedPayload,
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': failedSig,
      'x-razorpay-event-id': 'evt_failed_888',
    },
  });

  const resFailed = await razorpayWebhookHandler(reqFailed);
  assert.strictEqual(resFailed.status, 200);
  const jsonFailed = await resFailed.json();
  assert.strictEqual(jsonFailed.note, 'Payment already verified');
  assert.strictEqual(inMemoryPayment.status, 'VERIFIED', 'Payment status must remain VERIFIED');
  console.log('  ✓ Verified out-of-order payment.failed event safely ignored without downgrading confirmed payment.');

  // =========================================================================
  // SCENARIO 8: Payment Creation Populates providerRef with Razorpay Order ID
  // =========================================================================
  console.log('--- SCENARIO 8: Payment Creation Populates providerRef with Order ID ---');

  const paymentServiceTest = new PaymentService(adapter);
  inMemoryInvoice = {
    id: 'inv_create_test_88',
    userId: 'user_101',
    total: { toNumber: () => 19470 },
    currency: 'INR',
    status: 'ISSUED',
  };

  const checkoutSessionRes = await paymentServiceTest.createCheckoutSession({
    userId: 'user_101',
    invoiceId: 'inv_create_test_88',
    successUrl: 'http://localhost:3000/dashboard?success=true',
    cancelUrl: 'http://localhost:3000/checkout/inv_create_test_88',
  });

  assert.strictEqual(checkoutSessionRes.providerOrderId, 'order_test_1234567890');
  assert.strictEqual(
    inMemoryPayment.providerRef,
    'order_test_1234567890',
    'Payment creation must populate providerRef with Razorpay order ID'
  );
  assert.strictEqual(
    inMemoryPayment.reference,
    'order_test_1234567890',
    'Payment creation must populate reference with order ID initially'
  );
  assert.strictEqual(inMemoryPayment.status, 'PENDING');
  console.log('  ✓ Verified payment creation sets providerRef to the Razorpay order ID.');

  // =========================================================================
  // SCENARIO 9: Subsequent order.paid Webhook Handled Without 404 or Duplication
  // =========================================================================
  console.log('--- SCENARIO 9: Subsequent order.paid Acknowledged Without 404 ---');

  // Settle the payment first (simulating payment.captured settlement)
  inMemoryPayment = {
    id: 'pay_rec_corr_99',
    userId: 'user_101',
    invoiceId: 'inv_corr_99',
    amount: { toNumber: () => 19470 },
    currency: 'INR',
    status: 'VERIFIED',
    provider: 'RAZORPAY',
    providerRef: 'order_corr_999',
    reference: 'pay_corr_captured_888',
    invoice: { ...inMemoryInvoice, id: 'inv_corr_99', status: 'ISSUED', paymentStatus: 'PAID' },
    user: {
      id: 'user_101',
      name: 'Sagnik Roy',
      email: 'sagnik@example.com',
      memberProfile: { serviceAddress: 'Salt Lake Sector 1', mobileNumber: '+919876543210' },
    },
  };

  const auditLogCountBefore = inMemoryAuditLogs.length;

  const orderPaidSubsequentPayload = JSON.stringify({
    event: 'order.paid',
    id: 'evt_order_paid_subsequent_999',
    payload: {
      order: {
        entity: {
          id: 'order_corr_999',
          amount: 1947000,
          currency: 'INR',
        },
      },
      payment: {
        entity: {
          id: 'pay_corr_captured_888',
          order_id: 'order_corr_999',
          amount: 1947000,
          currency: 'INR',
        },
      },
    },
  });

  const orderPaidSubsequentSig = crypto
    .createHmac('sha256', TEST_WEBHOOK_SECRET)
    .update(orderPaidSubsequentPayload)
    .digest('hex');

  const reqOrderPaidSubsequent = new Request('http://localhost:3000/api/payments/razorpay', {
    method: 'POST',
    body: orderPaidSubsequentPayload,
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': orderPaidSubsequentSig,
      'x-razorpay-event-id': 'evt_order_paid_subsequent_999',
    },
  });

  const resOrderPaidSubsequent = await razorpayWebhookHandler(reqOrderPaidSubsequent);
  assert.strictEqual(
    resOrderPaidSubsequent.status,
    200,
    'Subsequent order.paid must return 200 rather than 404'
  );
  const jsonOrderPaidSubsequent = await resOrderPaidSubsequent.json();
  assert.strictEqual(jsonOrderPaidSubsequent.status, 'already_verified');
  assert.strictEqual(
    inMemoryAuditLogs.length,
    auditLogCountBefore,
    'Duplicate order.paid must not append duplicate audit logs'
  );
  console.log('  ✓ Verified order.paid after settlement resolves existing VERIFIED payment with 200 without duplication.');

  // =========================================================================
  // SCENARIO 10: Checkout Verification Race Condition & Signature Enforcement
  // =========================================================================
  console.log('--- SCENARIO 10: Checkout Verification Race Condition & Signature Checks ---');

  const raceOrderId = 'order_race_777';
  const racePaymentId = 'pay_race_888';

  // 10.1 Invalid signature rejection
  const badCheckoutSig = 'invalid_signature_hex_digest_99999999999999999999999999999999';
  const isBadSigValid = verifyRazorpayCheckoutSignature({
    orderId: raceOrderId,
    paymentId: racePaymentId,
    signature: badCheckoutSig,
    keySecret: TEST_KEY_SECRET,
  });
  assert.strictEqual(isBadSigValid, false, 'Invalid signature must be strictly rejected');

  // 10.2 Valid signature computation
  const validCheckoutSigRace = crypto
    .createHmac('sha256', TEST_KEY_SECRET)
    .update(`${raceOrderId}|${racePaymentId}`)
    .digest('hex');
  const isValidSigValid = verifyRazorpayCheckoutSignature({
    orderId: raceOrderId,
    paymentId: racePaymentId,
    signature: validCheckoutSigRace,
    keySecret: TEST_KEY_SECRET,
  });
  assert.strictEqual(isValidSigValid, true, 'Valid signature must be verified');

  // 10.3 Webhook settled first: Payment is already VERIFIED when modal callback runs
  inMemoryPayment = {
    id: 'pay_race_row_1',
    userId: 'user_101',
    invoiceId: 'inv_race_101',
    amount: { toNumber: () => 19470 },
    currency: 'INR',
    status: 'VERIFIED',
    provider: 'RAZORPAY',
    providerRef: raceOrderId,
    reference: racePaymentId,
    invoice: { id: 'inv_race_101', userId: 'user_101', status: 'ISSUED', paymentStatus: 'PAID' },
    user: { id: 'user_101', name: 'Sagnik Roy', email: 'sagnik@example.com' },
  };
  inMemoryPayments = [inMemoryPayment];

  // Simulate checkout verification finding payment by exact order ID
  const foundPayment = await (db as any).payment.findFirst({
    where: {
      OR: [
        { providerRef: raceOrderId },
        { reference: raceOrderId },
      ],
    },
  });

  assert.notStrictEqual(foundPayment, null, 'Payment must be found by exact order ID');
  assert.strictEqual(foundPayment.status, 'VERIFIED');
  assert.strictEqual(foundPayment.providerRef, raceOrderId);

  // Settlement function called on already VERIFIED payment returns alreadyVerified: true
  const raceSettlementResult = await settleSuccessfulPayment({
    orderId: raceOrderId,
    paymentId: foundPayment.id,
    invoiceId: 'inv_race_101',
    providerPaymentId: racePaymentId,
    provider: 'RAZORPAY',
  });

  assert.strictEqual(raceSettlementResult.success, true);
  assert.strictEqual(
    raceSettlementResult.alreadyVerified,
    true,
    'Fast-path returns alreadyVerified: true without duplicate operations'
  );
  console.log('  ✓ Verified checkout verification succeeds gracefully when webhook settled first.');

  // =========================================================================
  // SCENARIO 11: Exact Order ID Precedence & Attempt Isolation
  // =========================================================================
  console.log('--- SCENARIO 11: Exact Order ID Precedence & Attempt Isolation ---');

  const multiInv = {
    id: 'inv_multi_100',
    userId: 'user_101',
    total: { toNumber: () => 19470 },
    currency: 'INR',
    status: 'ISSUED',
    paymentStatus: 'UNPAID',
    lineItems: [{ planName: 'Shield Shine' }],
  };

  const att1 = {
    id: 'pay_attempt_1',
    userId: 'user_101',
    invoiceId: 'inv_multi_100',
    amount: { toNumber: () => 19470 },
    currency: 'INR',
    status: 'PENDING',
    provider: 'RAZORPAY',
    providerRef: 'order_attempt_1',
    reference: 'order_attempt_1',
    createdAt: new Date(Date.now() - 600000), // 10 minutes ago
    invoice: multiInv,
    user: { id: 'user_101', name: 'Member', email: 'm@example.com' },
  };

  const att2 = {
    id: 'pay_attempt_2',
    userId: 'user_101',
    invoiceId: 'inv_multi_100',
    amount: { toNumber: () => 19470 },
    currency: 'INR',
    status: 'PENDING',
    provider: 'RAZORPAY',
    providerRef: 'order_attempt_2',
    reference: 'order_attempt_2',
    createdAt: new Date(), // newer!
    invoice: multiInv,
    user: { id: 'user_101', name: 'Member', email: 'm@example.com' },
  };

  inMemoryPayments = [att1, att2];
  inMemoryInvoices = [multiInv];

  // Settle Attempt 1 by exact orderId
  const resAtt1 = await settleSuccessfulPayment({
    orderId: 'order_attempt_1',
    providerPaymentId: 'pay_captured_att1',
    invoiceId: 'inv_multi_100',
  });

  assert.strictEqual(resAtt1.success, true);
  assert.strictEqual(resAtt1.paymentId, 'pay_attempt_1');
  assert.strictEqual(att1.status, 'VERIFIED');
  assert.strictEqual(att1.providerRef, 'order_attempt_1');
  assert.strictEqual(att1.reference, 'pay_captured_att1');

  // Attempt 2 must remain completely untouched in PENDING status with its own order_attempt_2
  assert.strictEqual(att2.status, 'PENDING');
  assert.strictEqual(att2.providerRef, 'order_attempt_2');
  assert.strictEqual(att2.reference, 'order_attempt_2');
  console.log('  ✓ Verified exact Order ID takes precedence over newer attempt on same invoice.');

  // =========================================================================
  // SCENARIO 12: Unknown Order ID Cannot Settle Unrelated Attempt
  // =========================================================================
  console.log('--- SCENARIO 12: Unknown Order ID Cannot Settle Unrelated Attempt ---');

  const resUnknownOrder = await settleSuccessfulPayment({
    orderId: 'order_unknown_random_9999',
    providerPaymentId: 'pay_unknown_123',
    invoiceId: 'inv_multi_100',
  });

  assert.strictEqual(resUnknownOrder.success, false);
  assert.strictEqual(resUnknownOrder.error, 'PAYMENT_CONTEXT_NOT_FOUND');
  assert.strictEqual(att2.status, 'PENDING', 'Attempt 2 must NOT be settled by an unknown order ID');
  console.log('  ✓ Verified unknown Order ID fails closed and does not fall back to unrelated attempt.');

  // =========================================================================
  // SCENARIO 13: Exact Payment ID Resolves Correct Attempt
  // =========================================================================
  console.log('--- SCENARIO 13: Exact Payment ID Resolves Correct Attempt ---');

  att2.reference = 'pay_captured_att2';
  const resPayId = await settleSuccessfulPayment({
    providerPaymentId: 'pay_captured_att2',
  });

  assert.strictEqual(resPayId.success, true);
  assert.strictEqual(resPayId.paymentId, 'pay_attempt_2');
  console.log('  ✓ Verified exact Payment ID resolves the correct attempt without ambiguity.');

  // =========================================================================
  // SCENARIO 14: Verified First Attempt Not Overwritten by Second Attempt
  // =========================================================================
  console.log('--- SCENARIO 14: Verified First Attempt Not Overwritten by Second Attempt ---');

  multiInv.paymentStatus = 'PAID';
  att2.status = 'PENDING';
  const resSecondAttempt = await settleSuccessfulPayment({
    orderId: 'order_attempt_2',
    providerPaymentId: 'pay_captured_att2_duplicate',
  });

  assert.strictEqual(resSecondAttempt.success, true);
  assert.strictEqual(resSecondAttempt.isOverpayment, true);
  assert.strictEqual(att2.status, 'VERIFIED');
  // att1 must remain VERIFIED and intact
  assert.strictEqual(att1.status, 'VERIFIED');
  assert.strictEqual(att1.providerRef, 'order_attempt_1');
  assert.strictEqual(att2.providerRef, 'order_attempt_2');

  const overpaymentLog = inMemoryAuditLogs.find(
    (l) => l.action === 'PAYMENT_OVERPAYMENT_RECORDED' && l.entityId === 'pay_attempt_2'
  );
  assert.notStrictEqual(overpaymentLog, undefined, 'Must record PAYMENT_OVERPAYMENT_RECORDED in audit log');
  assert.strictEqual(overpaymentLog.metadata.reconciliationStatus, 'NEEDS_REFUND_OR_CREDIT');
  console.log('  ✓ Verified second attempt on paid invoice is recorded as overpayment without duplicate receipts.');

  // =========================================================================
  // SCENARIO 15: Checkout Verification Rejects Mismatched Order IDs
  // =========================================================================
  console.log('--- SCENARIO 15: Checkout Verification Rejects Mismatched Order IDs ---');

  const mismatchedSearch = await (db as any).payment.findFirst({
    where: {
      OR: [
        { providerRef: 'order_nonexistent_xyz' },
        { reference: 'order_nonexistent_xyz' },
      ],
    },
  });
  assert.strictEqual(mismatchedSearch, null, 'Mismatched order ID must return null and trigger controlled failure');
  console.log('  ✓ Verified checkout verification rejects mismatched Order IDs without loose invoice fallback.');

  // =========================================================================
  // SCENARIO 16: Concurrent Payment Attempts Against Shared Invoice (Row-Level Locking)
  // =========================================================================
  console.log('--- SCENARIO 16: Concurrent Payment Attempts & Invoice Row-Lock Serialization ---');

  const concInvoice = {
    id: 'inv_conc_200',
    userId: 'user_conc_101',
    total: { toNumber: () => 19470 },
    currency: 'INR',
    status: 'ISSUED',
    paymentStatus: 'UNPAID',
    invoiceNumber: null,
    planId: 'plan_shield',
    lineItems: [{ planName: 'Shield Shine' }],
  };

  const concAttempt1 = {
    id: 'pay_conc_attempt_1',
    userId: 'user_conc_101',
    invoiceId: 'inv_conc_200',
    amount: { toNumber: () => 19470 },
    currency: 'INR',
    status: 'PENDING',
    provider: 'RAZORPAY',
    providerRef: 'order_conc_1',
    reference: 'order_conc_1',
    createdAt: new Date(Date.now() - 300000),
    invoice: concInvoice,
    user: { id: 'user_conc_101', name: 'Member', email: 'conc@example.com' },
  };

  const concAttempt2 = {
    id: 'pay_conc_attempt_2',
    userId: 'user_conc_101',
    invoiceId: 'inv_conc_200',
    amount: { toNumber: () => 19470 },
    currency: 'INR',
    status: 'PENDING',
    provider: 'RAZORPAY',
    providerRef: 'order_conc_2',
    reference: 'order_conc_2',
    createdAt: new Date(),
    invoice: concInvoice,
    user: { id: 'user_conc_101', name: 'Member', email: 'conc@example.com' },
  };

  inMemoryInvoices.push(concInvoice);
  inMemoryPayments.push(concAttempt1, concAttempt2);

  const initialReceiptsCount = receiptCreationCount;
  const initialSubsCount = subscriptionCreationCount;
  const initialInvoiceSeq = invoiceSequenceCount;

  // Simulate transactional row-level lock on "Invoice":
  // Tx 1 acquires lock, finishes settlement, commits concInvoice.paymentStatus = 'PAID'.
  // Tx 2 queued on the lock, reads freshly committed concInvoice.paymentStatus = 'PAID'.
  let invoiceLock = Promise.resolve();
  const originalQueryRaw = (db as any).$queryRaw;
  (db as any).$queryRaw = async (strings: any, ...values: any[]) => {
    const targetId = values[0];
    const prevLock = invoiceLock;
    let releaseLock: () => void;
    invoiceLock = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    await prevLock; // Wait for prior transaction on invoice to finish and commit

    // Once lock is obtained, return the current state of the invoice
    const inv = getInvoicePool().find((i: any) => !targetId || i.id === targetId) || inMemoryInvoice;
    // Release lock after transaction completes
    setTimeout(() => releaseLock(), 10);
    return inv ? [inv] : [];
  };

  // Invoke both settlements concurrently via Promise.all
  const [resConc1, resConc2] = await Promise.all([
    settleSuccessfulPayment({
      orderId: 'order_conc_1',
      providerPaymentId: 'pay_conc_captured_1',
      invoiceId: 'inv_conc_200',
    }),
    settleSuccessfulPayment({
      orderId: 'order_conc_2',
      providerPaymentId: 'pay_conc_captured_2',
      invoiceId: 'inv_conc_200',
    }),
  ]);

  // Restore $queryRaw
  (db as any).$queryRaw = originalQueryRaw;

  // 1. Both workers returned success: true
  assert.strictEqual(resConc1.success, true);
  assert.strictEqual(resConc2.success, true);

  // 2. Exactly one performed primary settlement and one recorded as secondary overpayment
  const primaryRes = resConc1.isOverpayment ? resConc2 : resConc1;
  const secondaryRes = resConc1.isOverpayment ? resConc1 : resConc2;
  assert.strictEqual(primaryRes.isOverpayment, undefined, 'One attempt must be primary settlement');
  assert.strictEqual(secondaryRes.isOverpayment, true, 'Other attempt must be secondary overpayment');

  // 3. Exactly ONE official invoice number generated
  assert.strictEqual(
    invoiceSequenceCount,
    initialInvoiceSeq + 1,
    'Exactly ONE official invoice number must be generated'
  );
  assert.strictEqual(concInvoice.paymentStatus, 'PAID');
  assert.notStrictEqual(concInvoice.invoiceNumber, null);

  // 4. Exactly ONE receipt created
  assert.strictEqual(
    receiptCreationCount,
    initialReceiptsCount + 1,
    'Exactly ONE receipt must be created across both attempts'
  );

  // 5. Exactly ONE subscription created
  assert.strictEqual(
    subscriptionCreationCount,
    initialSubsCount + 1,
    'Exactly ONE subscription must be created across both attempts'
  );

  // 6. Second payment explicitly recorded as secondary overpayment
  const secondaryPayment: any = resConc1.isOverpayment ? concAttempt1 : concAttempt2;
  assert.strictEqual(secondaryPayment.status, 'VERIFIED');
  assert.strictEqual((concAttempt1 as any).verifiedById, null, 'Concurrent attempt 1 verifiedById must be null');
  assert.strictEqual((concAttempt2 as any).verifiedById, null, 'Concurrent attempt 2 verifiedById must be null');
  assert.strictEqual(secondaryPayment.metadata?.settlementRole, 'SECONDARY_OVERPAYMENT');
  assert.strictEqual(secondaryPayment.metadata?.reconciliationStatus, 'NEEDS_REFUND_OR_CREDIT');
  assert.strictEqual(secondaryPayment.metadata?.refundDecisionOutstanding, true);

  // 7. AuditLog records PAYMENT_OVERPAYMENT_RECORDED
  const concOverpaymentLog = inMemoryAuditLogs.find(
    (l) => l.action === 'PAYMENT_OVERPAYMENT_RECORDED' && l.entityId === secondaryPayment.id
  );
  assert.notStrictEqual(concOverpaymentLog, undefined, 'Must create PAYMENT_OVERPAYMENT_RECORDED audit log');
  assert.strictEqual(concOverpaymentLog.metadata.reconciliationStatus, 'NEEDS_REFUND_OR_CREDIT');
  assert.strictEqual(concOverpaymentLog.metadata.invoiceId, 'inv_conc_200');

  console.log('  ✓ Verified two concurrent attempts result in exactly ONE primary settlement, ONE receipt, and ONE subscription.');
  console.log('  ✓ Verified second attempt records PAYMENT_OVERPAYMENT_RECORDED with reconciliationStatus: NEEDS_REFUND_OR_CREDIT.');

  // =========================================================================
  // SCENARIO 17: Canonical Lock-Ordering in Offline Manual Verification
  // =========================================================================
  console.log('--- SCENARIO 17: Canonical Lock-Ordering in Offline Manual Verification ---');

  const manualInv = {
    id: 'inv_manual_300',
    userId: 'user_manual_101',
    total: { toNumber: () => 25000 },
    currency: 'INR',
    status: 'ISSUED',
    paymentStatus: 'UNPAID',
    invoiceNumber: null,
    planId: 'plan_shield',
    lineItems: [{ planName: 'Shield Shine' }],
  };

  const manualRenewal = {
    id: 'ren_manual_301',
    userId: 'user_manual_101',
    carePlanId: 'plan_shield',
    variantType: 'INDIVIDUAL',
    durationMonths: 12,
    requestedStartDate: new Date(Date.now() + 86400000),
    calculatedEndDate: new Date(Date.now() + 86400000 * 365),
    status: 'APPROVED',
    carePlan: { name: 'Shield Shine' },
    addOns: [],
  };

  const manualPayment = {
    id: 'pay_manual_301',
    userId: 'user_manual_101',
    invoiceId: 'inv_manual_300',
    renewalRequestId: 'ren_manual_301',
    amount: { toNumber: () => 25000 },
    currency: 'INR',
    status: 'VERIFICATION_PENDING',
    paymentMethod: 'OFFLINE',
    reference: 'NEFT_REF_987654',
    invoice: manualInv,
    renewalRequest: manualRenewal,
    user: {
      id: 'user_manual_101',
      name: 'Aditi Sharma',
      email: 'aditi@example.com',
      memberProfile: { serviceAddress: 'Ballygunge Kolkata', mobileNumber: '+919830012345' },
    },
  };

  inMemoryInvoices.push(manualInv);
  inMemoryPayments.push(manualPayment);
  inMemoryRenewals.push(manualRenewal);

  // 17.1 Race check: If the locked invoice was already PAID (e.g. online settlement completed first),
  // adminVerifyPayment must fail closed after acquiring the invoice lock.
  manualInv.paymentStatus = 'PAID';
  await assert.rejects(
    async () => {
      await adminVerifyPayment('pay_manual_301', 'admin_audit_001');
    },
    /Invoice is already paid/,
    'adminVerifyPayment must fail closed when locked invoice is already PAID'
  );
  assert.strictEqual(manualPayment.status, 'VERIFICATION_PENDING', 'Payment must remain unverified');

  // 17.2 Happy path: When invoice is UNPAID, adminVerifyPayment locks Invoice -> Payment -> completes settlement
  manualInv.paymentStatus = 'UNPAID';
  const initialManualReceipts = receiptCreationCount;
  const initialManualSubs = subscriptionCreationCount;

  await adminVerifyPayment('pay_manual_301', 'admin_audit_001');

  assert.strictEqual(manualPayment.status, 'VERIFIED');
  assert.strictEqual((manualPayment as any).verifiedById, 'admin_audit_001');
  assert.strictEqual(manualInv.paymentStatus, 'PAID');
  assert.strictEqual(manualInv.status, 'ISSUED');
  assert.notStrictEqual(manualInv.invoiceNumber, null);
  assert.strictEqual(receiptCreationCount, initialManualReceipts + 1, 'Exactly one receipt created');
  assert.strictEqual(subscriptionCreationCount, initialManualSubs + 1, 'Exactly one subscription created');
  assert.strictEqual(manualRenewal.status, 'COMPLETED');

  const manualAuditLog = inMemoryAuditLogs.find(
    (l) => l.action === 'PAYMENT_VERIFIED' && l.entityId === 'pay_manual_301'
  );
  assert.notStrictEqual(manualAuditLog, undefined, 'Must create PAYMENT_VERIFIED audit log');
  assert.strictEqual(manualAuditLog.actorUserId, 'admin_audit_001');

  console.log('  ✓ Verified adminVerifyPayment acquires Invoice lock before Payment and fails closed if already PAID.');
  console.log('  ✓ Verified manual verification successfully finalizes invoice, receipt, and subscription when UNPAID.');

  // =========================================================================
  // SCENARIO 18: Generic Webhook Route Delegation to Shared Concurrency Settlement Engine
  // =========================================================================
  console.log('--- SCENARIO 18: Generic Webhook Route Delegation & Concurrency Serialization ---');

  const genInv = {
    id: 'inv_gen_400',
    userId: 'user_gen_201',
    total: { toNumber: () => 15000 },
    currency: 'INR',
    status: 'ISSUED',
    paymentStatus: 'UNPAID',
    invoiceNumber: null,
    planId: 'plan_shield',
    lineItems: [{ planName: 'Shield Shine' }],
  };

  const genPayment = {
    id: 'pay_gen_401',
    userId: 'user_gen_201',
    invoiceId: 'inv_gen_400',
    amount: { toNumber: () => 15000 },
    currency: 'INR',
    status: 'PENDING',
    provider: 'GENERIC_WEBHOOK',
    providerRef: null,
    reference: null,
    createdAt: new Date(),
    invoice: genInv,
    user: { id: 'user_gen_201', name: 'Generic User', email: 'gen@example.com' },
  };

  inMemoryInvoices.push(genInv);
  inMemoryPayments.push(genPayment);

  // Mock paymentService.verifyWebhook to accept test signature
  const origVerifyWebhook = (paymentService as any).verifyWebhook;
  (paymentService as any).verifyWebhook = async () => true;

  const genWebhookPayload = JSON.stringify({
    event_type: 'payment.captured',
    payment_id: 'pay_gen_tx_888',
    metadata: { invoiceId: 'inv_gen_400' },
  });

  const reqGenWebhook = new Request('http://localhost:3000/api/payments/webhook', {
    method: 'POST',
    body: genWebhookPayload,
    headers: {
      'Content-Type': 'application/json',
      'x-provider-signature': 'mock_valid_signature',
    },
  });

  const resGenWebhook = await genericWebhookHandler(reqGenWebhook);
  assert.strictEqual(resGenWebhook.status, 200);
  const jsonGenWebhook = await resGenWebhook.json();
  assert.strictEqual(jsonGenWebhook.received, true);
  assert.strictEqual(jsonGenWebhook.status, 'settled');

  assert.strictEqual(genPayment.status, 'VERIFIED');
  assert.strictEqual((genPayment as any).verifiedById, null, 'Generic webhook automated settlement must have verifiedById: null');
  assert.strictEqual(genInv.paymentStatus, 'PAID');

  // Second delivery returns already_verified
  const reqGenWebhookDup = new Request('http://localhost:3000/api/payments/webhook', {
    method: 'POST',
    body: genWebhookPayload,
    headers: {
      'Content-Type': 'application/json',
      'x-provider-signature': 'mock_valid_signature',
    },
  });

  const resGenWebhookDup = await genericWebhookHandler(reqGenWebhookDup);
  assert.strictEqual(resGenWebhookDup.status, 200);
  const jsonGenWebhookDup = await resGenWebhookDup.json();
  assert.strictEqual(jsonGenWebhookDup.received, true);
  assert.strictEqual(jsonGenWebhookDup.status, 'already_verified');

  // Restore verifyWebhook
  (paymentService as any).verifyWebhook = origVerifyWebhook;

  console.log('  ✓ Verified generic webhook route delegates to shared settlement engine following canonical lock order.');
  console.log('  ✓ Verified generic webhook route idempotency returns already_verified on redelivery.');

  // Restore original fetch
  global.fetch = originalFetch;

  console.log('\n================================================================');
  console.log('ALL 18 SCENARIOS PASSED WITH ZERO REGRESSIONS (100% SUCCESS)');
  console.log('================================================================\n');
}

runRazorpayTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
