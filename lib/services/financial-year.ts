export class FinancialYearService {
  /**
   * Calculates the Indian Financial Year for a given date.
   * Financial Year runs from April 1 to March 31.
   * Format returned: "2026-27"
   */
  static getFinancialYear(date: Date): string {
    const month = date.getMonth(); // 0-indexed, so 0 is Jan, 3 is Apr
    const year = date.getFullYear();

    let startYear = year;
    if (month < 3) {
      // Jan-Mar belongs to the previous financial year
      startYear = year - 1;
    }

    const nextYearTwoDigits = (startYear + 1).toString().slice(-2);
    return `${startYear}-${nextYearTwoDigits}`;
  }
}
