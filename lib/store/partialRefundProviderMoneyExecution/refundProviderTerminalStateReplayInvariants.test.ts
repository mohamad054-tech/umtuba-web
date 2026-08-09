/**
 * Terminal-state + replay invariants — fail-closed regression matrix.
 * STRIPE_CALLS=0 · MONEY_MOVEMENT=0 · DB_WRITES=0 · PROVIDER_GATES=OFF
 */

import { describe, expect, it } from "vitest";
import { buildPartialRefundProviderIdempotencyKey } from "./idempotency";
import type { PartialRefundProviderExecutionRecord } from "./types";
import {
  TERMINAL_INVARIANT_LEDGER_STATUSES,
  TERMINAL_INVARIANT_PROVIDER_STATUSES,
  TERMINAL_INVARIANT_TASK_ALIAS_MAP,
  assertRefundProviderTerminalStateReplayInvariants,
  buildRefundProviderTerminalStateReplayInvariants,
  classifyRepeatedRecoveryAction,
} from "./refundProviderTerminalStateReplayInvariants";
import {
  isTerminalProviderExecutionStatus,
  isUncertainProviderExecutionStatus,
} from "./stateMachine";

const LEDGER = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const STORE = "11111111-2222-4333-8444-555555555555";
const ORDER = "66666666-7777-4888-8999-aaaaaaaaaaaa";
const ATTEMPT = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";
const CAPTURE = "cccccccc-dddd-4eee-8fff-000000000000";
const EXEC = "dddddddd-eeee-4fff-8000-111111111111";

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
    providerPaymentRef: "pi_test_terminal_1",
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

describe("actual SoT state names (no invented replacements)", () => {
  it("provider statuses match types contract", () => {
    expect([...TERMINAL_INVARIANT_PROVIDER_STATUSES].sort()).toEqual(
      ["executing", "failed", "planned", "succeeded", "uncertain"].sort()
    );
    expect(isTerminalProviderExecutionStatus("succeeded")).toBe(true);
    expect(isTerminalProviderExecutionStatus("failed")).toBe(true);
    expect(isUncertainProviderExecutionStatus("uncertain")).toBe(true);
  });

  it("ledger statuses match ledger contract", () => {
    expect([...TERMINAL_INVARIANT_LEDGER_STATUSES].sort()).toEqual(
      ["committed", "committing", "compensated", "failed", "planned"].sort()
    );
  });

  it("task aliases map to actual names; RECONCILED is not durable", () => {
    expect(TERMINAL_INVARIANT_TASK_ALIAS_MAP.SUCCESS).toBe("succeeded");
    expect(TERMINAL_INVARIANT_TASK_ALIAS_MAP.FAILED).toBe("failed");
    expect(TERMINAL_INVARIANT_TASK_ALIAS_MAP.UNKNOWN).toBe("uncertain");
    expect(TERMINAL_INVARIANT_TASK_ALIAS_MAP.COMPENSATED).toBe("compensated");
    expect(TERMINAL_INVARIANT_TASK_ALIAS_MAP.COMMITTING).toBe("committing");
    expect(TERMINAL_INVARIANT_TASK_ALIAS_MAP.STUCK_COMMITTING).toBe(
      "committing"
    );
    expect(TERMINAL_INVARIANT_TASK_ALIAS_MAP.RECONCILED).toBeNull();
  });
});

