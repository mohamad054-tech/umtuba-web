/**
 * Seller Live Payout action support (Slice S5).
 * Shared validation + safe projections for server actions.
 * Not a "use server" module — safe to unit-test without Next action boundaries.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { formatMinorUnits } from "../money";
import { rejectClientLivePayoutOrchestratorMoneyFields } from "./orchestrator";
import type { SellerLivePayoutOrchestratorResult } from "./orchestrator";
import type { SellerLivePayoutDestination } from "./destinations";
import type { SellerLivePayoutExecution } from "./executions";

const SENSITIVE_RESULT_KEY_RE =
  /secret|password|token|service.?role|iban|account_number|routing|pan|private_key|fingerprint|ueos_journal/i;

function looksLikeSecretKeyName(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    lower.includes("sk_" + "live") ||
    lower.includes("whsec") ||
    SENSITIVE_RESULT_KEY_RE.test(key)
  );
}

export type SellerLivePayoutActionFailure = {
  ok: false;
  message: string;
  code?: string;
  requiresAuth?: boolean;
};

export type SafeLivePayoutDestinationView = {
  id: string;
  storeId: string;
  providerId: string;
  currency: string;
  displayLabel: string;
  verificationState: string;
  isActive: boolean;
};

export type SafeLivePayoutExecutionView = {
  id: string;
  storeId: string;
  captureEventId: string;
  destinationId: string;
  providerId: string;
  status: string;
  currency: string;
  /** Trusted amount from server projection only — never a client input echo. */
  trustedAmountMinor: number;
  /** Server-formatted display amount (safe for UI). */
  amountDisplay: string;
  note: string | null;
  failureCode: string | null;
  failureMessageSafe: string | null;
  /** Masked destination label only. */
  destinationDisplayLabel: string | null;
  /** Idempotency / orchestration key — not a money field. */
  orchestrationKey: string | null;
  paymentAttemptId: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Reject client money / settlement / self-verify / secret fields on action inputs.
 */
export function rejectClientLivePayoutActionFields(
  input: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
  const orch = rejectClientLivePayoutOrchestratorMoneyFields(input);
  if (!orch.ok) return orch;

  for (const key of Object.keys(input)) {
    const lower = key.toLowerCase();
    if (
      lower === "amount" ||
      lower === "fee" ||
      lower === "commission" ||
      lower === "settlement_amount" ||
      lower === "settlementamount" ||
      lower === "amountminor" ||
      lower === "amount_minor" ||
      lower === "verification_state" ||
      lower === "verificationstate" ||
      lower === "verified" ||
      lower === "verified_at" ||
      lower === "rail" ||
      lower === "bank_account" ||
      lower === "beneficiary" ||
      lower === "account_number" ||
      lower === "iban" ||
      SENSITIVE_RESULT_KEY_RE.test(key)
    ) {
      // Destination currency / expectedCurrency assertion are allowed identifiers.
      if (
        key === "currency" ||
        key === "expectedCurrency" ||
        key === "storeId" ||
        key === "paymentAttemptId" ||
        key === "destinationId" ||
        key === "orchestrationKey" ||
        key === "executionId" ||
        key === "displayLabel" ||
        key === "requestReview" ||
        key === "attestationRef" ||
        key === "decision" ||
        key === "note" ||
        key === "status" ||
        key === "limit" ||
        key === "providerId"
      ) {
        continue;
      }
      return {
        ok: false,
        message:
          "Client must not supply money, verification, rail, or secret fields to live payout actions.",
      };
    }
  }

  // Explicit money smuggling even if named oddly.
  if (
    input.amount !== undefined ||
    input.amountMinor !== undefined ||
    input.amount_minor !== undefined ||
    input.fee !== undefined ||
    input.commission !== undefined ||
    input.settlement_amount !== undefined ||
    input.settlementAmount !== undefined
  ) {
    return {
      ok: false,
      message:
        "Client must not supply money, verification, rail, or secret fields to live payout actions.",
    };
  }

  if (
    input.verificationState !== undefined ||
    input.verification_state !== undefined ||
    input.verified === true ||
    input.verified === "verified"
  ) {
    return {
      ok: false,
      message: "Sellers cannot self-verify payout destinations.",
    };
  }

  return { ok: true };
}

