/**
 * Consolidated refund/provider reconciliation → terminal E2E matrix (in-process).
 * STRIPE_CALLS=0 · MONEY_MOVEMENT=0 · DB_WRITES=0 · MIGRATIONS=0 · PROVIDER_GATES=OFF
 */

import { describe, expect, it } from "vitest";
import {
  TERMINAL_INVARIANT_LEDGER_STATUSES,
  TERMINAL_INVARIANT_PROVIDER_STATUSES,
  TERMINAL_INVARIANT_TASK_ALIAS_MAP,
} from "./refundProviderTerminalStateReplayInvariants";
import {
  E2E_MATRIX_CHAIN_PHASES,
  E2E_MATRIX_SCENARIOS,
  REFUND_PROVIDER_RECONCILIATION_TERMINAL_E2E_MATRIX_VERSION,
  assertE2eMatrixScenarioContract,
  runFullRefundProviderReconciliationTerminalE2eMatrix,
  runRefundProviderReconciliationTerminalE2eMatrix,
  type E2eMatrixScenarioId,
} from "./refundProviderReconciliationTerminalE2eMatrix";
import {
  isTerminalProviderExecutionStatus,
  isUncertainProviderExecutionStatus,
} from "./stateMachine";

describe("E2E matrix — contracts & actual SoT names", () => {
  it("exposes version + required chain phases", () => {
    expect(REFUND_PROVIDER_RECONCILIATION_TERMINAL_E2E_MATRIX_VERSION).toBe(
      "refund-provider-reconciliation-terminal-e2e-matrix-v1"
    );
    expect([...E2E_MATRIX_CHAIN_PHASES]).toEqual([
      "REQUEST",
      "RESERVATION",
      "COMMITTING",
      "PROVIDER_OUTCOME",
      "RECONCILIATION",
      "RECOVERY",
      "TERMINAL_STATE",
    ]);
  });

  it("covers minimum required scenarios", () => {
    expect([...E2E_MATRIX_SCENARIOS].sort()).toEqual(
      [
        "SUCCESS",
        "FAILED",
        "UNCERTAIN",
        "COMPENSATED",
        "COMMITTING",
        "STUCK_RECOVERY",
        "DUPLICATE_REPLAY",
      ].sort()
    );
  });

  it("uses actual SoT names via terminal-invariant alias map (no invented replacements)", () => {
    expect(TERMINAL_INVARIANT_TASK_ALIAS_MAP.SUCCESS).toBe("succeeded");
    expect(TERMINAL_INVARIANT_TASK_ALIAS_MAP.FAILED).toBe("failed");
    expect(TERMINAL_INVARIANT_TASK_ALIAS_MAP.UNKNOWN).toBe("uncertain");
    expect(TERMINAL_INVARIANT_TASK_ALIAS_MAP.COMPENSATED).toBe("compensated");
    expect(TERMINAL_INVARIANT_TASK_ALIAS_MAP.COMMITTING).toBe("committing");
    expect(TERMINAL_INVARIANT_TASK_ALIAS_MAP.STUCK_COMMITTING).toBe(
      "committing"
    );
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
});

function expectDecisionFieldsPresent(runScenario: E2eMatrixScenarioId) {
  const run = runRefundProviderReconciliationTerminalE2eMatrix(runScenario);
  expect(run.chainComplete).toBe(true);
  expect(run.phases).toHaveLength(7);
  for (const phase of run.phases) {
    expect(phase.decision).toEqual(
      expect.objectContaining({
        EXECUTION_ALLOWED: expect.any(Boolean),
        EXECUTION_BLOCKED: expect.any(Boolean),
        RECONCILIATION_REQUIRED: expect.any(Boolean),
        RECOVERY_REQUIRED: expect.any(Boolean),
        OPERATOR_REVIEW_REQUIRED: expect.any(Boolean),
        TERMINAL: expect.any(Boolean),
        REPLAY_ALLOWED: expect.any(Boolean),
      })
    );
    expect(phase.decision.EXECUTION_ALLOWED).not.toBe(
      phase.decision.EXECUTION_BLOCKED
    );
    expect(phase.invariantsOk).toBe(true);
  }
  expect(run.safety).toEqual({
    STRIPE_CALLS: 0,
    MONEY_MOVEMENT: 0,
    DB_WRITES: 0,
    MIGRATIONS: 0,
    PROVIDER_GATES: "OFF",
  });
  expect(assertE2eMatrixScenarioContract(runScenario, run)).toEqual([]);
  expect(run.matrixViolations).toEqual([]);
  return run;
}

describe("E2E matrix — SUCCESS chain", () => {
  it("REQUEST→…→TERMINAL_STATE with REPLAY_ALLOWED=NO after outcome", () => {
    const run = expectDecisionFieldsPresent("SUCCESS");
    expect(run.actualProviderOutcomeAlias).toBe("succeeded");
    expect(run.terminalDecision.TERMINAL).toBe(true);
    expect(run.terminalDecision.REPLAY_ALLOWED).toBe(false);
    expect(run.terminalDecision.EXECUTION_ALLOWED).toBe(false);
    expect(run.terminalDecision.EXECUTION_BLOCKED).toBe(true);
    const outcome = run.phases.find((p) => p.phase === "PROVIDER_OUTCOME")!;
    expect(outcome.providerExecutionStatus).toBe("succeeded");
    expect(outcome.decision.REPLAY_ALLOWED).toBe(false);
  });
});

describe("E2E matrix — FAILED chain", () => {
  it("terminal failed blocks replay", () => {
    const run = expectDecisionFieldsPresent("FAILED");
    expect(run.actualProviderOutcomeAlias).toBe("failed");
    expect(run.terminalDecision.TERMINAL).toBe(true);
    expect(run.terminalDecision.REPLAY_ALLOWED).toBe(false);
    expect(
      run.phases.find((p) => p.phase === "PROVIDER_OUTCOME")!
        .providerExecutionStatus
    ).toBe("failed");
  });
});

describe("E2E matrix — UNCERTAIN chain", () => {
  it("requires reconciliation + recovery; never replay-safe; not terminal", () => {
    const run = expectDecisionFieldsPresent("UNCERTAIN");
    expect(run.actualProviderOutcomeAlias).toBe("uncertain");
    expect(run.terminalDecision.TERMINAL).toBe(false);
    expect(run.terminalDecision.RECONCILIATION_REQUIRED).toBe(true);
    expect(run.terminalDecision.RECOVERY_REQUIRED).toBe(true);
    expect(run.terminalDecision.OPERATOR_REVIEW_REQUIRED).toBe(true);
    expect(run.terminalDecision.REPLAY_ALLOWED).toBe(false);
    expect(run.repeatedRecoveryIdempotent).toBe(true);
  });
});

describe("E2E matrix — COMPENSATED chain", () => {
  it("compensated ledger cannot silently replay", () => {
    const run = expectDecisionFieldsPresent("COMPENSATED");
    expect(run.actualLedgerStatusAtTerminal).toBe("compensated");
    expect(run.terminalDecision.TERMINAL).toBe(true);
    expect(run.terminalDecision.REPLAY_ALLOWED).toBe(false);
    expect(run.terminalDecision.EXECUTION_ALLOWED).toBe(false);
  });
});

describe("E2E matrix — COMMITTING chain", () => {
  it("committing class requires recovery and blocks execution/replay", () => {
    const run = expectDecisionFieldsPresent("COMMITTING");
    for (const phase of run.phases.filter((p) =>
      [
        "COMMITTING",
        "PROVIDER_OUTCOME",
        "RECONCILIATION",
        "RECOVERY",
        "TERMINAL_STATE",
      ].includes(p.phase)
    )) {
      expect(phase.ledgerStatus).toBe("committing");
      expect(phase.decision.RECOVERY_REQUIRED).toBe(true);
      expect(phase.decision.RECONCILIATION_REQUIRED).toBe(true);
      expect(phase.decision.EXECUTION_ALLOWED).toBe(false);
      expect(phase.decision.REPLAY_ALLOWED).toBe(false);
    }
  });
});

describe("E2E matrix — STUCK/RECOVERY chain", () => {
  it("stuck committing / stale path requires recovery; repeated recovery idempotent", () => {
    const run = expectDecisionFieldsPresent("STUCK_RECOVERY");
    expect(run.repeatedRecoveryIdempotent).toBe(true);
    const recovery = run.phases.find((p) => p.phase === "RECOVERY")!;
    expect(recovery.decision.RECOVERY_REQUIRED).toBe(true);
    expect(recovery.decision.REPLAY_ALLOWED).toBe(false);
    expect(recovery.decision.EXECUTION_ALLOWED).toBe(false);
  });
});

describe("E2E matrix — DUPLICATE/REPLAY chain", () => {
  it("duplicate/stale UI cannot create second provider execution", () => {
    const run = expectDecisionFieldsPresent("DUPLICATE_REPLAY");
    expect(run.terminalDecision.TERMINAL).toBe(true);
    expect(run.terminalDecision.REPLAY_ALLOWED).toBe(false);
    const inFlight = run.phases.find((p) => p.phase === "COMMITTING")!;
    expect(inFlight.providerExecutionStatus).toBe("executing");
    expect(inFlight.decision.EXECUTION_ALLOWED).toBe(false);
    const terminal = run.phases.find((p) => p.phase === "TERMINAL_STATE")!;
    expect(terminal.providerExecutionStatus).toBe("succeeded");
    expect(terminal.decision.EXECUTION_ALLOWED).toBe(false);
  });
});

describe("E2E matrix — full consolidated run", () => {
  it("all minimum scenarios pass with hard safety counters", () => {
    const full = runFullRefundProviderReconciliationTerminalE2eMatrix();
    expect(full.results).toHaveLength(E2E_MATRIX_SCENARIOS.length);
    expect(full.allPass).toBe(true);
    expect(full.safety).toEqual({
      STRIPE_CALLS: 0,
      MONEY_MOVEMENT: 0,
      DB_WRITES: 0,
      MIGRATIONS: 0,
      PROVIDER_GATES: "OFF",
    });
    for (const r of full.results) {
      expect(r.matrixViolations).toEqual([]);
      expect(r.terminalDecision.REPLAY_ALLOWED).toBe(false);
      expect(r.terminalDecision.EXECUTION_ALLOWED).toBe(false);
      expect(r.terminalDecision.EXECUTION_BLOCKED).toBe(true);
    }
  });
});
