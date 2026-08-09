/**
 * Refund / provider idempotency + replay safety (read-only decision boundary).
 *
 * Classifies durable local facts before any provider money submit into:
 *   EXECUTION_ALLOWED | EXECUTION_BLOCKED |
 *   RECONCILIATION_REQUIRED | OPERATOR_REVIEW_REQUIRED
 *
 * CRITICAL: previously executed OR UNKNOWN provider outcome must NEVER
 * yield uncontrolled second money execution (EXECUTION_ALLOWED for submit).
 *
 * Pure / fail-closed. STRIPE_CALLS=0, MONEY_MOVEMENT=0, DB_WRITES=0.
 * Does not invent external provider truth.
 */

import { buildPartialRefundProviderIdempotencyKey } from "./idempotency";
import { isFailedProviderExecutionRetryAllowedInV1 } from "./failedRetryPolicy";
import {
  isRecoveryEligibleProviderExecution,
  PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS,
} from "./staleExecuting";
import type {
  PartialRefundProviderExecutionRecord,
  PartialRefundProviderExecutionStatus,
} from "./types";

export const REFUND_PROVIDER_IDEMPOTENCY_REPLAY_SAFETY_VERSION =
  "refund-provider-idempotency-replay-safety-v1" as const;

/** Named replay / idempotency scenarios covered by this boundary. */
export const REFUND_PROVIDER_IDEMPOTENCY_REPLAY_SCENARIOS = [
  "first_submit_clean",
  "same_refund_command_repeated",
  "reservation_committed_twice",
  "provider_execution_twice",
  "repeated_server_action",
  "browser_retry_reload",
  "network_like_retry_simulation",
  "stale_committing",
  "successful_replay",
  "failed_retry",
  "unknown_outcome_replay",
  "compensation_then_replay",
  "reconciliation_then_replay",
  "stale_executing",
  "in_flight_executing",
  "ledger_not_ready",
  "idempotency_key_mismatch",
  "gates_off",
] as const;

export type RefundProviderIdempotencyReplayScenario =
  (typeof REFUND_PROVIDER_IDEMPOTENCY_REPLAY_SCENARIOS)[number];

export type RefundProviderIdempotencyReplayDisposition =
  | "allow_first_submit"
  | "safe_replay_no_submit"
  | "block_no_submit"
  | "reconcile_no_submit"
  | "operator_review_no_submit";

export type BuildRefundProviderIdempotencyReplaySafetyInput = {
  /** Reservation / ledger status (local durable). */
  ledgerStatus: string | null | undefined;
  /** Optional distinct reservation status when known. */
  reservationStatus?: string | null;
  existingExecution: PartialRefundProviderExecutionRecord | null;
  /**
   * Expected idempotency key for this ledger. When omitted, derived from
   * existingExecution.ledgerId when present.
   */
  expectedIdempotencyKey?: string | null;
  /** Dual gate + execution mode already evaluated for first-time submit. */
  firstTimeSubmitAllowed?: boolean;
  /**
   * Hint from caller about how the request arrived (retry surface).
   * Does not invent provider truth — only selects scenario labeling.
   */
  replaySurface?:
    | "same_command"
    | "server_action"
    | "browser_retry"
    | "network_retry"
    | "reservation_commit"
    | "reconciliation"
    | "unspecified";
  nowMs?: number;
  staleAfterMs?: number;
};

export type RefundProviderIdempotencyReplaySafetySnapshot = {
  EXECUTION_ALLOWED: boolean;
  EXECUTION_BLOCKED: boolean;
  RECONCILIATION_REQUIRED: boolean;
  OPERATOR_REVIEW_REQUIRED: boolean;
  disposition: RefundProviderIdempotencyReplayDisposition;
  scenario: RefundProviderIdempotencyReplayScenario;
  providerSubmitAllowed: boolean;
  reasonCode: string;
  message: string;
  evidence: {
    ledgerStatusNormalized: string;
    reservationStatusNormalized: string;
    providerExecutionStatus: PartialRefundProviderExecutionStatus | "none";
    providerSubmissionAttempted: boolean;
    providerOutcomeUnknown: boolean;
    priorTerminalSuccess: boolean;
    priorTerminalFailure: boolean;
    idempotencyKeyBound: boolean;
    duplicateMoneyPreventionBound: boolean;
  };
  safety: {
    invariantsOk: boolean;
    invariantViolations: string[];
    unknownOutcomeBlocksSubmit: boolean;
    previouslyExecutedBlocksSubmit: boolean;
  };
};

