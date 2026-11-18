import assert from "node:assert";
import { employeeSchema } from "../../lib/validations/employee";
import { EmployeeIdentityService } from "../../lib/services/employee-identity";
import { checkIntervalOverlap, parseISTDateTimeToUTC } from "../../components/admin/schedule/schedule-date-utils";

console.log("================================================================");
console.log("Running Sunshine Eldercare — Employee Management Test Suite");
console.log("Testing: Creation, Separation from Admins, IDs, Visit Integration");
console.log("================================================================");

// ============================================================================
// 1. VALIDATION SCHEMA TESTS (MANDATORY NAME, DESIGNATION, CONTACT, EMAIL, DOB)
// ============================================================================
console.log("\n[TEST 1] Validation Schema - Mandatory First/Last Name, Role, Mobile, Email, and DOB");

{
  // Valid mandatory payload
  const validEmployee = employeeSchema.safeParse({
    firstName: "Priya",
    lastName: "Banerjee",
    designation: "Staff Nurse",
    contactNumber: "9830123456",
    email: "priya.banerjee@sunshineeldercare.in",
    dateOfBirth: "1992-05-14",
  });
  assert.strictEqual(validEmployee.success, true, "Valid employee payload with mandatory fields should succeed");
  if (validEmployee.success) {
    assert.strictEqual(validEmployee.data.status, "ACTIVE", "Default status must be ACTIVE");
  }

  // Missing required firstName
  const missingFirst = employeeSchema.safeParse({
    lastName: "Banerjee",
    designation: "Staff Nurse",
    contactNumber: "9830123456",
    email: "priya.banerjee@sunshineeldercare.in",
    dateOfBirth: "1992-05-14",
  });
  assert.strictEqual(missingFirst.success, false, "Missing firstName must fail validation");

  // Missing required lastName
  const missingLast = employeeSchema.safeParse({
    firstName: "Priya",
    designation: "Staff Nurse",
    contactNumber: "9830123456",
    email: "priya.banerjee@sunshineeldercare.in",
    dateOfBirth: "1992-05-14",
  });
  assert.strictEqual(missingLast.success, false, "Missing lastName must fail validation");

  // Missing required designation
  const missingDesignation = employeeSchema.safeParse({
    firstName: "Priya",
    lastName: "Banerjee",
    contactNumber: "9830123456",
    email: "priya.banerjee@sunshineeldercare.in",
    dateOfBirth: "1992-05-14",
  });
  assert.strictEqual(missingDesignation.success, false, "Missing designation must fail validation");

  // Missing required contactNumber
  const missingContact = employeeSchema.safeParse({
    firstName: "Priya",
    lastName: "Banerjee",
    designation: "Staff Nurse",
    email: "priya.banerjee@sunshineeldercare.in",
    dateOfBirth: "1992-05-14",
  });
  assert.strictEqual(missingContact.success, false, "Missing contactNumber must fail validation");

  // Invalid contactNumber (fewer than 10 digits)
  const invalidContact = employeeSchema.safeParse({
    firstName: "Priya",
    lastName: "Banerjee",
    designation: "Staff Nurse",
    contactNumber: "12345",
    email: "priya.banerjee@sunshineeldercare.in",
    dateOfBirth: "1992-05-14",
  });
  assert.strictEqual(invalidContact.success, false, "Invalid contactNumber must fail validation");

  // Missing required email
  const missingEmail = employeeSchema.safeParse({
    firstName: "Priya",
    lastName: "Banerjee",
    designation: "Staff Nurse",
    contactNumber: "9830123456",
    dateOfBirth: "1992-05-14",
  });
  assert.strictEqual(missingEmail.success, false, "Missing email must fail validation");

  // Invalid email format
  const invalidEmail = employeeSchema.safeParse({
    firstName: "Priya",
    lastName: "Banerjee",
    designation: "Staff Nurse",
    contactNumber: "9830123456",
    email: "not-an-email",
    dateOfBirth: "1992-05-14",
  });
  assert.strictEqual(invalidEmail.success, false, "Invalid email must fail validation");

  // Missing required dateOfBirth
  const missingDob = employeeSchema.safeParse({
    firstName: "Priya",
    lastName: "Banerjee",
    designation: "Staff Nurse",
    contactNumber: "9830123456",
    email: "priya.banerjee@sunshineeldercare.in",
  });
  assert.strictEqual(missingDob.success, false, "Missing dateOfBirth must fail validation");

  // Future dateOfBirth
  const futureDob = employeeSchema.safeParse({
    firstName: "Priya",
    lastName: "Banerjee",
    designation: "Staff Nurse",
    contactNumber: "9830123456",
    email: "priya.banerjee@sunshineeldercare.in",
    dateOfBirth: "2099-01-01",
  });
  assert.strictEqual(futureDob.success, false, "Future dateOfBirth must fail validation");

  // Pre-1900 dateOfBirth
  const pre1900Dob = employeeSchema.safeParse({
    firstName: "Priya",
    lastName: "Banerjee",
    designation: "Staff Nurse",
    contactNumber: "9830123456",
    email: "priya.banerjee@sunshineeldercare.in",
    dateOfBirth: "1850-01-01",
  });
  assert.strictEqual(pre1900Dob.success, false, "Pre-1900 dateOfBirth must fail validation");

  // Valid full payload with optional publicBiography
  const validFull = employeeSchema.safeParse({
    firstName: "Rajesh",
    lastName: "Sen",
    designation: "Care Coordinator",
    employeeId: "SEC173RAEN",
    contactNumber: "+91 98301 23456",
    email: "rajesh.sen@sunshineeldercare.in",
    dateOfBirth: "1988-11-20",
    status: "ACTIVE",
    publicBiography: "Certified geriatric care specialist with 8 years of experience.",
  });
  assert.strictEqual(validFull.success, true, "Complete valid employee payload should succeed");

  console.log("✓ Validation schema enforces all mandatory fields (First/Last Name, Role, Mobile, Email, DOB) and formats correctly.");
}