export function projectSafeDestination(
  destination: SellerLivePayoutDestination
): SafeLivePayoutDestinationView {
  return {
    id: destination.id,
    storeId: destination.storeId,
    providerId: destination.providerId,
    currency: destination.currency,
    displayLabel: destination.displayLabel,
    verificationState: destination.verificationState,
    isActive: destination.isActive,
  };
}

export function formatSafeLivePayoutAmountDisplay(
  trustedAmountMinor: number,
  currency: string
): string {
  return formatMinorUnits(trustedAmountMinor, currency);
}

export function projectSafeExecution(
  execution: SellerLivePayoutExecution,
  extras?: Partial<
    Pick<
      SafeLivePayoutExecutionView,
      | "destinationDisplayLabel"
      | "orchestrationKey"
      | "paymentAttemptId"
      | "failureMessageSafe"
    >
  >
): SafeLivePayoutExecutionView {
  // Intentionally omit providerRef / attestationRef (may be ops-sensitive).
  return {
    id: execution.id,
    storeId: execution.storeId,
    captureEventId: execution.captureEventId,
    destinationId: execution.destinationId,
    providerId: execution.providerId,
    status: execution.status,
    currency: execution.currency,
    trustedAmountMinor: execution.trustedAmountMinor,
    amountDisplay: formatSafeLivePayoutAmountDisplay(
      execution.trustedAmountMinor,
      execution.currency
    ),
    note: execution.note,
    failureCode: execution.failureCode,
    failureMessageSafe:
      extras?.failureMessageSafe ?? execution.failureMessageSafe ?? null,
    destinationDisplayLabel: extras?.destinationDisplayLabel ?? null,
    orchestrationKey: extras?.orchestrationKey ?? null,
    paymentAttemptId: extras?.paymentAttemptId ?? null,
    createdAt: execution.createdAt,
    updatedAt: execution.updatedAt,
  };
}

/**
 * Enrich queue rows with masked destination label + orchestration identifiers.
 * Service-role only; never returns secrets or full account numbers.
 */
