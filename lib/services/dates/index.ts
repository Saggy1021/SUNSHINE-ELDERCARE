/**
 * Centralized Date Calculation Service for Memberships
 */

/**
 * Calculates the calendar-month anniversary end date for a given start date and duration in months.
 * Follows standard calendar-month arithmetic with month-end and leap-year clamping.
 * 
 * Example:
 * Start date: 16 November 2026, Duration: 1 month -> End date: 16 December 2026
 * Start date: 31 January 2026, Duration: 1 month -> End date: 28 February 2026
 * Start date: 31 January 2024, Duration: 1 month -> End date: 29 February 2024 (leap year)
 */
export function calculateMembershipEndDate(startDate: Date, durationMonths: number): Date {
  const d = new Date(startDate)
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth()
  const day = d.getUTCDate()

  const totalMonths = month + durationMonths
  const targetYear = year + Math.floor(totalMonths / 12)
  const targetMonth = ((totalMonths % 12) + 12) % 12

  // Passing targetMonth + 1 with day 0 in Date.UTC gives the last day of targetMonth
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  const targetDay = Math.min(day, daysInTargetMonth)

  return new Date(Date.UTC(
    targetYear,
    targetMonth,
    targetDay,
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
    d.getUTCMilliseconds()
  ))
}

/**
 * Calculates the inclusive end date for a given start date and duration in months.
 * Rule: Start date + N calendar months - 1 day.
 * 
 * Examples:
 * 01 Oct + 1 month = 31 Oct
 * 15 Oct + 1 month = 14 Nov
 * 
 * Handles month-end clamping (e.g. Jan 31 + 1 month = Feb 28, then -1 day = Feb 27).
 */
export function calculateEndDate(startDate: Date, durationMonths: number): Date {
  // Use UTC to prevent any timezone shifts during calculation
  const result = new Date(Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate(),
    startDate.getUTCHours(),
    startDate.getUTCMinutes(),
    startDate.getUTCSeconds(),
    startDate.getUTCMilliseconds()
  ))

  const targetMonth = result.getUTCMonth() + durationMonths
  const expectedMonth = (targetMonth % 12 + 12) % 12
  
  result.setUTCMonth(targetMonth)

  // Handle JS date overflow (e.g. Jan 31 -> Mar 3)
  if (result.getUTCMonth() !== expectedMonth) {
    // Clamp to the last day of the expected month
    result.setUTCDate(0)
  }

  // Subtract 1 day for inclusive end date
  result.setUTCDate(result.getUTCDate() - 1)

  return result
}
