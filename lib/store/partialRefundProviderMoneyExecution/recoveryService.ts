/**
 * Uncertain / stale-executing recovery — LOOKUP ONLY.
 * Never calls submitPartialRefund. Never compensates. Never mints a new key.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluateStripeLiveCaptureConfigForTests } from "../stripeConfig";
import type { PartialRefundProviderPort } from "./providerPort";
import type { PartialRefundProviderExecutionRepository } from "./repository";
import { resolveTrustedStripePaymentIntentRef } from "./resolveTrustedPaymentIntent";
import {
  isRecoveryEligibleProviderExecution,
  isStaleExecutingProviderExecution,
  PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS,
} from "./staleExecuting";
import { createStripePartialRefundProviderPort } from "./stripeAdapter";
import {
  PROVIDER_MONEY_NON_EVENTS,
  type PartialRefundProviderExecutionRecord,
  type PartialRefundProviderMoneyNonEvents,
  type PartialRefundProviderMoneyResult,
} from "./types";
import {
  failProviderMoney,
  isProviderMoneyUuid,
  isStripePaymentIntentRef,
  okProviderMoney,
} from "./validate";

type AnyClient = SupabaseClient;

export type RecoverPartialRefundProviderMoneySuccess = {
  phase: "succeeded" | "failed" | "uncertain" | "replayed_succeeded" | "recovery_required";
  replayed: boolean;
  /** True only when lookupPartialRefund was invoked (never submit). */
  providerLookupCalled: boolean;
  providerSubmitCalled: false;
  execution: PartialRefundProviderExecutionRecord;
  idempotencyKey: string;
  recoveryEligible: boolean;
} & PartialRefundProviderMoneyNonEvents;

export type RecoverPartialRefundProviderMoneyDeps = {
  repository: PartialRefundProviderExecutionRepository;
  env?: Record<string, string | undefined>;
  nowMs?: number;
  staleAfterMs?: number;
  resolveProviderPort?: (
    env: Record<string, string | undefined>
  ) => PartialRefundProviderPort | null;
  evaluateStripeConfig?: typeof evaluateStripeLiveCaptureConfigForTests;
  /** Optional fact client to refresh trusted PI when execution ref missing. */
  factClient?: AnyClient | null;
};

/**
 * Lookup requires Stripe config only (no money movement).
 * Dedicated submit gate is intentionally NOT required.
 */
export function assertPartialRefundProviderMoneyLookupGates(
  env: Record<string, string | undefined> = process.env
):
  | { ok: true }
  | { ok: false; code: "stripe_config_unavailable"; message: string } {
  const stripe = evaluateStripeLiveCaptureConfigForTests(env);
  if (!stripe.ok) {
    return {
      ok: false,
      code: "stripe_config_unavailable",
      message: stripe.message,
    };
  }
  return { ok: true };
}

function defaultLookupPort(
  env: Record<string, string | undefined>
): PartialRefundProviderPort | null {
  if (!assertPartialRefundProviderMoneyLookupGates(env).ok) return null;
  return createStripePartialRefundProviderPort({ env });
}

async function resolvePaymentRefForRecovery(
  execution: PartialRefundProviderExecutionRecord,
  factClient: AnyClient | null | undefined
): Promise<
  | { ok: true; paymentIntentId: string | null }
  | { ok: false; code: string; message: string }
> {
  if (
    execution.providerPaymentRef &&
    isStripePaymentIntentRef(execution.providerPaymentRef)
  ) {
    return { ok: true, paymentIntentId: execution.providerPaymentRef };
  }
  if (!factClient) {
    return { ok: true, paymentIntentId: null };
  }
  const resolved = await resolveTrustedStripePaymentIntentRef(factClient, {
    storeId: execution.storeId,
    orderId: execution.orderId,
    paymentAttemptId: execution.paymentAttemptId,
    captureEventId: execution.captureEventId,
  });
  if (!resolved.ok) {
    return {
      ok: false,
      code: resolved.code,
      message: resolved.message,
    };
  }
  return { ok: true, paymentIntentId: resolved.paymentIntentId };
}

/**
 * Dedicated recovery orchestration. LOOKUP ONLY — zero submit calls.
 */
export async function recoverPartialRefundProviderMoneyLookup(
  input: {
    storeId: string;
    ledgerId?: string | null;
    executionId?: string | null;
    expectedStoreId?: string | null;
  },
  deps: RecoverPartialRefundProviderMoneyDeps
): Promise<
  PartialRefundProviderMoneyResult<RecoverPartialRefundProviderMoneySuccess>
