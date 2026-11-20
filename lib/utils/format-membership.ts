/**
 * Utility for formatting membership plan names consistently across the Sunshine Eldercare Admin Portal.
 *
 * Target format examples:
 * - Life Line Care — Single (3 Months)
 * - Life Line Care — Couple (6 Months)
 * - Life Line Care — Single (6 Months)
 * - Life Line Care — Couple (12 Months)
 */

export function formatVariantType(variantType?: string | null): string | null {
  if (!variantType) return null;
  const trimmed = variantType.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (upper === "SINGLE") return "Single";
  if (upper === "COUPLE") return "Couple";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

export function formatFullMembershipName(
  planName?: string | null,
  variantType?: string | null,
  durationMonths?: number | null
): string {
  const cleanPlan = planName?.trim() || null;
  const variant = formatVariantType(variantType);
  const durationStr =
    durationMonths && durationMonths > 0
      ? `(${durationMonths} Month${durationMonths > 1 ? "s" : ""})`
      : null;

  if (cleanPlan) {
    if (variant && durationStr) {
      return `${cleanPlan} — ${variant} ${durationStr}`;
    }
    if (variant) {
      return `${cleanPlan} — ${variant}`;
    }
    if (durationStr) {
      return `${cleanPlan} ${durationStr}`;
    }
    return cleanPlan;
  }

  // Graceful fallbacks if planName is missing
  if (variant && durationStr) {
    return `${variant} ${durationStr}`;
  }
  if (variant) return variant;
  if (durationStr) return durationStr.replace(/[()]/g, "");

  return "—";
}
