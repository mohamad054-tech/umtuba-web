/**
 * Provider money orchestration against a committed ledger reservation.
 *
 * Production path resolves trusted Stripe PaymentIntent server-side.
 * Uncertain / executing never blind-resubmit.
 *
 * Does NOT: compensate, Sync partial, restock, entitlement, settlement,
 * commission, payout, or commerce_confirm.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluateStripeLiveCaptureConfigForTests } from "../stripeConfig";
import { evaluatePartialRefundProviderMoneyExecutionMode } from "./executionMode";
import { failedProviderExecutionRetryBlockedMessage } from "./failedRetryPolicy";
import { evaluatePartialRefundProviderMoneyGate } from "./gate";
import {
  assertPartialRefundProviderIdempotencyKey,
  buildPartialRefundProviderIdempotencyKey,
} from "./idempotency";
import type { PartialRefundProviderPort } from "./providerPort";
import type { PartialRefundProviderExecutionRepository } from "./repository";
import { resolveTrustedStripePaymentIntentRef } from "./resolveTrustedPaymentIntent";
import {
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
  assertPositiveMinorAmount,
  failProviderMoney,
  isProviderMoneyUuid,
  isStripePaymentIntentRef,
  normalizeCurrency,
  okProviderMoney,
  rejectClientProviderMoneyFields,
} from "./validate";

type AnyClient = SupabaseClient;

export type CommittedLedgerFactsForProviderMoney = {
  ledgerId: string;
  storeId: string;
  orderId: string;
  paymentAttemptId: string;
  captureEventId: string;
  status: "committed";
  refundAmountMinor: number;
  currency: string;
};

export type ExecutePartialRefundProviderMoneySuccess = {
  phase:
    | "succeeded"
    | "failed"
    | "uncertain"
    | "replayed_succeeded"
    | "recovery_required";
  replayed: boolean;
  providerCalled: boolean;
  providerSubmitCalled: boolean;
  execution: PartialRefundProviderExecutionRecord;
  idempotencyKey: string;
  trustedPaymentIntentId: string | null;
} & PartialRefundProviderMoneyNonEvents;

export type ExecutePartialRefundProviderMoneyDeps = {
  repository: PartialRefundProviderExecutionRepository;
  env?: Record<string, string | undefined>;
  nowMs?: number;
  staleAfterMs?: number;
  resolveProviderPort?: (
    env: Record<string, string | undefined>
  ) => PartialRefundProviderPort | null;
  evaluateDedicatedGate?: typeof evaluatePartialRefundProviderMoneyGate;
  evaluateStripeConfig?: typeof evaluateStripeLiveCaptureConfigForTests;
};

function defaultResolvePort(
  env: Record<string, string | undefined>
): PartialRefundProviderPort | null {
  const dedicated = evaluatePartialRefundProviderMoneyGate(env);
  if (!dedicated.ok) return null;
  const stripe = evaluateStripeLiveCaptureConfigForTests(env);
  if (!stripe.ok) return null;
  const mode = evaluatePartialRefundProviderMoneyExecutionMode(env);
  if (!mode.ok) return null;
  return createStripePartialRefundProviderPort({ env });
}

/**
 * First-time submit gates: dedicated gate + Stripe config + execution-mode allowlist.
 * Recovery/lookup does NOT use this function.
 */
export function assertPartialRefundProviderMoneyExecutionGates(
  env: Record<string, string | undefined> = process.env
):
  | { ok: true }
  | {
      ok: false;
      code: string;
      message: string;
    } {
  const dedicated = evaluatePartialRefundProviderMoneyGate(env);
  if (!dedicated.ok) {
    return {
      ok: false,
      code: "gate_disabled",
      message: dedicated.message,
    };
  }
  const stripe = evaluateStripeLiveCaptureConfigForTests(env);
  if (!stripe.ok) {
    return {
      ok: false,
      code: "stripe_config_unavailable",
      message: stripe.message,
    };
  }
  const mode = evaluatePartialRefundProviderMoneyExecutionMode(env);
  if (!mode.ok) {
    return {
      ok: false,
      code: mode.code,
      message: mode.message,
    };
  }
  return { ok: true };
}

