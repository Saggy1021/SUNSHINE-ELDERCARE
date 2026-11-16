/**
 * Timezone-aware date utilities for Sunshine Eldercare Visit Schedule
 * Strictly pinned to Asia/Kolkata (IST, UTC+05:30) with no Daylight Saving Time (DST).
 *
 * Ensures deterministic rendering, eliminates hydration mismatches, and guarantees
 * that user-entered IST dates/times are accurately converted to UTC for database storage
 * and formatted back to IST for all views and inputs.
 */

export function getKolkataDateParts(dateInput: Date | string) {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  return {
    year: parseInt(partMap.year, 10),
    month: parseInt(partMap.month, 10),
    day: parseInt(partMap.day, 10),
    hour: parseInt(partMap.hour, 10),
    minute: parseInt(partMap.minute, 10),
  };
}

/**
 * Returns YYYY-MM-DD in Asia/Kolkata timezone
 */
export function formatDateKey(dateInput: Date | string): string {
  const { year, month, day } = getKolkataDateParts(dateInput);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Formats a Date/ISO string to human-readable IST time, e.g. "1:00 pm", "11:30 am"
 */
export function formatTimeIST(dateInput: Date | string): string {
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d).toLowerCase();
  } catch {
    return "—";
  }
}

/**
 * Formats a Date/ISO string to 24-hour HH:mm in Asia/Kolkata for HTML5 <input type="time">
 * e.g. "13:00", "09:30"
 */
export function formatTimeInputIST(dateInput: Date | string): string {
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return "10:00";
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const hour = parts.find((p) => p.type === "hour")?.value || "00";
    const minute = parts.find((p) => p.type === "minute")?.value || "00";
    const hNum = parseInt(hour, 10) % 24;
    return `${String(hNum).padStart(2, "0")}:${minute}`;
  } catch {
    return "10:00";
  }
}

/**
 * Parses user input date (YYYY-MM-DD) and time (HH:mm in 24h or 12h) entered as IST,
 * returning the corresponding UTC Date object for database storage.
 *
 * Supports:
 *   parseISTDateTimeToUTC("2026-11-17", "13:00") -> 2026-11-17T07:30:00.000Z
 *   parseISTDateTimeToUTC("2026-11-17", "09:30 AM") -> 2026-11-17T04:00:00.000Z
 *   parseISTDateTimeToUTC("2026-11-17T09:30:00") -> 2026-11-17T04:00:00.000Z
 *   parseISTDateTimeToUTC("2026-11-17 09:30") -> 2026-11-17T04:00:00.000Z
 *   parseISTDateTimeToUTC("2026-11-17T04:00:00.000Z") -> preserves existing UTC ISO
 *   parseISTDateTimeToUTC("2026-11-17T09:30:00+05:30") -> parses ISO with explicit offset
 */
export function parseISTDateTimeToUTC(dateInput: string, timeInput?: string): Date {
  if (!dateInput || typeof dateInput !== "string") return new Date(NaN);
  const trimmedDate = dateInput.trim();
  if (!trimmedDate) return new Date(NaN);

  // If already an ISO string with explicit timezone offset after T (Z or + or -)
  if (trimmedDate.includes("T")) {
    const afterT = trimmedDate.split("T")[1];
    if (afterT && (afterT.includes("Z") || afterT.includes("+") || afterT.includes("-"))) {
      const parsed = new Date(trimmedDate);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }

  let datePart = trimmedDate;
  let rawTime = (timeInput || "").trim();

  // If timeInput was not passed (or empty), check if dateInput contains both date and time (separated by 'T' or whitespace)
  if (!rawTime) {
    if (trimmedDate.includes("T")) {
      const parts = trimmedDate.split("T");
      datePart = parts[0];
      rawTime = parts[1] || "";
    } else if (trimmedDate.includes(" ")) {
      const firstSpace = trimmedDate.indexOf(" ");
      datePart = trimmedDate.slice(0, firstSpace);
      rawTime = trimmedDate.slice(firstSpace + 1);
    } else {
      rawTime = "00:00";
    }
  }

  rawTime = rawTime.trim();

  // Check for 12-hour AM/PM format (e.g. "09:30 AM", "9:30 am", "1:00 PM")
  const match12 = rawTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)$/i);
  let cleanTime = "";
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const seconds = match12[3] || "00";
    const isPm = match12[4].toLowerCase() === "pm";
    if (isPm && hours < 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;
    cleanTime = `${String(hours).padStart(2, "0")}:${minutes}:${seconds}`;
  } else {
    // 24-hour format: "09:30", "09:30:00", "9:30", "13:00"
    const match24 = rawTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (match24) {
      const h = String(parseInt(match24[1], 10)).padStart(2, "0");
      const m = match24[2];
      const s = match24[3] || "00";
      cleanTime = `${h}:${m}:${s}`;
    } else {
      cleanTime = "00:00:00";
    }
  }

  // Extract clean YYYY-MM-DD
  const cleanDateMatch = datePart.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!cleanDateMatch) {
    return new Date(NaN);
  }
  const cleanDate = `${cleanDateMatch[1]}-${String(cleanDateMatch[2]).padStart(2, "0")}-${String(cleanDateMatch[3]).padStart(2, "0")}`;

  // Strictly append Asia/Kolkata offset (+05:30)
  return new Date(`${cleanDate}T${cleanTime}+05:30`);
}

/**
 * Checks if two time intervals [startA, endA) and [startB, endB) overlap.
 * Returns true if: startA < endB AND endA > startB
 */
export function checkIntervalOverlap(
  startA: Date | string,
  endA: Date | string,
  startB: Date | string,
  endB: Date | string
): boolean {
  const sA = (typeof startA === "string" ? new Date(startA) : startA).getTime();
  const eA = (typeof endA === "string" ? new Date(endA) : endA).getTime();
  const sB = (typeof startB === "string" ? new Date(startB) : startB).getTime();
  const eB = (typeof endB === "string" ? new Date(endB) : endB).getTime();
  return sA < eB && eA > sB;
}

export function formatDateIST(dateInput: Date | string): string {
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return "—";
  }
}

export function formatDayOfWeek(dateInput: Date | string): string {
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
    }).format(d);
  } catch {
    return "";
  }
}

/**
 * Returns Monday to Sunday for the week containing baseDate (in local date reckoning)
 */
export function getWeekDays(baseDate: Date): Date[] {
  const curr = new Date(baseDate.getTime());
  const day = curr.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = day === 0 ? -6 : 1 - day; // Adjust to Monday
  const monday = new Date(curr);
  monday.setDate(curr.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(monday);
    nextDay.setDate(monday.getDate() + i);
    days.push(nextDay);
  }
  return days;
}

/**
 * Returns the month range display string in Asia/Kolkata
 */
export function formatMonthRangeDisplay(baseDate: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "long",
    year: "numeric",
  }).format(baseDate);
}

/**
 * Returns week range display string: e.g. "16 Nov – 22 Nov 2026"
 */
export function formatWeekRangeDisplay(days: Date[]): string {
  if (days.length === 0) return "";
  const first = days[0];
  const last = days[days.length - 1];

  const firstStr = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
  }).format(first);

  const lastStr = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(last);

  return `${firstStr} – ${lastStr}`;
}
