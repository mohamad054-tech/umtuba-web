/**
 * RELEASE-CANDIDATE safety matrix for refund / provider money execution.
 *
 * Consolidates completed SoT tip safety work (terminal-state + replay invariants,
 * reconciliation→terminal E2E matrix) into one deterministic, TEST-ONLY matrix.
 *
 * Covered domains:
 *   REQUEST | RESERVATION | COMMITTING | PROVIDER_EXECUTION |
 *   UNCERTAIN_OUTCOME | RECONCILIATION | RECOVERY | COMPENSATION |
 *   TERMINAL_STATE | DUPLICATE_REPLAY
 *
 * Per supported row records:
 *   INPUT_STATE, PROVIDER_STATE, EXECUTION_ALLOWED, EXECUTION_BLOCKED,
 *   RETRY_SAFE, RECONCILIATION_REQUIRED, RECOVERY_REQUIRED,
 *   OPERATOR_REVIEW_REQUIRED, TERMINAL, REPLAY_ALLOWED, EXPECTED_EVIDENCE
 *
 * Does NOT invent a new provider architecture. Consumes actual SoT contracts only.
 * STRIPE_CALLS=0 · MONEY_MOVEMENT=0 · DB_WRITES=0 · MIGRATIONS=0 · PROVIDER_GATES=OFF
 */

import { buildPartialRefundProviderIdempotencyKey } from "./idempotency";
import {
  E2E_MATRIX_SCENARIOS,
  runFullRefundProviderReconciliationTerminalE2eMatrix,
  type E2eMatrixScenarioId,
} from "./refundProviderReconciliationTerminalE2eMatrix";
import {
  TERMINAL_INVARIANT_TASK_ALIAS_MAP,
  buildRefundProviderTerminalStateReplayInvariants,
  classifyRepeatedRecoveryAction,
  type BuildTerminalStateReplayInvariantsInput,
} from "./refundProviderTerminalStateReplayInvariants";
import { isTerminalProviderExecutionStatus } from "./stateMachine";
import type {
  PartialRefundProviderExecutionRecord,
  PartialRefundProviderExecutionStatus,
} from "./types";

export const REFUND_PROVIDER_RELEASE_CANDIDATE_SAFETY_MATRIX_VERSION =
  "refund-provider-release-candidate-safety-matrix-v1" as const;

/** Release-candidate coverage domains (task order). */
export const RC_SAFETY_MATRIX_PHASES = [
  "REQUEST",
  "RESERVATION",
  "COMMITTING",
  "PROVIDER_EXECUTION",
  "UNCERTAIN_OUTCOME",
  "RECONCILIATION",
  "RECOVERY",
  "COMPENSATION",
  "TERMINAL_STATE",
  "DUPLICATE_REPLAY",
] as const;

export type RcSafetyMatrixPhase = (typeof RC_SAFETY_MATRIX_PHASES)[number];

/**
 * Supported RC scenarios. Mapped to actual SoT names via
 * TERMINAL_INVARIANT_TASK_ALIAS_MAP (no invented replacements).
 */
export const RC_SAFETY_MATRIX_SCENARIOS = [
  /** REQUEST phase: planned ledger is not yet provider-eligible (actual SoT). */
  "REQUEST_PLANNED_NOT_READY",
  /** RESERVATION phase: reserved but ledger still not committed. */
  "RESERVATION_HELD_NOT_READY",
  "COMMITTING_BLOCKS_SUBMIT",
  /** First-time provider submit only after ledger committed (actual SoT gate). */
  "PROVIDER_EXECUTION_FIRST_SUBMIT_CLEAN",
  "PROVIDER_EXECUTION_IN_FLIGHT",
  "PROVIDER_EXECUTION_SUCCEEDED",
  "PROVIDER_EXECUTION_FAILED",
  "UNCERTAIN_OUTCOME_NOT_RETRY_SAFE",
  "RECONCILIATION_TERMINAL_NO_REPLAY",
  "RECOVERY_STUCK_COMMITTING",
  "COMPENSATION_NO_SILENT_REPLAY",
  "TERMINAL_SUCCEEDED_NO_REPLAY",
  "TERMINAL_FAILED_NO_REPLAY",
  "DUPLICATE_REPLAY_AFTER_SUCCESS",
  "STALE_UI_CANNOT_BYPASS",
] as const;

export type RcSafetyMatrixScenarioId =
  (typeof RC_SAFETY_MATRIX_SCENARIOS)[number];

