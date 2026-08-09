/**
 * Refund ↔ provider reconciliation → recovery decision safety (read-only).
 *
 * Deterministic boundary after observability + reconciliation:
 * derives LOCAL_LEDGER_STATE, RESERVATION_STATE, PROVIDER_EXECUTION_STATE,
 * PROVIDER_OUTCOME_CONFIDENCE, RECONCILIATION_REQUIRED, RETRY_SAFE,
 * RECOVERY_REQUIRED, OPERATOR_ESCALATION_REQUIRED.
 *
 * Does not call Stripe, write DB, enable gates, or invent provider truth.
 * CRITICAL: unknown provider outcome never silently becomes RETRY_SAFE.
 */

import {
  buildRefundProviderReconciliation,
  type BuildRefundProviderReconciliationInput,
  type RefundProviderReconciliationMatchStatus,
  type RefundProviderReconciliationSnapshot,
} from "./refundProviderReconciliation";

/** Durable refund ledger states (reservation-only values are not ledger). */
export const RECOVERY_LOCAL_LEDGER_STATES = [
  "planned",
  "committed",
  "failed",
  "compensated",
  "absent",
  "unknown",
] as const;

export type RecoveryLocalLedgerState =
  (typeof RECOVERY_LOCAL_LEDGER_STATES)[number];

/** Reservation lifecycle (committing/reserved/cancelled live here). */
export const RECOVERY_RESERVATION_STATES = [
  "reserved",
  "committing",
  "committed",
  "failed",
  "cancelled",
  "absent",
  "unknown",
] as const;

export type RecoveryReservationState =
  (typeof RECOVERY_RESERVATION_STATES)[number];

/** Provider execution durable state (local record only). */
export const RECOVERY_PROVIDER_EXECUTION_STATES = [
  "none",
  "planned",
  "executing",
  "succeeded",
  "failed",
  "uncertain",
] as const;

export type RecoveryProviderExecutionState =
  (typeof RECOVERY_PROVIDER_EXECUTION_STATES)[number];

/**
 * Confidence in provider money outcome from durable local evidence only.
 * `unknown` must never map to RETRY_SAFE=true.
 */
export const RECOVERY_PROVIDER_OUTCOME_CONFIDENCE = [
  "none",
  "confirmed_local",
  "in_flight",
  "unknown",
  "insufficient",
] as const;

export type RecoveryProviderOutcomeConfidence =
  (typeof RECOVERY_PROVIDER_OUTCOME_CONFIDENCE)[number];

export type RefundProviderRecoveryDecisionSnapshot = {
  LOCAL_LEDGER_STATE: RecoveryLocalLedgerState;
  RESERVATION_STATE: RecoveryReservationState;
  PROVIDER_EXECUTION_STATE: RecoveryProviderExecutionState;
  PROVIDER_OUTCOME_CONFIDENCE: RecoveryProviderOutcomeConfidence;
  RECONCILIATION_REQUIRED: boolean;
  RETRY_SAFE: boolean;
  RECOVERY_REQUIRED: boolean;
  OPERATOR_ESCALATION_REQUIRED: boolean;
  /** Underlying reconciliation snapshot (OBSERVABILITY → RECONCILIATION). */
  reconciliation: RefundProviderReconciliationSnapshot;
  safety: {
    unknownOutcomeBlocksRetry: boolean;
    duplicateMoneyPreventionBound: boolean;
    providerExecutionAttempted: boolean;
    invariantsOk: boolean;
    invariantViolations: string[];
  };
};

export type BuildRefundProviderRecoveryDecisionInput =
  BuildRefundProviderReconciliationInput & {
    /** Optional explicit reservation status when distinct from ledger. */
    reservationStatus?: string | null;
  };

function normalizeLocalLedgerState(
  raw: string | null | undefined
): RecoveryLocalLedgerState {
  if (raw == null || raw === "") return "absent";
  const s = raw.trim().toLowerCase();
  if (s === "reserved" || s === "planned") return "planned";
  if (s === "committed") return "committed";
  if (s === "failed") return "failed";
  if (s === "compensated") return "compensated";
  // committing / cancelled are reservation-layer — not ledger outcomes
  if (s === "committing" || s === "cancelled" || s === "canceled") {
    return "unknown";
  }
  return "unknown";
}

function normalizeReservationState(
  raw: string | null | undefined
): RecoveryReservationState {
  if (raw == null || raw === "") return "absent";
  const s = raw.trim().toLowerCase();
  if (s === "planned" || s === "reserved") return "reserved";
  if (s === "committing") return "committing";
  if (s === "committed") return "committed";
  if (s === "failed") return "failed";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  if (s === "compensated") return "committed";
  return "unknown";
}

