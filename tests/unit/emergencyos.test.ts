import assert from "node:assert";
import { db } from "../../lib/db";
import { EmergencyService } from "../../lib/services/emergency";
import { AuthorizationService } from "../../lib/services/authorization";

async function runTestSuite() {
  console.log("================================================================");
  console.log("EmergencyOS: Comprehensive Incident Management & Access Control Unit Tests");
  console.log("================================================================\n");

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(err);
      failed++;
    }
  }

  let createdIncidentId = "";
  let createdIncidentNumber = "";
  let testEmployeeId = "";
  let testActorId: string | null = null;

  // Find or create an employee for testing dispatch
  const employee = await db.employee.findFirst({ where: { status: "ACTIVE" } });
  if (employee) {
    testEmployeeId = employee.id;
  }

  const testUser = await db.user.findFirst();
  if (testUser) {
    testActorId = testUser.id;
  }

  // --- Test 1: Atomic Incident Number Generation ---
  await test("Test 1: Incident number format matches EMG-YYYYMMDD-XXX", async () => {
    const incNumber = await EmergencyService.generateIncidentNumber();
    assert.match(
      incNumber,
      /^EMG-\d{8}-\d{3}$/,
      `Expected format EMG-YYYYMMDD-XXX, got ${incNumber}`
    );
  });

  // --- Test 2: Role Separation & Access Control Boundary ---
  await test("Test 2: Emergency permissions DO NOT grant access to Admin Portal (/admin)", async () => {
    // Mock user permissions set containing ONLY emergency permissions
    const originalGetUserPermissions = AuthorizationService.getUserPermissions;
    try {
      (AuthorizationService as any).getUserPermissions = async () =>
        new Set([
          "EMERGENCY_INCIDENT_VIEW",
          "EMERGENCY_INCIDENT_OPERATE",
          "EMERGENCY_AUDIT_VIEW",
        ]);

      const testUserId = "operator-isolated-test-id";
      const hasAdmin = await AuthorizationService.hasAdminPortalAccess(
        testUserId,
        "operator@sunshineeldercare.in"
      );
      assert.strictEqual(
        hasAdmin,
        false,
        "Emergency operator MUST NOT have access to /admin"
      );

      const hasEmergency = await AuthorizationService.hasEmergencyAccess(
        testUserId,
        "operator@sunshineeldercare.in"
      );
      assert.strictEqual(
        hasEmergency,
        true,
        "Emergency operator MUST have access to /emergencyos"
      );

      const isSupervisor = await AuthorizationService.isEmergencySupervisor(
        testUserId,
        "operator@sunshineeldercare.in"
      );
      assert.strictEqual(
        isSupervisor,
        false,
        "Standard operator MUST NOT be supervisor"
      );
    } finally {
      AuthorizationService.getUserPermissions = originalGetUserPermissions;
    }
  });

  // --- Test 3: Supervisor Access Verification ---
  await test("Test 3: Supervisor permission correctly enables supervisory authority", async () => {
    const originalGetUserPermissions = AuthorizationService.getUserPermissions;
    try {
      (AuthorizationService as any).getUserPermissions = async () =>
        new Set([
          "EMERGENCY_INCIDENT_VIEW",
          "EMERGENCY_INCIDENT_OPERATE",
          "EMERGENCY_INCIDENT_SUPERVISE",
          "EMERGENCY_AUDIT_VIEW",
        ]);

      const testUserId = "supervisor-test-id";
      const isSupervisor = await AuthorizationService.isEmergencySupervisor(
        testUserId,
        "supervisor@sunshineeldercare.in"
      );
      assert.strictEqual(
        isSupervisor,
        true,
        "Supervisor MUST have supervisory authority"
      );
    } finally {
      AuthorizationService.getUserPermissions = originalGetUserPermissions;
    }
  });

  // --- Test 4: SOS Incident Creation ---
  await test("Test 4: SOS creation initializes CODE RED, TRIGGERED state & trackingActive=true", async () => {
    const incident = await EmergencyService.createIncident({
      callerName: "Test Elder Bose",
      callerPhone: "9830099999",
      triggerSource: "MEMBER_APP_SOS",
      triggerNotes: "Automated test SOS trigger",
      latitude: 22.5726,
      longitude: 88.3639,
      accuracy: 8.5,
      fallbackAddress: "Test Address, Salt Lake, Kolkata",
    });

    createdIncidentId = incident.id;
    createdIncidentNumber = incident.incidentNumber;

    assert.ok(incident.id, "Incident ID should exist");
    assert.strictEqual(incident.status, "TRIGGERED");
    assert.strictEqual(incident.classification, "CODE_RED");
    assert.strictEqual(incident.trackingActive, true);
    assert.strictEqual(incident.currentLatitude, 22.5726);
    assert.strictEqual(incident.currentLongitude, 88.3639);

    // Verify initial log was created
    const logs = await db.emergencyIncidentLog.findMany({
      where: { incidentId: incident.id },
    });
    assert.strictEqual(logs.length, 1);
    assert.strictEqual(logs[0].action, "TRIGGERED");
  });

  // --- Test 5: Incident Acknowledgment ---
  await test("Test 5: Incident acknowledgment updates status to ACKNOWLEDGED", async () => {
    const ack = await EmergencyService.acknowledgeIncident(
      createdIncidentId,
      testActorId || "system-test",
      "Operator Joy"
    );

    assert.strictEqual(ack.status, "ACKNOWLEDGED");
    assert.ok(ack.acknowledgedAt, "acknowledgedAt should be set");
    assert.strictEqual(ack.acknowledgedById, testActorId || "system-test");

    const logs = await db.emergencyIncidentLog.findMany({
      where: { incidentId: createdIncidentId, action: "ACKNOWLEDGED" },
    });
    assert.strictEqual(logs.length, 1);
  });

  // --- Test 6: Code Red Downgrade Strict Enforcement ---
  await test("Test 6: Downgrading CODE RED without supervisor authority is REJECTED", async () => {
    await assert.rejects(
      async () => {
        await EmergencyService.classifyIncident({
          incidentId: createdIncidentId,
          newClassification: "CODE_YELLOW",
          reason: "Elder feeling slightly better",
          actorId: testActorId || "system-test",
          actorName: "Operator Joy",
          isSupervisor: false, // NON-SUPERVISOR
        });
      },
      /Downgrading a CODE RED incident strictly requires supervisor authorization/
    );
  });

  // --- Test 7: Supervisor Downgrade with Mandatory Reason ---
  await test("Test 7: Supervisor downgrade succeeds with valid audit reason", async () => {
    const downgraded = await EmergencyService.classifyIncident({
      incidentId: createdIncidentId,
      newClassification: "CODE_YELLOW",
      reason: "Paramedic spoke with family. Vitals stable at 120/80. Downgraded to urgent support.",
      actorId: testActorId || "system-test",
      actorName: "Supervisor Dr. Roy",
      isSupervisor: true, // SUPERVISOR
    });

    assert.strictEqual(downgraded.classification, "CODE_YELLOW");
    assert.strictEqual(downgraded.previousClassification, "CODE_RED");
    assert.ok(downgraded.downgradeApprovedAt, "downgradeApprovedAt set");

    const log = await db.emergencyIncidentLog.findFirst({
      where: { incidentId: createdIncidentId, action: "DOWNGRADED" },
    });
    assert.ok(log, "DOWNGRADED log should exist");
    assert.match(log.details, /Supervisor Dr\. Roy/);
  });

  // --- Test 8: Responder Dispatch & Arrival ---
  await test("Test 8: Field employee dispatch and on-scene arrival flow", async () => {
    if (!testEmployeeId) {
      console.log("    (Skipped dispatch: no employee in test DB)");
      return;
    }

    const dispatched = await EmergencyService.dispatchResponder({
      incidentId: createdIncidentId,
      employeeId: testEmployeeId,
      notes: "Carry emergency oxygen",
      actorId: testActorId || "system-test",
      actorName: "Operator Joy",
    });

    assert.strictEqual(dispatched.status, "DISPATCHED");
    assert.strictEqual(dispatched.assignedEmployeeId, testEmployeeId);
    assert.ok(dispatched.dispatchedAt);

    const arrived = await EmergencyService.recordArrival({
      incidentId: createdIncidentId,
      actorId: testActorId || "system-test",
      actorName: "Operator Joy",
      notes: "Responder on site",
    });

    assert.strictEqual(arrived.status, "RESPONDER_ON_SCENE");
    assert.ok(arrived.responderArrivedAt);
  });

  // --- Test 9: Safety Confirmation & Call Logging ---
  await test("Test 9: Member safety confirmation and call log recorded", async () => {
    const safety = await EmergencyService.recordSafetyConfirmation({
      incidentId: createdIncidentId,
      confirmedBy: "Attending Field Caregiver",
      safetyNotes: "Elder resting safely. Daughter present.",
      actorId: testActorId || "system-test",
      actorName: "Operator Joy",
    });

    assert.ok(safety.safetyConfirmedAt);
    assert.strictEqual(safety.safetyConfirmedBy, "Attending Field Caregiver");

    const callLog = await EmergencyService.logCall({
      incidentId: createdIncidentId,
      recipient: "Daughter (Bangalore)",
      phone: "9830011111",
      outcome: "ANSWERED",
      details: "Informed family that field responder is on scene and elder is comfortable.",
      actorId: testActorId || "system-test",
      actorName: "Operator Joy",
    });

    assert.strictEqual(callLog.action, "CALL_LOGGED");
    assert.strictEqual(callLog.callOutcome, "ANSWERED");
  });

  // --- Test 10: Active Telemetry Ingestion ---
  await test("Test 10: Telemetry ingestion updates coordinates while incident is active", async () => {
    const res = await EmergencyService.updateTelemetry({
      incidentId: createdIncidentId,
      latitude: 22.5800,
      longitude: 88.3700,
      accuracy: 5.0,
    });

    assert.strictEqual(res.found, true);
    assert.strictEqual(res.active, true);

    const check = await db.emergencyIncident.findUnique({
      where: { id: createdIncidentId },
      select: { currentLatitude: true, currentLongitude: true },
    });
    assert.strictEqual(check?.currentLatitude, 22.58);
  });

  // --- Test 11: Incident Resolution & Strict Privacy Cut-off ---
  await test("Test 11: Incident resolution sets trackingActive=false and terminates telemetry", async () => {
    const resolved = await EmergencyService.resolveIncident({
      incidentId: createdIncidentId,
      resolutionNotes: "Elder vitals checked and stable. Primary physician consulted. Incident safely concluded.",
      actorId: testActorId || "system-test",
      actorName: "Operator Joy",
    });

    assert.strictEqual(resolved.status, "RESOLVED");
    assert.strictEqual(resolved.trackingActive, false, "trackingActive MUST be false");
    assert.ok(resolved.resolvedAt);

    // Now test that telemetry ingestion returns active=false (HTTP 410 Gone)
    const telemetryAfterClose = await EmergencyService.updateTelemetry({
      incidentId: createdIncidentId,
      latitude: 22.5900,
      longitude: 88.3800,
    });

    assert.strictEqual(telemetryAfterClose.found, true);
    assert.strictEqual(
      telemetryAfterClose.active,
      false,
      "Telemetry MUST be rejected once incident is resolved"
    );
  });

  // Cleanup test incident
  if (createdIncidentId) {
    await db.emergencyIncident.delete({ where: { id: createdIncidentId } });
  }

  console.log("\n================================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
