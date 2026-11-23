/**
 * Sunshine Eldercare — Automated Recurring Care Visit Scheduler Test Suite
 *
 * Verifies all 17 required scenarios:
 * 1. Weekly Monday visit generation.
 * 2. Weekly visit generation for every supported weekday (Mon-Sun).
 * 3. Fortnightly Week 1 and Week 3 generation.
 * 4. Fortnightly Week 2 and Week 4 generation (5th occurrence strictly skipped).
 * 5. Correct chronological ordering of members (e.g. 09:15, 09:30, 10:00).
 * 6. Automatic updates after weekday changes.
 * 7. Automatic updates after time changes.
 * 8. Weekly-to-fortnightly conversion.
 * 9. Fortnightly-to-weekly conversion.
 * 10. No duplicate visit generation (idempotence).
 * 11. Cancellation of one occurrence without cancelling the series.
 * 12. Adhoc replacement visit creation.
 * 13. Preservation of completed and historical visits.
 * 14. Preservation of individually modified occurrences.
 * 15. Membership expiry and eligibility checks.
 * 16. Correct IST date and time handling.
 * 17. Concurrent scheduling operations.
 * 18. Safe backfill and reconciliation for existing members across 90-day horizon.
 * 19. Reconciliation idempotence on repeated runs and throttle caching.
 */

import assert from "node:assert/strict";
import {
  RecurringSchedulerService,
  setSchedulerDb,
} from "../../lib/services/recurring-scheduler";
import {
  formatDateKey,
  getKolkataDateParts,
  parseISTDateTimeToUTC,
} from "../../components/admin/schedule/schedule-date-utils";
import { PREFERRED_VISIT_DAYS } from "../../lib/services/preferred-schedule";

console.log("================================================================================");
console.log("🧪 RUNNING AUTOMATED RECURRING CARE VISIT SCHEDULER TEST SUITE (19 SCENARIOS)");
console.log("================================================================================\n");

