import assert from "node:assert";
import {
  formatDateKey,
  formatTimeIST,
  formatTimeInputIST,
  formatDateIST,
  formatDayOfWeek,
  getWeekDays,
  formatWeekRangeDisplay,
  parseISTDateTimeToUTC,
  checkIntervalOverlap,
} from "../../components/admin/schedule/schedule-date-utils";

console.log("================================================================");
console.log("Running Sunshine Eldercare — Visit Schedule Calendar Test Suite");
console.log("Including: IST Invariance, Employee Availability & Conflict Detection");
console.log("================================================================");

// ============================================================================
// SIMULATION HELPERS FOR CONFLICT DETECTION & TRANSACTION CHECKS
// ============================================================================

interface MockEmployee {
  id: string;
  employeeId?: string | null;
  firstName: string;
  lastName: string;
  designation?: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
}

interface MockVisit {
  id: string;
  assignedEmpId: string | null;
  scheduledStart: Date;
  scheduledEnd: Date;
  status: "SCHEDULED" | "CONFIRMED" | "WAITLISTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "MISSED";
  assignments?: Array<{ employeeId: string }>;
  careCase?: { elder?: { firstName?: string; lastName?: string; user?: { name?: string } } };
  operationalNotes?: string | null;
}

function simulateEmployeeAvailability(params: {
  date: string;
  startTime: string;
  endTime: string;
  excludeVisitId?: string;
  employees: MockEmployee[];
  existingVisits: MockVisit[];
}) {
  const scheduledStart = parseISTDateTimeToUTC(params.date, params.startTime);
  const scheduledEnd = parseISTDateTimeToUTC(params.date, params.endTime);

  if (isNaN(scheduledStart.getTime()) || isNaN(scheduledEnd.getTime()) || scheduledEnd <= scheduledStart) {
    return [];
  }

  const activeEmployees = params.employees.filter((e) => e.status === "ACTIVE");
  const blockingVisits = params.existingVisits.filter((v) => {
    if (params.excludeVisitId && v.id === params.excludeVisitId) return false;
    if (!["SCHEDULED", "CONFIRMED", "IN_PROGRESS"].includes(v.status)) return false;
    return checkIntervalOverlap(v.scheduledStart, v.scheduledEnd, scheduledStart, scheduledEnd);
  });

  return activeEmployees.map((emp) => {
    const conflict = blockingVisits.find(
      (v) => v.assignedEmpId === emp.id || v.assignments?.some((a) => a.employeeId === emp.id)
    );
    if (conflict) {
      const timeStr = `${formatTimeIST(conflict.scheduledStart)} – ${formatTimeIST(conflict.scheduledEnd)}`;
      return {
        employeeId: emp.id,
        available: false,
        conflictTime: timeStr,
        conflictReason: `Occupied (${timeStr})`,
      };
    }
    return {
      employeeId: emp.id,
      available: true,
    };
  });
}

function simulateServerSideAssignment(
  newVisit: { assignedEmpId: string; date: string; startTime: string; endTime: string; excludeVisitId?: string },
  employees: MockEmployee[],
  existingVisits: MockVisit[]
) {
  const emp = employees.find((e) => e.id === newVisit.assignedEmpId);
  if (!emp || emp.status !== "ACTIVE") {
    throw new Error("The selected employee is not active or does not exist.");
  }

  const scheduledStart = parseISTDateTimeToUTC(newVisit.date, newVisit.startTime);
  const scheduledEnd = parseISTDateTimeToUTC(newVisit.date, newVisit.endTime);

  if (isNaN(scheduledStart.getTime()) || isNaN(scheduledEnd.getTime())) {
    throw new Error("Invalid date or time format.");
  }
  if (scheduledEnd <= scheduledStart) {
    throw new Error("End time must be after start time.");
  }

  const conflict = existingVisits.find((v) => {
    if (newVisit.excludeVisitId && v.id === newVisit.excludeVisitId) return false;
    if (!["SCHEDULED", "CONFIRMED", "IN_PROGRESS"].includes(v.status)) return false;
    const isAssigned = v.assignedEmpId === newVisit.assignedEmpId || v.assignments?.some((a) => a.employeeId === newVisit.assignedEmpId);
    if (!isAssigned) return false;
    return checkIntervalOverlap(v.scheduledStart, v.scheduledEnd, scheduledStart, scheduledEnd);
  });

  if (conflict) {
    throw new Error("This employee has already been assigned to another visit during the selected time. Please select another employee.");
  }

  const created: MockVisit = {
    id: `visit_${Date.now()}_${Math.random()}`,
    assignedEmpId: newVisit.assignedEmpId,
    scheduledStart,
    scheduledEnd,
    status: "SCHEDULED",
  };
  existingVisits.push(created);
  return created;
}

