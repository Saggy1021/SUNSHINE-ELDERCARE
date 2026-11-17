import assert from 'node:assert';
import {
  PREFERRED_VISIT_DAYS,
  normalize12HourTime,
  to24HourTime,
  formatPreferredSchedule,
} from '../../lib/services/preferred-schedule';
import { memberRegistrationSchema } from '../../lib/validations/member';
import { adminUpdateMemberCore, getMembersCore } from '../../app/actions/admin';

async function runPreferredVisitScheduleTests() {
  console.log('================================================================');
  console.log('Sunshine Eldercare — Preferred Weekly Care Visit Schedule Unit Tests');
  console.log('================================================================\n');

  // Test 1: Day Options (Monday through Sunday)
  console.log('Test 1: Preferred Visit Day options...');
  const expectedDays = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  assert.deepStrictEqual(
    PREFERRED_VISIT_DAYS,
    expectedDays,
    'PREFERRED_VISIT_DAYS must contain Monday through Sunday'
  );
  console.log('  ✓ All 7 days from Monday to Sunday defined correctly');

  // Test 2: normalize12HourTime
  console.log('Test 2: normalize12HourTime converts 24h & 12h formats to canonical 12-hour AM/PM...');
  assert.strictEqual(normalize12HourTime('10:30'), '10:30 AM');
  assert.strictEqual(normalize12HourTime('11:00'), '11:00 AM');
  assert.strictEqual(normalize12HourTime('16:30'), '4:30 PM');
  assert.strictEqual(normalize12HourTime('09:15'), '9:15 AM');
  assert.strictEqual(normalize12HourTime('00:00'), '12:00 AM');
  assert.strictEqual(normalize12HourTime('12:00'), '12:00 PM');
  assert.strictEqual(normalize12HourTime('12:30'), '12:30 PM');
  assert.strictEqual(normalize12HourTime('10:30 AM'), '10:30 AM');
  assert.strictEqual(normalize12HourTime('4:30 PM'), '4:30 PM');
  assert.strictEqual(normalize12HourTime('04:30 PM'), '4:30 PM');
  assert.strictEqual(normalize12HourTime(null), null);
  assert.strictEqual(normalize12HourTime(undefined), null);
  assert.strictEqual(normalize12HourTime(''), null);
  assert.strictEqual(normalize12HourTime('   '), null);
  console.log('  ✓ 12-hour normalization behaves correctly for all inputs');

  // Test 3: to24HourTime for HTML <input type="time">
  console.log('Test 3: to24HourTime converts 12-hour and 24-hour inputs to HH:mm...');
  assert.strictEqual(to24HourTime('10:30 AM'), '10:30');
  assert.strictEqual(to24HourTime('4:30 PM'), '16:30');
  assert.strictEqual(to24HourTime('04:30 PM'), '16:30');
  assert.strictEqual(to24HourTime('12:00 PM'), '12:00');
  assert.strictEqual(to24HourTime('12:00 AM'), '00:00');
  assert.strictEqual(to24HourTime('12:45 AM'), '00:45');
  assert.strictEqual(to24HourTime('16:30'), '16:30');
  assert.strictEqual(to24HourTime(null), '');
  assert.strictEqual(to24HourTime(undefined), '');
  assert.strictEqual(to24HourTime(''), '');
  console.log('  ✓ to24HourTime handles bidirectional conversion for form inputs');

  // Test 4: formatPreferredSchedule for table and cards
  console.log('Test 4: formatPreferredSchedule formats concise strings e.g. Wed · 10:30 AM...');
  assert.strictEqual(
    formatPreferredSchedule('Wednesday', '10:30 AM'),
    'Wed · 10:30 AM',
    'Wednesday 10:30 AM must format to Wed · 10:30 AM'
  );
  assert.strictEqual(
    formatPreferredSchedule('Thursday', '11:00 AM'),
    'Thu · 11:00 AM',
    'Thursday 11:00 AM must format to Thu · 11:00 AM'
  );
  assert.strictEqual(
    formatPreferredSchedule('Monday', '4:30 PM'),
    'Mon · 4:30 PM',
    'Monday 4:30 PM must format to Mon · 4:30 PM'
  );
  assert.strictEqual(
    formatPreferredSchedule('Monday', '16:30'),
    'Mon · 4:30 PM',
    'Monday 16:30 must normalize and format to Mon · 4:30 PM'
  );
  assert.strictEqual(
    formatPreferredSchedule(null, null),
    '—',
    'Unspecified schedule must display —'
  );
  assert.strictEqual(
    formatPreferredSchedule(undefined, undefined),
    '—',
    'Undefined schedule must display —'
  );
  assert.strictEqual(
    formatPreferredSchedule('', ''),
    '—',
    'Blank schedule must display —'
  );
  assert.strictEqual(
    formatPreferredSchedule('Wednesday', null),
    'Wed',
    'Only day should display abbreviated day'
  );
  assert.strictEqual(
    formatPreferredSchedule(null, '10:30 AM'),
    '10:30 AM',
    'Only time should display time'
  );
  console.log('  ✓ formatPreferredSchedule meets all required display formats');

  // Test 5: memberRegistrationSchema validation
  console.log('Test 5: memberRegistrationSchema validation of preferred visit fields...');
  const baseMemberData = {
    email: 'newmember@sunshine.test',
    password: 'Password123!',
    salutation: 'Mr',
    firstName: 'Tapan',
    lastName: 'Roy',
    dateOfBirth: '1955-08-15',
    gender: 'Male' as const,
    serviceAddress: 'Salt Lake Sector 1, Kolkata',
    mobileNumber: '9876543210',
    emergencyContactName: 'Rita Roy',
    emergencyContactRelationship: 'Daughter',
    emergencyContactMobile: '9876543211',
  };

  // Optional: Valid with preferredVisitDay and preferredVisitTime
  const validWithPref = memberRegistrationSchema.safeParse({
    ...baseMemberData,
    preferredVisitDay: 'Wednesday',
    preferredVisitTime: '10:30 AM',
  });
  assert.strictEqual(validWithPref.success, true, 'Valid preferred schedule should pass validation');

  // Optional: Valid without preferred schedule
  const validWithoutPref = memberRegistrationSchema.safeParse(baseMemberData);
  assert.strictEqual(validWithoutPref.success, true, 'Omitting preferred schedule should pass validation');

  // Optional: Valid with empty strings
  const validWithEmptyPref = memberRegistrationSchema.safeParse({
    ...baseMemberData,
    preferredVisitDay: '',
    preferredVisitTime: '',
  });
  assert.strictEqual(validWithEmptyPref.success, true, 'Empty preferred schedule should pass validation');

  // Reject invalid day
  const invalidDay = memberRegistrationSchema.safeParse({
    ...baseMemberData,
    preferredVisitDay: 'Funday',
    preferredVisitTime: '10:30 AM',
  });
  assert.strictEqual(invalidDay.success, false, 'Invalid day should fail validation');
  console.log('  ✓ memberRegistrationSchema validates preferred schedule as optional and validates day enum');

  // Test 6: adminUpdateMemberCore updates preferredVisitDay and preferredVisitTime
  console.log('Test 6: adminUpdateMemberCore updates and clears preferred visit schedule...');
  let updatedProfileData: any = null;
  const mockUserRecord = {
    id: 'user_test_1',
    name: 'Mr Prabir Chakraverty',
    email: 'prabir@sunshine.test',
    memberProfile: {
      id: 'profile_1',
      salutation: 'Mr',
      firstName: 'Prabir',
      lastName: 'Chakraverty',
      preferredVisitDay: null,
      preferredVisitTime: null,
      dateOfEnrollment: new Date('2026-11-01'),
    },
    subscriptions: [
      {
        id: 'sub_1',
        startDate: new Date('2026-11-01'),
        endDate: new Date('2027-05-01'),
        durationMonths: 6,
      },
    ],
  };

  const mockDb: any = {
    user: {
      findUnique: async () => mockUserRecord,
      update: async () => mockUserRecord,
    },
    memberProfile: {
      update: async (args: any) => {
        updatedProfileData = args.data;
        return { ...mockUserRecord.memberProfile, ...args.data };
      },
      create: async (args: any) => args.data,
    },
    subscription: {
      update: async () => {},
    },
    emergencyContact: {
      upsert: async () => ({ id: 'emg_1' }),
    },
    sponsor: {
      upsert: async () => ({ id: 'spn_1' }),
    },
    insuranceDetails: {
      upsert: async () => ({ id: 'ins_1' }),
    },
    medicalAuthorization: {
      upsert: async () => ({ id: 'med_1' }),
    },
    auditLog: {
      create: async () => ({ id: 'log_1' }),
    },
    $transaction: async (fn: any) => fn(mockDb),
  };

  // Update preferred schedule to Wednesday, 10:30 AM
  const updateResult = await adminUpdateMemberCore(
    {
      userId: 'user_test_1',
      salutation: 'Mr',
      firstName: 'Prabir',
      lastName: 'Chakraverty',
      email: 'prabir@sunshine.test',
      mobileNumber: '9876543210',
      preferredVisitDay: 'Wednesday',
      preferredVisitTime: '10:30 AM',
    },
    'admin_actor_id',
    mockDb,
    true
  );

  assert.strictEqual(updateResult.success, true, 'adminUpdateMemberCore should succeed');
  assert.strictEqual(updatedProfileData.preferredVisitDay, 'Wednesday');
  assert.strictEqual(updatedProfileData.preferredVisitTime, '10:30 AM');
  console.log('  ✓ adminUpdateMemberCore persists preferredVisitDay and preferredVisitTime');

  // Clear preferred schedule by passing null / empty string
  const clearResult = await adminUpdateMemberCore(
    {
      userId: 'user_test_1',
      salutation: 'Mr',
      firstName: 'Prabir',
      lastName: 'Chakraverty',
      email: 'prabir@sunshine.test',
      mobileNumber: '9876543210',
      preferredVisitDay: '',
      preferredVisitTime: '',
    },
    'admin_actor_id',
    mockDb,
    true
  );

  assert.strictEqual(clearResult.success, true, 'Clearing should succeed');
  assert.strictEqual(updatedProfileData.preferredVisitDay, null);
  assert.strictEqual(updatedProfileData.preferredVisitTime, null);
  console.log('  ✓ adminUpdateMemberCore allows clearing preferred visit schedule');

  // Test 7: getMembersCore enriches preferredScheduleDisplay
  console.log('Test 7: getMembersCore enriches preferredScheduleDisplay...');
  const testUsers = [
    {
      id: 'user_1',
      name: 'Mr Prabir Chakraverty',
      email: 'prabir@sunshine.test',
      role: 'MEMBER',
      status: 'ACTIVE',
      createdAt: new Date('2026-11-01'),
      memberProfile: {
        memberId: 'SECD1001PRTY',
        firstName: 'Prabir',
        lastName: 'Chakraverty',
        spouseFirstName: null,
        spouseLastName: null,
        spouseMobileNumber: null,
        dateOfEnrollment: new Date('2026-11-01'),
        serviceAddress: 'Salt Lake',
        mobileNumber: '9876543210',
        bloodGroup: 'B+',
        medicalConditions: null,
        preferredVisitDay: 'Wednesday',
        preferredVisitTime: '10:30 AM',
        insuranceDetails: null,
      },
      subscriptions: [],
      elders: [],
    },
    {
      id: 'user_2',
      name: 'Mr Sagnik Kar',
      email: 'sagnik@sunshine.test',
      role: 'MEMBER',
      status: 'ACTIVE',
      createdAt: new Date('2026-11-02'),
      memberProfile: {
        memberId: null,
        firstName: 'Sagnik',
        lastName: 'Kar',
        spouseFirstName: null,
        spouseLastName: null,
        spouseMobileNumber: null,
        dateOfEnrollment: null,
        serviceAddress: 'New Town',
        mobileNumber: '9876543212',
        bloodGroup: 'O+',
        medicalConditions: null,
        preferredVisitDay: null,
        preferredVisitTime: null,
        insuranceDetails: null,
      },
      subscriptions: [],
      elders: [],
    },
  ];

  const mockMembersDb: any = {
    user: {
      findMany: async (args: any) => {
        if (args.where?.status === 'ARCHIVED') return [];
        if (!args.select?.name) {
          return testUsers.map(u => ({ id: u.id, createdAt: u.createdAt }));
        }
        return testUsers;
      },
      count: async () => testUsers.length,
    },
  };

  const membersResult = await getMembersCore(undefined, 1, 10, mockMembersDb, true);
  assert.strictEqual(membersResult.members.length, 2);

  const prabir = membersResult.members.find((m: any) => m.id === 'user_1');
  assert.ok(prabir, 'Prabir must exist in results');
  assert.strictEqual(prabir.preferredVisitDay, 'Wednesday');
  assert.strictEqual(prabir.preferredVisitTime, '10:30 AM');
  assert.strictEqual(prabir.preferredScheduleDisplay, 'Wed · 10:30 AM');

  const sagnik = membersResult.members.find((m: any) => m.id === 'user_2');
  assert.ok(sagnik, 'Sagnik must exist in results');
  assert.strictEqual(sagnik.preferredVisitDay, null);
  assert.strictEqual(sagnik.preferredVisitTime, null);
  assert.strictEqual(sagnik.preferredScheduleDisplay, '—');
  console.log('  ✓ getMembersCore attaches preferredScheduleDisplay ("Wed · 10:30 AM" and "—")');

  console.log('\n================================================================');
  console.log('ALL PREFERRED CARE VISIT SCHEDULE UNIT TESTS PASSED!');
  console.log('================================================================');
}

runPreferredVisitScheduleTests().catch((err) => {
  console.error('\n❌ Unit Test Failed:', err);
  process.exit(1);
});
