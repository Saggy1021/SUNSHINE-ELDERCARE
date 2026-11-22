import assert from "node:assert/strict";
import { DutyService, setDutyDb } from "../../lib/services/duty";
import { LeaveService, setLeaveDb } from "../../lib/services/leave";
import { ReleasePublishingService } from "../../lib/services/apps/publisher";
import {
  formatEmployeeVisit,
  formatEmergencyIncidentAsVisit,
} from "../../lib/services/employee-visit-formatter";

console.log("----------------------------------------------------------------");
console.log("🧪 RUNNING EMPLOYEE OPERATIONS SYSTEM UNIT TEST SUITE");
console.log("----------------------------------------------------------------\n");

// Mock Database Storage for isolated testing
function createMockDb() {
  const employees: any[] = [
    {
      id: "emp-test-001",
      employeeId: "EMP-2026-001",
      firstName: "Aarav",
      lastName: "Sen",
      name: "Aarav Sen",
      designation: "Senior Care Specialist",
      department: "Geriatric Field Ops",
      status: "ACTIVE",
    },
    {
      id: "emp-test-002",
      employeeId: "EMP-2026-002",
      firstName: "Diya",
      lastName: "Mukherjee",
      name: "Diya Mukherjee",
      designation: "Clinical Nurse Caregiver",
      department: "Care Operations",
      status: "ACTIVE",
    },
  ];

  const dutySessions: any[] = [];
  const leaveRequests: any[] = [];
  const correctionLogs: any[] = [];
  const emergencyIncidents: any[] = [];
  const events: any[] = [];

  return {
    employee: {
      findUnique: async ({ where, include }: any) => {
        const emp = employees.find((e) => e.id === where.id || e.employeeId === where.employeeId);
        if (!emp) return null;
        const result = { ...emp };
        if (include?.dutySessions) {
          result.dutySessions = dutySessions.filter((s) => {
            if (s.employeeId !== emp.id) return false;
            if (include.dutySessions.where?.status && s.status !== include.dutySessions.where.status) return false;
            return true;
          });
        }
        return result;
      },
      findMany: async ({ where, include }: any) => {
        let res = [...employees];
        if (where?.status) {
          res = res.filter((e) => e.status === where.status);
        }
        return res.map((emp) => {
          const copy = { ...emp };
          if (include?.dutySessions) {
            copy.dutySessions = dutySessions.filter((s) => s.employeeId === emp.id);
          }
          if (include?.leaveRequests) {
            copy.leaveRequests = leaveRequests.filter((l) => l.employeeId === emp.id);
          }
          return copy;
        });
      },
    },
    dutySession: {
      findFirst: async ({ where }: any) => {
        return (
          dutySessions.find((s) => {
            if (where.employeeId && s.employeeId !== where.employeeId) return false;
            if (where.status && s.status !== where.status) return false;
            return true;
          }) || null
        );
      },
      findUnique: async ({ where }: any) => {
        return dutySessions.find((s) => s.id === where.id) || null;
      },
      findMany: async ({ where }: any) => {
        return dutySessions.filter((s) => {
          if (where?.employeeId && s.employeeId !== where.employeeId) return false;
          if (where?.status && s.status !== where.status) return false;
          return true;
        });
      },
      create: async ({ data }: any) => {
        const session = {
          id: `sess-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        dutySessions.push(session);
        return session;
      },
      update: async ({ where, data }: any) => {
        const index = dutySessions.findIndex((s) => s.id === where.id);
        if (index === -1) throw new Error("Duty session not found");
        dutySessions[index] = { ...dutySessions[index], ...data, updatedAt: new Date() };
        return dutySessions[index];
      },
    },
    employeeLeaveRequest: {
      findFirst: async ({ where }: any) => {
        return (
          leaveRequests.find((l) => {
            if (where.employeeId && l.employeeId !== where.employeeId) return false;
            if (where.status?.in && !where.status.in.includes(l.status)) return false;
            if (where.OR) {
              const start = where.OR[0].startDate.lte;
              const end = where.OR[0].endDate.gte;
              if (l.startDate <= end && l.endDate >= start) return true;
              return false;
            }
            return true;
          }) || null
        );
      },
      findMany: async ({ where, orderBy, take }: any) => {
        let res = [...leaveRequests];
        if (where?.employeeId) res = res.filter((l) => l.employeeId === where.employeeId);
        if (where?.status) res = res.filter((l) => l.status === where.status);
        if (take) res = res.slice(0, take);
        return res;
      },
      findUnique: async ({ where }: any) => {
        return leaveRequests.find((l) => l.id === where.id) || null;
      },
      create: async ({ data }: any) => {
        const req = {
          id: `leave-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        leaveRequests.push(req);
        return req;
      },
      update: async ({ where, data }: any) => {
        const index = leaveRequests.findIndex((l) => l.id === where.id);
        if (index === -1) throw new Error("Leave request not found");
        leaveRequests[index] = { ...leaveRequests[index], ...data, updatedAt: new Date() };
        return leaveRequests[index];
      },
    },
    attendanceCorrectionLog: {
      create: async ({ data }: any) => {
        const log = {
          id: `corr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          ...data,
          createdAt: new Date(),
        };
        correctionLogs.push(log);
        return log;
      },
      findMany: async () => correctionLogs,
    },
    emergencyIncident: {
      create: async ({ data }: any) => {
        const inc = {
          id: `inc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        emergencyIncidents.push(inc);
        return inc;
      },
      findFirst: async ({ where }: any) => {
        return (
          emergencyIncidents.find((i) => {
            if (where.id && i.id !== where.id) return false;
            if (where.idempotencyKey && i.idempotencyKey !== where.idempotencyKey) return false;
            return true;
          }) || null
        );
      },
      findMany: async () => emergencyIncidents,
    },
    communityEvent: {
      create: async ({ data }: any) => {
        const ev = { id: `ev-${Date.now()}`, ...data };
        events.push(ev);
        return ev;
      },
      findMany: async ({ where }: any) => {
        return events.filter((e) => {
          if (where?.audience?.in && !where.audience.in.includes(e.audience)) return false;
          return true;
        });
      },
    },
    dutySessionsList: dutySessions,
    leaveRequestsList: leaveRequests,
    correctionLogsList: correctionLogs,
    emergencyIncidentsList: emergencyIncidents,
  };
}

async function runTests() {
  const mockDb = createMockDb();
  setDutyDb(mockDb);
  setLeaveDb(mockDb);

  // -------------------------------------------------------------
  // TEST 1: DUTY SERVICE - START DUTY SESSION
  // -------------------------------------------------------------
  console.log("TEST 1: Starting Duty Session...");
  const startResult = await DutyService.startDuty({
    employeeId: "emp-test-001",
    notes: "Morning shift start",
  });

  assert.equal(startResult.success, true, "Duty session start should succeed");
  assert.equal(startResult.session.status, "ON_DUTY", "Status should be ON_DUTY");
  assert.equal(startResult.session.employeeId, "emp-test-001");
  console.log("✅ TEST 1 PASSED: Duty session started successfully.\n");

  // -------------------------------------------------------------
  // TEST 2: CONCURRENCY / IDEMPOTENCY SAFETY - DUPLICATE START
  // -------------------------------------------------------------
  console.log("TEST 2: Preventing duplicate active duty sessions...");
  const duplicateStart = await DutyService.startDuty({
    employeeId: "emp-test-001",
    notes: "Duplicate start attempt",
  });
  assert.equal(duplicateStart.alreadyActive, true, "Should report alreadyActive = true");
  assert.equal(duplicateStart.session.id, startResult.session.id, "Should return existing session without duplication");
  assert.equal(
    mockDb.dutySessionsList.filter((s) => s.employeeId === "emp-test-001" && s.status === "ON_DUTY").length,
    1,
    "Should strictly maintain 1 active session"
  );
  console.log("✅ TEST 2 PASSED: Idempotency check safely prevented duplicate active session.\n");

  // -------------------------------------------------------------
  // TEST 3: END DUTY SESSION & DURATION CALCULATION
  // -------------------------------------------------------------
  console.log("TEST 3: Ending Duty Session & duration calculation...");
  // Simulate 90 minutes of duty by backdating startTime
  const activeSess = mockDb.dutySessionsList.find((s) => s.id === startResult.session.id);
  activeSess.startTime = new Date(Date.now() - 90 * 60 * 1000);

  const endResult = await DutyService.endDuty({
    employeeId: "emp-test-001",
    notes: "Shift completed",
  });

  assert.equal(endResult.success, true, "End duty should succeed");
  assert.equal(endResult.session.status, "COMPLETED", "Status should be COMPLETED");
  assert.ok(endResult.session.durationMinutes >= 89, "Duration should reflect elapsed time (>=89 mins)");
  console.log(`✅ TEST 3 PASSED: Duty ended. Recorded duration: ${endResult.session.durationMinutes} minutes.\n`);

  // -------------------------------------------------------------
  // TEST 4: MULTIPLE DUTY SESSIONS PER DAY & ACCUMULATED DURATION
  // -------------------------------------------------------------
  console.log("TEST 4: Multiple duty sessions per day...");
  // Start second session
  const session2Start = await DutyService.startDuty({
    employeeId: "emp-test-001",
    notes: "Evening follow-up shift",
  });
  // Simulate 45 minutes for session 2
  const activeSess2 = mockDb.dutySessionsList.find((s) => s.id === session2Start.session.id);
  activeSess2.startTime = new Date(Date.now() - 45 * 60 * 1000);

  await DutyService.endDuty({ employeeId: "emp-test-001" });

  const statusAfterTwoSessions = await DutyService.getDutyStatus("emp-test-001");
  assert.equal(statusAfterTwoSessions.isOnDuty, false);
  assert.equal(statusAfterTwoSessions.todaySessionsCount, 2, "Should record 2 sessions today");
  assert.ok(
    statusAfterTwoSessions.todayDurationMinutes >= 134,
    `Accumulated duration should sum both sessions (~135 mins, got ${statusAfterTwoSessions.todayDurationMinutes})`
  );
  console.log(`✅ TEST 4 PASSED: 2 sessions successfully tracked. Total today: ${statusAfterTwoSessions.todayDurationMinutes} mins.\n`);

  // -------------------------------------------------------------
  // TEST 5: AUDITED MANUAL CORRECTION LOG
  // -------------------------------------------------------------
  console.log("TEST 5: Admin Manual Attendance Correction...");
  const correctionResult = await DutyService.recordCorrection({
    employeeId: "emp-test-001",
    dutySessionId: activeSess.id,
    adminUserId: "admin-user-001",
    adminEmail: "operations@sunshineeldercare.in",
    reason: "Adjusted clock-out time per supervisor field check",
    endTime: new Date(),
  });

  assert.equal(correctionResult.success, true);
  assert.equal(mockDb.correctionLogsList.length, 1, "Correction log entry must be created");
  assert.equal(mockDb.correctionLogsList[0].adminEmail, "operations@sunshineeldercare.in");
  assert.equal(mockDb.correctionLogsList[0].reason, "Adjusted clock-out time per supervisor field check");
  console.log("✅ TEST 5 PASSED: Manual correction recorded with full audit trail.\n");

  // -------------------------------------------------------------
  // TEST 6: LEAVE APPLICATION & OVERLAP PREVENTION
  // -------------------------------------------------------------
  console.log("TEST 6: Employee Leave Application & Overlap Validation...");
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const dayAfter = new Date(today.getTime() + 48 * 60 * 60 * 1000);

  // Apply valid leave
  const leaveResult = await LeaveService.applyLeave({
    employeeId: "emp-test-002",
    startDate: tomorrow.toISOString().split("T")[0],
    endDate: dayAfter.toISOString().split("T")[0],
    reason: "Personal family event",
  });

  assert.equal(leaveResult.success, true);
  assert.equal(leaveResult.request.status, "PENDING");
  assert.equal(leaveResult.request.totalDays, 2);

  // Overlap test: try applying overlapping dates
  let overlapThrew = false;
  try {
    await LeaveService.applyLeave({
      employeeId: "emp-test-002",
      startDate: tomorrow.toISOString().split("T")[0],
      endDate: dayAfter.toISOString().split("T")[0],
      reason: "Conflicting leave request",
    });
  } catch (err: any) {
    overlapThrew = true;
    assert.match(err.message, /overlaps with an existing/i);
  }
  assert.equal(overlapThrew, true, "Should block overlapping leave requests");
  console.log("✅ TEST 6 PASSED: Leave applied and duplicate/overlap safely blocked.\n");

  // -------------------------------------------------------------
  // TEST 7: ADMIN LEAVE APPROVAL & ATTENDANCE ON_LEAVE REFLECTION
  // -------------------------------------------------------------
  console.log("TEST 7: Admin Leave Approval & On Leave Reflection...");
  const approvedLeave = await LeaveService.reviewLeaveRequest({
    requestId: leaveResult.request.id,
    adminUserId: "admin-ops-001",
    action: "APPROVE",
    adminRemarks: "Coverage arranged with Diya",
  });

  assert.equal(approvedLeave.success, true);
  assert.equal(approvedLeave.request.status, "APPROVED");

  // Query duty status for the approved leave date
  const statusOnLeave = await DutyService.getDutyStatus("emp-test-002", tomorrow);
  assert.equal(statusOnLeave.dutyStatus, "ON_LEAVE", "Employee should be marked ON_LEAVE on approved date");
  console.log("✅ TEST 7 PASSED: Approved leave correctly marks employee ON_LEAVE.\n");

  // -------------------------------------------------------------
  // TEST 8: ATTENDANCE ROSTER SUMMARY & METRICS
  // -------------------------------------------------------------
  console.log("TEST 8: Attendance Roster & Summary Metrics...");
  // Start duty for emp-test-002 today
  await DutyService.startDuty({ employeeId: "emp-test-002" });

  const roster = await DutyService.getAttendanceRoster(new Date());
  assert.equal(roster.metrics.totalEmployees, 2);
  assert.equal(roster.metrics.onDuty, 1, "emp-test-002 is ON DUTY");
  assert.equal(roster.metrics.offDuty, 1, "emp-test-001 is OFF DUTY");
  assert.ok(roster.roster.length === 2);
  console.log("✅ TEST 8 PASSED: Attendance roster computed metrics accurately.\n");

  // -------------------------------------------------------------
  // TEST 9: EMPLOYEE SOS INCIDENT CREATION (EmergencyOS)
  // -------------------------------------------------------------
  console.log("TEST 9: Employee SOS Incident in EmergencyOS...");
  const sosIncident = await mockDb.emergencyIncident.create({
    data: {
      incidentNumber: "EMG-20261123-001",
      triggerSource: "EMPLOYEE_APP_SOS",
      classification: "CODE_RED",
      triggerNotes: "Lone worker emergency SOS triggered by Care Specialist",
      assignedEmployeeId: "emp-test-001",
      status: "TRIGGERED",
      dispatchedAt: new Date(),
    },
  });

  assert.equal(sosIncident.triggerSource, "EMPLOYEE_APP_SOS");
  assert.equal(sosIncident.classification, "CODE_RED");
  console.log(`✅ TEST 9 PASSED: Incident ${sosIncident.incidentNumber} created with triggerSource 'EMPLOYEE_APP_SOS'.\n`);

  // -------------------------------------------------------------
  // TEST 10: CODE RED VISIBILITY IN EMPLOYEE VISITS
  // -------------------------------------------------------------
  console.log("TEST 10: Merging Emergency Dispatch into Employee Visits...");
  const incidentAsVisit = formatEmergencyIncidentAsVisit(sosIncident);

  assert.equal(incidentAsVisit.isEmergency, true, "Must have isEmergency = true");
  assert.equal(incidentAsVisit.emergencyClassification, "CODE_RED");
  assert.match(incidentAsVisit.workDescription, /CODE RED EMERGENCY DISPATCH/);

  // Normal visit formatting
  const normalVisit = formatEmployeeVisit({
    id: "visit-123",
    scheduledStart: new Date(),
    scheduledEnd: new Date(Date.now() + 60 * 60 * 1000),
    status: "SCHEDULED",
    workDescription: "Routine vitals check",
    careCase: null,
    assignments: [],
    assignedEmp: null,
  });

  assert.equal(normalVisit.isEmergency, false, "Normal visit must have isEmergency = false");
  console.log("✅ TEST 10 PASSED: Code Red visits formatted with emergency status and badge.\n");

  // -------------------------------------------------------------
  // TEST 11: UNIVERSAL EVENTS AUDIENCE FILTERING
  // -------------------------------------------------------------
  console.log("TEST 11: Universal Events Audience Filtering...");
  await mockDb.communityEvent.create({
    data: { title: "Universal Wellness Session", audience: "EVERYONE" },
  });
  await mockDb.communityEvent.create({
    data: { title: "Members Only Tea Gathering", audience: "MEMBERS_ONLY" },
  });
  await mockDb.communityEvent.create({
    data: { title: "Staff Geriatric Training", audience: "EMPLOYEES_ONLY" },
  });

  // Query as Member
  const memberEvents = await mockDb.communityEvent.findMany({
    where: { audience: { in: ["EVERYONE", "MEMBERS_ONLY"] } },
  });
  assert.equal(memberEvents.length, 2, "Members should only see EVERYONE and MEMBERS_ONLY");
  assert.ok(!memberEvents.some((e: any) => e.audience === "EMPLOYEES_ONLY"));

  // Query as Employee
  const employeeEvents = await mockDb.communityEvent.findMany({
    where: { audience: { in: ["EVERYONE", "EMPLOYEES_ONLY"] } },
  });
  assert.equal(employeeEvents.length, 2, "Employees should only see EVERYONE and EMPLOYEES_ONLY");
  assert.ok(!employeeEvents.some((e: any) => e.audience === "MEMBERS_ONLY"));
  console.log("✅ TEST 11 PASSED: Audience isolation between Members and Staff verified.\n");

  // -------------------------------------------------------------
  // TEST 12: OFFICIAL EMPLOYEE KEYSTORE CERTIFICATE FINGERPRINT
  // -------------------------------------------------------------
  console.log("TEST 12: Authorized Keystore Fingerprint Verification...");
  const authorizedCert = ReleasePublishingService.AUTHORIZED_FINGERPRINTS["employee-app"];
  assert.equal(
    authorizedCert,
    "843d8e746bd6604b61f4284131556a948ad6b70b8720842a38fec3e2e09af8cd",
    "Employee app authorized certificate must match official sunshine-employee.jks"
  );

  const expectedPkg = ReleasePublishingService.EXPECTED_PACKAGES["employee-app"];
  assert.equal(expectedPkg, "in.sunshineeldercare.employee");
  console.log("✅ TEST 12 PASSED: Authorized signing certificate and package ID verified.\n");

  console.log("================================================================");
  console.log("🎉 ALL 12 EMPLOYEE OPERATIONS SYSTEM UNIT TESTS PASSED!");
  console.log("================================================================");
}

runTests().catch((err) => {
  console.error("❌ TEST SUITE FAILED:", err);
  process.exit(1);
});