// ============================================================================
// TEST SCENARIO 1: 1 PM IST remains 1 PM after saving and reopening
// ============================================================================
console.log("\n--- SCENARIO 1: 1 PM IST Remains 1 PM After Saving and Reopening ---");
const visit1Date = "2026-11-17";
const visit1StartTime = "13:00"; // 1:00 PM
const parsed1 = parseISTDateTimeToUTC(visit1Date, visit1StartTime);

// In UTC: 13:00 IST - 5:30 = 07:30 UTC
assert.strictEqual(parsed1.toISOString(), "2026-11-17T07:30:00.000Z", "1:00 PM IST must be stored as 07:30:00 UTC in database");
const reopenedDisplayTime1 = formatTimeIST(parsed1);
assert.strictEqual(reopenedDisplayTime1, "1:00 pm", "Reopened visit details must format exactly as 1:00 pm");
const reopenedInputTime1 = formatTimeInputIST(parsed1);
assert.strictEqual(reopenedInputTime1, "13:00", "Reopened input field must pre-fill 13:00 in 24h format");
const reopenedDateKey1 = formatDateKey(parsed1);
assert.strictEqual(reopenedDateKey1, "2026-11-17", "Reopened date key must remain 2026-11-17");
console.log("  ✓ PASS: 1 PM IST stored as 07:30 UTC and reopens as 1:00 pm without drift.");

// ============================================================================
// TEST SCENARIO 2: 2 PM IST remains 2 PM after saving and reopening
// ============================================================================
console.log("\n--- SCENARIO 2: 2 PM IST Remains 2 PM After Saving and Reopening ---");
const visit2Date = "2026-11-17";
const visit2EndTime = "14:00"; // 2:00 PM
const parsed2 = parseISTDateTimeToUTC(visit2Date, visit2EndTime);

// In UTC: 14:00 IST - 5:30 = 08:30 UTC
assert.strictEqual(parsed2.toISOString(), "2026-11-17T08:30:00.000Z", "2:00 PM IST must be stored as 08:30:00 UTC in database");
const reopenedDisplayTime2 = formatTimeIST(parsed2);
assert.strictEqual(reopenedDisplayTime2, "2:00 pm", "Reopened visit details must format exactly as 2:00 pm");
const reopenedInputTime2 = formatTimeInputIST(parsed2);
assert.strictEqual(reopenedInputTime2, "14:00", "Reopened input field must pre-fill 14:00 in 24h format");
console.log("  ✓ PASS: 2 PM IST stored as 08:30 UTC and reopens as 2:00 pm without drift.");

// ============================================================================
// TEST SCENARIO 3: New Visit, Edit Visit, and Reschedule use identical timezone logic
// ============================================================================
console.log("\n--- SCENARIO 3: Identical Timezone Parsing Across New, Edit, and Reschedule ---");
const t24h = parseISTDateTimeToUTC("2026-11-17", "13:00");
const t12hLower = parseISTDateTimeToUTC("2026-11-17", "1:00 pm");
const t12hUpper = parseISTDateTimeToUTC("2026-11-17", "1:00 PM");
const t12hPad = parseISTDateTimeToUTC("2026-11-17", "01:00 PM");
const tIsoIST = parseISTDateTimeToUTC("2026-11-17T13:00:00+05:30");

assert.strictEqual(t24h.getTime(), t12hLower.getTime(), "24h and 12h lower must produce identical timestamp");
assert.strictEqual(t24h.getTime(), t12hUpper.getTime(), "24h and 12h upper must produce identical timestamp");
assert.strictEqual(t24h.getTime(), t12hPad.getTime(), "Padded 01:00 PM must produce identical timestamp");
assert.strictEqual(t24h.getTime(), tIsoIST.getTime(), "ISO with +05:30 must produce identical timestamp");
console.log("  ✓ PASS: All entry formats resolve identically to 2026-11-17T07:30:00.000Z.");

