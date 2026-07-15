/**
 * Pure referral claim policy — which outcomes clear local state vs remain retryable.
 * Amounts / recipients are never decided here (DB-owned via claim_my_referral_signup).
 */

/** Reasons that are final for this browser attribution (clear umtuba_ref). */
export const REFERRAL_CLAIM_FINAL_REASONS = [
  "rewarded",
  "already_converted",
  "skipped_self",
  "skipped_inactive",
  "skipped_rate_limit",
  "unknown_code",
  "invalid_code",
  "not_eligible_existing_account",
  "no_pending_attribution",
] as const;

export type ReferralClaimFinalReason =
  (typeof REFERRAL_CLAIM_FINAL_REASONS)[number];

export type ReferralClaimRpcResult = {
  ok: boolean;
  reason?: string;
  pointsAwarded?: number;
};

export type ReferralClaimDecision =
  | "clear_local" // authoritative success or final invalid
  | "retryable" // keep cookie; safe to try again later
  | "noop"; // nothing to claim

const FINAL_SET = new Set<string>(REFERRAL_CLAIM_FINAL_REASONS);

export function isFinalReferralClaimReason(
  reason: string | null | undefined
): boolean {
  if (!reason) return false;
  return FINAL_SET.has(reason);
}

/**
 * Clear the attribution cookie only after success or a final invalid result.
 * Transient / unknown failures stay retryable (do not clear).
 */
export function decideReferralCookieClearance(
  result: ReferralClaimRpcResult
): ReferralClaimDecision {
  if (result.ok) {
    return "clear_local";
  }
  if (isFinalReferralClaimReason(result.reason)) {
    return "clear_local";
  }
  return "retryable";
}

export function shouldClearReferralAttributionCookie(
  result: ReferralClaimRpcResult
): boolean {
  return decideReferralCookieClearance(result) === "clear_local";
}

export function isRetryableReferralClaim(
  result: ReferralClaimRpcResult
): boolean {
  return decideReferralCookieClearance(result) === "retryable";
}

/** Prefer first-touch cookie over a later preferred/query code. */
export function resolveClaimReferralCode(input: {
  cookieCode: string | null | undefined;
  preferredCode?: string | null | undefined;
}): string | null {
  const fromCookie =
    typeof input.cookieCode === "string" && input.cookieCode.trim()
      ? input.cookieCode.trim().toUpperCase()
      : null;
  if (fromCookie) return fromCookie;
  const preferred =
    typeof input.preferredCode === "string" && input.preferredCode.trim()
      ? input.preferredCode.trim().toUpperCase()
      : null;
  return preferred;
}

export function hasReferralClaimSignal(input: {
  code: string | null | undefined;
  visitorId: string | null | undefined;
}): boolean {
  return Boolean(input.code || input.visitorId);
}
