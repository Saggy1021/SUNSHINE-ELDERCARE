import { db } from "@/lib/db";
import { EXCLUDED_MEMBER_EMAILS, ADMIN_DISPLAY_EMAILS } from "@/lib/constants/members";

export type BirthdayPersonType = "PRIMARY" | "SPOUSE";

export interface BirthdayEntry {
  id: string; // Unique deterministic entry ID: `${memberId}-PRIMARY` or `${memberId}-SPOUSE`
  userId: string; // User ID for linking to /admin/members/[userId]
  memberProfileId: string;
  memberId: string; // Canonical Member ID e.g. "SECD1001PRTY"
  personType: BirthdayPersonType;

  // Name Details
  salutation: string | null;
  firstName: string;
  lastName: string;
  fullName: string; // e.g. "Wg Cdr PRABIR CHAKRAVERTY"

  // Primary Member Details if this entry is a spouse
  primaryMemberName?: string;
  primaryMemberSalutation?: string | null;

  // Contact
  primaryMobile: string | null; // Primary member mobile
  personMobile: string | null; // Direct contact mobile (spouse or primary)

  // Stored DOB & Extracted Parts in Asia/Kolkata
  originalDob: string; // ISO date string
  birthMonth: number; // 1 - 12
  birthDay: number; // 1 - 31
  birthYear: number; // Original birth year e.g. 1947
  formattedBirthday: string; // e.g. "26 November"
  isLeapDay: boolean; // True if born on Feb 29

  // Annual Recurrence Calculation (dynamically computed relative to reference date in Asia/Kolkata)
  nextOccurrenceDate: string; // YYYY-MM-DD
  nextOccurrenceFormatted: string; // e.g. "Thursday, 26 Nov 2026"
  nextOccurrenceYear: number;
  daysUntil: number; // 0 for today, 1..365 for upcoming
  isToday: boolean;
  turningAge: number | null; // Age on next occurrence, or null if birthYear unavailable
  leapDayNote?: string; // Informative note for Feb 29 birthdays in non-leap years
}

export interface BirthdayStats {
  totalConfirmedMembersWithDob: number;
  todayCount: number;
  thisMonthCount: number;
  upcoming30DaysCount: number;
}

export interface BirthdayCalendarPayload {
  referenceDate: string; // YYYY-MM-DD in Asia/Kolkata
  referenceYear: number;
  referenceMonth: number; // 1-12
  referenceDay: number;
  stats: BirthdayStats;
  todayBirthdays: BirthdayEntry[];
  upcomingBirthdays: BirthdayEntry[]; // Chronologically ordered by daysUntil ascending
  allBirthdays: BirthdayEntry[]; // All confirmed member & spouse birthdays
}