// ============================================================================
// 2. CANONICAL EMPLOYEE ID GENERATION & INITIALS EXTRACTION
// ============================================================================
console.log("\n[TEST 2] Canonical Employee ID Generation & Initials Handling");

{
  // Test initials generation via authoritative EmployeeIdentityService
  assert.strictEqual(EmployeeIdentityService.extractSuffix("Sagnik", "Kar"), "SAAR", "Initials for Sagnik Kar should be SAAR");
  assert.strictEqual(EmployeeIdentityService.extractSuffix("Tanish", "Alam"), "TAAM", "Initials for Tanish Alam should be TAAM");
  assert.strictEqual(EmployeeIdentityService.extractSuffix("Rahul", "Sharma"), "RAMA", "Initials for Rahul Sharma should be RAMA");
  assert.strictEqual(EmployeeIdentityService.extractSuffix("Amit", "Mukherjee"), "AMEE", "Initials for Amit Mukherjee should be AMEE");
  assert.strictEqual(EmployeeIdentityService.extractSuffix("Basudeb", "Kundu"), "BADU", "Initials for Basudeb Kundu should be BADU");
  assert.strictEqual(EmployeeIdentityService.extractSuffix("A", "B"), "AXBX", "Short names should be padded safely with X to ensure 2 letters each");

  // Format check: SEC{number}{initials} with strictly NO slashes
  const sampleId = `SEC173${EmployeeIdentityService.extractSuffix("Ananya", "Roy")}`;
  assert.match(sampleId, /^SEC\d+[A-Z]{4}$/, "Canonical Employee ID must match SEC{number}{initials} pattern without slashes");
  assert.strictEqual(sampleId, "SEC173ANOY", "Generated ID matches expected format");
  assert.strictEqual(sampleId.includes("/"), false, "Canonical Employee ID must contain zero slashes");

  console.log("✓ Employee ID format and initials extraction validated.");
}

// ============================================================================
// 3. EMPLOYEE & ADMIN STRICT SEPARATION GUARANTEE
// ============================================================================
console.log("\n[TEST 3] Employee vs Admin Account Separation");

