/**
 * Seller Payout Read Model V1 — types, parsers, and RPC wrappers.
 * Reads trusted settlement RELEASED + payout foundation states.
 * Server/client may call authenticated RPCs; never trusts client money totals.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { STORE_PAYOUT_STATES, type StorePayoutState } from "./sellerPayoutFoundation";

export const SELLER_PAYOUT_READ_MODEL_ID =
  "commerce.settlement.seller_payout_read_model_v1" as const;

export const SELLER_PAYOUT_READ_MAX_LIMIT = 50 as const;
export const SELLER_PAYOUT_READ_DEFAULT_LIMIT = 50 as const;

export const SELLER_PAYOUT_READ_RPCS = {
  eligibility: "get_my_seller_payout_eligibility",
  summary: "get_my_seller_payout_summary",
  list: "get_my_seller_payouts",
} as const;

export const SELLER_PAYOUT_STATUS = [
  "available",
  "in_transit",
  "completed",
] as const;
export type SellerPayoutStatus = (typeof SELLER_PAYOUT_STATUS)[number];

type AnyClient = SupabaseClient;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

/** Reject client-authored money fields on read-model invocation. */
export function rejectClientPayoutReadMoneyFields(
  input: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
  for (const key of Object.keys(input)) {
    if (
      /minor|amount|total|balance|payout_sum|available|in_transit|completed/i.test(
        key
      ) &&
      key !== "before_created_at" &&
      input[key] !== undefined &&
      input[key] !== null
    ) {
      // Identifiers and limit/cursor only — not money.
      if (
        key === "limit" ||
        key === "store_id" ||
        key === "before_id" ||
        key === "before_created_at"
      ) {
        continue;
      }
      return {
        ok: false,
        message: "Client must not supply money fields to the payout read model.",
      };
    }
  }
  return { ok: true };
}

export function validateSellerPayoutReadStoreId(
  storeId: string | null | undefined
): { ok: true; storeId: string } | { ok: false; message: string } {
  if (!storeId || !isUuid(storeId)) {
    return { ok: false, message: "store_id is invalid." };
  }
  return { ok: true, storeId };
}

export function clampSellerPayoutReadLimit(
  limit: number | null | undefined
): { ok: true; limit: number } | { ok: false; message: string } {
  if (limit == null) {
    return { ok: true, limit: SELLER_PAYOUT_READ_DEFAULT_LIMIT };
  }
  if (!Number.isInteger(limit) || limit < 1) {
    return { ok: false, message: "limit must be an integer >= 1." };
  }
  return { ok: true, limit: Math.min(limit, SELLER_PAYOUT_READ_MAX_LIMIT) };
}

export function mapPayoutStateToStatus(
  payoutState: StorePayoutState | string
): SellerPayoutStatus {
  if (payoutState === "IN_TRANSIT") return "in_transit";
  if (payoutState === "COMPLETED") return "completed";
  return "available";
}

export type SellerPayoutCurrencyBucket = {
  currency: string;
  availableMinor: number;
  inTransitMinor: number;
  completedMinor: number;
  availableCount: number;
  inTransitCount: number;
  completedCount: number;
};

export type SellerPayoutEligibility = {
  storeId: string;
  eligibleForBalanceRead: boolean;
  hasAvailableForPayout: boolean;
  availableCaptureCount: number;
  inTransitCaptureCount: number;
  releaseCurrencyCount: number;
  bankPayoutsEnabled: boolean;
  reasons: string[];
  capability: string;
};

export type SellerPayoutSummary = {
  storeId: string;
  byCurrency: SellerPayoutCurrencyBucket[];
  failedEventCount: number;
  bankPayoutsEnabled: boolean;
  capability: string;
};

export type SellerPayoutListItem = {
  orderId: string;
  paymentAttemptId: string;
  captureEventId: string;
  amountMinor: number;
  currency: string;
  settlementState: string;
  payoutState: StorePayoutState | string;
  payoutStatus: SellerPayoutStatus | string;
  lastPayoutAction: string | null;
  lastPayoutAt: string | null;
  failCount: number;
  captureCreatedAt: string;
};

export type SellerPayoutListPage = {
  storeId: string;
  items: SellerPayoutListItem[];
  limit: number;
  hasMore: boolean;
  nextCursor: { beforeCreatedAt: string; beforeId: string } | null;
  capability: string;
};

