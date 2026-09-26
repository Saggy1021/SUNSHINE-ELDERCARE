import { db } from "../lib/db";
import { CustomPlanService } from "../lib/services/custom-plan";
import { AuthorizationService } from "../lib/services/authorization";

async function runTests() {
  console.log("Starting Phase 14 Membership History & Custom Plans Verification...\n");

  try {
    // 1. RBAC Tests for Custom Plans
    console.log("Testing Custom Plan Admin Authorization...");
    const testAdmin = await db.user.create({
      data: { email: 'admin_custom@example.com', name: 'Custom Admin' }
    });
    const testMember = await db.user.create({
      data: { email: 'member_custom@example.com', name: 'Member Custom' }
    });

    const permView = await db.permission.upsert({
      where: { code: 'CUSTOM_PLAN_VIEW' },
      create: { code: 'CUSTOM_PLAN_VIEW' },
      update: {}
    });
    const permCreate = await db.permission.upsert({
      where: { code: 'CUSTOM_PLAN_CREATE' },
      create: { code: 'CUSTOM_PLAN_CREATE' },
      update: {}
    });

    const role = await db.role.create({
      data: { name: 'Custom Plan Manager' }
    });

    await db.rolePermission.createMany({
      data: [
        { roleId: role.id, permissionId: permView.id },
        { roleId: role.id, permissionId: permCreate.id }
      ]
    });

    await db.userRole.create({
      data: { userId: testAdmin.id, roleId: role.id }
    });

    const canMemberCreate = await AuthorizationService.can(testMember.id, 'CUSTOM_PLAN_CREATE');
    if (canMemberCreate) throw new Error("Member incorrectly authorized to create custom plan");
    
    const canAdminCreate = await AuthorizationService.can(testAdmin.id, 'CUSTOM_PLAN_CREATE');
    if (!canAdminCreate) throw new Error("Admin not authorized to create custom plan");
    console.log("✅ Custom plan admin authorization passed.");

    // 2. Custom Plan Duration Calculation
    console.log("Testing Custom Duration Implementation...");
    const startDate = new Date('2027-01-01');
    const endDays = CustomPlanService.calculateEndDate(startDate, 'DAYS', 15);
    const endMonths = CustomPlanService.calculateEndDate(startDate, 'MONTHS', 6);
    const endYears = CustomPlanService.calculateEndDate(startDate, 'YEARS', 1);

    if (endDays.toISOString().split('T')[0] !== '2027-01-16') throw new Error("Days calculation failed");
    if (endMonths.toISOString().split('T')[0] !== '2027-07-01') throw new Error("Months calculation failed");
    if (endYears.toISOString().split('T')[0] !== '2028-01-01') throw new Error("Years calculation failed");
    console.log("✅ Custom duration calculated server-side passed.");

    // 3. Custom Plan DB Model
    console.log("Testing Custom Plan Model...");
    const customPlan = await db.customPlanAgreement.create({
      data: {
        userId: testMember.id,
        createdByUserId: testAdmin.id,
        name: "Special Plan",
        amount: 15000,
        durationType: 'MONTHS',
        durationValue: 6,
        startDate: startDate,
        calculatedEndDate: endMonths
      }
    });

    if (customPlan.amount.toNumber() !== 15000) throw new Error("Custom amount not stored correctly");
    console.log("✅ Custom plan model passed.");

    // 4. Membership History Preservation
    console.log("Testing Membership History Preservation...");
    const oldSub = await db.subscription.create({
      data: {
        userId: testMember.id,
        status: "EXPIRED",
        durationMonths: 12,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2026-01-01')
      }
    });

    const newSub = await db.subscription.create({
      data: {
        userId: testMember.id,
        status: "ACTIVE",
        customPlanId: customPlan.id,
        startDate: new Date('2026-01-02')
      }
    });

    const memberSubs = await db.subscription.findMany({ where: { userId: testMember.id } });
    if (memberSubs.length !== 2) throw new Error("Historical subscription was not preserved!");
    
    console.log("✅ Membership history passed (Old records preserved).");

    // Clean up
    await db.subscription.deleteMany({ where: { userId: testMember.id } });
    await db.customPlanAgreement.deleteMany({ where: { userId: testMember.id } });
    await db.userRole.deleteMany({ where: { userId: testAdmin.id } });
    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    await db.role.delete({ where: { id: role.id } });
    await db.user.deleteMany({ where: { id: { in: [testMember.id, testAdmin.id] } } });
    
    console.log("\n✅ All Phase 14 Tests Passed!");

  } catch (err) {
    console.error("❌ Test Failed:", err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

runTests();