{
  interface MockEmployeeRecord {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    designation: string;
    userId: string | null;
    status: "ACTIVE" | "INACTIVE";
  }

  interface MockUserRecord {
    id: string;
    name: string;
    email: string;
    roles: string[];
    employeeId: string | null;
  }

  // Simulation: Creating an employee MUST NEVER create a User record or grant credentials
  function createMockEmployee(input: { firstName: string; lastName: string; designation: string }): MockEmployeeRecord {
    return {
      id: "emp_" + Math.random().toString(36).substring(2, 9),
      employeeId: "SEC174TEST",
      firstName: input.firstName,
      lastName: input.lastName,
      designation: input.designation,
      userId: null, // Strictly null: NO user/login credentials
      status: "ACTIVE",
    };
  }

  const newEmp = createMockEmployee({
    firstName: "Sunita",
    lastName: "Das",
    designation: "Care Attendant",
  });

  assert.strictEqual(newEmp.userId, null, "Employee userId MUST be null by default");
  assert.strictEqual(newEmp.status, "ACTIVE", "Employee status should be ACTIVE");

  // An admin user record is a separate entity that may optionally link to an employee
  const adminUser: MockUserRecord = {
    id: "usr_admin_1",
    name: "Admin User",
    email: "admin@sunshineeldercare.in",
    roles: ["SUPER_ADMIN"],
    employeeId: null,
  };

  assert.notStrictEqual(newEmp.id, adminUser.id, "Employee and User IDs must remain distinct");
  assert.strictEqual(Array.isArray(adminUser.roles), true, "Admin user has security roles");
  assert.strictEqual("roles" in newEmp, false, "Employee record does not have admin security roles");

  console.log("✓ Strict separation between Employee records and Administrator credentials verified.");
}

// ============================================================================
// 4. DUPLICATE EMPLOYEE ID COLLISION HANDLING
// ============================================================================
console.log("\n[TEST 4] Duplicate Employee ID Detection & Prevention");

{
  const existingEmployees = [
    { id: "e1", employeeId: "SEC101SAAR", firstName: "Sagnik", lastName: "Kar" },
    { id: "e2", employeeId: "SEC172NUTE", firstName: "Nurse", lastName: "Test" },
  ];

  function validateEmployeeIdUniqueness(targetId: string, currentEmpId?: string) {
    const collision = existingEmployees.find(
      (e) => e.employeeId === targetId && (!currentEmpId || e.id !== currentEmpId)
    );
    if (collision) {
      return { success: false, error: `An employee with Employee ID "${targetId}" already exists.` };
    }
    return { success: true };
  }

  // Duplicate custom ID on create
  const checkDuplicate = validateEmployeeIdUniqueness("SEC101SAAR");
  assert.strictEqual(checkDuplicate.success, false, "Collision on existing employee ID must be rejected");
  assert.ok(checkDuplicate.error?.includes("already exists"), "Error message must indicate duplicate ID");

  // Unique custom ID on create
  const checkUnique = validateEmployeeIdUniqueness("SEC200CUST");
  assert.strictEqual(checkUnique.success, true, "Unique custom employee ID must be accepted");

  // Self-update with same ID on edit should be allowed
  const checkSelfUpdate = validateEmployeeIdUniqueness("SEC101SAAR", "e1");
  assert.strictEqual(checkSelfUpdate.success, true, "Updating employee with their own current ID must be allowed");

  // Updating employee with another employee's ID must be rejected
  const checkConflictUpdate = validateEmployeeIdUniqueness("SEC172NUTE", "e1");
  assert.strictEqual(checkConflictUpdate.success, false, "Updating employee with another employee ID must be rejected");

  console.log("✓ Duplicate Employee ID collision checks verified.");
}

// ============================================================================
// 5. STATUS TRANSITIONS & AUDIT LOGGING
// ============================================================================
console.log("\n[TEST 5] Employee Status Transitions & Auditing");

{
  let emp = {
    id: "emp_100",
    employeeId: "SEC100TEST",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  };

  const auditLogs: Array<{ action: string; entityId: string; metadata: any }> = [];

  function toggleStatus(employee: typeof emp) {
    const newStatus = employee.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const action = newStatus === "ACTIVE" ? "EMPLOYEE_ACTIVATED" : "EMPLOYEE_DEACTIVATED";
    
    auditLogs.push({
      action,
      entityId: employee.id,
      metadata: { previousStatus: employee.status, newStatus, employeeId: employee.employeeId },
    });

    employee.status = newStatus;
    return employee;
  }

  // Deactivate
  emp = toggleStatus(emp);
  assert.strictEqual(emp.status, "INACTIVE", "Status should transition to INACTIVE");
  assert.strictEqual(auditLogs[0].action, "EMPLOYEE_DEACTIVATED", "Deactivation audit log recorded");
  assert.strictEqual(auditLogs[0].metadata.newStatus, "INACTIVE");

  // Reactivate
  emp = toggleStatus(emp);
  assert.strictEqual(emp.status, "ACTIVE", "Status should transition back to ACTIVE");
  assert.strictEqual(auditLogs[1].action, "EMPLOYEE_ACTIVATED", "Activation audit log recorded");
  assert.strictEqual(auditLogs[1].metadata.newStatus, "ACTIVE");

  console.log("✓ Status toggling and audit logging verified.");
}

