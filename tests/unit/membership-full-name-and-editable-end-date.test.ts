import assert from 'node:assert';
import { formatFullMembershipName, formatVariantType } from '../../lib/utils/format-membership';
import { calculateMembershipEndDate } from '../../lib/services/dates';
import {
  updateMembershipDatesCore,
  updateMembershipStartDateCore,
  getMembersCore
} from '../../app/actions/admin';

async function runTestSuite() {
  console.log('================================================================');
  console.log('Admin Portal: Membership Full Name Display & Editable End Date Tests');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            console.log(`  ✓ ${name}`);
            passed++;
          })
          .catch((err) => {
            console.error(`  ✗ ${name}`);
            console.error(err);
            failed++;
          });
      }
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(err);
      failed++;
    }
  }

  // --- Scenario 1: New Single membership displays Single correctly ---
  await test('Scenario 1: Single membership displays Single category and duration', () => {
    assert.strictEqual(
      formatFullMembershipName('Life Line Care', 'SINGLE', 3),
      'Life Line Care — Single (3 Months)'
    );
    assert.strictEqual(
      formatFullMembershipName('Life Line Care', 'SINGLE', 6),
      'Life Line Care — Single (6 Months)'
    );
    assert.strictEqual(
      formatFullMembershipName('Life Line Care', 'SINGLE', 12),
      'Life Line Care — Single (12 Months)'
    );
    assert.strictEqual(
      formatFullMembershipName('Shield Shine', 'SINGLE', 1),
      'Shield Shine — Single (1 Month)'
    );
  });

  // --- Scenario 2: New Couple membership displays Couple correctly ---
  await test('Scenario 2: Couple membership displays Couple category and duration', () => {
    assert.strictEqual(
      formatFullMembershipName('Life Line Care', 'COUPLE', 6),
      'Life Line Care — Couple (6 Months)'
    );
    assert.strictEqual(
      formatFullMembershipName('Life Line Care', 'COUPLE', 12),
      'Life Line Care — Couple (12 Months)'
    );
    assert.strictEqual(
      formatFullMembershipName('Semi Shield Shine', 'COUPLE', 3),
      'Semi Shield Shine — Couple (3 Months)'
    );
  });

  // --- Scenario 3: Membership duration is displayed correctly ---
  await test('Scenario 3: Membership duration and plurals handled correctly', () => {
    assert.strictEqual(
      formatFullMembershipName('Life Line Care', 'SINGLE', 1),
      'Life Line Care — Single (1 Month)'
    );
    assert.strictEqual(
      formatFullMembershipName('Life Line Care', 'COUPLE', 12),
      'Life Line Care — Couple (12 Months)'
    );
  });

  // Safe fallbacks for historical records
  await test('Scenario 3b: Historical records with missing variantType fallback gracefully without fabricating', () => {
    assert.strictEqual(
      formatFullMembershipName('Life Line Care', null, 3),
      'Life Line Care (3 Months)'
    );
    assert.strictEqual(
      formatFullMembershipName('Shield Shine', undefined, 6),
      'Shield Shine (6 Months)'
    );
    assert.strictEqual(
      formatFullMembershipName('Shield Shine', null, null),
      'Shield Shine'
    );
    assert.strictEqual(
      formatFullMembershipName(null, 'COUPLE', 3),
      'Couple (3 Months)'
    );
    assert.strictEqual(
      formatFullMembershipName(null, null, null),
      '—'
    );
  });

  // Standalone formatVariantType
  await test('Scenario 3c: formatVariantType produces capitalized Single/Couple', () => {
    assert.strictEqual(formatVariantType('SINGLE'), 'Single');
    assert.strictEqual(formatVariantType('COUPLE'), 'Couple');
    assert.strictEqual(formatVariantType('single'), 'Single');
    assert.strictEqual(formatVariantType('couple'), 'Couple');
    assert.strictEqual(formatVariantType(null), null);
  });

  // --- Scenario 4: Default end date calculates correctly ---
  await test('Scenario 4: Default end date calculates correctly using calendar arithmetic', () => {
    const startDate = new Date('2026-11-20T00:00:00.000Z');
    const endDate3m = calculateMembershipEndDate(startDate, 3);
    assert.strictEqual(endDate3m.toISOString().split('T')[0], '2027-02-20');

    const endDate6m = calculateMembershipEndDate(startDate, 6);
    assert.strictEqual(endDate6m.toISOString().split('T')[0], '2027-05-20');

    const endDate12m = calculateMembershipEndDate(startDate, 12);
    assert.strictEqual(endDate12m.toISOString().split('T')[0], '2027-11-20');

    // Month-end clamping
    const jan31 = new Date('2026-01-31T00:00:00.000Z');
    const febEnd = calculateMembershipEndDate(jan31, 1);
    assert.strictEqual(febEnd.toISOString().split('T')[0], '2026-02-28');
  });

  // Setup Mock Database for DB Scenarios
  let updatedData: any = null;
  let createdAuditLog: any = null;

  const mockSubscription = {
    id: 'sub-test-101',
    userId: 'user-test-202',
    status: 'ACTIVE',
    durationMonths: 3,
    startDate: new Date('2026-11-20T00:00:00.000Z'),
    endDate: new Date('2027-02-20T00:00:00.000Z'),
  };

  const mockDb = {
    subscription: {
      findUnique: async () => ({ ...mockSubscription }),
    },
    $transaction: async (cb: any) => {
      const tx = {
        subscription: {
          update: async (args: any) => {
            updatedData = args.data;
            return { ...mockSubscription, ...args.data };
          },
        },
        auditLog: {
          create: async (args: any) => {
            createdAuditLog = args.data;
            return { id: 'audit-log-001', ...args.data };
          },
        },
      };
      return cb(tx);
    },
  };

  // --- Scenario 5: Administrator can manually extend the end date ---
  await test('Scenario 5: Administrator can manually extend the end date', async () => {
    updatedData = null;
    createdAuditLog = null;

    const res = await updateMembershipDatesCore(
      'sub-test-101',
      '2026-11-20',
      '2027-03-20', // Extended by 1 month manually
      'admin-actor-999',
      mockDb
    );

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.startDate?.toISOString().split('T')[0], '2026-11-20');
    assert.strictEqual(res.endDate?.toISOString().split('T')[0], '2027-03-20');
    assert.strictEqual(res.isManualEndDate, true);
    assert.strictEqual(updatedData.endDate.toISOString().split('T')[0], '2027-03-20');
  });

  // --- Scenario 6: Manually adjusted end date survives and audit log records old & new ---
  await test('Scenario 6: Audit log captures old end date, new end date, admin and timestamp', async () => {
    assert.ok(createdAuditLog);
    assert.strictEqual(createdAuditLog.action, 'MEMBERSHIP_DATES_UPDATED');
    assert.strictEqual(createdAuditLog.actorUserId, 'admin-actor-999');
    assert.strictEqual(createdAuditLog.metadata.previousEndDate.toISOString().split('T')[0], '2027-02-20');
    assert.strictEqual(createdAuditLog.metadata.newEndDate.toISOString().split('T')[0], '2027-03-20');
    assert.strictEqual(createdAuditLog.metadata.calculatedEndDate.toISOString().split('T')[0], '2027-02-20');
    assert.strictEqual(createdAuditLog.metadata.isManualEndDate, true);
  });

  // --- Scenario 7 & 8: Reset to Calculated Date restores the correct calculated date ---
  await test('Scenario 8: Reset to Calculated Date restores duration-based calculation', async () => {
    updatedData = null;
    createdAuditLog = null;

    const res = await updateMembershipDatesCore(
      'sub-test-101',
      '2026-11-20',
      null, // No manual override -> restore calculated
      'admin-actor-999',
      mockDb
    );

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.endDate?.toISOString().split('T')[0], '2027-02-20');
    assert.strictEqual(res.isManualEndDate, false);
    assert.strictEqual(updatedData.endDate.toISOString().split('T')[0], '2027-02-20');
    assert.strictEqual(createdAuditLog.metadata.isManualEndDate, false);
  });

  // --- Scenario 9: Invalid end dates are rejected ---
  await test('Scenario 9: Invalid end dates (earlier or equal to start date) are rejected', async () => {
    const resEarlier = await updateMembershipDatesCore(
      'sub-test-101',
      '2026-11-20',
      '2026-11-19', // Earlier
      'admin-actor-999',
      mockDb
    );
    assert.strictEqual(resEarlier.success, false);
    assert.ok(resEarlier.error?.includes('Membership end date must be later than start date'));

    const resEqual = await updateMembershipDatesCore(
      'sub-test-101',
      '2026-11-20',
      '2026-11-20', // Equal
      'admin-actor-999',
      mockDb
    );
    assert.strictEqual(resEqual.success, false);
    assert.ok(resEqual.error?.includes('Membership end date must be later than start date'));
  });

  // --- Scenario 10: Backward compatibility with updateMembershipStartDateCore ---
  await test('Scenario 10: updateMembershipStartDateCore functions as backward-compatible wrapper', async () => {
    updatedData = null;
    const res = await updateMembershipStartDateCore(
      'sub-test-101',
      '2026-12-01',
      'admin-actor-999',
      mockDb
    );
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.startDate?.toISOString().split('T')[0], '2026-12-01');
    assert.strictEqual(res.endDate?.toISOString().split('T')[0], '2027-03-01');
  });

  // --- Scenario 11: getMembersCore returns full service name with Single / Couple ---
  await test('Scenario 11: getMembersCore displays full service name with category and duration', async () => {
    const mockMembersDb = {
      user: {
        findMany: async () => [
          {
            id: 'u-1',
            name: 'Dr. John Doe',
            email: 'john@example.com',
            createdAt: new Date('2026-10-01'),
            memberProfile: {
              memberId: 'SECD1001JODO',
              mobileNumber: '9876543210',
              serviceAddress: '123 Park Street, Kolkata',
              spouseSalutation: 'Mrs',
              spouseFirstName: 'Jane',
              spouseLastName: 'Doe',
            },
            subscriptions: [
              {
                id: 's-1',
                status: 'ACTIVE',
                startDate: new Date('2026-11-20'),
                endDate: new Date('2027-02-20'),
                durationMonths: 3,
                variantType: 'COUPLE',
                carePlan: { name: 'Life Line Care' },
                plan: null,
                customPlan: null,
                careCases: [],
              },
            ],
            elders: [],
          },
          {
            id: 'u-2',
            name: 'Mr. Robert Smith',
            email: 'robert@example.com',
            createdAt: new Date('2026-10-02'),
            memberProfile: {
              memberId: 'SECS1002ROSM',
              mobileNumber: '9876543211',
              serviceAddress: '456 Lake Road, Kolkata',
              spouseFirstName: null,
              spouseLastName: null,
            },
            subscriptions: [
              {
                id: 's-2',
                status: 'ACTIVE',
                startDate: new Date('2026-11-20'),
                endDate: new Date('2027-05-20'),
                durationMonths: 6,
                variantType: 'SINGLE',
                carePlan: { name: 'Life Line Care' },
                plan: null,
                customPlan: null,
                careCases: [],
              },
            ],
            elders: [],
          },
        ],
        count: async () => 2,
      },
    };

    const result = await getMembersCore(
      undefined,
      1,
      50,
      mockMembersDb,
      true
    );

    assert.strictEqual(result.members.length, 2);
    // Member 1 has COUPLE variant
    assert.strictEqual(result.members[0].service, 'Life Line Care — Couple (3 Months)');
    // Member 2 has SINGLE variant
    assert.strictEqual(result.members[1].service, 'Life Line Care — Single (6 Months)');
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