function normalizeStatus(raw: string | null | undefined): string {
  if (raw == null || raw === "") return "absent";
  return raw.trim().toLowerCase();
}

function providerSubmissionAttempted(
  execution: PartialRefundProviderExecutionRecord | null
): boolean {
  if (!execution) return false;
  if (execution.status === "planned") return false;
  if (
    execution.status === "executing" ||
    execution.status === "succeeded" ||
    execution.status === "uncertain" ||
    execution.status === "failed"
  ) {
    return true;
  }
  return Boolean(execution.providerRefundId) || Boolean(execution.startedAtIso);
}

function providerOutcomeUnknown(
  execution: PartialRefundProviderExecutionRecord | null
): boolean {
  if (!execution) return false;
  return (
    execution.status === "uncertain" ||
    (execution.status === "executing" && !execution.completedAtIso)
  );
}

/**
 * Fail-closed safety assertions. Never allow submit after prior execution
 * attempt or unknown provider outcome.
 */
export function assertRefundProviderIdempotencyReplaySafety(
  snap: Pick<
    RefundProviderIdempotencyReplaySafetySnapshot,
    | "EXECUTION_ALLOWED"
    | "EXECUTION_BLOCKED"
    | "providerSubmitAllowed"
    | "evidence"
    | "safety"
  >
): string[] {
  const violations: string[] = [];

  if (snap.EXECUTION_ALLOWED !== snap.providerSubmitAllowed) {
    violations.push("EXECUTION_ALLOWED_MUST_MATCH_PROVIDER_SUBMIT_ALLOWED");
  }

  if (snap.EXECUTION_ALLOWED && snap.EXECUTION_BLOCKED) {
    violations.push("EXECUTION_ALLOWED_AND_BLOCKED_MUTUALLY_EXCLUSIVE");
  }

  if (!snap.EXECUTION_ALLOWED && !snap.EXECUTION_BLOCKED) {
    violations.push("EXECUTION_MUST_BE_ALLOWED_OR_BLOCKED");
  }

  if (
    snap.evidence.providerOutcomeUnknown &&
    (snap.EXECUTION_ALLOWED || snap.providerSubmitAllowed)
  ) {
    violations.push(
      "UNKNOWN_PROVIDER_OUTCOME_MUST_NOT_ALLOW_SECOND_MONEY_EXECUTION"
    );
  }

  if (
    snap.evidence.providerSubmissionAttempted &&
    (snap.EXECUTION_ALLOWED || snap.providerSubmitAllowed)
  ) {
    violations.push(
      "PREVIOUSLY_EXECUTED_MUST_NOT_ALLOW_UNCONTROLLED_SECOND_MONEY"
    );
  }

  if (
    snap.evidence.priorTerminalSuccess &&
    (snap.EXECUTION_ALLOWED || snap.providerSubmitAllowed)
  ) {
    violations.push("SUCCEEDED_REPLAY_MUST_NOT_SUBMIT_AGAIN");
  }

  if (
    snap.evidence.priorTerminalFailure &&
    (snap.EXECUTION_ALLOWED || snap.providerSubmitAllowed)
  ) {
    violations.push("FAILED_RETRY_MUST_NOT_SUBMIT_IN_V1");
  }

  return violations;
}

