import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildActivityTierProgress,
  emptyActivityTierProgress,
  isActivityTierId,
  type ActivityTierProgress,
} from "../activity-tiers";

type SnapshotRow = {
  score?: unknown;
  tier_id?: unknown;
  tierId?: unknown;
  updated_at?: unknown;
  updatedAt?: unknown;
  ok?: unknown;
};

function parseSnapshot(raw: unknown): ActivityTierProgress {
  if (!raw || typeof raw !== "object") {
    return emptyActivityTierProgress();
  }

  const row = raw as SnapshotRow;
  if (row.ok === false) {
    return emptyActivityTierProgress();
  }

  const score =
    typeof row.score === "number" && Number.isFinite(row.score)
      ? Math.max(0, Math.floor(row.score))
      : 0;
  const tierRaw = row.tierId ?? row.tier_id;
  const tierId = isActivityTierId(tierRaw) ? tierRaw : undefined;
  const updatedAtRaw = row.updatedAt ?? row.updated_at;
  const updatedAt =
    typeof updatedAtRaw === "string" ? updatedAtRaw : null;

  return buildActivityTierProgress({ score, tierId, updatedAt });
}

export async function getMyActivityTierProgress(
  supabase: SupabaseClient
): Promise<ActivityTierProgress> {
  const { data, error } = await supabase.rpc("get_my_activity_tier_summary");
  if (error) {
    // Table/RPC may not be applied yet — fall back gracefully.
    console.error("get_my_activity_tier_summary failed:", error.message);
    return emptyActivityTierProgress();
  }
  return parseSnapshot(data);
}

export async function getActivityTierSnapshot(
  supabase: SupabaseClient,
  userId: string
): Promise<ActivityTierProgress> {
  if (!userId) {
    return emptyActivityTierProgress();
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_activity_tier_snapshot",
    { p_user_id: userId }
  );

  if (!rpcError && rpcData) {
    return parseSnapshot(rpcData);
  }

  // Direct table read fallback (public RLS).
  const { data, error } = await supabase
    .from("activity_score_balances")
    .select("score, tier_id, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("activity_score_balances read failed:", error.message);
    return emptyActivityTierProgress();
  }

  if (!data) {
    return emptyActivityTierProgress();
  }

  return parseSnapshot({
    ok: true,
    score: (data as { score?: unknown }).score,
    tier_id: (data as { tier_id?: unknown }).tier_id,
    updated_at: (data as { updated_at?: unknown }).updated_at,
  });
}

export function mapActivityBalanceRow(row: {
  score?: unknown;
  tier_id?: unknown;
  updated_at?: unknown;
}): ActivityTierProgress {
  return parseSnapshot({
    ok: true,
    score: row.score,
    tier_id: row.tier_id,
    updated_at: row.updated_at,
  });
}
