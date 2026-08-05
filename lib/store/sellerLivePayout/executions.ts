/**
 * Seller Live Payout execution helpers (Slice S3).
 * Trusted server-side amount/currency only. S2 execution RPC contracts.
 * Preserves idempotency; fail-closed on invalid transitions.
 * No UEOS / payout booking / orchestration.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
  type SellerLivePayoutExecutionStatus,
  type SellerLivePayoutFailureCode,
  type SellerLivePayoutProviderId,
} from "./types";

export const SELLER_LIVE_PAYOUT_EXECUTION_RPCS = {
  getMine: "get_my_store_payout_execution",
  serviceInsert: "service_insert_store_payout_execution",
  serviceUpdate: "service_update_store_payout_execution",
} as const;

type AnyClient = SupabaseClient;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const UNSAFE_DIGIT_RUN_RE = /[0-9]{12,}/;

/** Initial insert statuses allowed by S2 service_insert. */
export const SELLER_LIVE_PAYOUT_INITIAL_EXECUTION_STATUSES = [
  "planned",
  "awaiting_attestation",
  "provider_submitted",
  "suppressed",
] as const;

export type SellerLivePayoutInitialExecutionStatus =
  (typeof SELLER_LIVE_PAYOUT_INITIAL_EXECUTION_STATUSES)[number];

/**
 * Fail-closed transition matrix (mirrors S2 SQL helper).
 * Not a second payout state machine — durable statuses for live execution only.
 */
export const SELLER_LIVE_PAYOUT_EXECUTION_TRANSITIONS: Record<
  SellerLivePayoutExecutionStatus,
  readonly SellerLivePayoutExecutionStatus[]
> = {
  planned: ["awaiting_attestation", "provider_submitted", "suppressed", "failed"],
  awaiting_attestation: ["succeeded", "failed", "uncertain"],
  provider_submitted: ["succeeded", "failed", "uncertain"],
  uncertain: ["succeeded", "failed"],
  succeeded: ["succeeded"],
  failed: ["failed"],
  suppressed: ["suppressed"],
};

const CLIENT_MONEY_KEY_RE =
  /^(?:.*(?:minor|amount|total|balance|payout_sum).*|available|in_transit|completed)$/i;

const ALLOWED_EXECUTION_INPUT_KEYS = new Set([
  "storeId",
  "store_id",
  "captureEventId",
  "capture_event_id",
  "destinationId",
  "destination_id",
  "providerId",
  "provider_id",
  "trustedAmountMinor",
  "trusted_amount_minor",
  "currency",
  "idempotencyKey",
  "idempotency_key",
  "status",
  "providerRef",
  "provider_ref",
  "note",
  "executionId",
  "execution_id",
  "failureCode",
  "failure_code",
  "failureMessageSafe",
  "failure_message_safe",
  "payoutSubmitEventId",
  "payout_submit_event_id",
]);