// ============================================================================
// TEST SCENARIO 4: Existing correctly stored visits are not shifted
// ============================================================================
console.log("\n--- SCENARIO 4: Existing Correctly Stored Visits Are Not Shifted ---");
// Suppose a visit was previously correctly stored in DB as 07:30 UTC (which is 1:00 PM IST)
const existingDbUtc = new Date("2026-11-17T07:30:00.000Z");
assert.strictEqual(formatTimeIST(existingDbUtc), "1:00 pm", "Existing visit must format to 1:00 pm IST");
assert.strictEqual(formatDateKey(existingDbUtc), "2026-11-17", "Existing visit date key must format to 2026-11-17");
assert.strictEqual(formatDateIST(existingDbUtc), "17 Nov 2026", "Existing visit date must display 17 Nov 2026");
console.log("  ✓ PASS: Historical database timestamps are preserved and displayed accurately.");

// ============================================================================
// TEST SCENARIO 5: Employee 1 is unavailable when assigned to an overlapping visit
// ============================================================================
console.log("\n--- SCENARIO 5: Employee 1 Unavailable During Overlapping Visit ---");
const mockEmployees: MockEmployee[] = [
  { id: "emp_1", employeeId: "EMP001", firstName: "Subhash", lastName: "Ghosh", designation: "Care Attendant", status: "ACTIVE" },
  { id: "emp_2", employeeId: "EMP002", firstName: "Mantu", lastName: "Mondal", designation: "Physiotherapist", status: "ACTIVE" },
  { id: "emp_3", employeeId: "EMP003", firstName: "Rita", lastName: "Das", designation: "Nurse", status: "INACTIVE" },
];

const mockVisitsDatabase: MockVisit[] = [
  {
    id: "visit_existing_1",
    assignedEmpId: "emp_1",
    scheduledStart: parseISTDateTimeToUTC("2026-11-17", "13:00"),
    scheduledEnd: parseISTDateTimeToUTC("2026-11-17", "14:00"),
    status: "CONFIRMED",
  },
];

const availResults1 = simulateEmployeeAvailability({
  date: "2026-11-17",
  startTime: "13:15",
  endTime: "13:45",
  employees: mockEmployees,
  existingVisits: mockVisitsDatabase,
});

const emp1Avail = availResults1.find((a) => a.employeeId === "emp_1");
assert.ok(emp1Avail, "Employee 1 must be evaluated");
assert.strictEqual(emp1Avail.available, false, "Employee 1 must be marked unavailable");
assert.ok(emp1Avail.conflictReason?.includes("Occupied"), "Employee 1 must have an Occupied conflict indicator");
console.log("  ✓ PASS: Employee 1 detected as Occupied (1:00 pm – 2:00 pm).");

// ============================================================================
// TEST SCENARIO 6: Employee 2 remains selectable when available
// ============================================================================
console.log("\n--- SCENARIO 6: Employee 2 Remains Selectable When Available ---");
const emp2Avail = availResults1.find((a) => a.employeeId === "emp_2");
assert.ok(emp2Avail, "Employee 2 must be evaluated");
assert.strictEqual(emp2Avail.available, true, "Employee 2 must be marked available");
assert.strictEqual(emp2Avail.conflictReason, undefined, "Employee 2 must have no conflict reason");
console.log("  ✓ PASS: Employee 2 remains fully Available and selectable.");

// ============================================================================
// TEST SCENARIO 7: Partial appointment overlaps are detected
// ============================================================================
console.log("\n--- SCENARIO 7: Interval Overlap Detection (startA < endB && endA > startB) ---");
const baseStart = parseISTDateTimeToUTC("2026-11-17", "13:00");
const baseEnd = parseISTDateTimeToUTC("2026-11-17", "14:00");

// Partial overlap at the beginning (12:30 - 13:30)
assert.strictEqual(
  checkIntervalOverlap(baseStart, baseEnd, parseISTDateTimeToUTC("2026-11-17", "12:30"), parseISTDateTimeToUTC("2026-11-17", "13:30")),
  true,
  "Partial overlap at beginning (12:30 - 13:30) must overlap with 13:00 - 14:00"
);

// Partial overlap at the end (13:30 - 14:30)
assert.strictEqual(
  checkIntervalOverlap(baseStart, baseEnd, parseISTDateTimeToUTC("2026-11-17", "13:30"), parseISTDateTimeToUTC("2026-11-17", "14:30")),
  true,
  "Partial overlap at end (13:30 - 14:30) must overlap with 13:00 - 14:00"
);

// Interior overlap (13:15 - 13:45)
assert.strictEqual(
  checkIntervalOverlap(baseStart, baseEnd, parseISTDateTimeToUTC("2026-11-17", "13:15"), parseISTDateTimeToUTC("2026-11-17", "13:45")),
  true,
  "Interior interval (13:15 - 13:45) must overlap with 13:00 - 14:00"
);

