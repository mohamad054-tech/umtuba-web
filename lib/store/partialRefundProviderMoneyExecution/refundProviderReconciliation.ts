/**
 * Refund ↔ provider-money reconciliation runtime hardening (read-only).
 *
 * Deterministic LOCAL vs PROVIDER match classification from durable local
 * facts only. Does not invent external provider truth, call Stripe, write DB,
 * or enable gates.
 */

import {
  failedProviderExecutionRetryBlockedMessage,
  isFailedProviderExecutionRetryAllowedInV1,
  PARTIAL_REFUND_PROVIDER_MONEY_FAILED_RETRY_POLICY_V1,
} from "./failedRetryPolicy";
import {
  assertPartialRefundProviderIdempotencyKey,
  buildPartialRefundProviderIdempotencyKey,
} from "./idempotency";
import { deriveProviderMoneyLatestOperation } from "./observability";
import {
  isRecoveryEligibleProviderExecution,
  isStaleExecutingProviderExecution,
  PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS,
} from "./staleExecuting";
import { isTerminalProviderExecutionStatus } from "./stateMachine";
import type { PartialRefundProviderExecutionRecord } from "./types";

/** Durable local ledger / reservation state (explicit; no invented values). */
export const REFUND_PROVIDER_RECONCILIATION_LOCAL_STATES = [
  "planned",
  "committing",
  "committed",
  "failed",
  "compensated",
  "absent",
  "unknown",
] as const;

export type RefundProviderReconciliationLocalState =
  (typeof REFUND_PROVIDER_RECONCILIATION_LOCAL_STATES)[number];

/**
 * Provider-side state from durable execution row only.
 * Never claims live Stripe truth — only what the local execution record holds.
 */
export const REFUND_PROVIDER_RECONCILIATION_PROVIDER_STATES = [
  "none",
  "planned",
  "executing",
  "succeeded",
  "failed",
  "uncertain",
] as const;

export type RefundProviderReconciliationProviderState =
  (typeof REFUND_PROVIDER_RECONCILIATION_PROVIDER_STATES)[number];

export const REFUND_PROVIDER_RECONCILIATION_MATCH_STATUSES = [
  "matched_terminal_success",
  "matched_terminal_failure",
  "matched_pre_submit",
  "matched_awaiting_first_submit",
  "in_flight_awaiting_outcome",
  "local_committing_in_flight",
  "unknown_outcome",
  "mismatch_local_committed_provider_failed",
  "mismatch_local_committed_provider_absent",
  "mismatch_local_failed_provider_succeeded",
  "mismatch_local_compensated_provider_non_terminal",
  "mismatch_stale_executing",
  "mismatch_idempotency_key",
  "insufficient_local_facts",
] as const;

export type RefundProviderReconciliationMatchStatus =
  (typeof REFUND_PROVIDER_RECONCILIATION_MATCH_STATUSES)[number];

export type RefundProviderReconciliationOperatorAction =
  | "none"
  | "run_recovery_lookup"
  | "review_mismatch"
  | "use_stuck_committing_recovery"
  | "first_time_submit_candidate"
  | "await_in_flight"
  | "no_action_terminal";

export type RefundProviderReconciliationSnapshot = {
  LOCAL_STATE: RefundProviderReconciliationLocalState;
  PROVIDER_STATE: RefundProviderReconciliationProviderState;
  MATCH_STATUS: RefundProviderReconciliationMatchStatus;
  RECONCILIATION_REQUIRED: boolean;
  RETRY_SAFE: boolean;
  OPERATOR_ACTION_REQUIRED: boolean;
  operatorAction: RefundProviderReconciliationOperatorAction;
  operatorMessage: string;
  retryPolicyV1: typeof PARTIAL_REFUND_PROVIDER_MONEY_FAILED_RETRY_POLICY_V1;
  identities: {
    ledgerId: string | null;
    executionId: string | null;
    orderId: string | null;
    paymentAttemptId: string | null;
    storeId: string | null;
    idempotencyKey: string | null;
    expectedIdempotencyKey: string | null;
    providerRefundId: string | null;
    providerStatusSafe: string | null;
  };
  evidence: {
    localStatusRaw: string | null;
    providerExecutionStatus: string | null;
    providerSubmissionAttempted: boolean;
    providerResultPresent: boolean;
    terminalCompletion: boolean;
    recoveryEligible: boolean;
    staleExecuting: boolean;
    duplicateReplayBound: boolean;
    latestOperation: "SUBMIT" | "LOOKUP" | "NONE";
    classificationReason: string;
  };
};