export type SellerLivePayoutExecution = {
  id: string;
  storeId: string;
  captureEventId: string;
  destinationId: string;
  providerId: SellerLivePayoutProviderId;
  status: SellerLivePayoutExecutionStatus;
  trustedAmountMinor: number;
  currency: string;
  providerRef: string | null;
  failureCode: string | null;
  failureMessageSafe: string | null;
  attestationDecision: string | null;
  attestationRef: string | null;
  attestedAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

function str(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function isSellerLivePayoutExecutionTransitionAllowed(
  from: SellerLivePayoutExecutionStatus,
  to: SellerLivePayoutExecutionStatus
): boolean {
  if (from === to) return true;
  const allowed = SELLER_LIVE_PAYOUT_EXECUTION_TRANSITIONS[from];
  return allowed?.includes(to) ?? false;
}

/**
 * Reject client-authored money fields that are not the trusted server amount.
 * Callers pass trustedAmountMinor from server-side settlement — never from the browser.
 */
export function rejectClientTrustedMoneyFields(
  input: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
  for (const key of Object.keys(input)) {
    if (!ALLOWED_EXECUTION_INPUT_KEYS.has(key) && CLIENT_MONEY_KEY_RE.test(key)) {
      return {
        ok: false,
        message: "Client must not supply money fields to live payout executions.",
      };
    }
    // Explicit client aliases that must never be accepted as trusted money.
    if (
      key === "amountMinor" ||
      key === "amount_minor" ||
      key === "clientAmountMinor" ||
      key === "client_amount_minor"
    ) {
      return {
        ok: false,
        message: "Client must not supply money fields to live payout executions.",
      };
    }
  }
  return { ok: true };
}

export function validateTrustedAmountMinor(
  trustedAmountMinor: unknown
): { ok: true; trustedAmountMinor: number } | { ok: false; message: string } {
  if (
    typeof trustedAmountMinor !== "number" ||
    !Number.isInteger(trustedAmountMinor) ||
    trustedAmountMinor <= 0
  ) {
    return { ok: false, message: "trusted_amount_minor must be an integer > 0." };
  }
  return { ok: true, trustedAmountMinor };
}

export function validateIdempotencyKey(
  idempotencyKey: string | null | undefined
): { ok: true; idempotencyKey: string } | { ok: false; message: string } {
  if (!idempotencyKey || typeof idempotencyKey !== "string") {
    return { ok: false, message: "idempotency_key is required." };
  }
  const key = idempotencyKey.trim();
  if (key.length < 8 || key.length > 128) {
    return { ok: false, message: "idempotency_key must be 8..128 characters." };
  }
  return { ok: true, idempotencyKey: key };
}

export function validateSafeProviderRef(
  providerRef: string | null | undefined
): { ok: true; providerRef: string | null } | { ok: false; message: string } {
  if (providerRef == null || providerRef === "") {
    return { ok: true, providerRef: null };
  }
  if (typeof providerRef !== "string") {
    return { ok: false, message: "provider_ref is invalid." };
  }
  const pref = providerRef.trim();
  if (UNSAFE_DIGIT_RUN_RE.test(pref)) {
    return {
      ok: false,
      message: "provider_ref must not contain long digit runs.",
    };
  }
  return { ok: true, providerRef: pref };
}

export function parseSellerLivePayoutExecution(
  raw: unknown
): SellerLivePayoutExecution | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = str(row.id);
  const storeId = str(row.store_id);
  const captureEventId = str(row.capture_event_id);
  const destinationId = str(row.destination_id);
  const providerId = str(row.provider_id);
  if (
    !isUuid(id) ||
    !isUuid(storeId) ||
    !isUuid(captureEventId) ||
    !isUuid(destinationId)
  ) {
    return null;
  }
  if (
    providerId !== "manual_ops_live" &&
    providerId !== "stripe_connect"
  ) {
    return null;
  }
  const status = str(row.status) as SellerLivePayoutExecutionStatus;
  const providerRef =
    row.provider_ref == null ? null : str(row.provider_ref);
  if (providerRef && UNSAFE_DIGIT_RUN_RE.test(providerRef)) return null;

  return {
    id,
    storeId,
    captureEventId,
    destinationId,
    providerId: providerId as SellerLivePayoutProviderId,
    status,
    trustedAmountMinor: num(row.trusted_amount_minor),
    currency: str(row.currency).toUpperCase(),
    providerRef,
    failureCode: row.failure_code == null ? null : str(row.failure_code),
    failureMessageSafe:
      row.failure_message_safe == null ? null : str(row.failure_message_safe),
    attestationDecision:
      row.attestation_decision == null ? null : str(row.attestation_decision),
    attestationRef:
      row.attestation_ref == null ? null : str(row.attestation_ref),
    attestedAt: row.attested_at == null ? null : str(row.attested_at),
    note: row.note == null ? null : str(row.note),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

function mapExecutionRpcError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("authentication required")) return "Sign in required.";
  if (m.includes("not authorized")) {
    return "You cannot view payout executions for this store.";
  }
  if (m.includes("idempotency conflict")) {
    return "Idempotency conflict for payout execution.";
  }
  if (m.includes("illegal execution transition")) {
    return "Illegal live payout execution transition.";
  }
  if (m.includes("terminal execution status")) {
    return "Terminal execution status cannot transition.";
  }
  if (m.includes("initial status not allowed")) {
    return "Initial execution status is not allowed.";
  }
  if (m.includes("destination not found")) {
    return "Destination not found for store.";
  }
  if (m.includes("execution not found")) {
    return "Execution not found.";
  }
  if (m.includes("function") && m.includes("does not exist")) {
    return "Live payout executions are unavailable until the migration is applied.";
  }
  return message || "Could not manage payout execution.";
}

async function rpcJson(
  supabase: AnyClient,
  fn: string,
  args: Record<string, unknown>
): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    return { ok: false, message: mapExecutionRpcError(error.message) };
  }
  return { ok: true, data };
}