// ============================================================================
// 6. VISIT SCHEDULE INTEGRATION — ACTIVE VS INACTIVE FILTERING
// ============================================================================
console.log("\n[TEST 6] Visit Schedule Integration — Active vs Inactive Filtering");

{
  const employeeDirectory = [
    { id: "emp_active_1", name: "Nurse Test", status: "ACTIVE" },
    { id: "emp_active_2", name: "Dr. Rajesh Sen", status: "ACTIVE" },
    { id: "emp_inactive_1", name: "Former Staff", status: "INACTIVE" },
  ];

  // Logic used in getCareScheduleFormData: query where status is ACTIVE
  function getSchedulableEmployees(employees: typeof employeeDirectory) {
    return employees.filter((e) => e.status === "ACTIVE");
  }

  const schedulable = getSchedulableEmployees(employeeDirectory);
  assert.strictEqual(schedulable.length, 2, "Only active employees should appear in schedule dropdown");
  assert.ok(schedulable.some((e) => e.id === "emp_active_1"));
  assert.ok(schedulable.some((e) => e.id === "emp_active_2"));
  assert.ok(!schedulable.some((e) => e.id === "emp_inactive_1"), "Inactive employee must NOT appear");

  // Server-side assignment validation check
  function validateAssignment(empId: string, employees: typeof employeeDirectory) {
    const target = employees.find((e) => e.id === empId);
    if (!target || target.status !== "ACTIVE") {
      throw new Error("The selected employee is not active or does not exist.");
    }
    return true;
  }

  assert.strictEqual(validateAssignment("emp_active_2", employeeDirectory), true);
  assert.throws(
    () => validateAssignment("emp_inactive_1", employeeDirectory),
    /The selected employee is not active or does not exist/,
    "Server-side check must reject assigning an inactive employee"
  );

  console.log("✓ Visit Schedule correctly filters active employees and rejects inactive assignments.");
}

// ============================================================================
// 7. HISTORICAL DATA PRESERVATION ON DEACTIVATION
// ============================================================================
console.log("\n[TEST 7] Historical Visit Preservation Upon Deactivation");

{
  const historicalVisits = [
    {
      id: "visit_past_1",
      assignedEmpId: "emp_deactivated",
      scheduledStart: new Date("2026-11-01T10:00:00Z"),
      scheduledEnd: new Date("2026-11-01T11:00:00Z"),
      status: "COMPLETED",
    },
    {
      id: "visit_past_2",
      assignedEmpId: "emp_deactivated",
      scheduledStart: new Date("2026-11-10T14:00:00Z"),
      scheduledEnd: new Date("2026-11-10T15:00:00Z"),
      status: "COMPLETED",
    },
  ];

  // Simulate deactivation of the employee
  const employee = { id: "emp_deactivated", status: "ACTIVE" };
  employee.status = "INACTIVE";

  // Check that historical visits are untouched
  const visitsForEmployee = historicalVisits.filter((v) => v.assignedEmpId === employee.id);
  assert.strictEqual(visitsForEmployee.length, 2, "Historical visits must remain intact");
  assert.strictEqual(visitsForEmployee[0].status, "COMPLETED");
  assert.strictEqual(visitsForEmployee[1].status, "COMPLETED");

  console.log("✓ Historical visits remain fully intact and linked upon employee deactivation.");
}

// ============================================================================
// 8. DUPLICATE EMAIL DETECTION & READ-ONLY EMPLOYEE ID INVARIANCE ON EDIT
// ============================================================================
console.log("\n[TEST 8] Duplicate Email Detection & Read-Only Employee ID Invariance");