describe("terminal-state + replay invariants — decision matrix", () => {
  it("first_submit_clean → EXECUTION_ALLOWED", () => {
    const d = buildRefundProviderTerminalStateReplayInvariants({
      ledgerStatus: "committed",
      existingExecution: null,
      firstTimeSubmitAllowed: true,
    });
    expect(d.EXECUTION_ALLOWED).toBe(true);
    expect(d.EXECUTION_BLOCKED).toBe(false);
    expect(d.RECONCILIATION_REQUIRED).toBe(false);
    expect(d.RECOVERY_REQUIRED).toBe(false);
    expect(d.OPERATOR_REVIEW_REQUIRED).toBe(false);
    expect(d.scenario).toBe("first_submit_clean");
    expect(d.safety.invariantsOk).toBe(true);
  });

  it("successful money execution cannot execute again", () => {
    const d = buildRefundProviderTerminalStateReplayInvariants({
      ledgerStatus: "committed",
      existingExecution: baseExecution({
        status: "succeeded",
        providerRefundId: "re_ok",
        startedAtIso: "2026-08-09T20:01:00.000Z",
        completedAtIso: "2026-08-09T20:01:01.000Z",
      }),
      firstTimeSubmitAllowed: true,
      actionSurface: "duplicate_command",
    });
    expect(d.EXECUTION_ALLOWED).toBe(false);
    expect(d.EXECUTION_BLOCKED).toBe(true);
    expect(d.providerSubmitAllowed).toBe(false);
    expect(d.retrySafe).toBe(false);
    expect(d.scenario).toBe("duplicate_command_second_execution");
    expect(d.safety.successfulMoneyCannotReExecute).toBe(true);
    expect(
      assertRefundProviderTerminalStateReplayInvariants(d)
    ).not.toContain("SUCCESSFUL_MONEY_EXECUTION_MUST_NOT_EXECUTE_AGAIN");
  });

  it("compensated cannot silently replay", () => {
    const d = buildRefundProviderTerminalStateReplayInvariants({
      ledgerStatus: "compensated",
      existingExecution: baseExecution({ status: "failed" }),
      firstTimeSubmitAllowed: true,
      actionSurface: "stale_ui",
    });
    expect(d.EXECUTION_ALLOWED).toBe(false);
    expect(d.scenario).toBe("compensated_silent_replay");
    expect(d.safety.compensatedCannotSilentlyReplay).toBe(true);
  });

  it("reconciled terminal (succeeded after recovery claim) cannot silently replay", () => {
    const d = buildRefundProviderTerminalStateReplayInvariants({
      ledgerStatus: "committed",
      existingExecution: baseExecution({
        status: "succeeded",
        providerRefundId: "re_recon",
        completedAtIso: "2026-08-09T20:02:00.000Z",
      }),
      firstTimeSubmitAllowed: true,
      actionSurface: "reconciliation",
      reconciledTerminalClaim: true,
    });
    expect(d.EXECUTION_ALLOWED).toBe(false);
    expect(d.scenario).toBe("reconciled_terminal_replay");
    expect(d.evidence.reconciledTerminalClass).toBe(true);
    expect(d.RECOVERY_REQUIRED).toBe(false);
  });

  it("uncertain (UNKNOWN class) cannot become retry-safe without evidence", () => {
    const d = buildRefundProviderTerminalStateReplayInvariants({
      ledgerStatus: "committed",
      existingExecution: baseExecution({
        status: "uncertain",
        startedAtIso: "2026-08-09T20:01:00.000Z",
      }),
      firstTimeSubmitAllowed: true,
    });
    expect(d.EXECUTION_ALLOWED).toBe(false);
    expect(d.retrySafe).toBe(false);
    expect(d.RECONCILIATION_REQUIRED).toBe(true);
    expect(d.RECOVERY_REQUIRED).toBe(true);
    expect(d.OPERATOR_REVIEW_REQUIRED).toBe(true);
    expect(d.scenario).toBe("uncertain_unknown_replay");
    expect(d.safety.uncertainCannotBecomeRetrySafeWithoutEvidence).toBe(true);
  });

  it("stuck committing requires explicit recovery path", () => {
    const d = buildRefundProviderTerminalStateReplayInvariants({
      ledgerStatus: "committing",
      existingExecution: null,
      firstTimeSubmitAllowed: true,
    });
    expect(d.EXECUTION_ALLOWED).toBe(false);
    expect(d.RECOVERY_REQUIRED).toBe(true);
    expect(d.RECONCILIATION_REQUIRED).toBe(true);
    expect(d.OPERATOR_REVIEW_REQUIRED).toBe(true);
    expect(d.scenario).toBe("committing_stuck_requires_recovery");
    expect(d.evidence.stuckCommittingClass).toBe(true);
    expect(d.safety.stuckCommittingRequiresExplicitRecovery).toBe(true);
  });

  it("duplicate command cannot create second provider execution", () => {
    const d = buildRefundProviderTerminalStateReplayInvariants({
      ledgerStatus: "committed",
      existingExecution: baseExecution({
        status: "executing",
        startedAtIso: "2026-08-09T20:01:00.000Z",
      }),
      firstTimeSubmitAllowed: true,
      actionSurface: "duplicate_command",
      nowMs: Date.parse("2026-08-09T20:01:10.000Z"),
    });
    expect(d.EXECUTION_ALLOWED).toBe(false);
    expect(d.providerSubmitAllowed).toBe(false);
    expect(d.scenario).toBe("duplicate_command_second_execution");
    expect(d.safety.duplicateCommandCannotSecondExecute).toBe(true);
  });

  it("stale UI/action cannot bypass terminal-state protection", () => {
    const d = buildRefundProviderTerminalStateReplayInvariants({
      ledgerStatus: "committed",
      existingExecution: baseExecution({
        status: "succeeded",
        providerRefundId: "re_ui",
        completedAtIso: "2026-08-09T20:01:00.000Z",
      }),
      firstTimeSubmitAllowed: true,
      actionSurface: "stale_ui",
    });
    expect(d.EXECUTION_ALLOWED).toBe(false);
    expect(d.scenario).toBe("stale_ui_action_bypass_attempt");
    expect(d.safety.staleUiCannotBypassTerminalProtection).toBe(true);
  });

  it("repeated recovery action is idempotent where required", () => {
    const facts = {
      ledgerStatus: "committed" as const,
      existingExecution: baseExecution({
        status: "uncertain",
        startedAtIso: "2026-08-09T20:01:00.000Z",
      }),
      firstTimeSubmitAllowed: true,
    };
    const r = classifyRepeatedRecoveryAction({ facts });
    expect(r.idempotent).toBe(true);
    expect(r.neverAllowsSubmit).toBe(true);
    expect(r.first.RECOVERY_REQUIRED).toBe(true);
    expect(r.second.RECOVERY_REQUIRED).toBe(true);
    expect(r.first.scenario).toBe("repeated_recovery_idempotent");
    expect(r.second.reasonCode).toBe(r.first.reasonCode);

    // Terminal after recovery — repeated recovery stays blocked, no re-submit.
    const terminal = classifyRepeatedRecoveryAction({
      facts: {
        ledgerStatus: "committed",
        existingExecution: baseExecution({
          status: "succeeded",
          providerRefundId: "re_done",
          completedAtIso: "2026-08-09T20:03:00.000Z",
        }),
        firstTimeSubmitAllowed: true,
        reconciledTerminalClaim: true,
      },
    });
    expect(terminal.idempotent).toBe(true);
    expect(terminal.neverAllowsSubmit).toBe(true);
    expect(terminal.first.RECOVERY_REQUIRED).toBe(false);
  });

  it("stuck committing repeated recovery is idempotent and never submits", () => {
    const r = classifyRepeatedRecoveryAction({
      facts: {
        ledgerStatus: "committing",
        existingExecution: null,
        firstTimeSubmitAllowed: true,
      },
    });
    expect(r.idempotent).toBe(true);
    expect(r.neverAllowsSubmit).toBe(true);
    expect(r.first.RECOVERY_REQUIRED).toBe(true);
    expect(r.first.scenario).toBe("repeated_recovery_idempotent");
  });

  it("gates off → EXECUTION_BLOCKED", () => {
    const d = buildRefundProviderTerminalStateReplayInvariants({
      ledgerStatus: "committed",
      existingExecution: null,
      firstTimeSubmitAllowed: false,
    });
    expect(d.EXECUTION_ALLOWED).toBe(false);
    expect(d.scenario).toBe("gates_off");
  });

  it("terminal failed → EXECUTION_BLOCKED + OPERATOR_REVIEW", () => {
    const d = buildRefundProviderTerminalStateReplayInvariants({
      ledgerStatus: "committed",
      existingExecution: baseExecution({
        status: "failed",
        failureCode: "provider_rejected",
      }),
      firstTimeSubmitAllowed: true,
    });
    expect(d.EXECUTION_ALLOWED).toBe(false);
    expect(d.OPERATOR_REVIEW_REQUIRED).toBe(true);
    expect(d.retrySafe).toBe(false);
    expect(d.scenario).toBe("terminal_failed_replay");
  });
});
