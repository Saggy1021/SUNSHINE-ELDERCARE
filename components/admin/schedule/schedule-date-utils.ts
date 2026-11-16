/**
 * Timezone-aware date utilities for Sunshine Eldercare Visit Schedule
 * Pinned to Asia/Kolkata (IST) to ensure deterministic rendering and no hydration mismatch.
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

export function formatDateKey(dateInput: Date | string): string {
  const { year, month, day } = getKolkataDateParts(dateInput);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatTimeIST(dateInput: Date | string): string {
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return "—";
  }
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
 * Returns the month range display string
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