function block(args: {
  scenario: RefundProviderIdempotencyReplayScenario;
  disposition: Exclude<
    RefundProviderIdempotencyReplayDisposition,
    "allow_first_submit"
  >;
  reasonCode: string;
  message: string;
  RECONCILIATION_REQUIRED: boolean;
  OPERATOR_REVIEW_REQUIRED: boolean;
  evidence: RefundProviderIdempotencyReplaySafetySnapshot["evidence"];
}): RefundProviderIdempotencyReplaySafetySnapshot {
  const base: RefundProviderIdempotencyReplaySafetySnapshot = {
    EXECUTION_ALLOWED: false,
    EXECUTION_BLOCKED: true,
    RECONCILIATION_REQUIRED: args.RECONCILIATION_REQUIRED,
    OPERATOR_REVIEW_REQUIRED: args.OPERATOR_REVIEW_REQUIRED,
    disposition: args.disposition,
    scenario: args.scenario,
    providerSubmitAllowed: false,
    reasonCode: args.reasonCode,
    message: args.message,
    evidence: args.evidence,
    safety: {
      invariantsOk: true,
      invariantViolations: [],
      unknownOutcomeBlocksSubmit: args.evidence.providerOutcomeUnknown,
      previouslyExecutedBlocksSubmit:
        args.evidence.providerSubmissionAttempted,
    },
  };
  const violations = assertRefundProviderIdempotencyReplaySafety(base);
  base.safety.invariantViolations = violations;
  base.safety.invariantsOk = violations.length === 0;
  return base;
}

function allow(args: {
  scenario: RefundProviderIdempotencyReplayScenario;
  reasonCode: string;
  message: string;
  evidence: RefundProviderIdempotencyReplaySafetySnapshot["evidence"];
}): RefundProviderIdempotencyReplaySafetySnapshot {
  const base: RefundProviderIdempotencyReplaySafetySnapshot = {
    EXECUTION_ALLOWED: true,
    EXECUTION_BLOCKED: false,
    RECONCILIATION_REQUIRED: false,
    OPERATOR_REVIEW_REQUIRED: false,
    disposition: "allow_first_submit",
    scenario: args.scenario,
    providerSubmitAllowed: true,
    reasonCode: args.reasonCode,
    message: args.message,
    evidence: args.evidence,
    safety: {
      invariantsOk: true,
      invariantViolations: [],
      unknownOutcomeBlocksSubmit: false,
      previouslyExecutedBlocksSubmit: false,
    },
  };
  const violations = assertRefundProviderIdempotencyReplaySafety(base);
  base.safety.invariantViolations = violations;
  base.safety.invariantsOk = violations.length === 0;
  // Absolute last line of defense — never emit allow under attempted/unknown.
  if (
    base.evidence.providerSubmissionAttempted ||
    base.evidence.providerOutcomeUnknown
  ) {
    return block({
      scenario: args.scenario,
      disposition: "operator_review_no_submit",
      reasonCode: "fail_closed_override",
      message:
        "Fail-closed override: prior execution or unknown outcome blocks submit.",
      RECONCILIATION_REQUIRED: true,
      OPERATOR_REVIEW_REQUIRED: true,
      evidence: args.evidence,
    });
  }
  return base;
}

function buildEvidence(
  input: BuildRefundProviderIdempotencyReplaySafetyInput
): RefundProviderIdempotencyReplaySafetySnapshot["evidence"] {
  const ledger = normalizeStatus(input.ledgerStatus);
  const reservation = normalizeStatus(
    input.reservationStatus !== undefined && input.reservationStatus !== null
      ? input.reservationStatus
      : input.ledgerStatus
  );
  const execution = input.existingExecution;
  const status: PartialRefundProviderExecutionStatus | "none" = execution
    ? execution.status
    : "none";

  let idempotencyKeyBound = true;
  if (execution) {
    const expected =
      input.expectedIdempotencyKey?.trim() ||
      buildPartialRefundProviderIdempotencyKey(execution.ledgerId);
    idempotencyKeyBound = execution.idempotencyKey === expected;
  }

  const attempted = providerSubmissionAttempted(execution);
  const unknown = providerOutcomeUnknown(execution);

  return {
    ledgerStatusNormalized: ledger,
    reservationStatusNormalized: reservation,
    providerExecutionStatus: status,
    providerSubmissionAttempted: attempted,
    providerOutcomeUnknown: unknown,
    priorTerminalSuccess: status === "succeeded",
    priorTerminalFailure: status === "failed",
    idempotencyKeyBound,
    duplicateMoneyPreventionBound:
      !attempted || status === "succeeded" || status === "failed" || unknown,
  };
}