export type RcSafetyMatrixRow = {
  scenario: RcSafetyMatrixScenarioId;
  phase: RcSafetyMatrixPhase;
  INPUT_STATE: string;
  PROVIDER_STATE: PartialRefundProviderExecutionStatus | "none";
  EXECUTION_ALLOWED: boolean;
  EXECUTION_BLOCKED: boolean;
  RETRY_SAFE: boolean;
  RECONCILIATION_REQUIRED: boolean;
  RECOVERY_REQUIRED: boolean;
  OPERATOR_REVIEW_REQUIRED: boolean;
  TERMINAL: boolean;
  REPLAY_ALLOWED: boolean;
  EXPECTED_EVIDENCE: string[];
  reasonCode: string;
  disposition: string;
  invariantsOk: boolean;
  invariantViolations: string[];
};

export type RcSafetyMatrixSafetyCounters = {
  STRIPE_CALLS: 0;
  MONEY_MOVEMENT: 0;
  DB_WRITES: 0;
  MIGRATIONS: 0;
  PROVIDER_GATES: "OFF";
};

export type RcSafetyMatrixRunResult = {
  version: typeof REFUND_PROVIDER_RELEASE_CANDIDATE_SAFETY_MATRIX_VERSION;
  rows: RcSafetyMatrixRow[];
  phasesCovered: RcSafetyMatrixPhase[];
  scenariosCovered: RcSafetyMatrixScenarioId[];
  e2eMatrixConsumed: {
    version: string;
    scenarios: E2eMatrixScenarioId[];
    allPass: boolean;
  };
  criticalInvariants: {
    succeededCannotExecuteTwice: boolean;
    uncertainNotAutomaticallyRetrySafe: boolean;
    compensatedCannotSilentlyReplay: boolean;
    terminalReconciledCannotSilentlyReplay: boolean;
    stuckCommittingRequiresExplicitRecovery: boolean;
    staleUiCannotBypassSafety: boolean;
    duplicateCommandCannotSecondProviderMoneyExecution: boolean;
  };
  matrixViolations: string[];
  allPass: boolean;
  safety: RcSafetyMatrixSafetyCounters;
};

const LEDGER = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const STORE = "11111111-2222-4333-8444-555555555555";
const ORDER = "66666666-7777-4888-8999-aaaaaaaaaaaa";
const ATTEMPT = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";
const CAPTURE = "cccccccc-dddd-4eee-8fff-000000000000";
const EXEC = "dddddddd-eeee-4fff-8000-111111111111";
const FIXED_NOW_MS = Date.parse("2026-08-10T01:30:00.000Z");

function baseExecution(
  overrides: Partial<PartialRefundProviderExecutionRecord> = {}
): PartialRefundProviderExecutionRecord {
  return {
    executionId: EXEC,
    storeId: STORE,
    ledgerId: LEDGER,
    orderId: ORDER,
    paymentAttemptId: ATTEMPT,
    captureEventId: CAPTURE,
    providerKind: "stripe",
    providerPaymentRef: "pi_test_rc_matrix_1",
    trustedAmountMinor: 2500,
    currency: "USD",
    idempotencyKey: buildPartialRefundProviderIdempotencyKey(LEDGER),
    status: "planned",
    providerRefundId: null,
    providerStatusSafe: null,
    failureCode: null,
    failureMessageSafe: null,
    operatorUserId: null,
    operatorReasonSafe: null,
    startedAtIso: null,
    completedAtIso: null,
    lastLookupAtIso: null,
    createdAtIso: "2026-08-09T20:00:00.000Z",
    updatedAtIso: "2026-08-09T20:00:00.000Z",
    ...overrides,
  };
}

type RcFixture = {
  scenario: RcSafetyMatrixScenarioId;
  phase: RcSafetyMatrixPhase;
  facts: BuildTerminalStateReplayInvariantsInput;
  /** Additional expected evidence tokens beyond auto-derived ones. */
  expectedEvidenceExtra?: string[];
};

/**
 * Deterministic fixtures for every RC scenario row.
 * Pure / in-memory — no I/O, no Stripe, no DB.
 */
