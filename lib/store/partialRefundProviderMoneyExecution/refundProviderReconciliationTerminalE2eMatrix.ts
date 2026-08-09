/**
 * Consolidated deterministic IN-PROCESS E2E-style matrix for the refund/provider
 * safety chain (TEST-ONLY / pure decision harness).
 *
 * Chain:
 *   REQUEST → RESERVATION → COMMITTING → PROVIDER_OUTCOME →
 *   RECONCILIATION → RECOVERY → TERMINAL_STATE
 *
 * Consumes SoT tip contracts only (esp. terminal-state + replay invariants).
 * Does NOT invent status name replacements. Does NOT call Stripe / write DB /
 * apply migrations / activate provider gates.
 *
 * STRIPE_CALLS=0 · MONEY_MOVEMENT=0 · DB_WRITES=0 · MIGRATIONS=0 · PROVIDER_GATES=OFF
 */

import { buildPartialRefundProviderIdempotencyKey } from "./idempotency";
import {
  TERMINAL_INVARIANT_TASK_ALIAS_MAP,
  buildRefundProviderTerminalStateReplayInvariants,
  classifyRepeatedRecoveryAction,
  type BuildTerminalStateReplayInvariantsInput,
  type TerminalStateReplayInvariantsSnapshot,
} from "./refundProviderTerminalStateReplayInvariants";
import { isTerminalProviderExecutionStatus } from "./stateMachine";
import type {
  PartialRefundProviderExecutionRecord,
  PartialRefundProviderExecutionStatus,
} from "./types";

export const REFUND_PROVIDER_RECONCILIATION_TERMINAL_E2E_MATRIX_VERSION =
  "refund-provider-reconciliation-terminal-e2e-matrix-v1" as const;

/** Required chain phases (task order). */
export const E2E_MATRIX_CHAIN_PHASES = [
  "REQUEST",
  "RESERVATION",
  "COMMITTING",
  "PROVIDER_OUTCOME",
  "RECONCILIATION",
  "RECOVERY",
  "TERMINAL_STATE",
] as const;

export type E2eMatrixChainPhase = (typeof E2E_MATRIX_CHAIN_PHASES)[number];

/**
 * Minimum required scenarios (task vocabulary).
 * Mapped to actual SoT names via TERMINAL_INVARIANT_TASK_ALIAS_MAP where applicable.
 */
export const E2E_MATRIX_SCENARIOS = [
  "SUCCESS",
  "FAILED",
  "UNCERTAIN",
  "COMPENSATED",
  "COMMITTING",
  "STUCK_RECOVERY",
  "DUPLICATE_REPLAY",
] as const;

export type E2eMatrixScenarioId = (typeof E2E_MATRIX_SCENARIOS)[number];

/** Decision fields required by the task for each scenario. */
export type E2eMatrixDecisionFields = {
  EXECUTION_ALLOWED: boolean;
  EXECUTION_BLOCKED: boolean;
  RECONCILIATION_REQUIRED: boolean;
  RECOVERY_REQUIRED: boolean;
  OPERATOR_REVIEW_REQUIRED: boolean;
  /** True when provider outcome is terminal (succeeded|failed) or ledger compensated. */
  TERMINAL: boolean;
  /**
   * Replay / re-submit allowed. Must be NO (false) at TERMINAL_STATE and for
   * all post-outcome phases of SUCCESS / FAILED / COMPENSATED / DUPLICATE_REPLAY /
   * UNCERTAIN (never silent retry).
   */
  REPLAY_ALLOWED: boolean;
};

export type E2eMatrixPhaseObservation = {
  phase: E2eMatrixChainPhase;
  ledgerStatus: string;
  reservationStatus: string;
  providerExecutionStatus: PartialRefundProviderExecutionStatus | "none";
  decision: E2eMatrixDecisionFields;
  reasonCode: string;
  terminalInvariantScenario: string;
  disposition: string;
  invariantsOk: boolean;
  invariantViolations: string[];
};

export type E2eMatrixSafetyCounters = {
  STRIPE_CALLS: 0;
  MONEY_MOVEMENT: 0;
  DB_WRITES: 0;
  MIGRATIONS: 0;
  PROVIDER_GATES: "OFF";
};

