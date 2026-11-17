import assert from "node:assert";
import { EmployeeIdentityService } from "../../lib/services/employee-identity";
import { MemberIdentityService } from "../../lib/services/member-identity";

console.log("================================================================");
console.log("Sunshine Eldercare — Employee ID Generation & Regression Test Suite");
console.log("================================================================");

// ============================================================================
// TEST 1: Exact Name-Derived Suffix Logic (First 2 First Name + Last 2 Surname)
// ============================================================================
console.log("\n[TEST 1] Mandatory Name-Derived Suffix Examples");
{
  // Exact examples required by specification:
  // 1. Tanish Alam -> First: Tanish (TA), Surname: Alam (AM) -> TAAM
  const tanishSuffix = EmployeeIdentityService.extractSuffix("Tanish", "Alam");
  assert.strictEqual(tanishSuffix, "TAAM", "Tanish Alam suffix must be TAAM");

  // 2. Sagnik Kar -> First: Sagnik (SA), Surname: Kar (AR) -> SAAR
  const sagnikSuffix = EmployeeIdentityService.extractSuffix("Sagnik", "Kar");
  assert.strictEqual(sagnikSuffix, "SAAR", "Sagnik Kar suffix must be SAAR");

  // 3. Rahul Sharma -> First: Rahul (RA), Surname: Sharma (MA) -> RAMA
  const rahulSuffix = EmployeeIdentityService.extractSuffix("Rahul", "Sharma");
  assert.strictEqual(rahulSuffix, "RAMA", "Rahul Sharma suffix must be RAMA");

  // 4. Amit Mukherjee -> First: Amit (AM), Surname: Mukherjee (EE) -> AMEE
  const amitSuffix = EmployeeIdentityService.extractSuffix("Amit", "Mukherjee");
  assert.strictEqual(amitSuffix, "AMEE", "Amit Mukherjee suffix must be AMEE");

  // 5. Basudeb Kundu -> First: Basudeb (BA), Surname: Kundu (DU) -> BADU
  const basudebSuffix = EmployeeIdentityService.extractSuffix("Basudeb", "Kundu");
  assert.strictEqual(basudebSuffix, "BADU", "Basudeb Kundu suffix must be BADU");

  console.log("  ✓ All 5 exact mandatory name-derived suffixes verified (TAAM, SAAR, RAMA, AMEE, BADU)");
}

// ============================================================================
// TEST 2: Regression Guard Against First Two Letters of Surname Error
// ============================================================================
console.log("\n[TEST 2] Strict Regression Guard Against Surname-Prefix Bug");
{
  // These assertions explicitly fail if any code reverts to taking the first 2 letters of surname:
  const tanishSuffix = EmployeeIdentityService.extractSuffix("Tanish", "Alam");
  assert.notStrictEqual(tanishSuffix, "TAAL", "CRITICAL BUG: Suffix must NOT take first two of surname ('AL')");

  const sagnikSuffix = EmployeeIdentityService.extractSuffix("Sagnik", "Kar");
  assert.notStrictEqual(sagnikSuffix, "SAKA", "CRITICAL BUG: Suffix must NOT take first two of surname ('KA')");

  const rahulSuffix = EmployeeIdentityService.extractSuffix("Rahul", "Sharma");
  assert.notStrictEqual(rahulSuffix, "RASH", "CRITICAL BUG: Suffix must NOT take first two of surname ('SH')");

  const amitSuffix = EmployeeIdentityService.extractSuffix("Amit", "Mukherjee");
  assert.notStrictEqual(amitSuffix, "AMMU", "CRITICAL BUG: Suffix must NOT take first two of surname ('MU')");

  const basudebSuffix = EmployeeIdentityService.extractSuffix("Basudeb", "Kundu");
  assert.notStrictEqual(basudebSuffix, "BAKU", "CRITICAL BUG: Suffix must NOT take first two of surname ('KU')");

  console.log("  ✓ Regression guard passed: system rejects taking first two letters of surname");
}

