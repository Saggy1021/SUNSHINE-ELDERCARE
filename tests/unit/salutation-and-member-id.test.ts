import assert from 'node:assert';
import { MemberIdentityService } from '../../lib/services/member-identity';
import { executeAdminOnboardMember } from '../../lib/services/admin-onboarding';
import { adminUpdateMemberCore, getMembersCore } from '../../app/actions/admin';
import { memberRegistrationSchema } from '../../lib/validations/member';

function createMockDependencies(customOverrides: {
  variantType?: 'SINGLE' | 'COUPLE';
  months?: number;
  documentedTotal?: number;
} = {}) {
  const store = {
    user: null as any,
    profile: null as any,
    emergency: null as any,
    sponsor: null as any,
    subscription: null as any,
    payment: null as any,
  };

  const mockDb: any = {
    user: {
      findUnique: async () => null,
      create: async ({ data }: any) => {
        store.user = { id: `usr_${Date.now()}`, ...data };
        return store.user;
      },
    },
    memberProfile: {
      create: async ({ data }: any) => {
        store.profile = { id: `prof_${Date.now()}`, ...data };
        return store.profile;
      },
    },
    emergencyContact: {
      create: async ({ data }: any) => {
        store.emergency = { id: `emg_${Date.now()}`, ...data };
        return store.emergency;
      },
    },
    sponsor: {
      create: async ({ data }: any) => {
        store.sponsor = { id: `spn_${Date.now()}`, ...data };
        return store.sponsor;
      },
    },
    subscription: {
      create: async ({ data }: any) => {
        store.subscription = { id: `sub_${Date.now()}`, ...data };
        return store.subscription;
      },
    },
    payment: {
      create: async ({ data }: any) => {
        store.payment = { id: `pay_${Date.now()}`, ...data };
        return store.payment;
      },
    },
    auditLog: {
      create: async () => ({}),
    },
    $transaction: async (cb: any) => cb(mockDb),
  };

  const mockPricing = {
    lookupPrice: async () => ({
      planSlug: 'shield-shine',
      variantType: customOverrides.variantType || 'SINGLE',
      carePlanId: 'shield-shine',
      months: customOverrides.months || 6,
      documentedTotal: customOverrides.documentedTotal || 18000,
    }),
  };

  const mockInvoices = {
    createCarePlanInvoice: async () => ({ id: 'inv_1', invoiceNumber: 'INV-001' }),
  };

  return { store, mockDb, mockPricing, mockInvoices };
}

