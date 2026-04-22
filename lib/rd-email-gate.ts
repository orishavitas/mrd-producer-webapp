/**
 * R&D Email Gate Utility
 *
 * Determines if an email is authorized for R&D features.
 * Used by middleware to gate /prd and /api/pipeline/prd routes.
 */

export function isRDEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = process.env.ALLOWED_RD_EMAILS ?? '';
  if (!allowed) {
    console.warn(
      '[isRDEmail] ALLOWED_RD_EMAILS env var is not set — blocking all R&D route access'
    );
    return false;
  }
  return allowed
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}
