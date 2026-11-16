import assert from 'assert';
import { MemberIdentityService } from '../../lib/services/member-identity';

async function runSequentialMemberIdTests() {
  console.log('================================================================');
  console.log('Sunshine Eldercare — Sequential Member ID Generation Tests');
  console.log('================================================================\n');

  // Test 1: Prabir Chakraverty special reservation (generateMemberId)
  console.log('--- TEST 1: Prabir Chakraverty generateMemberId Reservation ---');
  const prabirGenId1 = await MemberIdentityService.generateMemberId(
    'Wg Cdr PRABIR',
    'CHAKRAVERTY',
    'D'
  );
  assert.strictEqual(prabirGenId1, 'SEC/D/1001/PRTY', 'Prabir must receive canonical SEC/D/1001/PRTY');

  const prabirGenId2 = await MemberIdentityService.generateMemberId(
    'PRABIR',
    'CHAKRAVERTY',
    'D'
  );
  assert.strictEqual(prabirGenId2, 'SEC/D/1001/PRTY', 'Prabir without title must receive canonical SEC/D/1001/PRTY');
  console.log('  ✓ Verified generateMemberId preserves SEC/D/1001/PRTY for Prabir.');

  // Test 2: Prabir Chakraverty special reservation (ensureMemberIdForUser)
  console.log('--- TEST 2: Prabir Chakraverty ensureMemberIdForUser Reservation ---');
  const inMemoryProfiles = new Map<string, any>();
  const inMemoryUsers = new Map<string, any>();

  inMemoryUsers.set('usr_prabir', {
    id: 'usr_prabir',
    email: 'p.chakraverty47@gmail.com',
    name: 'Wg Cdr PRABIR CHAKRAVERTY',
  });

  const mockDbPrabir: any = {
    user: {
      findUnique: async ({ where }: any) => inMemoryUsers.get(where.id) || null,
    },
    memberProfile: {
      findUnique: async ({ where }: any) => inMemoryProfiles.get(where.userId) || null,
      update: async ({ where, data }: any) => {
        const item = { ...(inMemoryProfiles.get(where.userId) || {}), ...data };
        inMemoryProfiles.set(where.userId, item);
        return item;
      },
      create: async ({ data }: any) => {
        inMemoryProfiles.set(data.userId, data);
        return data;
      },
    },
  };

  const prabirEnsuredId = await MemberIdentityService.ensureMemberIdForUser(
    'usr_prabir',
    'COUPLE',
    mockDbPrabir
  );
  assert.strictEqual(prabirEnsuredId, 'SEC/D/1001/PRTY');
  assert.strictEqual(inMemoryProfiles.get('usr_prabir')?.memberId, 'SEC/D/1001/PRTY');
  console.log('  ✓ Verified ensureMemberIdForUser permanently assigns SEC/D/1001/PRTY to Prabir by email.');

  // Test 3: Fresh Database Sequence Starts at 1002 for Next Member
  console.log('--- TEST 3: Fresh Database Sequence Starts at 1002 ---');
  let currentSeq: number | null = null;
  const mockDbFresh: any = {
    memberSequence: {
      upsert: async ({ update, create }: any) => {
        if (currentSeq === null) {
          currentSeq = create.current;
        } else {
          currentSeq += update.current.increment;
        }
        return { id: 'MEMBER_SEQ', current: currentSeq };
      },
    },
  };

  const firstNewMemberId = await MemberIdentityService.generateMemberId(
    'Ramesh',
    'Sharma',
    'D',
    mockDbFresh
  );
  assert.strictEqual(firstNewMemberId, 'SEC/D/1002/RASH', 'First new member must receive 1002');
  console.log('  ✓ Verified fresh database sequence starts at 1002 (SEC/D/1002/RASH).');

  // Test 4: Existing Sequence at 1001 Advances to 1002 on Next Registration
  console.log('--- TEST 4: Existing Sequence at 1001 Increments to 1002 ---');
  let existingSeq = 1001; // Prabir's sequence number in database
  const mockDbExisting: any = {
    memberSequence: {
      upsert: async ({ update }: any) => {
        existingSeq += update.current.increment;
        return { id: 'MEMBER_SEQ', current: existingSeq };
      },
    },
  };

  const nextMemberId = await MemberIdentityService.generateMemberId(
    'Amit',
    'Roy',
    'S',
    mockDbExisting
  );
  assert.strictEqual(nextMemberId, 'SEC/S/1002/AMRO', 'Next member after 1001 must receive 1002');
  assert.strictEqual(existingSeq, 1002);
  console.log('  ✓ Verified existing sequence at 1001 correctly increments to 1002.');

  // Test 5: Consecutive Registrations Strictly Increment
  console.log('--- TEST 5: Consecutive Registrations Strictly Increment ---');
  const member3 = await MemberIdentityService.generateMemberId(
    'Sneha',
    'Mukherjee',
    'D',
    mockDbExisting
  );
  assert.strictEqual(member3, 'SEC/D/1003/SNMU');

  const member4 = await MemberIdentityService.generateMemberId(
    'Debashis',
    'Banerjee',
    'S',
    mockDbExisting
  );
  assert.strictEqual(member4, 'SEC/S/1004/DEBA');
  console.log('  ✓ Verified consecutive registrations generate 1003, 1004 without gaps.');

  // Test 6: Concurrency Safety Under High Load
  console.log('--- TEST 6: Concurrency Safety Under Parallel Load ---');
  let atomicCounter = 1001;
  const mockDbConcurrent: any = {
    memberSequence: {
      upsert: async () => {
        // Simulate atomic Postgres sequence increment
        const allocated = ++atomicCounter;
        return { id: 'MEMBER_SEQ', current: allocated };
      },
    },
  };

  const parallelCount = 50;
  const parallelPromises = Array.from({ length: parallelCount }, (_, i) =>
    MemberIdentityService.generateMemberId(
      `User${i}`,
      `Test${i}`,
      i % 2 === 0 ? 'S' : 'D',
      mockDbConcurrent
    )
  );

  const results = await Promise.all(parallelPromises);
  const uniqueSet = new Set(results);
  assert.strictEqual(uniqueSet.size, parallelCount, 'All 50 IDs must be strictly unique');

  // Verify all serial numbers start at 1002 and end at 1051
  const serials = results.map((r) => parseInt(r.split('/')[2], 10));
  serials.sort((a, b) => a - b);
  assert.strictEqual(serials[0], 1002);
  assert.strictEqual(serials[serials.length - 1], 1001 + parallelCount);
  console.log(`  ✓ Verified concurrency safety: ${parallelCount} concurrent registrations yielded zero collisions (1002 to ${1001 + parallelCount}).`);

  // Test 7: Variant Types (Single SEC/S vs Couple SEC/D)
  console.log('--- TEST 7: Variant Types (SEC/S vs SEC/D) ---');
  let testVariantSeq = 1050;
  const mockVariantDb: any = {
    memberSequence: {
      upsert: async () => ({ id: 'MEMBER_SEQ', current: ++testVariantSeq }),
    },
  };
  const singleId = await MemberIdentityService.generateMemberId('John', 'Smith', 'S', mockVariantDb);
  assert.strictEqual(singleId, 'SEC/S/1051/JOSM');
  const coupleId = await MemberIdentityService.generateMemberId('John', 'Smith', 'D', mockVariantDb);
  assert.strictEqual(coupleId, 'SEC/D/1052/JOSM');
  console.log('  ✓ Verified variant type prefix is properly applied (/S/ vs /D/).');

  // Test 8: Initials Suffix Resilience & Padding
  console.log('--- TEST 8: Suffix Initials Resilience ---');
  let testInitSeq = 1100;
  const mockInitDb: any = {
    memberSequence: {
      upsert: async () => ({ id: 'MEMBER_SEQ', current: ++testInitSeq }),
    },
  };
  const shortId = await MemberIdentityService.generateMemberId('A', 'B', 'S', mockInitDb);
  assert.strictEqual(shortId, 'SEC/S/1101/AXBX');
  const unicodeId = await MemberIdentityService.generateMemberId('অমিতাভ', 'বসু', 'S', mockInitDb);
  assert.strictEqual(unicodeId, 'SEC/S/1102/XXXX');
  console.log('  ✓ Verified initials padding (XX) and Unicode non-ASCII fallback.');

  console.log('\n================================================================');
  console.log('ALL 8 SEQUENTIAL MEMBER ID TESTS PASSED SUCCESSFULLY (100%)');
  console.log('================================================================');
}

runSequentialMemberIdTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