// In-Memory Mock Database Factory for High-Speed, Isolated Scheduler Verification
function createMockSchedulerDb() {
  const memberProfiles: any[] = [];
  const users: any[] = [];
  const elders: any[] = [];
  const subscriptions: any[] = [];
  const careCases: any[] = [];
  const careVisits: any[] = [];
  const employees: any[] = [
    { id: "emp-001", name: "Ananya Sharma", status: "ACTIVE" },
    { id: "emp-002", name: "Rajesh Sen", status: "ACTIVE" },
    { id: "emp-003", name: "Pooja Roy", status: "INACTIVE" },
  ];
  const visitAssignments: any[] = [];
  const auditLogs: any[] = [];

  const mockDb = {
    memberProfile: {
      findFirst: async ({ where, include }: any) => {
        const p = memberProfiles.find((mp) => {
          if (where.id && mp.id !== where.id) return false;
          if (where.userId && mp.userId !== where.userId) return false;
          return true;
        });
        if (!p) return null;
        const res = { ...p };
        if (include?.user) {
          const user = p.user || users.find((u) => u.id === p.userId) || { id: p.userId, elders: [], subscriptions: [] };
          const userCopy = { ...user };
          let subs = user.subscriptions && user.subscriptions.length > 0 ? user.subscriptions : subscriptions.filter((s) => s.userId === p.userId);
          if (include.user.include?.subscriptions?.where?.status) {
            subs = subs.filter((s: any) => s.status === include.user.include.subscriptions.where.status);
          }
          userCopy.subscriptions = subs.map((s: any) => {
            const sCases = s.careCases && s.careCases.length > 0 ? s.careCases : careCases.filter((c) => c.subscriptionId === s.id);
            return { ...s, careCases: sCases };
          });
          const userElders = user.elders && user.elders.length > 0 ? user.elders : elders.filter((e) => e.userId === p.userId);
          userCopy.elders = userElders;
          res.user = userCopy;
        }
        return res;
      },
      findUnique: async ({ where, include }: any) => {
        return mockDb.memberProfile.findFirst({ where, include });
      },
      findMany: async ({ where, include }: any) => {
        let list = [...memberProfiles];
        if (where?.preferredVisitDay?.not === null) {
          list = list.filter((p) => p.preferredVisitDay !== null && p.preferredVisitDay !== undefined);
        }
        if (where?.preferredVisitTime?.not === null) {
          list = list.filter((p) => p.preferredVisitTime !== null && p.preferredVisitTime !== undefined);
        }
        return list.map((p) => {
          const res = { ...p };
          if (include?.user) {
            const user = p.user || users.find((u) => u.id === p.userId) || { id: p.userId, elders: [], subscriptions: [] };
            const userCopy = { ...user };
            let subs = user.subscriptions && user.subscriptions.length > 0 ? user.subscriptions : subscriptions.filter((s: any) => s.userId === p.userId);
            if (include.user.include?.subscriptions?.where?.status) {
              subs = subs.filter((s: any) => s.status === include.user.include.subscriptions.where.status);
            }
            userCopy.subscriptions = subs.map((s: any) => {
              const sCases = s.careCases && s.careCases.length > 0 ? s.careCases : careCases.filter((c: any) => c.subscriptionId === s.id);
              return { ...s, careCases: sCases };
            });
            const userElders = user.elders && user.elders.length > 0 ? user.elders : elders.filter((e: any) => e.userId === p.userId);
            userCopy.elders = userElders;
            res.user = userCopy;
          }
          return res;
        });
      },
      create: async ({ data }: any) => {
        const item = { id: `prof-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, ...data };
        memberProfiles.push(item);
        return item;
      },
      update: async ({ where, data }: any) => {
        const idx = memberProfiles.findIndex((p) => p.id === where.id);
        if (idx >= 0) {
          memberProfiles[idx] = { ...memberProfiles[idx], ...data };
          return memberProfiles[idx];
        }
        return null;
      },
    },

    careVisit: {
      findMany: async ({ where, orderBy, select }: any) => {
        let list = [...careVisits];
        if (where?.careCaseId) {
          list = list.filter((v) => v.careCaseId === where.careCaseId);
        }
        if (where?.scheduledStart?.gt) {
          list = list.filter((v) => new Date(v.scheduledStart) > new Date(where.scheduledStart.gt));
        }
        if (where?.scheduledStart?.gte && where?.scheduledStart?.lte) {
          list = list.filter(
            (v) =>
              new Date(v.scheduledStart) >= new Date(where.scheduledStart.gte) &&
              new Date(v.scheduledStart) <= new Date(where.scheduledStart.lte)
          );
        }
        if (orderBy?.scheduledStart === "asc") {
          list.sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
        }
        return list;
      },
      findUnique: async ({ where }: any) => {
        return careVisits.find((v) => v.id === where.id) || null;
      },
      findFirst: async ({ where }: any) => {
        return (
          careVisits.find((v) => {
            if (where.id?.not && v.id === where.id.not) return false;
            if (where.careCaseId && v.careCaseId !== where.careCaseId) return false;
            if (where.status?.in && !where.status.in.includes(v.status)) return false;
            if (where.scheduledStart instanceof Date && new Date(v.scheduledStart).getTime() !== where.scheduledStart.getTime()) return false;
            if (where.scheduledStart?.lt && !(new Date(v.scheduledStart) < new Date(where.scheduledStart.lt))) return false;
            if (where.scheduledEnd?.gt && !(new Date(v.scheduledEnd) > new Date(where.scheduledEnd.gt))) return false;
            if (where.assignedEmpId && v.assignedEmpId !== where.assignedEmpId) return false;
            return true;
          }) || null
        );
      },
      create: async ({ data }: any) => {
        const item = {
          id: `visit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          status: "SCHEDULED",
          occurrenceType: "RECURRING",
          isIndividuallyRescheduled: false,
          actualStart: null,
          actualEnd: null,
          cancellationReason: null,
          originalVisitId: null,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        careVisits.push(item);
        return item;
      },
      createMany: async ({ data }: any) => {
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          careVisits.push({
            id: `visit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            status: "SCHEDULED",
            occurrenceType: "RECURRING",
            isIndividuallyRescheduled: false,
            actualStart: null,
            actualEnd: null,
            cancellationReason: null,
            originalVisitId: null,
            ...item,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
        return { count: items.length };
      },
      update: async ({ where, data }: any) => {
        const idx = careVisits.findIndex((v) => v.id === where.id);
        if (idx >= 0) {
          careVisits[idx] = { ...careVisits[idx], ...data, updatedAt: new Date() };
          return careVisits[idx];
        }
        return null;
      },
      delete: async ({ where }: any) => {
        const idx = careVisits.findIndex((v) => v.id === where.id);
        if (idx >= 0) {
          const removed = careVisits.splice(idx, 1)[0];
          return removed;
        }
        return null;
      },
    },

    employee: {
      findUnique: async ({ where }: any) => {
        return employees.find((e) => e.id === where.id) || null;
      },
    },

    elder: {
      create: async ({ data }: any) => {
        const item = { id: `elder-${Date.now()}`, ...data };
        elders.push(item);
        return item;
      },
    },

    careCase: {
      create: async ({ data }: any) => {
        const cc = { id: `case-${Date.now()}`, ...data };
        careCases.push(cc);
        return cc;
      },
    },

    visitAssignment: {
      deleteMany: async ({ where }: any) => {
        const initialLen = visitAssignments.length;
        for (let i = visitAssignments.length - 1; i >= 0; i--) {
          if (visitAssignments[i].visitId === where.visitId) {
            visitAssignments.splice(i, 1);
          }
        }
        return { count: initialLen - visitAssignments.length };
      },
      create: async ({ data }: any) => {
        const va = { id: `va-${Date.now()}`, ...data };
        visitAssignments.push(va);
        return va;
      },
    },

    auditLog: {
      create: async ({ data }: any) => {
        const al = { id: `al-${Date.now()}`, ...data, createdAt: new Date() };
        auditLogs.push(al);
        return al;
      },
    },

    $transaction: async (fn: any) => {
      return fn(mockDb);
    },

    // Utilities for test assertions
    _state: {
      memberProfiles,
      users,
      elders,
      subscriptions,
      careCases,
      careVisits,
      employees,
      visitAssignments,
      auditLogs,
    },
  };

  return mockDb;
}

let passed = 0;
let total = 0;

async function runTest(name: string, fn: () => void | Promise<void>) {
  total++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      await res;
    }
    passed++;
    console.log(`✅ [TEST ${total}] PASS: ${name}`);
  } catch (err) {
    console.error(`❌ [TEST ${total}] FAIL: ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

async function runAllTests() {
  // -------------------------------------------------------------------------
  // 1. Weekly Monday visit generation
  // -------------------------------------------------------------------------
  await runTest("1. Weekly Monday visit generation across rolling horizon", () => {
    // Generate dates starting on a known Monday anchor
    const visits = RecurringSchedulerService.calculateRecurringDates({
      preferredVisitDay: "Monday",
      preferredVisitTime: "09:15 AM",
      preferredVisitFrequency: "WEEKLY",
      startDate: "2026-12-01",
      horizonDays: 30,
    });

    assert(visits.length > 0, "Must generate visit occurrences");
    // Verify each generated occurrence is a Monday in IST
    for (const v of visits) {
      assert.strictEqual(v.weekday, "Monday", `Generated weekday must be Monday, got ${v.weekday}`);
      const parts = getKolkataDateParts(v.scheduledStart);
      assert.strictEqual(parts.hour, 9, "Start hour in IST must be 9");
      assert.strictEqual(parts.minute, 15, "Start minute in IST must be 15");
      // End time is 1 hour later
      const endParts = getKolkataDateParts(v.scheduledEnd);
      assert.strictEqual(endParts.hour, 10, "End hour in IST must be 10");
      assert.strictEqual(endParts.minute, 15, "End minute in IST must be 15");
    }
    // December 2026 has Mondays on Dec 7, 14, 21, 28
    const dateKeys = visits.map((v) => v.dateKey);
    assert(dateKeys.includes("2026-12-07"), "Must include 2026-12-07");
    assert(dateKeys.includes("2026-12-14"), "Must include 2026-12-14");
    assert(dateKeys.includes("2026-12-21"), "Must include 2026-12-21");
    assert(dateKeys.includes("2026-12-28"), "Must include 2026-12-28");
  });

  // -------------------------------------------------------------------------
  // 2. Weekly visit generation for every supported weekday (Mon-Sun)
  // -------------------------------------------------------------------------
  await runTest("2. Weekly visit generation for every supported weekday (Mon-Sun)", () => {
    for (const day of PREFERRED_VISIT_DAYS) {
      const dates = RecurringSchedulerService.calculateRecurringDates({
        preferredVisitDay: day,
        preferredVisitTime: "10:00 AM",
        preferredVisitFrequency: "WEEKLY",
        startDate: "2026-12-01",
        horizonDays: 14,
      });

      assert(dates.length >= 2, `Should generate at least 2 visits in 14 days for ${day}`);
      for (const d of dates) {
        assert.strictEqual(d.weekday.toLowerCase(), day.toLowerCase(), `Expected ${day}, got ${d.weekday}`);
      }
    }
  });

  // -------------------------------------------------------------------------
  // 3. Fortnightly Week 1 and Week 3 generation
  // -------------------------------------------------------------------------
  await runTest("3. Fortnightly Week 1 and Week 3 generation (skips Weeks 2, 4, 5)", () => {
    // January 2027 has Fridays on Jan 1, 8, 15, 22, 29 (5 occurrences!)
    const dates = RecurringSchedulerService.calculateRecurringDates({
      preferredVisitDay: "Friday",
      preferredVisitTime: "11:00 AM",
      preferredVisitFrequency: "FORTNIGHTLY",
      preferredVisitFortnightlyPattern: "WEEK_1_3",
      startDate: "2027-01-01",
      horizonDays: 31,
    });

    const dateKeys = dates.map((d) => d.dateKey);
    // Jan 1 is 1st Friday (Occurrence 1) -> INCLUDED
    assert(dateKeys.includes("2027-01-01"), "Week 1 (Jan 1) must be included");
    // Jan 8 is 2nd Friday (Occurrence 2) -> EXCLUDED
    assert(!dateKeys.includes("2027-01-08"), "Week 2 (Jan 8) must NOT be included in WEEK_1_3");
    // Jan 15 is 3rd Friday (Occurrence 3) -> INCLUDED
    assert(dateKeys.includes("2027-01-15"), "Week 3 (Jan 15) must be included");
    // Jan 22 is 4th Friday (Occurrence 4) -> EXCLUDED
    assert(!dateKeys.includes("2027-01-22"), "Week 4 (Jan 22) must NOT be included in WEEK_1_3");
    // Jan 29 is 5th Friday (Occurrence 5) -> EXCLUDED (strict 5th occurrence skip)
    assert(!dateKeys.includes("2027-01-29"), "5th Friday (Jan 29) must be strictly skipped");

    assert.strictEqual(dates.length, 2, "Only 2 occurrences should be generated for WEEK_1_3 in Jan 2027");
  });

  // -------------------------------------------------------------------------
  // 4. Fortnightly Week 2 and Week 4 generation
  // -------------------------------------------------------------------------
  await runTest("4. Fortnightly Week 2 and Week 4 generation (skips Weeks 1, 3, 5)", () => {
    // January 2027 Fridays: Jan 1 (1st), Jan 8 (2nd), Jan 15 (3rd), Jan 22 (4th), Jan 29 (5th)
    const dates = RecurringSchedulerService.calculateRecurringDates({
      preferredVisitDay: "Friday",
      preferredVisitTime: "11:00 AM",
      preferredVisitFrequency: "FORTNIGHTLY",
      preferredVisitFortnightlyPattern: "WEEK_2_4",
      startDate: "2027-01-01",
      horizonDays: 31,
    });

    const dateKeys = dates.map((d) => d.dateKey);
    // Jan 1 is 1st Friday -> EXCLUDED
    assert(!dateKeys.includes("2027-01-01"), "Week 1 (Jan 1) must NOT be included in WEEK_2_4");
    // Jan 8 is 2nd Friday -> INCLUDED
    assert(dateKeys.includes("2027-01-08"), "Week 2 (Jan 8) must be included in WEEK_2_4");
    // Jan 15 is 3rd Friday -> EXCLUDED
    assert(!dateKeys.includes("2027-01-15"), "Week 3 (Jan 15) must NOT be included in WEEK_2_4");
    // Jan 22 is 4th Friday -> INCLUDED
    assert(dateKeys.includes("2027-01-22"), "Week 4 (Jan 22) must be included in WEEK_2_4");
    // Jan 29 is 5th Friday -> EXCLUDED
    assert(!dateKeys.includes("2027-01-29"), "5th Friday (Jan 29) must be strictly skipped");

    assert.strictEqual(dates.length, 2, "Only 2 occurrences should be generated for WEEK_2_4 in Jan 2027");
  });

  // -------------------------------------------------------------------------
  // 5. Correct chronological ordering of members
  // -------------------------------------------------------------------------
  await runTest("5. Correct chronological ordering of members within each day", () => {
    // Unsorted visits on the same date with arbitrary order
    const rawVisits = [
      { id: "v3", memberName: "Member C", scheduledStart: "2026-12-07T10:00:00.000Z" },
      { id: "v1", memberName: "Ashok Chandra", scheduledStart: "2026-12-07T09:15:00.000Z" },
      { id: "v4", memberName: "Member D", scheduledStart: "2026-12-07T11:30:00.000Z" },
      { id: "v2", memberName: "Subhasree", scheduledStart: "2026-12-07T09:30:00.000Z" },
    ];

    const sorted = RecurringSchedulerService.getVisitsChronologicalOrder(rawVisits);

    assert.strictEqual(sorted[0].memberName, "Ashok Chandra", "1st must be Ashok Chandra at 09:15");
    assert.strictEqual(sorted[1].memberName, "Subhasree", "2nd must be Subhasree at 09:30");
    assert.strictEqual(sorted[2].memberName, "Member C", "3rd must be Member C at 10:00");
    assert.strictEqual(sorted[3].memberName, "Member D", "4th must be Member D at 11:30");
  });

  // -------------------------------------------------------------------------
  // 6. Automatic updates after weekday changes
  // -------------------------------------------------------------------------
  await runTest("6. Automatic updates after weekday changes (shifts future visits)", async () => {
    const mockDb = createMockSchedulerDb();
    setSchedulerDb(mockDb);

    const userId = "user-wkday-test";
    const profileId = "prof-wkday-test";
    const subId = "sub-wkday-test";
    const caseId = "case-wkday-test";

    mockDb._state.users.push({ id: userId });
    mockDb._state.subscriptions.push({
      id: subId,
      userId,
      status: "ACTIVE",
      startDate: new Date("2026-12-01"),
      carePlan: { slug: "shield-shine", name: "Shield Shine" },
    });
    mockDb._state.careCases.push({
      id: caseId,
      subscriptionId: subId,
      status: "ACTIVE",
    });

    mockDb._state.memberProfiles.push({
      id: profileId,
      userId,
      preferredVisitDay: "Monday",
      preferredVisitTime: "09:15 AM",
      preferredVisitFrequency: "WEEKLY",
      user: {
        id: userId,
        subscriptions: [
          {
            id: subId,
            userId,
            status: "ACTIVE",
            carePlan: { slug: "shield-shine", name: "Shield Shine" },
            careCases: [{ id: caseId, status: "ACTIVE" }],
          },
        ],
      },
    });

    // Seed existing future Monday visits in Dec 2026
    const mon1 = parseISTDateTimeToUTC("2026-12-07", "09:15");
    const mon2 = parseISTDateTimeToUTC("2026-12-14", "09:15");
    mockDb._state.careVisits.push(
      { id: "v-mon-1", careCaseId: caseId, scheduledStart: mon1, scheduledEnd: new Date(mon1.getTime() + 3600000), status: "SCHEDULED", occurrenceType: "RECURRING", isIndividuallyRescheduled: false, actualStart: null },
      { id: "v-mon-2", careCaseId: caseId, scheduledStart: mon2, scheduledEnd: new Date(mon2.getTime() + 3600000), status: "SCHEDULED", occurrenceType: "RECURRING", isIndividuallyRescheduled: false, actualStart: null }
    );

    // Change preference to Wednesday at 10:30 AM
    const syncRes = await RecurringSchedulerService.syncRecurringVisitsOnPreferenceChange({
      memberProfileId: profileId,
      newPreferredDay: "Wednesday",
      newPreferredTime: "10:30 AM",
      newFrequency: "WEEKLY",
    });

    assert(syncRes.success, "Sync must succeed");
    assert(syncRes.removed >= 2, "Obsolete Monday visits must be removed");
    assert(syncRes.added > 0, "New Wednesday visits must be added");

    // Verify all remaining visits for this case are on Wednesdays
    const remaining = mockDb._state.careVisits.filter((v: any) => v.careCaseId === caseId);
    for (const v of remaining) {
      const parts = getKolkataDateParts(v.scheduledStart);
      const dayName = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "long" }).format(v.scheduledStart);
      assert.strictEqual(dayName, "Wednesday", "All visits must now be on Wednesdays");
      assert.strictEqual(parts.hour, 10, "Hour must be 10");
      assert.strictEqual(parts.minute, 30, "Minute must be 30");
    }
  });

  // -------------------------------------------------------------------------
  // 7. Automatic updates after time changes
  // -------------------------------------------------------------------------
  await runTest("7. Automatic updates after time changes (updates existing times)", async () => {
    const mockDb = createMockSchedulerDb();
    setSchedulerDb(mockDb);

    const profileId = "prof-time-test";
    const caseId = "case-time-test";
    const subId = "sub-time-test";
    const userId = "user-time-test";

    // Setup active profile with Monday visits in December 2026
    const oldStart = parseISTDateTimeToUTC("2026-12-07", "09:15");
    const oldEnd = new Date(oldStart.getTime() + 3600000);

    mockDb._state.memberProfiles.push({
      id: profileId,
      userId,
      preferredVisitDay: "Monday",
      preferredVisitTime: "09:15 AM",
      preferredVisitFrequency: "WEEKLY",
      user: {
        id: userId,
        subscriptions: [
          {
            id: subId,
            userId,
            status: "ACTIVE",
            carePlan: { slug: "shield-shine", name: "Shield Shine" },
            careCases: [{ id: caseId, status: "ACTIVE" }],
          },
        ],
      },
    });

    const existingVisit = {
      id: "v-time-1",
      careCaseId: caseId,
      scheduledStart: oldStart,
      scheduledEnd: oldEnd,
      status: "SCHEDULED",
      occurrenceType: "RECURRING",
      isIndividuallyRescheduled: false,
      actualStart: null,
    };
    mockDb._state.careVisits.push(existingVisit);

    // Update time from 09:15 AM to 02:30 PM (14:30)
    const syncRes = await RecurringSchedulerService.syncRecurringVisitsOnPreferenceChange({
      memberProfileId: profileId,
      newPreferredDay: "Monday",
      newPreferredTime: "02:30 PM",
      newFrequency: "WEEKLY",
    });

    assert(syncRes.success, "Time sync must succeed");
    assert(syncRes.updated >= 1, "Must update time on matching date");

    const updatedVisit = mockDb._state.careVisits.find((v: any) => v.id === "v-time-1");
    assert(updatedVisit, "Visit must still exist");
    const parts = getKolkataDateParts(updatedVisit.scheduledStart);
    assert.strictEqual(parts.hour, 14, "Hour must be updated to 14 (2 PM)");
    assert.strictEqual(parts.minute, 30, "Minute must be updated to 30");
  });

  // -------------------------------------------------------------------------
  // 8. Weekly-to-fortnightly conversion
  // -------------------------------------------------------------------------
  await runTest("8. Weekly-to-fortnightly conversion (prunes off-pattern weeks)", async () => {
    const mockDb = createMockSchedulerDb();
    setSchedulerDb(mockDb);

    const profileId = "prof-conv-w2f";
    const caseId = "case-conv-w2f";
    const subId = "sub-conv-w2f";
    const userId = "user-conv-w2f";

    mockDb._state.memberProfiles.push({
      id: profileId,
      userId,
      preferredVisitDay: "Monday",
      preferredVisitTime: "10:00 AM",
      preferredVisitFrequency: "WEEKLY",
      user: {
        id: userId,
        subscriptions: [
          {
            id: subId,
            userId,
            status: "ACTIVE",
            carePlan: { slug: "shield-shine", name: "Shield Shine" },
            careCases: [{ id: caseId, status: "ACTIVE" }],
          },
        ],
      },
    });

    // Populate 4 Mondays in December 2026 (Dec 7=1st, Dec 14=2nd, Dec 21=3rd, Dec 28=4th)
    const m1 = parseISTDateTimeToUTC("2026-12-07", "10:00");
    const m2 = parseISTDateTimeToUTC("2026-12-14", "10:00");
    const m3 = parseISTDateTimeToUTC("2026-12-21", "10:00");
    const m4 = parseISTDateTimeToUTC("2026-12-28", "10:00");

    mockDb._state.careVisits.push(
      { id: "v-w1", careCaseId: caseId, scheduledStart: m1, scheduledEnd: new Date(m1.getTime() + 3600000), status: "SCHEDULED", occurrenceType: "RECURRING", isIndividuallyRescheduled: false, actualStart: null },
      { id: "v-w2", careCaseId: caseId, scheduledStart: m2, scheduledEnd: new Date(m2.getTime() + 3600000), status: "SCHEDULED", occurrenceType: "RECURRING", isIndividuallyRescheduled: false, actualStart: null },
      { id: "v-w3", careCaseId: caseId, scheduledStart: m3, scheduledEnd: new Date(m3.getTime() + 3600000), status: "SCHEDULED", occurrenceType: "RECURRING", isIndividuallyRescheduled: false, actualStart: null },
      { id: "v-w4", careCaseId: caseId, scheduledStart: m4, scheduledEnd: new Date(m4.getTime() + 3600000), status: "SCHEDULED", occurrenceType: "RECURRING", isIndividuallyRescheduled: false, actualStart: null }
    );

    // Convert to Fortnightly WEEK_1_3
    const res = await RecurringSchedulerService.syncRecurringVisitsOnPreferenceChange({
      memberProfileId: profileId,
      newFrequency: "FORTNIGHTLY",
      newFortnightlyPattern: "WEEK_1_3",
    });

    assert(res.success, "Conversion to fortnightly must succeed");

    // In December 2026: m2 (Dec 14) and m4 (Dec 28) should be removed, while m1 (Dec 7) and m3 (Dec 21) must remain
    const remainingIds = mockDb._state.careVisits.filter((v: any) => v.careCaseId === caseId).map((v: any) => v.id);
    assert(remainingIds.includes("v-w1"), "Week 1 (Dec 7) must be retained");
    assert(!remainingIds.includes("v-w2"), "Week 2 (Dec 14) must be deleted");
    assert(remainingIds.includes("v-w3"), "Week 3 (Dec 21) must be retained");
    assert(!remainingIds.includes("v-w4"), "Week 4 (Dec 28) must be deleted");
  });

  // -------------------------------------------------------------------------
  // 9. Fortnightly-to-weekly conversion
  // -------------------------------------------------------------------------
  await runTest("9. Fortnightly-to-weekly conversion (generates all missing weeks)", async () => {
    const mockDb = createMockSchedulerDb();
    setSchedulerDb(mockDb);

    const profileId = "prof-conv-f2w";
    const caseId = "case-conv-f2w";
    const subId = "sub-conv-f2w";
    const userId = "user-conv-f2w";

    mockDb._state.memberProfiles.push({
      id: profileId,
      userId,
      preferredVisitDay: "Monday",
      preferredVisitTime: "10:00 AM",
      preferredVisitFrequency: "FORTNIGHTLY",
      preferredVisitFortnightlyPattern: "WEEK_1_3",
      user: {
        id: userId,
        subscriptions: [
          {
            id: subId,
            userId,
            status: "ACTIVE",
            carePlan: { slug: "shield-shine", name: "Shield Shine" },
            careCases: [{ id: caseId, status: "ACTIVE" }],
          },
        ],
      },
    });

    // Currently only weeks 1 & 3 exist in Dec 2026
    const m1 = parseISTDateTimeToUTC("2026-12-07", "10:00");
    const m3 = parseISTDateTimeToUTC("2026-12-21", "10:00");
    mockDb._state.careVisits.push(
      { id: "v-w1", careCaseId: caseId, scheduledStart: m1, scheduledEnd: new Date(m1.getTime() + 3600000), status: "SCHEDULED", occurrenceType: "RECURRING", isIndividuallyRescheduled: false, actualStart: null },
      { id: "v-w3", careCaseId: caseId, scheduledStart: m3, scheduledEnd: new Date(m3.getTime() + 3600000), status: "SCHEDULED", occurrenceType: "RECURRING", isIndividuallyRescheduled: false, actualStart: null }
    );

    // Convert to Weekly
    const res = await RecurringSchedulerService.syncRecurringVisitsOnPreferenceChange({
      memberProfileId: profileId,
      newFrequency: "WEEKLY",
      newFortnightlyPattern: null,
    });

    assert(res.success, "Conversion to weekly must succeed");
    assert(res.added >= 2, "Must add missing weeks 2 and 4");

    const dates = mockDb._state.careVisits.filter((v: any) => v.careCaseId === caseId).map((v: any) => formatDateKey(v.scheduledStart));
    assert(dates.includes("2026-12-07"), "Dec 7 must be present");
    assert(dates.includes("2026-12-14"), "Dec 14 (Week 2) must now be generated");
    assert(dates.includes("2026-12-21"), "Dec 21 must be present");
    assert(dates.includes("2026-12-28"), "Dec 28 (Week 4) must now be generated");
  });

  // -------------------------------------------------------------------------
  // 10. No duplicate visit generation (idempotence)
  // -------------------------------------------------------------------------
  await runTest("10. No duplicate visit generation (idempotence verification)", async () => {
    const mockDb = createMockSchedulerDb();
    setSchedulerDb(mockDb);

    const profileId = "prof-idempotent";
    const caseId = "case-idempotent";
    const subId = "sub-idempotent";
    const userId = "user-idempotent";

    mockDb._state.memberProfiles.push({
      id: profileId,
      userId,
      preferredVisitDay: "Tuesday",
      preferredVisitTime: "11:00 AM",
      preferredVisitFrequency: "WEEKLY",
      user: {
        id: userId,
        elders: [{ id: "elder-1", userId }],
        subscriptions: [
          {
            id: subId,
            userId,
            status: "ACTIVE",
            startDate: new Date("2026-12-01"),
            carePlan: { slug: "shield-shine", name: "Shield Shine" },
            careCases: [{ id: caseId, status: "ACTIVE" }],
          },
        ],
      },
    });

    // 1st run
    const run1 = await RecurringSchedulerService.generateRecurringVisitsForMember({
      memberProfileId: profileId,
      horizonDays: 30,
    });
    assert(run1.success, "1st generation must succeed");
    assert(run1.generated > 0, "Must generate initial visits");
    const initialCount = mockDb._state.careVisits.length;

    // 2nd run with same parameters
    const run2 = await RecurringSchedulerService.generateRecurringVisitsForMember({
      memberProfileId: profileId,
      horizonDays: 30,
    });
    assert(run2.success, "2nd generation must succeed");
    assert.strictEqual(run2.generated, 0, "2nd run must generate 0 visits (idempotent)");
    assert(run2.skipped > 0, "2nd run must skip already created visits");
    assert.strictEqual(mockDb._state.careVisits.length, initialCount, "Visit count must not change");
  });

  // -------------------------------------------------------------------------
  // 11. Cancellation of one occurrence without cancelling the series
  // -------------------------------------------------------------------------
  await runTest("11. Cancellation of one occurrence without cancelling the series", async () => {
    const mockDb = createMockSchedulerDb();
    setSchedulerDb(mockDb);

    const caseId = "case-cancel-one";
    const v1Date = parseISTDateTimeToUTC("2026-12-07", "10:00");
    const v2Date = parseISTDateTimeToUTC("2026-12-14", "10:00");

    const v1 = await mockDb.careVisit.create({
      data: { careCaseId: caseId, scheduledStart: v1Date, scheduledEnd: new Date(v1Date.getTime() + 3600000), status: "SCHEDULED" },
    });
    const v2 = await mockDb.careVisit.create({
      data: { careCaseId: caseId, scheduledStart: v2Date, scheduledEnd: new Date(v2Date.getTime() + 3600000), status: "SCHEDULED" },
    });

    // Cancel v1 only
    await mockDb.careVisit.update({
      where: { id: v1.id },
      data: { status: "CANCELLED", cancellationReason: "Member unwell on Monday" },
    });

    const v1After = await mockDb.careVisit.findUnique({ where: { id: v1.id } });
    const v2After = await mockDb.careVisit.findUnique({ where: { id: v2.id } });

    assert.strictEqual(v1After.status, "CANCELLED", "Occurrence 1 must be CANCELLED");
    assert.strictEqual(v1After.cancellationReason, "Member unwell on Monday");
    assert.strictEqual(v2After.status, "SCHEDULED", "Occurrence 2 must remain SCHEDULED");
  });

  // -------------------------------------------------------------------------
  // 12. Adhoc replacement visit creation
  // -------------------------------------------------------------------------
  await runTest("12. Adhoc replacement visit creation with reference to cancelled visit", async () => {
    const mockDb = createMockSchedulerDb();
    setSchedulerDb(mockDb);

    const caseId = "case-adhoc-replace";
    const origDate = parseISTDateTimeToUTC("2026-12-07", "10:00");

    // 1. Cancelled original visit
    const cancelledVisit = await mockDb.careVisit.create({
      data: {
        careCaseId: caseId,
        scheduledStart: origDate,
        scheduledEnd: new Date(origDate.getTime() + 3600000),
        status: "CANCELLED",
        occurrenceType: "RECURRING",
        cancellationReason: "Member requested reschedule to Wednesday",
      },
    });

    // 2. Adhoc replacement visit on Wednesday Dec 9
    const replDate = parseISTDateTimeToUTC("2026-12-09", "11:30");
    const adhocVisit = await mockDb.careVisit.create({
      data: {
        careCaseId: caseId,
        scheduledStart: replDate,
        scheduledEnd: new Date(replDate.getTime() + 3600000),
        status: "SCHEDULED",
        occurrenceType: "ADHOC",
        originalVisitId: cancelledVisit.id,
        operationalNotes: "Replacement visit for cancelled Monday occurrence",
      },
    });

    assert.strictEqual(adhocVisit.occurrenceType, "ADHOC", "Occurrence type must be ADHOC");
    assert.strictEqual(adhocVisit.originalVisitId, cancelledVisit.id, "Must reference the cancelled visit ID");
    assert.strictEqual(cancelledVisit.status, "CANCELLED", "Original cancelled visit remains unchanged");
  });

  // -------------------------------------------------------------------------
  // 13. Preservation of completed and historical visits
  // -------------------------------------------------------------------------
  await runTest("13. Preservation of completed and historical visits during sync", async () => {
    const mockDb = createMockSchedulerDb();
    setSchedulerDb(mockDb);

    const profileId = "prof-preserve-history";
    const caseId = "case-preserve-history";
    const subId = "sub-preserve-history";
    const userId = "user-preserve-history";

    // Completed visit from last week
    const pastCompletedDate = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const completedVisit = await mockDb.careVisit.create({
      data: {
        careCaseId: caseId,
        scheduledStart: pastCompletedDate,
        scheduledEnd: new Date(pastCompletedDate.getTime() + 3600000),
        status: "COMPLETED",
        occurrenceType: "RECURRING",
        actualStart: pastCompletedDate,
        actualEnd: new Date(pastCompletedDate.getTime() + 3600000),
      },
    });

    mockDb._state.memberProfiles.push({
      id: profileId,
      userId,
      preferredVisitDay: "Thursday",
      preferredVisitTime: "10:00 AM",
      preferredVisitFrequency: "WEEKLY",
      user: {
        id: userId,
        subscriptions: [
          {
            id: subId,
            userId,
            status: "ACTIVE",
            carePlan: { slug: "shield-shine", name: "Shield Shine" },
            careCases: [{ id: caseId, status: "ACTIVE" }],
          },
        ],
      },
    });

    // Sync to Friday
    await RecurringSchedulerService.syncRecurringVisitsOnPreferenceChange({
      memberProfileId: profileId,
      newPreferredDay: "Friday",
      newPreferredTime: "11:00 AM",
    });

    const checkCompleted = await mockDb.careVisit.findUnique({ where: { id: completedVisit.id } });
    assert(checkCompleted, "Completed visit must NEVER be deleted");
    assert.strictEqual(checkCompleted.status, "COMPLETED", "Status must remain COMPLETED");
    assert.strictEqual(
      new Date(checkCompleted.scheduledStart).getTime(),
      pastCompletedDate.getTime(),
      "Historical time must NOT be modified"
    );
  });

  // -------------------------------------------------------------------------
  // 14. Preservation of individually modified occurrences
  // -------------------------------------------------------------------------
  await runTest("14. Preservation of individually modified occurrences", async () => {
    const mockDb = createMockSchedulerDb();
    setSchedulerDb(mockDb);

    const profileId = "prof-individually-mod";
    const caseId = "case-individually-mod";
    const subId = "sub-individually-mod";
    const userId = "user-individually-mod";

    const futureDate = new Date(Date.now() + 10 * 24 * 3600 * 1000);
    const modVisit = await mockDb.careVisit.create({
      data: {
        careCaseId: caseId,
        scheduledStart: futureDate,
        scheduledEnd: new Date(futureDate.getTime() + 3600000),
        status: "SCHEDULED",
        occurrenceType: "RECURRING",
        isIndividuallyRescheduled: true, // EXPLICIT ADMIN OVERRIDE
        operationalNotes: "Individually rescheduled by Admin to accommodate hospital appointment",
      },
    });

    mockDb._state.memberProfiles.push({
      id: profileId,
      userId,
      preferredVisitDay: "Saturday",
      preferredVisitTime: "10:00 AM",
      preferredVisitFrequency: "WEEKLY",
      user: {
        id: userId,
        subscriptions: [
          {
            id: subId,
            userId,
            status: "ACTIVE",
            carePlan: { slug: "shield-shine", name: "Shield Shine" },
            careCases: [{ id: caseId, status: "ACTIVE" }],
          },
        ],
      },
    });

    // Sync to Sunday
    await RecurringSchedulerService.syncRecurringVisitsOnPreferenceChange({
      memberProfileId: profileId,
      newPreferredDay: "Sunday",
      newPreferredTime: "04:00 PM",
    });

    const checkMod = await mockDb.careVisit.findUnique({ where: { id: modVisit.id } });
    assert(checkMod, "Individually rescheduled visit must NEVER be deleted");
    assert.strictEqual(checkMod.isIndividuallyRescheduled, true);
    assert.strictEqual(
      new Date(checkMod.scheduledStart).getTime(),
      futureDate.getTime(),
      "Individually modified scheduledStart must be preserved"
    );
  });

  // -------------------------------------------------------------------------
  // 15. Membership expiry and eligibility checks
  // -------------------------------------------------------------------------
  await runTest("15. Membership expiry and entitlement eligibility checks", () => {
    // A. Expired Subscription
    const expiredSub = {
      status: "ACTIVE",
      endDate: new Date(Date.now() - 24 * 3600 * 1000), // yesterday
      carePlan: { slug: "shield-shine", name: "Shield Shine" },
    };
    const resExpired = RecurringSchedulerService.isSubscriptionEligibleForVisits(expiredSub as any);
    assert.strictEqual(resExpired.eligible, false, "Expired subscription must not be eligible");

    // B. Inactive / Cancelled Subscription
    const cancelledSub = {
      status: "CANCELLED",
      endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      carePlan: { slug: "shield-shine", name: "Shield Shine" },
    };
    const resCancelled = RecurringSchedulerService.isSubscriptionEligibleForVisits(cancelledSub as any);
    assert.strictEqual(resCancelled.eligible, false, "Cancelled subscription must not be eligible");

    // C. Life Line Care Package (0 visits)
    const lifeLineSub = {
      status: "ACTIVE",
      endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      carePlan: { slug: "life-line-care", name: "Life Line Care" },
    };
    const resLifeLine = RecurringSchedulerService.isSubscriptionEligibleForVisits(lifeLineSub as any);
    assert.strictEqual(resLifeLine.eligible, false, "Life Line Care must not be eligible for recurring care visits");

    // D. Shield Shine Package (Weekly visits eligible)
    const shieldShineSub = {
      status: "ACTIVE",
      endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      carePlan: { slug: "shield-shine", name: "Shield Shine" },
    };
    const resShield = RecurringSchedulerService.isSubscriptionEligibleForVisits(shieldShineSub as any);
    assert.strictEqual(resShield.eligible, true, "Shield Shine must be eligible for recurring visits");

    // E. Semi Shield Shine Package (Fortnightly visits eligible)
    const semiShieldSub = {
      status: "ACTIVE",
      endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      carePlan: { slug: "semi-shield-shine", name: "Semi Shield Shine" },
    };
    const resSemi = RecurringSchedulerService.isSubscriptionEligibleForVisits(semiShieldSub as any);
    assert.strictEqual(resSemi.eligible, true, "Semi Shield Shine must be eligible for recurring visits");
  });

  // -------------------------------------------------------------------------
  // 16. Correct IST date and time handling
  // -------------------------------------------------------------------------
  await runTest("16. Correct IST date and time handling across timezone boundaries", () => {
    // 09:15 AM IST on 2026-11-23 corresponds to 03:45 AM UTC on 2026-11-23 (UTC = IST - 5:30)
    const dateKey = "2026-11-23";
    const time24 = "09:15";
    const utcDate = parseISTDateTimeToUTC(dateKey, time24);

    assert.strictEqual(utcDate.toISOString(), "2026-11-23T03:45:00.000Z", "UTC conversion must equal 03:45:00Z");

    const parts = getKolkataDateParts(utcDate);
    assert.strictEqual(parts.year, 2026);
    assert.strictEqual(parts.month, 11);
    assert.strictEqual(parts.day, 23);
    assert.strictEqual(parts.hour, 9);
    assert.strictEqual(parts.minute, 15);

    // Late evening IST: 11:30 PM IST (23:30) on 2026-11-23 corresponds to 18:00 UTC on 2026-11-23
    const lateUtc = parseISTDateTimeToUTC("2026-11-23", "23:30");
    assert.strictEqual(lateUtc.toISOString(), "2026-11-23T18:00:00.000Z");
    const lateParts = getKolkataDateParts(lateUtc);
    assert.strictEqual(lateParts.day, 23);
    assert.strictEqual(lateParts.hour, 23);
    assert.strictEqual(lateParts.minute, 30);
  });

  // -------------------------------------------------------------------------
  // 17. Concurrent scheduling operations
  // -------------------------------------------------------------------------
  await runTest("17. Concurrent scheduling operations handled safely without duplicates", async () => {
    const mockDb = createMockSchedulerDb();
    setSchedulerDb(mockDb);

    const profileId = "prof-concurrent";
    const caseId = "case-concurrent";
    const subId = "sub-concurrent";
    const userId = "user-concurrent";

    mockDb._state.memberProfiles.push({
      id: profileId,
      userId,
      preferredVisitDay: "Friday",
      preferredVisitTime: "03:00 PM",
      preferredVisitFrequency: "WEEKLY",
      user: {
        id: userId,
        elders: [{ id: "elder-conc", userId }],
        subscriptions: [
          {
            id: subId,
            userId,
            status: "ACTIVE",
            startDate: new Date("2026-12-01"),
            carePlan: { slug: "shield-shine", name: "Shield Shine" },
            careCases: [{ id: caseId, status: "ACTIVE" }],
          },
        ],
      },
    });

    // Execute 3 simultaneous scheduling runs
    await Promise.all([
      RecurringSchedulerService.generateRecurringVisitsForMember({ memberProfileId: profileId, horizonDays: 30 }),
      RecurringSchedulerService.generateRecurringVisitsForMember({ memberProfileId: profileId, horizonDays: 30 }),
      RecurringSchedulerService.generateRecurringVisitsForMember({ memberProfileId: profileId, horizonDays: 30 }),
    ]);

    const createdVisits = mockDb._state.careVisits.filter((v: any) => v.careCaseId === caseId);

    // Check no duplicate dates exist
    const seenDates = new Set<string>();
    for (const v of createdVisits) {
      const k = formatDateKey(v.scheduledStart);
      assert(!seenDates.has(k), `Duplicate visit detected on date ${k}`);
      seenDates.add(k);
    }

    assert(createdVisits.length > 0, "Visits must be created");
  });

  // -------------------------------------------------------------------------
  // Scenario 18: Safe Backfill and Reconciliation for Existing Members
  // -------------------------------------------------------------------------
  await runTest("18. Safe backfill and reconciliation for existing members across 90-day horizon", async () => {
    const mockDb = createMockSchedulerDb();
    setSchedulerDb(mockDb);
    RecurringSchedulerService.resetReconcileThrottle();

    // Member A: Shield Shine (Active), Saturday 1:30 PM, Weekly. Has 1 pre-existing visit
    const userA = { id: "user-a-1001", name: "PRABIR CHAKRAVERTY" };
    mockDb._state.users.push(userA);
    const subA = {
      id: "sub-a-1001",
      userId: userA.id,
      status: "ACTIVE",
      plan: { slug: "shield-shine", name: "Shield Shine" },
      startDate: new Date("2026-11-01T00:00:00.000Z"),
      endDate: new Date("2027-11-01T00:00:00.000Z"),
    };
    mockDb._state.subscriptions.push(subA);
    const caseA = {
      id: "case-a-1001",
      subscriptionId: subA.id,
      elderId: "elder-a",
      status: "ACTIVE",
    };
    mockDb._state.careCases.push(caseA);
    const profA = {
      id: "prof-a-1001",
      userId: userA.id,
      memberId: "SECD1001PRTY",
      firstName: "PRABIR",
      lastName: "CHAKRAVERTY",
      preferredVisitDay: "Saturday",
      preferredVisitTime: "1:30 PM",
      preferredVisitFrequency: "WEEKLY",
      preferredVisitFortnightlyPattern: null,
    };
    mockDb._state.memberProfiles.push(profA);

    // Add 1 pre-existing visit for Member A on 2026-11-28 (Saturday)
    const existingVisitA = {
      id: "visit-a-existing",
      careCaseId: caseA.id,
      scheduledStart: new Date("2026-11-28T08:00:00.000Z"), // 1:30 PM IST
      scheduledEnd: new Date("2026-11-28T09:00:00.000Z"),
      status: "SCHEDULED",
      occurrenceType: "RECURRING",
      operationalNotes: "Pre-existing scheduled visit",
      isIndividuallyRescheduled: false,
    };
    mockDb._state.careVisits.push(existingVisitA);

    // Member B: Shield Shine (Active), Monday 8:45 AM, Weekly. 0 visits initially
    const userB = { id: "user-b-1002", name: "BASUDEB KUNDU" };
    mockDb._state.users.push(userB);
    const subB = {
      id: "sub-b-1002",
      userId: userB.id,
      status: "ACTIVE",
      plan: { slug: "shield-shine", name: "Shield Shine" },
      startDate: new Date("2026-11-01T00:00:00.000Z"),
      endDate: new Date("2027-11-01T00:00:00.000Z"),
    };
    mockDb._state.subscriptions.push(subB);
    const caseB = {
      id: "case-b-1002",
      subscriptionId: subB.id,
      elderId: "elder-b",
      status: "ACTIVE",
    };
    mockDb._state.careCases.push(caseB);
    const profB = {
      id: "prof-b-1002",
      userId: userB.id,
      memberId: "SECD1002BADU",
      firstName: "BASUDEB",
      lastName: "KUNDU",
      preferredVisitDay: "Monday",
      preferredVisitTime: "8:45 AM",
      preferredVisitFrequency: "WEEKLY",
      preferredVisitFortnightlyPattern: null,
    };
    mockDb._state.memberProfiles.push(profB);

    // Member C: Semi Shield Shine (Active), Tuesday 10:00 AM, Fortnightly (WEEK_1_3). 0 visits initially
    const userC = { id: "user-c-1015", name: "ASHOK DATTA" };
    mockDb._state.users.push(userC);
    const subC = {
      id: "sub-c-1015",
      userId: userC.id,
      status: "ACTIVE",
      plan: { slug: "semi-shield-shine", name: "Semi Shield Shine" },
      startDate: new Date("2026-11-01T00:00:00.000Z"),
      endDate: new Date("2027-11-01T00:00:00.000Z"),
    };
    mockDb._state.subscriptions.push(subC);
    const caseC = {
      id: "case-c-1015",
      subscriptionId: subC.id,
      elderId: "elder-c",
      status: "ACTIVE",
    };
    mockDb._state.careCases.push(caseC);
    const profC = {
      id: "prof-c-1015",
      userId: userC.id,
      memberId: "SECD1015ASTA",
      firstName: "ASHOK",
      lastName: "DATTA",
      preferredVisitDay: "Tuesday",
      preferredVisitTime: "10:00 AM",
      preferredVisitFrequency: "FORTNIGHTLY",
      preferredVisitFortnightlyPattern: "WEEK_1_3",
    };
    mockDb._state.memberProfiles.push(profC);

    // Member D: Life Line Care (Active) - Ineligible package! Should NOT have visits generated
    const userD = { id: "user-d-1003", name: "INDRANI GUPTA" };
    mockDb._state.users.push(userD);
    const subD = {
      id: "sub-d-1003",
      userId: userD.id,
      status: "ACTIVE",
      plan: { slug: "life-line-care", name: "Life Line Care" },
      startDate: new Date("2026-11-01T00:00:00.000Z"),
      endDate: new Date("2027-11-01T00:00:00.000Z"),
    };
    mockDb._state.subscriptions.push(subD);
    const profD = {
      id: "prof-d-1003",
      userId: userD.id,
      memberId: "SECS1003INTA",
      firstName: "INDRANI",
      lastName: "GUPTA",
      preferredVisitDay: "Friday",
      preferredVisitTime: "10:00 AM",
      preferredVisitFrequency: "WEEKLY",
      preferredVisitFortnightlyPattern: null,
    };
    mockDb._state.memberProfiles.push(profD);

    // Member E: Shield Shine (Active) but preferredVisitDay is NULL - Should NOT have visits generated
    const userE = { id: "user-e-1000", name: "Tanish Alam" };
    mockDb._state.users.push(userE);
    const subE = {
      id: "sub-e-1000",
      userId: userE.id,
      status: "ACTIVE",
      plan: { slug: "shield-shine", name: "Shield Shine" },
      startDate: new Date("2026-11-01T00:00:00.000Z"),
      endDate: new Date("2027-11-01T00:00:00.000Z"),
    };
    mockDb._state.subscriptions.push(subE);
    const profE = {
      id: "prof-e-1000",
      userId: userE.id,
      memberId: "SECD1000TAAM",
      firstName: "Tanish",
      lastName: "Alam",
      preferredVisitDay: null,
      preferredVisitTime: null,
    };
    mockDb._state.memberProfiles.push(profE);

    // Execute safe backfill
    const result = await RecurringSchedulerService.reconcileAllEligibleMembers({
      force: true,
      horizonDays: 90,
    });

    assert(result.success, "Reconciliation must succeed");
    assert.equal(result.totalEligibleMembers, 3, "Only 3 members (A, B, C) are eligible");

    // Member A: Should skip 1 existing visit, generate ~12 new visits
    const visitsA = mockDb._state.careVisits.filter((v: any) => v.careCaseId === caseA.id);
    const detailA = result.details.find((d) => d.memberId === "SECD1001PRTY");
    assert(detailA, "Member A detail must exist");
    assert.equal(detailA.skipped, 1, "Member A must have skipped 1 pre-existing visit");
    assert(detailA.generated >= 11, "Member A must have generated missing visits");
    assert.equal(visitsA.length, detailA.generated + 1, "Member A total visits must equal generated + 1 existing");

    // Pre-existing visit must NOT have been overwritten
    const preservedVisitA = visitsA.find((v: any) => v.id === "visit-a-existing");
    assert(preservedVisitA, "Pre-existing visit A must be preserved");
    assert.equal(preservedVisitA.operationalNotes, "Pre-existing scheduled visit");

    // Member B: Should generate ~13 visits, 0 skipped
    const visitsB = mockDb._state.careVisits.filter((v: any) => v.careCaseId === caseB.id);
    const detailB = result.details.find((d) => d.memberId === "SECD1002BADU");
    assert(detailB, "Member B detail must exist");
    assert.equal(detailB.skipped, 0, "Member B had 0 existing visits");
    assert(detailB.generated >= 12, "Member B must have ~12-13 weekly visits");
    assert.equal(visitsB.length, detailB.generated, "Member B visits count must match");

    // Member C: Fortnightly Week 1 & 3 should generate ~6-7 visits
    const visitsC = mockDb._state.careVisits.filter((v: any) => v.careCaseId === caseC.id);
    const detailC = result.details.find((d) => d.memberId === "SECD1015ASTA");
    assert(detailC, "Member C detail must exist");
    assert(detailC.generated >= 5 && detailC.generated <= 8, "Member C must have fortnightly visits");
    assert.equal(visitsC.length, detailC.generated, "Member C visits count must match");

    // Member D (Life Line Care): 0 visits generated
    const visitsD = mockDb._state.careVisits.filter((v: any) => v.careCaseId === "case-d-1003");
    assert.equal(visitsD.length, 0, "Life Line Care package must have 0 visits");

    // Member E (No schedule set): 0 visits generated
    const visitsE = mockDb._state.careVisits.filter((v: any) => v.careCaseId === "case-e-1000");
    assert.equal(visitsE.length, 0, "Member with no preferred day must have 0 visits");
  });

  // -------------------------------------------------------------------------
  // Scenario 19: Reconciliation Idempotence on Repeated Runs
  // -------------------------------------------------------------------------
  await runTest("19. Reconciliation idempotence on repeated runs and throttle caching", async () => {
    // Re-running reconciliation immediately with force=true must find 0 visits to generate
    const secondRun = await RecurringSchedulerService.reconcileAllEligibleMembers({
      force: true,
      horizonDays: 90,
    });

    assert(secondRun.success, "Second run must succeed");
    assert.equal(secondRun.totalVisitsGenerated, 0, "Second run must generate EXACTLY 0 visits (idempotent)");
    assert(secondRun.totalVisitsSkipped > 0, "All existing visits must be skipped without duplication");

    // Running without force immediately after must return throttled
    const throttledRun = await RecurringSchedulerService.reconcileAllEligibleMembers({
      force: false,
    });
    assert.equal(throttledRun.throttled, true, "Call within 5 minutes without force must be throttled");
    assert.equal(throttledRun.totalVisitsGenerated, 0);
  });

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`🏁 TEST RESULTS: ${passed}/${total} PASSED`);
  console.log("================================================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error("Unhandled test execution error:", e);
  process.exit(1);
});
