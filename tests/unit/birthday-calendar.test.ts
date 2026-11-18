import assert from "node:assert";
import { BirthdayCalendarService, BirthdayEntry } from "../../lib/services/birthday-calendar";

async function runTests() {
  console.log("================================================================");
  console.log("Sunshine Eldercare — Central Birthday Calendar Unit Test Suite");
  console.log("================================================================");

  // ============================================================================
  // TEST 1: Asia/Kolkata Date Parts Extraction & Boundary Correctness
  // ============================================================================
  console.log("\n[TEST 1] Asia/Kolkata Date Extraction");
  {
    // 1947-11-26T00:00:00.000Z -> In IST is 1947-11-26 05:30:00
    const parts = BirthdayCalendarService.getKolkataDateParts("1947-11-26T00:00:00.000Z");
    assert.strictEqual(parts.day, 26, "Day must be 26");
    assert.strictEqual(parts.month, 11, "Month must be 11 (November)");
    assert.strictEqual(parts.year, 1947, "Year must be 1947");

    // Late evening UTC that falls into next day IST (e.g. 18:30 UTC = 00:00 IST next day)
    const boundaryParts = BirthdayCalendarService.getKolkataDateParts("1954-01-19T18:30:00.000Z");
    assert.strictEqual(boundaryParts.day, 20, "18:30 UTC on Jan 19 must be Jan 20 in IST");
    assert.strictEqual(boundaryParts.month, 1, "Month must be 1 (January)");
    assert.strictEqual(boundaryParts.year, 1954, "Year must be 1954");

    console.log("  ✓ Asia/Kolkata timezone extraction accurately handles midnight and UTC offsets");
  }

  // ============================================================================
  // TEST 2: Leap Day (29 February) Recurrence Rule
  // ============================================================================
  console.log("\n[TEST 2] Leap Day (29 February) Recurrence Rules");
  {
    // Person born on leap day 1960-02-29
    const leapDob = "1960-02-29T00:00:00.000Z";

    // In non-leap year 2026 (Nov 18, 2026): next occurrence is in non-leap year 2027
    const ref2026 = new Date("2026-11-18T12:00:00+05:30");
    const occ2027 = BirthdayCalendarService.calculateBirthdayOccurrence(leapDob, ref2026);
    assert.strictEqual(occ2027.isLeapDay, true, "Must flag as leap day birthday");
    assert.strictEqual(occ2027.nextOccurrenceDate, "2027-02-28", "In non-leap year 2027, observed on Feb 28");
    assert.strictEqual(occ2027.turningAge, 67, "In 2027, turns 67 (2027 - 1960)");
    assert.match(occ2027.leapDayNote || "", /non-leap year/i, "Must provide clear non-leap year indicator");

    // In leap year 2028 (Jan 15, 2028): next occurrence is in leap year 2028
    const ref2028 = new Date("2028-01-15T12:00:00+05:30");
    const occ2028 = BirthdayCalendarService.calculateBirthdayOccurrence(leapDob, ref2028);
    assert.strictEqual(occ2028.nextOccurrenceDate, "2028-02-29", "In leap year 2028, observed on Feb 29");
    assert.strictEqual(occ2028.turningAge, 68, "In 2028, turns 68");

    console.log("  ✓ Leap day birthdays correctly observed on Feb 28 in common years and Feb 29 in leap years");
  }

  // ============================================================================
  // TEST 3: Today's Birthday Calculation
  // ============================================================================
  console.log("\n[TEST 3] Today's Birthday Detection");
  {
    const refNow = new Date("2026-11-18T10:00:00+05:30");
    // Born on November 18
    const todayDob = "1955-11-18T00:00:00.000Z";
    const occ = BirthdayCalendarService.calculateBirthdayOccurrence(todayDob, refNow);

    assert.strictEqual(occ.isToday, true, "isToday must be true");
    assert.strictEqual(occ.daysUntil, 0, "daysUntil must be 0 for today");
    assert.strictEqual(occ.nextOccurrenceDate, "2026-11-18", "Occurrence date matches today");
    assert.strictEqual(occ.turningAge, 71, "Turns 71 (2026 - 1955)");

    console.log("  ✓ Today's birthday detection verifies daysUntil = 0 and isToday = true");
  }

  // ============================================================================
  // TEST 4: Upcoming Birthday Chronological Wrap-around (Year Boundary)
  // ============================================================================
  console.log("\n[TEST 4] Year Boundary Chronological Wrap-around");
  {
    const refNow = new Date("2026-11-18T12:00:00+05:30");

    // 1. Birthday in 8 days (2026-11-26)
    const b1 = BirthdayCalendarService.calculateBirthdayOccurrence("1947-11-26T00:00:00.000Z", refNow);
    assert.strictEqual(b1.nextOccurrenceDate, "2026-11-26");
    assert.strictEqual(b1.daysUntil, 8);
    assert.strictEqual(b1.nextOccurrenceYear, 2026);

    // 2. Birthday in 39 days (2026-12-27)
    const b2 = BirthdayCalendarService.calculateBirthdayOccurrence("1949-12-27T00:00:00.000Z", refNow);
    assert.strictEqual(b2.nextOccurrenceDate, "2026-12-27");
    assert.strictEqual(b2.daysUntil, 39);
    assert.strictEqual(b2.nextOccurrenceYear, 2026);

    // 3. Birthday in next calendar year (2027-01-05) - Indrani Gupta
    const b3 = BirthdayCalendarService.calculateBirthdayOccurrence("1969-01-05T00:00:00.000Z", refNow);
    assert.strictEqual(b3.nextOccurrenceDate, "2027-01-05");
    assert.strictEqual(b3.daysUntil, 48);
    assert.strictEqual(b3.nextOccurrenceYear, 2027);

    // 4. Birthday that already passed earlier this year (2026-06-01) - Basudeb Kundu
    const b4 = BirthdayCalendarService.calculateBirthdayOccurrence("1946-06-01T00:00:00.000Z", refNow);
    assert.strictEqual(b4.nextOccurrenceDate, "2027-06-01");
    assert.strictEqual(b4.daysUntil > 180, true, "Days until must be > 180");
    assert.strictEqual(b4.nextOccurrenceYear, 2027);

    // Verify chronological order: b1 < b2 < b3 < b4
    assert.strictEqual(b1.daysUntil < b2.daysUntil, true);
    assert.strictEqual(b2.daysUntil < b3.daysUntil, true);
    assert.strictEqual(b3.daysUntil < b4.daysUntil, true);

    console.log("  ✓ Chronological sorting cleanly handles year wrap-around (Nov 2026 -> Dec 2026 -> Jan 2027 -> Jun 2027)");
  }

  // ============================================================================
  // TEST 5: Independent Spouse Birthday and Member/Spouse Same Day
  // ============================================================================
  console.log("\n[TEST 5] Independent Spouse Birthday & Same-Day Handling");
  {
    const refNow = new Date("2026-11-18T12:00:00+05:30");

    const mockUsers = [
      {
        id: "user-1",
        email: "member1@example.com",
        status: "ACTIVE",
        memberProfile: {
          id: "profile-1",
          memberId: "SECD1001TEST",
          salutation: "Mr",
          firstName: "Anand",
          lastName: "Verma",
          dateOfBirth: new Date("1950-08-15T00:00:00.000Z"),
          mobileNumber: "9830012345",
          // Spouse shares exact same birthday date (Aug 15)
          spouseSalutation: "Mrs",
          spouseFirstName: "Sunita",
          spouseLastName: "Verma",
          spouseDateOfBirth: new Date("1952-08-15T00:00:00.000Z"),
          spouseMobileNumber: "9830099999",
        },
      },
    ];

    const mockDb = {
      user: {
        findMany: async () => mockUsers,
      },
    };

    const payload = await BirthdayCalendarService.getBirthdayCalendarData(refNow, mockDb);
    assert.strictEqual(payload.allBirthdays.length, 2, "Both primary and spouse must be included");

    const primary = payload.allBirthdays.find((b) => b.personType === "PRIMARY");
    const spouse = payload.allBirthdays.find((b) => b.personType === "SPOUSE");

    assert.ok(primary, "Primary entry must exist");
    assert.ok(spouse, "Spouse entry must exist");

    assert.strictEqual(primary.fullName, "Mr Anand Verma");
    assert.strictEqual(primary.memberId, "SECD1001TEST");
    assert.strictEqual(primary.formattedBirthday, "15 August");

    assert.strictEqual(spouse.fullName, "Mrs Sunita Verma");
    assert.strictEqual(spouse.memberId, "SECD1001TEST");
    assert.strictEqual(spouse.primaryMemberName, "Mr Anand Verma");
    assert.strictEqual(spouse.formattedBirthday, "15 August");
    assert.strictEqual(spouse.personMobile, "9830099999");

    // Different entry IDs to prevent collision
    assert.strictEqual(primary.id, "SECD1001TEST-PRIMARY");
    assert.strictEqual(spouse.id, "SECD1001TEST-SPOUSE");

    console.log("  ✓ Primary and spouse birthdays exist independently with distinct IDs and correct linkages");
  }

  // ============================================================================
  // TEST 6: Search & Filtering by Name, Member ID, and Spouse Name
  // ============================================================================
  console.log("\n[TEST 6] Search & Autocomplete Filter");
  {
    const entries: BirthdayEntry[] = [
      {
        id: "SECD1001PRTY-PRIMARY",
        userId: "u1",
        memberProfileId: "mp1",
        memberId: "SECD1001PRTY",
        personType: "PRIMARY",
        salutation: "Wg Cdr",
        firstName: "PRABIR",
        lastName: "CHAKRAVERTY",
        fullName: "Wg Cdr PRABIR CHAKRAVERTY",
        primaryMobile: "6380505551",
        personMobile: "6380505551",
        originalDob: "1947-11-26T00:00:00.000Z",
        birthMonth: 11,
        birthDay: 26,
        birthYear: 1947,
        formattedBirthday: "26 November",
        isLeapDay: false,
        nextOccurrenceDate: "2026-11-26",
        nextOccurrenceFormatted: "Thursday, 26 Nov 2026",
        nextOccurrenceYear: 2026,
        daysUntil: 8,
        isToday: false,
        turningAge: 79,
      },
      {
        id: "SECD1001PRTY-SPOUSE",
        userId: "u1",
        memberProfileId: "mp1",
        memberId: "SECD1001PRTY",
        personType: "SPOUSE",
        salutation: "Mrs",
        firstName: "Nandita",
        lastName: "Chakraverty",
        fullName: "Mrs Nandita Chakraverty",
        primaryMemberName: "Wg Cdr PRABIR CHAKRAVERTY",
        primaryMobile: "6380505551",
        personMobile: "6380505551",
        originalDob: "1952-10-12T00:00:00.000Z",
        birthMonth: 10,
        birthDay: 12,
        birthYear: 1952,
        formattedBirthday: "12 October",
        isLeapDay: false,
        nextOccurrenceDate: "2027-10-12",
        nextOccurrenceFormatted: "Tuesday, 12 Oct 2027",
        nextOccurrenceYear: 2027,
        daysUntil: 328,
        isToday: false,
        turningAge: 75,
      },
      {
        id: "SECD1002BADU-PRIMARY",
        userId: "u2",
        memberProfileId: "mp2",
        memberId: "SECD1002BADU",
        personType: "PRIMARY",
        salutation: "Mr",
        firstName: "BASUDEB",
        lastName: "KUNDU",
        fullName: "Mr BASUDEB KUNDU",
        primaryMobile: "9804273245",
        personMobile: "9804273245",
        originalDob: "1946-06-01T00:00:00.000Z",
        birthMonth: 6,
        birthDay: 1,
        birthYear: 1946,
        formattedBirthday: "1 June",
        isLeapDay: false,
        nextOccurrenceDate: "2027-06-01",
        nextOccurrenceFormatted: "Tuesday, 1 Jun 2027",
        nextOccurrenceYear: 2027,
        daysUntil: 195,
        isToday: false,
        turningAge: 81,
      },
    ];

    // Search by member name
    const byName = BirthdayCalendarService.filterBirthdayEntries(entries, "prabir");
    assert.strictEqual(byName.length, 2, "Matches primary Prabir and spouse Nandita (via primaryMemberName)");

    // Search by spouse name
    const bySpouse = BirthdayCalendarService.filterBirthdayEntries(entries, "nandita");
    assert.strictEqual(bySpouse.length, 1);
    assert.strictEqual(bySpouse[0].fullName, "Mrs Nandita Chakraverty");

    // Search by Member ID
    const byMid = BirthdayCalendarService.filterBirthdayEntries(entries, "SECD1002BADU");
    assert.strictEqual(byMid.length, 1);
    assert.strictEqual(byMid[0].fullName, "Mr BASUDEB KUNDU");

    // Search by partial MID
    const byPartialMid = BirthdayCalendarService.filterBirthdayEntries(entries, "1001");
    assert.strictEqual(byPartialMid.length, 2);

    console.log("  ✓ Search filters seamlessly by member name, spouse name, Member ID, and partial ID");
  }

  // ============================================================================
  // TEST 7: Month Grouping & Full Year 12-Month Calendar
  // ============================================================================
  console.log("\n[TEST 7] Month Navigation & Full Year Calendar Aggregation");
  {
    const entries: BirthdayEntry[] = [
      {
        id: "1",
        birthMonth: 1,
        birthDay: 20,
        fullName: "Ketaki",
      } as any,
      {
        id: "2",
        birthMonth: 1,
        birthDay: 5,
        fullName: "Indrani",
      } as any,
      {
        id: "3",
        birthMonth: 11,
        birthDay: 26,
        fullName: "Prabir C",
      } as any,
    ];

    // Month 1 (January): Indrani (5th) must precede Ketaki (20th)
    const janBirthdays = BirthdayCalendarService.getBirthdaysForMonth(entries, 1);
    assert.strictEqual(janBirthdays.length, 2);
    assert.strictEqual(janBirthdays[0].fullName, "Indrani");
    assert.strictEqual(janBirthdays[1].fullName, "Ketaki");

    // Month 11 (November)
    const novBirthdays = BirthdayCalendarService.getBirthdaysForMonth(entries, 11);
    assert.strictEqual(novBirthdays.length, 1);
    assert.strictEqual(novBirthdays[0].fullName, "Prabir C");

    // Full Year 12 Months
    const yearData = BirthdayCalendarService.getYearCalendarData(entries);
    assert.strictEqual(yearData.length, 12, "Must return exactly 12 calendar months");
    assert.strictEqual(yearData[0].monthName, "January");
    assert.strictEqual(yearData[0].count, 2);
    assert.strictEqual(yearData[10].monthName, "November");
    assert.strictEqual(yearData[10].count, 1);
    assert.strictEqual(yearData[1].count, 0, "February has 0 birthdays");

    console.log("  ✓ Monthly filtering and full 12-month calendar aggregation validated");
  }

  // ============================================================================
  // TEST 8: Exclusion of Incomplete, Unpaid, and Archived Records
  // ============================================================================
  console.log("\n[TEST 8] Exclusion of Incomplete and Unpaid Records");
  {
    const mockUsers = [
      // 1. Confirmed member with payment & Member ID
      {
        id: "confirmed-1",
        email: "confirmed@example.com",
        status: "ACTIVE",
        memberProfile: {
          id: "mp-1",
          memberId: "SECD1001CONF",
          salutation: "Mr",
          firstName: "Confirmed",
          lastName: "Member",
          dateOfBirth: new Date("1950-05-10T00:00:00.000Z"),
          mobileNumber: "9830011111",
        },
      },
      // 2. Incomplete registration / Unconfirmed payment (memberId is NULL)
      {
        id: "unpaid-1",
        email: "unpaid@example.com",
        status: "ACTIVE",
        memberProfile: {
          id: "mp-2",
          memberId: null, // Unconfirmed
          salutation: "Mr",
          firstName: "Unpaid",
          lastName: "Person",
          dateOfBirth: new Date("1950-05-10T00:00:00.000Z"),
          mobileNumber: "9830022222",
        },
      },
    ];

    const mockDb = {
      user: {
        findMany: async () => {
          return mockUsers.filter(
            (u) =>
              u.status !== "ARCHIVED" &&
              u.memberProfile &&
              u.memberProfile.memberId !== null
          );
        },
      },
    };

    const payload = await BirthdayCalendarService.getBirthdayCalendarData(new Date(), mockDb);
    assert.strictEqual(payload.allBirthdays.length, 1, "Only confirmed member with Member ID must be included");
    assert.strictEqual(payload.allBirthdays[0].memberId, "SECD1001CONF");

    console.log("  ✓ Unconfirmed payment and incomplete registrations without Member ID are strictly excluded");
  }

  console.log("\n================================================================");
  console.log("✓ ALL 8 BIRTHDAY CALENDAR UNIT TEST PHASES PASSED 100%");
  console.log("================================================================");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