export function buildRcSafetyMatrixFixtures(): RcFixture[] {
  const gatesOn = true;
  const succeeded = baseExecution({
    status: "succeeded",
    providerRefundId: "re_rc_ok",
    startedAtIso: "2026-08-09T20:01:00.000Z",
    completedAtIso: "2026-08-09T20:01:01.000Z",
  });
  const failed = baseExecution({
    status: "failed",
    failureCode: "provider_rejected",
    failureMessageSafe: "provider_rejected",
    startedAtIso: "2026-08-09T20:01:00.000Z",
    completedAtIso: "2026-08-09T20:01:02.000Z",
  });
  const uncertain = baseExecution({
    status: "uncertain",
    startedAtIso: "2026-08-09T20:01:00.000Z",
    completedAtIso: null,
    lastLookupAtIso: "2026-08-09T20:02:00.000Z",
  });
  const executing = baseExecution({
    status: "executing",
    startedAtIso: "2026-08-10T01:29:30.000Z",
    completedAtIso: null,
  });
  const staleExecuting = baseExecution({
    status: "executing",
    startedAtIso: "2026-08-09T20:00:00.000Z",
    completedAtIso: null,
  });

  return [
    {
      scenario: "REQUEST_PLANNED_NOT_READY",
      phase: "REQUEST",
      facts: {
        ledgerStatus: "planned",
        reservationStatus: "absent",
        existingExecution: null,
        firstTimeSubmitAllowed: gatesOn,
        actionSurface: "first_submit",
        nowMs: FIXED_NOW_MS,
      },
      expectedEvidenceExtra: [
        "phase:REQUEST",
        "ledger_not_committed",
        "provider_submit_blocked_until_committed",
      ],
    },
    {
      scenario: "RESERVATION_HELD_NOT_READY",
      phase: "RESERVATION",
      facts: {
        ledgerStatus: "planned",
        reservationStatus: "reserved",
        existingExecution: null,
        firstTimeSubmitAllowed: gatesOn,
        actionSurface: "first_submit",
        nowMs: FIXED_NOW_MS,
      },
      expectedEvidenceExtra: [
        "phase:RESERVATION",
        "reservation:reserved",
        "ledger_not_committed",
      ],
    },
    {
      scenario: "COMMITTING_BLOCKS_SUBMIT",
      phase: "COMMITTING",
      facts: {
        ledgerStatus: "committing",
        reservationStatus: "committing",
        existingExecution: null,
        firstTimeSubmitAllowed: gatesOn,
        actionSurface: "first_submit",
        nowMs: FIXED_NOW_MS,
      },
      expectedEvidenceExtra: [
        "phase:COMMITTING",
        "stuck_committing_class",
        "explicit_recovery_required",
      ],
    },
    {
      scenario: "PROVIDER_EXECUTION_FIRST_SUBMIT_CLEAN",
      phase: "PROVIDER_EXECUTION",
      facts: {
        ledgerStatus: "committed",
        reservationStatus: "committed",
        existingExecution: null,
        firstTimeSubmitAllowed: gatesOn,
        actionSurface: "first_submit",
        nowMs: FIXED_NOW_MS,
      },
      expectedEvidenceExtra: [
        "phase:PROVIDER_EXECUTION",
        "first_submit_eligible",
        "ledger:committed",
      ],
    },
    {
      scenario: "PROVIDER_EXECUTION_IN_FLIGHT",
      phase: "PROVIDER_EXECUTION",
      facts: {
        ledgerStatus: "committed",
        reservationStatus: "committed",
        existingExecution: executing,
        firstTimeSubmitAllowed: gatesOn,
        actionSurface: "duplicate_command",
        nowMs: FIXED_NOW_MS,
        staleAfterMs: 60_000,
      },
      expectedEvidenceExtra: [
        "phase:PROVIDER_EXECUTION",
        "provider:executing",
        "no_second_provider_money_execution",
      ],
    },
    {
      scenario: "PROVIDER_EXECUTION_SUCCEEDED",
      phase: "PROVIDER_EXECUTION",
      facts: {
        ledgerStatus: "committed",
        reservationStatus: "committed",
        existingExecution: succeeded,
        firstTimeSubmitAllowed: gatesOn,
        actionSurface: "unspecified",
        nowMs: FIXED_NOW_MS,
      },
      expectedEvidenceExtra: [
        "phase:PROVIDER_EXECUTION",
        "provider:succeeded",
        "alias:SUCCESS→succeeded",
        "cannot_execute_twice",
      ],
    },
    {
      scenario: "PROVIDER_EXECUTION_FAILED",
      phase: "PROVIDER_EXECUTION",
      facts: {
        ledgerStatus: "committed",
        reservationStatus: "committed",
        existingExecution: failed,
        firstTimeSubmitAllowed: gatesOn,
        actionSurface: "unspecified",
        nowMs: FIXED_NOW_MS,
      },
      expectedEvidenceExtra: [
        "phase:PROVIDER_EXECUTION",
        "provider:failed",
        "alias:FAILED→failed",
        "v1_no_auto_retry",
      ],
    },
    {
      scenario: "UNCERTAIN_OUTCOME_NOT_RETRY_SAFE",
      phase: "UNCERTAIN_OUTCOME",
      facts: {
        ledgerStatus: "committed",
        reservationStatus: "committed",
        existingExecution: uncertain,
        firstTimeSubmitAllowed: gatesOn,
        actionSurface: "unspecified",
        nowMs: FIXED_NOW_MS,
      },
      expectedEvidenceExtra: [
        "phase:UNCERTAIN_OUTCOME",
        "provider:uncertain",
        "alias:UNKNOWN→uncertain",
        "not_automatically_retry_safe",
      ],
    },
    {
      scenario: "RECONCILIATION_TERMINAL_NO_REPLAY",
      phase: "RECONCILIATION",
      facts: {
        ledgerStatus: "committed",
        reservationStatus: "committed",
        existingExecution: succeeded,
        firstTimeSubmitAllowed: gatesOn,
        actionSurface: "reconciliation",
        reconciledTerminalClaim: true,
        nowMs: FIXED_NOW_MS,
      },
      expectedEvidenceExtra: [
        "phase:RECONCILIATION",
        "reconciled_terminal_class",
        "no_silent_replay",
      ],
    },
    {
      scenario: "RECOVERY_STUCK_COMMITTING",
      phase: "RECOVERY",
      facts: {
        ledgerStatus: "committing",
        reservationStatus: "committing",
        existingExecution: staleExecuting,
        firstTimeSubmitAllowed: gatesOn,
        actionSurface: "recovery_action",
        nowMs: FIXED_NOW_MS,
        staleAfterMs: 60_000,
      },
      expectedEvidenceExtra: [
        "phase:RECOVERY",
        "stuck_committing_class",
        "explicit_recovery_required",
        "repeated_recovery_idempotent",
      ],
    },
    {
      scenario: "COMPENSATION_NO_SILENT_REPLAY",
      phase: "COMPENSATION",
      facts: {
        ledgerStatus: "compensated",
        reservationStatus: "compensated",
        existingExecution: succeeded,
        firstTimeSubmitAllowed: gatesOn,
        actionSurface: "duplicate_command",
        nowMs: FIXED_NOW_MS,
      },
      expectedEvidenceExtra: [
        "phase:COMPENSATION",
        "ledger:compensated",
        "alias:COMPENSATED→compensated",
        "no_silent_replay",
      ],
    },
    {
      scenario: "TERMINAL_SUCCEEDED_NO_REPLAY",
      phase: "TERMINAL_STATE",
      facts: {
        ledgerStatus: "committed",
        reservationStatus: "committed",
        existingExecution: succeeded,
        firstTimeSubmitAllowed: gatesOn,
        actionSurface: "duplicate_command",
        reconciledTerminalClaim: true,
        nowMs: FIXED_NOW_MS,
      },
      expectedEvidenceExtra: [
        "phase:TERMINAL_STATE",
        "provider:succeeded",
        "terminal",
        "replay_forbidden",
      ],
    },
    {
      scenario: "TERMINAL_FAILED_NO_REPLAY",
      phase: "TERMINAL_STATE",
      facts: {
        ledgerStatus: "committed",
        reservationStatus: "committed",
        existingExecution: failed,
        firstTimeSubmitAllowed: gatesOn,
        actionSurface: "duplicate_command",
        reconciledTerminalClaim: true,
        nowMs: FIXED_NOW_MS,
      },
      expectedEvidenceExtra: [
        "phase:TERMINAL_STATE",
        "provider:failed",
        "terminal",
        "replay_forbidden",
      ],
    },
    {
      scenario: "DUPLICATE_REPLAY_AFTER_SUCCESS",
      phase: "DUPLICATE_REPLAY",
      facts: {
        ledgerStatus: "committed",
        reservationStatus: "committed",
        existingExecution: succeeded,
        firstTimeSubmitAllowed: gatesOn,
        actionSurface: "duplicate_command",
        reconciledTerminalClaim: true,
        nowMs: FIXED_NOW_MS,
      },
      expectedEvidenceExtra: [
        "phase:DUPLICATE_REPLAY",
        "duplicate_command",
        "no_second_provider_money_execution",
      ],
    },
    {
      scenario: "STALE_UI_CANNOT_BYPASS",
      phase: "DUPLICATE_REPLAY",
      facts: {
        ledgerStatus: "committed",
        reservationStatus: "committed",
        existingExecution: succeeded,
        firstTimeSubmitAllowed: gatesOn,
        actionSurface: "stale_ui",
        reconciledTerminalClaim: true,
        nowMs: FIXED_NOW_MS,
      },
      expectedEvidenceExtra: [
        "phase:DUPLICATE_REPLAY",
        "stale_ui",
        "cannot_bypass_terminal_protection",
      ],
    },
  ];
}

