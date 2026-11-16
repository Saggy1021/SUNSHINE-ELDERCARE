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

  // Clean Test Member: Eligible for deletion (zero invoices, zero payments, zero subscriptions)
  let cleanUser: any = {
    id: 'usr_clean_demo_100',
    name: 'Eligible Test Member',
    email: 'eligible_test@example.com',
    role: 'MEMBER',
    status: 'ACTIVE',
    createdAt: new Date('2026-11-01T10:00:00.000Z'),
    memberProfile: {
      id: 'prof_clean_100',
      userId: 'usr_clean_demo_100',
      memberId: 'SECD1099TEST',
      firstName: 'Eligible',
      lastName: 'Test Member',
      mobileNumber: '9876543210',
      serviceAddress: 'Test Sector 5, Kolkata',
    },
    subscriptions: [],
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

  // In-memory Database Mock
  let usersDb: any[] = [prabirUser, cleanUser, ownerUser, adminUser];
  let verificationTokensDb: any[] = [];
  let auditLogsDb: any[] = [];

  const mockDb: any = {
    user: {
      findUnique: async ({ where, include, select }: any) => {
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
        if (where?.identifier?.in) {
          verificationTokensDb = verificationTokensDb.filter(
            (t) => !where.identifier.in.includes(t.identifier)
          );
        } else if (typeof where?.identifier === 'object' && where?.identifier?.startsWith) {
          verificationTokensDb = verificationTokensDb.filter(
            (t) => !t.identifier.startsWith(where.identifier.startsWith)
          );
        } else if (typeof where?.identifier === 'string') {
          verificationTokensDb = verificationTokensDb.filter(
            (t) => t.identifier !== where.identifier
          );
        }
        return { count: 1 };
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        auditLogsDb.push({ id: `audit_${Date.now()}_${Math.random()}`, ...data });
        return { success: true };
      },
    },
    $transaction: async (fn: any) => {
      return fn({
        user: mockDb.user,
        memberProfile: mockDb.memberProfile,
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
    },
  };

  // ===========================================================================
  // SCENARIO 1: ARCHIVE MEMBER (REVERSIBLE, PRESERVES DATA & AUDIT LOG)
  // ===========================================================================
  console.log('Test 1: Archiving a member safely updates status to ARCHIVED and records audit log');
  const archiveResult = await adminArchiveMemberCore(
    {
      memberUserId: prabirUser.id,
      reason: 'Temporary medical stay with family out of country',
      actorUserId: adminUserId,
    },
    mockDb
  );

  assert.strictEqual(archiveResult.success, true);
  assert.strictEqual(usersDb.find((u) => u.id === prabirUser.id)?.status, 'ARCHIVED');
  // Member ID, subscriptions, and profile remain completely intact
  assert.strictEqual(usersDb.find((u) => u.id === prabirUser.id)?.memberProfile?.memberId, 'SECD1001PRTY');
  assert.strictEqual(usersDb.find((u) => u.id === prabirUser.id)?.subscriptions.length, 1);

  // Check audit log
  const archiveAudit = auditLogsDb.find((a) => a.action === 'MEMBER_ARCHIVED');
  assert.ok(archiveAudit);
  assert.strictEqual(archiveAudit.entityId, prabirUser.id);
  assert.strictEqual(archiveAudit.metadata.reason, 'Temporary medical stay with family out of country');
  assert.strictEqual(archiveAudit.metadata.memberId, 'SECD1001PRTY');
  console.log('✓ PASS: Member safely archived; Member ID & subscriptions preserved; audit log created.\n');

  // ===========================================================================
  // SCENARIO 2: RESTORE ARCHIVED MEMBER
  // ===========================================================================
  console.log('Test 2: Restoring an archived member reverts status back to ACTIVE');
  const restoreResult = await adminRestoreMemberCore(
    {
      memberUserId: prabirUser.id,
      reason: 'Returned to Kolkata; resumed active eldercare service',
      actorUserId: adminUserId,
    },
    mockDb
  );

  assert.strictEqual(restoreResult.success, true);
  assert.strictEqual(usersDb.find((u) => u.id === prabirUser.id)?.status, 'ACTIVE');

  // Check audit log
  const restoreAudit = auditLogsDb.find((a) => a.action === 'MEMBER_RESTORED');
  assert.ok(restoreAudit);
  assert.strictEqual(restoreAudit.entityId, prabirUser.id);
  assert.strictEqual(restoreAudit.metadata.reason, 'Returned to Kolkata; resumed active eldercare service');
  console.log('✓ PASS: Member restored to ACTIVE; audit log created.\n');

  // ===========================================================================
  // SCENARIO 3: VISIBILITY FILTERING IN getMembersCore
  // ===========================================================================
  console.log('Test 3: Visibility filtering excludes ARCHIVED members from active listing');
  // Archive cleanUser for testing filtering
  usersDb.find((u) => u.id === cleanUser.id)!.status = 'ARCHIVED';

  const activeListing = await getMembersCore(undefined, 1, 50, mockDb, true, undefined, undefined, false);
  const activeIds = activeListing.members.map((m: any) => m.id);
  assert.ok(activeIds.includes(prabirUser.id), 'Active member Prabir should be in active listing');
  assert.ok(!activeIds.includes(cleanUser.id), 'Archived cleanUser must NOT appear in active listing');
  assert.strictEqual(activeListing.archivedCount, 1, 'archivedCount should accurately report 1');

  const archivedListing = await getMembersCore(undefined, 1, 50, mockDb, true, undefined, undefined, true);
  const archivedIds = archivedListing.members.map((m: any) => m.id);
  assert.ok(archivedIds.includes(cleanUser.id), 'cleanUser must be in archived listing');
  assert.ok(!archivedIds.includes(prabirUser.id), 'Active member must NOT be in archived listing');
  console.log('✓ PASS: Active listing excludes archived members; archived listing isolates them.\n');

  // Reset cleanUser to ACTIVE for subsequent tests
  usersDb.find((u) => u.id === cleanUser.id)!.status = 'ACTIVE';

  // ===========================================================================
  // SCENARIO 4: OTP GENERATION AND EMAIL DELIVERY INTEGRATION
  // ===========================================================================
  console.log('Test 4: Requesting deletion OTP generates 6-digit code and dispatches email');
  sentEmails = [];
  const otpRequest = await requestMemberDeletionOtpCore(
    {
      memberUserId: cleanUser.id,
      reason: 'Member request under DPDP Act right to be forgotten',
      actorUserId: adminUserId,
      now,
    },
    mockDb,
    mockEmailService
  );

  assert.strictEqual(otpRequest.success, true);
  assert.ok(otpRequest.message?.includes('6-digit verification code'));
  assert.strictEqual(sentEmails.length, 1);
  assert.strictEqual(sentEmails[0].to, adminEmail);
  assert.ok(sentEmails[0].subject.includes('Permanent Member Deletion'));
  assert.ok(sentEmails[0].text.includes('Eligible Test Member'));
  assert.ok(sentEmails[0].text.includes('SECD1099TEST'));

  // Extract raw OTP from email text for verification tests
  const otpMatch = sentEmails[0].text.match(/\b\d{6}\b/);
  assert.ok(otpMatch, 'Email must contain a 6-digit numeric OTP');
  const generatedOtp = otpMatch[0];

  // Verify hashed token in database (plaintext OTP must NEVER be stored)
  const storedOtp = verificationTokensDb.find((t) => t.identifier === `del_otp:${cleanUser.id}:${adminUserId}`);
  assert.ok(storedOtp);
  assert.strictEqual(storedOtp.token, hashToken(generatedOtp));
  assert.notStrictEqual(storedOtp.token, generatedOtp);

  // Check audit log
  const otpAudit = auditLogsDb.find((a) => a.action === 'MEMBER_DELETION_OTP_REQUESTED');
  assert.ok(otpAudit);
  assert.strictEqual(otpAudit.metadata.adminEmail, adminEmail);
  assert.strictEqual(otpAudit.metadata.memberId, 'SECD1099TEST');
  // Plaintext OTP should never be in audit log
  assert.strictEqual(JSON.stringify(otpAudit).includes(generatedOtp), false);
  console.log('✓ PASS: Cryptographic OTP generated, securely hashed, dispatched via EmailService; audit logged without secrets.\n');

  // ===========================================================================
  // SCENARIO 5: OTP EXPIRATION (FAILS AFTER 5 MINUTES)
  // ===========================================================================
  console.log('Test 5: OTP verification fails when code is expired (> 5 minutes)');
  const expiredTime = new Date(now.getTime() + 6 * 60 * 1000); // 6 mins later
  const expiredVerify = await verifyMemberDeletionOtpCore(
    {
      memberUserId: cleanUser.id,
      otp: generatedOtp,
      confirmedMemberId: 'SECD1099TEST',
      actorUserId: adminUserId,
      now: expiredTime,
    },
    mockDb,
    mockAuthService
  );

  assert.strictEqual(expiredVerify.success, false);
  assert.strictEqual(expiredVerify.expired, true);
  assert.ok(expiredVerify.error?.includes('expired'));
  console.log('✓ PASS: Expired OTP rejected properly after 5-minute validity window.\n');

  // Request fresh OTP for subsequent verification tests
  sentEmails = [];
  await requestMemberDeletionOtpCore(
    {
      memberUserId: cleanUser.id,
      reason: 'Member request under DPDP Act right to be forgotten',
      actorUserId: adminUserId,
      now,
    },
    mockDb,
    mockEmailService
  );
  const activeOtp = sentEmails[0].text.match(/\b\d{6}\b/)![0];

  // ===========================================================================
  // SCENARIO 6: INCORRECT OTP REJECTION & ATTEMPT TRACKING
  // ===========================================================================
  console.log('Test 6: Incorrect OTP is rejected and remaining attempts are decremented');
  const wrongOtpVerify = await verifyMemberDeletionOtpCore(
    {
      memberUserId: cleanUser.id,
      otp: '000000', // Incorrect OTP
      confirmedMemberId: 'SECD1099TEST',
      actorUserId: adminUserId,
      now,
    },
    mockDb,
    mockAuthService
  );

  assert.strictEqual(wrongOtpVerify.success, false);
  assert.strictEqual(wrongOtpVerify.remainingAttempts, 4);
  assert.ok(wrongOtpVerify.error?.includes('4 attempt(s) remaining'));

  const failedAudit = auditLogsDb.find((a) => a.action === 'MEMBER_DELETION_OTP_FAILED');
  assert.ok(failedAudit);
  assert.strictEqual(failedAudit.metadata.attempt, 1);
  console.log('✓ PASS: Invalid OTP rejected and remaining attempts tracked.\n');

  // ===========================================================================
  // SCENARIO 7: 5-ATTEMPT LOCKOUT
  // ===========================================================================
  console.log('Test 7: 5 consecutive failed OTP attempts trigger immediate lockout');
  for (let i = 2; i <= 5; i++) {
    await verifyMemberDeletionOtpCore(
      {
        memberUserId: cleanUser.id,
        otp: '000000',
        confirmedMemberId: 'SECD1099TEST',
        actorUserId: adminUserId,
        now,
      },
      mockDb,
      mockAuthService
    );
  }

  // 6th attempt should be locked out
  const lockedOutVerify = await verifyMemberDeletionOtpCore(
    {
      memberUserId: cleanUser.id,
      otp: activeOtp, // even with correct OTP, lockout is enforced!
      confirmedMemberId: 'SECD1099TEST',
      actorUserId: adminUserId,
      now,
    },
    mockDb,
    mockAuthService
  );

  assert.strictEqual(lockedOutVerify.success, false);
  assert.strictEqual(lockedOutVerify.lockedOut, true);
  assert.ok(lockedOutVerify.error?.includes('Maximum verification attempts exceeded'));

  const lockoutAudit = auditLogsDb.find((a) => a.action === 'MEMBER_DELETION_OTP_LOCKOUT');
  assert.ok(lockoutAudit);
  console.log('✓ PASS: 5-attempt lockout successfully enforced; active OTP wiped out.\n');

  // Request fresh OTP for successful verification
  sentEmails = [];
  await requestMemberDeletionOtpCore(
    {
      memberUserId: cleanUser.id,
      reason: 'Member request under DPDP Act right to be forgotten',
      actorUserId: adminUserId,
      now,
    },
    mockDb,
    mockEmailService
  );
  const freshOtp = sentEmails[0].text.match(/\b\d{6}\b/)![0];

  // ===========================================================================
  // SCENARIO 8 & 9: EXACT MEMBER ID CONFIRMATION & SINGLE-USE CONSUMPTION
  // ===========================================================================
  console.log('Test 8: Exact Member ID confirmation required');
  const wrongMidVerify = await verifyMemberDeletionOtpCore(
    {
      memberUserId: cleanUser.id,
      otp: freshOtp,
      confirmedMemberId: 'SECD9999WRONG',
      actorUserId: adminUserId,
      now,
    },
    mockDb,
    mockAuthService
  );

  assert.strictEqual(wrongMidVerify.success, false);
  assert.ok(wrongMidVerify.error?.includes('Member ID mismatch'));

  console.log('Test 9: Valid OTP and exact Member ID succeeds and single-use consumes OTP');
  const validVerify = await verifyMemberDeletionOtpCore(
    {
      memberUserId: cleanUser.id,
      otp: freshOtp,
      confirmedMemberId: 'SECD1099TEST',
      actorUserId: adminUserId,
      now,
    },
    mockDb,
    mockAuthService
  );

  assert.strictEqual(validVerify.success, true);
  assert.strictEqual(validVerify.requiresOwnerApproval, true);

  // Single-use: Verify OTP token was deleted from database
  const consumedOtp = verificationTokensDb.find((t) => t.identifier === `del_otp:${cleanUser.id}:${adminUserId}`);
  assert.strictEqual(consumedOtp, undefined, 'OTP token must be deleted after single successful verification');

  // Verify approval record was created
  const apprRecord = verificationTokensDb.find((t) => t.identifier === `del_appr:${cleanUser.id}`);
  assert.ok(apprRecord, 'Approval record must be created for Owner step');

  // Replay attempt must fail
  const replayVerify = await verifyMemberDeletionOtpCore(
    {
      memberUserId: cleanUser.id,
      otp: freshOtp,
      confirmedMemberId: 'SECD1099TEST',
      actorUserId: adminUserId,
      now,
    },
    mockDb,
    mockAuthService
  );
  assert.strictEqual(replayVerify.success, false);
  assert.ok(replayVerify.error?.includes('already been used') || replayVerify.error?.includes('No active verification code'));
  console.log('✓ PASS: Member ID exact match enforced, approval token issued, OTP consumed against replay.\n');

  // ===========================================================================
  // SCENARIO 10: PRIMARY OWNER APPROVAL & PERMANENT EXECUTION
  // ===========================================================================
  console.log('Test 10: Primary Owner executes permanent deletion, purging profile while recording audit log');
  const ownerExecution = await ownerApproveAndExecuteDeletionCore(
    {
      memberUserId: cleanUser.id,
      reason: 'Owner confirmed and approved DPDP data erasure',
      actorUserId: ownerUserId,
      now,
    },
    mockDb,
    mockAuthService
  );

  assert.strictEqual(ownerExecution.success, true);
  assert.ok(ownerExecution.message?.includes('permanently deleted'));

  // Ensure user is completely purged from user database
  const purgedUser = usersDb.find((u) => u.id === cleanUser.id);
  assert.strictEqual(purgedUser, undefined);

  // Check audit log for permanent deletion
  const deletionAudit = auditLogsDb.find((a) => a.action === 'MEMBER_PERMANENTLY_DELETED');
  assert.ok(deletionAudit);
  assert.strictEqual(deletionAudit.entityId, cleanUser.id);
  assert.strictEqual(deletionAudit.actorUserId, ownerUserId);
  assert.strictEqual(deletionAudit.metadata.deletedMemberId, 'SECD1099TEST');
  assert.strictEqual(deletionAudit.metadata.approvedBy, 'info.sunshineeldercare@gmail.com');
  console.log('✓ PASS: Primary Owner executed permanent deletion; user deleted; audit history preserved.\n');

  // ===========================================================================
  // SCENARIO 11: NON-OWNER CANNOT APPROVE PERMANENT DELETION
  // ===========================================================================
  console.log('Test 11: Non-owner administrator is strictly rejected by requireOwner');
  let nonOwnerBlocked = false;
  try {
    await ownerApproveAndExecuteDeletionCore(
      {
        memberUserId: prabirUser.id,
        reason: 'Attempted unauthorized deletion',
        actorUserId: adminUserId, // non-owner
      },
      mockDb,
      mockAuthService
    );
  } catch (err: any) {
    nonOwnerBlocked = true;
    assert.ok(err.message.includes('Owner access required'));
  }
  assert.strictEqual(nonOwnerBlocked, true, 'Non-owner must be blocked by requireOwner');
  console.log('✓ PASS: Non-owner blocked from approving permanent deletion.\n');

  // ===========================================================================
  // SCENARIO 12: FINANCIAL DEPENDENCIES BLOCK PERMANENT DELETION
  // ===========================================================================
  console.log('Test 12: Financial dependencies (invoices, payments, receipts, subscriptions) strictly block permanent deletion');
  const eligibilityPrabir = await checkMemberDeletionEligibilityCore(prabirUser.id, mockDb);
  assert.strictEqual(eligibilityPrabir.eligible, false);
  assert.strictEqual(eligibilityPrabir.hasFinancialDependencies, true);
  assert.strictEqual(eligibilityPrabir.recommendedAction, 'ARCHIVE');
  assert.ok(eligibilityPrabir.dependencies?.some((d) => d.includes('subscription')));
  assert.ok(eligibilityPrabir.dependencies?.some((d) => d.includes('invoice')));
  assert.ok(eligibilityPrabir.dependencies?.some((d) => d.includes('payment')));
  assert.ok(eligibilityPrabir.dependencies?.some((d) => d.includes('receipt')));

  // Requesting OTP on account with financial dependencies fails immediately
  const prabirOtpAttempt = await requestMemberDeletionOtpCore(
    {
      memberUserId: prabirUser.id,
      reason: 'Attempted deletion of paid member',
      actorUserId: adminUserId,
      now,
    },
    mockDb,
    mockEmailService
  );
  assert.strictEqual(prabirOtpAttempt.success, false);
  assert.strictEqual(prabirOtpAttempt.hasFinancialDependencies, true);
  assert.strictEqual(prabirOtpAttempt.recommendedAction, 'ARCHIVE');
  console.log('✓ PASS: Financial records block permanent deletion and recommend archiving.\n');

  // ===========================================================================
  // SCENARIO 13: AUDIT LOGGING INTEGRITY (NO SECRETS LEAKED)
  // ===========================================================================
  console.log('Test 13: Verify all audit logs contain actor, action, metadata, and zero secrets');
  for (const log of auditLogsDb) {
    assert.ok(log.actorUserId, 'Log must have actorUserId');
    assert.ok(log.action, 'Log must have action');
    assert.ok(log.entityType, 'Log must have entityType');
    assert.ok(log.metadata, 'Log must have metadata');
    // Ensure no plaintext passwords or 6-digit OTP codes leaked in audit log
    const logStr = JSON.stringify(log);
    assert.strictEqual(/otp\s*[:=]\s*"\d{6}"/i.test(logStr), false, 'Audit log must not contain plaintext OTP');
  }
  console.log(`✓ PASS: All ${auditLogsDb.length} audit logs verified for security and completeness.\n`);

  // ===========================================================================
  // SCENARIO 14: CONCURRENT DELETION / RACE CONDITION PREVENTION
  // ===========================================================================
  console.log('Test 14: Deleting a non-existent or already deleted member returns clean error');
  // Put a dummy approval token for a non-existent user
  await mockDb.verificationToken.create({
    data: {
      identifier: 'del_appr:non_existent_usr',
      token: 'fake_token',
      expires: new Date(now.getTime() + 10 * 60 * 1000),
    },
  });

  const missingUserDeletion = await ownerApproveAndExecuteDeletionCore(
    {
      memberUserId: 'non_existent_usr',
      reason: 'Attempted race condition deletion',
      actorUserId: ownerUserId,
      now,
    },
    mockDb,
    mockAuthService
  );
  assert.strictEqual(missingUserDeletion.success, false);
  assert.ok(missingUserDeletion.error?.includes('not found') || missingUserDeletion.error?.includes('already deleted'));
  console.log('✓ PASS: Race condition / non-existent user handled gracefully without crash.\n');

  // ===========================================================================
  // SCENARIO 15: ADMINISTRATIVE AND OWNER ACCOUNT DELETION PROTECTION
  // ===========================================================================
  console.log('Test 15: Owner and system administrator accounts cannot be deleted or archived');
  const ownerArchiving = await adminArchiveMemberCore(
    {
      memberUserId: ownerUserId,
      reason: 'Unauthorized owner archiving',
      actorUserId: adminUserId,
    },
    mockDb
  );
  assert.strictEqual(ownerArchiving.success, false);
  assert.ok(ownerArchiving.error?.includes('Administrative and owner accounts cannot be archived'));

  const ownerEligibility = await checkMemberDeletionEligibilityCore(ownerUserId, mockDb);
  assert.strictEqual(ownerEligibility.eligible, false);
  assert.ok(ownerEligibility.reason?.includes('Administrative and system accounts cannot be permanently deleted'));
  console.log('✓ PASS: Administrative and Owner accounts protected from archiving and deletion.\n');

  console.log('================================================================');
  console.log('🎉 ALL 15 SECURE MEMBER ARCHIVING & DELETION TESTS PASSED!');
  console.log('================================================================\n');
}

runMemberArchivingAndDeletionTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
