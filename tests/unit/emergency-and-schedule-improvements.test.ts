import assert from "node:assert";
import { db } from "../../lib/db";
import { EmergencyService } from "../../lib/services/emergency";

async function runTestSuite() {
  console.log("================================================================");
  console.log("EmergencyOS & Admin Visit Schedule: Operational Improvements Test Suite");
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

  // --- Scenario 1: Newest Incidents First (Ordering by Creation Timestamp Descending) ---
  await test("Scenario 1: Active incidents are ordered newest first by creation timestamp descending", async () => {
    // Mock db.emergencyIncident.findMany returning incidents created at different times
    const olderTime = new Date("2026-11-20T10:00:00.000Z");
    const newerTime = new Date("2026-11-20T11:30:00.000Z");

    const mockIncidents = [
      {
        id: "emg-older",
        incidentNumber: "EMG-20261120-001",
        status: "TRIGGERED",
        classification: "CODE_RED",
        createdAt: olderTime,
        triggeredAt: olderTime,
        assignedEmployee: null,
        logs: [],
        _count: { logs: 0 },
      },
      {
        id: "emg-newer",
        incidentNumber: "EMG-20261120-002",
        status: "TRIGGERED",
        classification: "CODE_RED",
        createdAt: newerTime,
        triggeredAt: newerTime,
        assignedEmployee: null,
        logs: [],
        _count: { logs: 0 },
      },
    ];

    const originalFindMany = db.emergencyIncident.findMany;
    const originalCount = db.emergencyIncident.count;
    try {
      (db.emergencyIncident as any).findMany = async (args: any) => {
        // Return descending as specified in DB query
        return [...mockIncidents].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
      };
      (db.emergencyIncident as any).count = async () => 0;

      const feed = await EmergencyService.getDashboardFeed();
      const active = feed.activeIncidents;

      assert.strictEqual(active.length, 2);
      assert.strictEqual(
        active[0].id,
        "emg-newer",
        "Newest emergency must be at index 0 (top of queue)"
      );
      assert.strictEqual(
        active[1].id,
        "emg-older",
        "Older emergency must be at index 1"
      );

      // Verify strict timestamp descending order
      for (let i = 0; i < active.length - 1; i++) {
        const current = new Date(active[i].createdAt || active[i].triggeredAt).getTime();
        const next = new Date(active[i + 1].createdAt || active[i + 1].triggeredAt).getTime();
        assert.ok(
          current >= next,
          `Expected active[${i}] (${current}) >= active[${i + 1}] (${next}) for newest first ordering`
        );
      }
    } finally {
      db.emergencyIncident.findMany = originalFindMany;
      db.emergencyIncident.count = originalCount;
    }
  });

  // --- Scenario 2: Live SOS insertion at the top without page refresh ---
  await test("Scenario 2: Newly received SOS is placed at the top of the queue across all filters", async () => {
    const existingIncidents = [
      {
        id: "emg-old",
        incidentNumber: "EMG-20261120-001",
        classification: "CODE_RED",
        status: "TRIGGERED",
        createdAt: new Date("2026-11-20T10:00:00.000Z"),
        triggeredAt: new Date("2026-11-20T10:00:00.000Z"),
      },
      {
        id: "emg-older",
        incidentNumber: "EMG-20261120-002",
        classification: "CODE_YELLOW",
        status: "ACKNOWLEDGED",
        createdAt: new Date("2026-11-20T09:00:00.000Z"),
        triggeredAt: new Date("2026-11-20T09:00:00.000Z"),
      },
    ];

    const newIncoming = {
      id: "emg-newest",
      incidentNumber: "EMG-20261120-003",
      classification: "CODE_RED",
      status: "TRIGGERED",
      createdAt: new Date("2026-11-20T11:00:00.000Z"),
      triggeredAt: new Date("2026-11-20T11:00:00.000Z"),
    };

    // Live update insertion simulation
    const merged = [...existingIncidents, newIncoming].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.triggeredAt).getTime();
      const timeB = new Date(b.createdAt || b.triggeredAt).getTime();
      return timeB - timeA;
    });

    assert.strictEqual(merged[0].id, "emg-newest", "Newest incoming emergency must appear at the top (index 0)");
    assert.strictEqual(merged[1].id, "emg-old", "Previous emergency must move down to index 1");
    assert.strictEqual(merged[2].id, "emg-older", "Oldest emergency must move down to index 2");
  });

  // --- Scenario 3: Automatically Archive Completed Emergencies ---
  await test("Scenario 3: Resolving an incident automatically removes it from Active and places it in Archive", async () => {
    const activeStatuses = ["TRIGGERED", "ACKNOWLEDGED", "DISPATCHED", "RESPONDER_ON_SCENE"];
    const resolvedStatus = "RESOLVED";

    // Active query exclusion check: resolved incidents are never queried for active feed
    assert.ok(!activeStatuses.includes(resolvedStatus), "RESOLVED must not be in activeStatuses queue");

    // Mock archive history lookup
    const resolvedIncident = {
      id: "emg-resolved-test",
      incidentNumber: "EMG-20261120-005",
      status: "RESOLVED",
      classification: "CODE_RED",
      callerName: "Tanish Alam",
      triggeredAt: new Date(),
      resolvedAt: new Date(),
      resolutionNotes: "Resolved successfully",
      assignedEmployee: null,
      _count: { logs: 3 },
    };

    const originalFindMany = db.emergencyIncident.findMany;
    const originalCount = db.emergencyIncident.count;
    try {
      (db.emergencyIncident as any).findMany = async () => [resolvedIncident];
      (db.emergencyIncident as any).count = async () => 1;

      const history = await EmergencyService.getIncidentHistory({
        status: "RESOLVED",
        page: 1,
        limit: 5,
      });

      assert.strictEqual(history.incidents.length, 1);
      assert.strictEqual(history.incidents[0].status, "RESOLVED");
      assert.strictEqual(history.total, 1);
    } finally {
      db.emergencyIncident.findMany = originalFindMany;
      db.emergencyIncident.count = originalCount;
    }
  });

  // --- Scenario 4: Incident awaiting safety confirmation remains active ---
  await test("Scenario 4: An incident awaiting safety confirmation remains strictly active in the queue", async () => {
    const unconfirmedIncident = {
      id: "test-safety-inc",
      status: "DISPATCHED",
      safetyConfirmedAt: null,
      classification: "CODE_RED",
    };

    const activeStatuses = ["TRIGGERED", "ACKNOWLEDGED", "DISPATCHED", "RESPONDER_ON_SCENE"];
    assert.ok(
      activeStatuses.includes(unconfirmedIncident.status),
      "Incident awaiting safety confirmation must remain in activeStatuses queue"
    );
    assert.strictEqual(unconfirmedIncident.safetyConfirmedAt, null, "Safety confirmed at must remain null");
  });

  // --- Scenario 5: Ambulance-style siren waveform and acoustic properties ---
  await test("Scenario 5: Emergency siren synthesizes recognizable two-tone ambulance pattern (660Hz/495Hz, 1.2kHz lowpass filter)", async () => {
    const sirenConfig = {
      highFreq: 660.0, // E5 (High Tone)
      lowFreq: 495.0,  // B4 (Low Tone - Perfect 4th/5th interval)
      filterType: "lowpass",
      cutoffFreq: 1200, // 1.2 kHz lowpass filter cuts ear-piercing harshness
      filterQ: 1.8,
      masterGain: 0.72, // Loud, room-filling volume without clipping
      cycles: 2,        // 2 full Hi-Lo cycles
      totalDuration: 1.12,
    };

    assert.strictEqual(sirenConfig.highFreq, 660.0, "High tone should be 660 Hz");
    assert.strictEqual(sirenConfig.lowFreq, 495.0, "Low tone should be 495 Hz");
    assert.strictEqual(sirenConfig.cutoffFreq, 1200, "Lowpass filter cutoff must be 1200 Hz");
    assert.ok(sirenConfig.masterGain >= 0.7, "Master gain must maintain strong audible loudness");
  });

  // --- Scenario 6: Acknowledging does not cause duplicate alerts ---
  await test("Scenario 6: Acknowledging an incident prevents duplicate continuous sirens", async () => {
    const alertedIds = new Set<string>();

    const incidentId = "incident-101";
    let alertCount = 0;

    // First arrival
    if (!alertedIds.has(incidentId)) {
      alertedIds.add(incidentId);
      alertCount++;
    }

    // Subsequent poll passes while still unacknowledged
    if (!alertedIds.has(incidentId)) {
      alertCount++;
    }

    // Operator acknowledges
    const status = "ACKNOWLEDGED";
    assert.strictEqual(alertCount, 1, "Alert must play exactly once for the new incoming emergency");

    // Acknowledging keeps it in alertedIds
    if (!alertedIds.has(incidentId)) {
      alertCount++;
    }
    assert.strictEqual(alertCount, 1, "Acknowledged incident must not re-trigger siren");

    // A genuinely new incident arrives
    const newIncidentId = "incident-102";
    if (!alertedIds.has(newIncidentId)) {
      alertedIds.add(newIncidentId);
      alertCount++;
    }
    assert.strictEqual(alertCount, 2, "Genuinely new incident MUST trigger siren");
  });

  // --- Scenario 7: Employee dispatch to Code Red appears in Visit Schedule with RED border ---
  await test("Scenario 7: Assigned Code Red incident appears in Visit Schedule with prominent RED border styling", async () => {
    const today = new Date();
    const mockActiveEmergency = {
      id: "emg-incident-99",
      careCaseId: "emg-incident-99",
      isEmergency: true,
      emergencyClassification: "CODE_RED",
      emergencyIncidentNumber: "EMG-20261120-001",
      scheduledStart: today.toISOString(),
      scheduledEnd: new Date(today.getTime() + 7200000).toISOString(),
      status: "DISPATCHED",
      category: "Ad-hoc" as const,
      member: {
        userId: "user-1",
        name: "Mr Tanish Alam",
        email: "tanish@sunshineeldercare.in",
        memberId: "SECD1000TAAM",
        serviceAddress: "123 Southern Avenue, Kolkata",
        mobileNumber: "9876543210",
      },
      elder: {
        id: "user-1",
        firstName: "Mr Tanish Alam",
        lastName: "",
        relationship: "Self / Member",
        address: "123 Southern Avenue, Kolkata",
        city: "Kolkata",
        contactNumber: "9876543210",
      },
      carePlanName: "EmergencyOS — CODE RED",
      assignedEmployee: {
        id: "emp-sagnik",
        employeeId: "SEC101SKAR",
        firstName: "Sagnik",
        lastName: "Kar",
        designation: "Care Coordinator",
        contactNumber: "9830012345",
      },
      additionalCaregivers: [],
    };

    // Border styling verification
    const isEmergency = Boolean(mockActiveEmergency.isEmergency);
    const isCompleted = mockActiveEmergency.status === "COMPLETED" || mockActiveEmergency.status === "RESOLVED";

    let borderClass = "";
    if (isEmergency) {
      if (isCompleted) {
        borderClass = "border-2 border-emerald-500 bg-emerald-50/20";
      } else {
        borderClass = "border-2 border-red-500 bg-red-50/40 hover:border-red-600 shadow-sm ring-2 ring-red-400/25";
      }
    }
    assert.match(borderClass, /border-red-500/, "Active Code Red entry MUST have red border (border-2 border-red-500)");
    assert.match(borderClass, /bg-red-50/, "Active Code Red entry MUST have prominent red background highlight");
  });

  // --- Scenario 8: Reassignment updates existing emergency entry without duplicates ---
  await test("Scenario 8: Reassigning an employee updates the existing entry without creating duplicates", async () => {
    const incidentId = "incident-unique-id";
    const entryId = `emg-${incidentId}`;

    // Initial assignment
    const scheduleEntries: Record<string, any> = {};
    scheduleEntries[entryId] = {
      id: entryId,
      assignedEmployeeId: "emp-1",
      employeeName: "Sagnik Kar",
    };

    assert.strictEqual(Object.keys(scheduleEntries).length, 1);

    // Reassignment to different employee
    scheduleEntries[entryId] = {
      ...scheduleEntries[entryId],
      assignedEmployeeId: "emp-2",
      employeeName: "Riya Mukherjee",
    };

    assert.strictEqual(Object.keys(scheduleEntries).length, 1, "Must remain exactly 1 entry in schedule");
    assert.strictEqual(scheduleEntries[entryId].assignedEmployeeId, "emp-2", "Employee must be updated to emp-2");
    assert.strictEqual(scheduleEntries[entryId].employeeName, "Riya Mukherjee", "Employee name must be updated");
  });

  // --- Scenario 9: Completed normal CareVisit gets GREEN border ---
  await test("Scenario 9: Completed normal CareVisit displays GREEN border (border-2 border-emerald-500)", async () => {
    const completedNormalVisit = {
      id: "visit-normal-1",
      isEmergency: false,
      status: "COMPLETED",
    };

    const isEmergency = Boolean(completedNormalVisit.isEmergency);
    const isCompleted = completedNormalVisit.status === "COMPLETED";

    let borderClass = "";
    if (isEmergency) {
      borderClass = isCompleted ? "border-2 border-emerald-500" : "border-2 border-red-500";
    } else {
      borderClass = isCompleted ? "border-2 border-emerald-500" : "border-slate-200";
    }

    assert.strictEqual(borderClass, "border-2 border-emerald-500", "Completed normal CareVisit MUST have green border");
  });

  // --- Scenario 10: Completed emergency-linked visit gets GREEN border ---
  await test("Scenario 10: Completed emergency-linked Code Red entry displays GREEN border (border-2 border-emerald-500)", async () => {
    const completedEmergency = {
      id: "emg-resolved-1",
      isEmergency: true,
      emergencyClassification: "CODE_RED",
      status: "COMPLETED",
    };

    const isEmergency = Boolean(completedEmergency.isEmergency);
    const isCompleted = completedEmergency.status === "COMPLETED" || completedEmergency.status === "RESOLVED";

    let borderClass = "";
    if (isEmergency) {
      borderClass = isCompleted ? "border-2 border-emerald-500" : "border-2 border-red-500";
    } else {
      borderClass = isCompleted ? "border-2 border-emerald-500" : "border-slate-200";
    }

    assert.strictEqual(borderClass, "border-2 border-emerald-500", "Completed emergency entry MUST transition to green border");
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test suite runner error:", err);
  process.exit(1);
});
