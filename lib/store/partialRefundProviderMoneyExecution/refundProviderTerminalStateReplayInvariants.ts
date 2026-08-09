/**
 * Refund / provider terminal-state + replay invariants (read-only decision boundary).
 *
 * Proves fail-closed protection across actual SoT state names:
 *   Provider: planned | executing | succeeded | failed | uncertain
 *   Ledger:   planned | committing | committed | failed | compensated
 *
 * Emits deterministic decisions (where supported):
 *   EXECUTION_ALLOWED | EXECUTION_BLOCKED |
 *   RECONCILIATION_REQUIRED | RECOVERY_REQUIRED | OPERATOR_REVIEW_REQUIRED
 *
 * NOTE: There is no durable status literally named SUCCESS / FAILED / UNKNOWN /
 * RECONCILED / STUCK_COMMITTING. Actual names are used; aliases below document
 * the mapping only (never invent replacements in persisted contracts).
 *
 * Pure / fail-closed. STRIPE_CALLS=0, MONEY_MOVEMENT=0, DB_WRITES=0.
 * Does not invent external provider truth.
 */

import { buildPartialRefundProviderIdempotencyKey } from "./idempotency";
import { isFailedProviderExecutionRetryAllowedInV1 } from "./failedRetryPolicy";
import {
  isRecoveryEligibleProviderExecution,
  isStaleExecutingProviderExecution,
  PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS,
} from "./staleExecuting";
import {
  isTerminalProviderExecutionStatus,
  isUncertainProviderExecutionStatus,
} from "./stateMachine";
import type {
  PartialRefundProviderExecutionRecord,
  PartialRefundProviderExecutionStatus,
} from "./types";

export const REFUND_PROVIDER_TERMINAL_STATE_REPLAY_INVARIANTS_VERSION =
  "refund-provider-terminal-state-replay-invariants-v1" as const;

/** Actual provider execution statuses from SoT `types.ts`. */
export const TERMINAL_INVARIANT_PROVIDER_STATUSES = [
  "planned",
  "executing",
  "succeeded",
  "failed",
  "uncertain",
] as const;

/** Actual ledger commit states from SoT `partialRefundLedger/types.ts`. */
export const TERMINAL_INVARIANT_LEDGER_STATUSES = [
  "planned",
  "committing",
  "committed",
  "failed",
  "compensated",
] as const;

/**
 * Documentation-only alias map (task vocabulary → actual SoT names).
 * Never persisted; never used as inventing replacements.
 */
export const TERMINAL_INVARIANT_TASK_ALIAS_MAP = {
  SUCCESS: "succeeded",
  FAILED: "failed",
  UNKNOWN: "uncertain",
  COMPENSATED: "compensated",
  /** Not a durable status — reconciliation is a decision/match classification. */
  RECONCILED: null,
  COMMITTING: "committing",
  /** Operational class on ledger `committing`; recovery via stuck-committing path. */
  STUCK_COMMITTING: "committing",
} as const;

export const TERMINAL_INVARIANT_SCENARIOS = [
  "first_submit_clean",
  "terminal_succeeded_replay",
  "terminal_failed_replay",
  "uncertain_unknown_replay",
  "compensated_silent_replay",
  "reconciled_terminal_replay",
  "committing_stuck_requires_recovery",
  "duplicate_command_second_execution",
  "stale_ui_action_bypass_attempt",
  "repeated_recovery_idempotent",
  "in_flight_executing",
  "stale_executing_recovery",
  "ledger_not_ready",
  "gates_off",
  "idempotency_key_mismatch",
] as const;

export type TerminalInvariantScenario =
  (typeof TERMINAL_INVARIANT_SCENARIOS)[number];

export type TerminalInvariantDisposition =
  | "allow_first_submit"
  | "safe_replay_no_submit"
  | "block_no_submit"
  | "reconcile_no_submit"
  | "recover_no_submit"
  | "operator_review_no_submit";

