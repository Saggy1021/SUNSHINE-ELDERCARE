import assert from 'node:assert';
import {
  checkMemberDeletionEligibilityCore,
  adminArchiveMemberCore,
  adminRestoreMemberCore,
  requestMemberDeletionOtpCore,
  verifyMemberDeletionOtpCore,
  ownerApproveAndExecuteDeletionCore,
} from '../../app/actions/admin-member-lifecycle';
import { getMembersCore } from '../../app/actions/admin';
import { hashToken } from '../../lib/auth/tokens';

async function runMemberArchivingAndDeletionTests() {
  console.log('================================================================');
  console.log('Sunshine Eldercare — Secure Member Archiving & Deletion Test Suite');
  console.log('Including: Pending Subscription Exception & Concurrency Protections');
  console.log('================================================================\n');

  const now = new Date('2026-11-16T12:00:00.000Z');
  const ownerUserId = 'owner_usr_001';
  const ownerEmail = 'info.sunshineeldercare@gmail.com';
  const adminUserId = 'admin_usr_002';
  const adminEmail = 'admin@example.com';

  // Mock Authorization Service
  const mockAuthService = {
    isOwner: async (userId: string) => userId === ownerUserId,
    requireOwner: async (userId: string) => {
      if (userId !== ownerUserId) {
        throw new Error('Unauthorized: Owner access required.');
      }
    },
  };

  // Mock Email Service
  let sentEmails: any[] = [];
  const mockEmailService = {
    send: async (payload: any) => {
      sentEmails.push(payload);
      return { success: true };
    },
  };

  // ---------------------------------------------------------------------------
  // Test Data Fixtures
  // ---------------------------------------------------------------------------

  // Prabir: Genuine member with financial dependencies (Subscription, Payment, Invoice, Receipt)
  const prabirUser: any = {
    id: 'cmwitwcjr0001o7hmeqyob4k0',
    name: 'Wg Cdr PRABIR CHAKRAVERTY',
    email: 'p.chakraverty47@gmail.com',
    role: 'MEMBER',
    status: 'ACTIVE',
    createdAt: new Date('2026-10-04T10:00:00.000Z'),
    memberProfile: {
      id: 'cmwitwckk0003o7hmvsdlfkpl',
      userId: 'cmwitwcjr0001o7hmeqyob4k0',
      memberId: 'SECD1001PRTY',
      firstName: 'Wg Cdr PRABIR',
      lastName: 'CHAKRAVERTY',
      mobileNumber: '6380505551',
      serviceAddress: 'JALVAYEE TOWERS, CNCI/GREENFIELD HEIGHT 18 TALA',
    },
    subscriptions: [
      {
        id: 'sub_prabir_001',
        status: 'ACTIVE',
        startDate: new Date('2026-10-04T00:00:00.000Z'),
        endDate: new Date('2027-04-04T00:00:00.000Z'),
      },
    ],
    invoices: [{ id: 'inv_001', invoiceNumber: 'INV/2026/001', status: 'PAID', total: 18000 }],
    payments: [{ id: 'pay_001', amount: 18000, status: 'VERIFIED' }],
    receipts: [{ id: 'rec_001', receiptNumber: 'REC/2026/001' }],
    ownedDocuments: [],
    userRoles: [],
  };

  // Clean Member 1: Zero subscriptions, zero financial records
  let cleanUserNoSubs: any = {
    id: 'usr_clean_no_subs',
    name: 'Clean Member No Subs',
    email: 'no_subs@example.com',
    role: 'MEMBER',
    status: 'ACTIVE',
    createdAt: new Date('2026-11-01T10:00:00.000Z'),
    memberProfile: {
      id: 'prof_clean_001',
      userId: 'usr_clean_no_subs',
      memberId: 'SECD1090TEST',
      firstName: 'Clean',
      lastName: 'No Subs',
    },
    subscriptions: [],
    invoices: [],
    payments: [],
    receipts: [],
    ownedDocuments: [],
    userRoles: [],
  };

  // Clean Member 2: One PENDING subscription, zero financial records
  let cleanUserOnePendingSub: any = {
    id: 'usr_clean_one_pending',
    name: 'Clean Member One Pending Sub',
    email: 'one_pending@example.com',
    role: 'MEMBER',
    status: 'ACTIVE',
    createdAt: new Date('2026-11-01T10:00:00.000Z'),
    memberProfile: {
      id: 'prof_clean_002',
      userId: 'usr_clean_one_pending',
      memberId: 'SECD1091TEST',
      firstName: 'Clean',
      lastName: 'One Pending',
    },
    subscriptions: [
      { id: 'sub_pending_001', userId: 'usr_clean_one_pending', status: 'PENDING' },
    ],
    invoices: [],
    payments: [],
    receipts: [],
    ownedDocuments: [],
    userRoles: [],
  };

  // Clean Member 3: Multiple PENDING subscriptions, zero financial records
  let cleanUserMultiPendingSub: any = {
    id: 'usr_clean_multi_pending',
    name: 'Clean Member Multi Pending Sub',
    email: 'multi_pending@example.com',
    role: 'MEMBER',
    status: 'ACTIVE',
    createdAt: new Date('2026-11-01T10:00:00.000Z'),
    memberProfile: {
      id: 'prof_clean_003',
      userId: 'usr_clean_multi_pending',
      memberId: 'SECD1092TEST',
      firstName: 'Clean',
      lastName: 'Multi Pending',
    },
    subscriptions: [
      { id: 'sub_pending_002', userId: 'usr_clean_multi_pending', status: 'PENDING' },
      { id: 'sub_pending_003', userId: 'usr_clean_multi_pending', status: 'PENDING' },
    ],
    invoices: [],
    payments: [],
    receipts: [],
    ownedDocuments: [],
    userRoles: [],
  };

  // Member with ACTIVE subscription
  const memberActiveSub: any = {
    id: 'usr_active_sub',
    name: 'Active Sub Member',
    email: 'active_sub@example.com',
    role: 'MEMBER',
    status: 'ACTIVE',
    memberProfile: { id: 'prof_act_01', memberId: 'SECD1093ACT' },
    subscriptions: [{ id: 'sub_act_001', userId: 'usr_active_sub', status: 'ACTIVE' }],
    invoices: [],
    payments: [],
    receipts: [],
    ownedDocuments: [],
    userRoles: [],
  };

  // Member with EXPIRED subscription
  const memberExpiredSub: any = {
    id: 'usr_expired_sub',
    name: 'Expired Sub Member',
    email: 'expired_sub@example.com',
    role: 'MEMBER',
    status: 'ACTIVE',
    memberProfile: { id: 'prof_exp_01', memberId: 'SECD1094EXP' },
    subscriptions: [{ id: 'sub_exp_001', userId: 'usr_expired_sub', status: 'EXPIRED' }],
    invoices: [],
    payments: [],
    receipts: [],
    ownedDocuments: [],
    userRoles: [],
  };

  // Member with CANCELLED subscription
  const memberCancelledSub: any = {
    id: 'usr_cancelled_sub',
    name: 'Cancelled Sub Member',
    email: 'cancelled_sub@example.com',
    role: 'MEMBER',
    status: 'ACTIVE',
    memberProfile: { id: 'prof_can_01', memberId: 'SECD1095CAN' },
    subscriptions: [{ id: 'sub_can_001', userId: 'usr_cancelled_sub', status: 'CANCELLED' }],
    invoices: [],
    payments: [],
    receipts: [],
    ownedDocuments: [],
    userRoles: [],
  };

  // Member with PENDING subscription AND Invoice
  const memberPendingAndInvoice: any = {
    id: 'usr_pen_inv',
    name: 'Pending With Invoice',
    email: 'pen_inv@example.com',
    role: 'MEMBER',
    status: 'ACTIVE',
    memberProfile: { id: 'prof_pi_01', memberId: 'SECD1096INV' },
    subscriptions: [{ id: 'sub_pen_inv', userId: 'usr_pen_inv', status: 'PENDING' }],
    invoices: [{ id: 'inv_pi_01', invoiceNumber: 'INV/DRAFT/01', status: 'DRAFT' }],
    payments: [],
    receipts: [],
    ownedDocuments: [],
    userRoles: [],
  };

  // Member with PENDING subscription AND Payment
  const memberPendingAndPayment: any = {
    id: 'usr_pen_pay',
    name: 'Pending With Payment',
    email: 'pen_pay@example.com',
    role: 'MEMBER',
    status: 'ACTIVE',
    memberProfile: { id: 'prof_pp_01', memberId: 'SECD1097PAY' },
    subscriptions: [{ id: 'sub_pen_pay', userId: 'usr_pen_pay', status: 'PENDING' }],
    invoices: [],
    payments: [{ id: 'pay_pp_01', amount: 5000, status: 'AUTHORIZED' }],
    receipts: [],
    ownedDocuments: [],
    userRoles: [],
  };

  // Member with PENDING subscription AND Receipt
  const memberPendingAndReceipt: any = {
    id: 'usr_pen_rec',
    name: 'Pending With Receipt',
    email: 'pen_rec@example.com',
    role: 'MEMBER',
    status: 'ACTIVE',
    memberProfile: { id: 'prof_pr_01', memberId: 'SECD1098REC' },
    subscriptions: [{ id: 'sub_pen_rec', userId: 'usr_pen_rec', status: 'PENDING' }],
    invoices: [],
    payments: [],
    receipts: [{ id: 'rec_pr_01', receiptNumber: 'REC/2026/999' }],
    ownedDocuments: [],
    userRoles: [],
  };

  // Member with PENDING subscription AND Legal Record / Document
  const memberPendingAndDocument: any = {
    id: 'usr_pen_doc',
    name: 'Pending With Document',
    email: 'pen_doc@example.com',
    role: 'MEMBER',
    status: 'ACTIVE',
    memberProfile: { id: 'prof_pd_01', memberId: 'SECD1099DOC' },
    subscriptions: [{ id: 'sub_pen_doc', userId: 'usr_pen_doc', status: 'PENDING' }],
    invoices: [],
    payments: [],
    receipts: [],
    ownedDocuments: [{ id: 'doc_pd_01', displayName: 'ID_Proof_Aadhaar.pdf' }],
    userRoles: [],
  };

  // Member with UNKNOWN subscription status
  const memberUnknownSubStatus: any = {
    id: 'usr_unknown_status',
    name: 'Unknown Status Sub',
    email: 'unknown_status@example.com',
    role: 'MEMBER',
    status: 'ACTIVE',
    memberProfile: { id: 'prof_unk_01', memberId: 'SECD1100UNK' },
    subscriptions: [{ id: 'sub_unk_001', userId: 'usr_unknown_status', status: 'PROVISIONAL_CUSTOM' }],
    invoices: [],
    payments: [],
    receipts: [],
    ownedDocuments: [],
    userRoles: [],
  };

  // Owner user
  const ownerUser: any = {
    id: ownerUserId,
    name: 'Sunshine Owner',
    email: ownerEmail,
    role: 'ADMIN',
    status: 'ACTIVE',
    userRoles: [{ role: { name: 'Owner' } }],
  };

  // Administrator user
  const adminUser: any = {
    id: adminUserId,
    name: 'System Admin',
    email: adminEmail,
    role: 'ADMIN',
    status: 'ACTIVE',
    userRoles: [{ role: { name: 'Administrator' } }],
  };

  // Database mock store
  let usersDb: any[] = [
    prabirUser,
    cleanUserNoSubs,
    cleanUserOnePendingSub,
    cleanUserMultiPendingSub,
    memberActiveSub,
    memberExpiredSub,
    memberCancelledSub,
    memberPendingAndInvoice,
    memberPendingAndPayment,
    memberPendingAndReceipt,
    memberPendingAndDocument,
    memberUnknownSubStatus,
    ownerUser,
    adminUser,
  ];
  let verificationTokensDb: any[] = [];
  let auditLogsDb: any[] = [];

  const mockDb: any = {
    user: {
      findUnique: async ({ where, select }: any) => {
        const u = usersDb.find((x) => x.id === where.id || (where.email && x.email === where.email));
        if (!u) return null;
        if (select) {
          const res: any = {};
          for (const k of Object.keys(select)) res[k] = u[k];
          return res;
        }
        return JSON.parse(JSON.stringify(u));
      },
      findMany: async ({ where }: any) => {
        let list = [...usersDb];
        if (where?.status) {
          if (typeof where.status === 'string') {
            list = list.filter((u) => u.status === where.status);
          } else if (where.status.not) {
            list = list.filter((u) => u.status !== where.status.not);
          }
        }
        return JSON.parse(JSON.stringify(list));
      },
      count: async ({ where }: any) => {
        let list = [...usersDb];
        if (where?.status) {
          if (typeof where.status === 'string') {
            list = list.filter((u) => u.status === where.status);
          } else if (where.status.not) {
            list = list.filter((u) => u.status !== where.status.not);
          }
        }
        return list.length;
      },
      update: async ({ where, data }: any) => {
        const idx = usersDb.findIndex((x) => x.id === where.id);
        if (idx === -1) throw new Error('User not found');
        usersDb[idx] = { ...usersDb[idx], ...data };
        return JSON.parse(JSON.stringify(usersDb[idx]));
      },
      delete: async ({ where }: any) => {
        const idx = usersDb.findIndex((x) => x.id === where.id);
        if (idx !== -1) usersDb.splice(idx, 1);
        return { success: true };
      },
    },
    memberProfile: {
      delete: async ({ where }: any) => {
        const u = usersDb.find((x) => x.memberProfile?.id === where.id);
        if (u) u.memberProfile = null;
        return { success: true };
      },
    },
    subscription: {
      deleteMany: async ({ where }: any) => {
        const u = usersDb.find((x) => x.id === where.userId);
        if (u && u.subscriptions) {
          if (where.status) {
            u.subscriptions = u.subscriptions.filter((s: any) => s.status !== where.status);
          } else {
            u.subscriptions = [];
          }
        }
        return { count: 1 };
      },
    },
    subscriptionAddOn: {
      deleteMany: async () => ({ count: 0 }),
    },
    verificationToken: {
      findFirst: async ({ where }: any) => {
        return (
          verificationTokensDb.find((t) => t.identifier === where.identifier) || null
        );
      },
      create: async ({ data }: any) => {
        verificationTokensDb.push({ ...data });
        return { ...data };
      },
      deleteMany: async ({ where }: any) => {
        let count = 0;
        if (where?.identifier?.in) {
          const before = verificationTokensDb.length;
          verificationTokensDb = verificationTokensDb.filter(
            (t) => !where.identifier.in.includes(t.identifier)
          );
          count = before - verificationTokensDb.length;
        } else if (typeof where?.identifier === 'object' && where?.identifier?.startsWith) {
          const before = verificationTokensDb.length;
          verificationTokensDb = verificationTokensDb.filter(
            (t) => !t.identifier.startsWith(where.identifier.startsWith)
          );
          count = before - verificationTokensDb.length;
        } else if (typeof where?.identifier === 'string') {
          const before = verificationTokensDb.length;
          verificationTokensDb = verificationTokensDb.filter(
            (t) => t.identifier !== where.identifier
          );
          count = before - verificationTokensDb.length;
        }
        return { count };
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        auditLogsDb.push({ id: `audit_${Date.now()}_${Math.random()}`, ...data });
        return { success: true };
      },
    },
    $transaction: async (fn: any) => {
      // Create backup copy for rollback support
      const backupUsers = JSON.parse(JSON.stringify(usersDb));
      const backupTokens = JSON.parse(JSON.stringify(verificationTokensDb));
      const backupLogs = JSON.parse(JSON.stringify(auditLogsDb));
      try {
        const result = await fn({
          user: mockDb.user,
          memberProfile: mockDb.memberProfile,
          subscription: mockDb.subscription,
          subscriptionAddOn: mockDb.subscriptionAddOn,
          verificationToken: mockDb.verificationToken,
          auditLog: mockDb.auditLog,
          sponsor: { deleteMany: async () => ({}) },
          insuranceDetails: { deleteMany: async () => ({}) },
          medicalAuthorization: { deleteMany: async () => ({}) },
          emergencyContact: { deleteMany: async () => ({}) },
          userRole: { deleteMany: async () => ({}) },
          account: { deleteMany: async () => ({}) },
          session: { deleteMany: async () => ({}) },
        });
        return result;
      } catch (err) {
        // Rollback state completely
        usersDb = backupUsers;
        verificationTokensDb = backupTokens;
        auditLogsDb = backupLogs;
        throw err;
      }
    },
  };

  // ===========================================================================
  // SECTION 6 TEST CASES: DELETION ELIGIBILITY MATRIX
  // ===========================================================================

  console.log('--- TEST 1: Member with no subscriptions – deletion permitted ---');
  const resNoSubs = await checkMemberDeletionEligibilityCore(cleanUserNoSubs.id, mockDb);
  assert.strictEqual(resNoSubs.eligible, true);
  assert.strictEqual(resNoSubs.hasFinancialDependencies, false);
  assert.strictEqual(resNoSubs.hasPendingSubscriptionsOnly, false);
  assert.ok(resNoSubs.eligibleNotice?.includes('no subscriptions and no protected'));
  console.log('✓ PASS: Deletion permitted for member with zero subscriptions.\n');

  console.log('--- TEST 2: Member with one PENDING subscription and no financial dependencies – deletion permitted ---');
  const resOnePending = await checkMemberDeletionEligibilityCore(cleanUserOnePendingSub.id, mockDb);
  assert.strictEqual(resOnePending.eligible, true);
  assert.strictEqual(resOnePending.hasFinancialDependencies, false);
  assert.strictEqual(resOnePending.hasPendingSubscriptionsOnly, true);
  assert.strictEqual(resOnePending.pendingSubscriptionCount, 1);
  assert.ok(resOnePending.eligibleNotice?.includes('only pending subscription records and no protected'));
  console.log('✓ PASS: Deletion permitted for member with one PENDING subscription.\n');

  console.log('--- TEST 3: Member with multiple PENDING subscriptions and no financial dependencies – deletion permitted ---');
  const resMultiPending = await checkMemberDeletionEligibilityCore(cleanUserMultiPendingSub.id, mockDb);
  assert.strictEqual(resMultiPending.eligible, true);
  assert.strictEqual(resMultiPending.hasFinancialDependencies, false);
  assert.strictEqual(resMultiPending.hasPendingSubscriptionsOnly, true);
  assert.strictEqual(resMultiPending.pendingSubscriptionCount, 2);
  console.log('✓ PASS: Deletion permitted for member with multiple PENDING subscriptions.\n');

  console.log('--- TEST 4: Member with an ACTIVE subscription – blocked ---');
  const resActive = await checkMemberDeletionEligibilityCore(memberActiveSub.id, mockDb);
  assert.strictEqual(resActive.eligible, false);
  assert.ok(resActive.dependencies?.some((d) => d.includes('active subscription(s) [ACTIVE]')));
  assert.strictEqual(resActive.recommendedAction, 'ARCHIVE');
  console.log('✓ PASS: Member with ACTIVE subscription is strictly blocked.\n');

  console.log('--- TEST 5: Member with an EXPIRED subscription – blocked ---');
  const resExpired = await checkMemberDeletionEligibilityCore(memberExpiredSub.id, mockDb);
  assert.strictEqual(resExpired.eligible, false);
  assert.ok(resExpired.dependencies?.some((d) => d.includes('expired subscription(s) [EXPIRED]')));
  assert.strictEqual(resExpired.recommendedAction, 'ARCHIVE');
  console.log('✓ PASS: Member with EXPIRED subscription is strictly blocked.\n');

  console.log('--- TEST 6: Member with a CANCELLED subscription – blocked ---');
  const resCancelled = await checkMemberDeletionEligibilityCore(memberCancelledSub.id, mockDb);
  assert.strictEqual(resCancelled.eligible, false);
  assert.ok(resCancelled.dependencies?.some((d) => d.includes('historical subscription(s) [CANCELLED]')));
  assert.strictEqual(resCancelled.recommendedAction, 'ARCHIVE');
  console.log('✓ PASS: Member with CANCELLED subscription is strictly blocked.\n');

  console.log('--- TEST 7: Member with a PENDING subscription and an invoice – blocked ---');
  const resPendingInvoice = await checkMemberDeletionEligibilityCore(memberPendingAndInvoice.id, mockDb);
  assert.strictEqual(resPendingInvoice.eligible, false);
  assert.ok(resPendingInvoice.dependencies?.some((d) => d.includes('invoice(s)')));
  assert.strictEqual(resPendingInvoice.recommendedAction, 'ARCHIVE');
  console.log('✓ PASS: PENDING subscription with invoice is strictly blocked.\n');

  console.log('--- TEST 8: Member with a PENDING subscription and a payment – blocked ---');
  const resPendingPayment = await checkMemberDeletionEligibilityCore(memberPendingAndPayment.id, mockDb);
  assert.strictEqual(resPendingPayment.eligible, false);
  assert.ok(resPendingPayment.dependencies?.some((d) => d.includes('payment record(s)')));
  assert.strictEqual(resPendingPayment.recommendedAction, 'ARCHIVE');
  console.log('✓ PASS: PENDING subscription with payment record is strictly blocked.\n');

  console.log('--- TEST 9: Member with a PENDING subscription and a receipt – blocked ---');
  const resPendingReceipt = await checkMemberDeletionEligibilityCore(memberPendingAndReceipt.id, mockDb);
  assert.strictEqual(resPendingReceipt.eligible, false);
  assert.ok(resPendingReceipt.dependencies?.some((d) => d.includes('receipt(s)')));
  assert.strictEqual(resPendingReceipt.recommendedAction, 'ARCHIVE');
  console.log('✓ PASS: PENDING subscription with statutory receipt is strictly blocked.\n');

  console.log('--- TEST 10: Member with a PENDING subscription and a legal record/document – blocked ---');
  const resPendingDocument = await checkMemberDeletionEligibilityCore(memberPendingAndDocument.id, mockDb);
  assert.strictEqual(resPendingDocument.eligible, false);
  assert.ok(resPendingDocument.dependencies?.some((d) => d.includes('document(s)')));
  assert.strictEqual(resPendingDocument.recommendedAction, 'ARCHIVE');
  console.log('✓ PASS: PENDING subscription with legal/compliance document is strictly blocked.\n');

  console.log('--- TEST 11: Member with an unknown subscription status – blocked ---');
  const resUnknown = await checkMemberDeletionEligibilityCore(memberUnknownSubStatus.id, mockDb);
  assert.strictEqual(resUnknown.eligible, false);
  assert.ok(resUnknown.dependencies?.some((d) => d.includes('unrecognized status [PROVISIONAL_CUSTOM]')));
  assert.strictEqual(resUnknown.recommendedAction, 'ARCHIVE');
  console.log('✓ PASS: Member with unknown subscription status is safely blocked.\n');

  // ===========================================================================
  // SECTION 6 TEST CASES: SECURITY CONTROLS, OTP & APPROVAL WORKFLOW
  // ===========================================================================

  console.log('--- TEST 12: Invalid, expired, reused or exhausted OTP – rejected ---');
  // 12a: Request OTP for cleanUserOnePendingSub
  sentEmails = [];
  const otpRes = await requestMemberDeletionOtpCore(
    {
      memberUserId: cleanUserOnePendingSub.id,
      reason: 'User request under DPDP Act',
      actorUserId: adminUserId,
      now,
    },
    mockDb,
    mockEmailService
  );
  assert.strictEqual(otpRes.success, true);
  const receivedOtp = sentEmails[0].text.match(/\b\d{6}\b/)![0];

  // 12b: Invalid OTP rejected
  const invOtpRes = await verifyMemberDeletionOtpCore(
    {
      memberUserId: cleanUserOnePendingSub.id,
      otp: '111111',
      confirmedMemberId: 'SECD1091TEST',
      actorUserId: adminUserId,
      now,
    },
    mockDb,
    mockAuthService
  );
  assert.strictEqual(invOtpRes.success, false);
  assert.strictEqual(invOtpRes.remainingAttempts, 4);

  // 12c: Expired OTP rejected
  const expOtpRes = await verifyMemberDeletionOtpCore(
    {
      memberUserId: cleanUserOnePendingSub.id,
      otp: receivedOtp,
      confirmedMemberId: 'SECD1091TEST',
      actorUserId: adminUserId,
      now: new Date(now.getTime() + 6 * 60 * 1000), // 6 mins later
    },
    mockDb,
    mockAuthService
  );
  assert.strictEqual(expOtpRes.success, false);
  assert.strictEqual(expOtpRes.expired, true);

  // Request fresh OTP to test lockout
  sentEmails = [];
  await requestMemberDeletionOtpCore(
    {
      memberUserId: cleanUserOnePendingSub.id,
      reason: 'User request under DPDP Act',
      actorUserId: adminUserId,
      now,
    },
    mockDb,
    mockEmailService
  );
  const activeOtp = sentEmails[0].text.match(/\b\d{6}\b/)![0];

  // 12d: 5-attempt lockout exhausted
  for (let i = 1; i <= 5; i++) {
    await verifyMemberDeletionOtpCore(
      {
        memberUserId: cleanUserOnePendingSub.id,
        otp: '000000',
        confirmedMemberId: 'SECD1091TEST',
        actorUserId: adminUserId,
        now,
      },
      mockDb,
      mockAuthService
    );
  }
  const exhaustedRes = await verifyMemberDeletionOtpCore(
    {
      memberUserId: cleanUserOnePendingSub.id,
      otp: activeOtp,
      confirmedMemberId: 'SECD1091TEST',
      actorUserId: adminUserId,
      now,
    },
    mockDb,
    mockAuthService
  );
  assert.strictEqual(exhaustedRes.success, false);
  assert.strictEqual(exhaustedRes.lockedOut, true);

  // 12e: Reused OTP rejected
  // Issue fresh OTP, verify it, then verify again to test replay
  sentEmails = [];
  await requestMemberDeletionOtpCore(
    {
      memberUserId: cleanUserOnePendingSub.id,
      reason: 'User request under DPDP Act',
      actorUserId: adminUserId,
      now,
    },
    mockDb,
    mockEmailService
  );
  const replayOtp = sentEmails[0].text.match(/\b\d{6}\b/)![0];
  const firstVerify = await verifyMemberDeletionOtpCore(
    {
      memberUserId: cleanUserOnePendingSub.id,
      otp: replayOtp,
      confirmedMemberId: 'SECD1091TEST',
      actorUserId: adminUserId,
      now,
    },
    mockDb,
    mockAuthService
  );
  assert.strictEqual(firstVerify.success, true);
  const secondVerify = await verifyMemberDeletionOtpCore(
    {
      memberUserId: cleanUserOnePendingSub.id,
      otp: replayOtp,
      confirmedMemberId: 'SECD1091TEST',
      actorUserId: adminUserId,
      now,
    },
    mockDb,
    mockAuthService
  );
  assert.strictEqual(secondVerify.success, false);
  assert.ok(secondVerify.error?.includes('already been used') || secondVerify.error?.includes('No active verification code'));
  console.log('✓ PASS: Invalid, expired, exhausted, and reused OTPs strictly rejected.\n');

  console.log('--- TEST 13: Non-Primary Owner attempting permanent deletion – rejected ---');
  let nonOwnerBlocked = false;
  try {
    await ownerApproveAndExecuteDeletionCore(
      {
        memberUserId: cleanUserOnePendingSub.id,
        reason: 'Unauthorized execution by non-owner',
        actorUserId: adminUserId, // non-owner
        now,
      },
      mockDb,
      mockAuthService
    );
  } catch (err: any) {
    nonOwnerBlocked = true;
    assert.ok(err.message.includes('Owner access required'));
  }
  assert.strictEqual(nonOwnerBlocked, true);
  console.log('✓ PASS: Non-owner administrator rejected from executing deletion.\n');

  console.log('--- TEST 14: Failed transaction – complete rollback ---');
  // Setup a scenario where user.delete throws an error inside transaction
  const originalUserDelete = mockDb.user.delete;
  mockDb.user.delete = async () => {
    throw new Error('Database disk I/O simulated failure');
  };

  const rollbackExec = await ownerApproveAndExecuteDeletionCore(
    {
      memberUserId: cleanUserOnePendingSub.id,
      reason: 'Testing rollback mechanism',
      actorUserId: ownerUserId,
      now,
    },
    mockDb,
    mockAuthService
  );
  assert.strictEqual(rollbackExec.success, false);
  assert.ok(rollbackExec.error?.includes('Database disk I/O simulated failure'));

  // Verify complete rollback: user record still exists in usersDb
  const rollbackUserCheck = usersDb.find((u) => u.id === cleanUserOnePendingSub.id);
  assert.ok(rollbackUserCheck, 'User must still exist after rolled back transaction');
  assert.strictEqual(rollbackUserCheck.subscriptions.length, 1, 'Subscriptions must not be deleted after rollback');

  // Restore user.delete
  mockDb.user.delete = originalUserDelete;
  console.log('✓ PASS: Transaction failure triggers complete state rollback without orphaned records.\n');

  console.log('--- TEST 15: Successful execution of member with eligible PENDING subscription ---');
  // Re-verify cleanUserOnePendingSub with fresh OTP and execute
  sentEmails = [];
  await requestMemberDeletionOtpCore(
    {
      memberUserId: cleanUserOnePendingSub.id,
      reason: 'Owner approved permanent deletion of pending account',
      actorUserId: adminUserId,
      now,
    },
    mockDb,
    mockEmailService
  );
  const validOtp = sentEmails[0].text.match(/\b\d{6}\b/)![0];
  await verifyMemberDeletionOtpCore(
    {
      memberUserId: cleanUserOnePendingSub.id,
      otp: validOtp,
      confirmedMemberId: 'SECD1091TEST',
      actorUserId: adminUserId,
      now,
    },
    mockDb,
    mockAuthService
  );

  const pendingExecResult = await ownerApproveAndExecuteDeletionCore(
    {
      memberUserId: cleanUserOnePendingSub.id,
      reason: 'Approved DPDP erasure of pending member',
      actorUserId: ownerUserId,
      now,
    },
    mockDb,
    mockAuthService
  );
  assert.strictEqual(pendingExecResult.success, true);
  assert.ok(pendingExecResult.message?.includes('permanently deleted'));
  // Ensure user is deleted
  assert.strictEqual(usersDb.find((u) => u.id === cleanUserOnePendingSub.id), undefined);

  // Check audit log
  const delAudit = auditLogsDb.find(
    (a) => a.action === 'MEMBER_PERMANENTLY_DELETED' && a.entityId === cleanUserOnePendingSub.id
  );
  assert.ok(delAudit);
  assert.strictEqual(delAudit.metadata.pendingSubscriptionsDeleted, 1);
  console.log('✓ PASS: Member with eligible PENDING subscription permanently deleted and audit logged.\n');

  console.log('--- TEST 16: Concurrent deletion requests – no security bypass ---');
  // Setup cleanUserMultiPendingSub with approval record
  sentEmails = [];
  await requestMemberDeletionOtpCore(
    {
      memberUserId: cleanUserMultiPendingSub.id,
      reason: 'Concurrency test request',
      actorUserId: adminUserId,
      now,
    },
    mockDb,
    mockEmailService
  );
  const concOtp = sentEmails[0].text.match(/\b\d{6}\b/)![0];
  await verifyMemberDeletionOtpCore(
    {
      memberUserId: cleanUserMultiPendingSub.id,
      otp: concOtp,
      confirmedMemberId: 'SECD1092TEST',
      actorUserId: adminUserId,
      now,
    },
    mockDb,
    mockAuthService
  );

  // Launch two concurrent executions for the same approved deletion
  const [exec1, exec2] = await Promise.all([
    ownerApproveAndExecuteDeletionCore(
      {
        memberUserId: cleanUserMultiPendingSub.id,
        reason: 'Concurrent thread 1',
        actorUserId: ownerUserId,
        now,
      },
      mockDb,
      mockAuthService
    ),
    ownerApproveAndExecuteDeletionCore(
      {
        memberUserId: cleanUserMultiPendingSub.id,
        reason: 'Concurrent thread 2',
        actorUserId: ownerUserId,
        now,
      },
      mockDb,
      mockAuthService
    ),
  ]);

  // Exactly one execution must succeed, the other must fail cleanly
  const successCount = [exec1.success, exec2.success].filter(Boolean).length;
  assert.strictEqual(successCount, 1, 'Exactly one concurrent deletion execution must succeed');
  const failureResult = !exec1.success ? exec1 : exec2;
  assert.ok(
    failureResult.error?.includes('already processed') ||
      failureResult.error?.includes('concurrent execution') ||
      failureResult.error?.includes('not found') ||
      failureResult.error?.includes('already deleted')
  );
  console.log('✓ PASS: Concurrent requests handled safely with zero security bypass or race condition.\n');

  console.log('--- TEST 17: Archiving and Restoring functionality remains fully operational ---');
  const arcRes = await adminArchiveMemberCore(
    {
      memberUserId: prabirUser.id,
      reason: 'Temporary overseas hiatus',
      actorUserId: adminUserId,
    },
    mockDb
  );
  assert.strictEqual(arcRes.success, true);
  assert.strictEqual(usersDb.find((u) => u.id === prabirUser.id)?.status, 'ARCHIVED');

  const restRes = await adminRestoreMemberCore(
    {
      memberUserId: prabirUser.id,
      reason: 'Hiatus complete',
      actorUserId: adminUserId,
    },
    mockDb
  );
  assert.strictEqual(restRes.success, true);
  assert.strictEqual(usersDb.find((u) => u.id === prabirUser.id)?.status, 'ACTIVE');
  console.log('✓ PASS: Archiving and restoring remain fully operational.\n');

  console.log('--- TEST 18: Visibility filtering preserves active/archived roster isolation ---');
  usersDb.find((u) => u.id === prabirUser.id)!.status = 'ARCHIVED';
  const activeList = await getMembersCore(undefined, 1, 50, mockDb, true, undefined, undefined, false);
  assert.ok(!activeList.members.some((m: any) => m.id === prabirUser.id));

  const archivedList = await getMembersCore(undefined, 1, 50, mockDb, true, undefined, undefined, true);
  assert.ok(archivedList.members.some((m: any) => m.id === prabirUser.id));
  usersDb.find((u) => u.id === prabirUser.id)!.status = 'ACTIVE';
  console.log('✓ PASS: Active and archived listings properly segregated.\n');

  console.log('================================================================');
  console.log('🎉 ALL 18 AUTOMATED LIFECYCLE & PENDING SUBSCRIPTION TESTS PASSED!');
  console.log('================================================================\n');
}

runMemberArchivingAndDeletionTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