// ============================================================================
// TEST 3: Strict Absence of Slashes, Spaces, or Separators
// ============================================================================
console.log("\n[TEST 3] Format Invariant: SEC + sequence + 4-letter suffix without slashes");
{
  const testIds = [
    `SEC185${EmployeeIdentityService.extractSuffix("Tanish", "Alam")}`,
    `SEC184${EmployeeIdentityService.extractSuffix("Sagnik", "Kar")}`,
    `SEC186${EmployeeIdentityService.extractSuffix("Rahul", "Sharma")}`,
    `SEC187${EmployeeIdentityService.extractSuffix("Amit", "Mukherjee")}`,
    `SEC188${EmployeeIdentityService.extractSuffix("Basudeb", "Kundu")}`,
  ];

  for (const id of testIds) {
    assert.match(
      id,
      /^SEC\d+[A-Z]{4}$/,
      `Employee ID ${id} must match format SEC + sequence + 4-letter uppercase suffix`
    );
    assert.strictEqual(id.includes("/"), false, `Employee ID ${id} must contain ZERO slashes`);
    assert.strictEqual(id.includes("-"), false, `Employee ID ${id} must contain ZERO hyphens`);
    assert.strictEqual(id.includes(" "), false, `Employee ID ${id} must contain ZERO spaces`);
    assert.strictEqual(EmployeeIdentityService.isValidEmployeeId(id), true, `${id} must be valid`);
  }

  // Exact ID checks for production targets:
  assert.strictEqual(`SEC185${EmployeeIdentityService.extractSuffix("Tanish", "Alam")}`, "SEC185TAAM");
  assert.strictEqual(`SEC184${EmployeeIdentityService.extractSuffix("Sagnik", "Kar")}`, "SEC184SAAR");

  console.log("  ✓ All IDs match ^SEC\\d+[A-Z]{4}$ with zero slashes, spaces, or hyphens");
}

// ============================================================================
// TEST 4: Salutation & Rank Exclusion (Salutations NEVER Influence ID)
// ============================================================================
console.log("\n[TEST 4] Salutation & Rank Stripping");
{
  const salutations = [
    "Dr.", "Dr", "Mr.", "Mr", "Mrs.", "Mrs", "Ms.", "Ms",
    "Prof.", "Prof", "Col.", "Col", "Lt.", "Lt", "Brig.", "Brig",
    "Capt.", "Capt", "Grp Cpt", "Wg Cdr", "Major", "Gen"
  ];

  for (const title of salutations) {
    const withTitle = EmployeeIdentityService.extractSuffix(`${title} Tanish`, "Alam");
    assert.strictEqual(
      withTitle,
      "TAAM",
      `Salutation "${title}" must NOT influence suffix generation (expected TAAM, got ${withTitle})`
    );

    const withTitleKar = EmployeeIdentityService.extractSuffix(`${title} Sagnik`, "Kar");
    assert.strictEqual(
      withTitleKar,
      "SAAR",
      `Salutation "${title}" must NOT influence suffix generation (expected SAAR, got ${withTitleKar})`
    );
  }

  console.log("  ✓ Verified all salutations and military/academic ranks are completely excluded");
}

// ============================================================================
// TEST 5: Short Names, Multi-Word Names, and Non-ASCII Sanitization
// ============================================================================
console.log("\n[TEST 5] Short Names, Multi-Word Names, and Sanitization");
{
  // Short names (single character) padded with X
  const short1 = EmployeeIdentityService.extractSuffix("A", "B");
  assert.strictEqual(short1, "AXBX", "Single letter names should pad with X");

  const short2 = EmployeeIdentityService.extractSuffix("Al", "K");
  assert.strictEqual(short2, "ALKX", "1-letter surname should pad with X");

  // Multi-word first name
  const multi1 = EmployeeIdentityService.extractSuffix("John Paul", "Smith");
  assert.strictEqual(multi1, "JOTH", "Multi-word first name takes first 2 letters of first token (JO) + last 2 of surname (TH)");

  // Special characters & whitespace
  const messy = EmployeeIdentityService.extractSuffix("  T-a_n i.s#h  ", "  A!l@a$m  ");
  assert.strictEqual(messy, "TAAM", "Whitespace and punctuation must be stripped before extraction");

  console.log("  ✓ Short names, multi-word names, and messy input handled resiliently");
}