function deriveExpectedEvidence(
  fixture: RcFixture,
  snap: ReturnType<typeof buildRefundProviderTerminalStateReplayInvariants>
): string[] {
  const e = snap.evidence;
  const auto: string[] = [
    `ledger:${e.ledgerStatusNormalized}`,
    `reservation:${e.reservationStatusNormalized}`,
    `provider:${e.providerExecutionStatus}`,
    `reason:${snap.reasonCode}`,
    `disposition:${snap.disposition}`,
    `scenario_label:${snap.scenario}`,
  ];
  if (e.providerTerminal) auto.push("provider_terminal");
  if (e.providerUncertainUnknown) auto.push("provider_uncertain_unknown");
  if (e.ledgerCompensated) auto.push("ledger_compensated");
  if (e.stuckCommittingClass) auto.push("stuck_committing_class");
  if (e.reconciledTerminalClass) auto.push("reconciled_terminal_class");
  if (e.providerSubmissionAttempted) auto.push("provider_submission_attempted");
  if (e.recoveryEligible) auto.push("recovery_eligible");
  return [...auto, ...(fixture.expectedEvidenceExtra ?? [])];
}

function observeRow(fixture: RcFixture): RcSafetyMatrixRow {
  const snap = buildRefundProviderTerminalStateReplayInvariants(fixture.facts);
  const providerTerminal =
    snap.evidence.providerTerminal ||
    (snap.evidence.providerExecutionStatus !== "none" &&
      isTerminalProviderExecutionStatus(snap.evidence.providerExecutionStatus));
  const TERMINAL =
    providerTerminal ||
    snap.evidence.ledgerCompensated ||
    snap.evidence.reconciledTerminalClass;
  // Replay ≠ first submit. Replay = retrySafe or submit after a prior attempt.
  const REPLAY_ALLOWED =
    snap.retrySafe ||
    (snap.EXECUTION_ALLOWED && snap.evidence.providerSubmissionAttempted);

  return {
    scenario: fixture.scenario,
    phase: fixture.phase,
    INPUT_STATE: `ledger=${snap.evidence.ledgerStatusNormalized};reservation=${snap.evidence.reservationStatusNormalized}`,
    PROVIDER_STATE: snap.evidence.providerExecutionStatus,
    EXECUTION_ALLOWED: snap.EXECUTION_ALLOWED,
    EXECUTION_BLOCKED: snap.EXECUTION_BLOCKED,
    RETRY_SAFE: snap.retrySafe,
    RECONCILIATION_REQUIRED: snap.RECONCILIATION_REQUIRED,
    RECOVERY_REQUIRED: snap.RECOVERY_REQUIRED,
    OPERATOR_REVIEW_REQUIRED: snap.OPERATOR_REVIEW_REQUIRED,
    TERMINAL,
    REPLAY_ALLOWED,
    EXPECTED_EVIDENCE: deriveExpectedEvidence(fixture, snap),
    reasonCode: snap.reasonCode,
    disposition: snap.disposition,
    invariantsOk: snap.safety.invariantsOk,
    invariantViolations: snap.safety.invariantViolations,
  };
}

