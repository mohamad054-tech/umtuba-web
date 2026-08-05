/**
 * Seller Live Payout action support (Slice S5).
 * Shared validation + safe projections for server actions.
 * Not a "use server" module — safe to unit-test without Next action boundaries.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
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
  note: string | null;
  failureCode: string | null;
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

export function projectSafeExecution(
  execution: SellerLivePayoutExecution
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
    note: execution.note,
    failureCode: execution.failureCode,
    createdAt: execution.createdAt,
    updatedAt: execution.updatedAt,
  };
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
