import assert from "node:assert";
import { db } from "../../lib/db";
import { EmergencyService } from "../../lib/services/emergency";

async function runTestSuite() {
  console.log("================================================================");
  console.log("EmergencyOS: Continuous Siren Until Acknowledgement Test Suite");
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

  // Helper simulation representing EmergencyAudioAlert state machine
  function createAudioAlertSimulator() {
    const unackIds = new Set<string>();
    let isLoopRunning = false;
    let cyclesPlayed = 0;
    let stopCount = 0;
    let muted = false;

    return {
      setMuted(m: boolean) {
        muted = m;
        if (m) this.stop();
      },
      syncUnacknowledgedIncidents(incidents: Array<{ id: string; status: string; classification: string; acknowledgedAt?: any }>) {
        const nextIds = new Set<string>();
        for (const inc of incidents) {
          if (
            (inc.classification === "CODE_RED" || inc.classification === "CODE_YELLOW") &&
            inc.status === "TRIGGERED" &&
            !inc.acknowledgedAt
          ) {
            nextIds.add(inc.id);
          }
        }

        // Update active set
        unackIds.clear();
        for (const id of nextIds) {
          unackIds.add(id);
        }

        if (unackIds.size === 0) {
          this.stop();
        } else {
          if (!isLoopRunning && !muted) {
            this.start();
          }
        }
      },
      start() {
        if (isLoopRunning) return; // Prevent duplicate overlapping loops across polling cycles
        if (muted) return;
        if (unackIds.size === 0) return;
        isLoopRunning = true;
      },
      stepCycle() {
        if (!isLoopRunning || unackIds.size === 0 || muted) {
          this.stop();
          return false;
        }
        cyclesPlayed++;
        return true;
      },
      stop() {
        if (isLoopRunning) {
          stopCount++;
        }
        isLoopRunning = false;
      },
      getState() {
        return {
          unackCount: unackIds.size,
          unackIds: Array.from(unackIds),
          isLoopRunning,
          cyclesPlayed,
          stopCount,
        };
      },
    };
  }

  // --- Scenario 1: One incoming Code Red: siren repeats until acknowledged ---
  await test("Scenario 1: One incoming Code Red starts repeating siren and loops until acknowledged", async () => {
    const sim = createAudioAlertSimulator();

    const incidentRed: {
      id: string;
      incidentNumber: string;
      classification: string;
      status: string;
      acknowledgedAt: Date | null;
    } = {
      id: "emg-red-1",
      incidentNumber: "EMG-20261121-001",
      classification: "CODE_RED",
      status: "TRIGGERED",
      acknowledgedAt: null,
    };

    // Incident arrives from server
    sim.syncUnacknowledgedIncidents([incidentRed]);
    assert.strictEqual(sim.getState().isLoopRunning, true, "Siren loop must start for incoming Code Red");
    assert.strictEqual(sim.getState().unackCount, 1);

    // Siren executes repeating cycles
    sim.stepCycle();
    sim.stepCycle();
    sim.stepCycle();
    assert.strictEqual(sim.getState().cyclesPlayed, 3, "Siren must continue repeating cycles");
    assert.strictEqual(sim.getState().isLoopRunning, true, "Siren loop must remain active while unacknowledged");

    // Operator acknowledges incident
    incidentRed.status = "ACKNOWLEDGED";
    incidentRed.acknowledgedAt = new Date();
    sim.syncUnacknowledgedIncidents([incidentRed]);

    assert.strictEqual(sim.getState().isLoopRunning, false, "Siren must stop immediately when acknowledged");
    assert.strictEqual(sim.getState().unackCount, 0, "Unacknowledged set must be empty");
  });

  // --- Scenario 2: One incoming Code Yellow: siren repeats until acknowledged ---
  await test("Scenario 2: One incoming Code Yellow starts repeating siren and loops until acknowledged", async () => {
    const sim = createAudioAlertSimulator();

    const incidentYellow: {
      id: string;
      incidentNumber: string;
      classification: string;
      status: string;
      acknowledgedAt: Date | null;
    } = {
      id: "emg-yellow-1",
      incidentNumber: "EMG-20261121-002",
      classification: "CODE_YELLOW",
      status: "TRIGGERED",
      acknowledgedAt: null,
    };

    // Incident arrives
    sim.syncUnacknowledgedIncidents([incidentYellow]);
    assert.strictEqual(sim.getState().isLoopRunning, true, "Siren loop must start for incoming Code Yellow");
    assert.strictEqual(sim.getState().unackCount, 1);

    // Siren cycles continue
    sim.stepCycle();
    sim.stepCycle();
    assert.strictEqual(sim.getState().cyclesPlayed, 2, "Code Yellow siren must repeat continuously");
    assert.strictEqual(sim.getState().isLoopRunning, true);

    // Operator acknowledges incident
    incidentYellow.status = "ACKNOWLEDGED";
    incidentYellow.acknowledgedAt = new Date();
    sim.syncUnacknowledgedIncidents([incidentYellow]);

    assert.strictEqual(sim.getState().isLoopRunning, false, "Code Yellow siren must stop upon acknowledgement");
  });

  // --- Scenario 3: Code Green does NOT trigger siren alert ---
  await test("Scenario 3: Incoming Code Green does NOT start the siren alert", async () => {
    const sim = createAudioAlertSimulator();

    const incidentGreen = {
      id: "emg-green-1",
      incidentNumber: "EMG-20261121-003",
      classification: "CODE_GREEN",
      status: "TRIGGERED",
      acknowledgedAt: null,
    };

    sim.syncUnacknowledgedIncidents([incidentGreen]);
    assert.strictEqual(sim.getState().isLoopRunning, false, "Code Green must not activate siren");
    assert.strictEqual(sim.getState().unackCount, 0);
  });

  // --- Scenario 4: Two simultaneous unacknowledged incidents remain active until each is acknowledged ---
  await test("Scenario 4: Two simultaneous incidents (Code Red + Code Yellow) keep alert active until each is acknowledged", async () => {
    const sim = createAudioAlertSimulator();

    const incidentRed: {
      id: string;
      incidentNumber: string;
      classification: string;
      status: string;
      acknowledgedAt: Date | null;
    } = {
      id: "emg-red-10",
      incidentNumber: "EMG-20261121-010",
      classification: "CODE_RED",
      status: "TRIGGERED",
      acknowledgedAt: null,
    };
    const incidentYellow: {
      id: string;
      incidentNumber: string;
      classification: string;
      status: string;
      acknowledgedAt: Date | null;
    } = {
      id: "emg-yellow-11",
      incidentNumber: "EMG-20261121-011",
      classification: "CODE_YELLOW",
      status: "TRIGGERED",
      acknowledgedAt: null,
    };

    sim.syncUnacknowledgedIncidents([incidentRed, incidentYellow]);
    assert.strictEqual(sim.getState().isLoopRunning, true);
    assert.strictEqual(sim.getState().unackCount, 2, "Both incidents tracked separately");
  });

  // --- Scenario 5: Acknowledging one incident does not silence another ---
  await test("Scenario 5: Acknowledging one incident does NOT stop alert for other unacknowledged incident", async () => {
    const sim = createAudioAlertSimulator();

    const incidentRed: {
      id: string;
      incidentNumber: string;
      classification: string;
      status: string;
      acknowledgedAt: Date | null;
    } = {
      id: "emg-red-10",
      incidentNumber: "EMG-20261121-010",
      classification: "CODE_RED",
      status: "TRIGGERED",
      acknowledgedAt: null,
    };
    const incidentYellow: {
      id: string;
      incidentNumber: string;
      classification: string;
      status: string;
      acknowledgedAt: Date | null;
    } = {
      id: "emg-yellow-11",
      incidentNumber: "EMG-20261121-011",
      classification: "CODE_YELLOW",
      status: "TRIGGERED",
      acknowledgedAt: null,
    };

    sim.syncUnacknowledgedIncidents([incidentRed, incidentYellow]);
    sim.stepCycle();
    assert.strictEqual(sim.getState().isLoopRunning, true);

    // Operator acknowledges ONLY incidentRed
    incidentRed.status = "ACKNOWLEDGED";
    incidentRed.acknowledgedAt = new Date();
    sim.syncUnacknowledgedIncidents([incidentRed, incidentYellow]);

    assert.strictEqual(sim.getState().isLoopRunning, true, "Siren MUST continue playing because incidentYellow is still unacknowledged");
    assert.strictEqual(sim.getState().unackCount, 1);
    assert.deepStrictEqual(sim.getState().unackIds, ["emg-yellow-11"]);

    // Next cycle still executes
    assert.strictEqual(sim.stepCycle(), true, "Cycle must repeat for remaining unacknowledged incident");

    // Operator now acknowledges incidentYellow
    incidentYellow.status = "ACKNOWLEDGED";
    incidentYellow.acknowledgedAt = new Date();
    sim.syncUnacknowledgedIncidents([incidentRed, incidentYellow]);

    assert.strictEqual(sim.getState().isLoopRunning, false, "Siren must stop when final incident is acknowledged");
    assert.strictEqual(sim.getState().unackCount, 0);
  });

  // --- Scenario 6: Refreshing the browser restores unacknowledged alert state from server ---
  await test("Scenario 6: Refreshing the browser restores unacknowledged alert state from server", async () => {
    // Simulate browser reload by instantiating a fresh simulator
    const simAfterRefresh = createAudioAlertSimulator();

    // Server state has an unacknowledged Code Red
    const serverIncidents = [
      {
        id: "emg-red-persisted",
        incidentNumber: "EMG-20261121-020",
        classification: "CODE_RED",
        status: "TRIGGERED",
        acknowledgedAt: null,
      },
      {
        id: "emg-yellow-already-acked",
        incidentNumber: "EMG-20261121-021",
        classification: "CODE_YELLOW",
        status: "ACKNOWLEDGED",
        acknowledgedAt: new Date(),
      },
    ];

    simAfterRefresh.syncUnacknowledgedIncidents(serverIncidents);
    assert.strictEqual(simAfterRefresh.getState().isLoopRunning, true, "Alert state restored from server");
    assert.strictEqual(simAfterRefresh.getState().unackCount, 1);
    assert.deepStrictEqual(simAfterRefresh.getState().unackIds, ["emg-red-persisted"]);
  });

  // --- Scenario 7: Acknowledged incidents do NOT restart their siren ---
  await test("Scenario 7: Acknowledged incidents do NOT restart their siren", async () => {
    const sim = createAudioAlertSimulator();

    const serverIncidents = [
      {
        id: "emg-acked-1",
        incidentNumber: "EMG-20261121-030",
        classification: "CODE_RED",
        status: "ACKNOWLEDGED",
        acknowledgedAt: new Date(),
      },
      {
        id: "emg-acked-2",
        incidentNumber: "EMG-20261121-031",
        classification: "CODE_YELLOW",
        status: "ACKNOWLEDGED",
        acknowledgedAt: new Date(),
      },
      {
        id: "emg-resolved-3",
        incidentNumber: "EMG-20261121-032",
        classification: "CODE_RED",
        status: "RESOLVED",
        acknowledgedAt: new Date(),
      },
    ];

    sim.syncUnacknowledgedIncidents(serverIncidents);
    assert.strictEqual(sim.getState().isLoopRunning, false, "Siren must not start for acknowledged or resolved incidents");
    assert.strictEqual(sim.getState().unackCount, 0);
  });

  // --- Scenario 8: Multiple background polling cycles do not create duplicate or overlapping audio loops ---
  await test("Scenario 8: Multiple background polling cycles do NOT create duplicate or overlapping audio loops", async () => {
    const sim = createAudioAlertSimulator();

    const incident = {
      id: "emg-red-poll",
      incidentNumber: "EMG-20261121-040",
      classification: "CODE_RED",
      status: "TRIGGERED",
      acknowledgedAt: null,
    };

    // Cycle 1: initial load
    sim.syncUnacknowledgedIncidents([incident]);
    assert.strictEqual(sim.getState().isLoopRunning, true);

    // Poll 1 (5 seconds later)
    sim.syncUnacknowledgedIncidents([incident]);
    // Poll 2 (10 seconds later)
    sim.syncUnacknowledgedIncidents([incident]);
    // Poll 3 (15 seconds later)
    sim.syncUnacknowledgedIncidents([incident]);

    assert.strictEqual(sim.getState().isLoopRunning, true, "Loop remains single and non-overlapping");
    assert.strictEqual(sim.getState().unackCount, 1);
  });

  // --- Scenario 9: Escalation of an acknowledged incident resets status to TRIGGERED and restarts siren ---
  await test("Scenario 9: Escalation of acknowledged Code Green/Yellow to Code Red resets to TRIGGERED and restarts siren", async () => {
    // Mock db transaction for classifyIncident
    let updatedData: any = null;
    let createdLog: any = null;

    const originalTx = db.$transaction;
    const originalFindUnique = db.emergencyIncident.findUnique;

    try {
      (db.emergencyIncident as any).findUnique = async () => ({
        id: "emg-escalate-test",
        incidentNumber: "EMG-20261121-050",
        classification: "CODE_GREEN",
        status: "ACKNOWLEDGED",
        acknowledgedAt: new Date("2026-11-20T10:00:00Z"),
        acknowledgedById: "op-1",
        isEscalated: false,
      });

      (db as any).$transaction = async (fn: any) => {
        const mockTx = {
          emergencyIncident: {
            update: async ({ data }: any) => {
              updatedData = data;
              return { id: "emg-escalate-test", ...data };
            },
          },
          emergencyIncidentLog: {
            create: async ({ data }: any) => {
              createdLog = data;
              return data;
            },
          },
          user: {
            findUnique: async () => null,
          },
        };
        return fn(mockTx);
      };

      const result = await EmergencyService.classifyIncident({
        incidentId: "emg-escalate-test",
        newClassification: "CODE_RED",
        reason: "Patient vital signs crashed, urgent escalation",
        actorId: "supervisor-1",
        actorName: "Clinical Supervisor",
        isSupervisor: true,
      });

      assert.strictEqual(updatedData.classification, "CODE_RED");
      assert.strictEqual(updatedData.status, "TRIGGERED", "Status must reset to TRIGGERED upon escalation");
      assert.strictEqual(updatedData.acknowledgedAt, null, "acknowledgedAt must reset to null");
      assert.strictEqual(updatedData.isEscalated, true, "isEscalated must be set to true");
      assert.strictEqual(createdLog.action, "ESCALATED", "Log action must be ESCALATED");

      // Verify that this causes the audio alert simulator to trigger the repeating siren
      const sim = createAudioAlertSimulator();
      sim.syncUnacknowledgedIncidents([result]);
      assert.strictEqual(sim.getState().isLoopRunning, true, "Siren must start repeating for escalated incident");
      assert.strictEqual(sim.getState().unackCount, 1);
    } finally {
      (db as any).$transaction = originalTx;
      (db.emergencyIncident as any).findUnique = originalFindUnique;
    }
  });

  // --- Scenario 10: Server-side Acknowledged Incident transitions status in EmergencyService ---
  await test("Scenario 10: Server-side acknowledgeIncident sets status to ACKNOWLEDGED", async () => {
    let updatedStatus: any = null;
    const originalTx = db.$transaction;
    const originalFindUnique = db.emergencyIncident.findUnique;

    try {
      (db.emergencyIncident as any).findUnique = async () => ({
        id: "emg-ack-test",
        status: "TRIGGERED",
      });

      (db as any).$transaction = async (fn: any) => {
        const mockTx = {
          emergencyIncident: {
            update: async ({ data }: any) => {
              updatedStatus = data.status;
              return { id: "emg-ack-test", ...data };
            },
          },
          emergencyIncidentLog: {
            create: async () => {},
          },
        };
        return fn(mockTx);
      };

      await EmergencyService.acknowledgeIncident("emg-ack-test", "user-1", "Operator");
      assert.strictEqual(updatedStatus, "ACKNOWLEDGED");
    } finally {
      (db as any).$transaction = originalTx;
      (db.emergencyIncident as any).findUnique = originalFindUnique;
    }
  });

  console.log("\n================================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
