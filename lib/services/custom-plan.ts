import { db } from "../db";

export class CustomPlanService {
  static calculateEndDate(startDate: Date, type: string, value: number): Date {
    const end = new Date(startDate);
    if (type === 'DAYS') {
      end.setDate(end.getDate() + value);
    } else if (type === 'MONTHS') {
      end.setMonth(end.getMonth() + value);
    } else if (type === 'YEARS') {
      end.setFullYear(end.getFullYear() + value);
    }
    return end;
  }
}
