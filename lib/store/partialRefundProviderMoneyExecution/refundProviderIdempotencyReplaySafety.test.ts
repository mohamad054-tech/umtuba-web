import { describe, expect, it, vi } from "vitest";
import { buildPartialRefundProviderIdempotencyKey } from "./idempotency";
import { PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV } from "./executionMode";
import {
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_VALUE,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_NON_PRODUCTION_FIXTURE_TOKEN,
} from "./gate";
import { createMemoryPartialRefundProviderExecutionRepository } from "./memoryRepository";
import {
  executePartialRefundProviderMoney,
  type ExecutePartialRefundProviderMoneyDeps,
} from "./orchestrator";
import type { PartialRefundProviderPort } from "./providerPort";
import {
  assertRefundProviderIdempotencyReplaySafety,
  buildRefundProviderIdempotencyReplaySafety,
  classifyRefundProviderReplayAttempt,
  type BuildRefundProviderIdempotencyReplaySafetyInput,
} from "./refundProviderIdempotencyReplaySafety";
import type { PartialRefundProviderExecutionRecord } from "./types";

const IDS = {
  store: "11111111-1111-4111-8111-111111111111",
  order: "22222222-2222-4222-8222-222222222222",
  attempt: "33333333-3333-4333-8333-333333333333",
  capture: "44444444-4444-4444-8444-444444444444",
  ledger: "55555555-5555-4555-8555-555555555555",
  execution: "66666666-6666-4666-8666-666666666666",
};

const PI = "pi_3IdempotencyReplaySafetyTrusted0001";
const KEY = buildPartialRefundProviderIdempotencyKey(IDS.ledger);

function baseExecution(
  overrides: Partial<PartialRefundProviderExecutionRecord> = {}
): PartialRefundProviderExecutionRecord {
  return {
    executionId: IDS.execution,
    storeId: IDS.store,
    ledgerId: IDS.ledger,
    orderId: IDS.order,
    paymentAttemptId: IDS.attempt,
    captureEventId: IDS.capture,
    providerKind: "stripe",
    providerPaymentRef: PI,
    trustedAmountMinor: 2500,
    currency: "USD",
    idempotencyKey: KEY,
    status: "planned",
    providerRefundId: null,
    providerStatusSafe: null,
    failureCode: null,
    failureMessageSafe: null,
    operatorUserId: "op-1",
    operatorReasonSafe: "test",
    startedAtIso: null,
    completedAtIso: null,
    lastLookupAtIso: null,
    createdAtIso: "2026-08-09T12:00:00.000Z",
    updatedAtIso: "2026-08-09T12:00:00.000Z",
    ...overrides,
  };
}

function committedInput(
  overrides: Partial<BuildRefundProviderIdempotencyReplaySafetyInput> = {}
): BuildRefundProviderIdempotencyReplaySafetyInput {
  return {
    ledgerStatus: "committed",
    reservationStatus: "committed",
    existingExecution: null,
    firstTimeSubmitAllowed: true,
    expectedIdempotencyKey: KEY,
    ...overrides,
  };
}

function expectFourFields(
  d: ReturnType<typeof buildRefundProviderIdempotencyReplaySafety>
) {
  expect(d).toHaveProperty("EXECUTION_ALLOWED");
  expect(d).toHaveProperty("EXECUTION_BLOCKED");
  expect(d).toHaveProperty("RECONCILIATION_REQUIRED");
  expect(d).toHaveProperty("OPERATOR_REVIEW_REQUIRED");
  expect(typeof d.EXECUTION_ALLOWED).toBe("boolean");
  expect(typeof d.EXECUTION_BLOCKED).toBe("boolean");
  expect(typeof d.RECONCILIATION_REQUIRED).toBe("boolean");
  expect(typeof d.OPERATOR_REVIEW_REQUIRED).toBe("boolean");
  expect(d.EXECUTION_ALLOWED).not.toBe(d.EXECUTION_BLOCKED);
  expect(d.providerSubmitAllowed).toBe(d.EXECUTION_ALLOWED);
  expect(d.safety.invariantsOk).toBe(true);
}

