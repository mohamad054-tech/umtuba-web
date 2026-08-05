/**
 * Seller Live Payout destinations helpers (Slice S3).
 * Masked display data only. Calls S2 destination RPC contracts.
 * Never stores or returns full account numbers / secrets.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
  type SellerLivePayoutDestinationVerificationState,
  type SellerLivePayoutProviderId,
} from "./types";

export const SELLER_LIVE_PAYOUT_DESTINATION_RPCS = {
  upsert: "upsert_my_store_payout_destination",
  list: "list_my_store_payout_destinations",
} as const;

type AnyClient = SupabaseClient;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Long digit runs look like account/PAN fragments — reject. */
const UNSAFE_DIGIT_RUN_RE = /[0-9]{8,}/;

const SENSITIVE_DESTINATION_KEYS = [
  "account_number",
  "iban",
  "routing_number",
  "bank_account",
  "beneficiary",
  "secret",
  "password",
  "token",
  "pan",
  "full_account",
] as const;

export type SellerLivePayoutDestination = {
  id: string;
  storeId: string;
  providerId: SellerLivePayoutProviderId;
  currency: string;
  displayLabel: string;
  verificationState: SellerLivePayoutDestinationVerificationState;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function validateSellerLivePayoutStoreId(
  storeId: string | null | undefined
): { ok: true; storeId: string } | { ok: false; message: string } {
  if (!storeId || !isUuid(storeId)) {
    return { ok: false, message: "store_id is invalid." };
  }
  return { ok: true, storeId };
}

/**
 * Masked display labels only — reject account-number-like values.
 */
export function validateMaskedDestinationDisplayLabel(
  displayLabel: string | null | undefined
): { ok: true; displayLabel: string } | { ok: false; message: string } {
  if (typeof displayLabel !== "string") {
    return { ok: false, message: "display_label is required." };
  }
  const label = displayLabel.trim();
  if (label.length < 3 || label.length > 80) {
    return { ok: false, message: "display_label must be 3..80 characters." };
  }
  if (UNSAFE_DIGIT_RUN_RE.test(label)) {
    return {
      ok: false,
      message: "display_label must be masked (no long digit runs).",
    };
  }
  if (/account\s*number|iban|routing|swift|bic/i.test(label)) {
    return {
      ok: false,
      message: "display_label must not describe raw bank account details.",
    };
  }
  return { ok: true, displayLabel: label };
}

export function validateSellerLivePayoutCurrency(
  currency: string | null | undefined
): { ok: true; currency: string } | { ok: false; message: string } {
  if (!currency || typeof currency !== "string") {
    return { ok: false, message: "currency is invalid." };
  }
  const c = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(c)) {
    return { ok: false, message: "currency must be a 3-letter ISO code." };
  }
  return { ok: true, currency: c };
}

/** Reject client attempts to pass secrets or full account fields. */
export function rejectUnsafeDestinationClientFields(
  input: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
  for (const key of Object.keys(input)) {
    const lower = key.toLowerCase();
    if (
      SENSITIVE_DESTINATION_KEYS.some(
        (s) => lower === s || lower.includes(s)
      )
    ) {
      return {
        ok: false,
        message: "Destination helpers reject account secrets and full numbers.",
      };
    }
  }
  return { ok: true };
}

export function assertNoSensitiveDestinationFields(
  payload: Record<string, unknown>
): boolean {
  for (const key of Object.keys(payload)) {
    const lower = key.toLowerCase();
    if (
      SENSITIVE_DESTINATION_KEYS.some(
        (s) => lower === s || lower.includes(s)
      )
    ) {
      return false;
    }
  }
  return true;
}

export function parseSellerLivePayoutDestination(
  raw: unknown
): SellerLivePayoutDestination | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (!assertNoSensitiveDestinationFields(row)) return null;
  const id = str(row.id);
  const storeId = str(row.store_id);
  const providerId = str(row.provider_id);
  const currency = str(row.currency).toUpperCase();
  const displayLabel = str(row.display_label);
  if (!isUuid(id) || !isUuid(storeId)) return null;
  if (
    providerId !== "manual_ops_live" &&
    providerId !== "stripe_connect"
  ) {
    return null;
  }
  if (UNSAFE_DIGIT_RUN_RE.test(displayLabel)) return null;
  return {
    id,
    storeId,
    providerId: providerId as SellerLivePayoutProviderId,
    currency,
    displayLabel,
    verificationState: str(
      row.verification_state
    ) as SellerLivePayoutDestinationVerificationState,
    isActive: Boolean(row.is_active),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

function mapDestinationRpcError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("authentication required")) return "Sign in required.";
  if (m.includes("not authorized")) {
    return "You cannot manage payout destinations for this store.";
  }
  if (m.includes("display_label")) {
    return "Destination label must be masked (3–80 chars, no long digit runs).";
  }
  if (m.includes("invalid currency")) return "Currency is invalid.";
  if (m.includes("invalid provider")) return "Provider is not allowed.";
  if (m.includes("function") && m.includes("does not exist")) {
    return "Live payout destinations are unavailable until the migration is applied.";
  }
  return message || "Could not manage payout destination.";
}

