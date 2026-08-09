/**
 * RELEASE-CANDIDATE safety matrix — focused regression.
 * STRIPE_CALLS=0 · MONEY_MOVEMENT=0 · DB_WRITES=0 · MIGRATIONS=0 · PROVIDER_GATES=OFF
 */

import { describe, expect, it } from "vitest";
import {
  TERMINAL_INVARIANT_LEDGER_STATUSES,
  TERMINAL_INVARIANT_PROVIDER_STATUSES,
  TERMINAL_INVARIANT_TASK_ALIAS_MAP,
} from "./refundProviderTerminalStateReplayInvariants";
import {
  RC_SAFETY_MATRIX_PHASES,
  RC_SAFETY_MATRIX_SCENARIOS,
  REFUND_PROVIDER_RELEASE_CANDIDATE_SAFETY_MATRIX_VERSION,
  assertRcSafetyMatrixRowContract,
  buildRcSafetyMatrixFixtures,
  runFullRefundProviderReleaseCandidateSafetyMatrix,
} from "./refundProviderReleaseCandidateSafetyMatrix";
import {
  isTerminalProviderExecutionStatus,
  isUncertainProviderExecutionStatus,
} from "./stateMachine";

describe("RC safety matrix — contracts & SoT names", () => {
  it("exposes version + required coverage phases", () => {
    expect(REFUND_PROVIDER_RELEASE_CANDIDATE_SAFETY_MATRIX_VERSION).toBe(
      "refund-provider-release-candidate-safety-matrix-v1"
    );
    expect([...RC_SAFETY_MATRIX_PHASES]).toEqual([
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
    ]);
  });

  it("covers all RC scenarios without inventing status replacements", () => {
    expect([...RC_SAFETY_MATRIX_SCENARIOS].sort()).toEqual(
      [
        "REQUEST_PLANNED_NOT_READY",
        "RESERVATION_HELD_NOT_READY",
        "COMMITTING_BLOCKS_SUBMIT",
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
      ].sort()
    );
    expect(TERMINAL_INVARIANT_TASK_ALIAS_MAP.SUCCESS).toBe("succeeded");
    expect(TERMINAL_INVARIANT_TASK_ALIAS_MAP.FAILED).toBe("failed");
    expect(TERMINAL_INVARIANT_TASK_ALIAS_MAP.UNKNOWN).toBe("uncertain");
    expect(TERMINAL_INVARIANT_TASK_ALIAS_MAP.COMPENSATED).toBe("compensated");
    expect(TERMINAL_INVARIANT_TASK_ALIAS_MAP.COMMITTING).toBe("committing");
    expect(TERMINAL_INVARIANT_TASK_ALIAS_MAP.RECONCILED).toBeNull();
    expect([...TERMINAL_INVARIANT_PROVIDER_STATUSES].sort()).toEqual(
      ["executing", "failed", "planned", "succeeded", "uncertain"].sort()
    );
    expect([...TERMINAL_INVARIANT_LEDGER_STATUSES].sort()).toEqual(
      ["committed", "committing", "compensated", "failed", "planned"].sort()
    );
    expect(isTerminalProviderExecutionStatus("succeeded")).toBe(true);
    expect(isTerminalProviderExecutionStatus("failed")).toBe(true);
    expect(isUncertainProviderExecutionStatus("uncertain")).toBe(true);
    expect(isTerminalProviderExecutionStatus("uncertain")).toBe(false);
  });

  it("builds one fixture per scenario", () => {
    const fixtures = buildRcSafetyMatrixFixtures();
    expect(fixtures).toHaveLength(RC_SAFETY_MATRIX_SCENARIOS.length);
    expect(fixtures.map((f) => f.scenario).sort()).toEqual(
      [...RC_SAFETY_MATRIX_SCENARIOS].sort()
    );
  });
});