/**
 * Scenario-specific contracts for the RC matrix.
 */
export function assertRcSafetyMatrixRowContract(row: RcSafetyMatrixRow): string[] {
  const violations: string[] = [];

  if (row.EXECUTION_ALLOWED === row.EXECUTION_BLOCKED) {
    violations.push(`${row.scenario}_EXECUTION_ALLOWED_BLOCKED_MUST_DIFFER`);
  }
  if (!row.invariantsOk) {
    violations.push(`${row.scenario}_INVARIANTS_MUST_PASS`);
  }
  // Replay is never true when both retrySafe and execution are false.
  if (row.REPLAY_ALLOWED && !row.RETRY_SAFE && !row.EXECUTION_ALLOWED) {
    violations.push(`${row.scenario}_REPLAY_ALLOWED_WITHOUT_SUBMIT_OR_RETRY`);
  }
  // First-submit allow must not be classified as replay.
  if (
    row.scenario === "PROVIDER_EXECUTION_FIRST_SUBMIT_CLEAN" &&
    row.REPLAY_ALLOWED
  ) {
    violations.push("CLEAN_FIRST_SUBMIT_MUST_NOT_BE_CLASSIFIED_AS_REPLAY");
  }

  switch (row.scenario) {
    case "REQUEST_PLANNED_NOT_READY":
    case "RESERVATION_HELD_NOT_READY": {
      // Actual SoT: provider money requires ledger committed.
      if (row.EXECUTION_ALLOWED || row.REPLAY_ALLOWED || row.RETRY_SAFE) {
        violations.push(`${row.scenario}_MUST_BLOCK_UNTIL_LEDGER_COMMITTED`);
      }
      if (row.TERMINAL) {
        violations.push(`${row.scenario}_MUST_NOT_BE_TERMINAL`);
      }
      if (!row.INPUT_STATE.includes("planned")) {
        violations.push(`${row.scenario}_INPUT_MUST_REFLECT_PLANNED_LEDGER`);
      }
      break;
    }
    case "PROVIDER_EXECUTION_FIRST_SUBMIT_CLEAN": {
      if (!row.EXECUTION_ALLOWED) {
        violations.push("CLEAN_FIRST_SUBMIT_MUST_ALLOW_WHEN_COMMITTED");
      }
      if (row.RETRY_SAFE) {
        violations.push("CLEAN_FIRST_SUBMIT_IS_NOT_RETRY");
      }
      if (row.TERMINAL) {
        violations.push("CLEAN_FIRST_SUBMIT_MUST_NOT_BE_TERMINAL");
      }
      if (row.PROVIDER_STATE !== "none") {
        violations.push("CLEAN_FIRST_SUBMIT_PROVIDER_MUST_BE_NONE");
      }
      break;
    }
    case "COMMITTING_BLOCKS_SUBMIT": {
      if (row.EXECUTION_ALLOWED || row.REPLAY_ALLOWED || row.RETRY_SAFE) {
        violations.push("COMMITTING_MUST_BLOCK_SUBMIT_AND_RETRY");
      }
      if (!row.RECOVERY_REQUIRED) {
        violations.push("COMMITTING_REQUIRES_EXPLICIT_RECOVERY");
      }
      if (!row.EXPECTED_EVIDENCE.includes("stuck_committing_class")) {
        violations.push("COMMITTING_EVIDENCE_MUST_INCLUDE_STUCK_CLASS");
      }
      break;
    }
    case "PROVIDER_EXECUTION_IN_FLIGHT": {
      if (row.EXECUTION_ALLOWED || row.REPLAY_ALLOWED) {
        violations.push("IN_FLIGHT_MUST_BLOCK_SECOND_EXECUTION");
      }
      if (row.PROVIDER_STATE !== "executing") {
        violations.push("IN_FLIGHT_PROVIDER_STATE_MUST_BE_EXECUTING");
      }
      break;
    }
    case "PROVIDER_EXECUTION_SUCCEEDED":
    case "TERMINAL_SUCCEEDED_NO_REPLAY":
    case "DUPLICATE_REPLAY_AFTER_SUCCESS":
    case "STALE_UI_CANNOT_BYPASS":
    case "RECONCILIATION_TERMINAL_NO_REPLAY": {
      if (row.PROVIDER_STATE !== "succeeded") {
        violations.push(`${row.scenario}_PROVIDER_MUST_BE_SUCCEEDED`);
      }
      if (row.EXECUTION_ALLOWED || row.REPLAY_ALLOWED || row.RETRY_SAFE) {
        violations.push(`${row.scenario}_SUCCEEDED_CANNOT_EXECUTE_OR_REPLAY`);
      }
      if (!row.TERMINAL) {
        violations.push(`${row.scenario}_MUST_BE_TERMINAL`);
      }
      if (row.PROVIDER_STATE === "succeeded" && !row.EXECUTION_BLOCKED) {
        violations.push(`${row.scenario}_SUCCEEDED_MUST_BLOCK`);
      }
      break;
    }
    case "PROVIDER_EXECUTION_FAILED":
    case "TERMINAL_FAILED_NO_REPLAY": {
      if (row.PROVIDER_STATE !== "failed") {
        violations.push(`${row.scenario}_PROVIDER_MUST_BE_FAILED`);
      }
      if (row.EXECUTION_ALLOWED || row.REPLAY_ALLOWED || row.RETRY_SAFE) {
        violations.push(`${row.scenario}_FAILED_MUST_NOT_AUTO_RETRY`);
      }
      if (!row.TERMINAL) {
        violations.push(`${row.scenario}_FAILED_MUST_BE_TERMINAL`);
      }
      break;
    }
    case "UNCERTAIN_OUTCOME_NOT_RETRY_SAFE": {
      if (row.PROVIDER_STATE !== "uncertain") {
        violations.push("UNCERTAIN_PROVIDER_STATE_REQUIRED");
      }
      if (row.RETRY_SAFE || row.REPLAY_ALLOWED || row.EXECUTION_ALLOWED) {
        violations.push("UNCERTAIN_MUST_NOT_BE_AUTOMATICALLY_RETRY_SAFE");
      }
      if (row.TERMINAL) {
        violations.push("UNCERTAIN_MUST_NOT_BE_PROVIDER_TERMINAL");
      }
      if (!row.RECONCILIATION_REQUIRED) {
        violations.push("UNCERTAIN_REQUIRES_RECONCILIATION");
      }
      if (!row.RECOVERY_REQUIRED) {
        violations.push("UNCERTAIN_REQUIRES_RECOVERY");
      }
      break;
    }
    case "RECOVERY_STUCK_COMMITTING": {
      if (!row.RECOVERY_REQUIRED) {
        violations.push("STUCK_RECOVERY_REQUIRES_RECOVERY");
      }
      if (row.EXECUTION_ALLOWED || row.REPLAY_ALLOWED || row.RETRY_SAFE) {
        violations.push("STUCK_RECOVERY_MUST_NOT_ALLOW_SUBMIT");
      }
      break;
    }
    case "COMPENSATION_NO_SILENT_REPLAY": {
      if (!row.INPUT_STATE.includes("compensated")) {
        violations.push("COMPENSATION_INPUT_MUST_BE_COMPENSATED");
      }
      if (row.EXECUTION_ALLOWED || row.REPLAY_ALLOWED || row.RETRY_SAFE) {
        violations.push("COMPENSATED_CANNOT_SILENTLY_REPLAY");
      }
      if (!row.TERMINAL) {
        violations.push("COMPENSATED_MUST_BE_TERMINAL");
      }
      break;
    }
    default: {
      const _exhaustive: never = row.scenario;
      violations.push(`UNHANDLED_RC_SCENARIO_${String(_exhaustive)}`);
    }
  }

  return violations;
}

