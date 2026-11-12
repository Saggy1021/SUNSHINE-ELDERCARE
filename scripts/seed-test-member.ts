/**
 * scripts/seed-test-member.ts
 *
 * Seeds a fully provisioned, functional member account for local Member App testing.
 * Strictly constrained to the isolated local development database on 127.0.0.1:5433.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? '';
  if (!dbUrl.includes('127.0.0.1:5433') && !dbUrl.includes('localhost:5433')) {
    console.error('FATAL SAFETY GUARD: DATABASE_URL does not point to isolated 127.0.0.1:5433! Aborting.');
    process.exit(1);
  }

  console.log('Safety check passed: Connected to isolated local database on 127.0.0.1:5433.');

  const MEMBER_ID = 'SEC/S/1001/TEST';
  const PASSWORD = 'TestMember@2026';
  const EMAIL = 'test.member@sunshineeldercare.in';
  const FIRST_NAME = 'Sakuntala';
  const LAST_NAME = 'Roy';
  const NAME = `${FIRST_NAME} ${LAST_NAME}`;

  // 1. Resolve Care Plan & Variant
  const carePlan = await db.carePlan.findFirst({
    where: { slug: 'shield-shine' },
    include: {
      variants: {
        where: { variantType: 'SINGLE' },
        include: { services: true },
      },
    },
  });

  if (!carePlan || !carePlan.variants.length) {
    console.error('Error: Shield Shine (SINGLE) care plan not found in local database.');
    process.exit(1);
  }

  const variant = carePlan.variants[0];
  console.log(`Resolved Care Plan: ${carePlan.name} (${variant.variantType}) with ${variant.services.length} services.`);

  // 2. Hash Password using bcrypt
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // 3. Upsert User Record
  let user = await db.user.findFirst({
    where: {
      OR: [
        { email: EMAIL },
        { memberProfile: { memberId: MEMBER_ID } },
      ],
    },
    include: {
      memberProfile: {
        include: {
          sponsor: true,
          medicalAuth: true,
        },
      },
    },
  });

  if (user) {
    console.log(`Updating existing user: ${user.id} (${user.email})`);
    user = await db.user.update({
      where: { id: user.id },
      data: {
        email: EMAIL,
        name: NAME,
        passwordHash,
        role: 'MEMBER',
        status: 'ACTIVE',
        sessionVersion: { increment: 1 },
        emailVerified: new Date(),
      },
      include: {
        memberProfile: {
          include: {
            sponsor: true,
            medicalAuth: true,
          },
        },
      },
    });
  } else {
    console.log(`Creating new user for ${EMAIL}...`);
    user = await db.user.create({
      data: {
        email: EMAIL,
        name: NAME,
        passwordHash,
        role: 'MEMBER',
        status: 'ACTIVE',
        sessionVersion: 1,
        emailVerified: new Date(),
      },
      include: {
        memberProfile: {
          include: {
            sponsor: true,
            medicalAuth: true,
          },
        },
      },
    });
  }

  // 4. Upsert Member Profile
  let profile = user.memberProfile;
  if (profile) {
    console.log(`Updating existing member profile: ${profile.id}`);
    profile = await db.memberProfile.update({
      where: { id: profile.id },
      data: {
        memberId: MEMBER_ID,
        firstName: FIRST_NAME,
        lastName: LAST_NAME,
        gender: 'Female',
        mobileNumber: '+91 98300 12345',
        serviceAddress: 'Flat 4B, Sunshine Enclave, Salt Lake Sector V',
        nearestLandmark: 'Near Karunamoyee Metro',
        email: EMAIL,
        bloodGroup: 'O+',
        medicalConditions: 'Mild Hypertension (Medically Managed)',
      },
      include: {
        sponsor: true,
        medicalAuth: true,
      },
    });
  } else {
    console.log(`Creating member profile with Member ID ${MEMBER_ID}...`);
    profile = await db.memberProfile.create({
      data: {
        userId: user.id,
        memberId: MEMBER_ID,
        firstName: FIRST_NAME,
        lastName: LAST_NAME,
        gender: 'Female',
        mobileNumber: '+91 98300 12345',
        serviceAddress: 'Flat 4B, Sunshine Enclave, Salt Lake Sector V',
        nearestLandmark: 'Near Karunamoyee Metro',
        email: EMAIL,
        bloodGroup: 'O+',
        medicalConditions: 'Mild Hypertension (Medically Managed)',
      },
      include: {
        sponsor: true,
        medicalAuth: true,
      },
    });
  }

  // 5. Upsert Sponsor Relation (Family Emergency Contact)
  if (profile.sponsor) {
    await db.sponsor.update({
      where: { id: profile.sponsor.id },
      data: {
        fullName: 'Dr. Subhash Roy',
        relationship: 'Son',
        mobileNumber: '+91 98300 54321',
        email: 'subhash.roy@example.com',
      },
    });
  } else {
    await db.sponsor.create({
      data: {
        memberProfileId: profile.id,
        fullName: 'Dr. Subhash Roy',
        relationship: 'Son',
        mobileNumber: '+91 98300 54321',
        email: 'subhash.roy@example.com',
      },
    });
  }

  // 6. Upsert Medical Authorization (Hospital Preference)
  if (profile.medicalAuth) {
    await db.medicalAuthorization.update({
      where: { id: profile.medicalAuth.id },
      data: {
        hospitalForSos: 'Apollo Multispeciality Hospital, Kolkata',
        nomineeLocalContact: '+91 98300 54321',
        shiftAuthorization: true,
      },
    });
  } else {
    await db.medicalAuthorization.create({
      data: {
        memberProfileId: profile.id,
        hospitalForSos: 'Apollo Multispeciality Hospital, Kolkata',
        nomineeLocalContact: '+91 98300 54321',
        shiftAuthorization: true,
      },
    });
  }

  // 7. Ensure Active Subscription
  const existingSub = await db.subscription.findFirst({
    where: {
      userId: user.id,
      status: { in: ['ACTIVE', 'EXPIRING'] },
    },
  });

  const now = new Date();
  const endDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 365 days forward

  if (existingSub) {
    console.log(`Updating active subscription: ${existingSub.id}`);
    await db.subscription.update({
      where: { id: existingSub.id },
      data: {
        carePlanId: carePlan.id,
        variantType: 'SINGLE',
        status: 'ACTIVE',
        startDate: now,
        endDate: endDate,
        durationMonths: 12,
      },
    });
  } else {
    console.log('Creating 1-year active subscription...');
    await db.subscription.create({
      data: {
        userId: user.id,
        carePlanId: carePlan.id,
        variantType: 'SINGLE',
        status: 'ACTIVE',
        startDate: now,
        endDate: endDate,
        durationMonths: 12,
      },
    });
  }

  // 8. Persist Audit Log
  await db.auditLog.create({
    data: {
      actorUserId: user.id,
      action: 'TEST_MEMBER_PROVISIONED',
      entityType: 'USER',
      entityId: user.id,
      metadata: {
        purpose: 'Local functional testing on isolated database',
        memberId: MEMBER_ID,
        plan: carePlan.name,
      },
    },
  });

  console.log('\n================================================================');
  console.log('TEST MEMBER ACCOUNT PROVISIONED SUCCESSFULLY IN LOCAL DATABASE');
  console.log('================================================================');
  console.log(`Member ID:         ${MEMBER_ID}`);
  console.log(`Password:          ${PASSWORD}`);
  console.log(`Name:              ${NAME}`);
  console.log(`Email:             ${EMAIL}`);
  console.log(`Care Plan:         ${carePlan.name} (SINGLE)`);
  console.log(`Start Date:        ${now.toISOString()}`);
  console.log(`Expiry Date:       ${endDate.toISOString()}`);
  console.log('================================================================\n');
}

main()
  .catch((e) => {
    console.error('Failed to seed test member:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