function deriveProviderOutcomeConfidence(
  recon: RefundProviderReconciliationSnapshot
): RecoveryProviderOutcomeConfidence {
  const provider = recon.PROVIDER_STATE;
  const { staleExecuting, providerSubmissionAttempted, providerResultPresent } =
    recon.evidence;

  if (provider === "uncertain" || staleExecuting) {
    return "unknown";
  }
  if (provider === "none" || provider === "planned") {
    return providerSubmissionAttempted ? "unknown" : "none";
  }
  if (provider === "executing") {
    return "in_flight";
  }
  if (provider === "succeeded" || provider === "failed") {
    return providerResultPresent || provider === "failed"
      ? "confirmed_local"
      : "insufficient";
  }
  return "insufficient";
}

function deriveRecoveryRequired(
  recon: RefundProviderReconciliationSnapshot,
  confidence: RecoveryProviderOutcomeConfidence,
  reservation: RecoveryReservationState
): boolean {
  if (confidence === "unknown") return true;
  if (reservation === "committing") return true;
  if (recon.evidence.recoveryEligible) return true;
  if (
    recon.operatorAction === "run_recovery_lookup" ||
    recon.operatorAction === "use_stuck_committing_recovery"
  ) {
    return true;
  }
  if (
    recon.MATCH_STATUS === "unknown_outcome" ||
    recon.MATCH_STATUS === "mismatch_stale_executing" ||
    recon.MATCH_STATUS === "local_committing_in_flight"
  ) {
    return true;
  }
  return false;
}

const ESCALATION_MATCHES: ReadonlySet<RefundProviderReconciliationMatchStatus> =
  new Set([
    "mismatch_local_committed_provider_failed",
    "mismatch_local_failed_provider_succeeded",
    "mismatch_idempotency_key",
    "mismatch_local_compensated_provider_non_terminal",
    "insufficient_local_facts",
  ]);

function deriveOperatorEscalationRequired(
  recon: RefundProviderReconciliationSnapshot,
  confidence: RecoveryProviderOutcomeConfidence
): boolean {
  if (ESCALATION_MATCHES.has(recon.MATCH_STATUS)) return true;
  // Unknown outcome after recovery path still needs human escalation if
  // reconciliation cannot close from local facts alone.
  if (confidence === "unknown" && recon.RECONCILIATION_REQUIRED) return true;
  if (recon.operatorAction === "review_mismatch") return true;
  return false;
}

/**
 * Fail-closed safety assertions for the recovery decision boundary.
 * Returns violations; never enables retry for unknown outcomes.
 */
export function assertRefundProviderRecoveryDecisionSafety(
  decision: Pick<
    RefundProviderRecoveryDecisionSnapshot,
    | "PROVIDER_EXECUTION_STATE"
    | "PROVIDER_OUTCOME_CONFIDENCE"
    | "RETRY_SAFE"
    | "RECOVERY_REQUIRED"
    | "RECONCILIATION_REQUIRED"
    | "safety"
  >
): string[] {
  const violations: string[] = [];

  if (
    decision.PROVIDER_OUTCOME_CONFIDENCE === "unknown" &&
    decision.RETRY_SAFE
  ) {
    violations.push(
      "UNKNOWN_PROVIDER_OUTCOME_MUST_NOT_BE_RETRY_SAFE"
    );
  }

  if (
    decision.PROVIDER_EXECUTION_STATE === "uncertain" &&
    decision.RETRY_SAFE
  ) {
    violations.push("UNCERTAIN_EXECUTION_MUST_NOT_BE_RETRY_SAFE");
  }

  if (
    decision.PROVIDER_OUTCOME_CONFIDENCE === "unknown" &&
    !decision.RECOVERY_REQUIRED
  ) {
    violations.push("UNKNOWN_OUTCOME_REQUIRES_RECOVERY");
  }

  if (
    decision.PROVIDER_OUTCOME_CONFIDENCE === "in_flight" &&
    decision.RETRY_SAFE
  ) {
    violations.push("IN_FLIGHT_MUST_NOT_BE_RETRY_SAFE");
  }

  if (
    decision.safety.providerExecutionAttempted &&
    decision.RETRY_SAFE
  ) {
    violations.push(
      "SUBMISSION_ATTEMPTED_MUST_NOT_BE_RETRY_SAFE_DUPLICATE_MONEY"
    );
  }

  if (
    decision.PROVIDER_EXECUTION_STATE === "succeeded" &&
    decision.RETRY_SAFE
  ) {
    violations.push("SUCCEEDED_MUST_NOT_BE_RETRY_SAFE");
  }

  return violations;
}