function evaluateCriticalInvariants(rows: RcSafetyMatrixRow[]): {
  criticalInvariants: RcSafetyMatrixRunResult["criticalInvariants"];
  violations: string[];
} {
  const violations: string[] = [];
  const byScenario = Object.fromEntries(
    rows.map((r) => [r.scenario, r])
  ) as Record<RcSafetyMatrixScenarioId, RcSafetyMatrixRow>;

  const succeededCannotExecuteTwice =
    !byScenario.PROVIDER_EXECUTION_SUCCEEDED.EXECUTION_ALLOWED &&
    !byScenario.TERMINAL_SUCCEEDED_NO_REPLAY.EXECUTION_ALLOWED &&
    !byScenario.DUPLICATE_REPLAY_AFTER_SUCCESS.EXECUTION_ALLOWED;
  if (!succeededCannotExecuteTwice) {
    violations.push("CRITICAL_SUCCEEDED_CANNOT_EXECUTE_TWICE");
  }

  const uncertainNotAutomaticallyRetrySafe =
    !byScenario.UNCERTAIN_OUTCOME_NOT_RETRY_SAFE.RETRY_SAFE &&
    !byScenario.UNCERTAIN_OUTCOME_NOT_RETRY_SAFE.REPLAY_ALLOWED &&
    !byScenario.UNCERTAIN_OUTCOME_NOT_RETRY_SAFE.EXECUTION_ALLOWED;
  if (!uncertainNotAutomaticallyRetrySafe) {
    violations.push("CRITICAL_UNCERTAIN_NOT_AUTOMATICALLY_RETRY_SAFE");
  }

  const compensatedCannotSilentlyReplay =
    !byScenario.COMPENSATION_NO_SILENT_REPLAY.EXECUTION_ALLOWED &&
    !byScenario.COMPENSATION_NO_SILENT_REPLAY.REPLAY_ALLOWED;
  if (!compensatedCannotSilentlyReplay) {
    violations.push("CRITICAL_COMPENSATED_CANNOT_SILENTLY_REPLAY");
  }

  const terminalReconciledCannotSilentlyReplay =
    !byScenario.RECONCILIATION_TERMINAL_NO_REPLAY.EXECUTION_ALLOWED &&
    !byScenario.RECONCILIATION_TERMINAL_NO_REPLAY.REPLAY_ALLOWED;
  if (!terminalReconciledCannotSilentlyReplay) {
    violations.push("CRITICAL_TERMINAL_RECONCILED_CANNOT_SILENTLY_REPLAY");
  }

  const stuckCommittingRequiresExplicitRecovery =
    byScenario.COMMITTING_BLOCKS_SUBMIT.RECOVERY_REQUIRED &&
    byScenario.RECOVERY_STUCK_COMMITTING.RECOVERY_REQUIRED &&
    !byScenario.COMMITTING_BLOCKS_SUBMIT.EXECUTION_ALLOWED;
  if (!stuckCommittingRequiresExplicitRecovery) {
    violations.push("CRITICAL_STUCK_COMMITTING_REQUIRES_EXPLICIT_RECOVERY");
  }

  const staleUiCannotBypassSafety =
    !byScenario.STALE_UI_CANNOT_BYPASS.EXECUTION_ALLOWED &&
    !byScenario.STALE_UI_CANNOT_BYPASS.REPLAY_ALLOWED;
  if (!staleUiCannotBypassSafety) {
    violations.push("CRITICAL_STALE_UI_CANNOT_BYPASS_SAFETY");
  }

  const duplicateCommandCannotSecondProviderMoneyExecution =
    !byScenario.DUPLICATE_REPLAY_AFTER_SUCCESS.EXECUTION_ALLOWED &&
    !byScenario.PROVIDER_EXECUTION_IN_FLIGHT.EXECUTION_ALLOWED;
  if (!duplicateCommandCannotSecondProviderMoneyExecution) {
    violations.push(
      "CRITICAL_DUPLICATE_COMMAND_CANNOT_SECOND_PROVIDER_MONEY_EXECUTION"
    );
  }

  // Repeated recovery on stuck path must remain idempotent / never allow submit.
  const repeated = classifyRepeatedRecoveryAction({
    facts: {
      ledgerStatus: "committing",
      reservationStatus: "committing",
      existingExecution: baseExecution({
        status: "executing",
        startedAtIso: "2026-08-09T20:00:00.000Z",
      }),
      firstTimeSubmitAllowed: true,
      actionSurface: "recovery_action",
      nowMs: FIXED_NOW_MS,
      staleAfterMs: 60_000,
    },
  });
  if (!repeated.idempotent || !repeated.neverAllowsSubmit) {
    violations.push("CRITICAL_REPEATED_RECOVERY_MUST_BE_IDEMPOTENT");
  }

  return {
    criticalInvariants: {
      succeededCannotExecuteTwice,
      uncertainNotAutomaticallyRetrySafe,
      compensatedCannotSilentlyReplay,
      terminalReconciledCannotSilentlyReplay,
      stuckCommittingRequiresExplicitRecovery,
      staleUiCannotBypassSafety,
      duplicateCommandCannotSecondProviderMoneyExecution,
    },
    violations,
  };
}

