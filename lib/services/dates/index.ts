/**
 * Centralized Date Calculation Service for Memberships
 */

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
