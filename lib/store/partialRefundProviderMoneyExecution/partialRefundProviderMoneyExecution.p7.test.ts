/**
 * P7 hardening — local contract proofs for closeout readiness.
 * No Stripe network. No gate enablement of real env.
 */

import { describe, expect, it, vi } from "vitest";
import {
  buildPartialRefundProviderIdempotencyKey,
  canTransitionPartialRefundProviderExecution,
  createMemoryPartialRefundProviderExecutionRepository,
  executePartialRefundProviderMoney,
  PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_VALUE,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_NON_PRODUCTION_FIXTURE_TOKEN,
  recoverPartialRefundProviderMoneyLookup,
  assertPositiveMinorAmount,
  normalizeCurrency,
  type PartialRefundProviderPort,
} from "./index";
import type { CommittedLedgerFactsForProviderMoney } from "./orchestrator";

const IDS = {
  store: "11111111-1111-4111-8111-111111111111",
  order: "22222222-2222-4222-8222-222222222222",
  attempt: "33333333-3333-4333-8333-333333333333",
  capture: "44444444-4444-4444-8444-444444444444",
  ledger: "55555555-5555-4555-8555-555555555555",
};

const PI = "pi_3P7TrustedPaymentIntent0001";

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

function committedLedger(
  overrides: Partial<CommittedLedgerFactsForProviderMoney> = {}
): CommittedLedgerFactsForProviderMoney {
  return {
    ledgerId: IDS.ledger,
    storeId: IDS.store,
    orderId: IDS.order,
    paymentAttemptId: IDS.attempt,
    captureEventId: IDS.capture,
    status: "committed",
    refundAmountMinor: 1500,
    currency: "USD",
    ...overrides,
  };
}

describe("P7 state machine hardening", () => {
  it("terminal succeeded cannot downgrade to failed/uncertain/executing", () => {
    expect(canTransitionPartialRefundProviderExecution("succeeded", "failed")).toBe(
      false
    );
    expect(
      canTransitionPartialRefundProviderExecution("succeeded", "uncertain")
    ).toBe(false);
    expect(
      canTransitionPartialRefundProviderExecution("succeeded", "executing")
    ).toBe(false);
    expect(
      canTransitionPartialRefundProviderExecution("succeeded", "succeeded")
    ).toBe(true);
  });

  it("uncertain remains distinct from failed and only recovers via allowed transitions", () => {
    expect(canTransitionPartialRefundProviderExecution("uncertain", "failed")).toBe(
      true
    );
    expect(
      canTransitionPartialRefundProviderExecution("uncertain", "succeeded")
    ).toBe(true);
    expect(
      canTransitionPartialRefundProviderExecution("uncertain", "executing")
    ).toBe(false);
    expect(canTransitionPartialRefundProviderExecution("failed", "succeeded")).toBe(
      false
    );
  });
});

describe("P7 money correctness", () => {
  it("rejects non-integer and non-positive minor amounts", () => {
    expect(assertPositiveMinorAmount(0).ok).toBe(false);
    expect(assertPositiveMinorAmount(-1).ok).toBe(false);
    expect(assertPositiveMinorAmount(1.5).ok).toBe(false);
    expect(assertPositiveMinorAmount(1).ok).toBe(true);
  });

  it("normalizes currency to exact 3-letter uppercase only", () => {
    expect(normalizeCurrency("usd")).toBe("USD");
    expect(normalizeCurrency("USD")).toBe("USD");
    expect(normalizeCurrency("US")).toBeNull();
    expect(normalizeCurrency("USDD")).toBeNull();
  });

  it("rejects float/zero ledger amount before submit", async () => {
    const repo = createMemoryPartialRefundProviderExecutionRepository();
    const submit = vi.fn();
    const r = await executePartialRefundProviderMoney(
      {
        ledger: committedLedger({ refundAmountMinor: 12.34 as unknown as number }),
        trustedProviderPaymentRef: PI,
      },
      {
        repository: repo,
        env: gateOnEnv(),
        resolveProviderPort: () => ({
          providerKind: "stripe",
          submitPartialRefund: submit,
          lookupPartialRefund: vi.fn(),
        }),
      }
    );
    expect(r.ok).toBe(false);
    expect(submit).not.toHaveBeenCalled();
  });
});