> {
  const env = deps.env ?? process.env;
  const nowMs = deps.nowMs ?? Date.now();
  const staleAfterMs =
    deps.staleAfterMs ?? PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS;
  const resolvePort = deps.resolveProviderPort ?? defaultLookupPort;

  if (!isProviderMoneyUuid(input.storeId)) {
    return failProviderMoney("malformed_id", "storeId malformed.");
  }
  if (
    input.expectedStoreId != null &&
    input.expectedStoreId.trim() !== "" &&
    input.storeId !== input.expectedStoreId.trim()
  ) {
    return failProviderMoney("missing_ownership", "Store ownership mismatch.");
  }

  const lookupGates = assertPartialRefundProviderMoneyLookupGates(env);
  if (!lookupGates.ok) {
    return failProviderMoney(lookupGates.code, lookupGates.message);
  }

  let existing: PartialRefundProviderExecutionRecord | null = null;
  if (input.executionId && isProviderMoneyUuid(input.executionId)) {
    existing =
      (deps.repository.getById
        ? await deps.repository.getById(input.executionId)
        : null) ?? null;
  } else if (input.ledgerId && isProviderMoneyUuid(input.ledgerId)) {
    existing = await deps.repository.getByLedger(input.ledgerId);
  } else {
    return failProviderMoney(
      "malformed_id",
      "executionId or ledgerId required."
    );
  }

  if (!existing) {
    return failProviderMoney("unknown_execution", "No execution found.");
  }
  if (existing.storeId !== input.storeId) {
    return failProviderMoney("missing_ownership", "Execution store mismatch.");
  }

  if (existing.status === "succeeded") {
    return okProviderMoney({
      phase: "replayed_succeeded",
      replayed: true,
      providerLookupCalled: false,
      providerSubmitCalled: false,
      execution: existing,
      idempotencyKey: existing.idempotencyKey,
      recoveryEligible: false,
      ...PROVIDER_MONEY_NON_EVENTS,
    });
  }

  if (existing.status === "executing") {
    if (!isStaleExecutingProviderExecution(existing, nowMs, staleAfterMs)) {
      return okProviderMoney({
        phase: "recovery_required",
        replayed: true,
        providerLookupCalled: false,
        providerSubmitCalled: false,
        execution: existing,
        idempotencyKey: existing.idempotencyKey,
        recoveryEligible: false,
        ...PROVIDER_MONEY_NON_EVENTS,
      });
    }
  } else if (existing.status !== "uncertain") {
    return failProviderMoney(
      "invalid_state",
      "Recovery lookup only applies to uncertain or stale executing executions."
    );
  }

  if (
    !isRecoveryEligibleProviderExecution(existing, nowMs, staleAfterMs)
  ) {
    return okProviderMoney({
      phase: "recovery_required",
      replayed: true,
      providerLookupCalled: false,
      providerSubmitCalled: false,
      execution: existing,
      idempotencyKey: existing.idempotencyKey,
      recoveryEligible: false,
      ...PROVIDER_MONEY_NON_EVENTS,
    });
  }

  const port = resolvePort(env);
  if (!port) {
    return failProviderMoney(
      "stripe_config_unavailable",
      "Provider lookup port unavailable."
    );
  }

  const paymentRef = await resolvePaymentRefForRecovery(
    existing,
    deps.factClient
  );
  if (!paymentRef.ok) {
    return failProviderMoney(paymentRef.code, paymentRef.message);
  }

  // LOOKUP ONLY — never submitPartialRefund.
  const outcome = await port.lookupPartialRefund({
    providerRefundId: existing.providerRefundId,
    providerPaymentRef: paymentRef.paymentIntentId,
    idempotencyKey: existing.idempotencyKey,
  });

  if (outcome.kind === "succeeded") {
    const succeeded = await deps.repository.update({
      executionId: existing.executionId,
      fromStatus: existing.status,
      toStatus: "succeeded",
      providerRefundId: outcome.providerRefundId,
      providerStatusSafe: outcome.providerStatusSafe,
      providerPaymentRef: paymentRef.paymentIntentId,
      touchLookup: true,
    });
    if (!succeeded.ok) {
      return failProviderMoney(succeeded.code, succeeded.message);
    }
    return okProviderMoney({
      phase: "succeeded",
      replayed: false,
      providerLookupCalled: true,
      providerSubmitCalled: false,
      execution: succeeded.execution,
      idempotencyKey: existing.idempotencyKey,
      recoveryEligible: true,
      ...PROVIDER_MONEY_NON_EVENTS,
    });
  }

  if (outcome.kind === "failed") {
    const failed = await deps.repository.update({
      executionId: existing.executionId,
      fromStatus: existing.status,
      toStatus: "failed",
      providerRefundId: outcome.providerRefundId ?? null,
      providerStatusSafe: outcome.providerStatusSafe ?? null,
      failureCode: outcome.failureCode,
      failureMessageSafe: outcome.failureMessageSafe.slice(0, 500),
      providerPaymentRef: paymentRef.paymentIntentId,
      touchLookup: true,
    });
    if (!failed.ok) {
      return failProviderMoney(failed.code, failed.message);
    }
    return okProviderMoney({
      phase: "failed",
      replayed: false,
      providerLookupCalled: true,
      providerSubmitCalled: false,
      execution: failed.execution,
      idempotencyKey: existing.idempotencyKey,
      recoveryEligible: true,
      ...PROVIDER_MONEY_NON_EVENTS,
    });
  }

  // Still unknown — remain uncertain (even if was stale executing).
  const uncertain = await deps.repository.update({
    executionId: existing.executionId,
    fromStatus: existing.status,
    toStatus: "uncertain",
    providerRefundId: outcome.providerRefundId ?? existing.providerRefundId,
    providerStatusSafe: outcome.providerStatusSafe ?? null,
    failureCode: outcome.failureCode,
    failureMessageSafe: outcome.failureMessageSafe.slice(0, 500),
    providerPaymentRef: paymentRef.paymentIntentId,
    touchLookup: true,
  });
  if (!uncertain.ok) {
    return failProviderMoney(uncertain.code, uncertain.message);
  }
  return okProviderMoney({
    phase: "uncertain",
    replayed: false,
    providerLookupCalled: true,
    providerSubmitCalled: false,
    execution: uncertain.execution,
    idempotencyKey: existing.idempotencyKey,
    recoveryEligible: true,
    ...PROVIDER_MONEY_NON_EVENTS,
  });
}
