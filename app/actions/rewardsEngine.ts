"use server";

import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  fetchReferralProfileRpc,
  fetchRewardsHistoryRpc,
  fetchRewardsSnapshotRpc,
  requestRewardEventRpc,
} from "../../lib/supabase/rewardsEngine";
import {
  assertNoClientAmount,
  createRewardsEngine,
  type RewardsEventRequestContract,
} from "../../lib/rewards/engine";
import { fetchUmPointsWalletBalance } from "../../lib/wallet";
import {
  FRIENDLY_LOAD_ERROR,
  sanitizeUserFacingMessage,
} from "../lib/product/userFacingMessage";

export type RewardsEngineActionResult<T> =
  | ({ ok: true } & T)
  | { ok: false; message: string; requiresAuth?: boolean };

function foundationFallback(userId: string) {
  const engine = createRewardsEngine();
  const referral = engine.getReferralProfile(userId);
  return {
    wallet: {
      userId,
      availableBalance: 0,
      pendingBalance: 0,
      lifetimeEarned: 0,
      lifetimeSpent: 0,
      updatedAt: new Date().toISOString(),
    },
    referral: {
      code: referral.code,
      referralLink: referral.referralLink,
    },
    activeRewardRuleCount: engine.countActiveRewardRules(),
    pointValuesConfigured: false,
    history: engine.getHistory(userId),
  };
}

export async function getRewardsEngineSnapshotAction(): Promise<
  RewardsEngineActionResult<ReturnType<typeof foundationFallback>>
> {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      message: "Sign in to view rewards.",
      requiresAuth: true,
    };
  }

  try {
    const supabase = await createClient();
    const remote = await fetchRewardsSnapshotRpc(supabase);
    const existing = await fetchUmPointsWalletBalance(supabase, user.id);
    if (remote.ok && remote.data) {
      const wallet = remote.data.wallet as Record<string, unknown> | undefined;
      const referral = remote.data.referral as Record<string, unknown> | undefined;
      const history = await fetchRewardsHistoryRpc(supabase);
      return {
        ok: true,
        wallet: {
          userId: user.id,
          availableBalance:
            Number(wallet?.availableBalance ?? existing.amount) || 0,
          pendingBalance: Number(wallet?.pendingBalance ?? 0) || 0,
          lifetimeEarned: Number(wallet?.lifetimeEarned ?? existing.amount) || 0,
          lifetimeSpent: Number(wallet?.lifetimeSpent ?? 0) || 0,
          updatedAt:
            typeof wallet?.updatedAt === "string"
              ? wallet.updatedAt
              : existing.updatedAt ?? new Date().toISOString(),
        },
        referral: {
          code: typeof referral?.code === "string" ? referral.code : "",
          referralLink:
            typeof referral?.referralLink === "string"
              ? referral.referralLink
              : "",
        },
        activeRewardRuleCount: Number(remote.data.activeRewardRuleCount ?? 0) || 0,
        pointValuesConfigured: Boolean(remote.data.pointValuesConfigured),
        history: Array.isArray(history.data) ? (history.data as never) : [],
      };
    }

    const fallback = foundationFallback(user.id);
    fallback.wallet.availableBalance = existing.amount;
    fallback.wallet.updatedAt = existing.updatedAt ?? fallback.wallet.updatedAt;
    return { ok: true, ...fallback };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load rewards.";
    return {
      ok: false,
      message: sanitizeUserFacingMessage(message, FRIENDLY_LOAD_ERROR),
    };
  }
}

export async function getReferralEngineProfileAction(): Promise<
  RewardsEngineActionResult<{ code: string; referralLink: string }>
> {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      message: "Sign in to view your referral code.",
      requiresAuth: true,
    };
  }

  const supabase = await createClient();
  const remote = await fetchReferralProfileRpc(supabase);
  if (remote.ok && remote.data && typeof remote.data.code === "string") {
    return {
      ok: true,
      code: remote.data.code,
      referralLink:
        typeof remote.data.referralLink === "string"
          ? remote.data.referralLink
          : `/join?ref=${remote.data.code}`,
    };
  }

  const fallback = foundationFallback(user.id);
  return { ok: true, ...fallback.referral };
}

export async function requestRewardEventAction(
  request: RewardsEventRequestContract
): Promise<RewardsEngineActionResult<{ awarded: number; replayed: boolean }>> {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      message: "Sign in required.",
      requiresAuth: true,
    };
  }

  const guarded = assertNoClientAmount({
    ...request,
    ...(request.metadata ?? {}),
  });
  if (!guarded.ok) {
    return { ok: false, message: "Reward amounts are not client-authoritative." };
  }

  const supabase = await createClient();
  const remote = await requestRewardEventRpc(supabase, request);
  if (!remote.ok) {
    return {
      ok: true,
      awarded: 0,
      replayed: false,
    };
  }

  return {
    ok: true,
    awarded: Number(remote.data?.awarded ?? 0) || 0,
    replayed: Boolean(remote.data?.replayed),
  };
}
