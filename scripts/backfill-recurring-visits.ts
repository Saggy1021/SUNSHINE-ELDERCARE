/**
 * Sunshine Eldercare — Safe Backfill Script for Recurring Care Visits
 *
 * Idempotently generates recurring visits across the rolling 90-day horizon (Asia/Kolkata)
 * for all existing eligible members:
 * 1. Active care package with recurring visit entitlements (Shield Shine / Semi Shield Shine).
 * 2. Configured preferred visit day and time.
 * 3. Weekly or Fortnightly recurrence patterns.
 * 4. Strictly preserves existing visits, assignments, and historical data without creating duplicates.
 */

import { db } from "../lib/db";
import { RecurringSchedulerService } from "../lib/services/recurring-scheduler";

async function main() {
  console.log("================================================================================");
  console.log("🔄 SUNSHINE ELDERCARE — RECURRING CARE VISIT BACKFILL SCRIPT");
  console.log("================================================================================\n");

  const totalMembersBefore = await db.memberProfile.count();
  const totalVisitsBefore = await db.careVisit.count();
  const totalRecurringBefore = await db.careVisit.count({ where: { occurrenceType: "RECURRING" } });
  const totalAdhocBefore = await db.careVisit.count({ where: { occurrenceType: "ADHOC" } });

  console.log(`📊 Current Database State (Pre-Backfill):`);
  console.log(`   - Total Member Profiles: ${totalMembersBefore}`);
  console.log(`   - Total Care Visits:     ${totalVisitsBefore}`);
  console.log(`   - Recurring Visits:      ${totalRecurringBefore}`);
  console.log(`   - Ad-hoc Visits:         ${totalAdhocBefore}\n`);

  console.log("🚀 Executing safe backfill for all eligible existing members (90-day horizon)...");
  const startTime = Date.now();
  const result = await RecurringSchedulerService.reconcileAllEligibleMembers({
    force: true,
    horizonDays: 90,
  });
  const duration = Date.now() - startTime;

  console.log(`\n✅ Backfill Completed in ${duration}ms!`);
  console.log(`   - Success:                 ${result.success}`);
  console.log(`   - Eligible Members Found:  ${result.totalEligibleMembers}`);
  console.log(`   - Visits Generated:        ${result.totalVisitsGenerated}`);
  console.log(`   - Visits Skipped/Preserved:${result.totalVisitsSkipped}`);
  console.log(`   - Errors Encountered:      ${result.errors.length}`);

  if (result.details.length > 0) {
    console.log("\n📋 Per-Member Breakdown:");
    console.table(
      result.details.map((d) => ({
        "Member ID": d.memberId || "N/A",
        Name: d.name,
        "Day & Time": `${d.preferredDay} @ ${d.preferredTime}`,
        Schedule: `${d.frequency}${d.pattern ? " (" + d.pattern + ")" : ""}`,
        "Generated (New)": d.generated,
        "Skipped (Pre-existing)": d.skipped,
      }))
    );
  }

  if (result.errors.length > 0) {
    console.warn("\n⚠️ Errors Encountered:", result.errors);
  }

  // Idempotence Verification Run
  console.log("\n🧪 Running Idempotence Verification (Re-running reconciliation)...");
  const idempotenceRun = await RecurringSchedulerService.reconcileAllEligibleMembers({
    force: true,
    horizonDays: 90,
  });

  console.log(`   - Second Run Generated: ${idempotenceRun.totalVisitsGenerated} (Expected: 0)`);
  console.log(`   - Second Run Skipped:   ${idempotenceRun.totalVisitsSkipped}`);
  if (idempotenceRun.totalVisitsGenerated === 0) {
    console.log("   ✅ Idempotence Verified: Exactly 0 duplicate visits generated on repeated run.\n");
  } else {
    console.error("   ❌ Idempotence FAILED: Duplicate visits were generated!");
    process.exit(1);
  }

  const totalMembersAfter = await db.memberProfile.count();
  const totalVisitsAfter = await db.careVisit.count();
  const totalRecurringAfter = await db.careVisit.count({ where: { occurrenceType: "RECURRING" } });
  const totalAdhocAfter = await db.careVisit.count({ where: { occurrenceType: "ADHOC" } });

  console.log(`📊 Final Database State (Post-Backfill):`);
  console.log(`   - Total Member Profiles: ${totalMembersAfter} (unchanged: ${totalMembersBefore === totalMembersAfter})`);
  console.log(`   - Total Care Visits:     ${totalVisitsAfter} (+${totalVisitsAfter - totalVisitsBefore} visits created)`);
  console.log(`   - Recurring Visits:      ${totalRecurringAfter} (+${totalRecurringAfter - totalRecurringBefore} recurring)`);
  console.log(`   - Ad-hoc Visits:         ${totalAdhocAfter} (unchanged: ${totalAdhocBefore === totalAdhocAfter})`);
  console.log("\n================================================================================");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  });