export type BuildRefundProviderReconciliationInput = {
  /** Durable ledger/reservation status when known. */
  localLedgerStatus?: string | null;
  /** Durable provider execution row when present. */
  execution?: PartialRefundProviderExecutionRecord | null;
  /** Ledger id when execution row is absent. */
  ledgerId?: string | null;
  storeId?: string | null;
  orderId?: string | null;
  paymentAttemptId?: string | null;
  nowMs?: number;
  staleAfterMs?: number;
};

function normalizeLocalState(
  raw: string | null | undefined
): RefundProviderReconciliationLocalState {
  if (raw == null || raw === "") return "absent";
  const s = raw.trim().toLowerCase();
  if (
    s === "planned" ||
    s === "committing" ||
    s === "committed" ||
    s === "failed" ||
    s === "compensated"
  ) {
    return s;
  }
  return "unknown";
}

function deriveProviderState(
  execution: PartialRefundProviderExecutionRecord | null | undefined
): RefundProviderReconciliationProviderState {
  if (!execution) return "none";
  return execution.status;
}

function submissionAttempted(
  row: PartialRefundProviderExecutionRecord | null | undefined
): boolean {
  if (!row) return false;
  if (row.startedAtIso) return true;
  if (row.status === "executing" || row.status === "succeeded") return true;
  if (row.status === "uncertain") return true;
  if (row.status === "failed" && Boolean(row.providerRefundId)) return true;
  return false;
}

function deriveRetrySafe(
  providerState: RefundProviderReconciliationProviderState
): boolean {
  if (providerState === "failed") {
    return isFailedProviderExecutionRetryAllowedInV1();
  }
  // V1: never re-submit for in-flight, succeeded, planned, uncertain, or absent.
  return false;
}

/**
 * Classify LOCAL vs PROVIDER durable states into a match status.
 * Uses only local facts — never invents live provider outcomes.
 */
export function classifyRefundProviderMatch(input: {
  local: RefundProviderReconciliationLocalState;
  provider: RefundProviderReconciliationProviderState;
  staleExecuting: boolean;
  idempotencyKeyValid: boolean | null;
}): {
  match: RefundProviderReconciliationMatchStatus;
  reason: string;
} {
  const { local, provider, staleExecuting, idempotencyKeyValid } = input;

  if (idempotencyKeyValid === false) {
    return {
      match: "mismatch_idempotency_key",
      reason: "Execution idempotency key does not bind to ledger id",
    };
  }

  if (local === "unknown") {
    return {
      match: "insufficient_local_facts",
      reason: "Local ledger status unknown/unrecognized",
    };
  }

  if (local === "committing") {
    return {
      match: "local_committing_in_flight",
      reason:
        "Local reservation is committing; provider money is a separate layer — use stuck-committing recovery if reservation is stuck",
    };
  }

  if (provider === "uncertain") {
    return {
      match: "unknown_outcome",
      reason:
        "Provider execution is uncertain from durable local evidence; recovery LOOKUP required (no invented provider truth)",
    };
  }

  if (provider === "executing") {
    if (staleExecuting) {
      return {
        match: "mismatch_stale_executing",
        reason: "Provider execution stuck in executing beyond stale threshold",
      };
    }
    return {
      match: "in_flight_awaiting_outcome",
      reason: "Provider execution in-flight; await or recovery LOOKUP if stale",
    };
  }

  if (local === "committed" && provider === "succeeded") {
    return {
      match: "matched_terminal_success",
      reason: "Local committed + provider succeeded with durable result",
    };
  }

  if (local === "committed" && provider === "failed") {
    return {
      match: "mismatch_local_committed_provider_failed",
      reason:
        "Local ledger committed but provider execution failed — operator review (no V1 auto-retry)",
    };
  }

  if (local === "committed" && provider === "none") {
    return {
      match: "mismatch_local_committed_provider_absent",
      reason:
        "Local committed with no provider execution row — first-time submit candidate (not a retry)",
    };
  }

  if (local === "committed" && provider === "planned") {
    return {
      match: "matched_awaiting_first_submit",
      reason: "Local committed with planned provider execution awaiting first submit",
    };
  }

  if (local === "failed" && provider === "succeeded") {
    return {
      match: "mismatch_local_failed_provider_succeeded",
      reason:
        "Local ledger failed but provider execution succeeded — critical mismatch; do not re-submit",
    };
  }

  if (
    (local === "failed" || local === "absent") &&
    (provider === "failed" || provider === "none")
  ) {
    return {
      match: "matched_terminal_failure",
      reason: "Local and provider both non-success / absent — terminal failure alignment",
    };
  }

  if (local === "failed" && provider === "planned") {
    return {
      match: "matched_pre_submit",
      reason: "Local failed with planned provider row (pre-submit; no money evidence)",
    };
  }

  if (local === "compensated") {
    if (provider === "succeeded" || provider === "failed" || provider === "none") {
      return {
        match:
          provider === "succeeded"
            ? "matched_terminal_success"
            : "matched_terminal_failure",
        reason:
          "Local compensated (accounting unwind) with terminal/absent provider evidence",
      };
    }
    return {
      match: "mismatch_local_compensated_provider_non_terminal",
      reason:
        "Local compensated while provider execution is non-terminal — reconcile before assuming closed",
    };
  }

  if (
    (local === "planned" || local === "absent") &&
    (provider === "none" || provider === "planned")
  ) {
    return {
      match: "matched_pre_submit",
      reason: "Pre-submit alignment (reservation planned/absent; provider none/planned)",
    };
  }

  if (local === "planned" && provider === "succeeded") {
    return {
      match: "mismatch_local_failed_provider_succeeded",
      reason:
        "Local still planned while provider shows succeeded — treat as critical mismatch (local facts lag)",
    };
  }

  if (local === "absent" && provider !== "none") {
    return {
      match: "insufficient_local_facts",
      reason:
        "Provider execution present but local ledger status absent — supply ledger status for full reconciliation",
    };
  }

  return {
    match: "insufficient_local_facts",
    reason: `No explicit match rule for local=${local} provider=${provider}`,
  };
}