export type InsertSellerLivePayoutExecutionInput = {
  storeId: string;
  captureEventId: string;
  destinationId: string;
  /** Defaults to Manual Ops Live. */
  providerId?: SellerLivePayoutProviderId;
  /** Server-trusted amount only — never a client money field. */
  trustedAmountMinor: number;
  currency: string;
  idempotencyKey: string;
  /** Durable-compatible initial status. Default: awaiting_attestation for Manual Ops. */
  status?: SellerLivePayoutInitialExecutionStatus;
  providerRef?: string | null;
  note?: string | null;
};

/**
 * Service-role insert via S2 RPC. Preserves idempotency (replay returns same row).
 * Never treats insert alone as succeeded.
 */
export async function serviceInsertStorePayoutExecution(
  supabase: AnyClient,
  input: InsertSellerLivePayoutExecutionInput
): Promise<
  | {
      ok: true;
      replayed: boolean;
      execution: SellerLivePayoutExecution;
    }
  | { ok: false; message: string }
> {
  const moneyGuard = rejectClientTrustedMoneyFields(
    input as unknown as Record<string, unknown>
  );
  if (!moneyGuard.ok) return moneyGuard;

  if (!isUuid(input.storeId)) {
    return { ok: false, message: "store_id is invalid." };
  }
  if (!isUuid(input.captureEventId)) {
    return { ok: false, message: "capture_event_id is invalid." };
  }
  if (!isUuid(input.destinationId)) {
    return { ok: false, message: "destination_id is invalid." };
  }

  const amount = validateTrustedAmountMinor(input.trustedAmountMinor);
  if (!amount.ok) return amount;

  const currency =
    typeof input.currency === "string"
      ? input.currency.trim().toUpperCase()
      : "";
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { ok: false, message: "currency must be a 3-letter ISO code." };
  }

  const idem = validateIdempotencyKey(input.idempotencyKey);
  if (!idem.ok) return idem;

  const providerId = input.providerId ?? SELLER_LIVE_PAYOUT_V1_PROVIDER_ID;
  if (providerId !== SELLER_LIVE_PAYOUT_V1_PROVIDER_ID) {
    return {
      ok: false,
      message: "Only manual_ops_live executions are allowed in V1.",
    };
  }

  const status: SellerLivePayoutInitialExecutionStatus =
    input.status ?? "awaiting_attestation";
  if (
    !(SELLER_LIVE_PAYOUT_INITIAL_EXECUTION_STATUSES as readonly string[]).includes(
      status
    )
  ) {
    return { ok: false, message: "Initial execution status is not allowed." };
  }
  // Never allow callers to smuggle "succeeded" as an insert status.
  if (status === ("succeeded" as string)) {
    return {
      ok: false,
      message: "Execution create must not report succeeded.",
    };
  }

  const pref = validateSafeProviderRef(input.providerRef ?? null);
  if (!pref.ok) return pref;

  const res = await rpcJson(
    supabase,
    SELLER_LIVE_PAYOUT_EXECUTION_RPCS.serviceInsert,
    {
      p_store_id: input.storeId,
      p_capture_event_id: input.captureEventId,
      p_destination_id: input.destinationId,
      p_provider_id: providerId,
      p_trusted_amount_minor: amount.trustedAmountMinor,
      p_currency: currency,
      p_idempotency_key: idem.idempotencyKey,
      p_status: status,
      p_provider_ref: pref.providerRef,
      p_note: input.note ?? null,
    }
  );
  if (!res.ok) return res;

  const payload = (res.data ?? {}) as Record<string, unknown>;
  const parsed = parseSellerLivePayoutExecution(payload.execution);
  if (!parsed) {
    return { ok: false, message: "Execution response is invalid." };
  }
  if (parsed.status === "succeeded" && payload.replayed !== true) {
    // Fresh create must never land as succeeded (Manual Ops requires attestation).
    return {
      ok: false,
      message: "Execution create must not report succeeded.",
    };
  }
  return {
    ok: true,
    replayed: Boolean(payload.replayed),
    execution: parsed,
  };
}