function gateOnEnv(): Record<string, string | undefined> {
  return {
    NODE_ENV: "test",
    [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV]: "true",
    [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV]:
      PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_VALUE,
    UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_ALLOW_IN_NON_PRODUCTION:
      PARTIAL_REFUND_PROVIDER_MONEY_NON_PRODUCTION_FIXTURE_TOKEN,
    [PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV]: "test",
    STRIPE_SECRET_KEY: "sk_test_INVALID_FIXTURE_ONLY_NOT_A_SECRET",
    STRIPE_MODE: "test",
    NEXT_PUBLIC_APP_URL: "https://example.test",
  };
}

function committedLedger() {
  return {
    ledgerId: IDS.ledger,
    storeId: IDS.store,
    orderId: IDS.order,
    paymentAttemptId: IDS.attempt,
    captureEventId: IDS.capture,
    status: "committed" as const,
    refundAmountMinor: 2500,
    currency: "USD",
  };
}

describe("buildRefundProviderIdempotencyReplaySafety — four-field contract", () => {
  it("first_submit_clean → EXECUTION_ALLOWED", () => {
    const d = buildRefundProviderIdempotencyReplaySafety(committedInput());
    expectFourFields(d);
    expect(d.EXECUTION_ALLOWED).toBe(true);
    expect(d.EXECUTION_BLOCKED).toBe(false);
    expect(d.RECONCILIATION_REQUIRED).toBe(false);
    expect(d.OPERATOR_REVIEW_REQUIRED).toBe(false);
    expect(d.scenario).toBe("first_submit_clean");
    expect(d.disposition).toBe("allow_first_submit");
  });

  it("planned existing row still first-submit eligible", () => {
    const d = buildRefundProviderIdempotencyReplaySafety(
      committedInput({ existingExecution: baseExecution({ status: "planned" }) })
    );
    expect(d.EXECUTION_ALLOWED).toBe(true);
    expect(d.evidence.providerSubmissionAttempted).toBe(false);
  });
});

