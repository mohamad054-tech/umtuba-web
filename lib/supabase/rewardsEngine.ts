import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertNoClientAmount,
  REWARDS_CROSS_PLATFORM_CONTRACT,
  type RewardsEventRequestContract,
} from "../rewards/engine";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export async function fetchRewardsSnapshotRpc(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc(
    REWARDS_CROSS_PLATFORM_CONTRACT.rpcs.snapshot
  );
  if (error) {
    return { ok: false as const, reason: error.message, data: null };
  }
  return { ok: true as const, reason: null, data: asRecord(data) };
}

export async function fetchRewardsHistoryRpc(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc(
    REWARDS_CROSS_PLATFORM_CONTRACT.rpcs.history
  );
  if (error) {
    return { ok: false as const, reason: error.message, data: null };
  }
  return { ok: true as const, reason: null, data };
}

export async function fetchReferralProfileRpc(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc(
    REWARDS_CROSS_PLATFORM_CONTRACT.rpcs.referral
  );
  if (error) {
    return { ok: false as const, reason: error.message, data: null };
  }
  return { ok: true as const, reason: null, data: asRecord(data) };
}

/**
 * Client request only — never forwards an amount.
 * Safe to call before the migration is applied (returns RPC error).
 */
export async function requestRewardEventRpc(
  supabase: SupabaseClient,
  request: RewardsEventRequestContract
) {
  const guarded = assertNoClientAmount({ ...request.metadata });
  if (!guarded.ok) {
    return { ok: false as const, reason: guarded.reason, data: null };
  }

  const { data, error } = await supabase.rpc(
    REWARDS_CROSS_PLATFORM_CONTRACT.rpcs.processEvent,
    {
      p_event_type: request.eventType,
      p_idempotency_key: request.idempotencyKey,
      p_source_type: request.sourceType,
      p_source_id: request.sourceId,
      p_metadata: request.metadata ?? {},
    }
  );
  if (error) {
    return { ok: false as const, reason: error.message, data: null };
  }
  return { ok: true as const, reason: null, data: asRecord(data) };
}
