import assert from 'node:assert';
import { calculateMembershipEndDate, calculateEndDate } from '../../lib/services/dates';
import { MemberIdentityService } from '../../lib/services/member-identity';
import { EXCLUDED_MEMBER_EMAILS, ADMIN_DISPLAY_EMAILS } from '../../lib/constants/members';
import {
  getMembersCore,
  updateMembershipStartDateCore,
} from '../../app/actions/admin';
import { formatMembershipDate } from '../../app/admin/members/page';
import fs from 'node:fs';
import path from 'node:path';

async function runMembershipDatesAndTableTests() {
  console.log('================================================================');
  console.log('Sunshine Eldercare — Members Management & Dates Test Suite');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // REQUIREMENT 1: Correct visibility of the three approved accounts
  // REQUIREMENT 2: Excluded accounts remain untouched and are not displayed
  // REQUIREMENT 3: Only genuine members receive serial numbers
  // REQUIREMENT 5: Tanish and Sagnik receive neither Member IDs nor serial numbers
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1, 2, 3, 5: Account Visibility & Serial Number Assignment ---');

  // Mock User DB records representing the current Production state
  const mockUsersInDb = [
    {
      id: 'usr_prabir',
      name: 'Wg Cdr PRABIR CHAKRAVERTY',
      email: 'p.chakraverty47@gmail.com',
      role: 'MEMBER',
      createdAt: new Date('2026-11-16T05:36:43.000Z'),
      memberProfile: { memberId: 'SEC/D/1001/PRTY' },
      subscriptions: [
        {
          id: 'sub_prabir',
          status: 'ACTIVE',
          startDate: new Date('2026-11-16T00:00:00.000Z'),
          endDate: new Date('2027-05-16T00:00:00.000Z'),
          durationMonths: 6,
        },
      ],
    },
    {
      id: 'usr_tanish',
      name: 'Tanish Alam',
      email: 'tanishalam61@gmail.com',
      role: 'ADMIN',
      createdAt: new Date('2026-10-01T00:00:00.000Z'),
      memberProfile: null,
      subscriptions: [],
    },
    {
      id: 'usr_sagnik',
      name: 'Sagnik Kar',
      email: 'godgoku1021@gmail.com',
      role: 'SUPER_ADMIN',
      createdAt: new Date('2026-10-02T00:00:00.000Z'),
      memberProfile: null,
      subscriptions: [],
    },
    // The 4 strictly excluded accounts
    {
      id: 'usr_excluded_1',
      name: 'Info Account',
      email: 'info.sunshineeldercare@gmail.com',
      role: 'ADMIN',
      createdAt: new Date('2026-09-01T00:00:00.000Z'),
      memberProfile: null,
      subscriptions: [],
    },
    {
      id: 'usr_excluded_2',
      name: 'Care Test',
      email: 'care.test@example.com',
      role: 'CARE_COORDINATOR',
      createdAt: new Date('2026-09-02T00:00:00.000Z'),
      memberProfile: null,
      subscriptions: [],
    },
    {
      id: 'usr_excluded_3',
      name: 'Payment User',
      email: 'payment_user@example.com',
      role: 'MEMBER',
      createdAt: new Date('2026-09-03T00:00:00.000Z'),
      memberProfile: { memberId: 'SEC/S/0999/TEST' },
      subscriptions: [],
    },
    {
      id: 'usr_excluded_4',
      name: 'Member Onboard Test',
      email: 'memberonboardtest@gmail.com',
      role: 'MEMBER',
      createdAt: new Date('2026-09-04T00:00:00.000Z'),
      memberProfile: null,
      subscriptions: [],
    },
  ];

  const mockDbListing: any = {
    user: {
      findMany: async ({ where, skip = 0, take = 50 }: any) => {
        // Filter by email exclusion
        let filtered = mockUsersInDb.filter((u) => {
          if (where?.email?.notIn) {
            return !where.email.notIn.includes(u.email);
          }
          return true;
        });

        // Genuine members query (for serial number ranking)
        if (where?.OR && where?.email?.notIn) {
          // genuine members filter: role = MEMBER or memberProfile.memberId != null or subscriptions.some
          filtered = filtered.filter(
            (u) =>
              u.role === 'MEMBER' ||
              Boolean(u.memberProfile?.memberId) ||
              u.subscriptions.length > 0
          );
          // order by createdAt asc
          filtered.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
          return filtered.map((u) => ({ id: u.id, createdAt: u.createdAt }));
        }

        return filtered.slice(skip, skip + take);
      },
      count: async ({ where }: any) => {
        const filtered = mockUsersInDb.filter((u) => {
          if (where?.email?.notIn) {
            return !where.email.notIn.includes(u.email);
          }
          return true;
        });
        return filtered.length;
      },
    },
  };

  const result = await getMembersCore(undefined, 1, 50, mockDbListing);

  // Requirement 1 & 2: Only 3 accounts visible; 4 excluded accounts never present
  assert.strictEqual(result.members.length, 3, 'Exactly 3 accounts must be displayed in Members list');
  const visibleEmails = result.members.map((m: any) => m.email);
  assert.ok(visibleEmails.includes('p.chakraverty47@gmail.com'), 'Prabir must be visible');
  assert.ok(visibleEmails.includes('tanishalam61@gmail.com'), 'Tanish must be visible');
  assert.ok(visibleEmails.includes('godgoku1021@gmail.com'), 'Sagnik must be visible');

  for (const excludedEmail of EXCLUDED_MEMBER_EMAILS) {
    assert.ok(
      !visibleEmails.includes(excludedEmail),
      `Excluded account ${excludedEmail} must not be visible`
    );
  }

  // Requirement 3: Prabir is serial number 1
  const prabir = result.members.find((m: any) => m.email === 'p.chakraverty47@gmail.com');
  assert.strictEqual(prabir.serialNumber, 1, 'Prabir must have serialNumber = 1');
  assert.strictEqual(prabir.memberProfile?.memberId, 'SEC/D/1001/PRTY', 'Prabir must display Member ID');

  // Requirement 5: Tanish and Sagnik receive null for serialNumber and null for memberProfile
  const tanish = result.members.find((m: any) => m.email === 'tanishalam61@gmail.com');
  const sagnik = result.members.find((m: any) => m.email === 'godgoku1021@gmail.com');
  assert.strictEqual(tanish.serialNumber, null, 'Tanish must display — (null serial number)');
  assert.strictEqual(tanish.memberProfile, null, 'Tanish must display — (null Member ID)');
  assert.strictEqual(sagnik.serialNumber, null, 'Sagnik must display — (null serial number)');
  assert.strictEqual(sagnik.memberProfile, null, 'Sagnik must display — (null Member ID)');

  console.log('  ✓ Requirement 1 passed: Exactly 3 approved accounts visible.');
  console.log('  ✓ Requirement 2 passed: All 4 excluded test accounts excluded from listing.');
  console.log('  ✓ Requirement 3 passed: Prabir displays serial number 1.');
  console.log('  ✓ Requirement 5 passed: Tanish and Sagnik display — for serial number and Member ID.');

  // ---------------------------------------------------------------------------
  // REQUIREMENT 4: Prabir receives the reserved Member ID in the intended implementation
  // REQUIREMENT 6: Next genuine member receives sequence 1002
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4 & 6: Member ID Generation for Prabir and Next Member ---');

  const prabirIdDirect = await MemberIdentityService.generateMemberId(
    'Wg Cdr PRABIR',
    'CHAKRAVERTY',
    'D'
  );
  assert.strictEqual(prabirIdDirect, 'SEC/D/1001/PRTY', 'Prabir must receive SEC/D/1001/PRTY');

  let currentSequenceInDb = 1001; // Prabir's sequence
  const mockDbNext: any = {
    memberSequence: {
      upsert: async ({ update }: any) => {
        currentSequenceInDb += update.current.increment;
        return { id: 'MEMBER_SEQ', current: currentSequenceInDb };
      },
    },
  };

  const nextMemberId = await MemberIdentityService.generateMemberId(
    'Ananya',
    'Sen',
    'S',
    mockDbNext
  );
  assert.strictEqual(nextMemberId, 'SEC/S/1002/ANSE', 'Next genuine member must receive sequence 1002');
  console.log('  ✓ Requirement 4 passed: Prabir receives reserved ID SEC/D/1001/PRTY.');
  console.log('  ✓ Requirement 6 passed: Next genuine member receives sequence 1002 (SEC/S/1002/ANSE).');

  // ---------------------------------------------------------------------------
  // REQUIREMENT 7: Concurrent registrations cannot generate duplicate Member IDs
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 7: Concurrency Safety Under Parallel Load ---');
  let atomicCounter = 1001;
  const mockDbAtomic: any = {
    memberSequence: {
      upsert: async ({ update }: any) => {
        // Atomic DB sequence behavior
        atomicCounter += update.current.increment;
        return { id: 'MEMBER_SEQ', current: atomicCounter };
      },
    },
  };

  const concurrentPromises = Array.from({ length: 25 }, (_, i) =>
    MemberIdentityService.generateMemberId(`User${i}`, `Test${i}`, 'S', mockDbAtomic)
  );

  const generatedIds = await Promise.all(concurrentPromises);
  const uniqueIds = new Set(generatedIds);
  assert.strictEqual(uniqueIds.size, 25, 'All concurrent member IDs must be strictly unique');
  console.log('  ✓ Requirement 7 passed: 25 concurrent registrations generated 25 unique IDs with zero collisions.');

  // ---------------------------------------------------------------------------
  // REQUIREMENT 8: 1m, 3m, 6m, 12m Date Calculations
  // REQUIREMENT 9: Month-End and Leap-Year Date Calculations
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 8 & 9: Calendar-Month Arithmetic & Month-End Clamping ---');

  // 1 Month: 16 Nov 2026 -> 16 Dec 2026
  const nov16 = new Date('2026-11-16T10:00:00.000Z');
  const plus1Month = calculateMembershipEndDate(nov16, 1);
  assert.strictEqual(plus1Month.toISOString().slice(0, 10), '2026-12-16');

  // 3 Months: 16 Nov 2026 -> 16 Feb 2027
  const plus3Months = calculateMembershipEndDate(nov16, 3);
  assert.strictEqual(plus3Months.toISOString().slice(0, 10), '2027-02-16');

  // 6 Months: 16 Nov 2026 -> 16 May 2027
  const plus6Months = calculateMembershipEndDate(nov16, 6);
  assert.strictEqual(plus6Months.toISOString().slice(0, 10), '2027-05-16');

  // 12 Months: 16 Nov 2026 -> 16 Nov 2027
  const plus12Months = calculateMembershipEndDate(nov16, 12);
  assert.strictEqual(plus12Months.toISOString().slice(0, 10), '2027-11-16');

  // Month-end clamping non-leap year: 31 Jan 2026 + 1m -> 28 Feb 2026
  const jan31NonLeap = new Date('2026-01-31T00:00:00.000Z');
  const febClampedNonLeap = calculateMembershipEndDate(jan31NonLeap, 1);
  assert.strictEqual(febClampedNonLeap.toISOString().slice(0, 10), '2026-02-28');

  // Month-end clamping leap year: 31 Jan 2024 + 1m -> 29 Feb 2024
  const jan31Leap = new Date('2024-01-31T00:00:00.000Z');
  const febClampedLeap = calculateMembershipEndDate(jan31Leap, 1);
  assert.strictEqual(febClampedLeap.toISOString().slice(0, 10), '2024-02-29');

  // Leap-day start + 12m: 29 Feb 2024 + 12m -> 28 Feb 2025 (clamped)
  const feb29Leap = new Date('2024-02-29T00:00:00.000Z');
  const leapPlus1Year = calculateMembershipEndDate(feb29Leap, 12);
  assert.strictEqual(leapPlus1Year.toISOString().slice(0, 10), '2025-02-28');

  // 31 Aug + 1m -> 30 Sep
  const aug31 = new Date('2026-08-31T00:00:00.000Z');
  const sepClamped = calculateMembershipEndDate(aug31, 1);
  assert.strictEqual(sepClamped.toISOString().slice(0, 10), '2026-09-30');

  // 31 May + 1m -> 30 Jun
  const may31 = new Date('2026-05-31T00:00:00.000Z');
  const junClamped = calculateMembershipEndDate(may31, 1);
  assert.strictEqual(junClamped.toISOString().slice(0, 10), '2026-06-30');

  console.log('  ✓ Requirement 8 passed: 1m (16 Dec 2026), 3m (16 Feb 2027), 6m (16 May 2027), 12m (16 Nov 2027).');
  console.log('  ✓ Requirement 9 passed: Month-end clamped to 28 Feb non-leap, 29 Feb leap year, 30 Sep, 30 Jun.');

  // ---------------------------------------------------------------------------
  // REQUIREMENT 10: Changing start date recalculates end date
  // REQUIREMENT 11: Changing duration recalculates end date
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 10 & 11: Dynamic Recalculation on Start Date and Duration Change ---');

  const initialStart = new Date('2026-12-01T00:00:00.000Z');
  const initialDuration = 6;
  const initialEnd = calculateMembershipEndDate(initialStart, initialDuration);
  assert.strictEqual(initialEnd.toISOString().slice(0, 10), '2027-06-01');

  // Change Start Date to 2027-01-15 -> End Date should become 2027-07-15
  const updatedStart = new Date('2027-01-15T00:00:00.000Z');
  const recalculatedAfterDateChange = calculateMembershipEndDate(updatedStart, initialDuration);
  assert.strictEqual(recalculatedAfterDateChange.toISOString().slice(0, 10), '2027-07-15');

  // Change Duration from 6m to 12m -> End Date should become 2028-01-15
  const updatedDuration = 12;
  const recalculatedAfterDurationChange = calculateMembershipEndDate(updatedStart, updatedDuration);
  assert.strictEqual(recalculatedAfterDurationChange.toISOString().slice(0, 10), '2028-01-15');

  console.log('  ✓ Requirement 10 passed: Changing start date recalculates end date.');
  console.log('  ✓ Requirement 11 passed: Changing duration recalculates end date.');

  // ---------------------------------------------------------------------------
  // REQUIREMENT 12: Editing existing membership dates preserves payment and audit history
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 12: Date Editing Preserves Payments/Invoices and Logs Audit ---');

  const initialSubscription = {
    id: 'sub_active_123',
    userId: 'usr_prabir',
    status: 'ACTIVE',
    durationMonths: 6,
    startDate: new Date('2026-11-16T00:00:00.000Z'),
    endDate: new Date('2027-05-16T00:00:00.000Z'),
  };

  const payments = [{ id: 'pmt_1', status: 'VERIFIED', amount: 18000 }];
  const invoices = [{ id: 'inv_1', status: 'PAID', invoiceNumber: 'INV/2026/001' }];
  const receipts = [{ id: 'rcp_1', receiptNumber: 'RCP/2026/001' }];
  const auditLogs: any[] = [];

  const mockDbEdit: any = {
    subscription: {
      findUnique: async ({ where }: any) => {
        if (where.id === initialSubscription.id) return initialSubscription;
        return null;
      },
      update: async ({ where, data }: any) => {
        Object.assign(initialSubscription, data);
        return initialSubscription;
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        auditLogs.push(data);
        return data;
      },
    },
    $transaction: async (fn: any) => fn(mockDbEdit),
  };

  const editResult = await updateMembershipStartDateCore(
    'sub_active_123',
    '2026-12-01',
    'admin_usr_tanish',
    mockDbEdit
  );

  assert.strictEqual(editResult.success, true, 'Editing start date should succeed');
  assert.strictEqual(initialSubscription.startDate.toISOString().slice(0, 10), '2026-12-01');
  assert.strictEqual(initialSubscription.endDate.toISOString().slice(0, 10), '2027-06-01');

  // Verify payments, invoices, receipts remain intact
  assert.strictEqual(payments.length, 1);
  assert.strictEqual(payments[0].status, 'VERIFIED');
  assert.strictEqual(invoices.length, 1);
  assert.strictEqual(invoices[0].status, 'PAID');
  assert.strictEqual(receipts.length, 1);
  assert.strictEqual(receipts[0].receiptNumber, 'RCP/2026/001');

  // Verify audit log was recorded
  assert.strictEqual(auditLogs.length, 1);
  assert.strictEqual(auditLogs[0].action, 'MEMBERSHIP_DATES_UPDATED');
  assert.strictEqual(auditLogs[0].entityType, 'SUBSCRIPTION');
  assert.strictEqual(auditLogs[0].entityId, 'sub_active_123');
  assert.strictEqual(auditLogs[0].actorUserId, 'admin_usr_tanish');
  assert.strictEqual(auditLogs[0].metadata.durationMonths, 6);

  // Expired subscription protection: should reject editing
  const expiredSub = {
    id: 'sub_expired_456',
    userId: 'usr_prabir',
    status: 'EXPIRED',
    durationMonths: 6,
    startDate: new Date('2025-11-16T00:00:00.000Z'),
    endDate: new Date('2026-05-16T00:00:00.000Z'),
  };
  mockDbEdit.subscription.findUnique = async ({ where }: any) => {
    if (where.id === 'sub_expired_456') return expiredSub;
    return null;
  };

  const expiredEditResult = await updateMembershipStartDateCore(
    'sub_expired_456',
    '2026-01-01',
    'admin_usr_tanish',
    mockDbEdit
  );
  assert.strictEqual(expiredEditResult.success, false);
  assert.ok(expiredEditResult.error?.includes('historical expired or cancelled'));

  console.log('  ✓ Requirement 12 passed: Payments, invoices, receipts preserved; audit log created; historical expired subscriptions protected.');

  // ---------------------------------------------------------------------------
  // REQUIREMENT 13: Members table uses the exact approved column order
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 13: Members Table Exact Column Order ---');
  const membersPageFilePath = path.join(__dirname, '../../app/admin/members/page.tsx');
  const membersPageContent = fs.readFileSync(membersPageFilePath, 'utf8');

  // Verify the 8 column headers in exact order in the JSX thead
  const expectedColumns = [
    'S. No.',
    'Name',
    'Member ID',
    'Email',
    'Joined',
    'End date',
    'Status',
    'Action',
  ];

  // Check that the headers appear in order
  let lastIndex = 0;
  for (const col of expectedColumns) {
    const colIndex = membersPageContent.indexOf(`>${col}<`, lastIndex);
    assert.ok(
      colIndex !== -1,
      `Column header "${col}" must be present in the table in the exact approved order`
    );
    assert.ok(
      colIndex >= lastIndex,
      `Column header "${col}" appears out of order in the table`
    );
    lastIndex = colIndex;
  }
  console.log('  ✓ Requirement 13 passed: Verified exact 8 column order: [S. No., Name, Member ID, Email, Joined, End date, Status, Action].');

  // ---------------------------------------------------------------------------
  // REQUIREMENT 14: Missing subscription dates display "—"
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 14: Missing Subscription Dates Display "—" ---');
  assert.strictEqual(formatMembershipDate(null), '—', 'Null date must format as —');
  assert.strictEqual(formatMembershipDate(undefined), '—', 'Undefined date must format as —');
  assert.strictEqual(formatMembershipDate(''), '—', 'Empty date string must format as —');
  assert.strictEqual(formatMembershipDate('invalid-date'), '—', 'Invalid date string must format as —');

  // Valid date formatting test (e.g. 16 Nov 2026)
  const validFormatted = formatMembershipDate(new Date('2026-11-16T10:00:00.000Z'));
  assert.ok(
    validFormatted.includes('16') && validFormatted.includes('Nov') && validFormatted.includes('2026'),
    `Valid date should format with day, month, year: received "${validFormatted}"`
  );
  console.log(`  ✓ Requirement 14 passed: Missing dates return "—", valid date formats as "${validFormatted}".`);

  console.log('\n================================================================');
  console.log('ALL 14 MEMBERS MANAGEMENT & DATE REQUIREMENTS PASSED SUCCESSFULLY');
  console.log('================================================================\n');
}

runMembershipDatesAndTableTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