describe("idempotency / replay scenarios — fail closed", () => {
  it("same_refund_command_repeated after success → EXECUTION_BLOCKED safe replay", () => {
    const prior = committedInput({
      existingExecution: baseExecution({
        status: "succeeded",
        providerRefundId: "re_ok",
        startedAtIso: "2026-08-09T12:00:01.000Z",
        completedAtIso: "2026-08-09T12:00:02.000Z",
      }),
    });
    const d = classifyRefundProviderReplayAttempt({
      prior,
      attemptSurface: "same_command",
    });
    expectFourFields(d);
    expect(d.EXECUTION_ALLOWED).toBe(false);
    expect(d.EXECUTION_BLOCKED).toBe(true);
    expect(d.providerSubmitAllowed).toBe(false);
    expect(d.scenario).toBe("same_refund_command_repeated");
    expect(d.disposition).toBe("safe_replay_no_submit");
  });

  it("reservation_committed_twice after provider success → blocked", () => {
    const d = classifyRefundProviderReplayAttempt({
      prior: committedInput({
        existingExecution: baseExecution({
          status: "succeeded",
          providerRefundId: "re_ok",
          startedAtIso: "2026-08-09T12:00:01.000Z",
          completedAtIso: "2026-08-09T12:00:02.000Z",
        }),
      }),
      attemptSurface: "reservation_commit",
    });
    expect(d.EXECUTION_ALLOWED).toBe(false);
    expect(d.scenario).toBe("reservation_committed_twice");
    expect(d.providerSubmitAllowed).toBe(false);
  });

  it("provider_execution_twice / successful_replay → no second money", () => {
    const d = buildRefundProviderIdempotencyReplaySafety(
      committedInput({
        existingExecution: baseExecution({
          status: "succeeded",
          providerRefundId: "re_ok",
          startedAtIso: "2026-08-09T12:00:01.000Z",
          completedAtIso: "2026-08-09T12:00:02.000Z",
        }),
      })
    );
    expect(d.scenario).toBe("successful_replay");
    expect(d.EXECUTION_ALLOWED).toBe(false);
    expect(d.EXECUTION_BLOCKED).toBe(true);
    expect(d.RECONCILIATION_REQUIRED).toBe(false);
  });

  it("repeated_server_action after success → blocked", () => {
    const d = classifyRefundProviderReplayAttempt({
      prior: committedInput({
        existingExecution: baseExecution({
          status: "succeeded",
          providerRefundId: "re_ok",
          startedAtIso: "2026-08-09T12:00:01.000Z",
          completedAtIso: "2026-08-09T12:00:02.000Z",
        }),
      }),
      attemptSurface: "server_action",
    });
    expect(d.scenario).toBe("repeated_server_action");
    expect(d.EXECUTION_ALLOWED).toBe(false);
  });

  it("browser_retry_reload while executing → reconcile, never submit", () => {
    const d = classifyRefundProviderReplayAttempt({
      prior: committedInput({
        existingExecution: baseExecution({
          status: "executing",
          startedAtIso: "2026-08-09T12:00:01.000Z",
        }),
        nowMs: Date.parse("2026-08-09T12:00:30.000Z"),
      }),
      attemptSurface: "browser_retry",
    });
    expect(d.scenario).toBe("browser_retry_reload");
    expect(d.EXECUTION_ALLOWED).toBe(false);
    expect(d.RECONCILIATION_REQUIRED).toBe(true);
    expect(d.providerSubmitAllowed).toBe(false);
  });

  it("network_like_retry_simulation while executing → no second money", () => {
    const d = classifyRefundProviderReplayAttempt({
      prior: committedInput({
        existingExecution: baseExecution({
          status: "executing",
          startedAtIso: "2026-08-09T12:00:01.000Z",
        }),
        nowMs: Date.parse("2026-08-09T12:00:10.000Z"),
      }),
      attemptSurface: "network_retry",
    });
    expect(d.scenario).toBe("network_like_retry_simulation");
    expect(d.EXECUTION_ALLOWED).toBe(false);
    expect(d.disposition).toBe("reconcile_no_submit");
  });

  it("stale_committing → RECONCILIATION_REQUIRED + OPERATOR_REVIEW", () => {
    const d = buildRefundProviderIdempotencyReplaySafety({
      ledgerStatus: "committing",
      reservationStatus: "committing",
      existingExecution: null,
      firstTimeSubmitAllowed: true,
    });
    expectFourFields(d);
    expect(d.scenario).toBe("stale_committing");
    expect(d.EXECUTION_ALLOWED).toBe(false);
    expect(d.RECONCILIATION_REQUIRED).toBe(true);
    expect(d.OPERATOR_REVIEW_REQUIRED).toBe(true);
  });

  it("failed_retry → EXECUTION_BLOCKED + OPERATOR_REVIEW", () => {
    const d = buildRefundProviderIdempotencyReplaySafety(
      committedInput({
        existingExecution: baseExecution({
          status: "failed",
          failureCode: "provider_rejected",
          startedAtIso: "2026-08-09T12:00:01.000Z",
          completedAtIso: "2026-08-09T12:00:02.000Z",
        }),
      })
    );
    expect(d.scenario).toBe("failed_retry");
    expect(d.EXECUTION_ALLOWED).toBe(false);
    expect(d.OPERATOR_REVIEW_REQUIRED).toBe(true);
  });

  it("CRITICAL: unknown_outcome_replay NEVER EXECUTION_ALLOWED", () => {
    const d = buildRefundProviderIdempotencyReplaySafety(
      committedInput({
        existingExecution: baseExecution({
          status: "uncertain",
          failureCode: "provider_unknown",
          startedAtIso: "2026-08-09T12:00:01.000Z",
        }),
      })
    );
    expectFourFields(d);
    expect(d.scenario).toBe("unknown_outcome_replay");
    expect(d.EXECUTION_ALLOWED).toBe(false);
    expect(d.providerSubmitAllowed).toBe(false);
    expect(d.RECONCILIATION_REQUIRED).toBe(true);
    expect(d.OPERATOR_REVIEW_REQUIRED).toBe(true);
    expect(d.evidence.providerOutcomeUnknown).toBe(true);

    const violations = assertRefundProviderIdempotencyReplaySafety({
      ...d,
      EXECUTION_ALLOWED: true,
      EXECUTION_BLOCKED: false,
      providerSubmitAllowed: true,
    });
    expect(violations).toContain(
      "UNKNOWN_PROVIDER_OUTCOME_MUST_NOT_ALLOW_SECOND_MONEY_EXECUTION"
    );
    expect(violations).toContain(
      "PREVIOUSLY_EXECUTED_MUST_NOT_ALLOW_UNCONTROLLED_SECOND_MONEY"
    );
  });

  it("compensation_then_replay → EXECUTION_BLOCKED", () => {
    const d = buildRefundProviderIdempotencyReplaySafety({
      ledgerStatus: "compensated",
      reservationStatus: "compensated",
      existingExecution: baseExecution({
        status: "failed",
        failureCode: "compensated_local",
        startedAtIso: "2026-08-09T12:00:01.000Z",
        completedAtIso: "2026-08-09T12:00:02.000Z",
      }),
      firstTimeSubmitAllowed: true,
    });
    expect(d.scenario).toBe("compensation_then_replay");
    expect(d.EXECUTION_ALLOWED).toBe(false);
    expect(d.EXECUTION_BLOCKED).toBe(true);
  });

  it("reconciliation_then_replay on uncertain → still no second money", () => {
    const d = classifyRefundProviderReplayAttempt({
      prior: committedInput({
        existingExecution: baseExecution({
          status: "uncertain",
          startedAtIso: "2026-08-09T12:00:01.000Z",
          lastLookupAtIso: "2026-08-09T12:05:00.000Z",
        }),
      }),
      attemptSurface: "reconciliation",
    });
    expect(d.scenario).toBe("reconciliation_then_replay");
    expect(d.EXECUTION_ALLOWED).toBe(false);
    expect(d.RECONCILIATION_REQUIRED).toBe(true);
    expect(d.OPERATOR_REVIEW_REQUIRED).toBe(true);
    expect(d.disposition).toBe("operator_review_no_submit");
  });

  it("stale_executing → reconcile + operator review", () => {
    const started = "2026-08-09T10:00:00.000Z";
    const d = buildRefundProviderIdempotencyReplaySafety(
      committedInput({
        existingExecution: baseExecution({
          status: "executing",
          startedAtIso: started,
        }),
        nowMs: Date.parse("2026-08-09T12:00:00.000Z"),
        staleAfterMs: 60_000,
      })
    );
    expect(d.scenario).toBe("stale_executing");
    expect(d.EXECUTION_ALLOWED).toBe(false);
    expect(d.RECONCILIATION_REQUIRED).toBe(true);
    expect(d.OPERATOR_REVIEW_REQUIRED).toBe(true);
  });

  it("idempotency_key_mismatch → OPERATOR_REVIEW_REQUIRED", () => {
    const d = buildRefundProviderIdempotencyReplaySafety(
      committedInput({
        existingExecution: baseExecution({
          status: "planned",
          idempotencyKey: "prf-prov:00000000-0000-4000-8000-000000000000",
        }),
      })
    );
    expect(d.scenario).toBe("idempotency_key_mismatch");
    expect(d.EXECUTION_ALLOWED).toBe(false);
    expect(d.OPERATOR_REVIEW_REQUIRED).toBe(true);
    expect(d.RECONCILIATION_REQUIRED).toBe(true);
  });

  it("gates_off → EXECUTION_BLOCKED", () => {
    const d = buildRefundProviderIdempotencyReplaySafety(
      committedInput({ firstTimeSubmitAllowed: false })
    );
    expect(d.scenario).toBe("gates_off");
    expect(d.EXECUTION_ALLOWED).toBe(false);
  });
});