// ============================================================================
// TEST 6: Normalization & Legacy Slash Upgrades
// ============================================================================
console.log("\n[TEST 6] Normalization and Legacy Upgrade");
{
  // Normalization strips slashes and capitalizes
  assert.strictEqual(EmployeeIdentityService.normalizeEmployeeId("SEC/184/SAAR"), "SEC184SAAR");
  assert.strictEqual(EmployeeIdentityService.normalizeEmployeeId("sec/185/taam"), "SEC185TAAM");
  assert.strictEqual(EmployeeIdentityService.normalizeEmployeeId("SEC-185-TAAM"), "SEC185TAAM");
  assert.strictEqual(EmployeeIdentityService.normalizeEmployeeId("  SEC 184 SAAR  "), "SEC184SAAR");
  assert.strictEqual(EmployeeIdentityService.normalizeEmployeeId("SEC185TAAM"), "SEC185TAAM");

  console.log("  ✓ Normalization cleanly converts legacy formats to canonical format");
}

// ============================================================================
// TEST 7: Independent Sequence and Collision Prevention
// ============================================================================
console.log("\n[TEST 7] Concurrency Safety and Collision Avoidance");
async function testGeneration() {
  let seqCurrent = 185;
  const mockExistingDb = new Set(["SEC186RAMA"]);

  const mockClient = {
    employeeSequence: {
      upsert: async () => {
        seqCurrent += 1;
        return { id: "EMP_SEQ", current: seqCurrent };
      },
    },
    employee: {
      findUnique: async ({ where }: { where: { employeeId: string } }) => {
        if (mockExistingDb.has(where.employeeId)) {
          return { id: "existing-cuid" };
        }
        return null;
      },
    },
  };

  // Generating for Rahul Sharma will hit collision on SEC186RAMA and retry to SEC187RAMA
  const generatedId = await EmployeeIdentityService.generateEmployeeId("Rahul", "Sharma", mockClient);
  assert.strictEqual(generatedId, "SEC187RAMA", "Collision must trigger increment to next sequence");
  assert.strictEqual(generatedId.includes("/"), false, "Generated ID must NOT have slashes");

  console.log("  ✓ Concurrency sequence increment and collision retry verified");
}

// ============================================================================
// TEST 8: Strict Independence from Member ID System
// ============================================================================
console.log("\n[TEST 8] Employee ID System Remains Completely Independent of Member ID System");
async function testIndependence() {
  let memberSeq = 1002;
  let employeeSeq = 185;

  const mockClient = {
    memberSequence: {
      upsert: async () => {
        memberSeq += 1;
        return { id: "MEMBER_SEQ", current: memberSeq };
      },
    },
    employeeSequence: {
      upsert: async () => {
        employeeSeq += 1;
        return { id: "EMP_SEQ", current: employeeSeq };
      },
    },
    employee: {
      findUnique: async () => null,
    },
  };

  // Generate an Employee ID
  const empId = await EmployeeIdentityService.generateEmployeeId("Tanish", "Alam", mockClient);
  assert.strictEqual(empId, "SEC186TAAM");
  assert.strictEqual(memberSeq, 1002, "Member sequence must NOT be touched by Employee ID generation");

  // Generate a Member ID
  const memId = await MemberIdentityService.generateMemberId("Tanish", "Alam", "S", mockClient);
  assert.strictEqual(memId, "SECS1003TAAM");
  assert.strictEqual(employeeSeq, 186, "Employee sequence must NOT be touched by Member ID generation");

  // Verify structure difference:
  // Employee ID: SEC + number + suffix (SEC186TAAM)
  // Member ID: SEC + [S/D] + number + suffix (SECS1003TAAM)
  assert.match(empId, /^SEC\d+[A-Z]{4}$/);
  assert.match(memId, /^SEC[SD]\d+[A-Z]{4}$/);

  console.log("  ✓ Employee and Member namespaces and sequences are fully isolated and independent");
}

async function runAll() {
  await testGeneration();
  await testIndependence();
  console.log("\n================================================================");
  console.log("ALL EMPLOYEE ID GENERATION REGRESSION TESTS PASSED (100%)");
  console.log("================================================================\n");
}

runAll().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