function deriveOperatorAction(input: {
  match: RefundProviderReconciliationMatchStatus;
  reconciliationRequired: boolean;
  recoveryEligible: boolean;
}): {
  action: RefundProviderReconciliationOperatorAction;
  required: boolean;
  message: string;
} {
  const { match, reconciliationRequired, recoveryEligible } = input;

  if (match === "local_committing_in_flight") {
    return {
      action: "use_stuck_committing_recovery",
      required: true,
      message:
        "Local reservation is committing — use stuck-committing recovery panel if stuck; do not re-submit provider money.",
    };
  }

  if (
    match === "unknown_outcome" ||
    match === "mismatch_stale_executing" ||
    recoveryEligible
  ) {
    return {
      action: "run_recovery_lookup",
      required: true,
      message:
        "Run recovery LOOKUP only. Do not invent provider truth. Do not re-submit.",
    };
  }

  if (
    match === "mismatch_local_committed_provider_failed" ||
    match === "mismatch_local_failed_provider_succeeded" ||
    match === "mismatch_idempotency_key" ||
    match === "mismatch_local_compensated_provider_non_terminal"
  ) {
    return {
      action: "review_mismatch",
      required: true,
      message:
        "Operator review required for LOCAL/PROVIDER mismatch. V1 retry under same key is blocked.",
    };
  }

  if (
    match === "mismatch_local_committed_provider_absent" ||
    match === "matched_awaiting_first_submit"
  ) {
    return {
      action: "first_time_submit_candidate",
      required: true,
      message:
        "First-time controlled submit candidate (gates OFF by default) — not a retry.",
    };
  }

  if (match === "in_flight_awaiting_outcome") {
    return {
      action: "await_in_flight",
      required: false,
      message: "Provider execution in-flight; await outcome or wait for stale threshold.",
    };
  }

  if (
    match === "matched_terminal_success" ||
    match === "matched_terminal_failure"
  ) {
    return {
      action: "no_action_terminal",
      required: false,
      message: "Terminal alignment — no operator action required.",
    };
  }

  if (match === "matched_pre_submit") {
    return {
      action: "none",
      required: false,
      message: "Pre-submit alignment — no reconciliation action.",
    };
  }

  return {
    action: reconciliationRequired ? "review_mismatch" : "none",
    required: reconciliationRequired,
    message: reconciliationRequired
      ? "Reconciliation signals require operator review."
      : "No operator action required from durable facts.",
  };
}