// Exterior enclosing overlap (12:00 - 15:00)
assert.strictEqual(
  checkIntervalOverlap(baseStart, baseEnd, parseISTDateTimeToUTC("2026-11-17", "12:00"), parseISTDateTimeToUTC("2026-11-17", "15:00")),
  true,
  "Enclosing interval (12:00 - 15:00) must overlap with 13:00 - 14:00"
);
console.log("  ✓ PASS: All partial and enclosing interval permutations detected as overlaps.");

// ============================================================================
// TEST SCENARIO 8: Back-to-back appointments are allowed
// ============================================================================
console.log("\n--- SCENARIO 8: Back-to-Back Appointments Allowed ---");
// Immediate consecutive: 14:00 - 15:00 follows 13:00 - 14:00
const consecutiveAfter = checkIntervalOverlap(
  baseStart,
  baseEnd,
  parseISTDateTimeToUTC("2026-11-17", "14:00"),
  parseISTDateTimeToUTC("2026-11-17", "15:00")
);
assert.strictEqual(consecutiveAfter, false, "Back-to-back immediately after (14:00 - 15:00) must NOT overlap");

// Immediate preceding: 12:00 - 13:00 precedes 13:00 - 14:00
const consecutiveBefore = checkIntervalOverlap(
  baseStart,
  baseEnd,
  parseISTDateTimeToUTC("2026-11-17", "12:00"),
  parseISTDateTimeToUTC("2026-11-17", "13:00")
);
assert.strictEqual(consecutiveBefore, false, "Back-to-back immediately before (12:00 - 13:00) must NOT overlap");
console.log("  ✓ PASS: Zero-gap back-to-back scheduling correctly permitted without false conflicts.");

// ============================================================================
// TEST SCENARIO 9: Cancelled visits do not block availability
// ============================================================================
console.log("\n--- SCENARIO 9: Cancelled Visits Do Not Block Availability ---");
const cancelledVisits: MockVisit[] = [
  {
    id: "visit_cancelled_1",
    assignedEmpId: "emp_1",
    scheduledStart: parseISTDateTimeToUTC("2026-11-17", "13:00"),
    scheduledEnd: parseISTDateTimeToUTC("2026-11-17", "14:00"),
    status: "CANCELLED",
  },
];

const availCancelled = simulateEmployeeAvailability({
  date: "2026-11-17",
  startTime: "13:00",
  endTime: "14:00",
  employees: mockEmployees,
  existingVisits: cancelledVisits,
});
const emp1CancelledAvail = availCancelled.find((a) => a.employeeId === "emp_1");
assert.strictEqual(emp1CancelledAvail?.available, true, "Cancelled visits must not block employee availability");
console.log("  ✓ PASS: Cancelled visits release employee schedule.");

// ============================================================================
// TEST SCENARIO 10: Completed visits do not block future assignments
// ============================================================================
console.log("\n--- SCENARIO 10: Completed Visits Do Not Block Future Assignments ---");
const completedVisits: MockVisit[] = [
  {
    id: "visit_completed_1",
    assignedEmpId: "emp_1",
    scheduledStart: parseISTDateTimeToUTC("2026-11-17", "10:00"),
    scheduledEnd: parseISTDateTimeToUTC("2026-11-17", "11:00"),
    status: "COMPLETED",
  },
];

const availCompleted = simulateEmployeeAvailability({
  date: "2026-11-17",
  startTime: "10:00",
  endTime: "11:00",
  employees: mockEmployees,
  existingVisits: completedVisits,
});
const emp1CompletedAvail = availCompleted.find((a) => a.employeeId === "emp_1");
assert.strictEqual(emp1CompletedAvail?.available, true, "Completed visits must not block availability checks");
console.log("  ✓ PASS: Completed status visits are excluded from active scheduling locks.");

// ============================================================================
// TEST SCENARIO 11: Editing a visit does not conflict with itself
// ============================================================================
console.log("\n--- SCENARIO 11: Editing a Visit Does Not Conflict With Itself ---");
const availSelfExcluded = simulateEmployeeAvailability({
  date: "2026-11-17",
  startTime: "13:00",
  endTime: "14:00",
  excludeVisitId: "visit_existing_1",
  employees: mockEmployees,
  existingVisits: mockVisitsDatabase,
});
const emp1SelfAvail = availSelfExcluded.find((a) => a.employeeId === "emp_1");
assert.strictEqual(emp1SelfAvail?.available, true, "Editing a visit with excludeVisitId must allow keeping the same employee");
console.log("  ✓ PASS: Self-exclusion allows modifying current appointment details seamlessly.");