export interface YearCalendarMonth {
  month: number; // 1-12
  monthName: string; // "January", "February", etc.
  birthdays: BirthdayEntry[];
  count: number;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export class BirthdayCalendarService {
  /**
   * Checks if a year is a leap year in the Gregorian calendar.
   */
  static isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  /**
   * Extracts { day, month, year } strictly in Asia/Kolkata timezone.
   */
  static getKolkataDateParts(dateInput: Date | string): {
    day: number;
    month: number;
    year: number;
  } {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) {
      throw new Error(`Invalid date supplied to getKolkataDateParts: ${dateInput}`);
    }

    const formatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });

    const parts = formatter.formatToParts(d);
    const day = parseInt(parts.find((p) => p.type === "day")!.value, 10);
    const month = parseInt(parts.find((p) => p.type === "month")!.value, 10);
    const year = parseInt(parts.find((p) => p.type === "year")!.value, 10);

    return { day, month, year };
  }

  /**
   * Calculates the next annual birthday occurrence and days until birthday
   * relative to a reference date in Asia/Kolkata.
   *
   * Recurrence Rules:
   * 1. Annual recurrence: calculated dynamically from the original DOB.
   * 2. Leap Day (29 February):
   *    - In a leap year (e.g. 2028): observed on 29 February.
   *    - In a non-leap year (e.g. 2026, 2027): observed on 28 February (end of February),
   *      accompanied by an informative indicator.
   * 3. Chronological wrap-around:
   *    - If birthday already passed in current year, next occurrence is in current year + 1.
   *    - Days until accounts for calendar differences across the New Year boundary.
   */
  static calculateBirthdayOccurrence(
    dobInput: Date | string,
    refDateInput?: Date | string
  ): {
    birthDay: number;
    birthMonth: number;
    birthYear: number;
    formattedBirthday: string;
    isLeapDay: boolean;
    nextOccurrenceDate: string;
    nextOccurrenceFormatted: string;
    nextOccurrenceYear: number;
    daysUntil: number;
    isToday: boolean;
    turningAge: number | null;
    leapDayNote?: string;
  } {
    const bParts = this.getKolkataDateParts(dobInput);
    const bDay = bParts.day;
    const bMonth = bParts.month;
    const bYear = bParts.year;

    const refParts = refDateInput
      ? this.getKolkataDateParts(refDateInput)
      : this.getKolkataDateParts(new Date());
    const refDay = refParts.day;
    const refMonth = refParts.month;
    const refYear = refParts.year;

    const isLeapDay = bMonth === 2 && bDay === 29;

    // Determine target day for reference year
    let targetYear = refYear;
    let targetDay = isLeapDay
      ? this.isLeapYear(targetYear)
        ? 29
        : 28
      : bDay;

    // Has birthday already passed this year?
    const hasPassedThisYear =
      bMonth < refMonth || (bMonth === refMonth && targetDay < refDay);

    if (hasPassedThisYear) {
      targetYear = refYear + 1;
      targetDay = isLeapDay
        ? this.isLeapYear(targetYear)
          ? 29
          : 28
        : bDay;
    }

    // Days difference using UTC midnight day stamps to eliminate DST/clock jitter
    const refUtcZero = Date.UTC(refYear, refMonth - 1, refDay);
    const targetUtcZero = Date.UTC(targetYear, bMonth - 1, targetDay);
    const daysUntil = Math.round(
      (targetUtcZero - refUtcZero) / (1000 * 60 * 60 * 24)
    );

    const isToday = daysUntil === 0;
    const turningAge = bYear > 0 ? targetYear - bYear : null;

    const monthName = MONTH_NAMES[bMonth - 1];
    const formattedBirthday = `${bDay} ${monthName}`;

    // Target occurrence date string YYYY-MM-DD
    const nextOccurrenceDate = `${targetYear}-${String(bMonth).padStart(
      2,
      "0"
    )}-${String(targetDay).padStart(2, "0")}`;

    // Weekday calculation for the occurrence date
    const occDateObj = new Date(
      Date.UTC(targetYear, bMonth - 1, targetDay, 12, 0, 0)
    );
    const weekdayName = WEEKDAY_NAMES[occDateObj.getUTCDay()];
    const nextOccurrenceFormatted = `${weekdayName}, ${targetDay} ${monthName.slice(
      0,
      3
    )} ${targetYear}`;

    let leapDayNote: string | undefined;
    if (isLeapDay) {
      if (this.isLeapYear(targetYear)) {
        leapDayNote = "Leap Day Birthday (29 February)";
      } else {
        leapDayNote = "Leap Day Birthday (Observed 28 February in non-leap year)";
      }
    }

    return {
      birthDay: bDay,
      birthMonth: bMonth,
      birthYear: bYear,
      formattedBirthday,
      isLeapDay,
      nextOccurrenceDate,
      nextOccurrenceFormatted,
      nextOccurrenceYear: targetYear,
      daysUntil,
      isToday,
      turningAge,
      leapDayNote,
    };
  }

  /**
   * Authoritative query and dynamic processing for all confirmed member & spouse birthdays.
   *
   * Eligibility Criteria:
   * 1. Confirmed Member: Canonical Member ID is generated (`memberProfile.memberId IS NOT NULL`).
   * 2. Excluded: Incomplete registrations, unconfirmed payment records, archived users,
   *    and internal admin test accounts.
   * 3. Authoritative Source: Existing MemberProfile and spouse records.
   * 4. Independence: Does NOT depend on CareVisit, CareCase, employee assignment or booking status.
   */
  static async getBirthdayCalendarData(
    referenceDateInput?: Date | string,
    database: any = db
  ): Promise<BirthdayCalendarPayload> {
    const referenceDate = referenceDateInput
      ? typeof referenceDateInput === "string"
        ? new Date(referenceDateInput)
        : referenceDateInput
      : new Date();

    const refParts = this.getKolkataDateParts(referenceDate);
    const refDateString = `${refParts.year}-${String(refParts.month).padStart(
      2,
      "0"
    )}-${String(refParts.day).padStart(2, "0")}`;

    // Query confirmed members from database
    const users = await database.user.findMany({
      where: {
        status: { not: "ARCHIVED" },
        email: { notIn: [...EXCLUDED_MEMBER_EMAILS, ...ADMIN_DISPLAY_EMAILS] },
        memberProfile: {
          memberId: { not: null },
          OR: [
            { dateOfBirth: { not: null } },
            { spouseDateOfBirth: { not: null } },
          ],
        },
      },
      select: {
        id: true,
        email: true,
        status: true,
        memberProfile: {
          select: {
            id: true,
            memberId: true,
            salutation: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            mobileNumber: true,
            spouseSalutation: true,
            spouseFirstName: true,
            spouseLastName: true,
            spouseDateOfBirth: true,
            spouseMobileNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const allBirthdays: BirthdayEntry[] = [];

    for (const u of users) {
      const p = u.memberProfile;
      if (!p || !p.memberId) continue;

      const primaryMemberId = p.memberId.trim().toUpperCase();
      const primaryFullName = [p.salutation, p.firstName, p.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();

      // 1. Primary Member Birthday
      if (p.dateOfBirth) {
        const occ = this.calculateBirthdayOccurrence(
          p.dateOfBirth,
          referenceDate
        );
        allBirthdays.push({
          id: `${primaryMemberId}-PRIMARY`,
          userId: u.id,
          memberProfileId: p.id,
          memberId: primaryMemberId,
          personType: "PRIMARY",
          salutation: p.salutation || null,
          firstName: p.firstName,
          lastName: p.lastName,
          fullName: primaryFullName,
          primaryMobile: p.mobileNumber || null,
          personMobile: p.mobileNumber || null,
          originalDob: p.dateOfBirth.toISOString(),
          birthMonth: occ.birthMonth,
          birthDay: occ.birthDay,
          birthYear: occ.birthYear,
          formattedBirthday: occ.formattedBirthday,
          isLeapDay: occ.isLeapDay,
          nextOccurrenceDate: occ.nextOccurrenceDate,
          nextOccurrenceFormatted: occ.nextOccurrenceFormatted,
          nextOccurrenceYear: occ.nextOccurrenceYear,
          daysUntil: occ.daysUntil,
          isToday: occ.isToday,
          turningAge: occ.turningAge,
          leapDayNote: occ.leapDayNote,
        });
      }

      // 2. Spouse Birthday (independent entry linked to Primary Member ID)
      if (p.spouseDateOfBirth && (p.spouseFirstName || p.spouseLastName)) {
        const occ = this.calculateBirthdayOccurrence(
          p.spouseDateOfBirth,
          referenceDate
        );
        const spouseFullName = [
          p.spouseSalutation,
          p.spouseFirstName,
          p.spouseLastName,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();

        allBirthdays.push({
          id: `${primaryMemberId}-SPOUSE`,
          userId: u.id,
          memberProfileId: p.id,
          memberId: primaryMemberId,
          personType: "SPOUSE",
          salutation: p.spouseSalutation || null,
          firstName: p.spouseFirstName || "",
          lastName: p.spouseLastName || "",
          fullName: spouseFullName,
          primaryMemberName: primaryFullName,
          primaryMemberSalutation: p.salutation || null,
          primaryMobile: p.mobileNumber || null,
          personMobile: p.spouseMobileNumber || p.mobileNumber || null,
          originalDob: p.spouseDateOfBirth.toISOString(),
          birthMonth: occ.birthMonth,
          birthDay: occ.birthDay,
          birthYear: occ.birthYear,
          formattedBirthday: occ.formattedBirthday,
          isLeapDay: occ.isLeapDay,
          nextOccurrenceDate: occ.nextOccurrenceDate,
          nextOccurrenceFormatted: occ.nextOccurrenceFormatted,
          nextOccurrenceYear: occ.nextOccurrenceYear,
          daysUntil: occ.daysUntil,
          isToday: occ.isToday,
          turningAge: occ.turningAge,
          leapDayNote: occ.leapDayNote,
        });
      }
    }

    // Filter today's birthdays
    const todayBirthdays = allBirthdays.filter((b) => b.isToday);

    // Sort upcoming birthdays in chronological order by daysUntil ascending
    // (covers birthdays crossing into next calendar year)
    const upcomingBirthdays = [...allBirthdays].sort((a, b) => {
      if (a.daysUntil !== b.daysUntil) {
        return a.daysUntil - b.daysUntil;
      }
      return a.fullName.localeCompare(b.fullName);
    });

    // Calculate quick stats
    const thisMonthBirthdays = allBirthdays.filter(
      (b) => b.birthMonth === refParts.month
    );
    const upcoming30DaysBirthdays = allBirthdays.filter(
      (b) => b.daysUntil >= 0 && b.daysUntil <= 30
    );

    const stats: BirthdayStats = {
      totalConfirmedMembersWithDob: allBirthdays.length,
      todayCount: todayBirthdays.length,
      thisMonthCount: thisMonthBirthdays.length,
      upcoming30DaysCount: upcoming30DaysBirthdays.length,
    };

    return {
      referenceDate: refDateString,
      referenceYear: refParts.year,
      referenceMonth: refParts.month,
      referenceDay: refParts.day,
      stats,
      todayBirthdays,
      upcomingBirthdays,
      allBirthdays,
    };
  }

  /**
   * Search birthdays across member name, Member ID, and spouse name.
   */
  static filterBirthdayEntries(
    entries: BirthdayEntry[],
    rawQuery: string
  ): BirthdayEntry[] {
    const q = rawQuery.trim().toLowerCase();
    if (!q) return entries;

    const unslashedQ = q.replace(/[\/\s-]/g, "");

    return entries.filter((entry) => {
      const matchName = entry.fullName.toLowerCase().includes(q);
      const matchPrimaryName = entry.primaryMemberName
        ? entry.primaryMemberName.toLowerCase().includes(q)
        : false;
      const matchMemberId =
        entry.memberId.toLowerCase().includes(q) ||
        entry.memberId.replace(/[\/\s-]/g, "").toLowerCase().includes(unslashedQ);
      const matchMobile =
        (entry.personMobile && entry.personMobile.includes(q)) ||
        (entry.primaryMobile && entry.primaryMobile.includes(q));

      return matchName || matchPrimaryName || matchMemberId || matchMobile;
    });
  }

  /**
   * Returns all birthdays for a specific month (1-12), ordered by day of the month.
   */
  static getBirthdaysForMonth(
    entries: BirthdayEntry[],
    month: number
  ): BirthdayEntry[] {
    return entries
      .filter((b) => b.birthMonth === month)
      .sort((a, b) => {
        if (a.birthDay !== b.birthDay) {
          return a.birthDay - b.birthDay;
        }
        return a.fullName.localeCompare(b.fullName);
      });
  }

  /**
   * Groups all birthdays across the 12 months for the full-year view.
   */
  static getYearCalendarData(
    entries: BirthdayEntry[]
  ): YearCalendarMonth[] {
    return MONTH_NAMES.map((name, idx) => {
      const monthNum = idx + 1;
      const birthdays = this.getBirthdaysForMonth(entries, monthNum);
      return {
        month: monthNum,
        monthName: name,
        birthdays,
        count: birthdays.length,
      };
    });
  }
}