const SENSITIVE_KEYS = [
  "request_fingerprint",
  "fingerprint_alg",
  "ueos_journal_entry_id",
  "policy_id",
  "metadata",
  "provider_reference",
  "provider_payload_id",
  "bank_account",
  "beneficiary",
  "rail",
] as const;

export function assertNoSensitivePayoutReadFields(
  payload: Record<string, unknown>
): boolean {
  for (const key of SENSITIVE_KEYS) {
    if (key in payload) return false;
  }
  return true;
}

export function parseSellerPayoutEligibility(
  raw: unknown
): SellerPayoutEligibility {
  const row = (raw ?? {}) as Record<string, unknown>;
  const reasonsRaw = row.reasons;
  const reasons = Array.isArray(reasonsRaw)
    ? reasonsRaw.map((r) => str(r))
    : [];
  return {
    storeId: str(row.store_id),
    eligibleForBalanceRead: Boolean(row.eligible_for_balance_read),
    hasAvailableForPayout: Boolean(row.has_available_for_payout),
    availableCaptureCount: num(row.available_capture_count),
    inTransitCaptureCount: num(row.in_transit_capture_count),
    releaseCurrencyCount: num(row.release_currency_count),
    bankPayoutsEnabled: Boolean(row.bank_payouts_enabled),
    reasons,
    capability: str(row.capability) || SELLER_PAYOUT_READ_MODEL_ID,
  };
}

export function parseSellerPayoutSummary(raw: unknown): SellerPayoutSummary {
  const row = (raw ?? {}) as Record<string, unknown>;
  const bucketsRaw = Array.isArray(row.by_currency) ? row.by_currency : [];
  const byCurrency: SellerPayoutCurrencyBucket[] = bucketsRaw.map((b) => {
    const bucket = (b ?? {}) as Record<string, unknown>;
    return {
      currency: str(bucket.currency).toUpperCase(),
      availableMinor: num(bucket.available_minor),
      inTransitMinor: num(bucket.in_transit_minor),
      completedMinor: num(bucket.completed_minor),
      availableCount: num(bucket.available_count),
      inTransitCount: num(bucket.in_transit_count),
      completedCount: num(bucket.completed_count),
    };
  });
  return {
    storeId: str(row.store_id),
    byCurrency,
    failedEventCount: num(row.failed_event_count),
    bankPayoutsEnabled: Boolean(row.bank_payouts_enabled),
    capability: str(row.capability) || SELLER_PAYOUT_READ_MODEL_ID,
  };
}

export function parseSellerPayoutListItem(raw: unknown): SellerPayoutListItem {
  const row = (raw ?? {}) as Record<string, unknown>;
  const payoutState = str(row.payout_state);
  const payoutStatus = str(row.payout_status);
  return {
    orderId: str(row.order_id),
    paymentAttemptId: str(row.payment_attempt_id),
    captureEventId: str(row.capture_event_id),
    amountMinor: num(row.amount_minor),
    currency: str(row.currency).toUpperCase(),
    settlementState: str(row.settlement_state),
    payoutState,
    payoutStatus:
      payoutStatus ||
      mapPayoutStateToStatus(
        (STORE_PAYOUT_STATES as readonly string[]).includes(payoutState)
          ? (payoutState as StorePayoutState)
          : "NONE"
      ),
    lastPayoutAction:
      row.last_payout_action == null ? null : str(row.last_payout_action),
    lastPayoutAt:
      row.last_payout_at == null ? null : str(row.last_payout_at),
    failCount: num(row.fail_count),
    captureCreatedAt: str(row.capture_created_at),
  };
}

export function parseSellerPayoutListPage(raw: unknown): SellerPayoutListPage {
  const row = (raw ?? {}) as Record<string, unknown>;
  const itemsRaw = Array.isArray(row.items) ? row.items : [];
  const cursor = row.next_cursor as Record<string, unknown> | null;
  return {
    storeId: str(row.store_id),
    items: itemsRaw.map(parseSellerPayoutListItem),
    limit: num(row.limit) || SELLER_PAYOUT_READ_DEFAULT_LIMIT,
    hasMore: Boolean(row.has_more),
    nextCursor:
      cursor && cursor.before_created_at && cursor.before_id
        ? {
            beforeCreatedAt: str(cursor.before_created_at),
            beforeId: str(cursor.before_id),
          }
        : null,
    capability: str(row.capability) || SELLER_PAYOUT_READ_MODEL_ID,
  };
}