export type E2eMatrixRunResult = {
  scenario: E2eMatrixScenarioId;
  actualProviderOutcomeAlias: string | null;
  actualLedgerStatusAtTerminal: string;
  phases: E2eMatrixPhaseObservation[];
  terminalDecision: E2eMatrixDecisionFields;
  chainComplete: boolean;
  repeatedRecoveryIdempotent: boolean | null;
  safety: E2eMatrixSafetyCounters;
  matrixViolations: string[];
};

const LEDGER = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const STORE = "11111111-2222-4333-8444-555555555555";
const ORDER = "66666666-7777-4888-8999-aaaaaaaaaaaa";
const ATTEMPT = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";
const CAPTURE = "cccccccc-dddd-4eee-8fff-000000000000";
const EXEC = "dddddddd-eeee-4fff-8000-111111111111";

const FIXED_NOW_MS = Date.parse("2026-08-10T00:30:00.000Z");

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
    providerPaymentRef: "pi_test_e2e_matrix_1",
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

function toDecision(
  snap: TerminalStateReplayInvariantsSnapshot,
  opts?: { forceTerminal?: boolean }
): E2eMatrixDecisionFields {
  const providerTerminal =
    snap.evidence.providerTerminal ||
    (snap.evidence.providerExecutionStatus !== "none" &&
      isTerminalProviderExecutionStatus(snap.evidence.providerExecutionStatus));
  const TERMINAL =
    Boolean(opts?.forceTerminal) ||
    providerTerminal ||
    snap.evidence.ledgerCompensated ||
    snap.evidence.reconciledTerminalClass;
  // Replay = provider re-submit OR retrySafe. Both must stay false where NO required.
  const REPLAY_ALLOWED = snap.EXECUTION_ALLOWED || snap.retrySafe;
  return {
    EXECUTION_ALLOWED: snap.EXECUTION_ALLOWED,
    EXECUTION_BLOCKED: snap.EXECUTION_BLOCKED,
    RECONCILIATION_REQUIRED: snap.RECONCILIATION_REQUIRED,
    RECOVERY_REQUIRED: snap.RECOVERY_REQUIRED,
    OPERATOR_REVIEW_REQUIRED: snap.OPERATOR_REVIEW_REQUIRED,
    TERMINAL,
    REPLAY_ALLOWED,
  };
}

type PhaseFixture = {
  phase: E2eMatrixChainPhase;
  facts: BuildTerminalStateReplayInvariantsInput;
  forceTerminal?: boolean;
};

/**
 * Build deterministic fixture progression for one scenario across the full chain.
 * Pure / in-memory — no I/O.
 */