async function runSalutationAndMemberIdTests() {
  console.log('================================================================');
  console.log('Sunshine Eldercare — Salutation & Member ID Generation Test Suite');
  console.log('================================================================\n');

  // ===========================================================================
  // TEST 1: Primary Member: Blank Salutation Defaults to "Mr"
  // ===========================================================================
  console.log('--- TEST 1: Primary Member: Blank Salutation Defaults to Mr ---');
  {
    const { store, mockDb, mockPricing, mockInvoices } = createMockDependencies();

    const formData = new FormData();
    formData.append(
      'memberData',
      JSON.stringify({
        salutation: '', // Blank salutation
        firstName: 'Basudeb',
        lastName: 'Kundu',
        email: 'basudeb.blank@test.com',
        password: 'Password123!',
        mobileNumber: '9876543210',
        dateOfBirth: '1950-01-01',
        gender: 'Male',
        serviceAddress: 'Salt Lake City, Kolkata',
        emergencyContactName: 'Rahul Kundu',
        emergencyContactRelationship: 'Son',
        emergencyContactMobile: '9876543211',
      })
    );
    formData.append('planId', 'shield-shine');
    formData.append('months', '6');
    formData.append('paymentMethod', 'OFFLINE');

    const result = await executeAdminOnboardMember(formData, 'admin_001', {
      dbClient: mockDb,
      pricing: mockPricing,
      invoices: mockInvoices,
    });

    assert.strictEqual(result.success, true, 'Onboarding must succeed');
    assert.strictEqual(store.profile.salutation, 'Mr', 'Profile salutation must default to Mr');
    assert.strictEqual(store.user.name, 'Mr Basudeb Kundu', 'User full name must format with default Mr');
    console.log('  ✓ Verified primary member with blank salutation defaults to "Mr".');
  }

  // ===========================================================================
  // TEST 2: Primary Member: "Dr" Salutation Preserved and Displayed
  // ===========================================================================
  console.log('\n--- TEST 2: Primary Member: Dr Salutation Preserved and Displayed ---');
  {
    const { store, mockDb, mockPricing, mockInvoices } = createMockDependencies();

    const formData = new FormData();
    formData.append(
      'memberData',
      JSON.stringify({
        salutation: 'Dr', // Explicit Dr
        firstName: 'Anirban',
        lastName: 'Mukherjee',
        email: 'dr.anirban@test.com',
        password: 'Password123!',
        mobileNumber: '9876543212',
        dateOfBirth: '1955-05-15',
        gender: 'Male',
        serviceAddress: 'New Town, Kolkata',
        emergencyContactName: 'Riya Mukherjee',
        emergencyContactRelationship: 'Daughter',
        emergencyContactMobile: '9876543213',
      })
    );
    formData.append('planId', 'shield-shine');
    formData.append('months', '6');
    formData.append('paymentMethod', 'OFFLINE');

    const result = await executeAdminOnboardMember(formData, 'admin_001', {
      dbClient: mockDb,
      pricing: mockPricing,
      invoices: mockInvoices,
    });

    assert.strictEqual(result.success, true, 'Onboarding must succeed');
    assert.strictEqual(store.profile.salutation, 'Dr', 'Profile salutation must be Dr');
    assert.strictEqual(store.user.name, 'Dr Anirban Mukherjee', 'User full name must display Dr Anirban Mukherjee');
    console.log('  ✓ Verified primary member with "Dr" preserves and displays "Dr".');
  }

  // ===========================================================================
  // TEST 3: Spouse: Blank Salutation Defaults to "Mr"
  // ===========================================================================
  console.log('\n--- TEST 3: Spouse: Blank Salutation Defaults to Mr ---');
  {
    const { store, mockDb, mockPricing, mockInvoices } = createMockDependencies({ variantType: 'COUPLE' });

    const formData = new FormData();
    formData.append(
      'memberData',
      JSON.stringify({
        salutation: 'Mrs',
        firstName: 'Sunita',
        lastName: 'Banerjee',
        email: 'sunita@test.com',
        password: 'Password123!',
        mobileNumber: '9876543214',
        dateOfBirth: '1960-03-20',
        gender: 'Female',
        serviceAddress: 'Ballygunge, Kolkata',
        // Spouse provided with blank salutation
        spouseSalutation: '   ',
        spouseFirstName: 'Soumen',
        spouseLastName: 'Banerjee',
        emergencyContactName: 'Amit Banerjee',
        emergencyContactRelationship: 'Son',
        emergencyContactMobile: '9876543215',
      })
    );
    formData.append('planId', 'shield-shine');
    formData.append('months', '12');
    formData.append('paymentMethod', 'OFFLINE');

    const result = await executeAdminOnboardMember(formData, 'admin_001', {
      dbClient: mockDb,
      pricing: mockPricing,
      invoices: mockInvoices,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(store.profile.spouseSalutation, 'Mr', 'Blank spouse salutation must default to Mr');
    assert.strictEqual(store.profile.spouseFirstName, 'Soumen');
    console.log('  ✓ Verified spouse with blank salutation defaults to "Mr".');
  }

  // ===========================================================================
  // TEST 4: Spouse: "Mrs" Salutation Preserved and Displayed
  // ===========================================================================
  console.log('\n--- TEST 4: Spouse: Mrs Salutation Preserved and Displayed ---');
  {
    const { store, mockDb, mockPricing, mockInvoices } = createMockDependencies({ variantType: 'COUPLE' });

    const formData = new FormData();
    formData.append(
      'memberData',
      JSON.stringify({
        salutation: 'Mr',
        firstName: 'Basudeb',
        lastName: 'Kundu',
        email: 'basudeb.kundu@test.com',
        password: 'Password123!',
        mobileNumber: '9876543216',
        dateOfBirth: '1952-11-10',
        gender: 'Male',
        serviceAddress: 'Alipore, Kolkata',
        // Spouse provided with Mrs salutation
        spouseSalutation: 'Mrs',
        spouseFirstName: 'Archana',
        spouseLastName: 'Kundu',
        emergencyContactName: 'Deepak Kundu',
        emergencyContactRelationship: 'Son',
        emergencyContactMobile: '9876543217',
      })
    );
    formData.append('planId', 'shield-shine');
    formData.append('months', '12');
    formData.append('paymentMethod', 'OFFLINE');

    const result = await executeAdminOnboardMember(formData, 'admin_001', {
      dbClient: mockDb,
      pricing: mockPricing,
      invoices: mockInvoices,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(store.profile.spouseSalutation, 'Mrs', 'Spouse salutation must be Mrs');
    assert.strictEqual(store.profile.spouseFirstName, 'Archana');
    assert.strictEqual(store.profile.spouseLastName, 'Kundu');
    console.log('  ✓ Verified spouse with "Mrs" preserves and displays "Mrs".');
  }

  // ===========================================================================
  // TEST 5: Sponsor: Blank Salutation Defaults to "Mr"
  // ===========================================================================
  console.log('\n--- TEST 5: Sponsor: Blank Salutation Defaults to Mr ---');
  {
    const { store, mockDb, mockPricing, mockInvoices } = createMockDependencies();

    const formData = new FormData();
    formData.append(
      'memberData',
      JSON.stringify({
        salutation: 'Mr',
        firstName: 'Pradip',
        lastName: 'Sen',
        email: 'pradip.sen@test.com',
        password: 'Password123!',
        mobileNumber: '9876543218',
        dateOfBirth: '1948-07-04',
        gender: 'Male',
        serviceAddress: 'Salt Lake, Kolkata',
        emergencyContactName: 'Rina Sen',
        emergencyContactRelationship: 'Daughter',
        emergencyContactMobile: '9876543219',
        // Sponsor details with blank salutation
        sponsorSalutation: '',
        sponsorFirstName: 'Subir',
        sponsorLastName: 'Sen',
        sponsorRelationship: 'Son',
        sponsorMobile: '9876543220',
      })
    );
    formData.append('planId', 'shield-shine');
    formData.append('months', '6');
    formData.append('paymentMethod', 'OFFLINE');

    const result = await executeAdminOnboardMember(formData, 'admin_001', {
      dbClient: mockDb,
      pricing: mockPricing,
      invoices: mockInvoices,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(store.sponsor.salutation, 'Mr', 'Blank sponsor salutation must default to Mr');
    assert.strictEqual(store.sponsor.firstName, 'Subir');
    assert.strictEqual(store.sponsor.lastName, 'Sen');
    assert.strictEqual(store.sponsor.fullName, 'Mr Subir Sen');
    console.log('  ✓ Verified sponsor with blank salutation defaults to "Mr".');
  }

  // ===========================================================================
  // TEST 6: Sponsor: "Grp Cpt" Salutation Preserved and Displayed
  // ===========================================================================
  console.log('\n--- TEST 6: Sponsor: Grp Cpt Salutation Preserved and Displayed ---');
  {
    const { store, mockDb, mockPricing, mockInvoices } = createMockDependencies();

    const formData = new FormData();
    formData.append(
      'memberData',
      JSON.stringify({
        salutation: 'Mrs',
        firstName: 'Nandita',
        lastName: 'Chakraverty',
        email: 'nandita.c@test.com',
        password: 'Password123!',
        mobileNumber: '9876543221',
        dateOfBirth: '1950-02-14',
        gender: 'Female',
        serviceAddress: 'Jalvayee Towers, Kolkata',
        emergencyContactName: 'Ayan Chakraverty',
        emergencyContactRelationship: 'Son',
        emergencyContactMobile: '9876543222',
        // Sponsor details with military rank "Grp Cpt"
        sponsorSalutation: 'Grp Cpt',
        sponsorFirstName: 'Prabir',
        sponsorLastName: 'Chakraverty',
        sponsorRelationship: 'Husband',
        sponsorMobile: '9876543223',
      })
    );
    formData.append('planId', 'shield-shine');
    formData.append('months', '6');
    formData.append('paymentMethod', 'OFFLINE');

    const result = await executeAdminOnboardMember(formData, 'admin_001', {
      dbClient: mockDb,
      pricing: mockPricing,
      invoices: mockInvoices,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(store.sponsor.salutation, 'Grp Cpt', 'Sponsor salutation must be Grp Cpt');
    assert.strictEqual(store.sponsor.firstName, 'Prabir');
    assert.strictEqual(store.sponsor.lastName, 'Chakraverty');
    assert.strictEqual(store.sponsor.fullName, 'Grp Cpt Prabir Chakraverty');
    console.log('  ✓ Verified sponsor with "Grp Cpt" preserves and displays "Grp Cpt".');
  }

  // ===========================================================================
  // TEST 7: Custom Salutations & Professional / Military Ranks
  // ===========================================================================
  console.log('\n--- TEST 7: Custom Salutations & Professional / Military Ranks ---');
  {
    const ranks = ['Lt', 'Col', 'Brig', 'Capt', 'Prof', 'Wg Cdr', 'Major Gen'];

    for (const rank of ranks) {
      const { store, mockDb, mockPricing, mockInvoices } = createMockDependencies();

      const formData = new FormData();
      formData.append(
        'memberData',
        JSON.stringify({
          salutation: `  ${rank}  `, // With surrounding whitespace to verify trimming
          firstName: 'Siddhartha',
          lastName: 'Roy',
          email: `${rank.toLowerCase().replace(/\s+/g, '')}.roy@test.com`,
          password: 'Password123!',
          mobileNumber: '9876543224',
          dateOfBirth: '1945-09-09',
          gender: 'Male',
          serviceAddress: 'Park Street, Kolkata',
          emergencyContactName: 'Suman Roy',
          emergencyContactRelationship: 'Son',
          emergencyContactMobile: '9876543225',
        })
      );
      formData.append('planId', 'shield-shine');
      formData.append('months', '6');
      formData.append('paymentMethod', 'OFFLINE');

      const result = await executeAdminOnboardMember(formData, 'admin_001', {
        dbClient: mockDb,
        pricing: mockPricing,
        invoices: mockInvoices,
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(store.profile.salutation, rank, `Salutation must trim and preserve '${rank}'`);
      assert.strictEqual(store.user.name, `${rank} Siddhartha Roy`);
    }
    console.log('  ✓ Verified multiple custom salutations and ranks (Lt, Col, Brig, Capt, Prof, Wg Cdr, Major Gen).');
  }

  // ===========================================================================
  // TEST 8: Editing Existing Records Without Losing Data
  // ===========================================================================
  console.log('\n--- TEST 8: Editing Existing Records Without Losing Data ---');
  {
    let userRecord: any = {
      id: 'usr_edit_1',
      name: 'Mr Basudeb Kundu',
      email: 'basudeb.kundu@test.com',
      role: 'MEMBER',
      status: 'ACTIVE',
    };
    let profileRecord: any = {
      id: 'prof_edit_1',
      userId: 'usr_edit_1',
      memberId: 'SECD1002BADU', // Existing Member ID (BADU: BA from Basudeb + DU from Kundu)
      salutation: 'Mr',
      firstName: 'Basudeb',
      lastName: 'Kundu',
      mobileNumber: '9876543216',
      serviceAddress: 'Alipore, Kolkata',
      spouseSalutation: 'Mrs',
      spouseFirstName: 'Archana',
      spouseLastName: 'Kundu',
    };
    let sponsorRecord: any = {
      id: 'spn_edit_1',
      memberProfileId: 'prof_edit_1',
      salutation: 'Mr',
      firstName: 'Deepak',
      lastName: 'Kundu',
      fullName: 'Mr Deepak Kundu',
      relationship: 'Son',
      mobileNumber: '9876543217',
    };

    const mockDb: any = {
      $transaction: async (cb: any) => {
        const tx = {
          user: {
            findUnique: async () => ({
              ...userRecord,
              memberProfile: { ...profileRecord },
              emergencyContact: null,
            }),
            update: async ({ data }: any) => {
              userRecord = { ...userRecord, ...data };
              return userRecord;
            },
          },
          memberProfile: {
            update: async ({ data }: any) => {
              // Ensure memberId is NEVER updated
              if (data.memberId !== undefined) {
                throw new Error('FATAL: Attempted to modify memberId on profile edit!');
              }
              profileRecord = { ...profileRecord, ...data };
              return profileRecord;
            },
          },
          sponsor: {
            upsert: async ({ update, create }: any) => {
              sponsorRecord = { ...sponsorRecord, ...(update || create) };
              return sponsorRecord;
            },
          },
          emergencyContact: {
            upsert: async () => ({}),
          },
          insuranceDetails: {
            upsert: async () => ({}),
          },
          medicalAuthorization: {
            upsert: async () => ({}),
          },
          auditLog: {
            create: async () => ({}),
          },
        };
        return cb(tx);
      },
    };

    // Update salutations to custom values: Dr for primary, Dr for spouse, Capt for sponsor
    const updateResult = await adminUpdateMemberCore(
      {
        userId: 'usr_edit_1',
        salutation: 'Dr',
        firstName: 'Basudeb',
        lastName: 'Kundu',
        email: 'basudeb.kundu@test.com',
        mobileNumber: '9876543216',
        serviceAddress: 'Alipore, Kolkata',
        hasSpouse: true,
        spouseSalutation: 'Dr',
        spouseFirstName: 'Archana',
        spouseLastName: 'Kundu',
        sponsorSalutation: 'Capt',
        sponsorFirstName: 'Deepak',
        sponsorLastName: 'Kundu',
        sponsorRelationship: 'Son',
        sponsorMobile: '9876543217',
      },
      'admin_001',
      mockDb
    );

    assert.strictEqual(updateResult.success, true);
    assert.strictEqual(profileRecord.salutation, 'Dr', 'Primary salutation updated to Dr');
    assert.strictEqual(profileRecord.spouseSalutation, 'Dr', 'Spouse salutation updated to Dr');
    assert.strictEqual(sponsorRecord.salutation, 'Capt', 'Sponsor salutation updated to Capt');
    assert.strictEqual(sponsorRecord.fullName, 'Capt Deepak Kundu');
    assert.strictEqual(userRecord.name, 'Dr Basudeb Kundu');
    assert.strictEqual(profileRecord.memberId, 'SECD1002BADU', 'Existing Member ID must remain intact');
    console.log('  ✓ Verified editing existing records preserves memberId, updates salutations without data loss.');
  }

  // ===========================================================================
  // TEST 9: Member ID Generated Exclusively from Primary Member First and Last Name
  // (First 2 Letters of First Name + LAST 2 Letters of Surname)
  // ===========================================================================
  console.log('\n--- TEST 9: Member ID Generated Exclusively from First & Last Name (First 2 + Last 2) ---');
  {
    let currentSeq = 1001;
    const mockDbSeq: any = {
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

    // 1. Basudeb Kundu with "Mr" -> BA + DU = BADU
    const idWithMr = await MemberIdentityService.generateMemberId('Mr Basudeb', 'Kundu', 'D', mockDbSeq);
    assert.strictEqual(idWithMr, 'SECD1002BADU', 'ID must be SECD1002BADU (BA from Basudeb + DU from Kundu)');

    // 2. Basudeb Kundu with "Dr" -> BA + DU = BADU
    const idWithDr = await MemberIdentityService.generateMemberId('Dr Basudeb', 'Kundu', 'D', mockDbSeq);
    assert.strictEqual(idWithDr, 'SECD1003BADU', 'ID must be SECD1003BADU (BA from Basudeb + DU from Kundu)');

    // 3. Basudeb Kundu with "Grp Cpt" -> BA + DU = BADU
    const idWithGrpCpt = await MemberIdentityService.generateMemberId('Grp Cpt Basudeb', 'Kundu', 'D', mockDbSeq);
    assert.strictEqual(idWithGrpCpt, 'SECD1004BADU', 'ID must be SECD1004BADU (BA from Basudeb + DU from Kundu)');

    // 4. Clean First and Last Name (without prefix) -> BA + DU = BADU
    const idClean = await MemberIdentityService.generateMemberId('Basudeb', 'Kundu', 'D', mockDbSeq);
    assert.strictEqual(idClean, 'SECD1005BADU', 'ID must be SECD1005BADU');

    console.log('  ✓ Verified Member ID uses exclusively First 2 + Last 2 name letters; salutations NEVER alter the suffix.');
  }

  // ===========================================================================
  // TEST 10: Existing Member IDs Remain Strictly Unchanged
  // ===========================================================================
  console.log('\n--- TEST 10: Existing Member IDs Remain Strictly Unchanged ---');
  {
    // 1. Prabir Chakraverty special reservation (PR + TY = PRTY)
    const prabirId1 = await MemberIdentityService.generateMemberId('Wg Cdr PRABIR', 'CHAKRAVERTY', 'D');
    assert.strictEqual(prabirId1, 'SECD1001PRTY', 'Prabir reservation must strictly return SECD1001PRTY');

    const prabirId2 = await MemberIdentityService.generateMemberId('PRABIR', 'CHAKRAVERTY', 'D');
    assert.strictEqual(prabirId2, 'SECD1001PRTY', 'Prabir without title must strictly return SECD1001PRTY');

    // 2. ensureMemberIdForUser preserves existing memberId without re-generation
    const mockDbPreserve: any = {
      memberProfile: {
        findUnique: async () => ({
          memberId: 'SECD1002BADU',
          firstName: 'Basudeb',
          lastName: 'Kundu',
        }),
        update: async () => {
          throw new Error('Should not update already assigned canonical memberId');
        },
      },
    };

    const preservedId = await MemberIdentityService.ensureMemberIdForUser('usr_basudeb', 'COUPLE', mockDbPreserve);
    assert.strictEqual(preservedId, 'SECD1002BADU', 'Existing canonical ID must be returned unchanged');
    console.log('  ✓ Verified existing member IDs (SECD1001PRTY and SECD1002BADU) are strictly preserved.');
  }

  // ===========================================================================
  // TEST 11: Optional Spouse and Sponsor Details Remain Optional
  // ===========================================================================
  console.log('\n--- TEST 11: Optional Spouse and Sponsor Details Remain Optional ---');
  {
    // 1. Zod validation schema passes when spouse and sponsor are completely omitted
    const minimalData = {
      email: 'single.member@test.com',
      password: 'StrongPassword123!',
      salutation: '',
      firstName: 'Arup',
      lastName: 'Das',
      dateOfBirth: '1952-04-12',
      gender: 'Male' as const,
      serviceAddress: 'Jadavpur, Kolkata',
      mobileNumber: '9876543230',
      emergencyContactName: 'Manojit Das',
      emergencyContactRelationship: 'Brother',
      emergencyContactMobile: '9876543231',
    };

    const parseResult = memberRegistrationSchema.safeParse(minimalData);
    assert.strictEqual(parseResult.success, true, 'Minimal data without spouse or sponsor must pass validation');

    // 2. Onboarding works seamlessly without spouse or sponsor
    const { store, mockDb, mockPricing, mockInvoices } = createMockDependencies();

    const formData = new FormData();
    formData.append('memberData', JSON.stringify(minimalData));
    formData.append('planId', 'shield-shine');
    formData.append('months', '6');
    formData.append('paymentMethod', 'OFFLINE');

    const result = await executeAdminOnboardMember(formData, 'admin_001', {
      dbClient: mockDb,
      pricing: mockPricing,
      invoices: mockInvoices,
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(store.profile.spouseFirstName, null);
    assert.strictEqual(store.profile.spouseSalutation, null);
    assert.strictEqual(store.sponsor.firstName, null);
    assert.strictEqual(store.sponsor.lastName, null);
    console.log('  ✓ Verified optional spouse and sponsor details remain completely optional.');
  }

  // ---------------------------------------------------------------------------
  // TEST 12: Secondary Member Salutation Display in Members Table
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 12: Secondary Member Salutation Display in Members Table ---');
  {
    const mockMembersDb: any = {
      user: {
        findMany: async ({ where }: any) => {
          if (where?.status === 'ARCHIVED') return [];
          return [
            {
              id: 'usr_prabir_bose',
              name: 'Mr PRABIR KUMAR BOSE',
              email: 'prabir.bose@example.com',
              role: 'MEMBER',
              status: 'ACTIVE',
              createdAt: new Date('2026-11-01'),
              memberProfile: {
                memberId: 'SECD1006PRSE',
                salutation: 'Mr',
                firstName: 'PRABIR KUMAR',
                lastName: 'BOSE',
                spouseSalutation: 'Mrs',
                spouseFirstName: 'SWAPNA',
                spouseLastName: 'BOSE',
                spouseMobileNumber: '8420216101',
                dateOfEnrollment: new Date('2026-11-01'),
                serviceAddress: 'Salt Lake Sector 1',
                mobileNumber: '9433445577',
                bloodGroup: 'B+',
                medicalConditions: null,
                preferredVisitDay: null,
                preferredVisitTime: null,
                insuranceDetails: null,
              },
              subscriptions: [],
              elders: [],
            },
            {
              id: 'usr_ketaki',
              name: 'Mrs KETAKI MUKHERJEE',
              email: 'ketaki.mukherjee@example.com',
              role: 'MEMBER',
              status: 'ACTIVE',
              createdAt: new Date('2026-11-02'),
              memberProfile: {
                memberId: 'SECD1005KEEE',
                salutation: 'Mrs',
                firstName: 'KETAKI',
                lastName: 'MUKHERJEE',
                spouseSalutation: 'Mr',
                spouseFirstName: 'GOUTAM',
                spouseLastName: 'MUKHERJI',
                spouseMobileNumber: '8910984601',
                dateOfEnrollment: new Date('2026-11-02'),
                serviceAddress: 'Ballygunge Kolkata',
                mobileNumber: '9433007357',
                bloodGroup: 'O+',
                medicalConditions: null,
                preferredVisitDay: null,
                preferredVisitTime: null,
                insuranceDetails: null,
              },
              subscriptions: [],
              elders: [],
            },
            {
              id: 'usr_no_salutation',
              name: 'Mr ARUN ROY',
              email: 'arun.roy@example.com',
              role: 'MEMBER',
              status: 'ACTIVE',
              createdAt: new Date('2026-11-03'),
              memberProfile: {
                memberId: 'SECD1007AROY',
                salutation: 'Mr',
                firstName: 'ARUN',
                lastName: 'ROY',
                spouseSalutation: null,
                spouseFirstName: 'ANITA',
                spouseLastName: 'ROY',
                spouseMobileNumber: '9830012345',
                dateOfEnrollment: new Date('2026-11-03'),
                serviceAddress: 'Behala Kolkata',
                mobileNumber: '9830054321',
                bloodGroup: 'AB+',
                medicalConditions: null,
                preferredVisitDay: null,
                preferredVisitTime: null,
                insuranceDetails: null,
              },
              subscriptions: [],
              elders: [],
            },
            {
              id: 'usr_single_member',
              name: 'Mrs INDRANI GUPTA',
              email: 'indrani.gupta@example.com',
              role: 'MEMBER',
              status: 'ACTIVE',
              createdAt: new Date('2026-11-04'),
              memberProfile: {
                memberId: 'SECS1003INTA',
                salutation: 'Mrs',
                firstName: 'INDRANI',
                lastName: 'GUPTA',
                spouseSalutation: null,
                spouseFirstName: null,
                spouseLastName: null,
                spouseMobileNumber: null,
                dateOfEnrollment: new Date('2026-11-04'),
                serviceAddress: 'New Town Kolkata',
                mobileNumber: '9007976741',
                bloodGroup: 'A+',
                medicalConditions: null,
                preferredVisitDay: null,
                preferredVisitTime: null,
                insuranceDetails: null,
              },
              subscriptions: [],
              elders: [],
            },
          ];
        },
        count: async () => 4,
      },
    };

    const result = await getMembersCore(undefined, 1, 10, mockMembersDb, true);
    assert.strictEqual(result.members.length, 4);

    const swapnaMember = result.members.find((m: any) => m.id === 'usr_prabir_bose');
    assert.strictEqual(swapnaMember.secondaryName, 'Mrs SWAPNA BOSE', 'Spouse recorded as Mrs SWAPNA BOSE must render Mrs SWAPNA BOSE');

    const goutamMember = result.members.find((m: any) => m.id === 'usr_ketaki');
    assert.strictEqual(goutamMember.secondaryName, 'Mr GOUTAM MUKHERJI', 'Spouse recorded as Mr GOUTAM MUKHERJI must render Mr GOUTAM MUKHERJI');

    const noSalutationMember = result.members.find((m: any) => m.id === 'usr_no_salutation');
    assert.strictEqual(noSalutationMember.secondaryName, 'ANITA ROY', 'Spouse without salutation must render ANITA ROY without inventing one');

    const singleMember = result.members.find((m: any) => m.id === 'usr_single_member');
    assert.strictEqual(singleMember.secondaryName, null, 'Single member without spouse must have null secondaryName (displaying —)');

    console.log('  ✓ Verified Mrs SWAPNA BOSE appears as Mrs SWAPNA BOSE in Secondary Member column.');
    console.log('  ✓ Verified Mr GOUTAM MUKHERJI appears as Mr GOUTAM MUKHERJI in Secondary Member column.');
    console.log('  ✓ Verified spouse without salutation displays ANITA ROY without inventing one.');
    console.log('  ✓ Verified single member displays null (rendering —).');
  }

  console.log('\n================================================================');
  console.log('ALL 12 SALUTATION & MEMBER ID TESTS PASSED SUCCESSFULLY (100%)');
  console.log('================================================================\n');
}

runSalutationAndMemberIdTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