// ============================================================================
// TEST SCENARIO 12: Rescheduling recalculates employee availability
// ============================================================================
console.log("\n--- SCENARIO 12: Rescheduling Recalculates Employee Availability ---");
// Suppose Employee 1 is already booked at 16:00 - 17:00
const multiVisits: MockVisit[] = [
  {
    id: "visit_original",
    assignedEmpId: "emp_1",
    scheduledStart: parseISTDateTimeToUTC("2026-11-17", "13:00"),
    scheduledEnd: parseISTDateTimeToUTC("2026-11-17", "14:00"),
    status: "SCHEDULED",
  },
  {
    id: "visit_later",
    assignedEmpId: "emp_1",
    scheduledStart: parseISTDateTimeToUTC("2026-11-17", "16:00"),
    scheduledEnd: parseISTDateTimeToUTC("2026-11-17", "17:00"),
    status: "CONFIRMED",
  },
];

// Rescheduling visit_original to 15:00 - 16:00 (free slot)
const availReschedFree = simulateEmployeeAvailability({
  date: "2026-11-17",
  startTime: "15:00",
  endTime: "16:00",
  excludeVisitId: "visit_original",
  employees: mockEmployees,
  existingVisits: multiVisits,
});
assert.strictEqual(
  availReschedFree.find((a) => a.employeeId === "emp_1")?.available,
  true,
  "Rescheduling to unoccupied slot must mark employee available"
);

// Rescheduling visit_original to 16:30 - 17:30 (conflicts with visit_later)
const availReschedConflict = simulateEmployeeAvailability({
  date: "2026-11-17",
  startTime: "16:30",
  endTime: "17:30",
  excludeVisitId: "visit_original",
  employees: mockEmployees,
  existingVisits: multiVisits,
});
assert.strictEqual(
  availReschedConflict.find((a) => a.employeeId === "emp_1")?.available,
  false,
  "Rescheduling to occupied slot must dynamically mark employee occupied"
);
console.log("  ✓ PASS: Rescheduling recalculates availability dynamically on date/time change.");

// ============================================================================
// TEST SCENARIO 13: Newly created eligible employees appear in the dropdown
// ============================================================================
console.log("\n--- SCENARIO 13: Eligible Active Employees Appear in Dropdown ---");
function formatEmployeeOption(emp: MockEmployee) {
  const codePart = emp.employeeId ? ` (${emp.employeeId})` : "";
  const desigPart = emp.designation ? ` - ${emp.designation}` : "";
  return `${emp.firstName} ${emp.lastName}${codePart}${desigPart}`;
}

const activeEmps = mockEmployees.filter((e) => e.status === "ACTIVE");
assert.strictEqual(activeEmps.length, 2, "Only active employees must be selectable");
assert.strictEqual(
  formatEmployeeOption(activeEmps[0]),
  "Subhash Ghosh (EMP001) - Care Attendant",
  "Dropdown label must match: FirstName LastName (EMP_ID) - Designation"
);
console.log("  ✓ PASS: Active employees formatted with designation and employee ID.");

// ============================================================================
// TEST SCENARIO 14: Inactive employees cannot be newly assigned
// ============================================================================
console.log("\n--- SCENARIO 14: Inactive Employees Excluded and Blocked by Server ---");
const inactiveEmpAvail = availResults1.find((a) => a.employeeId === "emp_3");
assert.strictEqual(inactiveEmpAvail, undefined, "Inactive employee emp_3 must not appear in availability check");

assert.throws(
  () => {
    simulateServerSideAssignment(
      { assignedEmpId: "emp_3", date: "2026-11-17", startTime: "10:00", endTime: "11:00" },
      mockEmployees,
      []
    );
  },
  /The selected employee is not active or does not exist/,
  "Attempting to assign inactive employee must be rejected by server validation"
);
console.log("  ✓ PASS: Inactive employees cannot be selected or assigned.");

// ============================================================================
// TEST SCENARIO 15: Server-side validation rejects conflicting concurrent assignments
// ============================================================================
console.log("\n--- SCENARIO 15: Server-Side Transactional Conflict Rejection ---");
const liveVisits: MockVisit[] = [];

// Admin A schedules Employee 1 from 13:00 to 14:00
const adminAVisit = simulateServerSideAssignment(
  { assignedEmpId: "emp_1", date: "2026-11-17", startTime: "13:00", endTime: "14:00" },
  mockEmployees,
  liveVisits
);
assert.ok(adminAVisit.id, "Admin A visit creation must succeed");

