import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildInviteAbsoluteUrl,
  buildInvitePath,
  buildJoinPath,
  buildSignupRefPath,
  normalizeReferralCode,
  UM_POINTS_REFERRAL,
} from "../referral/config";

export type ReferralStats = {
  code: string;
  invitePath: string;
  joinPath: string;
  signupPath: string;
  inviteUrl: string;
  successfulReferrals: number;
  pendingReferrals: number;
  pointsEarned: number;
  pointsPerSignup: number;
  attributionTtlDays: number;
  growthMode: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export async function ensureMyReferralCode(
  supabase: SupabaseClient
): Promise<{ code: string; invitePath: string; signupPath: string } | null> {
  const { data, error } = await supabase.rpc("ensure_my_referral_code");
  if (error) {
    console.error("ensure_my_referral_code failed:", error);
    return null;
  }
  const row = asRecord(data);
  const code = typeof row?.code === "string" ? row.code : null;
  if (!code) return null;
  return {
    code,
    invitePath:
      typeof row?.invitePath === "string"
        ? row.invitePath
        : buildInvitePath(code),
    signupPath:
      typeof row?.signupPath === "string"
        ? row.signupPath
        : buildSignupRefPath(code),
  };
}

export async function getMyReferralStats(
  supabase: SupabaseClient,
  origin?: string | null
): Promise<ReferralStats | null> {
  await supabase.rpc("qualify_my_referral_signup");
  const dashboard = await supabase.rpc("get_my_referral_dashboard");
  const fallback = dashboard.error
    ? await supabase.rpc("get_my_referral_stats")
    : dashboard;
  if (fallback.error) {
    console.error("get_my_referral_stats failed:", fallback.error);
    return null;
  }
  const row = asRecord(fallback.data);
  const code = typeof row?.code === "string" ? row.code : null;
  if (!code) return null;

  return {
    code,
    invitePath:
      typeof row?.invitePath === "string"
        ? row.invitePath
        : buildInvitePath(code),
    joinPath:
      typeof row?.joinPath === "string" ? row.joinPath : buildJoinPath(code),
    signupPath:
      typeof row?.signupPath === "string"
        ? row.signupPath
        : buildSignupRefPath(code),
    inviteUrl: buildInviteAbsoluteUrl(code, origin),
    successfulReferrals:
      Number(row?.successfulReferrals ?? row?.totalRewardedReferrals ?? 0) || 0,
    pendingReferrals: Number(row?.pendingReferrals ?? 0) || 0,
    pointsEarned: Number(row?.pointsEarned ?? 0) || 0,
    pointsPerSignup:
      Number(
        row?.pointsPerSignup ??
          row?.signupPoints ??
          UM_POINTS_REFERRAL.referralSignup
      ) || UM_POINTS_REFERRAL.referralSignup,
    attributionTtlDays:
      Number(row?.attributionTtlDays ?? UM_POINTS_REFERRAL.attributionTtlDays) ||
      UM_POINTS_REFERRAL.attributionTtlDays,
    growthMode: Boolean(row?.growthMode ?? UM_POINTS_REFERRAL.growthMode),
  };
}

export async function recordReferralAttribution(
  supabase: SupabaseClient,
  input: {
    code: string;
    anonymousVisitorId?: string | null;
    landingPath?: string | null;
    ipHash?: string | null;
    userAgentHash?: string | null;
  }
): Promise<{ ok: boolean; code?: string; reason?: string }> {
  const code = normalizeReferralCode(input.code);
  if (!code) return { ok: false, reason: "invalid_code" };

  const { data, error } = await supabase.rpc("record_referral_attribution", {
    p_referral_code: code,
    p_anonymous_visitor_id: input.anonymousVisitorId ?? null,
    p_landing_path: input.landingPath ?? null,
    p_ip_hash: input.ipHash ?? null,
    p_user_agent_hash: input.userAgentHash ?? null,
  });

  if (error) {
    console.error("record_referral_attribution failed:", error);
    return { ok: false, reason: "attribution_failed" };
  }

  const row = asRecord(data);
  const reason = typeof row?.reason === "string" ? row.reason : undefined;
  const recorded = Boolean(row?.recorded);
  // first_touch_kept is a successful no-op keep — treat as ok for callers.
  const ok = recorded || reason === "first_touch_kept";

  return {
    ok,
    code:
      typeof row?.referralCode === "string"
        ? row.referralCode
        : typeof row?.code === "string"
          ? row.code
          : code,
    reason,
  };
}

/**
 * Claim signup referral for the authenticated user.
 * Client never chooses points, recipient, reason, or dedupe key.
 */
export async function claimMyReferralSignup(
  supabase: SupabaseClient,
  input: {
    code?: string | null;
    anonymousVisitorId?: string | null;
    ipHash?: string | null;
    userAgentHash?: string | null;
  } = {}
): Promise<{ ok: boolean; reason?: string; pointsAwarded?: number }> {
  const code = normalizeReferralCode(input.code ?? null);

  const { data, error } = await supabase.rpc("claim_my_referral_signup", {
    p_referral_code: code,
    p_anonymous_visitor_id: input.anonymousVisitorId ?? null,
    p_ip_hash: input.ipHash ?? null,
    p_user_agent_hash: input.userAgentHash ?? null,
  });

  if (error) {
    console.error("claim_my_referral_signup failed:", error);
    // Soft, non-scary reason for coordinator retry classification.
    return { ok: false, reason: "rpc_error" };
  }

  const row = asRecord(data);
  return {
    ok: Boolean(row?.ok),
    reason: typeof row?.reason === "string" ? row.reason : undefined,
    pointsAwarded:
      typeof row?.pointsAwarded === "number"
        ? row.pointsAwarded
        : Number(row?.pointsAwarded ?? 0) || undefined,
  };
}
