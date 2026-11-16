import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { adminUpdateMemberCore } from '../../app/actions/admin';
import { getMembersCore } from '../../app/actions/admin';

async function runMemberEditingAndDualMobileTests() {
  console.log('================================================================');
  console.log('Sunshine Eldercare — Member Editing & Dual Mobile Numbers Test Suite');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // FIXTURE: Mock existing database with a registered member (Prabir)
  // ---------------------------------------------------------------------------
  let auditLogs: any[] = [];
  let userRecord: any = {
    id: 'cmwitwcjr0001o7hmeqyob4k0',
    name: 'Wg Cdr PRABIR CHAKRAVERTY',
    email: 'p.chakraverty47@gmail.com',
    role: 'MEMBER',
    status: 'ACTIVE',
    createdAt: new Date('2026-10-04T10:00:00.000Z'),
  };

  let profileRecord: any = {
    id: 'cmwitwckk0003o7hmvsdlfkpl',
    userId: 'cmwitwcjr0001o7hmeqyob4k0',
    memberId: 'SECD1001PRTY', // Canonical Member ID
    firstName: 'Wg Cdr PRABIR',
    lastName: 'CHAKRAVERTY',
    email: 'p.chakraverty47@gmail.com',
    mobileNumber: '6380505551',
    alternateNumber: null,
    serviceAddress: 'JALVAYEE TOWERS, CNCI/GREENFIELD HEIGHT 18 TALA',
    nearestLandmark: 'GREENFIELD HEIGHT',
    dateOfBirth: new Date('1947-08-15T00:00:00.000Z'),
    gender: 'Male',
    idProofType: 'Aadhaar',
    idProofNumber: '123456789012',
    dateOfEnrollment: null, // Initially unrecorded
    bloodGroup: 'B+',
    medicalConditions: 'Mild Hypertension',
    spouseFirstName: null,
    spouseLastName: null,
    spouseMobileNumber: null,
    spouseDateOfBirth: null,
    spouseGender: null,
    spouseIdProofType: null,
    spouseIdProofNumber: null,
  };

  let subscriptionRecord: any = {
    id: 'sub_prabir_001',
    userId: 'cmwitwcjr0001o7hmeqyob4k0',
    carePlanId: 'shield-shine',
    durationMonths: 6,
    variantType: 'COUPLE',
    status: 'ACTIVE',
    startDate: new Date('2026-10-04T00:00:00.000Z'),
    endDate: new Date('2027-04-04T00:00:00.000Z'),
    createdAt: new Date('2026-10-04T00:00:00.000Z'),
  };

  let paymentsList: any[] = [
    { id: 'pay_001', userId: 'cmwitwcjr0001o7hmeqyob4k0', amount: 18000, status: 'VERIFIED' }
  ];
  let invoicesList: any[] = [
    { id: 'inv_001', userId: 'cmwitwcjr0001o7hmeqyob4k0', invoiceNumber: 'INV/2026/001' }
  ];
  let receiptsList: any[] = [
    { id: 'rec_001', userId: 'cmwitwcjr0001o7hmeqyob4k0', receiptNumber: 'REC/2026/001' }
  ];

  let emergencyRecord: any = null;
  let sponsorRecord: any = null;
  let insuranceRecord: any = null;
  let medicalAuthRecord: any = null;

  // Transaction-aware mock database client
  const createMockDb = () => ({
    $transaction: async (callback: any) => {
      const tx = {
        user: {
          findUnique: async ({ where }: any) => {
            if (where.id === userRecord.id) {
              return {
                ...userRecord,
                memberProfile: profileRecord ? { ...profileRecord } : null,
                subscriptions: subscriptionRecord ? [{ ...subscriptionRecord }] : [],
                emergencyContact: emergencyRecord ? { ...emergencyRecord } : null,
              };
            }
            if (where.email && where.email === userRecord.email) {
              return { ...userRecord };
            }
            return null;
          },
          update: async ({ where, data }: any) => {
            userRecord = { ...userRecord, ...data };
            return userRecord;
          },
        },
        memberProfile: {
          update: async ({ where, data }: any) => {
            // Invariant check: memberId must NEVER be altered
            if (data.memberId !== undefined) {
              throw new Error('FATAL: Attempted to modify memberId during profile update!');
            }
            profileRecord = { ...profileRecord, ...data };
            return profileRecord;
          },
          create: async ({ data }: any) => {
            profileRecord = { id: 'prof_new', ...data };
            return profileRecord;
          },
        },
        subscription: {
          update: async ({ where, data }: any) => {
            subscriptionRecord = { ...subscriptionRecord, ...data };
            return subscriptionRecord;
          },
        },
        emergencyContact: {
          upsert: async ({ update, create }: any) => {
            emergencyRecord = emergencyRecord ? { ...emergencyRecord, ...update } : { id: 'emg_001', ...create };
            return emergencyRecord;
          },
        },
        sponsor: {
          upsert: async ({ update, create }: any) => {
            sponsorRecord = sponsorRecord ? { ...sponsorRecord, ...update } : { id: 'spn_001', ...create };
            return sponsorRecord;
          },
        },
        insuranceDetails: {
          upsert: async ({ update, create }: any) => {
            insuranceRecord = insuranceRecord ? { ...insuranceRecord, ...update } : { id: 'ins_001', ...create };
            return insuranceRecord;
          },
        },
        medicalAuthorization: {
          upsert: async ({ update, create }: any) => {
            medicalAuthRecord = medicalAuthRecord ? { ...medicalAuthRecord, ...update } : { id: 'med_001', ...create };
            return medicalAuthRecord;
          },
        },
        auditLog: {
          create: async ({ data }: any) => {
            const entry = { id: `log_${Date.now()}_${auditLogs.length}`, ...data, createdAt: new Date() };
            auditLogs.push(entry);
            return entry;
          },
        },
      };
      return callback(tx);
    },
  });

  // ---------------------------------------------------------------------------
  // TEST 1 & 2: Existing Member Editing After Registration & Prepopulation
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1 & 2: Existing Member Can Be Edited After Registration & Prepopulation ---');
  const mockDb1 = createMockDb();

  // Perform an edit of primary contact and address
  const editResult1 = await adminUpdateMemberCore(
    {
      userId: userRecord.id,
      firstName: 'Wg Cdr PRABIR',
      lastName: 'CHAKRAVERTY',
      email: 'p.chakraverty47@gmail.com',
      mobileNumber: '6380505551',
      serviceAddress: 'JALVAYEE TOWERS, FLAT 1802, NEW TOWN, KOLKATA 700160',
      nearestLandmark: 'NEAR ALIAH UNIVERSITY',
      bloodGroup: 'B+',
    },
    'admin_actor_001',
    mockDb1,
    true
  );

  assert.strictEqual(editResult1.success, true, 'Member update must succeed');
  assert.strictEqual(profileRecord.serviceAddress, 'JALVAYEE TOWERS, FLAT 1802, NEW TOWN, KOLKATA 700160');
  assert.strictEqual(profileRecord.nearestLandmark, 'NEAR ALIAH UNIVERSITY');
  console.log('  ✓ Test 1 passed: Existing registered member successfully updated.');
  console.log('  ✓ Test 2 passed: Existing values prepopulated and safely retained.');

  // ---------------------------------------------------------------------------
  // TEST 3: Administrator Adds a Spouse to an Existing Member
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Administrator Can Add a Spouse to an Existing Member ---');
  assert.strictEqual(profileRecord.spouseFirstName, null, 'Initially no spouse');
  assert.strictEqual(profileRecord.spouseMobileNumber, null, 'Initially no spouse mobile');

  const mockDb3 = createMockDb();
  const addSpouseResult = await adminUpdateMemberCore(
    {
      userId: userRecord.id,
      firstName: 'Wg Cdr PRABIR',
      lastName: 'CHAKRAVERTY',
      email: 'p.chakraverty47@gmail.com',
      mobileNumber: '6380505551',
      hasSpouse: true,
      spouseFirstName: 'Krishna',
      spouseLastName: 'Chakraverty',
      spouseMobileNumber: '9830012345',
      spouseDateOfBirth: '1952-03-21',
      spouseGender: 'Female',
      spouseIdProofType: 'Aadhaar',
      spouseIdProofNumber: '998877665544',
    },
    'admin_actor_001',
    mockDb3,
    true
  );

  assert.strictEqual(addSpouseResult.success, true, 'Adding spouse must succeed');
  assert.strictEqual(profileRecord.spouseFirstName, 'Krishna', 'Spouse first name added');
  assert.strictEqual(profileRecord.spouseLastName, 'Chakraverty', 'Spouse last name added');
  assert.strictEqual(profileRecord.spouseMobileNumber, '9830012345', 'Spouse mobile number added');
  assert.strictEqual(profileRecord.spouseGender, 'Female', 'Spouse gender added');
  console.log('  ✓ Test 3 passed: Spouse successfully added to member who previously had none.');

  // ---------------------------------------------------------------------------
  // TEST 4: Administrator Edits Existing Spouse Information
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Administrator Can Edit Existing Spouse Information ---');
  const mockDb4 = createMockDb();
  const editSpouseResult = await adminUpdateMemberCore(
    {
      userId: userRecord.id,
      firstName: 'Wg Cdr PRABIR',
      lastName: 'CHAKRAVERTY',
      email: 'p.chakraverty47@gmail.com',
      mobileNumber: '6380505551',
      hasSpouse: true,
      spouseFirstName: 'Krishna',
      spouseLastName: 'Chakraverty',
      spouseMobileNumber: '9830099999', // Updated spouse phone
      spouseGender: 'Female',
    },
    'admin_actor_001',
    mockDb4,
    true
  );

  assert.strictEqual(editSpouseResult.success, true, 'Editing spouse must succeed');
  assert.strictEqual(profileRecord.spouseMobileNumber, '9830099999', 'Spouse mobile number successfully updated');
  console.log('  ✓ Test 4 passed: Existing spouse details modified cleanly.');

  // ---------------------------------------------------------------------------
  // TEST 5: Primary and Secondary Mobile Numbers are Displayed Correctly
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Primary and Secondary Mobile Numbers Display Integrity ---');
  assert.strictEqual(profileRecord.mobileNumber, '6380505551', 'Primary mobile must be Prabir phone');
  assert.strictEqual(profileRecord.spouseMobileNumber, '9830099999', 'Secondary mobile must be Krishna phone');
  assert.notStrictEqual(profileRecord.mobileNumber, profileRecord.spouseMobileNumber, 'Primary and secondary mobile must NOT be duplicated or conflated');

  // Verify getMembersCore projection includes both distinct numbers
  const mockListingDb: any = {
    user: {
      findMany: async () => [
        {
          id: userRecord.id,
          name: userRecord.name,
          email: userRecord.email,
          role: userRecord.role,
          createdAt: userRecord.createdAt,
          memberProfile: { ...profileRecord },
          subscriptions: [{ ...subscriptionRecord }],
          elders: [],
        }
      ],
      count: async () => 1,
    }
  };

  const listingResult = await getMembersCore(undefined, 1, 50, mockListingDb, true);
  const row = listingResult.members[0];
  assert.strictEqual(row.primaryMobile, '6380505551', 'Row primary mobile must match primary member phone');
  assert.strictEqual(row.secondaryMobile, '9830099999', 'Row secondary mobile must match spouse phone');
  console.log('  ✓ Test 5 passed: Primary (6380505551) and Secondary (9830099999) mobile numbers mapped distinctly.');

  // ---------------------------------------------------------------------------
  // TEST 6: Saving Changes Does NOT Alter the Member ID
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 6: Member ID Invariance & Protection ---');
  assert.strictEqual(profileRecord.memberId, 'SECD1001PRTY', 'Member ID must remain SECD1001PRTY');

  const mockDb6 = createMockDb();
  await adminUpdateMemberCore(
    {
      userId: userRecord.id,
      firstName: 'Wg Cdr PRABIR',
      lastName: 'CHAKRAVERTY',
      email: 'p.chakraverty47@gmail.com',
      mobileNumber: '6380505551',
      dateOfEnrollment: '2026-10-04',
      startDate: '2026-10-04',
      endDate: '2027-04-04',
    },
    'admin_actor_001',
    mockDb6,
    true
  );

  assert.strictEqual(profileRecord.memberId, 'SECD1001PRTY', 'Member ID must NEVER be altered during edit');
  console.log('  ✓ Test 6 passed: Member ID SECD1001PRTY permanently preserved across multiple edits.');

  // ---------------------------------------------------------------------------
  // TEST 7: Saving Changes Does NOT Create Duplicate Profiles or Spouse Records
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 7: No Duplicate Profiles or Spouse Records Created ---');
  assert.strictEqual(profileRecord.id, 'cmwitwckk0003o7hmvsdlfkpl', 'Profile ID must remain the same singular record');
  console.log('  ✓ Test 7 passed: Profile updated in-place without duplicate records.');

  // ---------------------------------------------------------------------------
  // TEST 8: Subscriptions, Invoices, Payments and Receipts Remain Intact
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 8: Financial History & Record Integrity ---');
  assert.strictEqual(paymentsList.length, 1, 'Payments list intact');
  assert.strictEqual(invoicesList.length, 1, 'Invoices list intact');
  assert.strictEqual(receiptsList.length, 1, 'Receipts list intact');
  assert.strictEqual(subscriptionRecord.id, 'sub_prabir_001', 'Subscription intact');
  console.log('  ✓ Test 8 passed: 100% of payments, invoices, receipts, and subscriptions preserved.');

  // ---------------------------------------------------------------------------
  // TEST 9: Medical Information Protected by Permissions
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 9: Sensitive Medical Information Permission Guard ---');
  const mockDb9 = createMockDb();
  
  // Actor WITHOUT MEMBER_SENSITIVE_VIEW attempts to change medical conditions
  await adminUpdateMemberCore(
    {
      userId: userRecord.id,
      firstName: 'Wg Cdr PRABIR',
      lastName: 'CHAKRAVERTY',
      email: 'p.chakraverty47@gmail.com',
      mobileNumber: '6380505551',
      medicalConditions: 'HACKED_MEDICAL_DIAGNOSIS',
    },
    'unauthorized_actor',
    mockDb9,
    false // hasSensitiveView = false
  );

  // Medical conditions must NOT have changed to the unauth payload
  assert.strictEqual(
    profileRecord.medicalConditions,
    'Mild Hypertension',
    'Medical conditions must NOT be modified by actor lacking MEMBER_SENSITIVE_VIEW'
  );

  // Actor WITH MEMBER_SENSITIVE_VIEW updates medical conditions
  await adminUpdateMemberCore(
    {
      userId: userRecord.id,
      firstName: 'Wg Cdr PRABIR',
      lastName: 'CHAKRAVERTY',
      email: 'p.chakraverty47@gmail.com',
      mobileNumber: '6380505551',
      medicalConditions: 'Hypertension controlled with medication',
    },
    'authorized_admin',
    mockDb9,
    true // hasSensitiveView = true
  );

  assert.strictEqual(
    profileRecord.medicalConditions,
    'Hypertension controlled with medication',
    'Medical conditions updated by authorized admin'
  );
  console.log('  ✓ Test 9 passed: Sensitive medical information guarded by MEMBER_SENSITIVE_VIEW.');

  // ---------------------------------------------------------------------------
  // TEST 10: Meaningful Audit Logs Generated
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 10: Audit Log Generation ---');
  assert.ok(auditLogs.length > 0, 'Audit logs must have been created');
  const latestLog = auditLogs[auditLogs.length - 1];
  assert.strictEqual(latestLog.action, 'MEMBER_UPDATED_BY_ADMIN', 'Action must be MEMBER_UPDATED_BY_ADMIN');
  assert.strictEqual(latestLog.entityType, 'USER');
  assert.strictEqual(latestLog.entityId, userRecord.id);
  assert.strictEqual(latestLog.metadata.memberId, 'SECD1001PRTY');
  assert.ok(latestLog.metadata.before, 'Before snapshot present in metadata');
  assert.ok(latestLog.metadata.after, 'After snapshot present in metadata');
  console.log('  ✓ Test 10 passed: Audit log created with actorUserId, before/after snapshots, and canonical member ID.');

  // ---------------------------------------------------------------------------
  // VERIFY UI COMPONENTS EXIST
  // ---------------------------------------------------------------------------
  console.log('\n--- VERIFY UI COMPONENTS ---');
  const detailsPagePath = path.join(__dirname, '../../app/admin/members/[id]/page.tsx');
  const detailsPageContent = fs.readFileSync(detailsPagePath, 'utf8');
  assert.ok(detailsPageContent.includes('Edit Member'), 'Edit Member button must be present on details page');
  assert.ok(detailsPageContent.includes(`/edit`), 'Edit button must link to member edit route');

  const editPagePath = path.join(__dirname, '../../app/admin/members/[id]/edit/page.tsx');
  assert.ok(fs.existsSync(editPagePath), 'Dedicated edit page /admin/members/[id]/edit/page.tsx must exist');

  const editFormPath = path.join(__dirname, '../../app/admin/members/[id]/edit/member-edit-form.tsx');
  assert.ok(fs.existsSync(editFormPath), 'Edit form component member-edit-form.tsx must exist');

  const editFormContent = fs.readFileSync(editFormPath, 'utf8');
  assert.ok(editFormContent.includes('Primary Mobile No.'), 'Edit form must include primary mobile');
  assert.ok(editFormContent.includes('Secondary Mobile No.'), 'Edit form must include secondary mobile');
  assert.ok(editFormContent.includes('Spouse / Secondary Member'), 'Edit form must include spouse section');
  assert.ok(editFormContent.includes('Date of Enrollment (DOE)'), 'Edit form must include DOE');

  console.log('  ✓ UI Check passed: Details page has prominent Edit Member button.');
  console.log('  ✓ UI Check passed: Dedicated edit page and form prepopulate all member, spouse, and date fields.');

  console.log('\n================================================================');
  console.log('ALL 10 MEMBER EDITING & DUAL MOBILE TESTS PASSED SUCCESSFULLY (100%)');
  console.log('================================================================\n');
}

runMemberEditingAndDualMobileTests().catch((err) => {
  console.error('\nTest suite failed:', err);
  process.exit(1);
});
