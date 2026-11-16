export const EXCLUDED_MEMBER_EMAILS = [
  "info.sunshineeldercare@gmail.com",
  "care.test@example.com",
  "payment_user@example.com",
  "memberonboardtest@gmail.com",
];

export const ADMIN_DISPLAY_EMAILS = [
  "tanishalam61@gmail.com",
  "godgoku1021@gmail.com",
];

/**
 * Accounts excluded from Admin Dashboard operational metrics.
 * Excludes:
 * - Primary Owner / admin account (info.sunshineeldercare@gmail.com)
 * - Tanish Alam (tanishalam61@gmail.com)
 * - Sagnik Kar (godgoku1021@gmail.com)
 * - Staff / care coordination test accounts (care.test@example.com)
 */
export const DASHBOARD_EXCLUDED_EMAILS = [
  "info.sunshineeldercare@gmail.com",
  "tanishalam61@gmail.com",
  "godgoku1021@gmail.com",
  "care.test@example.com",
];

/**
 * Designated demo member accounts intentionally created for testing.
 * Included in Total Members count, but not counted as active memberships
 * unless their subscriptions genuinely qualify as active.
 */
export const DEMO_MEMBER_EMAILS = [
  "memberonboardtest@gmail.com",
  "payment_user@example.com",
];

