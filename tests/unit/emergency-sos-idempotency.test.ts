import assert from "node:assert";
import fs from "fs";

// Ensure mock DATABASE_URL fallback for headless CI runner
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://mock:mock@localhost:5432/mock_db?schema=public";
}

import { EmergencyService } from "../../lib/services/emergency";
import { db } from "../../lib/db";

async function runTestSuite() {
  console.log("================================================================");
  console.log("SUNSHINE ELDERCARE — SOS IDEMPOTENCY & EMERGENCY ARCHITECTURE TESTS");
  console.log("================================================================\n");

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✗ ${name}`);
      console.error("    Error:", err.message);
      failed++;
    }
  }

  // In-memory simulation of emergency incidents for unit testing
  const incidentStore: any[] = [];
  let seqCounter = 1;

  const originalFindUnique = (db.emergencyIncident as any).findUnique;
  const originalCreate = (db.emergencyIncident as any).create;
  const originalTx = (db as any).$transaction;
  const originalMemberFindUnique = (db.memberProfile as any)?.findUnique;
  const originalUserFindUnique = (db.user as any)?.findUnique;

  // Mock DB hooks for isolated test environment
  (db.user as any).findUnique = async ({ where }: any) => {
    if (where.id === "user_tanish") {
      return {
        id: "user_tanish",
        name: "Tanish Alam",
        memberProfile: {
          memberId: "SECD1000TAAM",
          salutation: "Mr",
          firstName: "Tanish",
          lastName: "Alam",
          mobileNumber: "+91 98300 12345",
          serviceAddress: "12/A Southern Avenue, Kolkata 700029",
        },
        emergencyContact: {
          phone: "+91 98300 54321",
        },
      };
    }
    return null;
  };

  (db.emergencyIncident as any).findUnique = async ({ where }: any) => {
    if (where.idempotencyKey) {
      return incidentStore.find((i) => i.idempotencyKey === where.idempotencyKey) || null;
    }
    if (where.id) {
      return incidentStore.find((i) => i.id === where.id) || null;
    }
    return null;
  };

  (db.memberProfile as any).findUnique = async ({ where }: any) => {
    if (where.memberId === "SECD1000TAAM") {
      return {
        id: "prof_1",
        userId: "user_tanish",
        memberId: "SECD1000TAAM",
        salutation: "Mr",
        firstName: "Tanish",
        lastName: "Alam",
        mobileNumber: "+91 98300 12345",
        serviceAddress: "12/A Southern Avenue, Kolkata 700029",
        user: {
          id: "user_tanish",
          name: "Tanish Alam",
          emergencyContact: {
            phone: "+91 98300 54321",
          },
        },
      };
    }
    return null;
  };

  (db as any).$transaction = async (fn: any) => {
    const mockTx = {
      emergencySequence: {
        upsert: async () => ({ current: seqCounter++ }),
      },
      emergencyIncident: {
        findUnique: (db.emergencyIncident as any).findUnique,
        create: async ({ data }: any) => {
          if (data.idempotencyKey) {
            const collision = incidentStore.find((i) => i.idempotencyKey === data.idempotencyKey);
            if (collision) {
              const err: any = new Error("Unique constraint failed on idempotencyKey");
              err.code = "P2002";
              throw err;
            }
          }
          const item = {
            id: `inc_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            ...data,
            createdAt: new Date(),
          };
          incidentStore.push(item);
          return item;
        },
      },
      emergencyIncidentLog: {
        create: async () => ({ id: "log_1" }),
      },
    };
    return fn(mockTx);
  };

  try {
    // -------------------------------------------------------------
    // Test 1: First SOS Submission Creates Incident with Idempotency Key
    // -------------------------------------------------------------
    let firstIncident: any = null;
    const testKey1 = "idemp_test_key_001";

    await test("Scenario 1: Initial SOS submission creates exactly one incident", async () => {
      firstIncident = await EmergencyService.createIncident({
        idempotencyKey: testKey1,
        userId: "user_tanish",
        memberId: "SECD1000TAAM",
        callerName: "Tanish Alam",
        callerPhone: "+91 98300 12345",
        triggerSource: "MEMBER_APP_SOS",
        latitude: 22.5726,
        longitude: 88.3639,
        accuracy: 10,
      });

      assert(firstIncident, "Incident should be created");
      assert.strictEqual(firstIncident.idempotencyKey, testKey1);
      assert.strictEqual(firstIncident.status, "TRIGGERED");
      assert.strictEqual(firstIncident.classification, "CODE_RED");
      assert.strictEqual(incidentStore.length, 1);
    });

    // -------------------------------------------------------------
    // Test 2: Retried SOS Submission with Same Key Returns Existing Incident
    // -------------------------------------------------------------
    await test("Scenario 2: Retrying SOS with same idempotencyKey returns existing incident without creating duplicates", async () => {
      const secondAttempt = await EmergencyService.createIncident({
        idempotencyKey: testKey1,
        userId: "user_tanish",
        memberId: "SECD1000TAAM",
        callerName: "Tanish Alam",
        callerPhone: "+91 98300 12345",
        triggerSource: "MEMBER_APP_SOS",
        latitude: 22.5726,
        longitude: 88.3639,
      });

      assert.strictEqual(secondAttempt.id, firstIncident.id, "Must return the same incident ID");
      assert.strictEqual(secondAttempt.incidentNumber, firstIncident.incidentNumber, "Must return same incident number");
      assert.strictEqual(incidentStore.length, 1, "Incident store must not increment");
    });

    // -------------------------------------------------------------
    // Test 3: Concurrent SOS Submissions with Same Key
    // -------------------------------------------------------------
    await test("Scenario 3: 10 concurrent duplicate SOS requests result in exactly one persistent incident", async () => {
      const concurrentKey = "idemp_concurrent_key_002";
      const promises = Array.from({ length: 10 }, () =>
        EmergencyService.createIncident({
          idempotencyKey: concurrentKey,
          userId: "user_tanish",
          memberId: "SECD1000TAAM",
          triggerSource: "MEMBER_APP_SOS",
        })
      );

      const results = await Promise.all(promises);
      const uniqueIds = new Set(results.map((r) => r.id));
      assert.strictEqual(uniqueIds.size, 1, "All concurrent calls must return the identical incident ID");

      const inStore = incidentStore.filter((i) => i.idempotencyKey === concurrentKey);
      assert.strictEqual(inStore.length, 1, "Exactly one record stored in database");
    });

    // -------------------------------------------------------------
    // Test 4: Member ID Fallback Address Enrichment
    // -------------------------------------------------------------
    await test("Scenario 4: SOS without active session userId enriches registered service address via memberId", async () => {
      const offlineKey = "idemp_offline_key_003";
      // Simulate expired session: userId is null, but cached canonical memberId is supplied
      const offlineIncident = await EmergencyService.createIncident({
        idempotencyKey: offlineKey,
        userId: null,
        memberId: "SECD1000TAAM",
        triggerSource: "MEMBER_APP_SOS",
        latitude: null,
        longitude: null,
      });

      assert(offlineIncident, "Incident created with memberId");
      assert.strictEqual(offlineIncident.userId, "user_tanish", "UserId resolved from memberProfile");
      assert.strictEqual(offlineIncident.callerName, "Mr Tanish Alam", "CallerName enriched");
      assert.strictEqual(offlineIncident.fallbackAddress, "12/A Southern Avenue, Kolkata 700029", "Registered service address attached");
    });

    // -------------------------------------------------------------
    // Test 5: Distinct Idempotency Key Creates New Incident
    // -------------------------------------------------------------
    await test("Scenario 5: Distinct idempotencyKey creates independent incident", async () => {
      const distinctKey = "idemp_distinct_key_004";
      const distinctIncident = await EmergencyService.createIncident({
        idempotencyKey: distinctKey,
        userId: "user_tanish",
        memberId: "SECD1000TAAM",
        triggerSource: "MEMBER_APP_SOS",
      });

      assert.notStrictEqual(distinctIncident.id, firstIncident.id);
      assert.strictEqual(distinctIncident.idempotencyKey, distinctKey);
    });

  } finally {
    // Restore mocks
    (db.emergencyIncident as any).findUnique = originalFindUnique;
    (db.emergencyIncident as any).create = originalCreate;
    (db as any).$transaction = originalTx;
    if ((db.memberProfile as any)?.findUnique) {
      (db.memberProfile as any).findUnique = originalMemberFindUnique;
    }
    if ((db.user as any)?.findUnique) {
      (db.user as any).findUnique = originalUserFindUnique;
    }
  }

  console.log("\n================================================================");
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log("================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test Suite execution failed:", err);
  process.exit(1);
});
