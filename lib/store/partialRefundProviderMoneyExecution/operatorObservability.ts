/**
 * Operator observability snapshot for refund / provider-money execution.
 *
 * Read-only derivation from existing durable execution fields.
 * Does not invent telemetry, persist state, call Stripe, or move money.
 */

import {
  assertPartialRefundProviderIdempotencyKey,
  buildPartialRefundProviderIdempotencyKey,
} from "./idempotency";
import {
  failedProviderExecutionRetryBlockedMessage,
  isFailedProviderExecutionRetryAllowedInV1,
  PARTIAL_REFUND_PROVIDER_MONEY_FAILED_RETRY_POLICY_V1,
} from "./failedRetryPolicy";
import {
  deriveProviderMoneyLatestOperation,
  toProviderMoneyAuditView,
  type ProviderMoneyAuditView,
  type ProviderMoneyLatestOperation,
} from "./observability";
import {
  isRecoveryEligibleProviderExecution,
  isStaleExecutingProviderExecution,
  PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS,
} from "./staleExecuting";
import type { PartialRefundProviderExecutionRecord } from "./types";

export type ProviderMoneyOccurrenceConfidence =
  | "confirmed_occurred"
  | "confirmed_not_occurred"
  | "unknown_requires_reconciliation"
  | "not_started";

export type ProviderMoneyRetrySafety =
  | "unsafe_no_v1_retry"
  | "unsafe_in_flight_use_lookup"
  | "unsafe_already_succeeded"
  | "unsafe_planned_not_submit_retry"
  | "no_execution";

export type ProviderMoneyDuplicateRuling =
  | "ruled_out_terminal_same_key"
  | "ruled_out_in_flight_same_key"
  | "bound_by_idempotency_key"
  | "cannot_rule_out_missing_or_mismatched_key"
  | "no_execution";

export type ProviderMoneyOperatorObservabilitySnapshot = {
  /** Q1 — which refund / ledger reservation this execution serves */
  refundIdentity: {
    ledgerId: string;
    storeId: string;
    orderId: string;
    paymentAttemptId: string;
    captureEventId: string;
    amountMinor: number;
    currency: string;
    ledgerStatus: string | null;
  };
  /** Q2 — provider execution binding */
  providerExecutionIdentity: {
    executionId: string;
    providerKind: string;
    idempotencyKey: string;
    idempotencyKeyValidForLedger: boolean;
  };
  /** Q3 — was provider submission attempted (durable evidence only) */
  providerSubmissionAttempted: boolean;
  providerSubmissionEvidence: string;
  /** Q4 — current execution state */
  executionState: string;
  latestOperation: ProviderMoneyLatestOperation;
  /** Q5 — has money execution already occurred */
  moneyExecutionOccurrence: ProviderMoneyOccurrenceConfidence;
  moneyExecutionEvidence: string;
  /** Q6 — is retry (re-submit) safe */
  retrySafe: boolean;
  retrySafety: ProviderMoneyRetrySafety;
  retryPolicyV1: typeof PARTIAL_REFUND_PROVIDER_MONEY_FAILED_RETRY_POLICY_V1;
  retryMessage: string;
  /** Q7 — reconciliation / recovery required */
  reconciliationRequired: boolean;
  /** Q8 — stuck executing (stale crash window) */
  executionStuck: boolean;
  staleExecuting: boolean;
  /** Q9 — recovery evidence (safe fields only) */
  recoveryEvidence: {
    recoveryEligible: boolean;
    providerRefundId: string | null;
    providerStatusSafe: string | null;
    failureCode: string | null;
    failureMessageSafe: string | null;
    startedAtIso: string | null;
    completedAtIso: string | null;
    lastLookupAtIso: string | null;
    latestOperation: ProviderMoneyLatestOperation;
    operatorUserId: string | null;
    operatorReasonSafe: string | null;
  };
  /** Q10 — duplicate / idempotency protection */
  duplicateExecutionRuling: ProviderMoneyDuplicateRuling;
  duplicateExecutionRuledOut: boolean;
  auditView: ProviderMoneyAuditView;
};

export type BuildProviderMoneyOperatorObservabilityInput = {
  execution: PartialRefundProviderExecutionRecord;
  /** Optional reservation/ledger status for operator context (not required). */
  ledgerStatus?: string | null;
  nowMs?: number;
  staleAfterMs?: number;
};

