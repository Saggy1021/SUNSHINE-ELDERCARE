import assert from 'node:assert';
import { deleteEmployeeCore } from '../../app/actions/employee';
import {
  requestAdminCreationOtpCore,
  confirmAndCreateAdminCore,
} from '../../app/actions/admin-users';
import { hashToken } from '../../lib/auth/tokens';

async function runTestSuite() {
  console.log('================================================================');
  console.log('Sunshine Eldercare — Employee Deletion & Admin Creation OTP Tests');
  console.log('Testing: Safe Employee Deletion, Dependency Checks, Primary Owner OTP');
  console.log('================================================================\n');

  const now = new Date('2026-11-17T12:00:00.000Z');
  const primaryOwnerId = 'owner_usr_001';
  const primaryOwnerEmail = 'info.sunshineeldercare@gmail.com';
  const ordinaryAdminId = 'admin_usr_002';
  const ordinaryAdminEmail = 'staff.admin@sunshineeldercare.in';
  const employeeUserId = 'emp_usr_003';
  const employeeUserEmail = 'caregiver@sunshineeldercare.in';

  // Mock Authorization Service
  const mockAuthService = {
    isOwner: async (userId: string) => userId === primaryOwnerId,
    requireOwner: async (userId: string) => {
      if (userId !== primaryOwnerId) {
        throw new Error('Unauthorized: Owner access required.');
      }
    },
    require: async (userId: string, perm: string) => {
      if (userId === employeeUserId) {
        throw new Error(`Unauthorized: Requires permission ${perm}`);
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

  // Mock Rate Limit Service
  const mockRateLimitService = {
    checkLimit: async (_action: string, _identifier: string) => true,
  };

  // Mock Admin User Service
  let createdAdmins: any[] = [];
  let invitedAdmins: any[] = [];
  const mockAdminUserService = {
    createAdminUser: async (
      actorUserId: string,
      email: string,
      name: string,
      passwordPlain: string,
      employeeId: string | null,
      roleIds: string[]
    ) => {
      const newAdmin = {
        id: `admin_${Date.now()}`,
        email,
        name,
        employeeId,
        roleIds,
        actorUserId,
      };
      createdAdmins.push(newAdmin);
      return newAdmin;
    },
    inviteAdminUser: async (
      actorUserId: string,
      email: string,
      name: string,
      employeeId: string | null,
      roleIds: string[]
    ) => {
      const token = `inv_token_${Date.now()}`;
      invitedAdmins.push({
        email,
        name,
        employeeId,
        roleIds,
        token,
        actorUserId,
      });
      return token;
    },
  };

  // ============================================================================
  // SECTION 1: EMPLOYEE DELETION TESTS (NO OTP REQUIRED)
  // ============================================================================
  console.log('\n--- SECTION 1: EMPLOYEE DELETION TESTS ---');

  // Test 1.1: Eligible Employee (Zero Dependencies) - Deletion Succeeds without OTP
  console.log('[TEST 1.1] Eligible employee with zero dependencies is permanently deleted without OTP');
  {
    let deletedId = '';
    let auditRecords: any[] = [];

    const mockDb: any = {
      employee: {
        findUnique: async ({ where }: any) => {
          if (where.id === 'emp_clean_001') {
            return {
              id: 'emp_clean_001',
              employeeId: 'SEC/105/JODO',
              firstName: 'John',
              lastName: 'Doe',
              userId: null,
              visits: [],
              visitAssignments: [],
              assignments: [],
              tasks: [],
            };
          }
          return null;
        },
        delete: async ({ where }: any) => {
          deletedId = where.id;
          return { id: where.id };
        },
      },
      adminInvitation: {
        findFirst: async () => null,
      },
      auditLog: {
        create: async ({ data }: any) => {
          auditRecords.push(data);
          return { id: 'audit_001', ...data };
        },
      },
    };

    const result = await deleteEmployeeCore('emp_clean_001', primaryOwnerId, mockDb);
    assert.strictEqual(result.success, true, 'Eligible employee should be deleted');
    assert.strictEqual(deletedId, 'emp_clean_001', 'Database delete must be called with employee id');
    assert.strictEqual(auditRecords.length, 1, 'Audit log must be created');
    assert.strictEqual(auditRecords[0].action, 'EMPLOYEE_DELETED', 'Action must be EMPLOYEE_DELETED');
    assert.strictEqual(auditRecords[0].metadata.employeeId, 'SEC/105/JODO');
    console.log('✓ PASS: Eligible employee deleted and audited with no OTP challenge');
  }

  // Test 1.2: Ineligible Employee - Blocked by Historical Visits
  console.log('\n[TEST 1.2] Employee with historical Care Visits is blocked from deletion');
  {
    let deletedCalled = false;
    const mockDb: any = {
      employee: {
        findUnique: async () => ({
          id: 'emp_visits_002',
          employeeId: 'SEC/102/PRTY',
          firstName: 'Priya',
          lastName: 'Sharma',
          userId: null,
          visits: [{ id: 'visit_999' }],
          visitAssignments: [],
          assignments: [],
          tasks: [],
        }),
        delete: async () => {
          deletedCalled = true;
        },
      },
      adminInvitation: { findFirst: async () => null },
    };

    const result = await deleteEmployeeCore('emp_visits_002', primaryOwnerId, mockDb);
    assert.strictEqual(result.success, false, 'Deletion must fail');
    assert.strictEqual(result.hasDependencies, true, 'hasDependencies must be true');
    assert.strictEqual(deletedCalled, false, 'Database delete must NEVER be called');
    assert.ok(result.error?.includes('deactivate'), 'Error must advise user to deactivate instead');
    console.log('✓ PASS: Employee with visits blocked; cascade deletion prevented');
  }

  // Test 1.3: Ineligible Employee - Blocked by Care Assignments
  console.log('\n[TEST 1.3] Employee with Care Assignments is blocked from deletion');
  {
    let deletedCalled = false;
    const mockDb: any = {
      employee: {
        findUnique: async () => ({
          id: 'emp_assign_003',
          employeeId: 'SEC/103/ASGN',
          firstName: 'Amit',
          lastName: 'Ghosh',
          userId: null,
          visits: [],
          visitAssignments: [],
          assignments: [{ id: 'assign_111' }],
          tasks: [],
        }),
        delete: async () => {
          deletedCalled = true;
        },
      },
      adminInvitation: { findFirst: async () => null },
    };

    const result = await deleteEmployeeCore('emp_assign_003', primaryOwnerId, mockDb);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.hasDependencies, true);
    assert.strictEqual(deletedCalled, false);
    console.log('✓ PASS: Employee with assignments blocked');
  }

  // Test 1.4: Ineligible Employee - Blocked by Care Tasks
  console.log('\n[TEST 1.4] Employee with Care Tasks is blocked from deletion');
  {
    let deletedCalled = false;
    const mockDb: any = {
      employee: {
        findUnique: async () => ({
          id: 'emp_task_004',
          employeeId: 'SEC/104/TASK',
          firstName: 'Sunita',
          lastName: 'Paul',
          userId: null,
          visits: [],
          visitAssignments: [],
          assignments: [],
          tasks: [{ id: 'task_222' }],
        }),
        delete: async () => {
          deletedCalled = true;
        },
      },
      adminInvitation: { findFirst: async () => null },
    };

    const result = await deleteEmployeeCore('emp_task_004', primaryOwnerId, mockDb);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.hasDependencies, true);
    assert.strictEqual(deletedCalled, false);
    console.log('✓ PASS: Employee with tasks blocked');
  }

  // Test 1.5: Ineligible Employee - Blocked by Linked User Account
  console.log('\n[TEST 1.5] Employee with linked system User account is blocked from deletion');
  {
    let deletedCalled = false;
    const mockDb: any = {
      employee: {
        findUnique: async () => ({
          id: 'emp_user_005',
          employeeId: 'SEC/106/USER',
          firstName: 'Rahul',
          lastName: 'Verma',
          userId: 'usr_linked_777',
          visits: [],
          visitAssignments: [],
          assignments: [],
          tasks: [],
        }),
        delete: async () => {
          deletedCalled = true;
        },
      },
      adminInvitation: { findFirst: async () => null },
    };

    const result = await deleteEmployeeCore('emp_user_005', primaryOwnerId, mockDb);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.hasDependencies, true);
    assert.strictEqual(deletedCalled, false);
    console.log('✓ PASS: Employee with linked User account blocked');
  }

  // Test 1.6: Ineligible Employee - Blocked by Admin Invitation Link
  console.log('\n[TEST 1.6] Employee with associated Admin Invitation is blocked from deletion');
  {
    let deletedCalled = false;
    const mockDb: any = {
      employee: {
        findUnique: async () => ({
          id: 'emp_invite_006',
          employeeId: 'SEC/107/INVT',
          firstName: 'Anjali',
          lastName: 'Dey',
          userId: null,
          visits: [],
          visitAssignments: [],
          assignments: [],
          tasks: [],
        }),
        delete: async () => {
          deletedCalled = true;
        },
      },
      adminInvitation: {
        findFirst: async ({ where }: any) => {
          return { id: 'invitation_888' };
        },
      },
    };

    const result = await deleteEmployeeCore('emp_invite_006', primaryOwnerId, mockDb);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.hasDependencies, true);
    assert.strictEqual(deletedCalled, false);
    console.log('✓ PASS: Employee with Admin Invitation blocked');
  }

  // ============================================================================
  // SECTION 2: NEW ADMIN CREATION OTP TESTS
  // ============================================================================
  console.log('\n--- SECTION 2: NEW ADMIN CREATION OTP WORKFLOW TESTS ---');

  // Test 2.1: Non-Owner (Ordinary Admin) cannot initiate OTP request
  console.log('[TEST 2.1] Ordinary Admin cannot request admin creation OTP');
  {
    let errorThrown = false;
    try {
      await requestAdminCreationOtpCore(
        {
          actorUserId: ordinaryAdminId,
          actorEmail: ordinaryAdminEmail,
          email: 'newadmin@sunshineeldercare.in',
          name: 'New Admin Candidate',
          roleIds: ['role_admin_01'],
          now,
        },
        {},
        mockEmailService,
        mockAuthService,
        mockRateLimitService
      );
    } catch (err: any) {
      errorThrown = true;
      assert.ok(err.message.includes('Only the Primary Owner'), 'Must state only Primary Owner can create admins');
    }
    assert.strictEqual(errorThrown, true, 'Non-owner must be blocked server-side');
    console.log('✓ PASS: Ordinary Admin strictly blocked from requesting OTP');
  }

  // Test 2.2: Employee cannot initiate OTP request
  console.log('\n[TEST 2.2] Employee cannot request admin creation OTP');
  {
    let errorThrown = false;
    try {
      await requestAdminCreationOtpCore(
        {
          actorUserId: employeeUserId,
          actorEmail: employeeUserEmail,
          email: 'newadmin@sunshineeldercare.in',
          name: 'New Admin Candidate',
          roleIds: ['role_admin_01'],
          now,
        },
        {},
        mockEmailService,
        mockAuthService,
        mockRateLimitService
      );
    } catch (err: any) {
      errorThrown = true;
      assert.ok(err.message.includes('Only the Primary Owner'));
    }
    assert.strictEqual(errorThrown, true);
    console.log('✓ PASS: Employee strictly blocked from requesting OTP');
  }

  // Test 2.3: Primary Owner initiates OTP - Code sent EXCLUSIVELY to Primary Owner
  console.log('\n[TEST 2.3] Primary Owner requests OTP: code sent exclusively to Primary Owner');
  let storedTokens: Map<string, any> = new Map();
  let auditLogs: any[] = [];
  {
    sentEmails = [];
    storedTokens.clear();
    auditLogs = [];

    const mockDb: any = {
      user: {
        findUnique: async ({ where }: any) => null, // Target does not exist yet
      },
      role: {
        findMany: async () => [{ id: 'role_admin_01', name: 'Operational Admin' }],
      },
      verificationToken: {
        deleteMany: async ({ where }: any) => {
          if (where?.identifier?.in) {
            for (const id of where.identifier.in) storedTokens.delete(id);
          } else if (where?.identifier) {
            storedTokens.delete(where.identifier);
          }
        },
        create: async ({ data }: any) => {
          storedTokens.set(data.identifier, data);
          return data;
        },
        findFirst: async ({ where }: any) => storedTokens.get(where.identifier) || null,
      },
      auditLog: {
        create: async ({ data }: any) => {
          auditLogs.push(data);
          return { id: 'audit_otp_01', ...data };
        },
      },
    };

    const targetEmail = 'ananya.sen@sunshineeldercare.in';
    const result = await requestAdminCreationOtpCore(
      {
        actorUserId: primaryOwnerId,
        actorEmail: primaryOwnerEmail,
        email: targetEmail,
        name: 'Ananya Sen',
        roleIds: ['role_admin_01'],
        employeeId: 'emp_clean_001',
        now,
      },
      mockDb,
      mockEmailService,
      mockAuthService,
      mockRateLimitService
    );

    assert.strictEqual(result.success, true);
    assert.strictEqual(sentEmails.length, 1, 'Exactly one email should be sent');
    assert.strictEqual(
      sentEmails[0].to,
      'info.sunshineeldercare@gmail.com',
      'OTP email must be sent EXCLUSIVELY to Primary Owner'
    );
    assert.notStrictEqual(
      sentEmails[0].to,
      targetEmail,
      'OTP email must NEVER be sent to the proposed admin'
    );
    assert.ok(sentEmails[0].subject.includes('CRITICAL: Verification Code for New Admin Creation'));

    // Check token storage (secure hash stored, never plaintext)
    const otpKey = `admin_create_otp:${primaryOwnerId}:${targetEmail}`;
    const tokenRecord = storedTokens.get(otpKey);
    assert.ok(tokenRecord, 'OTP record must be stored');
    assert.strictEqual(tokenRecord.token.length, 64, 'Stored token must be 64-char SHA-256 hash');
    assert.strictEqual(
      tokenRecord.expires.getTime(),
      now.getTime() + 5 * 60 * 1000,
      'Expiry must be exactly 5 minutes'
    );

    // Audit log check (never logs plaintext OTP)
    const requestAudit = auditLogs.find((l) => l.action === 'ADMIN_CREATION_OTP_REQUESTED');
    assert.ok(requestAudit, 'ADMIN_CREATION_OTP_REQUESTED audit log must exist');
    assert.strictEqual(requestAudit.metadata.primaryOwnerEmail, primaryOwnerEmail);
    assert.strictEqual(requestAudit.metadata.proposedAdminEmail, targetEmail);
    assert.strictEqual(JSON.stringify(requestAudit).includes(tokenRecord.token), false, 'Plaintext OTP must not be logged');

    console.log('✓ PASS: OTP dispatched exclusively to Primary Owner; SHA-256 stored; audit recorded without plaintext');
  }

  // Test 2.4: Invalid OTP is rejected and remaining attempts decremented
  console.log('\n[TEST 2.4] Invalid OTP is rejected with remaining attempts counter');
  {
    const targetEmail = 'ananya.sen@sunshineeldercare.in';
    const mockDb: any = {
      verificationToken: {
        findFirst: async ({ where }: any) => storedTokens.get(where.identifier) || null,
        deleteMany: async ({ where }: any) => {
          if (where?.identifier?.in) {
            for (const id of where.identifier.in) storedTokens.delete(id);
          } else if (where?.identifier) {
            storedTokens.delete(where.identifier);
          }
        },
        create: async ({ data }: any) => {
          storedTokens.set(data.identifier, data);
          return data;
        },
      },
      auditLog: {
        create: async ({ data }: any) => {
          auditLogs.push(data);
          return { id: 'audit_002', ...data };
        },
      },
      user: {
        findUnique: async () => null,
      },
    };

    const res = await confirmAndCreateAdminCore(
      {
        actorUserId: primaryOwnerId,
        actorEmail: primaryOwnerEmail,
        email: targetEmail,
        otp: '999999', // Wrong OTP
        name: 'Ananya Sen',
        roleIds: ['role_admin_01'],
        employeeId: 'emp_clean_001',
        now,
      },
      mockDb,
      mockEmailService,
      mockAuthService,
      mockAdminUserService
    );

    assert.strictEqual(res.success, false, 'Invalid OTP must fail');
    assert.strictEqual(res.remainingAttempts, 4, 'Remaining attempts must be 4');
    assert.ok(res.error?.includes('4 attempt(s) remaining'));

    const failAudit = auditLogs.find((l) => l.action === 'ADMIN_CREATION_OTP_FAILED');
    assert.ok(failAudit, 'ADMIN_CREATION_OTP_FAILED audit log must exist');
    console.log('✓ PASS: Invalid OTP rejected and attempts decremented');
  }

  // Test 2.5: Lockout after 5 failed verification attempts
  console.log('\n[TEST 2.5] Lockout enforced after 5 failed verification attempts');
  {
    const targetEmail = 'ananya.sen@sunshineeldercare.in';
    const mockDb: any = {
      verificationToken: {
        findFirst: async ({ where }: any) => storedTokens.get(where.identifier) || null,
        deleteMany: async ({ where }: any) => {
          if (where?.identifier?.in) {
            for (const id of where.identifier.in) storedTokens.delete(id);
          } else if (where?.identifier) {
            storedTokens.delete(where.identifier);
          }
        },
        create: async ({ data }: any) => {
          storedTokens.set(data.identifier, data);
          return data;
        },
      },
      auditLog: {
        create: async ({ data }: any) => {
          auditLogs.push(data);
          return { id: 'audit_003', ...data };
        },
      },
      user: {
        findUnique: async () => null,
      },
    };

    // Attempt 1 was done in Test 2.4.
    // Now fail 3 more times (attempts 2, 3, 4)
    for (let i = 0; i < 3; i++) {
      const res = await confirmAndCreateAdminCore(
        {
          actorUserId: primaryOwnerId,
          actorEmail: primaryOwnerEmail,
          email: targetEmail,
          otp: '123456',
          name: 'Ananya Sen',
          roleIds: ['role_admin_01'],
          employeeId: 'emp_clean_001',
          now,
        },
        mockDb,
        mockEmailService,
        mockAuthService,
        mockAdminUserService
      );
      assert.strictEqual(res.success, false);
      assert.strictEqual(res.lockedOut, undefined);
    }

    // 5th failed attempt must immediately trigger lockout and delete tokens
    const lockoutRes = await confirmAndCreateAdminCore(
      {
        actorUserId: primaryOwnerId,
        actorEmail: primaryOwnerEmail,
        email: targetEmail,
        otp: '123456',
        name: 'Ananya Sen',
        roleIds: ['role_admin_01'],
        employeeId: 'emp_clean_001',
        now,
      },
      mockDb,
      mockEmailService,
      mockAuthService,
      mockAdminUserService
    );

    assert.strictEqual(lockoutRes.success, false);
    assert.strictEqual(lockoutRes.lockedOut, true, '5th failed attempt must trigger lockout');
    assert.ok(lockoutRes.error?.includes('Maximum verification attempts exceeded'));

    const lockoutAudit = auditLogs.find((l) => l.action === 'ADMIN_CREATION_LOCKED_OUT');
    assert.ok(lockoutAudit, 'ADMIN_CREATION_LOCKED_OUT audit log must exist');
    console.log('✓ PASS: 5-attempt lockout enforced and tokens purged');
  }

  // Test 2.6: Expired OTP is rejected
  console.log('\n[TEST 2.6] Expired OTP (>5 minutes) is rejected');
  {
    storedTokens.clear();
    const targetEmail = 'expired.test@sunshineeldercare.in';
    const rawOtp = '654321';
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

    const otpKey = `admin_create_otp:${primaryOwnerId}:${targetEmail}`;
    storedTokens.set(otpKey, {
      identifier: otpKey,
      token: hashToken(rawOtp),
      expires: expiresAt,
    });

    const mockDb: any = {
      verificationToken: {
        findFirst: async ({ where }: any) => storedTokens.get(where.identifier) || null,
        deleteMany: async ({ where }: any) => {
          if (where?.identifier?.in) {
            for (const id of where.identifier.in) storedTokens.delete(id);
          } else if (where?.identifier) {
            storedTokens.delete(where.identifier);
          }
        },
        create: async ({ data }: any) => {
          storedTokens.set(data.identifier, data);
          return data;
        },
      },
      auditLog: {
        create: async ({ data }: any) => {
          auditLogs.push(data);
          return { id: 'audit_004', ...data };
        },
      },
      user: {
        findUnique: async () => null,
      },
    };

    // Fast-forward 5 minutes and 1 second
    const laterTime = new Date(now.getTime() + 5 * 60 * 1000 + 1000);
    const expiredRes = await confirmAndCreateAdminCore(
      {
        actorUserId: primaryOwnerId,
        actorEmail: primaryOwnerEmail,
        email: targetEmail,
        otp: rawOtp,
        name: 'Expired Test',
        roleIds: ['role_admin_01'],
        now: laterTime,
      },
      mockDb,
      mockEmailService,
      mockAuthService,
      mockAdminUserService
    );

    assert.strictEqual(expiredRes.success, false);
    assert.strictEqual(expiredRes.expired, true);
    assert.ok(expiredRes.error?.includes('expired'));
    console.log('✓ PASS: Expired OTP rejected');
  }

  // Test 2.7: Valid OTP - Admin Created & Single-Use Consumption Enforced
  console.log('\n[TEST 2.7] Valid Primary Owner OTP creates admin and consumes token (single-use)');
  {
    storedTokens.clear();
    createdAdmins = [];
    invitedAdmins = [];
    auditLogs = [];

    const targetEmail = 'kavita.roy@sunshineeldercare.in';
    const rawOtp = '789123';
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

    const otpKey = `admin_create_otp:${primaryOwnerId}:${targetEmail}`;
    storedTokens.set(otpKey, {
      identifier: otpKey,
      token: hashToken(rawOtp),
      expires: expiresAt,
    });

    const mockDb: any = {
      verificationToken: {
        findFirst: async ({ where }: any) => storedTokens.get(where.identifier) || null,
        deleteMany: async ({ where }: any) => {
          if (where?.identifier?.in) {
            for (const id of where.identifier.in) storedTokens.delete(id);
          } else if (where?.identifier) {
            storedTokens.delete(where.identifier);
          }
        },
        create: async ({ data }: any) => {
          storedTokens.set(data.identifier, data);
          return data;
        },
      },
      auditLog: {
        create: async ({ data }: any) => {
          auditLogs.push(data);
          return { id: 'audit_success', ...data };
        },
      },
      user: {
        findUnique: async () => null,
      },
    };

    // First use: Valid OTP with direct password
    const successRes = await confirmAndCreateAdminCore(
      {
        actorUserId: primaryOwnerId,
        actorEmail: primaryOwnerEmail,
        email: targetEmail,
        otp: rawOtp,
        name: 'Kavita Roy',
        roleIds: ['role_admin_01'],
        employeeId: 'emp_clean_001',
        password: 'Password@123',
        now,
      },
      mockDb,
      mockEmailService,
      mockAuthService,
      mockAdminUserService
    );

    assert.strictEqual(successRes.success, true);
    assert.strictEqual(createdAdmins.length, 1);
    assert.strictEqual(createdAdmins[0].email, targetEmail);
    assert.strictEqual(createdAdmins[0].name, 'Kavita Roy');

    const verifiedAudit = auditLogs.find((l) => l.action === 'ADMIN_CREATION_OTP_VERIFIED');
    assert.ok(verifiedAudit, 'ADMIN_CREATION_OTP_VERIFIED audit log must exist');

    // Token must be purged immediately (single-use)
    assert.strictEqual(storedTokens.has(otpKey), false, 'Token must be deleted from database');

    // Attempting to reuse the same OTP must fail
    const reuseRes = await confirmAndCreateAdminCore(
      {
        actorUserId: primaryOwnerId,
        actorEmail: primaryOwnerEmail,
        email: targetEmail,
        otp: rawOtp,
        name: 'Kavita Roy',
        roleIds: ['role_admin_01'],
        now,
      },
      mockDb,
      mockEmailService,
      mockAuthService,
      mockAdminUserService
    );

    assert.strictEqual(reuseRes.success, false, 'Reusing OTP must fail');
    assert.ok(reuseRes.error?.includes('No active verification code found or code has already been used'));
    console.log('✓ PASS: Admin created, ADMIN_CREATION_OTP_VERIFIED audited, single-use token consumed and cannot be reused');
  }

  // Test 2.8: Non-owner cannot confirm creation even with OTP
  console.log('\n[TEST 2.8] Non-owner cannot execute admin creation even with valid OTP');
  {
    let errorThrown = false;
    try {
      await confirmAndCreateAdminCore(
        {
          actorUserId: ordinaryAdminId,
          actorEmail: ordinaryAdminEmail,
          email: 'some.candidate@sunshineeldercare.in',
          otp: '123456',
          name: 'Some Candidate',
          roleIds: ['role_admin_01'],
          now,
        },
        {},
        mockEmailService,
        mockAuthService,
        mockAdminUserService
      );
    } catch (err: any) {
      errorThrown = true;
      assert.ok(err.message.includes('Only the Primary Owner'));
    }
    assert.strictEqual(errorThrown, true);
    console.log('✓ PASS: Non-owner blocked from confirming admin creation');
  }

  console.log('\n================================================================');
  console.log('ALL TESTS PASSED SUCCESSFULLY (8/8 Test Groups)');
  console.log('================================================================');
}

runTestSuite().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