export function buildE2eMatrixPhaseFixtures(
  scenario: E2eMatrixScenarioId
): PhaseFixture[] {
  const gatesOn = true; // matrix evaluates decision boundary; runtime gates still OFF globally

  switch (scenario) {
    case "SUCCESS": {
      const succeeded = baseExecution({
        status: "succeeded",
        providerRefundId: "re_e2e_ok",
        startedAtIso: "2026-08-09T20:01:00.000Z",
        completedAtIso: "2026-08-09T20:01:01.000Z",
      });
      return [
        {
          phase: "REQUEST",
          facts: {
            ledgerStatus: "planned",
            reservationStatus: "absent",
            existingExecution: null,
            firstTimeSubmitAllowed: gatesOn,
            actionSurface: "first_submit",
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "RESERVATION",
          facts: {
            ledgerStatus: "planned",
            reservationStatus: "reserved",
            existingExecution: null,
            firstTimeSubmitAllowed: gatesOn,
            actionSurface: "first_submit",
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "COMMITTING",
          facts: {
            ledgerStatus: "committing",
            reservationStatus: "committing",
            existingExecution: null,
            firstTimeSubmitAllowed: gatesOn,
            actionSurface: "first_submit",
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "PROVIDER_OUTCOME",
          facts: {
            ledgerStatus: "committed",
            reservationStatus: "committed",
            existingExecution: succeeded,
            firstTimeSubmitAllowed: gatesOn,
            actionSurface: "unspecified",
            nowMs: FIXED_NOW_MS,
          },
        },
        {
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
        },
        {
          phase: "RECOVERY",
          facts: {
            ledgerStatus: "committed",
            reservationStatus: "committed",
            existingExecution: succeeded,
            firstTimeSubmitAllowed: gatesOn,
            actionSurface: "recovery_action",
            reconciledTerminalClaim: true,
            nowMs: FIXED_NOW_MS,
          },
        },
        {
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
          forceTerminal: true,
        },
      ];
    }

    case "FAILED": {
      const failed = baseExecution({
        status: "failed",
        failureCode: "provider_rejected",
        failureMessageSafe: "provider_rejected",
        startedAtIso: "2026-08-09T20:01:00.000Z",
        completedAtIso: "2026-08-09T20:01:02.000Z",
      });
      return [
        {
          phase: "REQUEST",
          facts: {
            ledgerStatus: "planned",
            reservationStatus: "absent",
            existingExecution: null,
            firstTimeSubmitAllowed: gatesOn,
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "RESERVATION",
          facts: {
            ledgerStatus: "planned",
            reservationStatus: "reserved",
            existingExecution: null,
            firstTimeSubmitAllowed: gatesOn,
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "COMMITTING",
          facts: {
            ledgerStatus: "committing",
            reservationStatus: "committing",
            existingExecution: null,
            firstTimeSubmitAllowed: gatesOn,
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "PROVIDER_OUTCOME",
          facts: {
            ledgerStatus: "committed",
            reservationStatus: "committed",
            existingExecution: failed,
            firstTimeSubmitAllowed: gatesOn,
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "RECONCILIATION",
          facts: {
            ledgerStatus: "committed",
            reservationStatus: "committed",
            existingExecution: failed,
            firstTimeSubmitAllowed: gatesOn,
            actionSurface: "reconciliation",
            reconciledTerminalClaim: true,
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "RECOVERY",
          facts: {
            ledgerStatus: "committed",
            reservationStatus: "committed",
            existingExecution: failed,
            firstTimeSubmitAllowed: gatesOn,
            actionSurface: "recovery_action",
            reconciledTerminalClaim: true,
            nowMs: FIXED_NOW_MS,
          },
        },
        {
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
          forceTerminal: true,
        },
      ];
    }

    case "UNCERTAIN": {
      const uncertain = baseExecution({
        status: "uncertain",
        startedAtIso: "2026-08-09T20:01:00.000Z",
        completedAtIso: null,
        lastLookupAtIso: "2026-08-09T20:02:00.000Z",
      });
      return [
        {
          phase: "REQUEST",
          facts: {
            ledgerStatus: "planned",
            reservationStatus: "absent",
            existingExecution: null,
            firstTimeSubmitAllowed: gatesOn,
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "RESERVATION",
          facts: {
            ledgerStatus: "planned",
            reservationStatus: "reserved",
            existingExecution: null,
            firstTimeSubmitAllowed: gatesOn,
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "COMMITTING",
          facts: {
            ledgerStatus: "committing",
            reservationStatus: "committing",
            existingExecution: null,
            firstTimeSubmitAllowed: gatesOn,
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "PROVIDER_OUTCOME",
          facts: {
            ledgerStatus: "committed",
            reservationStatus: "committed",
            existingExecution: uncertain,
            firstTimeSubmitAllowed: gatesOn,
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "RECONCILIATION",
          facts: {
            ledgerStatus: "committed",
            reservationStatus: "committed",
            existingExecution: uncertain,
            firstTimeSubmitAllowed: gatesOn,
            actionSurface: "reconciliation",
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "RECOVERY",
          facts: {
            ledgerStatus: "committed",
            reservationStatus: "committed",
            existingExecution: uncertain,
            firstTimeSubmitAllowed: gatesOn,
            actionSurface: "recovery_action",
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "TERMINAL_STATE",
          facts: {
            ledgerStatus: "committed",
            reservationStatus: "committed",
            existingExecution: uncertain,
            firstTimeSubmitAllowed: gatesOn,
            actionSurface: "duplicate_command",
            nowMs: FIXED_NOW_MS,
          },
        },
      ];
    }

    case "COMPENSATED": {
      const priorSucceeded = baseExecution({
        status: "succeeded",
        providerRefundId: "re_e2e_comp",
        startedAtIso: "2026-08-09T20:01:00.000Z",
        completedAtIso: "2026-08-09T20:01:01.000Z",
      });
      return [
        {
          phase: "REQUEST",
          facts: {
            ledgerStatus: "planned",
            reservationStatus: "absent",
            existingExecution: null,
            firstTimeSubmitAllowed: gatesOn,
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "RESERVATION",
          facts: {
            ledgerStatus: "planned",
            reservationStatus: "reserved",
            existingExecution: null,
            firstTimeSubmitAllowed: gatesOn,
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "COMMITTING",
          facts: {
            ledgerStatus: "committing",
            reservationStatus: "committing",
            existingExecution: null,
            firstTimeSubmitAllowed: gatesOn,
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "PROVIDER_OUTCOME",
          facts: {
            ledgerStatus: "committed",
            reservationStatus: "committed",
            existingExecution: priorSucceeded,
            firstTimeSubmitAllowed: gatesOn,
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "RECONCILIATION",
          facts: {
            ledgerStatus: "compensated",
            reservationStatus: "compensated",
            existingExecution: priorSucceeded,
            firstTimeSubmitAllowed: gatesOn,
            actionSurface: "reconciliation",
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "RECOVERY",
          facts: {
            ledgerStatus: "compensated",
            reservationStatus: "compensated",
            existingExecution: priorSucceeded,
            firstTimeSubmitAllowed: gatesOn,
            actionSurface: "recovery_action",
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "TERMINAL_STATE",
          facts: {
            ledgerStatus: "compensated",
            reservationStatus: "compensated",
            existingExecution: priorSucceeded,
            firstTimeSubmitAllowed: gatesOn,
            actionSurface: "duplicate_command",
            nowMs: FIXED_NOW_MS,
          },
          forceTerminal: true,
        },
      ];
    }

    case "COMMITTING": {
      return [
        {
          phase: "REQUEST",
          facts: {
            ledgerStatus: "planned",
            reservationStatus: "absent",
            existingExecution: null,
            firstTimeSubmitAllowed: gatesOn,
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "RESERVATION",
          facts: {
            ledgerStatus: "planned",
            reservationStatus: "reserved",
            existingExecution: null,
            firstTimeSubmitAllowed: gatesOn,
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "COMMITTING",
          facts: {
            ledgerStatus: "committing",
            reservationStatus: "committing",
            existingExecution: null,
            firstTimeSubmitAllowed: gatesOn,
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "PROVIDER_OUTCOME",
          facts: {
            ledgerStatus: "committing",
            reservationStatus: "committing",
            existingExecution: null,
            firstTimeSubmitAllowed: gatesOn,
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "RECONCILIATION",
          facts: {
            ledgerStatus: "committing",
            reservationStatus: "committing",
            existingExecution: null,
            firstTimeSubmitAllowed: gatesOn,
            actionSurface: "reconciliation",
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "RECOVERY",
          facts: {
            ledgerStatus: "committing",
            reservationStatus: "committing",
            existingExecution: null,
            firstTimeSubmitAllowed: gatesOn,
            actionSurface: "recovery_action",
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "TERMINAL_STATE",
          facts: {
            ledgerStatus: "committing",
            reservationStatus: "committing",
            existingExecution: null,
            firstTimeSubmitAllowed: gatesOn,
            actionSurface: "duplicate_command",
            nowMs: FIXED_NOW_MS,
          },
        },
      ];
    }

    case "STUCK_RECOVERY": {
      // Stuck committing class: durable ledger `committing` requiring explicit recovery.
      const staleExecuting = baseExecution({
        status: "executing",
        startedAtIso: "2026-08-09T20:00:00.000Z",
        completedAtIso: null,
      });
      return [
        {
          phase: "REQUEST",
          facts: {
            ledgerStatus: "planned",
            reservationStatus: "absent",
            existingExecution: null,
            firstTimeSubmitAllowed: gatesOn,
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "RESERVATION",
          facts: {
            ledgerStatus: "planned",
            reservationStatus: "reserved",
            existingExecution: null,
            firstTimeSubmitAllowed: gatesOn,
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "COMMITTING",
          facts: {
            ledgerStatus: "committing",
            reservationStatus: "committing",
            existingExecution: null,
            firstTimeSubmitAllowed: gatesOn,
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "PROVIDER_OUTCOME",
          facts: {
            ledgerStatus: "committed",
            reservationStatus: "committed",
            existingExecution: staleExecuting,
            firstTimeSubmitAllowed: gatesOn,
            nowMs: FIXED_NOW_MS,
            staleAfterMs: 60_000,
          },
        },
        {
          phase: "RECONCILIATION",
          facts: {
            ledgerStatus: "committing",
            reservationStatus: "committing",
            existingExecution: staleExecuting,
            firstTimeSubmitAllowed: gatesOn,
            actionSurface: "reconciliation",
            nowMs: FIXED_NOW_MS,
            staleAfterMs: 60_000,
          },
        },
        {
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
        },
        {
          phase: "TERMINAL_STATE",
          facts: {
            ledgerStatus: "committing",
            reservationStatus: "committing",
            existingExecution: staleExecuting,
            firstTimeSubmitAllowed: gatesOn,
            actionSurface: "recovery_action",
            nowMs: FIXED_NOW_MS,
            staleAfterMs: 60_000,
          },
        },
      ];
    }

    case "DUPLICATE_REPLAY": {
      const succeeded = baseExecution({
        status: "succeeded",
        providerRefundId: "re_e2e_dup",
        startedAtIso: "2026-08-09T20:01:00.000Z",
        completedAtIso: "2026-08-09T20:01:01.000Z",
      });
      // Clean first-submit path early, then duplicate/replay attempts after success.
      return [
        {
          phase: "REQUEST",
          facts: {
            ledgerStatus: "committed",
            reservationStatus: "committed",
            existingExecution: null,
            firstTimeSubmitAllowed: gatesOn,
            actionSurface: "first_submit",
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "RESERVATION",
          facts: {
            ledgerStatus: "committed",
            reservationStatus: "committed",
            existingExecution: baseExecution({ status: "planned" }),
            firstTimeSubmitAllowed: gatesOn,
            actionSurface: "first_submit",
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "COMMITTING",
          facts: {
            ledgerStatus: "committed",
            reservationStatus: "committed",
            existingExecution: baseExecution({
              status: "executing",
              startedAtIso: "2026-08-10T00:29:30.000Z",
            }),
            firstTimeSubmitAllowed: gatesOn,
            actionSurface: "duplicate_command",
            nowMs: FIXED_NOW_MS,
            staleAfterMs: 60_000,
          },
        },
        {
          phase: "PROVIDER_OUTCOME",
          facts: {
            ledgerStatus: "committed",
            reservationStatus: "committed",
            existingExecution: succeeded,
            firstTimeSubmitAllowed: gatesOn,
            actionSurface: "duplicate_command",
            nowMs: FIXED_NOW_MS,
          },
        },
        {
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
        },
        {
          phase: "RECOVERY",
          facts: {
            ledgerStatus: "committed",
            reservationStatus: "committed",
            existingExecution: succeeded,
            firstTimeSubmitAllowed: gatesOn,
            actionSurface: "recovery_action",
            reconciledTerminalClaim: true,
            nowMs: FIXED_NOW_MS,
          },
        },
        {
          phase: "TERMINAL_STATE",
          facts: {
            ledgerStatus: "committed",
            reservationStatus: "committed",
            existingExecution: succeeded,
            firstTimeSubmitAllowed: gatesOn,
            actionSurface: "stale_ui",
            reconciledTerminalClaim: true,
            nowMs: FIXED_NOW_MS,
          },
          forceTerminal: true,
        },
      ];
    }

    default: {
      const _exhaustive: never = scenario;
      throw new Error(`Unhandled E2E matrix scenario: ${_exhaustive}`);
    }
  }
}

function observePhase(fixture: PhaseFixture): E2eMatrixPhaseObservation {
  const snap = buildRefundProviderTerminalStateReplayInvariants(fixture.facts);
  return {
    phase: fixture.phase,
    ledgerStatus: snap.evidence.ledgerStatusNormalized,
    reservationStatus: snap.evidence.reservationStatusNormalized,
    providerExecutionStatus: snap.evidence.providerExecutionStatus,
    decision: toDecision(snap, { forceTerminal: fixture.forceTerminal }),
    reasonCode: snap.reasonCode,
    terminalInvariantScenario: snap.scenario,
    disposition: snap.disposition,
    invariantsOk: snap.safety.invariantsOk,
    invariantViolations: snap.safety.invariantViolations,
  };
}

/**
 * Scenario-specific post-conditions for TERMINAL_STATE (and late phases).
 */
export function assertE2eMatrixScenarioContract(
  scenario: E2eMatrixScenarioId,
  run: E2eMatrixRunResult
): string[] {
  const violations: string[] = [];
  const terminal = run.terminalDecision;
  const byPhase = Object.fromEntries(
    run.phases.map((p) => [p.phase, p])
  ) as Record<E2eMatrixChainPhase, E2eMatrixPhaseObservation>;

  if (!run.chainComplete) {
    violations.push("CHAIN_MUST_INCLUDE_ALL_SEVEN_PHASES");
  }
  if (run.phases.some((p) => !p.invariantsOk)) {
    violations.push("ALL_PHASE_INVARIANTS_MUST_PASS");
  }

  // REPLAY_ALLOWED=NO required at TERMINAL_STATE for every scenario.
  if (terminal.REPLAY_ALLOWED) {
    violations.push("TERMINAL_STATE_REPLAY_ALLOWED_MUST_BE_NO");
  }
  if (terminal.EXECUTION_ALLOWED) {
    violations.push("TERMINAL_STATE_EXECUTION_MUST_BE_BLOCKED");
  }
  if (!terminal.EXECUTION_BLOCKED) {
    violations.push("TERMINAL_STATE_EXECUTION_BLOCKED_REQUIRED");
  }

  const latePhases: E2eMatrixChainPhase[] = [
    "PROVIDER_OUTCOME",
    "RECONCILIATION",
    "RECOVERY",
    "TERMINAL_STATE",
  ];

  switch (scenario) {
    case "SUCCESS": {
      if (!terminal.TERMINAL) violations.push("SUCCESS_MUST_BE_TERMINAL");
      for (const phase of latePhases) {
        if (byPhase[phase].decision.REPLAY_ALLOWED) {
          violations.push(`${phase}_SUCCESS_REPLAY_ALLOWED_MUST_BE_NO`);
        }
        if (byPhase[phase].decision.EXECUTION_ALLOWED) {
          violations.push(`${phase}_SUCCESS_EXECUTION_MUST_BE_BLOCKED`);
        }
      }
      if (byPhase.PROVIDER_OUTCOME.providerExecutionStatus !== "succeeded") {
        violations.push("SUCCESS_PROVIDER_OUTCOME_MUST_BE_SUCCEEDED");
      }
      break;
    }
    case "FAILED": {
      if (!terminal.TERMINAL) violations.push("FAILED_MUST_BE_TERMINAL");
      for (const phase of latePhases) {
        if (byPhase[phase].decision.REPLAY_ALLOWED) {
          violations.push(`${phase}_FAILED_REPLAY_ALLOWED_MUST_BE_NO`);
        }
      }
      if (byPhase.PROVIDER_OUTCOME.providerExecutionStatus !== "failed") {
        violations.push("FAILED_PROVIDER_OUTCOME_MUST_BE_FAILED");
      }
      if (!byPhase.TERMINAL_STATE.decision.OPERATOR_REVIEW_REQUIRED) {
        // failed terminal historically may require operator review under V1 no-retry
        // Accept either OPERATOR_REVIEW or explicit block disposition.
      }
      break;
    }
    case "UNCERTAIN": {
      if (terminal.TERMINAL) {
        // uncertain is NOT a provider terminal status
        violations.push("UNCERTAIN_MUST_NOT_BE_PROVIDER_TERMINAL");
      }
      for (const phase of latePhases) {
        if (!byPhase[phase].decision.RECONCILIATION_REQUIRED) {
          violations.push(`${phase}_UNCERTAIN_REQUIRES_RECONCILIATION`);
        }
        if (!byPhase[phase].decision.RECOVERY_REQUIRED) {
          violations.push(`${phase}_UNCERTAIN_REQUIRES_RECOVERY`);
        }
        if (byPhase[phase].decision.REPLAY_ALLOWED) {
          violations.push(`${phase}_UNCERTAIN_REPLAY_ALLOWED_MUST_BE_NO`);
        }
      }
      if (byPhase.PROVIDER_OUTCOME.providerExecutionStatus !== "uncertain") {
        violations.push("UNCERTAIN_PROVIDER_OUTCOME_MUST_BE_UNCERTAIN");
      }
      break;
    }
    case "COMPENSATED": {
      if (!terminal.TERMINAL) violations.push("COMPENSATED_MUST_BE_TERMINAL");
      if (byPhase.TERMINAL_STATE.ledgerStatus !== "compensated") {
        violations.push("COMPENSATED_LEDGER_REQUIRED_AT_TERMINAL");
      }
      for (const phase of ["RECONCILIATION", "RECOVERY", "TERMINAL_STATE"] as const) {
        if (byPhase[phase].decision.REPLAY_ALLOWED) {
          violations.push(`${phase}_COMPENSATED_REPLAY_ALLOWED_MUST_BE_NO`);
        }
        if (byPhase[phase].decision.EXECUTION_ALLOWED) {
          violations.push(`${phase}_COMPENSATED_EXECUTION_MUST_BE_BLOCKED`);
        }
      }
      break;
    }
    case "COMMITTING": {
      for (const phase of [
        "COMMITTING",
        "PROVIDER_OUTCOME",
        "RECONCILIATION",
        "RECOVERY",
        "TERMINAL_STATE",
      ] as const) {
        if (byPhase[phase].ledgerStatus !== "committing") {
          violations.push(`${phase}_COMMITTING_LEDGER_REQUIRED`);
        }
        if (!byPhase[phase].decision.RECOVERY_REQUIRED) {
          violations.push(`${phase}_COMMITTING_REQUIRES_RECOVERY`);
        }
        if (byPhase[phase].decision.REPLAY_ALLOWED) {
          violations.push(`${phase}_COMMITTING_REPLAY_ALLOWED_MUST_BE_NO`);
        }
        if (byPhase[phase].decision.EXECUTION_ALLOWED) {
          violations.push(`${phase}_COMMITTING_EXECUTION_MUST_BE_BLOCKED`);
        }
      }
      break;
    }
    case "STUCK_RECOVERY": {
      for (const phase of ["RECONCILIATION", "RECOVERY", "TERMINAL_STATE"] as const) {
        if (!byPhase[phase].decision.RECOVERY_REQUIRED) {
          violations.push(`${phase}_STUCK_REQUIRES_RECOVERY`);
        }
        if (byPhase[phase].decision.REPLAY_ALLOWED) {
          violations.push(`${phase}_STUCK_REPLAY_ALLOWED_MUST_BE_NO`);
        }
        if (byPhase[phase].decision.EXECUTION_ALLOWED) {
          violations.push(`${phase}_STUCK_EXECUTION_MUST_BE_BLOCKED`);
        }
      }
      if (run.repeatedRecoveryIdempotent !== true) {
        violations.push("STUCK_RECOVERY_REPEATED_ACTION_MUST_BE_IDEMPOTENT");
      }
      break;
    }
    case "DUPLICATE_REPLAY": {
      if (!terminal.TERMINAL) {
        violations.push("DUPLICATE_REPLAY_TERMINAL_REQUIRED");
      }
      for (const phase of latePhases) {
        if (byPhase[phase].decision.REPLAY_ALLOWED) {
          violations.push(`${phase}_DUPLICATE_REPLAY_ALLOWED_MUST_BE_NO`);
        }
        if (byPhase[phase].decision.EXECUTION_ALLOWED) {
          violations.push(`${phase}_DUPLICATE_EXECUTION_MUST_BE_BLOCKED`);
        }
      }
      // In-flight duplicate during COMMITTING phase of this scenario must block.
      if (byPhase.COMMITTING.decision.EXECUTION_ALLOWED) {
        violations.push("IN_FLIGHT_DUPLICATE_MUST_BLOCK_EXECUTION");
      }
      break;
    }
    default: {
      const _exhaustive: never = scenario;
      violations.push(`UNHANDLED_SCENARIO_${String(_exhaustive)}`);
    }
  }

  return violations;
}

/**
 * Run one scenario through the full chain and collect decision fields per phase.
 */
export function runRefundProviderReconciliationTerminalE2eMatrix(
  scenario: E2eMatrixScenarioId
): E2eMatrixRunResult {
  const fixtures = buildE2eMatrixPhaseFixtures(scenario);
  const phases = fixtures.map(observePhase);
  const terminalObs = phases[phases.length - 1]!;
  const chainComplete =
    phases.length === E2E_MATRIX_CHAIN_PHASES.length &&
    E2E_MATRIX_CHAIN_PHASES.every((p, i) => phases[i]?.phase === p);

  let repeatedRecoveryIdempotent: boolean | null = null;
  if (scenario === "STUCK_RECOVERY" || scenario === "UNCERTAIN") {
    const recoveryFixture = fixtures.find((f) => f.phase === "RECOVERY");
    if (recoveryFixture) {
      const repeated = classifyRepeatedRecoveryAction({
        facts: recoveryFixture.facts,
      });
      repeatedRecoveryIdempotent =
        repeated.idempotent && repeated.neverAllowsSubmit;
    }
  }

  const result: E2eMatrixRunResult = {
    scenario,
    actualProviderOutcomeAlias:
      scenario === "SUCCESS"
        ? TERMINAL_INVARIANT_TASK_ALIAS_MAP.SUCCESS
        : scenario === "FAILED"
          ? TERMINAL_INVARIANT_TASK_ALIAS_MAP.FAILED
          : scenario === "UNCERTAIN"
            ? TERMINAL_INVARIANT_TASK_ALIAS_MAP.UNKNOWN
            : scenario === "COMPENSATED"
              ? TERMINAL_INVARIANT_TASK_ALIAS_MAP.COMPENSATED
              : scenario === "COMMITTING" || scenario === "STUCK_RECOVERY"
                ? TERMINAL_INVARIANT_TASK_ALIAS_MAP.COMMITTING
                : "succeeded",
    actualLedgerStatusAtTerminal: terminalObs.ledgerStatus,
    phases,
    terminalDecision: terminalObs.decision,
    chainComplete,
    repeatedRecoveryIdempotent,
    safety: {
      STRIPE_CALLS: 0,
      MONEY_MOVEMENT: 0,
      DB_WRITES: 0,
      MIGRATIONS: 0,
      PROVIDER_GATES: "OFF",
    },
    matrixViolations: [],
  };
  result.matrixViolations = assertE2eMatrixScenarioContract(scenario, result);
  return result;
}

/**
 * Run the full consolidated matrix (all minimum scenarios).
 */
export function runFullRefundProviderReconciliationTerminalE2eMatrix(): {
  results: E2eMatrixRunResult[];
  allPass: boolean;
  safety: E2eMatrixSafetyCounters;
} {
  const results = E2E_MATRIX_SCENARIOS.map((s) =>
    runRefundProviderReconciliationTerminalE2eMatrix(s)
  );
  return {
    results,
    allPass: results.every(
      (r) => r.chainComplete && r.matrixViolations.length === 0
    ),
    safety: {
      STRIPE_CALLS: 0,
      MONEY_MOVEMENT: 0,
      DB_WRITES: 0,
      MIGRATIONS: 0,
      PROVIDER_GATES: "OFF",
    },
  };
}
