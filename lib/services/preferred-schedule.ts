/**
 * Preferred Care Visit Schedule Utilities
 * Handles timezone-safe normalization, formatting, and translation between
 * 12-hour AM/PM presentation and 24-hour input values.
 */

export const PREFERRED_VISIT_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type PreferredVisitDay = (typeof PREFERRED_VISIT_DAYS)[number];

const DAY_ABBREVIATIONS: Record<string, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

/**
 * Normalizes any time string (e.g. "10:30", "16:30", "4:30 PM", "10:30 AM")
 * into a canonical 12-hour AM/PM string (e.g. "10:30 AM", "4:30 PM").
 */
export function normalize12HourTime(timeStr?: string | null): string | null {
  if (!timeStr || !timeStr.trim()) return null;
  const raw = timeStr.trim();

  // Check if it already matches 12-hour format e.g. "10:30 AM", "4:30 PM", "04:30 PM"
  const match12 = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
  if (match12) {
    const hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const period = match12[3].toUpperCase();
    if (hours >= 1 && hours <= 12) {
      return `${hours}:${minutes} ${period}`;
    }
  }

  // Check if it matches 24-hour format e.g. "10:30", "16:30", "04:30"
  const match24 = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = match24[2];
    if (hours >= 0 && hours <= 23) {
      const period = hours >= 12 ? "PM" : "AM";
      const hours12 = hours % 12 || 12;
      return `${hours12}:${minutes} ${period}`;
    }
  }

  return raw;
}

/**
 * Converts a 12-hour or 24-hour time string into a standard 24-hour "HH:mm"
 * string suitable for HTML <input type="time"> value.
 */
export function to24HourTime(timeStr?: string | null): string {
  if (!timeStr || !timeStr.trim()) return "";
  const raw = timeStr.trim();

  // Already 24-hour format "HH:mm"
  const match24 = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = match24[2];
    if (hours >= 0 && hours <= 23) {
      return `${String(hours).padStart(2, "0")}:${minutes}`;
    }
  }

  // 12-hour format "h:mm AM/PM" or "hh:mm AM/PM"
  const match12 = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const period = match12[3].toUpperCase();
    if (hours >= 1 && hours <= 12) {
      if (period === "PM" && hours < 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;
      return `${String(hours).padStart(2, "0")}:${minutes}`;
    }
  }

  return "";
}

/**
 * Formats preferred weekly schedule into table/card display:
 * - Wednesday, 10:30 AM -> "Wed · 10:30 AM"
 * - Thursday, 11:00 AM -> "Thu · 11:00 AM"
 * - Monday, 4:30 PM -> "Mon · 4:30 PM"
 * - If only day: "Wed"
 * - If only time: "10:30 AM"
 * - If neither: "—"
 */
export function formatPreferredSchedule(day?: string | null, time?: string | null): string {
  const d = day?.trim();
  const normalizedTime = normalize12HourTime(time);

  const abbr = d ? (DAY_ABBREVIATIONS[d] || (d.length > 3 ? d.slice(0, 3) : d)) : null;

  if (abbr && normalizedTime) {
    return `${abbr} · ${normalizedTime}`;
  }
  if (abbr) {
    return abbr;
  }
  if (normalizedTime) {
    return normalizedTime;
  }
  return "—";
}