/**
 * Build deterministic refund↔provider reconciliation snapshot.
 * Pure / read-only. STRIPE_CALLS=0, DB_WRITES=0.
 */
export function buildRefundProviderReconciliation(
  input: BuildRefundProviderReconciliationInput
): RefundProviderReconciliationSnapshot {
  const nowMs = input.nowMs ?? Date.now();
  const staleAfterMs =
    input.staleAfterMs ?? PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS;
  const execution = input.execution ?? null;
  const localRaw = input.localLedgerStatus ?? null;
  const LOCAL_STATE = normalizeLocalState(localRaw);
  const PROVIDER_STATE = deriveProviderState(execution);

  const staleExecuting = execution
    ? isStaleExecutingProviderExecution(execution, nowMs, staleAfterMs)
    : false;
  const recoveryEligible = execution
    ? isRecoveryEligibleProviderExecution(execution, nowMs, staleAfterMs)
    : false;

  let idempotencyKeyValid: boolean | null = null;
  if (execution) {
    idempotencyKeyValid = assertPartialRefundProviderIdempotencyKey(
      execution.ledgerId,
      execution.idempotencyKey
    ).ok;
  }

  const { match, reason } = classifyRefundProviderMatch({
    local: LOCAL_STATE,
    provider: PROVIDER_STATE,
    staleExecuting,
    idempotencyKeyValid,
  });

  const RETRY_SAFE = deriveRetrySafe(PROVIDER_STATE);

  const RECONCILIATION_REQUIRED =
    recoveryEligible ||
    match === "unknown_outcome" ||
    match === "mismatch_stale_executing" ||
    match === "mismatch_local_committed_provider_failed" ||
    match === "mismatch_local_failed_provider_succeeded" ||
    match === "mismatch_idempotency_key" ||
    match === "mismatch_local_compensated_provider_non_terminal" ||
    match === "insufficient_local_facts";

  const op = deriveOperatorAction({
    match,
    reconciliationRequired: RECONCILIATION_REQUIRED,
    recoveryEligible,
  });

  const ledgerId = execution?.ledgerId ?? input.ledgerId ?? null;
  const providerResultPresent = Boolean(
    execution?.providerRefundId || execution?.providerStatusSafe
  );
  const terminalCompletion = Boolean(
    execution && isTerminalProviderExecutionStatus(execution.status)
  );

  let retryMessageExtra = "";
  if (PROVIDER_STATE === "failed") {
    retryMessageExtra = ` ${failedProviderExecutionRetryBlockedMessage()}`;
  }

  return {
    LOCAL_STATE,
    PROVIDER_STATE,
    MATCH_STATUS: match,
    RECONCILIATION_REQUIRED,
    RETRY_SAFE,
    OPERATOR_ACTION_REQUIRED: op.required,
    operatorAction: op.action,
    operatorMessage: `${op.message}${retryMessageExtra}`.trim(),
    retryPolicyV1: PARTIAL_REFUND_PROVIDER_MONEY_FAILED_RETRY_POLICY_V1,
    identities: {
      ledgerId,
      executionId: execution?.executionId ?? null,
      orderId: execution?.orderId ?? input.orderId ?? null,
      paymentAttemptId:
        execution?.paymentAttemptId ?? input.paymentAttemptId ?? null,
      storeId: execution?.storeId ?? input.storeId ?? null,
      idempotencyKey: execution?.idempotencyKey ?? null,
      expectedIdempotencyKey: ledgerId
        ? buildPartialRefundProviderIdempotencyKey(ledgerId)
        : null,
      providerRefundId: execution?.providerRefundId ?? null,
      providerStatusSafe: execution?.providerStatusSafe ?? null,
    },
    evidence: {
      localStatusRaw: localRaw,
      providerExecutionStatus: execution?.status ?? null,
      providerSubmissionAttempted: submissionAttempted(execution),
      providerResultPresent,
      terminalCompletion,
      recoveryEligible,
      staleExecuting,
      duplicateReplayBound: idempotencyKeyValid === true,
      latestOperation: execution
        ? deriveProviderMoneyLatestOperation(execution)
        : "NONE",
      classificationReason: reason,
    },
  };
}