/**
 * Build recovery decision from durable local facts via reconciliation.
 * Pure / read-only. STRIPE_CALLS=0, DB_WRITES=0. No provider execution.
 */
export function buildRefundProviderRecoveryDecision(
  input: BuildRefundProviderRecoveryDecisionInput
): RefundProviderRecoveryDecisionSnapshot {
  const recon = buildRefundProviderReconciliation(input);

  const ledgerRaw = input.localLedgerStatus ?? null;
  const reservationRaw =
    input.reservationStatus !== undefined && input.reservationStatus !== null
      ? input.reservationStatus
      : ledgerRaw;

  const LOCAL_LEDGER_STATE = normalizeLocalLedgerState(ledgerRaw);
  const RESERVATION_STATE = normalizeReservationState(reservationRaw);
  const PROVIDER_EXECUTION_STATE =
    recon.PROVIDER_STATE as RecoveryProviderExecutionState;
  const PROVIDER_OUTCOME_CONFIDENCE = deriveProviderOutcomeConfidence(recon);

  // Fail-closed: unknown / in-flight / attempted / V1 no_retry → never retry-safe.
  // Reuses reconciliation RETRY_SAFE (already fail-closed) and hard-overrides
  // for unknown confidence so the invariant cannot silently regress.
  let RETRY_SAFE = recon.RETRY_SAFE;
  if (
    PROVIDER_OUTCOME_CONFIDENCE === "unknown" ||
    PROVIDER_OUTCOME_CONFIDENCE === "in_flight" ||
    PROVIDER_EXECUTION_STATE === "uncertain" ||
    PROVIDER_EXECUTION_STATE === "succeeded" ||
    recon.evidence.providerSubmissionAttempted
  ) {
    RETRY_SAFE = false;
  }

  const RECONCILIATION_REQUIRED = recon.RECONCILIATION_REQUIRED;
  const RECOVERY_REQUIRED = deriveRecoveryRequired(
    recon,
    PROVIDER_OUTCOME_CONFIDENCE,
    RESERVATION_STATE
  );
  const OPERATOR_ESCALATION_REQUIRED = deriveOperatorEscalationRequired(
    recon,
    PROVIDER_OUTCOME_CONFIDENCE
  );

  const providerExecutionAttempted =
    recon.evidence.providerSubmissionAttempted ||
    PROVIDER_EXECUTION_STATE === "succeeded" ||
    PROVIDER_EXECUTION_STATE === "uncertain" ||
    Boolean(recon.identities.providerRefundId);

  const duplicateMoneyPreventionBound =
    recon.evidence.duplicateReplayBound ||
    PROVIDER_EXECUTION_STATE === "none" ||
    PROVIDER_EXECUTION_STATE === "planned";

  const partial = {
    PROVIDER_EXECUTION_STATE,
    PROVIDER_OUTCOME_CONFIDENCE,
    RETRY_SAFE,
    RECOVERY_REQUIRED,
    RECONCILIATION_REQUIRED,
    safety: {
      unknownOutcomeBlocksRetry:
        PROVIDER_OUTCOME_CONFIDENCE !== "unknown" || RETRY_SAFE === false,
      duplicateMoneyPreventionBound,
      providerExecutionAttempted,
      invariantsOk: true,
      invariantViolations: [] as string[],
    },
  };

  const invariantViolations =
    assertRefundProviderRecoveryDecisionSafety(partial);
  partial.safety.invariantViolations = invariantViolations;
  partial.safety.invariantsOk = invariantViolations.length === 0;

  // Absolute last line of defense — never emit RETRY_SAFE under unknown.
  if (
    PROVIDER_OUTCOME_CONFIDENCE === "unknown" ||
    PROVIDER_EXECUTION_STATE === "uncertain"
  ) {
    RETRY_SAFE = false;
  }

  return {
    LOCAL_LEDGER_STATE,
    RESERVATION_STATE,
    PROVIDER_EXECUTION_STATE,
    PROVIDER_OUTCOME_CONFIDENCE,
    RECONCILIATION_REQUIRED,
    RETRY_SAFE,
    RECOVERY_REQUIRED,
    OPERATOR_ESCALATION_REQUIRED,
    reconciliation: recon,
    safety: {
      ...partial.safety,
      unknownOutcomeBlocksRetry:
        PROVIDER_OUTCOME_CONFIDENCE !== "unknown" || RETRY_SAFE === false,
    },
  };
}