function deriveProviderSubmissionAttempted(
  row: PartialRefundProviderExecutionRecord
): { attempted: boolean; evidence: string } {
  if (row.startedAtIso) {
    return {
      attempted: true,
      evidence: `startedAtIso=${row.startedAtIso}`,
    };
  }
  if (row.status === "executing") {
    return {
      attempted: true,
      evidence: "status=executing without startedAtIso (treat as submit path)",
    };
  }
  if (row.status === "succeeded" || row.status === "uncertain") {
    return {
      attempted: true,
      evidence: `status=${row.status} implies provider path was entered`,
    };
  }
  if (row.status === "failed" && row.providerRefundId) {
    return {
      attempted: true,
      evidence: "failed with providerRefundId present",
    };
  }
  if (row.status === "failed") {
    return {
      attempted: false,
      evidence:
        "failed without startedAtIso/providerRefundId (likely pre-submit / claim failure)",
    };
  }
  return {
    attempted: false,
    evidence: "status=planned and no startedAtIso",
  };
}

function deriveMoneyOccurrence(
  row: PartialRefundProviderExecutionRecord
): { confidence: ProviderMoneyOccurrenceConfidence; evidence: string } {
  if (row.status === "succeeded") {
    return {
      confidence: "confirmed_occurred",
      evidence: row.providerRefundId
        ? `status=succeeded · providerRefundId=${row.providerRefundId}`
        : "status=succeeded (provider refund id missing — still terminal success)",
    };
  }
  if (row.status === "planned") {
    return {
      confidence: "not_started",
      evidence: "status=planned; no provider money outcome recorded",
    };
  }
  if (row.status === "failed" && !row.providerRefundId && !row.startedAtIso) {
    return {
      confidence: "confirmed_not_occurred",
      evidence:
        "status=failed with no start/provider refund id — money submit not evidenced",
    };
  }
  if (row.status === "failed" && !row.providerRefundId) {
    return {
      confidence: "confirmed_not_occurred",
      evidence:
        "status=failed without providerRefundId — treat as confirmed non-success (no money id)",
    };
  }
  return {
    confidence: "unknown_requires_reconciliation",
    evidence:
      row.status === "uncertain" || row.status === "executing"
        ? `status=${row.status}; outcome not terminal — reconcile via lookup`
        : `status=${row.status} with ambiguous money evidence`,
  };
}

function deriveRetrySafety(
  row: PartialRefundProviderExecutionRecord
): {
  retrySafe: boolean;
  retrySafety: ProviderMoneyRetrySafety;
  retryMessage: string;
} {
  if (row.status === "succeeded") {
    return {
      retrySafe: false,
      retrySafety: "unsafe_already_succeeded",
      retryMessage:
        "Provider money already succeeded; do not submit again under the same key.",
    };
  }
  if (row.status === "failed") {
    return {
      retrySafe: isFailedProviderExecutionRetryAllowedInV1(),
      retrySafety: "unsafe_no_v1_retry",
      retryMessage: failedProviderExecutionRetryBlockedMessage(),
    };
  }
  if (row.status === "uncertain" || row.status === "executing") {
    return {
      retrySafe: false,
      retrySafety: "unsafe_in_flight_use_lookup",
      retryMessage:
        "Execution is in-flight or uncertain; use recovery LOOKUP only — never re-submit.",
    };
  }
  return {
    retrySafe: false,
    retrySafety: "unsafe_planned_not_submit_retry",
    retryMessage:
      "Planned execution exists; first-time submit is a separate controlled action, not a retry.",
  };
}

function deriveDuplicateRuling(
  row: PartialRefundProviderExecutionRecord
): {
  ruling: ProviderMoneyDuplicateRuling;
  ruledOut: boolean;
} {
  const keyCheck = assertPartialRefundProviderIdempotencyKey(
    row.ledgerId,
    row.idempotencyKey
  );
  if (!keyCheck.ok) {
    return {
      ruling: "cannot_rule_out_missing_or_mismatched_key",
      ruledOut: false,
    };
  }
  if (row.status === "succeeded" || row.status === "failed") {
    return {
      ruling: "ruled_out_terminal_same_key",
      ruledOut: true,
    };
  }
  if (row.status === "executing" || row.status === "uncertain") {
    return {
      ruling: "ruled_out_in_flight_same_key",
      ruledOut: true,
    };
  }
  return {
    ruling: "bound_by_idempotency_key",
    ruledOut: true,
  };
}

/**
 * Build a single operator-facing observability snapshot answering the
 * production readiness questions from durable execution evidence only.
 */