export async function enrichAdminLivePayoutQueueRows(
  service: SupabaseClient,
  rows: SafeLivePayoutExecutionView[]
): Promise<SafeLivePayoutExecutionView[]> {
  if (rows.length === 0) return rows;

  const ids = rows.map((r) => r.id);
  const { data: execRows } = await service
    .from("store_payout_executions")
    .select(
      "id, idempotency_key, destination_id, capture_event_id, failure_message_safe"
    )
    .in("id", ids);

  const destIds = Array.from(
    new Set(
      (execRows ?? [])
        .map((r) => String((r as { destination_id?: string }).destination_id ?? ""))
        .filter(Boolean)
    )
  );
  const captureIds = Array.from(
    new Set(
      (execRows ?? [])
        .map((r) =>
          String((r as { capture_event_id?: string }).capture_event_id ?? "")
        )
        .filter(Boolean)
    )
  );

  const { data: destinations } =
    destIds.length > 0
      ? await service
          .from("store_payout_destinations")
          .select("id, display_label")
          .in("id", destIds)
      : { data: [] as Array<{ id: string; display_label: string }> };

  const { data: captures } =
    captureIds.length > 0
      ? await service
          .from("store_payment_outcome_events")
          .select("id, payment_attempt_id")
          .in("id", captureIds)
      : { data: [] as Array<{ id: string; payment_attempt_id: string }> };

  const destLabelById = new Map<string, string>();
  for (const d of destinations ?? []) {
    const label = String(
      (d as { display_label?: string }).display_label ?? ""
    ).trim();
    // Fail closed: skip labels that look like unmasked account numbers.
    if (label && !/[0-9]{8,}/.test(label)) {
      destLabelById.set(String((d as { id: string }).id), label);
    }
  }

  const attemptByCapture = new Map<string, string>();
  for (const c of captures ?? []) {
    const attempt = String(
      (c as { payment_attempt_id?: string }).payment_attempt_id ?? ""
    );
    if (attempt) {
      attemptByCapture.set(String((c as { id: string }).id), attempt);
    }
  }

  const metaById = new Map<
    string,
    {
      orchestrationKey: string | null;
      failureMessageSafe: string | null;
      destinationId: string;
      captureEventId: string;
    }
  >();
  for (const row of execRows ?? []) {
    const r = row as {
      id: string;
      idempotency_key?: string;
      failure_message_safe?: string | null;
      destination_id?: string;
      capture_event_id?: string;
    };
    metaById.set(String(r.id), {
      orchestrationKey: r.idempotency_key ? String(r.idempotency_key) : null,
      failureMessageSafe:
        r.failure_message_safe == null ? null : String(r.failure_message_safe),
      destinationId: String(r.destination_id ?? ""),
      captureEventId: String(r.capture_event_id ?? ""),
    });
  }

  return rows.map((row) => {
    const meta = metaById.get(row.id);
    const destinationDisplayLabel = meta
      ? destLabelById.get(meta.destinationId) ?? null
      : row.destinationDisplayLabel;
    const paymentAttemptId = meta
      ? attemptByCapture.get(meta.captureEventId) ?? null
      : row.paymentAttemptId;
    return {
      ...row,
      amountDisplay: formatSafeLivePayoutAmountDisplay(
        row.trustedAmountMinor,
        row.currency
      ),
      destinationDisplayLabel,
      orchestrationKey: meta?.orchestrationKey ?? row.orchestrationKey,
      paymentAttemptId,
      failureMessageSafe:
        meta?.failureMessageSafe ?? row.failureMessageSafe ?? null,
    };
  });
}

export function projectSafeOrchestratorResult(
  result: SellerLivePayoutOrchestratorResult
):
  | {
      ok: true;
      phase: string;
      replayed: boolean;
      storeId: string;
      paymentAttemptId: string;
      captureEventId: string;
      currency: string;
      trustedAmountMinor: number;
      payoutState: string;
      orchestrationKey: string;
      note: string;
      execution: SafeLivePayoutExecutionView | null;
    }
  | SellerLivePayoutActionFailure {
  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      code: result.code,
    };
  }
  return {
    ok: true,
    phase: result.phase,
    replayed: result.replayed,
    storeId: result.storeId,
    paymentAttemptId: result.paymentAttemptId,
    captureEventId: result.captureEventId,
    currency: result.currency,
    trustedAmountMinor: result.trustedAmountMinor,
    payoutState: result.payoutState,
    orchestrationKey: result.orchestrationKey,
    note: result.note,
    execution: result.execution
      ? projectSafeExecution(result.execution)
      : null,
  };
}

export function assertNoSensitiveActionPayload(
  payload: unknown
): boolean {
  if (payload == null) return true;
  const json = JSON.stringify(payload);
  const liveKeyHint = "sk_" + "live_";
  const whsecHint = "whsec" + "_";
  if (
    json.includes(liveKeyHint) ||
    json.includes(whsecHint) ||
    json.includes("BEGIN " + "PRIVATE KEY") ||
    /service_role/i.test(json)
  ) {
    return false;
  }
  if (payload && typeof payload === "object") {
    for (const key of Object.keys(payload as Record<string, unknown>)) {
      if (looksLikeSecretKeyName(key)) return false;
      if (key === "providerRef" || key === "provider_ref") return false;
      if (key === "attestationRef" || key === "attestation_ref") return false;
    }
  }
  return true;
}

export function createLivePayoutServiceRoleClient():
  | { ok: true; supabase: SupabaseClient }
  | { ok: false; message: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return {
      ok: false,
      message: "Live payout operations are unavailable (server configuration).",
    };
  }
  return {
    ok: true,
    supabase: createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  };
}