/**
 * Low-level execute using an already-trusted PaymentIntent id.
 * Prefer `executeCommittedPartialRefundProviderMoney` for production.
 */
export async function executePartialRefundProviderMoney(
  input: {
    ledger: CommittedLedgerFactsForProviderMoney;
    /** Must already be trusted (resolver or test fixture). */
    trustedProviderPaymentRef: string;
    operatorUserId?: string | null;
    operatorReasonSafe?: string | null;
    clientBag?: Record<string, unknown>;
    expectedStoreId?: string | null;
  },
  deps: ExecutePartialRefundProviderMoneyDeps
): Promise<
  PartialRefundProviderMoneyResult<ExecutePartialRefundProviderMoneySuccess>
> {
  const env = deps.env ?? process.env;
  const nowMs = deps.nowMs ?? Date.now();
  const staleAfterMs =
    deps.staleAfterMs ?? PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS;
  const evaluateGate =
    deps.evaluateDedicatedGate ?? evaluatePartialRefundProviderMoneyGate;
  const evaluateStripe =
    deps.evaluateStripeConfig ?? evaluateStripeLiveCaptureConfigForTests;
  const resolvePort = deps.resolveProviderPort ?? defaultResolvePort;

  if (input.clientBag) {
    const money = rejectClientProviderMoneyFields(input.clientBag);
    if (!money.ok) {
      return failProviderMoney("client_money_rejected", money.message);
    }
    for (const key of Object.keys(input.clientBag)) {
      if (
        /providerPaymentRef|provider_payment_ref|paymentIntent|payment_intent|^pi_/i.test(
          key
        )
      ) {
        return failProviderMoney(
          "client_money_rejected",
          "Client must not supply provider payment references."
        );
      }
    }
  }

  const ledger = input.ledger;
  if (
    !isProviderMoneyUuid(ledger.ledgerId) ||
    !isProviderMoneyUuid(ledger.storeId) ||
    !isProviderMoneyUuid(ledger.orderId) ||
    !isProviderMoneyUuid(ledger.paymentAttemptId) ||
    !isProviderMoneyUuid(ledger.captureEventId)
  ) {
    return failProviderMoney("malformed_id", "Ledger ownership ids malformed.");
  }
  if (ledger.status !== "committed") {
    return failProviderMoney(
      "invalid_state",
      "Provider money requires a committed ledger reservation."
    );
  }
  if (
    input.expectedStoreId != null &&
    input.expectedStoreId.trim() !== "" &&
    ledger.storeId !== input.expectedStoreId.trim()
  ) {
    return failProviderMoney(
      "missing_ownership",
      "Ledger does not belong to expected store."
    );
  }

  const amountCheck = assertPositiveMinorAmount(ledger.refundAmountMinor);
  if (!amountCheck.ok) {
    return failProviderMoney("zero_amount", amountCheck.message);
  }
  const currency = normalizeCurrency(ledger.currency);
  if (!currency) {
    return failProviderMoney("currency_mismatch", "Invalid ledger currency.");
  }
  if (!isStripePaymentIntentRef(input.trustedProviderPaymentRef)) {
    return failProviderMoney(
      "missing_provider_payment_ref",
      "Trusted Stripe PaymentIntent reference is required."
    );
  }

  const idem = assertPartialRefundProviderIdempotencyKey(
    ledger.ledgerId,
    buildPartialRefundProviderIdempotencyKey(ledger.ledgerId)
  );
  if (!idem.ok) {
    return failProviderMoney("malformed_idempotency_key", idem.message);
  }

  const dedicated = evaluateGate(env);
  if (!dedicated.ok) {
    return failProviderMoney("gate_disabled", dedicated.message);
  }
  const stripe = evaluateStripe(env);
  if (!stripe.ok) {
    return failProviderMoney("stripe_config_unavailable", stripe.message);
  }
  const executionMode = evaluatePartialRefundProviderMoneyExecutionMode(env);
  if (!executionMode.ok) {
    return failProviderMoney(executionMode.code, executionMode.message);
  }

  const claimed = await deps.repository.claim({
    storeId: ledger.storeId,
    ledgerId: ledger.ledgerId,
    orderId: ledger.orderId,
    paymentAttemptId: ledger.paymentAttemptId,
    captureEventId: ledger.captureEventId,
    providerKind: "stripe",
    providerPaymentRef: input.trustedProviderPaymentRef.trim(),
    trustedAmountMinor: ledger.refundAmountMinor,
    currency,
    idempotencyKey: idem.key,
    operatorUserId: input.operatorUserId ?? null,
    operatorReasonSafe: input.operatorReasonSafe ?? null,
    ledgerStatus: "committed",
    ledgerRefundAmountMinor: ledger.refundAmountMinor,
    ledgerCurrency: currency,
  });
  if (!claimed.ok) {
    return failProviderMoney(claimed.code, claimed.message);
  }

  let execution = claimed.execution;
  const pi = input.trustedProviderPaymentRef.trim();

  if (execution.status === "succeeded") {
    return okProviderMoney({
      phase: claimed.replayed ? "replayed_succeeded" : "succeeded",
      replayed: true,
      providerCalled: false,
      providerSubmitCalled: false,
      execution,
      idempotencyKey: idem.key,
      trustedPaymentIntentId: pi,
      ...PROVIDER_MONEY_NON_EVENTS,
    });
  }

  if (execution.status === "uncertain") {
    return okProviderMoney({
      phase: "recovery_required",
      replayed: true,
      providerCalled: false,
      providerSubmitCalled: false,
      execution,
      idempotencyKey: idem.key,
      trustedPaymentIntentId: pi,
      ...PROVIDER_MONEY_NON_EVENTS,
    });
  }

  if (execution.status === "executing") {
    // Crash window: never blind-resubmit. Route to recovery (stale) or wait.
    void isStaleExecutingProviderExecution(execution, nowMs, staleAfterMs);
    return okProviderMoney({
      phase: "recovery_required",
      replayed: true,
      providerCalled: false,
      providerSubmitCalled: false,
      execution,
      idempotencyKey: idem.key,
      trustedPaymentIntentId: pi,
      ...PROVIDER_MONEY_NON_EVENTS,
    });
  }

  if (execution.status === "failed") {
    return failProviderMoney(
      "invalid_state",
      failedProviderExecutionRetryBlockedMessage()
    );
  }

  // planned → execute once (first-time submit; still requires both gates)
  const port = resolvePort(env);
  if (!port) {
    return failProviderMoney(
      "gate_disabled",
      "Provider port unavailable (gates or config)."
    );
  }

  const toExecuting = await deps.repository.update({
    executionId: execution.executionId,
    fromStatus: "planned",
    toStatus: "executing",
    providerPaymentRef: pi,
  });
  if (!toExecuting.ok) {
    return failProviderMoney(toExecuting.code, toExecuting.message);
  }
  execution = toExecuting.execution;

  const outcome = await port.submitPartialRefund({
    providerPaymentRef: pi,
    amountMinor: ledger.refundAmountMinor,
    currency,
    idempotencyKey: idem.key,
  });

  if (outcome.kind === "succeeded") {
    if (
      outcome.amountMinor !== ledger.refundAmountMinor ||
      normalizeCurrency(outcome.currency) !== currency
    ) {
      const uncertain = await deps.repository.update({
        executionId: execution.executionId,
        fromStatus: "executing",
        toStatus: "uncertain",
        providerRefundId: outcome.providerRefundId,
        providerStatusSafe: outcome.providerStatusSafe,
        failureCode: "provider_amount_currency_mismatch",
        failureMessageSafe:
          "Provider refund amount/currency did not match ledger.",
      });
      if (!uncertain.ok) {
        return failProviderMoney(uncertain.code, uncertain.message);
      }
      return okProviderMoney({
        phase: "uncertain",
        replayed: false,
        providerCalled: true,
        providerSubmitCalled: true,
        execution: uncertain.execution,
        idempotencyKey: idem.key,
        trustedPaymentIntentId: pi,
        ...PROVIDER_MONEY_NON_EVENTS,
      });
    }

    const succeeded = await deps.repository.update({
      executionId: execution.executionId,
      fromStatus: "executing",
      toStatus: "succeeded",
      providerRefundId: outcome.providerRefundId,
      providerStatusSafe: outcome.providerStatusSafe,
    });
    if (!succeeded.ok) {
      return failProviderMoney(succeeded.code, succeeded.message);
    }
    return okProviderMoney({
      phase: "succeeded",
      replayed: false,
      providerCalled: true,
      providerSubmitCalled: true,
      execution: succeeded.execution,
      idempotencyKey: idem.key,
      trustedPaymentIntentId: pi,
      ...PROVIDER_MONEY_NON_EVENTS,
    });
  }

  if (outcome.kind === "failed") {
    const failed = await deps.repository.update({
      executionId: execution.executionId,
      fromStatus: "executing",
      toStatus: "failed",
      providerRefundId: outcome.providerRefundId ?? null,
      providerStatusSafe: outcome.providerStatusSafe ?? null,
      failureCode: outcome.failureCode,
      failureMessageSafe: outcome.failureMessageSafe.slice(0, 500),
    });
    if (!failed.ok) {
      return failProviderMoney(failed.code, failed.message);
    }
    return okProviderMoney({
      phase: "failed",
      replayed: false,
      providerCalled: true,
      providerSubmitCalled: true,
      execution: failed.execution,
      idempotencyKey: idem.key,
      trustedPaymentIntentId: pi,
      ...PROVIDER_MONEY_NON_EVENTS,
    });
  }

  const uncertain = await deps.repository.update({
    executionId: execution.executionId,
    fromStatus: "executing",
    toStatus: "uncertain",
    providerRefundId: outcome.providerRefundId ?? null,
    providerStatusSafe: outcome.providerStatusSafe ?? null,
    failureCode: outcome.failureCode,
    failureMessageSafe: outcome.failureMessageSafe.slice(0, 500),
  });
  if (!uncertain.ok) {
    return failProviderMoney(uncertain.code, uncertain.message);
  }
  return okProviderMoney({
    phase: "uncertain",
    replayed: false,
    providerCalled: true,
    providerSubmitCalled: true,
    execution: uncertain.execution,
    idempotencyKey: idem.key,
    trustedPaymentIntentId: pi,
    ...PROVIDER_MONEY_NON_EVENTS,
  });
}

