import assert from "node:assert";
import { MemberIdentityService } from "@/lib/services/member-identity";
import { formatMembershipDate } from "@/app/admin/members/page";
import { updateMembershipDatesCore } from "@/app/actions/admin";

async function runTests() {
  console.log("================================================================");
  console.log("PERMANENT DATE OF ENROLMENT (DOE) VERIFICATION TEST SUITE");
  console.log("================================================================\n");

  // Mock in-memory state
  let profileStore: any = null;
  let subscriptionStore: any[] = [];
  let userStore: any = {
    id: "user_test_1001",
    name: "Dr Subhash Chandra",
    email: "subhash.chandra@example.com",
  };

  const mockDbClient = {
    memberProfile: {
      findUnique: async ({ where }: any) => {
        if (where.userId === userStore.id) return profileStore;
        return null;
      },
      update: async ({ where, data }: any) => {
        if (where.userId === userStore.id && profileStore) {
          profileStore = { ...profileStore, ...data };
          return profileStore;
        }
        return null;
      },
      create: async ({ data }: any) => {
        profileStore = { id: "profile_1001", ...data };
        return profileStore;
      },
    },
    user: {
      findUnique: async () => userStore,
    },
    memberSequence: {
      upsert: async () => ({ current: 1025 }),
    },
    subscription: {
      findUnique: async ({ where }: any) => {
        return subscriptionStore.find((s) => s.id === where.id) || null;
      },
      update: async ({ where, data }: any) => {
        const idx = subscriptionStore.findIndex((s) => s.id === where.id);
        if (idx >= 0) {
          subscriptionStore[idx] = { ...subscriptionStore[idx], ...data };
          return subscriptionStore[idx];
        }
        return null;
      },
      create: async ({ data }: any) => {
        const newSub = { id: `sub_${subscriptionStore.length + 1}`, ...data };
        subscriptionStore.push(newSub);
        return newSub;
      },
    },
    auditLog: {
      create: async () => ({ id: "audit_1" }),
    },
    $transaction: async (cb: any) => cb(mockDbClient),
  };

  // ---------------------------------------------------------------------------
  // TEST 1: New successful registration automatically saves original enrolment date
  // ---------------------------------------------------------------------------
  console.log("[TEST 1] New successful registration automatically saves permanent original enrollmentDate");

  // Create initial profile without memberId (pre-payment onboarding state)
  profileStore = {
    id: "profile_1001",
    userId: userStore.id,
    firstName: "Subhash",
    lastName: "Chandra",
    salutation: "Dr",
    memberId: null,
    enrollmentDate: null,
    dateOfEnrollment: null,
  };

  const assignedMemberId = await MemberIdentityService.ensureMemberIdForUser(
    userStore.id,
    "SINGLE",
    mockDbClient
  );

  assert.ok(assignedMemberId, "Member ID should be generated");
  assert.ok(profileStore.memberId, "Member ID should be saved on profile");
  assert.ok(profileStore.enrollmentDate instanceof Date, "enrollmentDate should be a Date instance");
  assert.ok(profileStore.dateOfEnrollment instanceof Date, "dateOfEnrollment should be a Date instance");
  assert.strictEqual(
    profileStore.enrollmentDate.getTime(),
    profileStore.dateOfEnrollment.getTime(),
    "enrollmentDate and dateOfEnrollment must match exactly"
  );

  const originalEnrollmentTimestamp = profileStore.enrollmentDate.getTime();
  const originalEnrollmentIso = profileStore.enrollmentDate.toISOString();
  console.log(`✓ Original enrollmentDate automatically recorded: ${originalEnrollmentIso}`);
  console.log(`✓ Assigned canonical Member ID: ${profileStore.memberId}`);

  // Create first subscription (1 Year: 20 Nov 2026 to 19 Nov 2027)
  const sub1 = await mockDbClient.subscription.create({
    data: {
      userId: userStore.id,
      carePlanId: "plan_peace_mind",
      variantType: "SINGLE",
      durationMonths: 12,
      startDate: new Date("2026-11-20T00:00:00.000Z"),
      endDate: new Date("2027-11-19T23:59:59.999Z"),
      status: "ACTIVE",
    },
  });

  // ---------------------------------------------------------------------------
  // TEST 2: Renewal changes current subscription dates but NOT original enrolment date
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 2] Renewal creates renewed subscription period while preserving original enrollmentDate");

  // Simulate renewal: calling ensureMemberIdForUser for existing member during renewal settlement
  const ensuredIdOnRenewal = await MemberIdentityService.ensureMemberIdForUser(
    userStore.id,
    "SINGLE",
    mockDbClient
  );
  assert.strictEqual(ensuredIdOnRenewal, assignedMemberId, "Member ID must remain unchanged on renewal");

  // Create renewed subscription (20 Nov 2027 to 19 Nov 2028)
  const sub2 = await mockDbClient.subscription.create({
    data: {
      userId: userStore.id,
      carePlanId: "plan_peace_mind",
      variantType: "SINGLE",
      durationMonths: 12,
      startDate: new Date("2027-11-20T00:00:00.000Z"),
      endDate: new Date("2028-11-19T23:59:59.999Z"),
      status: "ACTIVE",
    },
  });

  // Expire sub1
  await mockDbClient.subscription.update({
    where: { id: sub1.id },
    data: { status: "EXPIRED" },
  });

  assert.strictEqual(
    profileStore.enrollmentDate.getTime(),
    originalEnrollmentTimestamp,
    "Original enrollmentDate must NOT be modified or recalculated by renewal"
  );
  assert.strictEqual(
    profileStore.dateOfEnrollment.getTime(),
    originalEnrollmentTimestamp,
    "dateOfEnrollment must NOT be modified by renewal"
  );
  console.log(`✓ Post-renewal profile enrollmentDate: ${profileStore.enrollmentDate.toISOString()}`);
  console.log(`✓ Active renewed subscription: FROM ${sub2.startDate.toISOString()} TO ${sub2.endDate.toISOString()}`);

  // ---------------------------------------------------------------------------
  // TEST 3: Multiple consecutive renewals continue preserving the exact same original date
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 3] Multiple consecutive renewals preserve original enrolment date");

  for (let year = 2028; year <= 2030; year++) {
    await MemberIdentityService.ensureMemberIdForUser(userStore.id, "SINGLE", mockDbClient);
    await mockDbClient.subscription.create({
      data: {
        userId: userStore.id,
        carePlanId: "plan_peace_mind",
        variantType: "SINGLE",
        durationMonths: 12,
        startDate: new Date(`${year}-11-20T00:00:00.000Z`),
        endDate: new Date(`${year + 1}-11-19T23:59:59.999Z`),
        status: "ACTIVE",
      },
    });

    assert.strictEqual(
      profileStore.enrollmentDate.getTime(),
      originalEnrollmentTimestamp,
      `Original date must be strictly preserved across renewal for year ${year}`
    );
  }
  console.log(`✓ Verified across 3 consecutive renewals: permanent date remains ${originalEnrollmentIso}`);

  // ---------------------------------------------------------------------------
  // TEST 4: Editing membership dates does not modify the original enrolment date
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 4] Editing membership dates does not modify the original enrolment date");

  const latestSub = subscriptionStore[subscriptionStore.length - 1];
  const editResult = await updateMembershipDatesCore(
    latestSub.id,
    "2030-12-01",
    "2031-11-30",
    "admin_tester",
    mockDbClient
  );

  assert.strictEqual(editResult.success, true, "updateMembershipDatesCore must succeed");
  const updatedSub = subscriptionStore.find((s) => s.id === latestSub.id);
  assert.strictEqual(updatedSub.startDate.toISOString().split("T")[0], "2030-12-01");

  assert.strictEqual(
    profileStore.enrollmentDate.getTime(),
    originalEnrollmentTimestamp,
    "Original enrollmentDate must remain intact after editing membership dates"
  );
  console.log(`✓ Membership dates successfully updated to 01 Dec 2030`);
  console.log(`✓ Profile enrollmentDate remains intact at ${profileStore.enrollmentDate.toISOString()}`);

  // ---------------------------------------------------------------------------
  // TEST 5: Members table displays correct DOE independently of FROM and TO
  // ---------------------------------------------------------------------------
  console.log("\n[TEST 5] Members table displays correct DOE independently of FROM and TO");

  // Test Member table formatting
  // Case A: Member with backdated coverage (e.g. Wg Cdr Prabir Chakraverty enrolled 16 Nov, coverage from 04 Oct)
  const sampleMemberA = {
    memberProfile: {
      enrollmentDate: new Date("2026-11-16T05:36:43.882Z"),
      dateOfEnrollment: new Date("2026-11-16T05:36:43.882Z"),
    },
    subscriptions: [
      {
        startDate: new Date("2026-10-04T00:00:00.000Z"),
        endDate: new Date("2027-04-04T00:00:00.000Z"),
      },
    ],
  };

  const doeDisplayA = formatMembershipDate(
    sampleMemberA.memberProfile.enrollmentDate || sampleMemberA.memberProfile.dateOfEnrollment
  );
  const fromDisplayA = formatMembershipDate(sampleMemberA.subscriptions[0].startDate);
  const toDisplayA = formatMembershipDate(sampleMemberA.subscriptions[0].endDate);

  assert.strictEqual(doeDisplayA, "16 Nov 2026", "DOE must show 16 Nov 2026");
  assert.strictEqual(fromDisplayA, "04 Oct 2026", "FROM must show 04 Oct 2026");
  assert.strictEqual(toDisplayA, "04 Apr 2027", "TO must show 04 Apr 2027");
  console.log(`✓ Backdated member: DOE = '${doeDisplayA}' | FROM = '${fromDisplayA}' | TO = '${toDisplayA}'`);

  // Case B: Renewed member (e.g. Enrolled in 2026, renewed in 2027)
  const sampleMemberB = {
    memberProfile: {
      enrollmentDate: new Date("2026-11-20T05:30:00.000Z"),
      dateOfEnrollment: new Date("2026-11-20T05:30:00.000Z"),
    },
    subscriptions: [
      {
        startDate: new Date("2027-11-20T00:00:00.000Z"),
        endDate: new Date("2028-11-19T23:59:59.999Z"),
      },
    ],
  };

  const doeDisplayB = formatMembershipDate(sampleMemberB.memberProfile.enrollmentDate);
  const fromDisplayB = formatMembershipDate(sampleMemberB.subscriptions[0].startDate);
  const toDisplayB = formatMembershipDate(sampleMemberB.subscriptions[0].endDate);

  assert.strictEqual(doeDisplayB, "20 Nov 2026", "DOE must show original enrollment year 2026");
  assert.strictEqual(fromDisplayB, "20 Nov 2027", "FROM must show renewed year 2027");
  assert.strictEqual(toDisplayB, "20 Nov 2028", "TO must show renewed year 2028");
  console.log(`✓ Renewed member: DOE = '${doeDisplayB}' | FROM = '${fromDisplayB}' | TO = '${toDisplayB}'`);

  // Case C: Unassigned profile (missing DOE)
  const sampleMemberC = {
    memberProfile: {
      enrollmentDate: null,
      dateOfEnrollment: null,
    },
    subscriptions: [],
  };
  const doeDisplayC = formatMembershipDate(sampleMemberC.memberProfile.enrollmentDate);
  assert.strictEqual(doeDisplayC, "—", "Missing DOE must display em-dash '—'");
  console.log(`✓ Unassigned profile: DOE = '${doeDisplayC}'`);

  console.log("\n================================================================");
  console.log("ALL 5 ENROLMENT-DATE REQUIREMENTS VERIFIED SUCCESSFULLY! (5/5)");
  console.log("================================================================");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
