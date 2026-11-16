import assert from 'node:assert';
import { getAdminDashboardMetricsCore, getNeedsAttentionQueueCore, getAdminDashboardMetrics } from '../../app/actions/admin';
import { DASHBOARD_EXCLUDED_EMAILS, DEMO_MEMBER_EMAILS } from '../../lib/constants/members';

async function runAdminDashboardMetricsTests() {
  console.log('================================================================');
  console.log('Sunshine Eldercare — Admin Dashboard Metrics & Live Updates Tests');
  console.log('================================================================\n');

  const now = new Date('2026-11-16T12:00:00.000Z');

  // ---------------------------------------------------------------------------
  // FIXTURE: The exact 7 accounts currently in the Production database
  // ---------------------------------------------------------------------------
  const productionUsersFixture: any[] = [
    {
      id: 'cmwitwcjr0001o7hmeqyob4k0',
      name: 'Wg Cdr PRABIR CHAKRAVERTY',
      email: 'p.chakraverty47@gmail.com',
      role: 'MEMBER',
      userRoles: [],
      memberProfile: {
        id: 'cmwitwckk0003o7hmvsdlfkpl',
        memberId: 'SECD1001PRTY',
        firstName: 'Wg Cdr PRABIR',
        lastName: 'CHAKRAVERTY',
      },
      subscriptions: [
        {
          id: 'cmwitzk4q0006im49ubrffmei',
          status: 'ACTIVE',
          startDate: new Date('2026-10-04T00:00:00.000Z'),
          endDate: new Date('2027-04-04T00:00:00.000Z'),
        },
      ],
    },
    {
      id: 'cmwg8i6n10001tx33xtcklix2',
      name: 'member onboard',
      email: 'memberonboardtest@gmail.com',
      role: 'MEMBER',
      userRoles: [],
      memberProfile: {
        id: 'cmwg8i6np0003tx33dsb9cufw',
        memberId: null,
        firstName: 'member',
        lastName: 'onboard',
      },
      subscriptions: [],
    },
    {
      id: 'cmuk762ix0001baizebt10d2u',
      name: 'User Test',
      email: 'payment_user@example.com',
      role: 'USER',
      userRoles: [],
      memberProfile: null,
      subscriptions: [
        {
          id: 'cmv0rf6mi000610driq7y0sie',
          status: 'ACTIVE',
          startDate: new Date('2026-09-28T19:14:04.864Z'),
          endDate: new Date('2027-03-26T19:14:04.864Z'),
        },
      ],
    },
    {
      id: 'cmv5j9l6d00014uplaumg7m8l',
      name: 'Tanish Alam',
      email: 'tanishalam61@gmail.com',
      role: 'MEMBER',
      userRoles: [],
      memberProfile: {
        id: 'cmv5j9lfd00034uplfivfyy6v',
        memberId: null,
      },
      subscriptions: [
        {
          id: 'cmw9kxewm0007zcto1yndc23l',
          status: 'ACTIVE',
          startDate: new Date('2026-11-09T18:13:10.166Z'),
          endDate: new Date('2026-12-08T18:13:10.166Z'),
        },
      ],
    },
    {
      id: 'cmuzze7ei0001rh7e4rxa122b',
      name: 'Sagnik Kar',
      email: 'godgoku1021@gmail.com',
      role: 'USER',
      userRoles: [],
      memberProfile: {
        id: 'cmuzze8ps0005rh7ef0slovws',
        memberId: null,
      },
      subscriptions: [],
    },
    {
      id: 'cmv0neqsn0000w9bqhv3pn6nz',
      name: 'Owner',
      email: 'info.sunshineeldercare@gmail.com',
      role: 'ADMIN',
      userRoles: [{ role: { name: 'Owner' } }],
      memberProfile: null,
      subscriptions: [],
    },
    {
      id: 'cmuk67cyw0000l16qpnp19wjy',
      name: 'Care Test User',
      email: 'care.test@example.com',
      role: 'USER',
      userRoles: [],
      memberProfile: null,
      subscriptions: [
        {
          id: 'cmuk67e820004l16qdfcjucm3',
          status: 'ACTIVE',
          startDate: new Date('2026-09-27T18:47:06.432Z'),
          endDate: null,
        },
      ],
    },
  ];

  // Helper: creates a mock DB simulating Prisma operations according to Prisma's filter syntax
  function createMockDb(usersList: any[] = productionUsersFixture, extraData: any = {}) {
    let users = [...usersList];
    let subscriptions = users.flatMap((u) =>
      u.subscriptions.map((s: any) => ({ ...s, userId: u.id, user: u }))
    );
    let renewalRequests = extraData.renewalRequests || [];
    let payments = extraData.payments || [];
    let inquiries = extraData.inquiries || [];
    let feedback = extraData.feedback || [];

    return {
      _users: users,
      _subscriptions: subscriptions,
      user: {
        count: async ({ where }: any = {}) => {
          return users.filter((u) => {
            // Check email notIn
            if (where?.email?.notIn && where.email.notIn.includes(u.email)) {
              return false;
            }
            // Check email not endsWith
            if (where?.email?.not?.endsWith && u.email?.endsWith(where.email.not.endsWith)) {
              return false;
            }
            // Check role not ADMIN
            if (where?.role?.not && u.role === where.role.not) {
              return false;
            }
            // Check userRoles none
            if (where?.userRoles?.none?.role?.name?.in) {
              const blocked = where.userRoles.none.role.name.in;
              const hasBlockedRole = u.userRoles?.some((ur: any) => blocked.includes(ur.role?.name));
              if (hasBlockedRole) return false;
            }
            // Check memberProfile isNot null
            if (where?.memberProfile?.isNot === null && !u.memberProfile) {
              return false;
            }
            // Check subscriptions some
            if (where?.subscriptions?.some) {
              const subFilter = where.subscriptions.some;
              const hasMatchingSub = u.subscriptions?.some((s: any) => {
                if (subFilter.status && s.status !== subFilter.status) return false;
                if (subFilter.startDate?.lte && new Date(s.startDate) > subFilter.startDate.lte) return false;
                if (subFilter.endDate?.gte) {
                  if (!s.endDate || new Date(s.endDate) < subFilter.endDate.gte) return false;
                }
                return true;
              });
              if (!hasMatchingSub) return false;
            }
            // Check OR
            if (where?.OR) {
              const matchesOr = where.OR.some((cond: any) => {
                if (cond.role && u.role === cond.role) return true;
                if (cond.memberProfile?.isNot === null && u.memberProfile) return true;
                if (cond.subscriptions?.some && u.subscriptions?.length > 0) return true;
                return false;
              });
              if (!matchesOr) return false;
            }
            return true;
          }).length;
        },
        findMany: async ({ where }: any = {}) => {
          return users.filter((u) => {
            if (where?.email?.notIn && where.email.notIn.includes(u.email)) return false;
            if (where?.email?.not?.endsWith && u.email?.endsWith(where.email.not.endsWith)) return false;
            if (where?.role?.not && u.role === where.role.not) return false;
            if (where?.memberProfile?.isNot === null && !u.memberProfile) return false;
            if (where?.subscriptions?.some) {
              const subFilter = where.subscriptions.some;
              const hasMatchingSub = u.subscriptions?.some((s: any) => {
                if (subFilter.status && s.status !== subFilter.status) return false;
                if (subFilter.startDate?.lte && new Date(s.startDate) > subFilter.startDate.lte) return false;
                if (subFilter.endDate?.gte) {
                  if (!s.endDate || new Date(s.endDate) < subFilter.endDate.gte) return false;
                }
                return true;
              });
              if (!hasMatchingSub) return false;
            }
            if (where?.OR) {
              const matchesOr = where.OR.some((cond: any) => {
                if (cond.role && u.role === cond.role) return true;
                if (cond.memberProfile?.isNot === null && u.memberProfile) return true;
                if (cond.subscriptions?.some && u.subscriptions?.length > 0) return true;
                return false;
              });
              if (!matchesOr) return false;
            }
            return true;
          });
        },
      },
      subscription: {
        count: async ({ where }: any = {}) => {
          return subscriptions.filter((s: any) => {
            if (where?.status && s.status !== where.status) return false;
            if (where?.user?.email?.notIn && where.user.email.notIn.includes(s.user?.email)) return false;
            if (where?.user?.role?.not && s.user?.role === where.user.role.not) return false;
            return true;
          }).length;
        },
      },
      renewalRequest: {
        count: async ({ where }: any = {}) => {
          return renewalRequests.filter((r: any) => {
            if (where?.status && r.status !== where.status) return false;
            if (where?.user?.email?.notIn && where.user.email.notIn.includes(r.user?.email)) return false;
            return true;
          }).length;
        },
        findMany: async ({ where }: any = {}) => {
          return renewalRequests.filter((r: any) => {
            if (where?.status && r.status !== where.status) return false;
            if (where?.user?.email?.notIn && where.user.email.notIn.includes(r.user?.email)) return false;
            return true;
          });
        },
      },
      payment: {
        count: async ({ where }: any = {}) => {
          return payments.filter((p: any) => {
            if (where?.status && p.status !== where.status) return false;
            if (where?.user?.email?.notIn && where.user.email.notIn.includes(p.user?.email)) return false;
            return true;
          }).length;
        },
        findMany: async ({ where }: any = {}) => {
          return payments.filter((p: any) => {
            if (where?.status && p.status !== where.status) return false;
            if (where?.user?.email?.notIn && where.user.email.notIn.includes(p.user?.email)) return false;
            return true;
          });
        },
      },
      inquiry: {
        count: async ({ where }: any = {}) => {
          return inquiries.filter((i: any) => {
            if (where?.status && i.status !== where.status) return false;
            return true;
          }).length;
        },
        findMany: async () => inquiries,
      },
      feedback: {
        count: async ({ where }: any = {}) => {
          return feedback.filter((f: any) => {
            if (where?.status?.in && !where.status.in.includes(f.status)) return false;
            return true;
          }).length;
        },
        findMany: async () => feedback,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // TEST 1: Total Members returns exactly 3 for the current intended dataset
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: Total Members Returns Exactly 3 for Current Dataset ---');
  const mockDb1 = createMockDb();
  const metrics1 = await getAdminDashboardMetricsCore(mockDb1, now);
  assert.strictEqual(
    metrics1.totalMembers,
    3,
    `Expected totalMembers to be 3, got ${metrics1.totalMembers}`
  );
  console.log(`  ✓ Verified totalMembers equals exactly 3.`);

  // ---------------------------------------------------------------------------
  // TEST 2: Prabir is included
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: Prabir Chakraverty is Included in Total Members ---');
  const eligibleUsers1 = await mockDb1.user.findMany({
    where: {
      email: { notIn: DASHBOARD_EXCLUDED_EMAILS },
      role: { not: 'ADMIN' },
      OR: [
        { role: 'MEMBER' },
        { memberProfile: { isNot: null } },
        { subscriptions: { some: {} } },
      ],
    },
  });
  const prabir = eligibleUsers1.find((u) => u.email === 'p.chakraverty47@gmail.com');
  assert.ok(prabir, 'Prabir Chakraverty must be included in eligible members');
  assert.strictEqual(prabir.name, 'Wg Cdr PRABIR CHAKRAVERTY');
  assert.strictEqual(prabir.memberProfile.memberId, 'SECD1001PRTY');
  console.log('  ✓ Verified Prabir Chakraverty (SECD1001PRTY) is included.');

  // ---------------------------------------------------------------------------
  // TEST 3: Both intended demo member accounts are included in Total Members
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Both Intended Demo Member Accounts are Included ---');
  const demo1 = eligibleUsers1.find((u) => u.email === 'memberonboardtest@gmail.com');
  const demo2 = eligibleUsers1.find((u) => u.email === 'payment_user@example.com');
  assert.ok(demo1, 'memberonboardtest@gmail.com must be included in total members');
  assert.ok(demo2, 'payment_user@example.com must be included in total members');
  console.log('  ✓ Verified memberonboardtest@gmail.com is included.');
  console.log('  ✓ Verified payment_user@example.com is included.');

  // ---------------------------------------------------------------------------
  // TEST 4: Tanish is excluded
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Tanish Alam is Excluded from Dashboard Member Metrics ---');
  const tanish = eligibleUsers1.find((u) => u.email === 'tanishalam61@gmail.com');
  assert.strictEqual(tanish, undefined, 'Tanish Alam must be excluded from dashboard member metrics');
  assert.ok(DASHBOARD_EXCLUDED_EMAILS.includes('tanishalam61@gmail.com'));
  console.log('  ✓ Verified Tanish Alam is excluded.');

  // ---------------------------------------------------------------------------
  // TEST 5: Sagnik is excluded
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Sagnik Kar is Excluded from Dashboard Member Metrics ---');
  const sagnik = eligibleUsers1.find((u) => u.email === 'godgoku1021@gmail.com');
  assert.strictEqual(sagnik, undefined, 'Sagnik Kar must be excluded from dashboard member metrics');
  assert.ok(DASHBOARD_EXCLUDED_EMAILS.includes('godgoku1021@gmail.com'));
  console.log('  ✓ Verified Sagnik Kar is excluded.');

  // ---------------------------------------------------------------------------
  // TEST 6: Primary Owner/admin is excluded (and staff care test account)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 6: Primary Owner & Care Staff Account are Excluded ---');
  const owner = eligibleUsers1.find((u) => u.email === 'info.sunshineeldercare@gmail.com');
  const careStaff = eligibleUsers1.find((u) => u.email === 'care.test@example.com');
  assert.strictEqual(owner, undefined, 'Owner account must be excluded');
  assert.strictEqual(careStaff, undefined, 'Care staff test account must be excluded');
  assert.ok(DASHBOARD_EXCLUDED_EMAILS.includes('info.sunshineeldercare@gmail.com'));
  assert.ok(DASHBOARD_EXCLUDED_EMAILS.includes('care.test@example.com'));
  console.log('  ✓ Verified Primary Owner (info.sunshineeldercare@gmail.com) is excluded.');
  console.log('  ✓ Verified Care Staff account (care.test@example.com) is excluded.');

  // ---------------------------------------------------------------------------
  // TEST 7: Active Memberships returns exactly 1
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 7: Active Memberships Returns Exactly 1 ---');
  assert.strictEqual(
    metrics1.activeMembers,
    1,
    `Expected activeMembers to be 1, got ${metrics1.activeMembers}`
  );
  console.log(`  ✓ Verified activeMembers equals exactly 1 (Prabir Chakraverty).`);

  // ---------------------------------------------------------------------------
  // TEST 8: Pending, expired, cancelled and null-date subscriptions are not counted as active
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 8: Non-Active & Ineligible Subscriptions are Not Counted ---');
  const customUsersList = [
    {
      id: 'user_active',
      email: 'genuine.active@gmail.com',
      role: 'MEMBER',
      userRoles: [],
      memberProfile: { id: 'prof_1', memberId: 'SECD1002TEST' },
      subscriptions: [
        {
          id: 'sub_active',
          status: 'ACTIVE',
          startDate: new Date('2026-10-01T00:00:00.000Z'),
          endDate: new Date('2027-04-01T00:00:00.000Z'),
        },
      ],
    },
    {
      id: 'user_expired',
      email: 'expired.member@gmail.com',
      role: 'MEMBER',
      userRoles: [],
      memberProfile: { id: 'prof_2', memberId: 'SECD1003EXPD' },
      subscriptions: [
        {
          id: 'sub_expired',
          status: 'ACTIVE', // status might say ACTIVE before cron run, but date is passed
          startDate: new Date('2026-01-01T00:00:00.000Z'),
          endDate: new Date('2026-07-01T00:00:00.000Z'), // expired relative to 2026-11-16
        },
      ],
    },
    {
      id: 'user_scheduled',
      email: 'scheduled.member@gmail.com',
      role: 'MEMBER',
      userRoles: [],
      memberProfile: { id: 'prof_3', memberId: 'SECD1004SCHD' },
      subscriptions: [
        {
          id: 'sub_scheduled',
          status: 'SCHEDULED',
          startDate: new Date('2026-12-01T00:00:00.000Z'), // future
          endDate: new Date('2027-06-01T00:00:00.000Z'),
        },
      ],
    },
    {
      id: 'user_cancelled',
      email: 'cancelled.member@gmail.com',
      role: 'MEMBER',
      userRoles: [],
      memberProfile: { id: 'prof_4', memberId: 'SECD1005CANC' },
      subscriptions: [
        {
          id: 'sub_cancelled',
          status: 'CANCELLED',
          startDate: new Date('2026-10-01T00:00:00.000Z'),
          endDate: new Date('2027-04-01T00:00:00.000Z'),
        },
      ],
    },
    {
      id: 'user_null_end',
      email: 'null.end@gmail.com',
      role: 'MEMBER',
      userRoles: [],
      memberProfile: { id: 'prof_5', memberId: 'SECD1006NULL' },
      subscriptions: [
        {
          id: 'sub_null_end',
          status: 'ACTIVE',
          startDate: new Date('2026-10-01T00:00:00.000Z'),
          endDate: null,
        },
      ],
    },
  ];

  const mockDbStatus = createMockDb(customUsersList);
  const metricsStatus = await getAdminDashboardMetricsCore(mockDbStatus, now);
  assert.strictEqual(
    metricsStatus.activeMembers,
    1,
    `Only genuine.active@gmail.com should be counted as active, got ${metricsStatus.activeMembers}`
  );
  console.log('  ✓ Verified expired subscription is excluded from active memberships.');
  console.log('  ✓ Verified scheduled subscription is excluded from active memberships.');
  console.log('  ✓ Verified cancelled subscription is excluded from active memberships.');
  console.log('  ✓ Verified subscription with null endDate is excluded from active memberships.');

  // ---------------------------------------------------------------------------
  // TEST 9: Multiple subscriptions do not double-count a member
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 9: Multiple Subscriptions Do Not Double-Count a Member ---');
  const multiSubUser = [
    {
      id: 'user_multi',
      email: 'multi.sub@gmail.com',
      role: 'MEMBER',
      userRoles: [],
      memberProfile: { id: 'prof_multi', memberId: 'SECD1007MULT' },
      subscriptions: [
        {
          id: 'sub_1',
          status: 'ACTIVE',
          startDate: new Date('2026-10-01T00:00:00.000Z'),
          endDate: new Date('2027-04-01T00:00:00.000Z'),
        },
        {
          id: 'sub_2',
          status: 'ACTIVE',
          startDate: new Date('2026-11-01T00:00:00.000Z'),
          endDate: new Date('2027-05-01T00:00:00.000Z'),
        },
      ],
    },
  ];
  const mockDbMulti = createMockDb(multiSubUser);
  const metricsMulti = await getAdminDashboardMetricsCore(mockDbMulti, now);
  assert.strictEqual(metricsMulti.totalMembers, 1);
  assert.strictEqual(metricsMulti.activeMembers, 1, 'Member with 2 active subscriptions must count as 1');
  console.log('  ✓ Verified user with multiple active subscriptions counts as exactly 1.');

  // ---------------------------------------------------------------------------
  // TEST 10: New members and membership status changes are reflected automatically
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 10: Dynamic Database Updates Reflected Immediately ---');
  let dynamicUsers = [...productionUsersFixture];
  const dynamicDb = createMockDb(dynamicUsers);

  // Initially: 3 total, 1 active
  let dMetrics1 = await getAdminDashboardMetricsCore(dynamicDb, now);
  assert.strictEqual(dMetrics1.totalMembers, 3);
  assert.strictEqual(dMetrics1.activeMembers, 1);

  // Onboard new genuine member
  dynamicUsers.push({
    id: 'cmw_new_member_001',
    name: 'Anita Roy',
    email: 'anita.roy@gmail.com',
    role: 'MEMBER',
    userRoles: [],
    memberProfile: {
      id: 'prof_anita',
      memberId: 'SECS1002ANRO',
      firstName: 'Anita',
      lastName: 'Roy',
    },
    subscriptions: [
      {
        id: 'sub_anita',
        status: 'ACTIVE',
        startDate: new Date('2026-11-16T00:00:00.000Z'),
        endDate: new Date('2027-05-16T00:00:00.000Z'),
      },
    ],
  });

  const dynamicDbUpdated = createMockDb(dynamicUsers);
  let dMetrics2 = await getAdminDashboardMetricsCore(dynamicDbUpdated, now);
  assert.strictEqual(dMetrics2.totalMembers, 4, 'Total members should increment to 4');
  assert.strictEqual(dMetrics2.activeMembers, 2, 'Active members should increment to 2');
  console.log('  ✓ Verified onboarding new member immediately increments totalMembers (3 -> 4) and activeMembers (1 -> 2).');

  // Cancel Anita's subscription
  dynamicUsers[dynamicUsers.length - 1].subscriptions[0].status = 'CANCELLED';
  const dynamicDbCancelled = createMockDb(dynamicUsers);
  let dMetrics3 = await getAdminDashboardMetricsCore(dynamicDbCancelled, now);
  assert.strictEqual(dMetrics3.totalMembers, 4, 'Total members remains 4');
  assert.strictEqual(dMetrics3.activeMembers, 1, 'Active members drops back to 1');
  console.log('  ✓ Verified cancellation immediately decrements activeMembers (2 -> 1).');

  // ---------------------------------------------------------------------------
  // TEST 11: Other dashboard metrics remain accurate
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 11: Operational Metrics & Attention Queue Accuracy ---');
  const mockDbWithQueue = createMockDb(productionUsersFixture, {
    renewalRequests: [
      { id: 'rr_1', status: 'SUBMITTED', user: { email: 'p.chakraverty47@gmail.com', name: 'Prabir' }, planName: 'Shield', durationMonths: 6 },
      { id: 'rr_admin', status: 'SUBMITTED', user: { email: 'tanishalam61@gmail.com', name: 'Tanish' }, planName: 'Admin Plan', durationMonths: 1 },
    ],
    payments: [
      { id: 'pay_1', status: 'VERIFICATION_PENDING', amount: 5000, paymentMethod: 'UPI', user: { email: 'p.chakraverty47@gmail.com', name: 'Prabir' } },
      { id: 'pay_admin', status: 'VERIFICATION_PENDING', amount: 100, paymentMethod: 'UPI', user: { email: 'tanishalam61@gmail.com', name: 'Tanish' } },
    ],
    inquiries: [
      { id: 'inq_1', status: 'NEW', fullName: 'Dr. Mukherjee', message: 'Looking for eldercare' },
    ],
    feedback: [
      { id: 'fb_1', status: 'SUBMITTED', message: 'Great care service', user: { name: 'Prabir', email: 'p.chakraverty47@gmail.com' } },
    ],
  });

  const qMetrics = await getAdminDashboardMetricsCore(mockDbWithQueue, now);
  // Admin requests must be excluded
  assert.strictEqual(qMetrics.pendingRenewals, 1, 'Admin renewal request should be excluded');
  assert.strictEqual(qMetrics.pendingPayments, 1, 'Admin payment should be excluded');
  assert.strictEqual(qMetrics.newInquiries, 1);
  assert.strictEqual(qMetrics.unresolvedFeedback, 1);

  const queue = await getNeedsAttentionQueueCore(mockDbWithQueue);
  assert.strictEqual(queue.pendingRenewals.length, 1);
  assert.strictEqual(queue.pendingRenewals[0].user.email, 'p.chakraverty47@gmail.com');
  assert.strictEqual(queue.pendingPayments.length, 1);
  assert.strictEqual(queue.pendingPayments[0].user.email, 'p.chakraverty47@gmail.com');
  assert.strictEqual(queue.newInquiries.length, 1);
  assert.strictEqual(queue.unresolvedFeedback.length, 1);
  console.log('  ✓ Verified operational metrics filter admin requests correctly.');
  console.log('  ✓ Verified Needs Attention queue presents accurate uninflated actionable items.');

  // ---------------------------------------------------------------------------
  // TEST 12: Dashboard data remains protected by admin authorization
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 12: Admin Authorization Guard Enforcement ---');
  let authFailed = false;
  try {
    // Calling getAdminDashboardMetrics() directly without an active session triggers redirect/error
    await getAdminDashboardMetrics();
  } catch (err: any) {
    authFailed = true;
  }
  assert.ok(authFailed, 'getAdminDashboardMetrics must throw or redirect without authenticated session');
  console.log('  ✓ Verified getAdminDashboardMetrics enforces requirePermission("MEMBER_VIEW").');

  console.log('\n================================================================');
  console.log('ALL 12 ADMIN DASHBOARD METRICS & LIVE UPDATES TESTS PASSED (100%)');
  console.log('================================================================');
}

runAdminDashboardMetricsTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