async function rpcJson(
  supabase: AnyClient,
  fn: string,
  args: Record<string, unknown>
): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    return { ok: false, message: mapDestinationRpcError(error.message) };
  }
  return { ok: true, data };
}

export type UpsertSellerLivePayoutDestinationInput = {
  storeId: string;
  /** Defaults to V1 Manual Ops Live. Connect remains reserved. */
  providerId?: SellerLivePayoutProviderId;
  currency: string;
  displayLabel: string;
  requestReview?: boolean;
};

/**
 * Seller upsert of a masked destination via S2 RPC.
 * Cannot self-verify. Rejects unsafe labels and secret fields.
 */
export async function upsertMyStorePayoutDestination(
  supabase: AnyClient,
  input: UpsertSellerLivePayoutDestinationInput
): Promise<
  | { ok: true; destination: SellerLivePayoutDestination }
  | { ok: false; message: string }
> {
  const unsafe = rejectUnsafeDestinationClientFields({
    ...input,
  } as unknown as Record<string, unknown>);
  if (!unsafe.ok) return unsafe;

  const store = validateSellerLivePayoutStoreId(input.storeId);
  if (!store.ok) return store;
  const currency = validateSellerLivePayoutCurrency(input.currency);
  if (!currency.ok) return currency;
  const label = validateMaskedDestinationDisplayLabel(input.displayLabel);
  if (!label.ok) return label;

  const providerId = input.providerId ?? SELLER_LIVE_PAYOUT_V1_PROVIDER_ID;
  if (providerId !== SELLER_LIVE_PAYOUT_V1_PROVIDER_ID) {
    return {
      ok: false,
      message: "Only manual_ops_live destinations are allowed in V1.",
    };
  }

  const res = await rpcJson(
    supabase,
    SELLER_LIVE_PAYOUT_DESTINATION_RPCS.upsert,
    {
      p_store_id: store.storeId,
      p_provider_id: providerId,
      p_currency: currency.currency,
      p_display_label: label.displayLabel,
      p_request_review: Boolean(input.requestReview),
    }
  );
  if (!res.ok) return res;

  const payload = (res.data ?? {}) as Record<string, unknown>;
  if (!assertNoSensitiveDestinationFields(payload)) {
    return { ok: false, message: "Destination payload is unsafe." };
  }
  const parsed = parseSellerLivePayoutDestination(payload.destination);
  if (!parsed) {
    return { ok: false, message: "Destination response is invalid." };
  }
  return { ok: true, destination: parsed };
}

/**
 * Seller list of masked destinations via S2 RPC.
 */
export async function listMyStorePayoutDestinations(
  supabase: AnyClient,
  storeId: string
): Promise<
  | { ok: true; destinations: SellerLivePayoutDestination[] }
  | { ok: false; message: string }
> {
  const store = validateSellerLivePayoutStoreId(storeId);
  if (!store.ok) return store;

  const res = await rpcJson(supabase, SELLER_LIVE_PAYOUT_DESTINATION_RPCS.list, {
    p_store_id: store.storeId,
  });
  if (!res.ok) return res;

  const payload = (res.data ?? {}) as Record<string, unknown>;
  if (!assertNoSensitiveDestinationFields(payload)) {
    return { ok: false, message: "Destination list payload is unsafe." };
  }
  const itemsRaw = Array.isArray(payload.destinations)
    ? payload.destinations
    : [];
  const destinations: SellerLivePayoutDestination[] = [];
  for (const item of itemsRaw) {
    const parsed = parseSellerLivePayoutDestination(item);
    if (!parsed) {
      return { ok: false, message: "Destination list contains an unsafe item." };
    }
    destinations.push(parsed);
  }
  return { ok: true, destinations };
}