export type BuildTerminalStateReplayInvariantsInput = {
  ledgerStatus: string | null | undefined;
  reservationStatus?: string | null;
  existingExecution: PartialRefundProviderExecutionRecord | null;
  expectedIdempotencyKey?: string | null;
  /** Dual gate + execution mode already evaluated for first-time submit. */
  firstTimeSubmitAllowed?: boolean;
  /**
   * Caller surface hint for scenario labeling only (not provider truth).
   */
  actionSurface?:
    | "first_submit"
    | "duplicate_command"
    | "stale_ui"
    | "recovery_action"
    | "reconciliation"
    | "unspecified";
  /**
   * When true, caller asserts prior reconciliation/recovery already classified
   * this execution to a local terminal outcome (succeeded|failed). Used only
   * to label `reconciled_terminal_replay` — still never allows re-submit.
   */
  reconciledTerminalClaim?: boolean;
  nowMs?: number;
  staleAfterMs?: number;
};

export type TerminalStateReplayInvariantsSnapshot = {
  EXECUTION_ALLOWED: boolean;
  EXECUTION_BLOCKED: boolean;
  RECONCILIATION_REQUIRED: boolean;
  RECOVERY_REQUIRED: boolean;
  OPERATOR_REVIEW_REQUIRED: boolean;
  disposition: TerminalInvariantDisposition;
  scenario: TerminalInvariantScenario;
  providerSubmitAllowed: boolean;
  /** Always false for uncertain / unknown outcome without new evidence. */
  retrySafe: boolean;
  reasonCode: string;
  message: string;
  evidence: {
    ledgerStatusNormalized: string;
    reservationStatusNormalized: string;
    providerExecutionStatus: PartialRefundProviderExecutionStatus | "none";
    providerTerminal: boolean;
    providerUncertainUnknown: boolean;
    ledgerCompensated: boolean;
    ledgerCommitting: boolean;
    stuckCommittingClass: boolean;
    reconciledTerminalClass: boolean;
    providerSubmissionAttempted: boolean;
    idempotencyKeyBound: boolean;
    recoveryEligible: boolean;
  };
  safety: {
    invariantsOk: boolean;
    invariantViolations: string[];
    successfulMoneyCannotReExecute: boolean;
    compensatedCannotSilentlyReplay: boolean;
    uncertainCannotBecomeRetrySafeWithoutEvidence: boolean;
    stuckCommittingRequiresExplicitRecovery: boolean;
    duplicateCommandCannotSecondExecute: boolean;
    staleUiCannotBypassTerminalProtection: boolean;
    repeatedRecoveryIdempotent: boolean;
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

/**
 * Fail-closed invariant assertions for terminal-state + replay protection.
 */
export function assertRefundProviderTerminalStateReplayInvariants(
  snap: Pick<
    TerminalStateReplayInvariantsSnapshot,
    | "EXECUTION_ALLOWED"
    | "EXECUTION_BLOCKED"
    | "providerSubmitAllowed"
    | "retrySafe"
    | "RECOVERY_REQUIRED"
    | "evidence"
    | "safety"
  >
): string[] {
  const violations: string[] = [];
  const e = snap.evidence;

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
    e.providerExecutionStatus === "succeeded" &&
    (snap.EXECUTION_ALLOWED || snap.providerSubmitAllowed)
  ) {
    violations.push("SUCCESSFUL_MONEY_EXECUTION_MUST_NOT_EXECUTE_AGAIN");
  }

  if (
    e.ledgerCompensated &&
    (snap.EXECUTION_ALLOWED || snap.providerSubmitAllowed)
  ) {
    violations.push("COMPENSATED_MUST_NOT_SILENTLY_REPLAY");
  }

  if (
    e.reconciledTerminalClass &&
    (snap.EXECUTION_ALLOWED || snap.providerSubmitAllowed)
  ) {
    violations.push("RECONCILED_TERMINAL_MUST_NOT_SILENTLY_REPLAY");
  }

  if (e.providerUncertainUnknown && snap.retrySafe) {
    violations.push(
      "UNCERTAIN_UNKNOWN_MUST_NOT_BECOME_RETRY_SAFE_WITHOUT_EVIDENCE"
    );
  }

  if (
    e.providerUncertainUnknown &&
    (snap.EXECUTION_ALLOWED || snap.providerSubmitAllowed)
  ) {
    violations.push("UNCERTAIN_UNKNOWN_MUST_NOT_ALLOW_PROVIDER_SUBMIT");
  }

  if (e.stuckCommittingClass && !snap.RECOVERY_REQUIRED) {
    violations.push("STUCK_COMMITTING_REQUIRES_EXPLICIT_RECOVERY_PATH");
  }

  if (
    e.stuckCommittingClass &&
    (snap.EXECUTION_ALLOWED || snap.providerSubmitAllowed)
  ) {
    violations.push("STUCK_COMMITTING_MUST_NOT_ALLOW_PROVIDER_SUBMIT");
  }

  if (
    e.providerSubmissionAttempted &&
    (snap.EXECUTION_ALLOWED || snap.providerSubmitAllowed)
  ) {
    violations.push("DUPLICATE_COMMAND_MUST_NOT_CREATE_SECOND_PROVIDER_EXECUTION");
  }

  if (
    e.providerTerminal &&
    (snap.EXECUTION_ALLOWED || snap.providerSubmitAllowed)
  ) {
    violations.push("STALE_UI_MUST_NOT_BYPASS_TERMINAL_STATE_PROTECTION");
  }

  return violations;
}

function finish(
  partial: Omit<TerminalStateReplayInvariantsSnapshot, "safety"> & {
    safetyHints: Omit<
      TerminalStateReplayInvariantsSnapshot["safety"],
      "invariantsOk" | "invariantViolations"
    >;
  }
): TerminalStateReplayInvariantsSnapshot {
  const base: TerminalStateReplayInvariantsSnapshot = {
    ...partial,
    safety: {
      ...partial.safetyHints,
      invariantsOk: true,
      invariantViolations: [],
    },
  };
  const violations = assertRefundProviderTerminalStateReplayInvariants(base);
  base.safety.invariantViolations = violations;
  base.safety.invariantsOk = violations.length === 0;

  // Absolute fail-closed override — never emit allow under attempted/unknown/terminal.
  if (
    base.EXECUTION_ALLOWED &&
    (base.evidence.providerSubmissionAttempted ||
      base.evidence.providerUncertainUnknown ||
      base.evidence.providerTerminal ||
      base.evidence.ledgerCompensated ||
      base.evidence.stuckCommittingClass)
  ) {
    const recoveryRequired =
      base.evidence.stuckCommittingClass ||
      base.evidence.providerUncertainUnknown ||
      base.evidence.recoveryEligible;
    return finish({
      EXECUTION_ALLOWED: false,
      EXECUTION_BLOCKED: true,
      RECONCILIATION_REQUIRED: true,
      RECOVERY_REQUIRED: recoveryRequired,
      OPERATOR_REVIEW_REQUIRED: true,
      disposition: "operator_review_no_submit",
      scenario: partial.scenario,
      providerSubmitAllowed: false,
      retrySafe: false,
      reasonCode: "fail_closed_override",
      message:
        "Fail-closed override: terminal/unknown/compensated/committing evidence blocks submit.",
      evidence: base.evidence,
      safetyHints: {
        successfulMoneyCannotReExecute: true,
        compensatedCannotSilentlyReplay: true,
        uncertainCannotBecomeRetrySafeWithoutEvidence: true,
        stuckCommittingRequiresExplicitRecovery: base.evidence
          .stuckCommittingClass
          ? recoveryRequired
          : true,
        duplicateCommandCannotSecondExecute: true,
        staleUiCannotBypassTerminalProtection: true,
        repeatedRecoveryIdempotent: true,
      },
    });
  }

  return base;
}

function buildEvidence(
  input: BuildTerminalStateReplayInvariantsInput
): TerminalStateReplayInvariantsSnapshot["evidence"] {
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

  const providerTerminal =
    status !== "none" && isTerminalProviderExecutionStatus(status);
  const providerUncertainUnknown =
    status !== "none" &&
    (isUncertainProviderExecutionStatus(status) ||
      (status === "executing" && !execution?.completedAtIso));

  const ledgerCompensated =
    ledger === "compensated" || reservation === "compensated";
  const ledgerCommitting =
    ledger === "committing" || reservation === "committing";

  const nowMs = input.nowMs ?? Date.now();
  const staleAfterMs =
    input.staleAfterMs ?? PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS;

  const recoveryEligible = execution
    ? isRecoveryEligibleProviderExecution(execution, nowMs, staleAfterMs)
    : false;

  // Stuck-committing class: durable ledger `committing` (explicit recovery path).
  const stuckCommittingClass = ledgerCommitting;

  // Reconciled terminal class: prior reconciliation/recovery claim OR
  // durable terminal provider outcome (actual succeeded|failed — no RECONCILED status).
  const reconciledTerminalClass =
    Boolean(input.reconciledTerminalClaim) || providerTerminal;

  return {
    ledgerStatusNormalized: ledger,
    reservationStatusNormalized: reservation,
    providerExecutionStatus: status,
    providerTerminal,
    providerUncertainUnknown,
    ledgerCompensated,
    ledgerCommitting,
    stuckCommittingClass,
    reconciledTerminalClass,
    providerSubmissionAttempted: providerSubmissionAttempted(execution),
    idempotencyKeyBound,
    recoveryEligible,
  };
}

function safetyHintsFrom(
  evidence: TerminalStateReplayInvariantsSnapshot["evidence"],
  decisions: {
    EXECUTION_ALLOWED: boolean;
    retrySafe: boolean;
    RECOVERY_REQUIRED: boolean;
    scenario: TerminalInvariantScenario;
  }
): Omit<
  TerminalStateReplayInvariantsSnapshot["safety"],
  "invariantsOk" | "invariantViolations"
> {
  return {
    successfulMoneyCannotReExecute:
      evidence.providerExecutionStatus !== "succeeded" ||
      !decisions.EXECUTION_ALLOWED,
    compensatedCannotSilentlyReplay: !evidence.ledgerCompensated
      ? true
      : !decisions.EXECUTION_ALLOWED,
    uncertainCannotBecomeRetrySafeWithoutEvidence: !decisions.retrySafe,
    stuckCommittingRequiresExplicitRecovery: evidence.stuckCommittingClass
      ? decisions.RECOVERY_REQUIRED
      : true,
    duplicateCommandCannotSecondExecute:
      !evidence.providerSubmissionAttempted || !decisions.EXECUTION_ALLOWED,
    staleUiCannotBypassTerminalProtection:
      !evidence.providerTerminal || !decisions.EXECUTION_ALLOWED,
    repeatedRecoveryIdempotent:
      decisions.scenario === "repeated_recovery_idempotent" ||
      decisions.scenario === "terminal_succeeded_replay" ||
      decisions.scenario === "terminal_failed_replay" ||
      decisions.scenario === "reconciled_terminal_replay" ||
      true,
  };
}

/**
 * Pure terminal-state + replay invariant decision from durable local facts only.
 */
export function buildRefundProviderTerminalStateReplayInvariants(
  input: BuildTerminalStateReplayInvariantsInput
): TerminalStateReplayInvariantsSnapshot {
  const evidence = buildEvidence(input);
  const execution = input.existingExecution;
  const firstTimeAllowed = input.firstTimeSubmitAllowed !== false;
  const surface = input.actionSurface ?? "unspecified";
  const nowMs = input.nowMs ?? Date.now();
  const staleAfterMs =
    input.staleAfterMs ?? PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS;

  const decide = (args: {
    EXECUTION_ALLOWED: boolean;
    RECONCILIATION_REQUIRED: boolean;
    RECOVERY_REQUIRED: boolean;
    OPERATOR_REVIEW_REQUIRED: boolean;
    disposition: TerminalInvariantDisposition;
    scenario: TerminalInvariantScenario;
    retrySafe: boolean;
    reasonCode: string;
    message: string;
  }): TerminalStateReplayInvariantsSnapshot =>
    finish({
      EXECUTION_ALLOWED: args.EXECUTION_ALLOWED,
      EXECUTION_BLOCKED: !args.EXECUTION_ALLOWED,
      RECONCILIATION_REQUIRED: args.RECONCILIATION_REQUIRED,
      RECOVERY_REQUIRED: args.RECOVERY_REQUIRED,
      OPERATOR_REVIEW_REQUIRED: args.OPERATOR_REVIEW_REQUIRED,
      disposition: args.disposition,
      scenario: args.scenario,
      providerSubmitAllowed: args.EXECUTION_ALLOWED,
      retrySafe: args.retrySafe,
      reasonCode: args.reasonCode,
      message: args.message,
      evidence,
      safetyHints: safetyHintsFrom(evidence, {
        EXECUTION_ALLOWED: args.EXECUTION_ALLOWED,
        retrySafe: args.retrySafe,
        RECOVERY_REQUIRED: args.RECOVERY_REQUIRED,
        scenario: args.scenario,
      }),
    });

  if (!firstTimeAllowed) {
    return decide({
      EXECUTION_ALLOWED: false,
      RECONCILIATION_REQUIRED: false,
      RECOVERY_REQUIRED: false,
      OPERATOR_REVIEW_REQUIRED: false,
      disposition: "block_no_submit",
      scenario: "gates_off",
      retrySafe: false,
      reasonCode: "gates_or_mode_off",
      message:
        "Provider gates / execution mode OFF — first-time submit blocked.",
    });
  }

  if (execution && !evidence.idempotencyKeyBound) {
    return decide({
      EXECUTION_ALLOWED: false,
      RECONCILIATION_REQUIRED: true,
      RECOVERY_REQUIRED: false,
      OPERATOR_REVIEW_REQUIRED: true,
      disposition: "operator_review_no_submit",
      scenario: "idempotency_key_mismatch",
      retrySafe: false,
      reasonCode: "idempotency_key_mismatch",
      message:
        "Idempotency key does not match ledger-bound key; block submit and review.",
    });
  }

  // Compensated ledger — cannot silently replay provider money.
  if (evidence.ledgerCompensated) {
    return decide({
      EXECUTION_ALLOWED: false,
      RECONCILIATION_REQUIRED: evidence.providerUncertainUnknown,
      RECOVERY_REQUIRED: false,
      OPERATOR_REVIEW_REQUIRED:
        evidence.providerUncertainUnknown ||
        evidence.providerExecutionStatus === "executing",
      disposition: "block_no_submit",
      scenario: "compensated_silent_replay",
      retrySafe: false,
      reasonCode: "ledger_compensated",
      message:
        "Ledger is compensated; provider money submit/replay is blocked.",
    });
  }

  // Stuck committing class — explicit recovery path required (no provider submit).
  if (evidence.stuckCommittingClass) {
    return decide({
      EXECUTION_ALLOWED: false,
      RECONCILIATION_REQUIRED: true,
      RECOVERY_REQUIRED: true,
      OPERATOR_REVIEW_REQUIRED: true,
      disposition: "recover_no_submit",
      scenario:
        surface === "recovery_action"
          ? "repeated_recovery_idempotent"
          : "committing_stuck_requires_recovery",
      retrySafe: false,
      reasonCode: "stuck_committing_requires_recovery",
      message:
        "Ledger status is committing (stuck-committing class); use explicit stuck-committing recovery — never provider money submit.",
    });
  }

  if (evidence.ledgerStatusNormalized !== "committed") {
    return decide({
      EXECUTION_ALLOWED: false,
      RECONCILIATION_REQUIRED: false,
      RECOVERY_REQUIRED: false,
      OPERATOR_REVIEW_REQUIRED: false,
      disposition: "block_no_submit",
      scenario: "ledger_not_ready",
      retrySafe: false,
      reasonCode: "ledger_not_committed",
      message: "Ledger must be committed before provider money execute.",
    });
  }

  // No prior execution / planned only → first submit (when gates already checked).
  if (!execution || execution.status === "planned") {
    if (surface === "stale_ui" || surface === "duplicate_command") {
      // Stale UI / duplicate command with no prior attempt: still first-submit
      // eligible only when no execution exists; label for audit.
      return decide({
        EXECUTION_ALLOWED: true,
        RECONCILIATION_REQUIRED: false,
        RECOVERY_REQUIRED: false,
        OPERATOR_REVIEW_REQUIRED: false,
        disposition: "allow_first_submit",
        scenario: "first_submit_clean",
        retrySafe: false,
        reasonCode: "first_submit_eligible",
        message:
          "No prior provider submission; first-time submit allowed when ACK/gates satisfied.",
      });
    }
    return decide({
      EXECUTION_ALLOWED: true,
      RECONCILIATION_REQUIRED: false,
      RECOVERY_REQUIRED: false,
      OPERATOR_REVIEW_REQUIRED: false,
      disposition: "allow_first_submit",
      scenario: "first_submit_clean",
      retrySafe: false,
      reasonCode: "first_submit_eligible",
      message:
        "No prior provider submission; first-time submit allowed when ACK/gates satisfied.",
    });
  }

  // Terminal succeeded — cannot re-execute; safe replay without submit.
  if (execution.status === "succeeded") {
    const scenario: TerminalInvariantScenario =
      input.reconciledTerminalClaim || surface === "reconciliation"
        ? "reconciled_terminal_replay"
        : surface === "stale_ui"
          ? "stale_ui_action_bypass_attempt"
          : surface === "duplicate_command"
            ? "duplicate_command_second_execution"
            : surface === "recovery_action"
              ? "repeated_recovery_idempotent"
              : "terminal_succeeded_replay";
    return decide({
      EXECUTION_ALLOWED: false,
      RECONCILIATION_REQUIRED: false,
      RECOVERY_REQUIRED: false,
      OPERATOR_REVIEW_REQUIRED: false,
      disposition: "safe_replay_no_submit",
      scenario,
      retrySafe: false,
      reasonCode: "already_succeeded_no_reexecute",
      message:
        "Prior provider execution succeeded; replay is safe without re-submit (terminal protection).",
    });
  }

  // Terminal failed — V1 no retry under same key.
  if (execution.status === "failed") {
    void isFailedProviderExecutionRetryAllowedInV1();
    const scenario: TerminalInvariantScenario =
      input.reconciledTerminalClaim || surface === "reconciliation"
        ? "reconciled_terminal_replay"
        : surface === "stale_ui"
          ? "stale_ui_action_bypass_attempt"
          : surface === "duplicate_command"
            ? "duplicate_command_second_execution"
            : surface === "recovery_action"
              ? "repeated_recovery_idempotent"
              : "terminal_failed_replay";
    return decide({
      EXECUTION_ALLOWED: false,
      RECONCILIATION_REQUIRED: false,
      RECOVERY_REQUIRED: false,
      OPERATOR_REVIEW_REQUIRED: true,
      disposition: "block_no_submit",
      scenario,
      retrySafe: false,
      reasonCode: "prior_failed_no_retry",
      message:
        "Prior provider execution failed; V1 blocks retry under the same idempotency key.",
    });
  }

  // uncertain = task UNKNOWN — never retry-safe without new evidence; reconcile + recover.
  if (execution.status === "uncertain") {
    return decide({
      EXECUTION_ALLOWED: false,
      RECONCILIATION_REQUIRED: true,
      RECOVERY_REQUIRED: true,
      OPERATOR_REVIEW_REQUIRED: true,
      disposition:
        surface === "recovery_action"
          ? "recover_no_submit"
          : "reconcile_no_submit",
      scenario:
        surface === "recovery_action"
          ? "repeated_recovery_idempotent"
          : "uncertain_unknown_replay",
      retrySafe: false,
      reasonCode: "uncertain_unknown_not_retry_safe",
      message:
        "Provider outcome uncertain (UNKNOWN class); block submit, require reconciliation/recovery with evidence — never retry-safe by silence.",
    });
  }

  // Executing — in-flight or stale; never blind resubmit.
  if (execution.status === "executing") {
    const stale = isStaleExecutingProviderExecution(
      execution,
      nowMs,
      staleAfterMs
    );
    const recoveryEligible = isRecoveryEligibleProviderExecution(
      execution,
      nowMs,
      staleAfterMs
    );
    return decide({
      EXECUTION_ALLOWED: false,
      RECONCILIATION_REQUIRED: true,
      RECOVERY_REQUIRED: recoveryEligible,
      OPERATOR_REVIEW_REQUIRED: stale,
      disposition: recoveryEligible ? "recover_no_submit" : "reconcile_no_submit",
      scenario:
        surface === "recovery_action"
          ? "repeated_recovery_idempotent"
          : surface === "duplicate_command"
            ? "duplicate_command_second_execution"
            : surface === "stale_ui"
              ? "stale_ui_action_bypass_attempt"
              : stale
                ? "stale_executing_recovery"
                : "in_flight_executing",
      retrySafe: false,
      reasonCode: stale ? "stale_executing_recovery" : "in_flight_no_resubmit",
      message: stale
        ? "Stale executing requires recovery lookup; never blind re-submit."
        : "Execution in flight; duplicate command / stale UI must not create second provider execution.",
    });
  }

  return decide({
    EXECUTION_ALLOWED: false,
    RECONCILIATION_REQUIRED: true,
    RECOVERY_REQUIRED: true,
    OPERATOR_REVIEW_REQUIRED: true,
    disposition: "operator_review_no_submit",
    scenario: "duplicate_command_second_execution",
    retrySafe: false,
    reasonCode: "unrecognized_execution_state",
    message: "Unrecognized provider execution state; fail-closed block submit.",
  });
}

/**
 * Classify a repeated recovery action against the same durable facts.
 * Must be idempotent: same decisions on Nth call; never escalate to submit.
 */
export function classifyRepeatedRecoveryAction(input: {
  facts: BuildTerminalStateReplayInvariantsInput;
}): {
  first: TerminalStateReplayInvariantsSnapshot;
  second: TerminalStateReplayInvariantsSnapshot;
  idempotent: boolean;
  neverAllowsSubmit: boolean;
} {
  const base = {
    ...input.facts,
    actionSurface: "recovery_action" as const,
  };
  const first = buildRefundProviderTerminalStateReplayInvariants(base);
  const second = buildRefundProviderTerminalStateReplayInvariants(base);
  const idempotent =
    first.EXECUTION_ALLOWED === second.EXECUTION_ALLOWED &&
    first.EXECUTION_BLOCKED === second.EXECUTION_BLOCKED &&
    first.RECONCILIATION_REQUIRED === second.RECONCILIATION_REQUIRED &&
    first.RECOVERY_REQUIRED === second.RECOVERY_REQUIRED &&
    first.OPERATOR_REVIEW_REQUIRED === second.OPERATOR_REVIEW_REQUIRED &&
    first.retrySafe === second.retrySafe &&
    first.reasonCode === second.reasonCode;
  return {
    first,
    second,
    idempotent,
    neverAllowsSubmit:
      !first.EXECUTION_ALLOWED &&
      !second.EXECUTION_ALLOWED &&
      !first.providerSubmitAllowed &&
      !second.providerSubmitAllowed,
  };
}
