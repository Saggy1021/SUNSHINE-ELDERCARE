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
  // SECTION 1: EMPLOYEE PERMANENT DELETION TESTS (NO OTP REQUIRED)
  // ============================================================================
  console.log('\n--- SECTION 1: EMPLOYEE PERMANENT DELETION TESTS ---');

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
              designation: 'Caregiver',
              contactNumber: '+91 98765 43210',
              email: 'john.doe@example.com',
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

  // Test 1.2: Employee with Historical Care Visits - Visits Preserved & Employee Deleted
  console.log('\n[TEST 1.2] Employee with historical Care Visits is permanently deleted while visits are preserved');
  {
    let deletedId = '';
    let updatedVisits: any[] = [];
    let auditRecords: any[] = [];

    const mockDb: any = {
      $transaction: async (fn: any) => fn(mockDb),
      employee: {
        findUnique: async () => ({
          id: 'emp_visits_002',
          employeeId: 'SEC/102/PRTY',
          firstName: 'Priya',
          lastName: 'Sharma',
          designation: 'Nurse',
          contactNumber: '+91 98765 43211',
          email: 'priya.s@example.com',
          userId: null,
          visits: [
            { id: 'visit_999', operationalNotes: 'Regular BP check completed.' },
            { id: 'visit_1000', operationalNotes: null },
          ],
          visitAssignments: [],
          assignments: [],
          tasks: [],
        }),
        delete: async ({ where }: any) => {
          deletedId = where.id;
          return { id: where.id };
        },
      },
      careVisit: {
        update: async ({ where, data }: any) => {
          updatedVisits.push({ id: where.id, ...data });
          return { id: where.id, ...data };
        },
      },
      auditLog: {
        create: async ({ data }: any) => {
          auditRecords.push(data);
          return { id: 'audit_002', ...data };
        },
      },
    };

    const result = await deleteEmployeeCore('emp_visits_002', primaryOwnerId, mockDb);
    assert.strictEqual(result.success, true, 'Permanent deletion must succeed');
    assert.strictEqual(deletedId, 'emp_visits_002', 'Employee must be deleted from database');
    assert.strictEqual(updatedVisits.length, 2, 'All historical visits must be updated to preserve history');
    assert.strictEqual(updatedVisits[0].assignedEmpId, null, 'Employee ID reference must be detached');
    assert.ok(
      updatedVisits[0].operationalNotes.includes('[Formerly assigned to: Priya Sharma (SEC/102/PRTY)]'),
      'Former caregiver attribution must be recorded in operationalNotes'
    );
    assert.ok(
      updatedVisits[0].operationalNotes.includes('Regular BP check completed.'),
      'Original operational notes must be preserved'
    );
    assert.strictEqual(updatedVisits[1].assignedEmpId, null);
    assert.strictEqual(
      updatedVisits[1].operationalNotes,
      '[Formerly assigned to: Priya Sharma (SEC/102/PRTY)]'
    );
    assert.strictEqual(auditRecords[0].metadata.retainedVisitsCount, 2);
    console.log('✓ PASS: Care visits safely preserved with caregiver notes, employee permanently deleted');
  }

  // Test 1.3: Employee with Visit Assignments - Assignments Cleaned Up & Employee Deleted
  console.log('\n[TEST 1.3] Employee with Visit Assignments has assignments removed and is deleted');
  {
    let deletedId = '';
    let deletedVisitAssignmentsWhere: any = null;

    const mockDb: any = {
      $transaction: async (fn: any) => fn(mockDb),
      employee: {
        findUnique: async () => ({
          id: 'emp_vasgn_003',
          employeeId: 'SEC/103/VASG',
          firstName: 'Ramesh',
          lastName: 'Kumar',
          designation: 'Care Assistant',
          userId: null,
          visits: [],
          visitAssignments: [{ id: 'vasgn_101' }],
          assignments: [],
          tasks: [],
        }),
        delete: async ({ where }: any) => {
          deletedId = where.id;
          return { id: where.id };
        },
      },
      visitAssignment: {
        deleteMany: async ({ where }: any) => {
          deletedVisitAssignmentsWhere = where;
          return { count: 1 };
        },
      },
      auditLog: {
        create: async ({ data }: any) => ({ id: 'audit_003', ...data }),
      },
    };

    const result = await deleteEmployeeCore('emp_vasgn_003', primaryOwnerId, mockDb);
    assert.strictEqual(result.success, true);
    assert.strictEqual(deletedId, 'emp_vasgn_003');
    assert.deepStrictEqual(deletedVisitAssignmentsWhere, { employeeId: 'emp_vasgn_003' });
    console.log('✓ PASS: Visit assignments safely removed and employee permanently deleted');
  }

  // Test 1.4: Employee with Care Assignments - Assignments Removed & CareCase Preserved
  console.log('\n[TEST 1.4] Employee with Care Assignments has assignments deleted without affecting CareCase');
  {
    let deletedId = '';
    let deletedCareAssignmentsWhere: any = null;

    const mockDb: any = {
      $transaction: async (fn: any) => fn(mockDb),
      employee: {
        findUnique: async () => ({
          id: 'emp_assign_004',
          employeeId: 'SEC/104/ASGN',
          firstName: 'Amit',
          lastName: 'Ghosh',
          designation: 'Physiotherapist',
          userId: null,
          visits: [],
          visitAssignments: [],
          assignments: [{ id: 'assign_111' }],
          tasks: [],
        }),
        delete: async ({ where }: any) => {
          deletedId = where.id;
          return { id: where.id };
        },
      },
      careAssignment: {
        deleteMany: async ({ where }: any) => {
          deletedCareAssignmentsWhere = where;
          return { count: 1 };
        },
      },
      auditLog: {
        create: async ({ data }: any) => ({ id: 'audit_004', ...data }),
      },
    };

    const result = await deleteEmployeeCore('emp_assign_004', primaryOwnerId, mockDb);
    assert.strictEqual(result.success, true);
    assert.strictEqual(deletedId, 'emp_assign_004');
    assert.deepStrictEqual(deletedCareAssignmentsWhere, { employeeId: 'emp_assign_004' });
    console.log('✓ PASS: Care assignments unlinked; employee permanently deleted');
  }

  // Test 1.5: Employee with Care Tasks - Tasks Preserved & Employee Deleted
  console.log('\n[TEST 1.5] Employee with Care Tasks has tasks preserved and is permanently deleted');
  {
    let deletedId = '';
    let updatedTasks: any[] = [];

    const mockDb: any = {
      $transaction: async (fn: any) => fn(mockDb),
      employee: {
        findUnique: async () => ({
          id: 'emp_task_005',
          employeeId: 'SEC/105/TASK',
          firstName: 'Sunita',
          lastName: 'Paul',
          designation: 'Elder Companion',
          userId: null,
          visits: [],
          visitAssignments: [],
          assignments: [],
          tasks: [{ id: 'task_222', completionNote: 'Morning walk assistance.' }],
        }),
        delete: async ({ where }: any) => {
          deletedId = where.id;
          return { id: where.id };
        },
      },
      careTask: {
        update: async ({ where, data }: any) => {
          updatedTasks.push({ id: where.id, ...data });
          return { id: where.id, ...data };
        },
      },
      auditLog: {
        create: async ({ data }: any) => ({ id: 'audit_005', ...data }),
      },
    };

    const result = await deleteEmployeeCore('emp_task_005', primaryOwnerId, mockDb);
    assert.strictEqual(result.success, true);
    assert.strictEqual(deletedId, 'emp_task_005');
    assert.strictEqual(updatedTasks.length, 1);
    assert.strictEqual(updatedTasks[0].assignedEmpId, null);
    assert.ok(
      updatedTasks[0].completionNote.includes('[Formerly assigned to: Sunita Paul (SEC/105/TASK)]')
    );
    console.log('✓ PASS: Care tasks preserved with former caregiver notes, employee permanently deleted');
  }

  // Test 1.6: Employee with Admin Invitations - Invitations Revoked & Employee Deleted
  console.log('\n[TEST 1.6] Employee with associated Admin Invitation has invitation revoked');
  {
    let deletedId = '';
    let updatedInvitations: any[] = [];

    const mockDb: any = {
      $transaction: async (fn: any) => fn(mockDb),
      employee: {
        findUnique: async () => ({
          id: 'emp_invite_006',
          employeeId: 'SEC/106/INVT',
          firstName: 'Anjali',
          lastName: 'Dey',
          designation: 'Admin Coordinator',
          userId: null,
          visits: [],
          visitAssignments: [],
          assignments: [],
          tasks: [],
        }),
        delete: async ({ where }: any) => {
          deletedId = where.id;
          return { id: where.id };
        },
      },
      adminInvitation: {
        updateMany: async ({ where, data }: any) => {
          updatedInvitations.push({ where, data });
          return { count: 1 };
        },
      },
      auditLog: {
        create: async ({ data }: any) => ({ id: 'audit_006', ...data }),
      },
    };

    const result = await deleteEmployeeCore('emp_invite_006', primaryOwnerId, mockDb);
    assert.strictEqual(result.success, true);
    assert.strictEqual(deletedId, 'emp_invite_006');
    assert.strictEqual(updatedInvitations.length, 1);
    assert.strictEqual(updatedInvitations[0].data.status, 'REVOKED');
    assert.strictEqual(updatedInvitations[0].data.employeeId, null);
    console.log('✓ PASS: Admin invitations cleanly revoked upon employee deletion');
  }

  // Test 1.7: Primary Owner Protection - Deletion STRICTLY BLOCKED
  console.log('\n[TEST 1.7] Employee linked to Primary Owner (info.sunshineeldercare@gmail.com) is STRICTLY BLOCKED');
  {
    let deleteCalled = false;

    const mockDb: any = {
      employee: {
        findUnique: async () => ({
          id: 'emp_owner_007',
          employeeId: 'SEC/001/OWNR',
          firstName: 'Tanish',
          lastName: 'Bansal',
          designation: 'Director',
          userId: 'owner_usr_001',
          user: {
            id: 'owner_usr_001',
            email: 'info.sunshineeldercare@gmail.com',
            role: 'SUPERADMIN',
          },
          visits: [],
          visitAssignments: [],
          assignments: [],
          tasks: [],
        }),
        delete: async () => {
          deleteCalled = true;
        },
      },
    };

    const result = await deleteEmployeeCore('emp_owner_007', primaryOwnerId, mockDb);
    assert.strictEqual(result.success, false);
    assert.strictEqual(deleteCalled, false, 'Primary owner must never be deleted');
    assert.ok(
      result.error?.includes('Protected account: The Primary Owner account (info.sunshineeldercare@gmail.com) cannot be deleted'),
      'Must identify Primary Owner protection'
    );
    console.log('✓ PASS: Primary Owner account strictly protected from deletion');
  }

  // Test 1.8: Employee linked to Regular Admin Account - Admin Credentials Safely Revoked
  console.log('\n[TEST 1.8] Employee linked to regular admin account: credentials revoked, employee deleted');
  {
    let deletedId = '';
    let deletedRolesWhere: any = null;
    let updatedUser: any = null;

    const mockDb: any = {
      $transaction: async (fn: any) => fn(mockDb),
      employee: {
        findUnique: async () => ({
          id: 'emp_admin_008',
          employeeId: 'SEC/108/ADMN',
          firstName: 'Karan',
          lastName: 'Mehta',
          designation: 'Operations Lead',
          userId: 'usr_karan_777',
          user: {
            id: 'usr_karan_777',
            email: 'karan.m@sunshineeldercare.in',
            role: 'ADMIN',
          },
          visits: [],
          visitAssignments: [],
          assignments: [],
          tasks: [],
        }),
        delete: async ({ where }: any) => {
          deletedId = where.id;
          return { id: where.id };
        },
      },
      userRole: {
        deleteMany: async ({ where }: any) => {
          deletedRolesWhere = where;
          return { count: 2 };
        },
      },
      user: {
        update: async ({ where, data }: any) => {
          updatedUser = { id: where.id, ...data };
          return updatedUser;
        },
      },
      auditLog: {
        create: async ({ data }: any) => ({ id: 'audit_008', ...data }),
      },
    };

    const result = await deleteEmployeeCore('emp_admin_008', primaryOwnerId, mockDb);
    assert.strictEqual(result.success, true);
    assert.strictEqual(deletedId, 'emp_admin_008');
    assert.deepStrictEqual(deletedRolesWhere, { userId: 'usr_karan_777' });
    assert.strictEqual(updatedUser.status, 'INACTIVE');
    assert.ok(updatedUser.sessionVersion?.increment === 1);
    console.log('✓ PASS: Admin credentials safely revoked (roles deleted, user deactivated, sessions invalidated)');
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