export function buildProviderMoneyOperatorObservability(
  input: BuildProviderMoneyOperatorObservabilityInput
): ProviderMoneyOperatorObservabilitySnapshot {
  const row = input.execution;
  const nowMs = input.nowMs ?? Date.now();
  const staleAfterMs =
    input.staleAfterMs ?? PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS;
  const auditView = toProviderMoneyAuditView(row);
  const latestOperation = deriveProviderMoneyLatestOperation(row);
  const submit = deriveProviderSubmissionAttempted(row);
  const money = deriveMoneyOccurrence(row);
  const retry = deriveRetrySafety(row);
  const stale = isStaleExecutingProviderExecution(row, nowMs, staleAfterMs);
  const recoveryEligible = isRecoveryEligibleProviderExecution(
    row,
    nowMs,
    staleAfterMs
  );
  const duplicate = deriveDuplicateRuling(row);
  const idempotencyKeyValidForLedger = assertPartialRefundProviderIdempotencyKey(
    row.ledgerId,
    row.idempotencyKey
  ).ok;

  return {
    refundIdentity: {
      ledgerId: row.ledgerId,
      storeId: row.storeId,
      orderId: row.orderId,
      paymentAttemptId: row.paymentAttemptId,
      captureEventId: row.captureEventId,
      amountMinor: row.trustedAmountMinor,
      currency: row.currency,
      ledgerStatus: input.ledgerStatus ?? null,
    },
    providerExecutionIdentity: {
      executionId: row.executionId,
      providerKind: row.providerKind,
      idempotencyKey: row.idempotencyKey,
      idempotencyKeyValidForLedger,
    },
    providerSubmissionAttempted: submit.attempted,
    providerSubmissionEvidence: submit.evidence,
    executionState: row.status,
    latestOperation,
    moneyExecutionOccurrence: money.confidence,
    moneyExecutionEvidence: money.evidence,
    retrySafe: retry.retrySafe,
    retrySafety: retry.retrySafety,
    retryPolicyV1: PARTIAL_REFUND_PROVIDER_MONEY_FAILED_RETRY_POLICY_V1,
    retryMessage: retry.retryMessage,
    reconciliationRequired: recoveryEligible || row.status === "uncertain",
    executionStuck: stale,
    staleExecuting: stale,
    recoveryEvidence: {
      recoveryEligible,
      providerRefundId: row.providerRefundId,
      providerStatusSafe: row.providerStatusSafe,
      failureCode: row.failureCode,
      failureMessageSafe: row.failureMessageSafe,
      startedAtIso: row.startedAtIso,
      completedAtIso: row.completedAtIso,
      lastLookupAtIso: row.lastLookupAtIso,
      latestOperation,
      operatorUserId: row.operatorUserId,
      operatorReasonSafe: row.operatorReasonSafe,
    },
    duplicateExecutionRuling: duplicate.ruling,
    duplicateExecutionRuledOut: duplicate.ruledOut,
    auditView,
  };
}

/** Absence case when no provider execution row exists for a ledger. */
export function buildProviderMoneyOperatorObservabilityAbsent(input: {
  ledgerId: string;
  storeId?: string | null;
  orderId?: string | null;
  paymentAttemptId?: string | null;
  ledgerStatus?: string | null;
}): {
  refundIdentity: {
    ledgerId: string;
    storeId: string | null;
    orderId: string | null;
    paymentAttemptId: string | null;
    ledgerStatus: string | null;
  };
  providerExecutionIdentity: null;
  providerSubmissionAttempted: false;
  executionState: "none";
  moneyExecutionOccurrence: "not_started";
  retrySafe: false;
  retrySafety: "no_execution";
  reconciliationRequired: false;
  executionStuck: false;
  duplicateExecutionRuling: "no_execution";
  duplicateExecutionRuledOut: false;
  expectedIdempotencyKey: string;
  message: string;
} {
  return {
    refundIdentity: {
      ledgerId: input.ledgerId,
      storeId: input.storeId ?? null,
      orderId: input.orderId ?? null,
      paymentAttemptId: input.paymentAttemptId ?? null,
      ledgerStatus: input.ledgerStatus ?? null,
    },
    providerExecutionIdentity: null,
    providerSubmissionAttempted: false,
    executionState: "none",
    moneyExecutionOccurrence: "not_started",
    retrySafe: false,
    retrySafety: "no_execution",
    reconciliationRequired: false,
    executionStuck: false,
    duplicateExecutionRuling: "no_execution",
    duplicateExecutionRuledOut: false,
    expectedIdempotencyKey: buildPartialRefundProviderIdempotencyKey(
      input.ledgerId
    ),
    message:
      "No provider execution row for this ledger; duplicate money execution cannot be ruled out from execution evidence alone.",
  };
}
