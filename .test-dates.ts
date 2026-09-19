import { calculateEndDate } from './lib/services/dates';

function testDate(start: string, months: number, expected: string) {
  const s = new Date(start + 'T00:00:00Z');
  const e = calculateEndDate(s, months);
  const eStr = e.toISOString().split('T')[0];
  if (eStr !== expected) {
    console.error(`FAILED: ${start} + ${months}m => Expected ${expected}, got ${eStr}`);
  } else {
    console.log(`PASSED: ${start} + ${months}m => ${eStr}`);
  }
}

console.log('--- Dates Test ---');
testDate('2026-10-01', 1, '2026-10-31');
testDate('2026-10-01', 3, '2026-12-31');
testDate('2026-10-01', 6, '2027-03-31');
testDate('2026-10-01', 12, '2027-09-30');

testDate('2026-10-15', 1, '2026-11-14');
testDate('2026-10-15', 3, '2027-01-14');
testDate('2026-10-15', 6, '2027-04-14');
testDate('2026-10-15', 12, '2027-10-14');

testDate('2026-01-29', 1, '2026-02-27');
testDate('2026-01-30', 1, '2026-02-27');
testDate('2026-01-31', 1, '2026-02-27');
testDate('2024-01-31', 1, '2024-02-28');