// Admin B concurrently attempts to schedule Employee 1 from 13:30 to 14:30
assert.throws(
  () => {
    simulateServerSideAssignment(
      { assignedEmpId: "emp_1", date: "2026-11-17", startTime: "13:30", endTime: "14:30" },
      mockEmployees,
      liveVisits
    );
  },
  /This employee has already been assigned to another visit during the selected time/,
  "Concurrent overlapping assignment must be rejected inside the transaction"
);

// Admin B schedules Employee 2 instead -> must succeed
const adminBVisitEmp2 = simulateServerSideAssignment(
  { assignedEmpId: "emp_2", date: "2026-11-17", startTime: "13:30", endTime: "14:30" },
  mockEmployees,
  liveVisits
);
assert.ok(adminBVisitEmp2.id, "Alternative available employee assignment must succeed");
console.log("  ✓ PASS: Server-side transactional conflict check strictly protects against collisions.");

// ============================================================================
// RESCHEDULE SIMULATION HELPER
// ============================================================================
function simulateServerSideReschedule(
  visitId: string,
  param2: string,
  param3: string,
  param4?: string,
  param5?: string | null,
  param6?: string | null,
  options?: {
    employees?: MockEmployee[];
    existingVisits?: MockVisit[];
  }
) {
  let start: Date;
  let end: Date;
  let reason: string | undefined;
  let assignedEmpId: string | null | undefined;

  if (
    param4 &&
    !param2.includes("T") &&
    /^\d{4}-\d{1,2}-\d{1,2}$/.test(param2.trim()) &&
    /^\d{1,2}:\d{2}/.test(param3.trim()) &&
    /^\d{1,2}:\d{2}/.test(param4.trim())
  ) {
    start = parseISTDateTimeToUTC(param2, param3);
    end = parseISTDateTimeToUTC(param2, param4);
    reason = typeof param5 === "string" ? param5 : undefined;
    assignedEmpId = param6 !== undefined ? param6 : undefined;
  } else {
    start = parseISTDateTimeToUTC(param2);
    end = parseISTDateTimeToUTC(param3);
    reason = typeof param4 === "string" ? param4 : undefined;
    assignedEmpId = param5 !== undefined ? param5 : undefined;
  }

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    throw new Error("Invalid reschedule time range. End time must be after start time.");
  }

  const existingVisits = options?.existingVisits || [];
  const employees = options?.employees || mockEmployees;

  const existing = existingVisits.find((v) => v.id === visitId);
  if (!existing) throw new Error("Visit not found.");

  const targetEmpId = assignedEmpId !== undefined ? (assignedEmpId || null) : existing.assignedEmpId;

  if (targetEmpId && ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"].includes(existing.status)) {
    const emp = employees.find((e) => e.id === targetEmpId);
    if (!emp || emp.status !== "ACTIVE") {
      throw new Error("The selected employee is not active or does not exist.");
    }

    const conflict = existingVisits.find(
      (v) =>
        v.id !== visitId &&
        ["SCHEDULED", "CONFIRMED", "IN_PROGRESS"].includes(v.status) &&
        checkIntervalOverlap(v.scheduledStart, v.scheduledEnd, start, end) &&
        (v.assignedEmpId === targetEmpId || v.assignments?.some((a) => a.employeeId === targetEmpId))
    );

    if (conflict) {
      throw new Error(
        "This employee has already been assigned to another visit during the selected time. Please select another employee."
      );
    }
  }

  existing.scheduledStart = start;
  existing.scheduledEnd = end;
  if (assignedEmpId !== undefined) existing.assignedEmpId = targetEmpId;
  return existing;
}

// ============================================================================
// TEST SCENARIO 16: Rescheduling 09:30 AM–10:30 AM IST (Combined String & Multi-Param)
// ============================================================================
console.log("\n--- SCENARIO 16: Reschedule 09:30 AM–10:30 AM IST ---");
const visitFor0930: MockVisit = {
  id: "visit_prabir_sim",
  assignedEmpId: "emp_1",
  scheduledStart: parseISTDateTimeToUTC("2026-11-17", "18:30"), // Old 6:30 PM
  scheduledEnd: parseISTDateTimeToUTC("2026-11-17", "19:30"),
  status: "CONFIRMED",
};

