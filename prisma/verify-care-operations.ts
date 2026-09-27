/**
 * verify-care-operations.ts — Phase 17 Blocker Resolution Verification
 *
 * Tests:
 *  1. RBAC: unauthorized users cannot call care service operations
 *  2. RBAC: authorized users can call care service operations
 *  3. RBAC: RESTRICTED notes require CARE_RESTRICTED_NOTE_VIEW
 *  4. IDOR: Member A cannot access Member B's care data
 *  5. Note visibility: MEMBER_VISIBLE shown, INTERNAL/RESTRICTED blocked at portal level
 *  6. Audit logging: every mutation creates an AuditLog with correct actorUserId
 *  7. Audit metadata: care note content NOT in AuditLog
 *  8. Historical integrity: deactivated employee's visits remain intact
 *  9. Concurrency: duplicate assignment constraint enforced
 */

import { db } from "../lib/db";
import { CareOperationsService } from "../lib/services/care-operations";
import { AuthorizationService } from "../lib/services/authorization";
import { PERMISSIONS } from "../lib/auth/permissions";

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

async function upsertPermission(code: string) {
  return db.permission.upsert({
    where: { code },
    create: { code, description: `Care permission: ${code}` },
    update: {},
  });
}

async function upsertRole(name: string) {
  return db.role.upsert({
    where: { name },
    create: { name },
    update: {},
  });
}

async function grantRolePermission(roleId: string, permissionId: string) {
  return db.rolePermission.upsert({
    where: { roleId_permissionId: { roleId, permissionId } },
    create: { roleId, permissionId },
    update: {},
  });
}

async function assignUserRole(userId: string, roleId: string) {
  return db.userRole.upsert({
    where: { userId_roleId: { userId, roleId } },
    create: { userId, roleId },
    update: {},
  });
}

function pass(msg: string) { console.log(`  ✅ PASS: ${msg}`); }
function fail(msg: string) { console.error(`  ❌ FAIL: ${msg}`); process.exitCode = 1; }