export type UpdateSellerLivePayoutExecutionInput = {
  executionId: string;
  /** Current durable status — used for fail-closed client-side guard. */
  fromStatus: SellerLivePayoutExecutionStatus;
  status: SellerLivePayoutExecutionStatus;
  providerRef?: string | null;
  failureCode?: SellerLivePayoutFailureCode | string | null;
  failureMessageSafe?: string | null;
  payoutSubmitEventId?: string | null;
  note?: string | null;
};

/**
 * Service-role update via S2 RPC. Fail-closed on illegal transitions.
 */
export async function serviceUpdateStorePayoutExecution(
  supabase: AnyClient,
  input: UpdateSellerLivePayoutExecutionInput
): Promise<
  | { ok: true; execution: SellerLivePayoutExecution }
  | { ok: false; message: string }
> {
  if (!isUuid(input.executionId)) {
    return { ok: false, message: "execution_id is invalid." };
  }

  if (
    !isSellerLivePayoutExecutionTransitionAllowed(
      input.fromStatus,
      input.status
    )
  ) {
    return { ok: false, message: "Illegal live payout execution transition." };
  }

  const pref = validateSafeProviderRef(input.providerRef ?? null);
  if (!pref.ok) return pref;

  if (
    input.payoutSubmitEventId != null &&
    input.payoutSubmitEventId !== "" &&
    !isUuid(input.payoutSubmitEventId)
  ) {
    return { ok: false, message: "payout_submit_event_id is invalid." };
  }

  const res = await rpcJson(
    supabase,
    SELLER_LIVE_PAYOUT_EXECUTION_RPCS.serviceUpdate,
    {
      p_execution_id: input.executionId,
      p_status: input.status,
      p_provider_ref: pref.providerRef,
      p_failure_code: input.failureCode ?? null,
      p_failure_message_safe: input.failureMessageSafe ?? null,
      p_payout_submit_event_id: input.payoutSubmitEventId ?? null,
      p_note: input.note ?? null,
    }
  );
  if (!res.ok) return res;

  const payload = (res.data ?? {}) as Record<string, unknown>;
  const parsed = parseSellerLivePayoutExecution(payload.execution);
  if (!parsed) {
    return { ok: false, message: "Execution response is invalid." };
  }
  return { ok: true, execution: parsed };
}

/**
 * Seller read of one execution via S2 RPC (safe projection).
 */
export async function getMyStorePayoutExecution(
  supabase: AnyClient,
  storeId: string,
  executionId: string
): Promise<
  | { ok: true; execution: SellerLivePayoutExecution }
  | { ok: false; message: string }
> {
  if (!isUuid(storeId)) {
    return { ok: false, message: "store_id is invalid." };
  }
  if (!isUuid(executionId)) {
    return { ok: false, message: "execution_id is invalid." };
  }

  const res = await rpcJson(supabase, SELLER_LIVE_PAYOUT_EXECUTION_RPCS.getMine, {
    p_store_id: storeId,
    p_execution_id: executionId,
  });
  if (!res.ok) return res;

  const payload = (res.data ?? {}) as Record<string, unknown>;
  const parsed = parseSellerLivePayoutExecution(payload.execution);
  if (!parsed) {
    return { ok: false, message: "Execution response is invalid." };
  }
  return { ok: true, execution: parsed };
}

/**
 * Map Manual Ops transfer result status → durable execution status.
 * createTransfer never maps to succeeded by itself.
 */
export function mapTransferStatusToDurableExecutionStatus(
  transferStatus: "pending" | "succeeded" | "failed" | "uncertain"
): SellerLivePayoutExecutionStatus {
  if (transferStatus === "pending") return "awaiting_attestation";
  if (transferStatus === "failed") return "failed";
  if (transferStatus === "uncertain") return "uncertain";
  // succeeded is only after attestation — callers must not use createTransfer for that.
  return "uncertain";
}