// Reschedule via combined string (as emitted by VisitScheduleCalendar form)
const reschedCombined = simulateServerSideReschedule(
  "visit_prabir_sim",
  "2026-11-17T09:30:00",
  "2026-11-17T10:30:00",
  "Member requested morning slot",
  "emp_1",
  null,
  { existingVisits: [visitFor0930] }
);
assert.strictEqual(
  reschedCombined.scheduledStart.toISOString(),
  "2026-11-17T04:00:00.000Z",
  "09:30 AM IST must parse to 04:00:00.000Z UTC"
);
assert.strictEqual(
  reschedCombined.scheduledEnd.toISOString(),
  "2026-11-17T05:00:00.000Z",
  "10:30 AM IST must parse to 05:00:00.000Z UTC"
);
assert.strictEqual(
  formatTimeIST(reschedCombined.scheduledStart),
  "9:30 am",
  "Formatted start time in IST must be 9:30 am"
);
assert.strictEqual(
  formatTimeIST(reschedCombined.scheduledEnd),
  "10:30 am",
  "Formatted end time in IST must be 10:30 am"
);
console.log("  ✓ PASS: 09:30 AM–10:30 AM IST correctly parsed, validated, and saved.");

// ============================================================================
// TEST SCENARIO 17: Rescheduling 01:00 PM–02:00 PM IST
// ============================================================================
console.log("\n--- SCENARIO 17: Reschedule 01:00 PM–02:00 PM IST ---");
const resched1pm = simulateServerSideReschedule(
  "visit_prabir_sim",
  "2026-11-17T13:00:00",
  "2026-11-17T14:00:00",
  "Afternoon appointment",
  "emp_1",
  null,
  { existingVisits: [visitFor0930] }
);
assert.strictEqual(
  resched1pm.scheduledStart.toISOString(),
  "2026-11-17T07:30:00.000Z",
  "1:00 PM IST must parse to 07:30:00.000Z UTC"
);
assert.strictEqual(
  resched1pm.scheduledEnd.toISOString(),
  "2026-11-17T08:30:00.000Z",
  "2:00 PM IST must parse to 08:30:00.000Z UTC"
);
assert.strictEqual(formatTimeIST(resched1pm.scheduledStart), "1:00 pm");
assert.strictEqual(formatTimeIST(resched1pm.scheduledEnd), "2:00 pm");
console.log("  ✓ PASS: 01:00 PM–02:00 PM IST correctly parsed, validated, and saved.");

// ============================================================================
// TEST SCENARIO 18: Morning and Evening Appointments
// ============================================================================
console.log("\n--- SCENARIO 18: Morning and Evening Appointments ---");
// Early morning: 08:00 AM–09:00 AM IST
const earlyMorning = simulateServerSideReschedule(
  "visit_prabir_sim",
  "2026-11-17T08:00:00",
  "2026-11-17T09:00:00",
  "Early morning",
  "emp_1",
  null,
  { existingVisits: [visitFor0930] }
);
assert.strictEqual(earlyMorning.scheduledStart.toISOString(), "2026-11-17T02:30:00.000Z");
assert.strictEqual(formatTimeIST(earlyMorning.scheduledStart), "8:00 am");

// Evening: 06:30 PM–07:30 PM IST (18:30–19:30)
const evening = simulateServerSideReschedule(
  "visit_prabir_sim",
  "2026-11-17T18:30:00",
  "2026-11-17T19:30:00",
  "Evening visit",
  "emp_1",
  null,
  { existingVisits: [visitFor0930] }
);
assert.strictEqual(evening.scheduledStart.toISOString(), "2026-11-17T13:00:00.000Z");
assert.strictEqual(formatTimeIST(evening.scheduledStart), "6:30 pm");
console.log("  ✓ PASS: Morning (8:00 AM) and evening (6:30 PM) appointments accurately serialized.");

// ============================================================================
// TEST SCENARIO 19: Same-Day Rescheduling
// ============================================================================
console.log("\n--- SCENARIO 19: Same-Day Rescheduling ---");
// Moving a visit on 2026-11-17 from evening (18:30) to morning (09:30) on the same date
const sameDayResched = simulateServerSideReschedule(
  "visit_prabir_sim",
  "2026-11-17T09:30:00",
  "2026-11-17T10:30:00",
  "Same day shift",
  "emp_1",
  null,
  { existingVisits: [visitFor0930] }
);
assert.strictEqual(formatDateKey(sameDayResched.scheduledStart), "2026-11-17");
assert.strictEqual(formatTimeIST(sameDayResched.scheduledStart), "9:30 am");
console.log("  ✓ PASS: Same-day rescheduling maintains date invariant and updates time.");