export function mapSellerPayoutReadRpcError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("authentication required")) return "Sign in required.";
  if (m.includes("not authorized")) {
    return "You cannot view payouts for this store.";
  }
  if (m.includes("store_id is required") || m.includes("store not found")) {
    return "Store is invalid.";
  }
  if (m.includes("limit must")) return "Invalid payout list limit.";
  if (m.includes("pagination cursor")) return "Invalid payout list cursor.";
  if (m.includes("function") && m.includes("does not exist")) {
    return "Seller payout read model is unavailable until the migration is applied.";
  }
  return message || "Could not load seller payouts.";
}

async function rpcJson(
  supabase: AnyClient,
  fn: string,
  args: Record<string, unknown>
): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    return { ok: false, message: mapSellerPayoutReadRpcError(error.message) };
  }
  return { ok: true, data };
}

export async function fetchMySellerPayoutEligibility(
  supabase: AnyClient,
  storeId: string
): Promise<
  { ok: true; data: SellerPayoutEligibility } | { ok: false; message: string }
> {
  const id = validateSellerPayoutReadStoreId(storeId);
  if (!id.ok) return id;
  const money = rejectClientPayoutReadMoneyFields({ store_id: storeId });
  if (!money.ok) return money;

  const res = await rpcJson(supabase, SELLER_PAYOUT_READ_RPCS.eligibility, {
    p_store_id: id.storeId,
  });
  if (!res.ok) return res;
  const parsed = parseSellerPayoutEligibility(res.data);
  if (!assertNoSensitivePayoutReadFields(res.data as Record<string, unknown>)) {
    return { ok: false, message: "Payout eligibility payload is unsafe." };
  }
  return { ok: true, data: parsed };
}

export async function fetchMySellerPayoutSummary(
  supabase: AnyClient,
  storeId: string
): Promise<
  { ok: true; data: SellerPayoutSummary } | { ok: false; message: string }
> {
  const id = validateSellerPayoutReadStoreId(storeId);
  if (!id.ok) return id;
  const money = rejectClientPayoutReadMoneyFields({ store_id: storeId });
  if (!money.ok) return money;

  const res = await rpcJson(supabase, SELLER_PAYOUT_READ_RPCS.summary, {
    p_store_id: id.storeId,
  });
  if (!res.ok) return res;
  if (!assertNoSensitivePayoutReadFields(res.data as Record<string, unknown>)) {
    return { ok: false, message: "Payout summary payload is unsafe." };
  }
  return { ok: true, data: parseSellerPayoutSummary(res.data) };
}

export async function fetchMySellerPayouts(
  supabase: AnyClient,
  input: {
    storeId: string;
    limit?: number;
    beforeCreatedAt?: string;
    beforeId?: string;
  }
): Promise<
  { ok: true; data: SellerPayoutListPage } | { ok: false; message: string }
> {
  const id = validateSellerPayoutReadStoreId(input.storeId);
  if (!id.ok) return id;
  const lim = clampSellerPayoutReadLimit(input.limit);
  if (!lim.ok) return lim;

  const money = rejectClientPayoutReadMoneyFields({
    store_id: input.storeId,
    limit: lim.limit,
    before_created_at: input.beforeCreatedAt,
    before_id: input.beforeId,
  });
  if (!money.ok) return money;

  if (
    (input.beforeCreatedAt == null) !== (input.beforeId == null) ||
    (input.beforeId != null && !isUuid(input.beforeId))
  ) {
    return { ok: false, message: "Invalid payout list cursor." };
  }

  const res = await rpcJson(supabase, SELLER_PAYOUT_READ_RPCS.list, {
    p_store_id: id.storeId,
    p_limit: lim.limit,
    p_before_created_at: input.beforeCreatedAt ?? null,
    p_before_id: input.beforeId ?? null,
  });
  if (!res.ok) return res;
  const raw = (res.data ?? {}) as Record<string, unknown>;
  if (!assertNoSensitivePayoutReadFields(raw)) {
    return { ok: false, message: "Payout list payload is unsafe." };
  }
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
  for (const item of itemsRaw) {
    if (
      item &&
      typeof item === "object" &&
      !assertNoSensitivePayoutReadFields(item as Record<string, unknown>)
    ) {
      return { ok: false, message: "Payout list payload is unsafe." };
    }
  }
  return { ok: true, data: parseSellerPayoutListPage(res.data) };
}
