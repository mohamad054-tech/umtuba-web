/**
 * Referral Rewards V1 — client config + cookie/helpers.
 * Amounts mirror `um_points_config` (DB is source of truth).
 *
 * Cookie lifetime (see also lib/referral/cookies.ts):
 * - umtuba_ref: 30 days, httpOnly, SameSite=Lax, Secure in production
 * - umtuba_vid: 365 days, same flags — binds invite → signup across confirm delays
 * Clear umtuba_ref only after claim coordinator success / final invalid result.
 */

export const REFERRAL_COOKIE_NAME = "umtuba_ref";
export const REFERRAL_VISITOR_COOKIE = "umtuba_vid";

/** Attribution cookie max-age (seconds). Default 30 days. */
export const REFERRAL_ATTRIBUTION_TTL_SECONDS = 30 * 24 * 60 * 60;

export const UM_POINTS_REFERRAL = {
  /** Inviter reward on successful referred signup (Growth Mode). */
  referralSignup: 20,
  attributionTtlDays: 30,
  growthMode: true,
  emergencyDailyCapPerInviter: 100,
  /** Milestone bonuses — 0 means disabled. */
  milestone5: 0,
  milestone10: 0,
  milestone25: 0,
} as const;

const CODE_RE = /^[A-Z0-9]{6,16}$/;

export function normalizeReferralCode(
  raw: string | null | undefined
): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  return CODE_RE.test(code) ? code : null;
}

export function buildInvitePath(code: string): string {
  return `/invite/${code}`;
}

export function buildSignupRefPath(code: string): string {
  return `/signup?ref=${encodeURIComponent(code)}`;
}

/** Absolute invite URL for sharing (uses window origin when available). */
export function buildInviteAbsoluteUrl(
  code: string,
  origin?: string | null
): string {
  const path = buildInvitePath(code);
  if (origin) return `${origin.replace(/\/$/, "")}${path}`;
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return `https://umtuba.com${path}`;
}