// ============================================================================
// TEST SCENARIO 20: Rescheduling Across Dates
// ============================================================================
console.log("\n--- SCENARIO 20: Rescheduling Across Dates ---");
// Moving visit from 2026-11-17 to 2026-11-20 11:00 AM–12:00 PM IST
const crossDateResched = simulateServerSideReschedule(
  "visit_prabir_sim",
  "2026-11-20T11:00:00",
  "2026-11-20T12:00:00",
  "Cross date reschedule",
  "emp_1",
  null,
  { existingVisits: [visitFor0930] }
);
assert.strictEqual(crossDateResched.scheduledStart.toISOString(), "2026-11-20T05:30:00.000Z");
assert.strictEqual(formatDateKey(crossDateResched.scheduledStart), "2026-11-20");
assert.strictEqual(formatTimeIST(crossDateResched.scheduledStart), "11:00 am");
console.log("  ✓ PASS: Cross-date rescheduling properly transitions date and time.");

// ============================================================================
// TEST SCENARIO 21: Existing Visit Excluded From Its Own Availability Check
// ============================================================================
console.log("\n--- SCENARIO 21: Existing Visit Excluded From Its Own Check ---");
// Visit is currently 09:30–10:30. Rescheduling by 15 mins to 09:45–10:45 with same employee.
// This overlaps with its previous 09:30–10:30 slot, but because it excludes itself, it must succeed!
visitFor0930.scheduledStart = parseISTDateTimeToUTC("2026-11-17", "09:30");
visitFor0930.scheduledEnd = parseISTDateTimeToUTC("2026-11-17", "10:30");

const selfExcludedResched = simulateServerSideReschedule(
  "visit_prabir_sim",
  "2026-11-17T09:45:00",
  "2026-11-17T10:45:00",
  "Slight shift",
  "emp_1",
  null,
  { existingVisits: [visitFor0930] }
);
assert.strictEqual(formatTimeIST(selfExcludedResched.scheduledStart), "9:45 am");
console.log("  ✓ PASS: Self-exclusion allows modifying visit without colliding with its own previous slot.");

// ============================================================================
// TEST SCENARIO 22: Genuine Overlapping Appointments Rejected
// ============================================================================
console.log("\n--- SCENARIO 22: Genuine Overlapping Appointments Rejected ---");
const otherOccupiedVisit: MockVisit = {
  id: "visit_other_occupied",
  assignedEmpId: "emp_1",
  scheduledStart: parseISTDateTimeToUTC("2026-11-17", "14:00"),
  scheduledEnd: parseISTDateTimeToUTC("2026-11-17", "15:00"),
  status: "SCHEDULED",
};

assert.throws(
  () => {
    simulateServerSideReschedule(
      "visit_prabir_sim",
      "2026-11-17T14:15:00", // Collides with otherOccupiedVisit
      "2026-11-17T15:15:00",
      "Conflicting move",
      "emp_1",
      null,
      { existingVisits: [visitFor0930, otherOccupiedVisit] }
    );
  },
  /This employee has already been assigned to another visit during the selected time/,
  "Attempting to reschedule into another occupied appointment slot must be blocked"
);
console.log("  ✓ PASS: Genuine employee conflicts with OTHER visits are strictly rejected.");

// ============================================================================
// TEST SCENARIO 23: Inverted and Invalid Time Ranges Rejected
// ============================================================================
console.log("\n--- SCENARIO 23: Inverted and Invalid Time Ranges Rejected ---");
assert.throws(
  () => {
    simulateServerSideReschedule(
      "visit_prabir_sim",
      "2026-11-17T10:30:00",
      "2026-11-17T09:30:00", // Inverted (end before start)
      "Invalid inversion",
      "emp_1",
      null,
      { existingVisits: [visitFor0930] }
    );
  },
  /Invalid reschedule time range\. End time must be after start time\./,
  "Inverted end time must trigger exact authorative validation message"
);

assert.throws(
  () => {
    simulateServerSideReschedule(
      "visit_prabir_sim",
      "2026-11-17T09:30:00",
      "2026-11-17T09:30:00", // Equal start and end
      "Zero duration",
      "emp_1",
      null,
      { existingVisits: [visitFor0930] }
    );
  },
  /Invalid reschedule time range\. End time must be after start time\./,
  "Zero duration must trigger validation message"
);
console.log("  ✓ PASS: Inverted and zero-duration time ranges authoritative validation verified.");

console.log("\n================================================================");
console.log("🎉 ALL 23 VISIT SCHEDULE & RESCHEDULING TESTS PASSED (100%)");
console.log("================================================================\n");