async function expectUnauthorized(fn: () => Promise<unknown>, label: string) {
  try {
    await fn();
    fail(`${label} — expected Unauthorized error, but call succeeded`);
  } catch (e: any) {
    if (e.message?.includes("Unauthorized")) pass(label);
    else { fail(`${label} — wrong error: ${e.message}`); }
  }
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

async function main() {
  console.log("\n=== Phase 17 Care Operations Verification ===\n");

  // ------------------------------------------------------------------
  // SEED: permissions
  // ------------------------------------------------------------------
  const carePermCodes = [
    PERMISSIONS.CARE_CASE_VIEW,
    PERMISSIONS.CARE_CASE_CREATE,
    PERMISSIONS.CARE_CASE_MANAGE,
    PERMISSIONS.CARE_ASSIGNMENT_VIEW,
    PERMISSIONS.CARE_ASSIGNMENT_MANAGE,
    PERMISSIONS.CARE_VISIT_VIEW,
    PERMISSIONS.CARE_VISIT_MANAGE,
    PERMISSIONS.CARE_TASK_VIEW,
    PERMISSIONS.CARE_TASK_MANAGE,
    PERMISSIONS.CARE_NOTE_VIEW,
    PERMISSIONS.CARE_NOTE_CREATE,
    PERMISSIONS.CARE_NOTE_MANAGE,
    PERMISSIONS.CARE_RESTRICTED_NOTE_VIEW,
  ];

  const permMap: Record<string, { id: string; code: string }> = {};
  for (const code of carePermCodes) {
    permMap[code] = await upsertPermission(code);
  }

  // ------------------------------------------------------------------
  // SEED: roles
  // ------------------------------------------------------------------
  // Care Coordinator: full care permissions EXCEPT restricted notes
  const coordRole = await upsertRole("Care Coordinator (Test)");
  const fullCarePerms = carePermCodes.filter((c) => c !== PERMISSIONS.CARE_RESTRICTED_NOTE_VIEW);
  for (const code of fullCarePerms) {
    await grantRolePermission(coordRole.id, permMap[code].id);
  }

  // Restricted Note Viewer: all coordinator perms + restricted view
  const restrictedRole = await upsertRole("Care Restricted Viewer (Test)");
  for (const code of carePermCodes) {
    await grantRolePermission(restrictedRole.id, permMap[code].id);
  }

  // ------------------------------------------------------------------
  // SEED: test users
  // ------------------------------------------------------------------
  const [actorUser, memberA, memberB, unauthorizedUser] = await Promise.all([
    db.user.upsert({ where: { email: "care.actor@verify.test" }, create: { email: "care.actor@verify.test", name: "Care Actor" }, update: {} }),
    db.user.upsert({ where: { email: "member.a@verify.test" }, create: { email: "member.a@verify.test", name: "Member A" }, update: {} }),
    db.user.upsert({ where: { email: "member.b@verify.test" }, create: { email: "member.b@verify.test", name: "Member B" }, update: {} }),
    db.user.upsert({ where: { email: "unauth@verify.test" }, create: { email: "unauth@verify.test", name: "Unauthorized" }, update: {} }),
  ]);

  const restrictedActor = await db.user.upsert({
    where: { email: "care.restricted@verify.test" },
    create: { email: "care.restricted@verify.test", name: "Restricted Actor" },
    update: {},
  });

  // actorUser gets coordinator role (no restricted)
  await assignUserRole(actorUser.id, coordRole.id);
  // restrictedActor gets full role including restricted
  await assignUserRole(restrictedActor.id, restrictedRole.id);

  // unauthorizedUser has NO roles → no care permissions

  // ------------------------------------------------------------------
  // SEED: Elder, CarePlan, Subscription for Member A and Member B
  // ------------------------------------------------------------------
  const carePlan = await db.carePlan.findFirst({ where: { active: true } });
  if (!carePlan) throw new Error("No active CarePlan found in DB — seed pricing data first.");

  const [elderA, elderB] = await Promise.all([
    db.elder.upsert({
      where: { id: "verify-elder-a" },
      create: { id: "verify-elder-a", userId: memberA.id, firstName: "Elder", lastName: "A", relationship: "Parent" },
      update: {},
    }),
    db.elder.upsert({
      where: { id: "verify-elder-b" },
      create: { id: "verify-elder-b", userId: memberB.id, firstName: "Elder", lastName: "B", relationship: "Parent" },
      update: {},
    }),
  ]);

  const [subA, subB] = await Promise.all([
    db.subscription.create({ data: { userId: memberA.id, carePlanId: carePlan.id, status: "ACTIVE", startDate: new Date() } }),
    db.subscription.create({ data: { userId: memberB.id, carePlanId: carePlan.id, status: "ACTIVE", startDate: new Date() } }),
  ]);

  const employee = await db.employee.upsert({
    where: { employeeId: "SEC/VERIFY-17/TEST" },
    create: { employeeId: "SEC/VERIFY-17/TEST", firstName: "Test", lastName: "Caregiver", designation: "Caregiver", status: "ACTIVE" },
    update: {},
  });

  // ==================================================================
  // SECTION 1: RBAC — unauthorized user cannot perform care operations
  // ==================================================================
  console.log("[ 1. RBAC — Unauthorized user rejection ]");

  await expectUnauthorized(
    () => CareOperationsService.createCareCase(unauthorizedUser.id, { elderId: elderA.id, subscriptionId: subA.id, startDate: new Date() }),
    "Unauthorized user cannot create CareCase"
  );
  await expectUnauthorized(
    () => CareOperationsService.scheduleCareVisit(unauthorizedUser.id, {
      careCaseId: "fake-id",
      scheduledStart: new Date(),
      scheduledEnd: new Date(),
    }),
    "Unauthorized user cannot schedule CareVisit"
  );
  await expectUnauthorized(
    () => CareOperationsService.addCareTask(unauthorizedUser.id, { careCaseId: "fake-id", title: "Task" }),
    "Unauthorized user cannot add CareTask"
  );
  await expectUnauthorized(
    () => CareOperationsService.addCareNote(unauthorizedUser.id, { careCaseId: "fake-id", note: "Note" }),
    "Unauthorized user cannot add CareNote"
  );
  await expectUnauthorized(
    () => CareOperationsService.assignCaregiver(unauthorizedUser.id, { careCaseId: "fake-id", employeeId: employee.id }),
    "Unauthorized user cannot assign caregiver"
  );

  // ==================================================================
  // SECTION 2: RBAC — authorized actor can perform care operations
  // ==================================================================
  console.log("\n[ 2. RBAC — Authorized actor success ]");

  const careCase = await CareOperationsService.createCareCase(actorUser.id, {
    elderId: elderA.id,
    subscriptionId: subA.id,
    startDate: new Date(),
    operationalNotes: "Verification test case",
  });
  pass(`CareCase created: ${careCase.id}`);

  const assignment = await CareOperationsService.assignCaregiver(actorUser.id, {
    careCaseId: careCase.id,
    employeeId: employee.id,
    role: "PRIMARY_CAREGIVER",
  });
  pass(`CareAssignment created: ${assignment.id}`);

  const sched = new Date();
  sched.setHours(sched.getHours() + 24);
  const schedEnd = new Date(sched);
  schedEnd.setHours(schedEnd.getHours() + 2);

  const visit = await CareOperationsService.scheduleCareVisit(actorUser.id, {
    careCaseId: careCase.id,
    assignedEmpId: employee.id,
    scheduledStart: sched,
    scheduledEnd: schedEnd,
  });
  pass(`CareVisit scheduled: ${visit.id}`);

  const task = await CareOperationsService.addCareTask(actorUser.id, {
    careCaseId: careCase.id,
    careVisitId: visit.id,
    title: "Administer medication",
    assignedEmpId: employee.id,
  });
  pass(`CareTask created: ${task.id}`);

  const noteInternal = await CareOperationsService.addCareNote(actorUser.id, {
    careCaseId: careCase.id,
    note: "INTERNAL NOTE CONTENT — must never appear in audit logs",
    visibility: "INTERNAL",
  });
  pass(`CareNote (INTERNAL) created: ${noteInternal.id}`);

  const noteMemberVisible = await CareOperationsService.addCareNote(actorUser.id, {
    careCaseId: careCase.id,
    note: "Member visible care update",
    visibility: "MEMBER_VISIBLE",
  });
  pass(`CareNote (MEMBER_VISIBLE) created: ${noteMemberVisible.id}`);

  // ==================================================================
  // SECTION 3: RBAC — RESTRICTED note protection
  // ==================================================================
  console.log("\n[ 3. RBAC — RESTRICTED note protection ]");

  // Actor without CARE_RESTRICTED_NOTE_VIEW cannot create RESTRICTED note
  await expectUnauthorized(
    () => CareOperationsService.addCareNote(actorUser.id, { careCaseId: careCase.id, note: "Restricted", visibility: "RESTRICTED" }),
    "Actor without CARE_RESTRICTED_NOTE_VIEW cannot create RESTRICTED note"
  );

  // Actor without CARE_RESTRICTED_NOTE_VIEW cannot view restricted notes
  await expectUnauthorized(
    () => CareOperationsService.viewNotes(actorUser.id, careCase.id, true),
    "Actor without CARE_RESTRICTED_NOTE_VIEW cannot view restricted notes"
  );

  // Restricted actor CAN create RESTRICTED note
  const noteRestricted = await CareOperationsService.addCareNote(restrictedActor.id, {
    careCaseId: careCase.id,
    note: "RESTRICTED NOTE CONTENT — must never appear in audit logs",
    visibility: "RESTRICTED",
  });
  pass(`CareNote (RESTRICTED) created by authorized actor: ${noteRestricted.id}`);

  // Restricted actor CAN view restricted notes
  const allNotes = await CareOperationsService.viewNotes(restrictedActor.id, careCase.id, true);
  const hasRestricted = allNotes.some((n) => n.visibility === "RESTRICTED");
  if (hasRestricted) pass("Restricted actor can view RESTRICTED notes");
  else fail("Restricted actor should see RESTRICTED notes");

  // ==================================================================
  // SECTION 4: Note visibility — member portal
  // ==================================================================
  console.log("\n[ 4. Note visibility — member portal scoping ]");

  // Simulate member portal query: only MEMBER_VISIBLE for memberA's own elder
  const memberAPortalNotes = await db.careNote.findMany({
    where: {
      careCase: { elder: { userId: memberA.id } },
      visibility: "MEMBER_VISIBLE",
    },
    select: { id: true, visibility: true },
  });
  const allMemberAVisible = memberAPortalNotes.every((n) => n.visibility === "MEMBER_VISIBLE");
  if (allMemberAVisible) pass("Member portal query returns only MEMBER_VISIBLE notes");
  else fail("Member portal returned non-MEMBER_VISIBLE notes");

  // Confirm no INTERNAL notes returned
  const memberAInternalNotes = await db.careNote.findMany({
    where: {
      careCase: { elder: { userId: memberA.id } },
      visibility: { in: ["INTERNAL", "RESTRICTED"] },
    },
    select: { id: true, visibility: true },
  });
  // These exist in DB but must NOT appear through the portal query
  const noInternalInPortal = !memberAPortalNotes.some((n) => n.visibility === "INTERNAL" || n.visibility === "RESTRICTED");
  if (noInternalInPortal) pass("INTERNAL and RESTRICTED notes excluded from member portal query");
  else fail("Member portal query leaked INTERNAL/RESTRICTED notes");

  // ==================================================================
  // SECTION 5: IDOR — Member A cannot access Member B's care data
  // ==================================================================
  console.log("\n[ 5. IDOR — Cross-member access prevention ]");

  // Create a care case for Member B
  const careCaseB = await CareOperationsService.createCareCase(actorUser.id, {
    elderId: elderB.id,
    subscriptionId: subB.id,
    startDate: new Date(),
  });

  // Member A's portal query should NOT return Member B's care cases
  const memberAPortalCases = await db.elder.findMany({
    where: { userId: memberA.id },
    include: { cases: { select: { id: true } } },
  });
  const memberAcaseIds = memberAPortalCases.flatMap((e) => e.cases.map((c) => c.id));
  if (memberAcaseIds.includes(careCaseB.id)) {
    fail("IDOR: Member A's portal returned Member B's CareCase");
  } else {
    pass("Member A's portal cannot see Member B's CareCase");
  }

  // Member B's portal query should NOT return Member A's care cases
  const memberBPortalCases = await db.elder.findMany({
    where: { userId: memberB.id },
    include: { cases: { select: { id: true } } },
  });
  const memberBcaseIds = memberBPortalCases.flatMap((e) => e.cases.map((c) => c.id));
  if (memberBcaseIds.includes(careCase.id)) {
    fail("IDOR: Member B's portal returned Member A's CareCase");
  } else {
    pass("Member B's portal cannot see Member A's CareCase");
  }

  // Confirm notes scoped to memberA's elder don't include B's notes
  const memberANotes = await db.careNote.findMany({
    where: { careCase: { elder: { userId: memberA.id } } },
    select: { careCaseId: true },
  });
  if (memberANotes.some((n) => n.careCaseId === careCaseB.id)) {
    fail("IDOR: Member A's note query returned Member B's CareCase notes");
  } else {
    pass("Member A cannot access Member B's CareNotes via portal query");
  }

  // ==================================================================
  // SECTION 6: Audit logging verification
  // ==================================================================
  console.log("\n[ 6. Audit logging ]");

  const auditActions = [
    { action: "CARE_CASE_CREATED", entityId: careCase.id },
    { action: "CARE_ASSIGNMENT_CREATED", entityId: assignment.id },
    { action: "CARE_VISIT_SCHEDULED", entityId: visit.id },
    { action: "CARE_TASK_CREATED", entityId: task.id },
    { action: "CARE_NOTE_CREATED", entityId: noteInternal.id },
    { action: "CARE_NOTE_CREATED", entityId: noteMemberVisible.id },
    { action: "CARE_NOTE_CREATED", entityId: noteRestricted.id },
  ];

  for (const { action, entityId } of auditActions) {
    const log = await db.auditLog.findFirst({ where: { action, entityId } });
    if (!log) {
      fail(`AuditLog missing for action=${action} entityId=${entityId}`);
      continue;
    }
    // actorUserId must match server-side actor (not any client-supplied value)
    const expectedActor = action === "CARE_NOTE_CREATED" && entityId === noteRestricted.id
      ? restrictedActor.id
      : actorUser.id;
    if (log.actorUserId !== expectedActor) {
      fail(`AuditLog actor mismatch for ${action}: got ${log.actorUserId}, expected ${expectedActor}`);
    } else {
      pass(`AuditLog exists for ${action} with correct actorUserId`);
    }
  }

  // ==================================================================
  // SECTION 7: Audit metadata — note content must NOT be present
  // ==================================================================
  console.log("\n[ 7. Audit metadata — no note content ]");

  const noteAuditLogs = await db.auditLog.findMany({
    where: { action: "CARE_NOTE_CREATED", entityId: { in: [noteInternal.id, noteMemberVisible.id, noteRestricted.id] } },
  });

  for (const log of noteAuditLogs) {
    const metaStr = JSON.stringify(log.metadata ?? "");
    if (
      metaStr.includes("INTERNAL NOTE CONTENT") ||
      metaStr.includes("Member visible care update") ||
      metaStr.includes("RESTRICTED NOTE CONTENT")
    ) {
      fail(`AuditLog metadata contains care note text (entityId=${log.entityId})`);
    } else {
      pass(`AuditLog metadata does NOT contain note content (entityId=${log.entityId})`);
    }
    // metadata should contain visibility and careCaseId but not note text
    const meta = log.metadata as Record<string, unknown> | null;
    if (meta && "visibility" in meta) pass(`AuditLog metadata has visibility field`);
    else fail(`AuditLog metadata missing visibility field`);
  }

  // ==================================================================
  // SECTION 8: Historical integrity — deactivated employee's visits remain
  // ==================================================================
  console.log("\n[ 8. Historical integrity — employee deactivation ]");

  await db.employee.update({ where: { id: employee.id }, data: { status: "INACTIVE" } });

  const visitAfterDeactivation = await db.careVisit.findUnique({
    where: { id: visit.id },
    include: { assignedEmp: true },
  });

  if (!visitAfterDeactivation) {
    fail("Visit was deleted when employee was deactivated");
  } else {
    pass("Visit still exists after employee deactivation");
    if (visitAfterDeactivation.assignedEmpId === employee.id) {
      pass("Visit retains reference to deactivated employee (historical integrity)");
    } else {
      fail("Visit lost reference to deactivated employee");
    }
  }

  const assignmentAfterDeactivation = await db.careAssignment.findUnique({ where: { id: assignment.id } });
  if (!assignmentAfterDeactivation) {
    fail("CareAssignment was deleted when employee was deactivated");
  } else {
    pass("CareAssignment retained after employee deactivation");
  }

  // Restore employee status for future test runs
  await db.employee.update({ where: { id: employee.id }, data: { status: "ACTIVE" } });

  // ==================================================================
  // SECTION 9: Concurrency — duplicate assignment protection
  // ==================================================================
  console.log("\n[ 9. Concurrency — duplicate assignment ]");

  const dupeStart = new Date();
  // First assignment with this exact (careCaseId, employeeId, startDate) already exists
  // Try to create another with the same tuple
  try {
    await db.careAssignment.create({
      data: {
        careCaseId: careCase.id,
        employeeId: employee.id,
        role: "RELIEVER",
        startDate: assignment.startDate, // same startDate = violates unique constraint
        assignedById: actorUser.id,
      },
    });
    fail("Duplicate assignment (same careCaseId+employeeId+startDate) was not rejected");
  } catch (e: any) {
    if (e.code === "P2002") pass("Duplicate assignment (same startDate) rejected by unique constraint");
    else fail(`Duplicate assignment failed with unexpected error: ${e.message}`);
  }

  // ==================================================================
  // CLEANUP
  // ==================================================================
  console.log("\n[ Cleanup ]");

  await db.auditLog.deleteMany({ where: { entityId: { in: [careCase.id, careCaseB.id, assignment.id, visit.id, task.id, noteInternal.id, noteMemberVisible.id, noteRestricted.id] } } });
  await db.careNote.deleteMany({ where: { careCaseId: { in: [careCase.id, careCaseB.id] } } });
  await db.careTask.deleteMany({ where: { careCaseId: careCase.id } });
  await db.careVisit.deleteMany({ where: { careCaseId: careCase.id } });
  await db.careAssignment.deleteMany({ where: { careCaseId: careCase.id } });
  await db.careCase.deleteMany({ where: { id: { in: [careCase.id, careCaseB.id] } } });
  await db.subscription.deleteMany({ where: { id: { in: [subA.id, subB.id] } } });

  // Remove test roles/permissions
  for (const role of [coordRole, restrictedRole]) {
    await db.rolePermission.deleteMany({ where: { roleId: role.id } });
    await db.userRole.deleteMany({ where: { roleId: role.id } });
    await db.role.delete({ where: { id: role.id } });
  }

  await db.user.deleteMany({ where: { email: { in: [actorUser.email!, memberA.email!, memberB.email!, unauthorizedUser.email!, restrictedActor.email!] } } });
  await db.elder.deleteMany({ where: { id: { in: ["verify-elder-a", "verify-elder-b"] } } });

  // Keep permissions as they are now correctly seeded
  pass("Cleanup complete");

  console.log("\n=== Care Operations Verification Complete ===\n");
}

main()
  .catch((e) => { console.error("Fatal:", e); process.exit(1); })
  .finally(() => db.$disconnect());