describe("P7 persistence failure after provider response — no blind resubmit", () => {
  it("provider success + failed succeed-persist leaves executing; second execute does not submit", async () => {
    const base = createMemoryPartialRefundProviderExecutionRepository();
    let failSucceedPersist = false;
    const repo = {
      ...base,
      async update(input: Parameters<typeof base.update>[0]) {
        if (failSucceedPersist && input.toStatus === "succeeded") {
          return {
            ok: false as const,
            code: "persistence_error",
            message: "forced succeed persist failure",
          };
        }
        return base.update(input);
      },
    };

    const submit = vi.fn(async () => ({
      kind: "succeeded" as const,
      providerRefundId: "re_p7_ok",
      providerStatusSafe: "succeeded",
      amountMinor: 1500,
      currency: "USD",
    }));
    const deps = {
      repository: repo,
      env: gateOnEnv(),
      resolveProviderPort: () =>
        ({
          providerKind: "stripe" as const,
          submitPartialRefund: submit,
          lookupPartialRefund: vi.fn(),
        }) satisfies PartialRefundProviderPort,
    };

    failSucceedPersist = true;
    const first = await executePartialRefundProviderMoney(
      { ledger: committedLedger(), trustedProviderPaymentRef: PI },
      deps
    );
    expect(first.ok).toBe(false);
    expect(submit).toHaveBeenCalledTimes(1);

    const stuck = await base.getByLedger(IDS.ledger);
    expect(stuck?.status).toBe("executing");

    failSucceedPersist = false;
    const second = await executePartialRefundProviderMoney(
      { ledger: committedLedger(), trustedProviderPaymentRef: PI },
      deps
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value.phase).toBe("recovery_required");
    expect(second.value.providerSubmitCalled).toBe(false);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("provider uncertain + failed uncertain-persist leaves executing; no second submit", async () => {
    const base = createMemoryPartialRefundProviderExecutionRepository();
    let failUncertainPersist = false;
    const repo = {
      ...base,
      async update(input: Parameters<typeof base.update>[0]) {
        if (failUncertainPersist && input.toStatus === "uncertain") {
          return {
            ok: false as const,
            code: "persistence_error",
            message: "forced uncertain persist failure",
          };
        }
        return base.update(input);
      },
    };
    const submit = vi.fn(async () => ({
      kind: "uncertain" as const,
      failureCode: "network_error",
      failureMessageSafe: "timeout",
    }));
    const deps = {
      repository: repo,
      env: gateOnEnv(),
      resolveProviderPort: () =>
        ({
          providerKind: "stripe" as const,
          submitPartialRefund: submit,
          lookupPartialRefund: vi.fn(),
        }) satisfies PartialRefundProviderPort,
    };

    failUncertainPersist = true;
    const first = await executePartialRefundProviderMoney(
      { ledger: committedLedger(), trustedProviderPaymentRef: PI },
      deps
    );
    expect(first.ok).toBe(false);
    expect(submit).toHaveBeenCalledTimes(1);

    failUncertainPersist = false;
    const second = await executePartialRefundProviderMoney(
      { ledger: committedLedger(), trustedProviderPaymentRef: PI },
      deps
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value.phase).toBe("recovery_required");
    expect(second.value.providerSubmitCalled).toBe(false);
    expect(submit).toHaveBeenCalledTimes(1);
  });
});

describe("P7 idempotency + recovery boundary", () => {
  it("keeps prf-prov:{ledgerId} stable across submit and lookup recovery", async () => {
    const repo = createMemoryPartialRefundProviderExecutionRepository();
    const key = buildPartialRefundProviderIdempotencyKey(IDS.ledger);
    const submit = vi.fn(async () => ({
      kind: "uncertain" as const,
      failureCode: "network_error",
      failureMessageSafe: "timeout",
    }));
    const lookup = vi.fn(async () => ({
      kind: "succeeded" as const,
      providerRefundId: "re_p7_lookup",
      providerStatusSafe: "succeeded",
      amountMinor: 1500,
      currency: "USD",
    }));
    const port = {
      providerKind: "stripe" as const,
      submitPartialRefund: submit,
      lookupPartialRefund: lookup,
    } satisfies PartialRefundProviderPort;

    const first = await executePartialRefundProviderMoney(
      { ledger: committedLedger(), trustedProviderPaymentRef: PI },
      { repository: repo, env: gateOnEnv(), resolveProviderPort: () => port }
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.value.idempotencyKey).toBe(key);
    expect(first.value.execution.idempotencyKey).toBe(key);

    const recovered = await recoverPartialRefundProviderMoneyLookup(
      { storeId: IDS.store, ledgerId: IDS.ledger },
      {
        repository: repo,
        env: {
          NODE_ENV: "test",
          STRIPE_SECRET_KEY: "sk_test_INVALID_FIXTURE_ONLY_NOT_A_SECRET",
          STRIPE_MODE: "test",
          NEXT_PUBLIC_APP_URL: "https://example.test",
        },
        resolveProviderPort: () => port,
      }
    );
    expect(recovered.ok).toBe(true);
    if (!recovered.ok) return;
    expect(recovered.value.phase).toBe("succeeded");
    expect(recovered.value.providerSubmitCalled).toBe(false);
    expect(recovered.value.idempotencyKey).toBe(key);
    expect(recovered.value.execution.idempotencyKey).toBe(key);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledTimes(1);
  });
});

describe("P7 default-off closeout posture", () => {
  it("empty env keeps gate and mode fail-closed (no submit)", async () => {
    const repo = createMemoryPartialRefundProviderExecutionRepository();
    const submit = vi.fn();
    const r = await executePartialRefundProviderMoney(
      { ledger: committedLedger(), trustedProviderPaymentRef: PI },
      {
        repository: repo,
        env: {},
        resolveProviderPort: () => ({
          providerKind: "stripe",
          submitPartialRefund: submit,
          lookupPartialRefund: vi.fn(),
        }),
      }
    );
    expect(r.ok).toBe(false);
    expect(submit).not.toHaveBeenCalled();
  });
});