function scenarioForReplaySurface(
  surface: BuildRefundProviderIdempotencyReplaySafetyInput["replaySurface"],
  fallback: RefundProviderIdempotencyReplayScenario
): RefundProviderIdempotencyReplayScenario {
  switch (surface) {
    case "same_command":
      return "same_refund_command_repeated";
    case "server_action":
      return "repeated_server_action";
    case "browser_retry":
      return "browser_retry_reload";
    case "network_retry":
      return "network_like_retry_simulation";
    case "reservation_commit":
      return "reservation_committed_twice";
    case "reconciliation":
      return "reconciliation_then_replay";
    default:
      return fallback;
  }
}

/**
 * Pure idempotency / replay safety decision from durable local facts only.
 */
export function buildRefundProviderIdempotencyReplaySafety(
  input: BuildRefundProviderIdempotencyReplaySafetyInput
): RefundProviderIdempotencyReplaySafetySnapshot {
  const evidence = buildEvidence(input);
  const execution = input.existingExecution;
  const firstTimeAllowed = input.firstTimeSubmitAllowed !== false;
  const surface = input.replaySurface ?? "unspecified";
  const nowMs = input.nowMs ?? Date.now();
  const staleAfterMs =
    input.staleAfterMs ?? PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS;

  // Gates / mode off → never first submit.
  if (!firstTimeAllowed) {
    return block({
      scenario: "gates_off",
      disposition: "block_no_submit",
      reasonCode: "gates_or_mode_off",
      message:
        "Provider gates / execution mode OFF — first-time submit blocked.",
      RECONCILIATION_REQUIRED: false,
      OPERATOR_REVIEW_REQUIRED: false,
      evidence,
    });
  }

  // Idempotency key drift → operator review; never submit.
  if (execution && !evidence.idempotencyKeyBound) {
    return block({
      scenario: "idempotency_key_mismatch",
      disposition: "operator_review_no_submit",
      reasonCode: "idempotency_key_mismatch",
      message:
        "Idempotency key does not match ledger-bound key; block submit and review.",
      RECONCILIATION_REQUIRED: true,
      OPERATOR_REVIEW_REQUIRED: true,
      evidence: { ...evidence, duplicateMoneyPreventionBound: false },
    });
  }

  const ledger = evidence.ledgerStatusNormalized;
  const reservation = evidence.reservationStatusNormalized;

  // Compensated ledger → never provider money replay.
  if (ledger === "compensated" || reservation === "compensated") {
    return block({
      scenario: "compensation_then_replay",
      disposition: "block_no_submit",
      reasonCode: "ledger_compensated",
      message:
        "Ledger is compensated; provider money submit/replay is blocked.",
      RECONCILIATION_REQUIRED: evidence.providerOutcomeUnknown,
      OPERATOR_REVIEW_REQUIRED:
        evidence.providerOutcomeUnknown ||
        evidence.providerExecutionStatus === "executing",
      evidence,
    });
  }

  // Stale / in-flight committing reservation — no provider submit.
  if (ledger === "committing" || reservation === "committing") {
    return block({
      scenario: "stale_committing",
      disposition: "reconcile_no_submit",
      reasonCode: "reservation_committing",
      message:
        "Reservation is committing; do not submit provider money. Reconcile / recover reservation first.",
      RECONCILIATION_REQUIRED: true,
      OPERATOR_REVIEW_REQUIRED: true,
      evidence,
    });
  }

  // Provider money path requires committed reservation.
  if (ledger !== "committed") {
    return block({
      scenario: "ledger_not_ready",
      disposition: "block_no_submit",
      reasonCode: "ledger_not_committed",
      message: "Ledger must be committed before provider money execute.",
      RECONCILIATION_REQUIRED: false,
      OPERATOR_REVIEW_REQUIRED: false,
      evidence,
    });
  }

  // No prior execution → first submit allowed (when gates already checked).
  // Replay-surface labels apply only after a prior submission attempt.
  if (!execution || execution.status === "planned") {
    return allow({
      scenario: "first_submit_clean",
      reasonCode: "first_submit_eligible",
      message:
        "No prior provider submission; first-time submit allowed when ACK/gates satisfied.",
      evidence,
    });
  }

  // Terminal success — safe replay (no second money).
  if (execution.status === "succeeded") {
    return block({
      scenario:
        surface === "unspecified"
          ? "successful_replay"
          : scenarioForReplaySurface(surface, "successful_replay"),
      disposition: "safe_replay_no_submit",
      reasonCode: "already_succeeded_safe_replay",
      message:
        "Prior provider execution succeeded; replay is safe without re-submit.",
      RECONCILIATION_REQUIRED: false,
      OPERATOR_REVIEW_REQUIRED: false,
      evidence,
    });
  }

  // Terminal failure — V1 no retry under same key.
  if (execution.status === "failed") {
    void isFailedProviderExecutionRetryAllowedInV1();
    return block({
      scenario: "failed_retry",
      disposition: "block_no_submit",
      reasonCode: "prior_failed_no_retry",
      message:
        "Prior provider execution failed; V1 blocks retry under the same idempotency key.",
      RECONCILIATION_REQUIRED: false,
      OPERATOR_REVIEW_REQUIRED: true,
      evidence,
    });
  }

  // UNKNOWN / uncertain — never second money; reconcile + operator review.
  if (execution.status === "uncertain") {
    return block({
      scenario:
        surface === "reconciliation"
          ? "reconciliation_then_replay"
          : "unknown_outcome_replay",
      disposition:
        surface === "reconciliation"
          ? "operator_review_no_submit"
          : "reconcile_no_submit",
      reasonCode: "unknown_provider_outcome",
      message:
        "Provider outcome UNKNOWN/uncertain; block submit, require reconciliation, operator review.",
      RECONCILIATION_REQUIRED: true,
      OPERATOR_REVIEW_REQUIRED: true,
      evidence,
    });
  }

  // Executing — in-flight or stale; never blind resubmit.
  if (execution.status === "executing") {
    const stale = isRecoveryEligibleProviderExecution(
      execution,
      nowMs,
      staleAfterMs
    );
    const fallbackScenario: RefundProviderIdempotencyReplayScenario = stale
      ? "stale_executing"
      : "in_flight_executing";
    return block({
      scenario: scenarioForReplaySurface(surface, fallbackScenario),
      disposition: "reconcile_no_submit",
      reasonCode: stale ? "stale_executing_recovery" : "in_flight_no_resubmit",
      message: stale
        ? "Stale executing execution requires recovery lookup; never blind re-submit."
        : "Execution in flight; do not submit again (browser/network/server retry).",
      RECONCILIATION_REQUIRED: true,
      OPERATOR_REVIEW_REQUIRED: stale,
      evidence,
    });
  }

  // Defensive default — fail closed.
  return block({
    scenario: "provider_execution_twice",
    disposition: "operator_review_no_submit",
    reasonCode: "unrecognized_execution_state",
    message: "Unrecognized provider execution state; fail-closed block submit.",
    RECONCILIATION_REQUIRED: true,
    OPERATOR_REVIEW_REQUIRED: true,
    evidence,
  });
}

/**
 * Convenience: classify a second call after a known prior decision/execution.
 * Used by offline network-like / browser / server-action replay tests.
 */
export function classifyRefundProviderReplayAttempt(input: {
  prior: BuildRefundProviderIdempotencyReplaySafetyInput;
  attemptSurface: NonNullable<
    BuildRefundProviderIdempotencyReplaySafetyInput["replaySurface"]
  >;
}): RefundProviderIdempotencyReplaySafetySnapshot {
  return buildRefundProviderIdempotencyReplaySafety({
    ...input.prior,
    replaySurface: input.attemptSurface,
  });
}
