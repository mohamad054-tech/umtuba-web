"use server";

import { headers } from "next/headers";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  ensureMyReferralCode,
  getMyReferralStats,
  recordReferralAttribution,
} from "../../lib/supabase/referral";
import { runReferralClaimCoordinator } from "../../lib/referral/claimCoordinator";
import {
  ensureVisitorId,
  hashReferralSignal,
} from "../../lib/referral/cookies";
import { normalizeReferralCode } from "../../lib/referral/config";

export async function ensureMyReferralCodeAction() {
  const user = await getServerUser();
  if (!user) {
    return { ok: false as const, message: "Sign in required." };
  }
  const supabase = await createClient();
  const result = await ensureMyReferralCode(supabase);
  if (!result) {
    return { ok: false as const, message: "Unable to load invite code." };
  }
  return { ok: true as const, ...result };
}

export async function getMyReferralStatsAction() {
  const user = await getServerUser();
  if (!user) {
    return { ok: false as const, message: "Sign in required." };
  }
  const supabase = await createClient();
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") || "https";
  const origin = host ? `${proto}://${host}` : null;
  const stats = await getMyReferralStats(supabase, origin);
  if (!stats) {
    return { ok: false as const, message: "Unable to load referral stats." };
  }
  return { ok: true as const, stats };
}

export async function recordReferralAttributionAction(code: string) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) {
    return { ok: false as const, reason: "invalid_code" };
  }

  const supabase = await createClient();
  const visitorId = await ensureVisitorId();
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip") ||
    null;
  const ua = hdrs.get("user-agent");

  return recordReferralAttribution(supabase, {
    code: normalized,
    anonymousVisitorId: visitorId,
    landingPath: `/invite/${normalized}`,
    ipHash: hashReferralSignal(ip),
    userAgentHash: hashReferralSignal(ua),
  });
}

/**
 * Idempotent pending-referral claim via the shared coordinator.
 * Safe to call from signup, login, auth callback, and first session.
 * Never accepts client-chosen points / recipient / reason / dedupe.
 */
export async function claimPendingReferralAction(
  preferredCode?: string | null
) {
  return runReferralClaimCoordinator({
    source: "action",
    preferredCode,
  });
}