describe("RC safety matrix — full consolidated run", () => {
  it("PASS with required decision fields on every row", () => {
    const run = runFullRefundProviderReleaseCandidateSafetyMatrix();
    expect(run.allPass).toBe(true);
    expect(run.matrixViolations).toEqual([]);
    expect(run.phasesCovered).toEqual([...RC_SAFETY_MATRIX_PHASES]);
    expect(run.scenariosCovered).toEqual([...RC_SAFETY_MATRIX_SCENARIOS]);
    expect(run.e2eMatrixConsumed.allPass).toBe(true);
    expect(run.safety).toEqual({
      STRIPE_CALLS: 0,
      MONEY_MOVEMENT: 0,
      DB_WRITES: 0,
      MIGRATIONS: 0,
      PROVIDER_GATES: "OFF",
    });

    for (const row of run.rows) {
      expect(row).toEqual(
        expect.objectContaining({
          INPUT_STATE: expect.any(String),
          PROVIDER_STATE: expect.any(String),
          EXECUTION_ALLOWED: expect.any(Boolean),
          EXECUTION_BLOCKED: expect.any(Boolean),
          RETRY_SAFE: expect.any(Boolean),
          RECONCILIATION_REQUIRED: expect.any(Boolean),
          RECOVERY_REQUIRED: expect.any(Boolean),
          OPERATOR_REVIEW_REQUIRED: expect.any(Boolean),
          TERMINAL: expect.any(Boolean),
          REPLAY_ALLOWED: expect.any(Boolean),
          EXPECTED_EVIDENCE: expect.any(Array),
        })
      );
      expect(row.EXPECTED_EVIDENCE.length).toBeGreaterThan(0);
      expect(row.EXECUTION_ALLOWED).not.toBe(row.EXECUTION_BLOCKED);
      expect(assertRcSafetyMatrixRowContract(row)).toEqual([]);
      expect(row.invariantsOk).toBe(true);
    }
  });

  it("proves critical release-candidate invariants", () => {
    const run = runFullRefundProviderReleaseCandidateSafetyMatrix();
    expect(run.criticalInvariants).toEqual({
      succeededCannotExecuteTwice: true,
      uncertainNotAutomaticallyRetrySafe: true,
      compensatedCannotSilentlyReplay: true,
      terminalReconciledCannotSilentlyReplay: true,
      stuckCommittingRequiresExplicitRecovery: true,
      staleUiCannotBypassSafety: true,
      duplicateCommandCannotSecondProviderMoneyExecution: true,
    });
  });

  it("blocks succeeded / compensated / reconciled / duplicate / stale UI replay", () => {
    const run = runFullRefundProviderReleaseCandidateSafetyMatrix();
    const byScenario = Object.fromEntries(
      run.rows.map((r) => [r.scenario, r])
    );

    for (const id of [
      "PROVIDER_EXECUTION_SUCCEEDED",
      "RECONCILIATION_TERMINAL_NO_REPLAY",
      "COMPENSATION_NO_SILENT_REPLAY",
      "TERMINAL_SUCCEEDED_NO_REPLAY",
      "DUPLICATE_REPLAY_AFTER_SUCCESS",
      "STALE_UI_CANNOT_BYPASS",
    ] as const) {
      const row = byScenario[id]!;
      expect(row.EXECUTION_ALLOWED).toBe(false);
      expect(row.EXECUTION_BLOCKED).toBe(true);
      expect(row.RETRY_SAFE).toBe(false);
      expect(row.REPLAY_ALLOWED).toBe(false);
      expect(row.TERMINAL).toBe(true);
    }
  });

  it("treats uncertain as non-terminal and not retry-safe", () => {
    const run = runFullRefundProviderReleaseCandidateSafetyMatrix();
    const uncertain = run.rows.find(
      (r) => r.scenario === "UNCERTAIN_OUTCOME_NOT_RETRY_SAFE"
    )!;
    expect(uncertain.PROVIDER_STATE).toBe("uncertain");
    expect(uncertain.TERMINAL).toBe(false);
    expect(uncertain.RETRY_SAFE).toBe(false);
    expect(uncertain.REPLAY_ALLOWED).toBe(false);
    expect(uncertain.EXECUTION_ALLOWED).toBe(false);
    expect(uncertain.RECONCILIATION_REQUIRED).toBe(true);
    expect(uncertain.RECOVERY_REQUIRED).toBe(true);
  });

  it("requires explicit recovery for committing / stuck paths", () => {
    const run = runFullRefundProviderReleaseCandidateSafetyMatrix();
    const committing = run.rows.find(
      (r) => r.scenario === "COMMITTING_BLOCKS_SUBMIT"
    )!;
    const recovery = run.rows.find(
      (r) => r.scenario === "RECOVERY_STUCK_COMMITTING"
    )!;
    expect(committing.RECOVERY_REQUIRED).toBe(true);
    expect(committing.EXECUTION_ALLOWED).toBe(false);
    expect(recovery.RECOVERY_REQUIRED).toBe(true);
    expect(recovery.EXECUTION_ALLOWED).toBe(false);
    expect(recovery.REPLAY_ALLOWED).toBe(false);
  });

  it("blocks REQUEST/RESERVATION until committed; allows only clean first-submit", () => {
    const run = runFullRefundProviderReleaseCandidateSafetyMatrix();
    const request = run.rows.find(
      (r) => r.scenario === "REQUEST_PLANNED_NOT_READY"
    )!;
    const reservation = run.rows.find(
      (r) => r.scenario === "RESERVATION_HELD_NOT_READY"
    )!;
    const clean = run.rows.find(
      (r) => r.scenario === "PROVIDER_EXECUTION_FIRST_SUBMIT_CLEAN"
    )!;
    expect(request.phase).toBe("REQUEST");
    expect(reservation.phase).toBe("RESERVATION");
    expect(request.EXECUTION_ALLOWED).toBe(false);
    expect(reservation.EXECUTION_ALLOWED).toBe(false);
    expect(request.reasonCode).toBe("ledger_not_committed");
    expect(reservation.reasonCode).toBe("ledger_not_committed");
    expect(clean.phase).toBe("PROVIDER_EXECUTION");
    expect(clean.EXECUTION_ALLOWED).toBe(true);
    expect(clean.TERMINAL).toBe(false);
    expect(clean.RETRY_SAFE).toBe(false);

    const blockedRows = run.rows.filter(
      (r) => r.scenario !== "PROVIDER_EXECUTION_FIRST_SUBMIT_CLEAN"
    );
    for (const row of blockedRows) {
      expect(row.EXECUTION_ALLOWED).toBe(false);
    }
  });
});