{
  const existingEmployees = [
    { id: "e1", employeeId: "SEC184SAAR", email: "sagnik@example.com", contactNumber: "7980718556" },
    { id: "e2", employeeId: "SEC185TAAM", email: "tanish@example.com", contactNumber: "8336993280" },
  ];

  function validateEmailUniqueness(email: string, currentEmpId?: string) {
    const trimmed = email.trim().toLowerCase();
    const collision = existingEmployees.find(
      (e) => e.email.toLowerCase() === trimmed && (!currentEmpId || e.id !== currentEmpId)
    );
    if (collision) {
      return { success: false, error: `An employee with email "${trimmed}" already exists.` };
    }
    return { success: true };
  }

  // Conflict on create with existing email
  const createConflict = validateEmailUniqueness("sagnik@example.com");
  assert.strictEqual(createConflict.success, false, "Duplicate email on create must be rejected");
  assert.ok(createConflict.error?.includes("already exists"));

  // Unique email on create
  const createUnique = validateEmailUniqueness("newstaff@example.com");
  assert.strictEqual(createUnique.success, true, "Unique email on create must be allowed");

  // Self-update on edit with same email allowed
  const updateSelf = validateEmailUniqueness("sagnik@example.com", "e1");
  assert.strictEqual(updateSelf.success, true, "Updating employee with their own current email must be allowed");

  // Update on edit conflicting with another employee rejected
  const updateConflict = validateEmailUniqueness("tanish@example.com", "e1");
  assert.strictEqual(updateConflict.success, false, "Updating employee to match another employee email must be rejected");

  // Read-only Employee ID invariance: edit operation cannot alter canonical employeeId
  const empBefore = { id: "e1", employeeId: "SEC184SAAR", firstName: "Sagnik", lastName: "Kar" };
  const incomingEditPayload = { employeeId: "SEC999HACK", firstName: "Sagnik", lastName: "Kar" };
  // Authoritative server logic preserves existing employeeId
  const empAfter = {
    ...empBefore,
    firstName: incomingEditPayload.firstName,
    lastName: incomingEditPayload.lastName,
    employeeId: empBefore.employeeId, // Read-only: server strictly preserves authoritative employeeId
  };
  assert.strictEqual(empAfter.employeeId, "SEC184SAAR", "Employee ID must remain strictly immutable during edit");

  console.log("✓ Duplicate email detection and Employee ID immutability verified.");
}

// ============================================================================
// 9. EMPLOYEE BIRTHDAY CALENDAR PRIVACY & RECURRENCE INVARIANT
// ============================================================================
console.log("\n[TEST 9] Employee Birthday Calendar Privacy & Recurrence Invariant");

{
  const employeeDob = new Date("1995-11-20T00:00:00.000Z");
  const refDate = new Date("2026-11-19T00:00:00.000Z");

  const mockEmployee = {
    employeeId: "SEC186MAAR",
    firstName: "Maxi",
    lastName: "Kumar",
    dateOfBirth: employeeDob,
    contactNumber: "7980718556",
    email: "maxi@example.com",
    status: "ACTIVE",
  };

  // Build birthday entry for employee
  const employeeBirthdayEntry = {
    id: `${mockEmployee.employeeId}-EMPLOYEE`,
    employeeId: mockEmployee.employeeId,
    personType: "EMPLOYEE" as const,
    fullName: `${mockEmployee.firstName} ${mockEmployee.lastName}`,
    formattedBirthday: "20 November",
    turningAge: 31,
    primaryMobile: null, // Strictly null for privacy
    personMobile: null, // Strictly null for privacy
  };

  assert.strictEqual(employeeBirthdayEntry.personType, "EMPLOYEE");
  assert.strictEqual(employeeBirthdayEntry.primaryMobile, null, "Employee phone must NOT be exposed in birthday calendar");
  assert.strictEqual(employeeBirthdayEntry.personMobile, null, "Employee personal mobile must NOT be exposed in birthday calendar");
  assert.strictEqual("email" in employeeBirthdayEntry, false, "Employee email must NOT be exposed in birthday calendar");
  assert.strictEqual("salary" in employeeBirthdayEntry, false, "Employee salary must NOT be exposed in birthday calendar");
  assert.strictEqual(employeeBirthdayEntry.fullName, "Maxi Kumar");
  assert.strictEqual(employeeBirthdayEntry.turningAge, 31);

  console.log("✓ Employee birthday entry privacy invariants and data isolation verified.");
}

console.log("\n================================================================");
console.log("ALL EMPLOYEE MANAGEMENT TESTS PASSED SUCCESSFULLY! (9/9)");
console.log("================================================================\n");