describe("orchestrator integration — network-like retry without real network", () => {
  it("double execute after success: submit once; decision blocks second money", async () => {
    const repo = createMemoryPartialRefundProviderExecutionRepository();
    const submit = vi.fn(async () => ({
      kind: "succeeded" as const,
      providerRefundId: "re_replay_1",
      providerStatusSafe: "succeeded",
      amountMinor: 2500,
      currency: "USD",
    }));
    const deps: ExecutePartialRefundProviderMoneyDeps = {
      repository: repo,
      env: gateOnEnv(),
      resolveProviderPort: () =>
        ({
          providerKind: "stripe" as const,
          submitPartialRefund: submit,
          lookupPartialRefund: vi.fn(),
        }) satisfies PartialRefundProviderPort,
    };

    const first = await executePartialRefundProviderMoney(
      {
        ledger: committedLedger(),
        trustedProviderPaymentRef: PI,
        operatorUserId: "op-1",
        operatorReasonSafe: "idempotency replay safety first",
      },
      deps
    );
    expect(first.ok).toBe(true);

    const second = await executePartialRefundProviderMoney(
      {
        ledger: committedLedger(),
        trustedProviderPaymentRef: PI,
        operatorUserId: "op-1",
        operatorReasonSafe: "idempotency replay safety network retry",
      },
      deps
    );
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.value.phase).toBe("replayed_succeeded");
      expect(second.value.providerSubmitCalled).toBe(false);
    }
    expect(submit).toHaveBeenCalledTimes(1);

    const row = await repo.getByLedger(IDS.ledger);
    const decision = classifyRefundProviderReplayAttempt({
      prior: committedInput({ existingExecution: row }),
      attemptSurface: "network_retry",
    });
    expect(decision.EXECUTION_ALLOWED).toBe(false);
    expect(decision.providerSubmitAllowed).toBe(false);
    expect(decision.scenario).toBe("network_like_retry_simulation");
  });

  it("uncertain then replay: recovery path, zero second submit", async () => {
    const repo = createMemoryPartialRefundProviderExecutionRepository();
    const submit = vi.fn(async () => ({
      kind: "uncertain" as const,
      failureCode: "provider_timeout",
      failureMessageSafe: "simulated unknown",
      providerStatusSafe: "unknown",
    }));
    const deps: ExecutePartialRefundProviderMoneyDeps = {
      repository: repo,
      env: gateOnEnv(),
      resolveProviderPort: () =>
        ({
          providerKind: "stripe" as const,
          submitPartialRefund: submit,
          lookupPartialRefund: vi.fn(),
        }) satisfies PartialRefundProviderPort,
    };

    const first = await executePartialRefundProviderMoney(
      {
        ledger: committedLedger(),
        trustedProviderPaymentRef: PI,
        operatorUserId: "op-1",
        operatorReasonSafe: "unknown outcome first",
      },
      deps
    );
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.value.phase).toBe("uncertain");

    const second = await executePartialRefundProviderMoney(
      {
        ledger: committedLedger(),
        trustedProviderPaymentRef: PI,
        operatorUserId: "op-1",
        operatorReasonSafe: "unknown outcome replay",
      },
      deps
    );
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.value.phase).toBe("recovery_required");
      expect(second.value.providerSubmitCalled).toBe(false);
    }
    expect(submit).toHaveBeenCalledTimes(1);

    const row = await repo.getByLedger(IDS.ledger);
    const decision = buildRefundProviderIdempotencyReplaySafety(
      committedInput({ existingExecution: row })
    );
    expect(decision.EXECUTION_ALLOWED).toBe(false);
    expect(decision.RECONCILIATION_REQUIRED).toBe(true);
    expect(decision.OPERATOR_REVIEW_REQUIRED).toBe(true);
  });
});