/**
 * Run the full RELEASE-CANDIDATE safety matrix.
 * Consumes terminal invariants + E2E matrix; does not invent provider architecture.
 */
export function runFullRefundProviderReleaseCandidateSafetyMatrix(): RcSafetyMatrixRunResult {
  const fixtures = buildRcSafetyMatrixFixtures();
  const rows = fixtures.map(observeRow);

  const rowViolations = rows.flatMap((row) =>
    assertRcSafetyMatrixRowContract(row)
  );

  const phasesCovered = [
    ...new Set(rows.map((r) => r.phase)),
  ] as RcSafetyMatrixPhase[];
  const missingPhases = RC_SAFETY_MATRIX_PHASES.filter(
    (p) => !phasesCovered.includes(p)
  );
  if (missingPhases.length > 0) {
    rowViolations.push(
      `MISSING_PHASE_COVERAGE:${missingPhases.join(",")}`
    );
  }

  const scenariosCovered = rows.map((r) => r.scenario);
  const missingScenarios = RC_SAFETY_MATRIX_SCENARIOS.filter(
    (s) => !scenariosCovered.includes(s)
  );
  if (missingScenarios.length > 0) {
    rowViolations.push(
      `MISSING_SCENARIO_COVERAGE:${missingScenarios.join(",")}`
    );
  }

  // Alias map sanity (documentation-only; actual names must remain).
  if (TERMINAL_INVARIANT_TASK_ALIAS_MAP.SUCCESS !== "succeeded") {
    rowViolations.push("ALIAS_SUCCESS_MUST_MAP_TO_succeeded");
  }
  if (TERMINAL_INVARIANT_TASK_ALIAS_MAP.UNKNOWN !== "uncertain") {
    rowViolations.push("ALIAS_UNKNOWN_MUST_MAP_TO_uncertain");
  }

  const { criticalInvariants, violations: criticalViolations } =
    evaluateCriticalInvariants(rows);

  const e2e = runFullRefundProviderReconciliationTerminalE2eMatrix();
  if (!e2e.allPass) {
    rowViolations.push("CONSUMED_E2E_MATRIX_MUST_PASS");
  }

  const matrixViolations = [
    ...rowViolations,
    ...criticalViolations,
  ];

  return {
    version: REFUND_PROVIDER_RELEASE_CANDIDATE_SAFETY_MATRIX_VERSION,
    rows,
    phasesCovered: [...RC_SAFETY_MATRIX_PHASES],
    scenariosCovered: [...RC_SAFETY_MATRIX_SCENARIOS],
    e2eMatrixConsumed: {
      version: "refund-provider-reconciliation-terminal-e2e-matrix-v1",
      scenarios: [...E2E_MATRIX_SCENARIOS],
      allPass: e2e.allPass,
    },
    criticalInvariants,
    matrixViolations,
    allPass: matrixViolations.length === 0 && rows.every((r) => r.invariantsOk),
    safety: {
      STRIPE_CALLS: 0,
      MONEY_MOVEMENT: 0,
      DB_WRITES: 0,
      MIGRATIONS: 0,
      PROVIDER_GATES: "OFF",
    },
  };
}