/**
 * Production execute path: resolves trusted PI from capture/attempt facts.
 * Rejects any client-supplied provider reference.
 */
export async function executeCommittedPartialRefundProviderMoney(
  input: {
    ledger: CommittedLedgerFactsForProviderMoney;
    factClient: AnyClient;
    operatorUserId?: string | null;
    operatorReasonSafe?: string | null;
    clientBag?: Record<string, unknown>;
    expectedStoreId?: string | null;
    /** Forbidden — if present, fail closed. */
    clientProviderPaymentRef?: string | null;
  },
  deps: ExecutePartialRefundProviderMoneyDeps
): Promise<
  PartialRefundProviderMoneyResult<ExecutePartialRefundProviderMoneySuccess>
> {
  const resolved = await resolveTrustedStripePaymentIntentRef(input.factClient, {
    storeId: input.ledger.storeId,
    orderId: input.ledger.orderId,
    paymentAttemptId: input.ledger.paymentAttemptId,
    captureEventId: input.ledger.captureEventId,
    clientProviderPaymentRef: input.clientProviderPaymentRef,
  });
  if (!resolved.ok) {
    return failProviderMoney(resolved.code, resolved.message);
  }

  return executePartialRefundProviderMoney(
    {
      ledger: input.ledger,
      trustedProviderPaymentRef: resolved.paymentIntentId,
      operatorUserId: input.operatorUserId,
      operatorReasonSafe: input.operatorReasonSafe,
      clientBag: input.clientBag,
      expectedStoreId: input.expectedStoreId,
    },
    deps
  );
}
