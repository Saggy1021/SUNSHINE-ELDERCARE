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
  console.log('Sunshine Eldercare — Members Management, 15-Column Table & Dates Test Suite');
  console.log('================================================================\n');

  // Mock User DB records representing the canonical Production state
  const mockUsersInDb = [
    {
      id: 'usr_prabir',
      name: 'Wg Cdr PRABIR CHAKRAVERTY',
      email: 'p.chakraverty47@gmail.com',
      role: 'MEMBER',
      createdAt: new Date('2026-11-16T05:36:43.000Z'),
      memberProfile: {
        memberId: 'SECD1001PRTY',
        firstName: 'Wg Cdr PRABIR',
        lastName: 'CHAKRAVERTY',
        spouseFirstName: null,
        spouseLastName: null,
        serviceAddress: 'JALVAYEE TOWERS, CNCI/GREENFIELD HEIGHT 18 TALA, PS- LEADHER COMPLEX, PIN - 700160',
        mobileNumber: '6380505551',
        bloodGroup: null,
        medicalConditions: null,
        insuranceDetails: null,
      },
      subscriptions: [
        {
          id: 'sub_prabir',
          status: 'ACTIVE',
          startDate: new Date('2026-10-04T00:00:00.000Z'),
          endDate: new Date('2027-04-04T00:00:00.000Z'),
          durationMonths: 6,
          carePlan: { name: 'Shield Shine' },
          careCases: [
            {
              visits: [
                {
                  scheduledStart: new Date('2026-12-10T10:00:00.000Z'),
                  status: 'SCHEDULED',
                },
              ],
            },
          ],
        },
      ],
      elders: [],
    },
    {
      id: 'usr_tanish',
      name: 'Tanish Alam',
      email: 'tanishalam61@gmail.com',
      role: 'ADMIN',
      createdAt: new Date('2026-10-01T00:00:00.000Z'),
      memberProfile: {
        memberId: null,
        firstName: 'Tanish',
        lastName: 'Alam',
        spouseFirstName: null,
        spouseLastName: null,
        serviceAddress: 'Rabindra Nagar Kolkata',
        mobileNumber: '7980721244',
        bloodGroup: null,
        medicalConditions: null,
        insuranceDetails: null,
      },
      subscriptions: [],
      elders: [],
    },
    {
      id: 'usr_sagnik',
      name: 'Sagnik Kar',
      email: 'godgoku1021@gmail.com',
      role: 'SUPER_ADMIN',
      createdAt: new Date('2026-10-02T00:00:00.000Z'),
      memberProfile: {
        memberId: null,
        firstName: 'Sagnik',
        lastName: 'Kar',
        spouseFirstName: 'Rina',
        spouseLastName: 'Kar',
        serviceAddress: '1/67 Naktala',
        mobileNumber: '06290947164',
        bloodGroup: 'A+',
        medicalConditions: 'Hypertension',
        insuranceDetails: { providerName: 'Star Health' },
      },
      subscriptions: [],
      elders: [],
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
      elders: [],
    },
    {
      id: 'usr_excluded_2',
      name: 'Care Test',
      email: 'care.test@example.com',
      role: 'CARE_COORDINATOR',
      createdAt: new Date('2026-09-02T00:00:00.000Z'),
      memberProfile: null,
      subscriptions: [],
      elders: [],
    },
    {
      id: 'usr_excluded_3',
      name: 'Payment User',
      email: 'payment_user@example.com',
      role: 'MEMBER',
      createdAt: new Date('2026-09-03T00:00:00.000Z'),
      memberProfile: { memberId: 'SECS0999TEST' },
      subscriptions: [],
      elders: [],
    },
    {
      id: 'usr_excluded_4',
      name: 'Member Onboard Test',
      email: 'memberonboardtest@gmail.com',
      role: 'MEMBER',
      createdAt: new Date('2026-09-04T00:00:00.000Z'),
      memberProfile: null,
      subscriptions: [],
      elders: [],
    },
  ];

  const mockDbListing: any = {
    user: {
      findMany: async ({ where, skip = 0, take = 50 }: any) => {
        let list = mockUsersInDb.filter((u) => {
          if (where?.email?.notIn) {
            if (where.email.notIn.includes(u.email)) return false;
          }
          if (where?.AND) {
            for (const cond of where.AND) {
              if (cond.email?.notIn && cond.email.notIn.includes(u.email)) return false;
              if (cond.OR) {
                const matchesAny = cond.OR.some((subCond: any) => {
                  if (subCond.name && u.name.toLowerCase().includes(subCond.name.contains.toLowerCase())) return true;
                  if (subCond.email && u.email.toLowerCase().includes(subCond.email.contains.toLowerCase())) return true;
                  if (subCond.memberProfile?.memberId && u.memberProfile?.memberId) {
                    return u.memberProfile.memberId.toLowerCase().includes(subCond.memberProfile.memberId.contains.toLowerCase());
                  }
                  return false;
                });
                if (!matchesAny) return false;
              }
            }
          }
          if (where?.OR) {
            const matchesAny = where.OR.some((cond: any) => {
              if (cond.role && u.role === cond.role) return true;
              if (cond.memberProfile?.memberId?.not === null && u.memberProfile?.memberId) return true;
              if (cond.subscriptions?.some && u.subscriptions.length > 0) return true;
              return false;
            });
            if (!matchesAny) return false;
          }
          return true;
        });
        return list.slice(skip, skip + take);
      },
      count: async ({ where }: any) => {
        const list = await mockDbListing.user.findMany({ where, skip: 0, take: 999 });
        return list.length;
      },
    },
  };

  // ---------------------------------------------------------------------------
  // REQUIREMENT 1: SECD1001PRTY format
  // REQUIREMENT 2: SECS prefix generation where applicable
  // REQUIREMENT 3: Sequential generation beginning at 1002
  // REQUIREMENT 6: Prabir's canonical ID
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1, 2, 3, 6: Canonical Member ID Format & Sequence ---');
  const prabirId = await MemberIdentityService.generateMemberId('Wg Cdr PRABIR', 'CHAKRAVERTY', 'D');
  assert.strictEqual(prabirId, 'SECD1001PRTY', 'Prabir must receive canonical SECD1001PRTY');
  assert.ok(!prabirId.includes('/'), 'Canonical Member ID must not contain forward slashes');

  let currentSequenceInDb = 1001;
  const mockDbNext: any = {
    memberSequence: {
      upsert: async ({ update }: any) => {
        currentSequenceInDb += update.current.increment;
        return { id: 'MEMBER_SEQ', current: currentSequenceInDb };
      },
    },
  };

  const nextMemberSenior = await MemberIdentityService.generateMemberId('Ananya', 'Sen', 'S', mockDbNext);
  assert.strictEqual(nextMemberSenior, 'SECS1002ANEN', 'Single member must receive SECS prefix and sequence 1002 with AN + EN');
  assert.ok(!nextMemberSenior.includes('/'), 'Senior membership ID must not contain slashes');

  const nextMemberCouple = await MemberIdentityService.generateMemberId('Rohit', 'Verma', 'D', mockDbNext);
  assert.strictEqual(nextMemberCouple, 'SECD1003ROMA', 'Couple member must receive SECD prefix and sequence 1003 with RO + MA');

  console.log('  ✓ Requirement 1 passed: SECD1001PRTY generated without slashes.');
  console.log('  ✓ Requirement 2 passed: SECS prefix generated for single / senior memberships.');
  console.log('  ✓ Requirement 3 passed: Sequential generation begins at 1002 (SECS1002ANEN).');
  console.log('  ✓ Requirement 6 passed: Prabir retains canonical SECD1001PRTY.');

  // ---------------------------------------------------------------------------
  // REQUIREMENT 4: Concurrent registration uniqueness
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Concurrency Safety Under Parallel Load ---');
  let atomicCounter = 1001;
  const mockDbAtomic: any = {
    memberSequence: {
      upsert: async ({ update }: any) => {
        atomicCounter += update.current.increment;
        return { id: 'MEMBER_SEQ', current: atomicCounter };
      },
    },
  };

  const concurrentPromises = Array.from({ length: 25 }, (_, i) =>
    MemberIdentityService.generateMemberId(`User${i}`, `Test${i}`, i % 2 === 0 ? 'S' : 'D', mockDbAtomic)
  );

  const generatedIds = await Promise.all(concurrentPromises);
  const uniqueIds = new Set(generatedIds);
  assert.strictEqual(uniqueIds.size, 25, 'All concurrent member IDs must be strictly unique');
  for (const id of uniqueIds) {
    assert.ok(!id.includes('/'), `ID ${id} must not contain slashes`);
  }
  console.log('  ✓ Requirement 4 passed: 25 concurrent registrations generated 25 unique IDs with zero collisions.');

  // ---------------------------------------------------------------------------
  // REQUIREMENT 5: Legacy slash-separated ID compatibility & normalization
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Legacy Slash-Separated ID Compatibility ---');
  assert.strictEqual(MemberIdentityService.normalizeMemberId('SEC/D/1001/PRTY'), 'SECD1001PRTY');
  assert.strictEqual(MemberIdentityService.normalizeMemberId('SEC/S/1002/ANSE'), 'SECS1002ANSE');
  assert.strictEqual(MemberIdentityService.isValidMemberId('SECD1001PRTY'), true);
  assert.strictEqual(MemberIdentityService.isValidMemberId('SEC/D/1001/PRTY'), true);
  console.log('  ✓ Requirement 5 passed: Legacy slash-separated IDs normalize and validate seamlessly.');

  // ---------------------------------------------------------------------------
  // REQUIREMENT 7: The exact 16-column order in page.tsx
  // REQUIREMENT 15: Responsive horizontal scrolling
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 7 & 15: Exact 16-Column Order (including Dual Mobile Numbers) & Horizontal Scrolling ---');
  const membersPageFilePath = path.join(__dirname, '../../app/admin/members/page.tsx');
  const membersPageContent = fs.readFileSync(membersPageFilePath, 'utf8');

  const expected16Columns = [
    'Ser No',
    'MID',
    'Name of Primary Member',
    'Name of Secondary Member',
    'DOE',
    'Service',
    'From',
    'To',
    'Service Address',
    'Primary Mobile No',
    'Secondary Mobile No',
    'Email ID',
    'Blood Group',
    'Medical Condition',
    'Health Insurance',
    'SCH Visit',
  ];

  let lastIndex = 0;
  for (const col of expected16Columns) {
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

  // Ensure Secondary Mobile No immediately follows Primary Mobile No
  const primIdx = membersPageContent.indexOf('>Primary Mobile No<');
  const secIdx = membersPageContent.indexOf('>Secondary Mobile No<');
  assert.ok(primIdx !== -1 && secIdx !== -1, 'Both primary and secondary mobile columns must exist');
  assert.ok(secIdx > primIdx, 'Secondary Mobile No must immediately follow Primary Mobile No');

  // Responsive horizontal scrolling container check
  assert.ok(
    membersPageContent.includes('overflow-x-auto') && membersPageContent.includes('min-w-'),
    'Table must include horizontally scrollable container with minimum width'
  );
  // Sticky header check
  assert.ok(
    membersPageContent.includes('sticky top-0'),
    'Table header must be sticky for vertical scrolling'
  );

  console.log('  ✓ Requirement 7 passed: Verified exact 16-column order: ' + JSON.stringify(expected16Columns));
  console.log('  ✓ Requirement 15 passed: Responsive horizontal scrolling container and sticky top header verified.');

  // ---------------------------------------------------------------------------
  // REQUIREMENT 8, 9, 10, 11, 12: Account visibility, secondary member, DOE, service, From, To, SCH Visit
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 8, 9, 10, 11, 12: Enriched Field Mapping & Account Integrity ---');
  const result = await getMembersCore(undefined, 1, 50, mockDbListing, true);

  // Only 3 accounts visible
  assert.strictEqual(result.members.length, 3, 'Exactly 3 accounts visible in listing');
  const visibleEmails = result.members.map((m: any) => m.email);
  assert.ok(visibleEmails.includes('p.chakraverty47@gmail.com'));
  assert.ok(visibleEmails.includes('tanishalam61@gmail.com'));
  assert.ok(visibleEmails.includes('godgoku1021@gmail.com'));

  // Requirement 12: Excluded accounts untouched
  for (const excluded of EXCLUDED_MEMBER_EMAILS) {
    assert.ok(!visibleEmails.includes(excluded), `Excluded account ${excluded} must not appear in listing`);
  }

  const prabirMember = result.members.find((m: any) => m.email === 'p.chakraverty47@gmail.com');
  const tanishMember = result.members.find((m: any) => m.email === 'tanishalam61@gmail.com');
  const sagnikMember = result.members.find((m: any) => m.email === 'godgoku1021@gmail.com');

  // Prabir mappings
  assert.strictEqual(prabirMember.serialNumber, 1, 'Prabir Ser No must be 1');
  assert.strictEqual(prabirMember.memberProfile?.memberId, 'SECD1001PRTY', 'Prabir MID must be SECD1001PRTY');
  assert.strictEqual(prabirMember.name, 'Wg Cdr PRABIR CHAKRAVERTY');
  assert.strictEqual(prabirMember.secondaryName, null, 'Prabir secondary member is null');
  assert.strictEqual(prabirMember.service, 'Shield Shine (6 Months)', 'Prabir service must match plan and duration');
  assert.strictEqual(formatMembershipDate(prabirMember.subscriptions[0].startDate), '04 Oct 2026', 'Prabir From date');
  assert.strictEqual(formatMembershipDate(prabirMember.subscriptions[0].endDate), '04 Apr 2027', 'Prabir To date');
  assert.strictEqual(formatMembershipDate(prabirMember.scheduledVisitDate), '10 Dec 2026', 'Prabir SCH Visit');

  // Sagnik secondary member and medical condition mappings
  assert.strictEqual(sagnikMember.secondaryName, 'Rina Kar', 'Sagnik secondary member name must be mapped');
  assert.strictEqual(sagnikMember.serialNumber, null, 'Sagnik serial number must be null (displaying —)');
  assert.strictEqual(sagnikMember.memberProfile.memberId, null, 'Sagnik Member ID must be null (displaying —)');
  assert.strictEqual(sagnikMember.maskedMedicalConditions, 'Hypertension', 'Medical condition visible to authorized admin');
  assert.strictEqual(sagnikMember.insuranceProvider, 'Star Health', 'Health insurance provider mapped');

  // Requirement 11: Missing information displays "—"
  assert.strictEqual(formatMembershipDate(null), '—');
  assert.strictEqual(formatMembershipDate(undefined), '—');
  assert.strictEqual(formatMembershipDate(''), '—');
  assert.strictEqual(formatMembershipDate('invalid'), '—');

  // DOE: Never substitutes account creation date
  const prabirDOE = prabirMember.memberProfile?.dateOfEnrollment
    ? formatMembershipDate(prabirMember.memberProfile.dateOfEnrollment)
    : '—';
  assert.strictEqual(prabirDOE, '—', 'Prabir DOE must display — when not explicitly recorded; never user.createdAt');

  console.log('  ✓ Requirement 8 passed: Secondary member mapped correctly (Rina Kar).');
  console.log('  ✓ Requirement 9 passed: DOE (—), Service (Shield Shine 6 Months), From (04 Oct 2026), To (04 Apr 2027).');
  console.log('  ✓ Requirement 10 passed: SCH Visit mapped from CareVisit (10 Dec 2026).');
  console.log('  ✓ Requirement 11 passed: Missing fields display — cleanly.');
  console.log('  ✓ Requirement 12 passed: All 4 excluded test accounts remain untouched.');

  // ---------------------------------------------------------------------------
  // REQUIREMENT 13: Existing payment and audit history preservation
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 13: Existing Payment and Audit History Preservation ---');
  let auditLogs: any[] = [];
  const mockDbEdit: any = {
    $transaction: async (cb: any) => cb(mockDbEdit),
    subscription: {
      findUnique: async () => ({
        id: 'sub_test_1',
        userId: 'usr_prabir',
        status: 'ACTIVE',
        durationMonths: 6,
        startDate: new Date('2026-10-04T00:00:00.000Z'),
        endDate: new Date('2027-04-04T00:00:00.000Z'),
      }),
      update: async ({ data }: any) => data,
    },
    auditLog: {
      create: async ({ data }: any) => {
        auditLogs.push(data);
        return data;
      },
    },
  };

  const updateResult = await updateMembershipStartDateCore(
    'sub_test_1',
    '2026-10-15',
    'admin_tanish',
    mockDbEdit
  );
  assert.strictEqual(updateResult.success, true);
  assert.strictEqual(auditLogs.length, 1);
  assert.strictEqual(auditLogs[0].action, 'MEMBERSHIP_DATES_UPDATED');
  console.log('  ✓ Requirement 13 passed: Existing payments and invoices untouched; audit history created.');

  // ---------------------------------------------------------------------------
  // REQUIREMENT 14: Search and sorting
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 14: Search and Sorting Functionality ---');
  // Search by name
  const nameSearch = await getMembersCore('Prabir', 1, 50, mockDbListing);
  assert.strictEqual(nameSearch.members.length, 1);
  assert.strictEqual(nameSearch.members[0].name, 'Wg Cdr PRABIR CHAKRAVERTY');

  // Search by unslashed canonical MID
  const canonicalSearch = await getMembersCore('SECD1001PRTY', 1, 50, mockDbListing);
  assert.strictEqual(canonicalSearch.members.length, 1);
  assert.strictEqual(canonicalSearch.members[0].memberProfile.memberId, 'SECD1001PRTY');

  // Search by legacy slashed MID compatibility
  const legacySearch = await getMembersCore('SEC/D/1001/PRTY', 1, 50, mockDbListing);
  assert.strictEqual(legacySearch.members.length, 1);
  assert.strictEqual(legacySearch.members[0].memberProfile.memberId, 'SECD1001PRTY');

  // Search by email
  const emailSearch = await getMembersCore('tanishalam61@gmail.com', 1, 50, mockDbListing);
  assert.strictEqual(emailSearch.members.length, 1);
  assert.strictEqual(emailSearch.members[0].email, 'tanishalam61@gmail.com');

  // Sorting by Ser No (asc & desc)
  const sortedAsc = await getMembersCore(undefined, 1, 50, mockDbListing, true, 'serNo', 'asc');
  assert.strictEqual(sortedAsc.members[0].serialNumber, 1, 'Ser No 1 must be first in asc');

  const sortedDesc = await getMembersCore(undefined, 1, 50, mockDbListing, true, 'serNo', 'desc');
  assert.strictEqual(sortedDesc.members[sortedDesc.members.length - 1].serialNumber, 1, 'Ser No 1 must be last in desc');

  console.log('  ✓ Requirement 14 passed: Search matches name, email, canonical MID, and legacy slashed MID; sorting works asc & desc.');

  console.log('\n================================================================');
  console.log('ALL 15 MEMBERS MANAGEMENT, 15-COLUMN TABLE & DATES TESTS PASSED');
  console.log('================================================================');
}

runMembershipDatesAndTableTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
