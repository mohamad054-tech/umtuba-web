/**
 * P3 tests â€” first-time execute enablement prep (fail-closed, mock/fixture only).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_FAILED_RETRY_POLICY_V1,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_VALUE,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_NON_PRODUCTION_FIXTURE_TOKEN,
  PARTIAL_REFUND_PROVIDER_MONEY_OPERATOR_ACK_VALUE,
  assertAdminProviderMoneyExecuteAllowed,
  assertPartialRefundProviderMoneyExecutionGates,
  assertProviderMoneyOperatorAck,
  buildPartialRefundProviderIdempotencyKey,
  buildPartialRefundProviderMoneyReadinessReport,
  createMemoryPartialRefundProviderExecutionRepository,
  evaluateFirstTimeProviderMoneyExecuteEligibility,
  evaluatePartialRefundProviderMoneyExecutionMode,
  failedProviderExecutionRetryBlockedMessage,
  isFailedProviderExecutionRetryAllowedInV1,
  parsePartialRefundProviderMoneyExecutionMode,
  runAdminExecutePartialRefundProviderMoney,
  sanitizeProviderMoneyOperatorReason,
  type PartialRefundProviderPort,
} from "./index";
import type { PartialRefundLedgerCommitRecord } from "../partialRefundLedger";
import type { AdminExecuteProviderMoneyInput } from "./adminExecuteService";

const ROOT = join(__dirname, "../../..");
const ACTION = "app/actions/storePartialRefundProviderMoneyExecution.ts";
const PANEL =
  "app/admin/store/refunds/PartialRefundProviderMoneyExecutePanel.tsx";
const RUNBOOK =
  "docs/store/implementation/PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_P3_RUNBOOK.md";

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const IDS = {
  store: "11111111-1111-4111-8111-111111111111",
  storeB: "aaaaaaaa-1111-4111-8111-111111111111",
  order: "22222222-2222-4222-8222-222222222222",
  attempt: "33333333-3333-4333-8333-333333333333",
  capture: "44444444-4444-4444-8444-444444444444",
  ledger: "55555555-5555-4555-8555-555555555555",
  operator: "77777777-7777-4777-8777-777777777777",
};

const PI = "pi_3P3TrustedPaymentIntent0001";
const REASON = "Admin fixture first-time provider refund execute for test mode.";

function gateOnEnv(
  extra: Record<string, string | undefined> = {}
): Record<string, string | undefined> {
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
    ...extra,
  };
}

function committedLedgerRow(
  overrides: Partial<PartialRefundLedgerCommitRecord> = {}
): PartialRefundLedgerCommitRecord {
  return {
    ledgerId: IDS.ledger,
    storeId: IDS.store,
    orderId: IDS.order,
    paymentAttemptId: IDS.attempt,
    captureEventId: IDS.capture,
    currency: "USD",
    refundAmountMinor: 1500,
    captureAmountMinor: 5000,
    calculationFingerprint: "fp-test",
    idempotencyKey: "ledger-idem-1",
    status: "committed",
    lines: [],
    accountingVersion: 1,
    attemptCount: 1,
    failureCode: null,
    failureMessageSafe: null,
    compensationReasonSafe: null,
    compensatedAtIso: null,
    createdAtIso: "2026-01-01T00:00:00.000Z",
    updatedAtIso: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function mockFactClientForPi(pi: string = PI) {
  const tables: Record<string, unknown> = {
    orders: { id: IDS.order, store_id: IDS.store },
    payment_attempts: {
      id: IDS.attempt,
      order_id: IDS.order,
      provider: "stripe",
      provider_reference: "cs_test_session",
      status: "captured",
    },
    store_payment_outcome_events: {
      id: IDS.capture,
      payment_attempt_id: IDS.attempt,
      order_id: IDS.order,
      outcome: "captured",
      provider_reference: pi,
      event_key: `stripe:${pi}:captured`,
    },
  };
  return {
    from(name: string) {
      const row = tables[name];
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({
                  data: row ?? null,
                  error: null,
                }),
                eq() {
                  return {
                    maybeSingle: async () => ({
                      data: row ?? null,
                      error: null,
                    }),
                  };
                },
              };
            },
          };
        },
      };
    },
  } as never;
}

describe("P3 execution mode", () => {
  it("defaults to off; rejects ambiguous truthy values", () => {
    expect(parsePartialRefundProviderMoneyExecutionMode(undefined).mode).toBe(
      "off"
    );
    expect(parsePartialRefundProviderMoneyExecutionMode("true").ok).toBe(false);
    expect(parsePartialRefundProviderMoneyExecutionMode("1").ok).toBe(false);
    expect(parsePartialRefundProviderMoneyExecutionMode("yes").ok).toBe(false);
    expect(parsePartialRefundProviderMoneyExecutionMode("test").mode).toBe(
      "test"
    );
  });

  it("test mode requires Stripe test config", () => {
    const bad = evaluatePartialRefundProviderMoneyExecutionMode({
      NODE_ENV: "test",
      [PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV]: "test",
      STRIPE_SECRET_KEY: "sk_live_INVALID_FIXTURE_ONLY_NOT_A_SECRET",
      STRIPE_MODE: "live",
      STRIPE_WEBHOOK_SECRET: "whsec_testplaceholderonly",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_testplaceholderonly",
      NEXT_PUBLIC_APP_URL: "https://example.com",
      STRIPE_LIVE_PAYMENTS_ENABLED: "true",
      STRIPE_PRODUCTION_GATE_ACK:
        "I_UNDERSTAND_LIVE_STRIPE_CHARGES_REAL_MONEY",
      VERCEL_ENV: "production",
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.code).toBe("execution_mode_test_requires_stripe_test");
    }
  });

  it("production mode requires production env + production ACK", () => {
    const missingAck = evaluatePartialRefundProviderMoneyExecutionMode({
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      [PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV]: "production",
      STRIPE_SECRET_KEY: "sk_live_INVALID_FIXTURE_ONLY_NOT_A_SECRET",
      STRIPE_MODE: "live",
      STRIPE_WEBHOOK_SECRET: "whsec_testplaceholderonly",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_testplaceholderonly",
      NEXT_PUBLIC_APP_URL: "https://example.com",
      STRIPE_LIVE_PAYMENTS_ENABLED: "true",
      STRIPE_PRODUCTION_GATE_ACK:
        "I_UNDERSTAND_LIVE_STRIPE_CHARGES_REAL_MONEY",
    });
    expect(missingAck.ok).toBe(false);
    if (!missingAck.ok) {
      expect(missingAck.code).toBe("execution_mode_production_ack_missing");
    }
  });
});

describe("P3 operator ACK + reason", () => {
  it("requires exact ACK value", () => {
    expect(assertProviderMoneyOperatorAck(undefined).ok).toBe(false);
    expect(assertProviderMoneyOperatorAck("yes").ok).toBe(false);
    expect(
      assertProviderMoneyOperatorAck(PARTIAL_REFUND_PROVIDER_MONEY_OPERATOR_ACK_VALUE)
        .ok
    ).toBe(true);
  });

  it("rejects short operator reason", () => {
    expect(sanitizeProviderMoneyOperatorReason("x").ok).toBe(false);
    expect(sanitizeProviderMoneyOperatorReason(REASON).ok).toBe(true);
  });
});

describe("P3 failed retry policy", () => {
  it("V1 is no_retry", () => {
    expect(PARTIAL_REFUND_PROVIDER_MONEY_FAILED_RETRY_POLICY_V1).toBe(
      "no_retry"
    );
    expect(isFailedProviderExecutionRetryAllowedInV1()).toBe(false);
    expect(failedProviderExecutionRetryBlockedMessage()).toMatch(/V1 does not allow retry/i);
  });
});

describe("P3 gates / ACK cause zero submit", () => {
  async function runWith(
    env: Record<string, string | undefined>,
    inputOverrides: Partial<AdminExecuteProviderMoneyInput> = {}
  ) {
    const submit = vi.fn();
    const repo = createMemoryPartialRefundProviderExecutionRepository();
    const ledger = committedLedgerRow();
    const result = await runAdminExecutePartialRefundProviderMoney(
      {
        ledgerId: IDS.ledger,
        expectedStoreId: IDS.store,
        operatorUserId: IDS.operator,
        operatorReason: REASON,
        operatorMoneyAck: PARTIAL_REFUND_PROVIDER_MONEY_OPERATOR_ACK_VALUE,
        ...inputOverrides,
      },
      {
        factClient: mockFactClientForPi(),
        ledgerRepository: {
          getByLedgerId: async () => ledger,
        },
        executionRepository: repo,
        repository: repo,
        env,
        resolveProviderPort: () =>
          ({
            providerKind: "stripe",
            submitPartialRefund: submit,
            lookupPartialRefund: vi.fn(),
          }) as unknown as PartialRefundProviderPort,
      }
    );
    return { result, submit };
  }

  it("dedicated gate OFF â†’ zero submit", async () => {
    const { result, submit } = await runWith(
      gateOnEnv({ [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV]: "false" })
    );
    expect(result.ok).toBe(false);
    expect(submit).not.toHaveBeenCalled();
  });

  it("execution mode OFF â†’ zero submit", async () => {
    const { result, submit } = await runWith(
      gateOnEnv({
        [PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV]: "off",
      })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("execution_mode_off");
    expect(submit).not.toHaveBeenCalled();
  });

  it("Stripe readiness missing â†’ zero submit", async () => {
    const { result, submit } = await runWith(
      gateOnEnv({ STRIPE_SECRET_KEY: undefined })
    );
    expect(result.ok).toBe(false);
    expect(submit).not.toHaveBeenCalled();
  });

  it("ACK missing â†’ zero submit", async () => {
    const { result, submit } = await runWith(gateOnEnv(), {
      operatorMoneyAck: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("operator_ack_missing");
    expect(submit).not.toHaveBeenCalled();
  });

  it("invalid operator reason â†’ zero submit", async () => {
    const { result, submit } = await runWith(gateOnEnv(), {
      operatorReason: "x",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("operator_reason_invalid");
    expect(submit).not.toHaveBeenCalled();
  });

  it("store mismatch â†’ zero submit", async () => {
    const { result, submit } = await runWith(gateOnEnv(), {
      expectedStoreId: IDS.storeB,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("missing_ownership");
    expect(submit).not.toHaveBeenCalled();
  });

  it("client-supplied pi_ rejected â†’ zero submit", async () => {
    const { result, submit } = await runWith(gateOnEnv(), {
      clientProviderPaymentRef: "pi_clientForgedIntent999",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("client_money_rejected");
    expect(submit).not.toHaveBeenCalled();
  });
});

describe("P3 happy path + idempotency + outcomes", () => {
  it("eligible fixture path submits exactly once with prf-prov key", async () => {
    const submit = vi.fn(
      async (input: {
        idempotencyKey: string;
        providerPaymentRef: string;
        amountMinor: number;
        currency: string;
      }) => ({
      kind: "succeeded" as const,
      providerRefundId: "re_test_p3_1",
      providerStatusSafe: "succeeded",
      amountMinor: 1500,
      currency: "USD",
      idempotencyKey: input.idempotencyKey,
    })
    );
    const repo = createMemoryPartialRefundProviderExecutionRepository();
    const result = await runAdminExecutePartialRefundProviderMoney(
      {
        ledgerId: IDS.ledger,
        expectedStoreId: IDS.store,
        operatorUserId: IDS.operator,
        operatorReason: REASON,
        operatorMoneyAck: PARTIAL_REFUND_PROVIDER_MONEY_OPERATOR_ACK_VALUE,
      },
      {
        factClient: mockFactClientForPi(),
        ledgerRepository: { getByLedgerId: async () => committedLedgerRow() },
        executionRepository: repo,
        repository: repo,
        env: gateOnEnv(),
        resolveProviderPort: () =>
          ({
            providerKind: "stripe",
            submitPartialRefund: submit,
            lookupPartialRefund: vi.fn(),
          }) as unknown as PartialRefundProviderPort,
      }
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.providerSubmitCalled).toBe(true);
      expect(result.value.phase).toBe("succeeded");
      expect(result.value.idempotencyKey).toBe(
        buildPartialRefundProviderIdempotencyKey(IDS.ledger)
      );
      expect(result.value.ledgerCompensated).toBe(false);
      expect(result.value.stockRestocked).toBe(false);
      expect(result.value.entitlementAdjusted).toBe(false);
      expect(result.value.settlementUnwound).toBe(false);
      expect(result.value.commissionUnwound).toBe(false);
      expect(result.value.payoutReversed).toBe(false);
    }
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0]?.[0]?.idempotencyKey).toBe(
      `prf-prov:${IDS.ledger}`
    );
    expect(submit.mock.calls[0]?.[0]?.providerPaymentRef).toBe(PI);

    // second call after success â†’ zero additional submit
    const second = await runAdminExecutePartialRefundProviderMoney(
      {
        ledgerId: IDS.ledger,
        expectedStoreId: IDS.store,
        operatorUserId: IDS.operator,
        operatorReason: REASON,
        operatorMoneyAck: PARTIAL_REFUND_PROVIDER_MONEY_OPERATOR_ACK_VALUE,
      },
      {
        factClient: mockFactClientForPi(),
        ledgerRepository: { getByLedgerId: async () => committedLedgerRow() },
        executionRepository: repo,
        repository: repo,
        env: gateOnEnv(),
        resolveProviderPort: () =>
          ({
            providerKind: "stripe",
            submitPartialRefund: submit,
            lookupPartialRefund: vi.fn(),
          }) as unknown as PartialRefundProviderPort,
      }
    );
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.value.providerSubmitCalled).toBe(false);
      expect(second.value.phase).toMatch(/succeeded|replayed_succeeded/);
    }
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("uncertain â†’ recovery_required, zero submit on re-execute", async () => {
    const submit = vi.fn(async () => ({
      kind: "uncertain" as const,
      failureCode: "provider_timeout",
      failureMessageSafe: "timeout",
      providerRefundId: null,
      providerStatusSafe: null,
    }));
    const repo = createMemoryPartialRefundProviderExecutionRepository();
    const deps = {
      factClient: mockFactClientForPi(),
      ledgerRepository: { getByLedgerId: async () => committedLedgerRow() },
      executionRepository: repo,
      repository: repo,
      env: gateOnEnv(),
      resolveProviderPort: () =>
        ({
          providerKind: "stripe",
          submitPartialRefund: submit,
          lookupPartialRefund: vi.fn(),
        }) as unknown as PartialRefundProviderPort,
    };
    const first = await runAdminExecutePartialRefundProviderMoney(
      {
        ledgerId: IDS.ledger,
        expectedStoreId: IDS.store,
        operatorUserId: IDS.operator,
        operatorReason: REASON,
        operatorMoneyAck: PARTIAL_REFUND_PROVIDER_MONEY_OPERATOR_ACK_VALUE,
      },
      deps
    );
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.value.phase).toBe("uncertain");
    expect(submit).toHaveBeenCalledTimes(1);

    const second = await runAdminExecutePartialRefundProviderMoney(
      {
        ledgerId: IDS.ledger,
        expectedStoreId: IDS.store,
        operatorUserId: IDS.operator,
        operatorReason: REASON,
        operatorMoneyAck: PARTIAL_REFUND_PROVIDER_MONEY_OPERATOR_ACK_VALUE,
      },
      deps
    );
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.value.phase).toBe("recovery_required");
      expect(second.value.providerSubmitCalled).toBe(false);
    }
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("provider definitive failure â†’ persisted failed; retry blocked", async () => {
    const submit = vi.fn(async () => ({
      kind: "failed" as const,
      failureCode: "provider_rejected",
      failureMessageSafe: "charge already refunded",
      providerRefundId: null,
      providerStatusSafe: "failed",
    }));
    const repo = createMemoryPartialRefundProviderExecutionRepository();
    const deps = {
      factClient: mockFactClientForPi(),
      ledgerRepository: { getByLedgerId: async () => committedLedgerRow() },
      executionRepository: repo,
      repository: repo,
      env: gateOnEnv(),
      resolveProviderPort: () =>
        ({
          providerKind: "stripe",
          submitPartialRefund: submit,
          lookupPartialRefund: vi.fn(),
        }) as unknown as PartialRefundProviderPort,
    };
    const first = await runAdminExecutePartialRefundProviderMoney(
      {
        ledgerId: IDS.ledger,
        expectedStoreId: IDS.store,
        operatorUserId: IDS.operator,
        operatorReason: REASON,
        operatorMoneyAck: PARTIAL_REFUND_PROVIDER_MONEY_OPERATOR_ACK_VALUE,
      },
      deps
    );
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.value.phase).toBe("failed");

    const second = await runAdminExecutePartialRefundProviderMoney(
      {
        ledgerId: IDS.ledger,
        expectedStoreId: IDS.store,
        operatorUserId: IDS.operator,
        operatorReason: REASON,
        operatorMoneyAck: PARTIAL_REFUND_PROVIDER_MONEY_OPERATOR_ACK_VALUE,
      },
      deps
    );
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.message).toMatch(/does not allow retry/i);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("executing â†’ recovery_required with zero submit", async () => {
    const submit = vi.fn();
    const repo = createMemoryPartialRefundProviderExecutionRepository();
    const claimed = await repo.claim({
      storeId: IDS.store,
      ledgerId: IDS.ledger,
      orderId: IDS.order,
      paymentAttemptId: IDS.attempt,
      captureEventId: IDS.capture,
      providerKind: "stripe",
      providerPaymentRef: PI,
      trustedAmountMinor: 1500,
      currency: "USD",
      idempotencyKey: buildPartialRefundProviderIdempotencyKey(IDS.ledger),
      ledgerStatus: "committed",
      ledgerRefundAmountMinor: 1500,
      ledgerCurrency: "USD",
    });
    expect(claimed.ok).toBe(true);
    if (!claimed.ok) return;
    await repo.update({
      executionId: claimed.execution.executionId,
      fromStatus: "planned",
      toStatus: "executing",
    });

    const result = await runAdminExecutePartialRefundProviderMoney(
      {
        ledgerId: IDS.ledger,
        expectedStoreId: IDS.store,
        operatorUserId: IDS.operator,
        operatorReason: REASON,
        operatorMoneyAck: PARTIAL_REFUND_PROVIDER_MONEY_OPERATOR_ACK_VALUE,
      },
      {
        factClient: mockFactClientForPi(),
        ledgerRepository: { getByLedgerId: async () => committedLedgerRow() },
        executionRepository: repo,
        repository: repo,
        env: gateOnEnv(),
        resolveProviderPort: () =>
          ({
            providerKind: "stripe",
            submitPartialRefund: submit,
            lookupPartialRefund: vi.fn(),
          }) as unknown as PartialRefundProviderPort,
      }
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.phase).toBe("recovery_required");
      expect(result.value.providerSubmitCalled).toBe(false);
    }
    expect(submit).not.toHaveBeenCalled();
  });
});

describe("P3 eligibility + readiness", () => {
  it("classifies recovery / succeeded / eligible", () => {
    const gatesOn = assertPartialRefundProviderMoneyExecutionGates(gateOnEnv());
    expect(gatesOn.ok).toBe(true);

    expect(
      evaluateFirstTimeProviderMoneyExecuteEligibility({
        ledgerStatus: "committed",
        refundAmountMinor: 100,
        currency: "USD",
        storeId: IDS.store,
        existingExecution: null,
        trustedPaymentIntentId: PI,
        firstTimeSubmitAllowed: true,
      }).code
    ).toBe("eligible");

    expect(
      evaluateFirstTimeProviderMoneyExecuteEligibility({
        ledgerStatus: "committed",
        refundAmountMinor: 100,
        currency: "USD",
        storeId: IDS.store,
        existingExecution: {
          executionId: "66666666-6666-4666-8666-666666666666",
          storeId: IDS.store,
          ledgerId: IDS.ledger,
          orderId: IDS.order,
          paymentAttemptId: IDS.attempt,
          captureEventId: IDS.capture,
          providerKind: "stripe",
          providerPaymentRef: PI,
          trustedAmountMinor: 100,
          currency: "USD",
          idempotencyKey: `prf-prov:${IDS.ledger}`,
          status: "uncertain",
          providerRefundId: null,
          providerStatusSafe: null,
          failureCode: null,
          failureMessageSafe: null,
          operatorUserId: null,
          operatorReasonSafe: null,
          startedAtIso: null,
          completedAtIso: null,
          lastLookupAtIso: null,
          createdAtIso: "2026-01-01T00:00:00.000Z",
          updatedAtIso: "2026-01-01T00:00:00.000Z",
        },
        trustedPaymentIntentId: PI,
        firstTimeSubmitAllowed: true,
      }).code
    ).toBe("recovery_required");

    const report = buildPartialRefundProviderMoneyReadinessReport({});
    expect(report.executionMode).toBe("off");
    expect(report.firstTimeSubmitAllowed).toBe(false);
    expect(assertAdminProviderMoneyExecuteAllowed({}).ok).toBe(false);
  });
});

describe("P3 admin action / UI / runbook contracts", () => {
  it("action uses approved orchestration + ACK + no hard-disable", () => {
    const src = read(ACTION);
    expect(src).toMatch(/"use server"/);
    expect(src).toMatch(/assertPlatformAdminDb/);
    expect(src).toMatch(/runAdminExecutePartialRefundProviderMoney/);
    expect(src).toMatch(/executeCommittedPartialRefundProviderMoney|runAdminExecute/);
    expect(src).toMatch(/PARTIAL_REFUND_PROVIDER_MONEY_OPERATOR_ACK_FIELD/);
    expect(src).toMatch(/assertAdminProviderMoneyExecuteAllowed/);
    expect(src).toMatch(/Does not compensate|never compensate|LOOKUP ONLY/i);
    expect(src).not.toMatch(/live_clickable_flow_disabled/);
    expect(src).toMatch(/LOOKUP ONLY|lookup only|Never submitPartialRefund/i);
    expect(src).not.toMatch(/adminCompensateCommitted|compensateCommittedPartialRefund/);
  });

  it("execute panel requires ACK + reason and distinguishes eligibility", () => {
    const src = read(PANEL);
    expect(src).toMatch(/PARTIAL_REFUND_PROVIDER_MONEY_OPERATOR_ACK_VALUE/);
    expect(src).toMatch(/operatorReason/);
    expect(src).toMatch(/may move provider money/i);
    expect(src).toMatch(/eligible to execute|recovery required|already succeeded/);
    expect(src).toMatch(/data-testid="partial-refund-provider-money-execute-panel"/);
    expect(src).not.toMatch(/sk_live_|sk_test_/);
  });

  it("runbook documents gates, ACK, recovery vs submit, no production enablement", () => {
    const src = read(RUNBOOK);
    expect(src).toMatch(/EXECUTION_MODE/);
    expect(src).toMatch(/default OFF|defaults? to off|execution mode.*off/i);
    expect(src).toMatch(/operator.*ACK|I_ACKNOWLEDGE_THIS_MAY_MOVE_PROVIDER_MONEY/i);
    expect(src).toMatch(/LOOKUP|recovery/i);
    expect(src).toMatch(/no production enablement|production remains/i);
    expect(src).toMatch(/test/i);
  });
});
