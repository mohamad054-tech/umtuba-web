/**
 * Partial Refund Provider Money Execution V1 â€” P1 foundation tests.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_VALUE,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_NON_PRODUCTION_FIXTURE_TOKEN,
  assertAdminProviderMoneyExecuteAllowed,
  assertPartialRefundProviderMoneyExecutionGates,
  buildPartialRefundProviderIdempotencyKey,
  buildPartialRefundProviderMoneyReadinessReport,
  createMemoryPartialRefundProviderExecutionRepository,
  createStripePartialRefundProviderPort,
  evaluatePartialRefundProviderMoneyGate,
  executePartialRefundProviderMoney,
  partialRefundProviderMoneyOwnership,
  rejectClientProviderMoneyFields,
  type CommittedLedgerFactsForProviderMoney,
  type PartialRefundProviderPort,
} from "./index";

const ROOT = join(__dirname, "../../..");
const MIGRATION =
  "supabase/migrations/20260915_store_partial_refund_provider_money_execution_v1.sql";

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const IDS = {
  store: "11111111-1111-4111-8111-111111111111",
  order: "22222222-2222-4222-8222-222222222222",
  attempt: "33333333-3333-4333-8333-333333333333",
  capture: "44444444-4444-4444-8444-444444444444",
  ledger: "55555555-5555-4555-8555-555555555555",
};

const PI = "pi_3TestPaymentIntent0001";

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
    UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE: "test",
    STRIPE_SECRET_KEY: "sk_test_INVALID_FIXTURE_ONLY_NOT_A_SECRET",
    STRIPE_MODE: "test",
    NEXT_PUBLIC_APP_URL: "https://example.test",
    ...extra,
  };
}

describe("partial refund provider money â€” gate", () => {
  it("defaults OFF on empty env", () => {
    const r = evaluatePartialRefundProviderMoneyGate({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("live_flag_disabled");
  });

  it("requires both dedicated gate and Stripe config", () => {
    const dedicatedOnly = assertPartialRefundProviderMoneyExecutionGates({
      NODE_ENV: "test",
      [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV]: "true",
      [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV]:
        PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_VALUE,
      UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_ALLOW_IN_NON_PRODUCTION:
        PARTIAL_REFUND_PROVIDER_MONEY_NON_PRODUCTION_FIXTURE_TOKEN,
    });
    expect(dedicatedOnly.ok).toBe(false);
    if (!dedicatedOnly.ok) {
      expect(dedicatedOnly.code).toBe("stripe_config_unavailable");
    }

    const both = assertPartialRefundProviderMoneyExecutionGates(gateOnEnv());
    expect(both.ok).toBe(true);
  });

  it("readiness report keeps live clickable flow false by default", () => {
    const report = buildPartialRefundProviderMoneyReadinessReport({});
    expect(report.liveMoneyClickableFlowEnabled).toBe(false);
    expect(report.bothGatesSatisfied).toBe(false);
    expect(report.providerInvocationAllowed).toBe(false);
    expect(report.executionMode).toBe("off");
  });

  it("admin execute blocked when execution mode off even if dedicated+stripe on", () => {
    const r = assertAdminProviderMoneyExecuteAllowed(
      gateOnEnv({
        UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE: "off",
      })
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("execution_mode_off");
  });

  it("admin execute allowed when dedicated+stripe+execution mode=test", () => {
    const r = assertAdminProviderMoneyExecuteAllowed(gateOnEnv());
    expect(r.ok).toBe(true);
  });
});

describe("partial refund provider money â€” idempotency + money invariants", () => {
  it("builds prf-prov:{ledgerId}", () => {
    expect(buildPartialRefundProviderIdempotencyKey(IDS.ledger)).toBe(
      `prf-prov:${IDS.ledger}`
    );
  });

  it("rejects client money fields", () => {
    expect(
      rejectClientProviderMoneyFields({ amountMinor: 100 }).ok
    ).toBe(false);
  });

  it("rejects zero/non-integer amounts at orchestration", async () => {
    const repo = createMemoryPartialRefundProviderExecutionRepository();
    const port: PartialRefundProviderPort = {
      providerKind: "stripe",
      submitPartialRefund: vi.fn(),
      lookupPartialRefund: vi.fn(),
    };
    const r = await executePartialRefundProviderMoney(
      {
        ledger: committedLedger({ refundAmountMinor: 0 }),
        trustedProviderPaymentRef: PI,
      },
      {
        repository: repo,
        env: gateOnEnv(),
        resolveProviderPort: () => port,
      }
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("zero_amount");
    expect(port.submitPartialRefund).not.toHaveBeenCalled();
  });

  it("rejects missing/stale provider payment ref", async () => {
    const repo = createMemoryPartialRefundProviderExecutionRepository();
    const port: PartialRefundProviderPort = {
      providerKind: "stripe",
      submitPartialRefund: vi.fn(),
      lookupPartialRefund: vi.fn(),
    };
    const r = await executePartialRefundProviderMoney(
      {
        ledger: committedLedger(),
        trustedProviderPaymentRef: "cs_test_session_not_pi",
      },
      {
        repository: repo,
        env: gateOnEnv(),
        resolveProviderPort: () => port,
      }
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("missing_provider_payment_ref");
    expect(port.submitPartialRefund).not.toHaveBeenCalled();
  });

  it("rejects ownership mismatch", async () => {
    const repo = createMemoryPartialRefundProviderExecutionRepository();
    const r = await executePartialRefundProviderMoney(
      {
        ledger: committedLedger(),
        trustedProviderPaymentRef: PI,
        expectedStoreId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      },
      { repository: repo, env: gateOnEnv(), resolveProviderPort: () => null }
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("missing_ownership");
  });
});

describe("partial refund provider money â€” Stripe adapter", () => {
  it("sends Idempotency-Key = prf-prov:{ledgerId} and maps success", async () => {
    const createRefund = vi.fn(async () => ({
      ok: true as const,
      data: {
        id: "re_1Success",
        amount: 1500,
        currency: "usd",
        payment_intent: PI,
        status: "succeeded",
      },
    }));
    const port = createStripePartialRefundProviderPort({
      env: gateOnEnv(),
      createRefund: createRefund as never,
      retrieveRefund: vi.fn() as never,
    });
    const key = buildPartialRefundProviderIdempotencyKey(IDS.ledger);
    const out = await port.submitPartialRefund({
      providerPaymentRef: PI,
      amountMinor: 1500,
      currency: "USD",
      idempotencyKey: key,
    });
    expect(out.kind).toBe("succeeded");
    expect(createRefund).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        paymentIntentId: PI,
        amountMinor: 1500,
        currency: "USD",
        idempotencyKey: key,
      })
    );
  });

  it("maps definitive provider reject to failed", async () => {
    const port = createStripePartialRefundProviderPort({
      env: gateOnEnv(),
      createRefund: vi.fn(async () => ({
        ok: false as const,
        message: "Charge already refunded",
        status: 400,
      })) as never,
      retrieveRefund: vi.fn() as never,
    });
    const out = await port.submitPartialRefund({
      providerPaymentRef: PI,
      amountMinor: 1500,
      currency: "USD",
      idempotencyKey: buildPartialRefundProviderIdempotencyKey(IDS.ledger),
    });
    expect(out.kind).toBe("failed");
  });

  it("maps network/timeout (no status) to uncertain", async () => {
    const port = createStripePartialRefundProviderPort({
      env: gateOnEnv(),
      createRefund: vi.fn(async () => ({
        ok: false as const,
        message: "Unable to reach Stripe.",
      })) as never,
      retrieveRefund: vi.fn() as never,
    });
    const out = await port.submitPartialRefund({
      providerPaymentRef: PI,
      amountMinor: 1500,
      currency: "USD",
      idempotencyKey: buildPartialRefundProviderIdempotencyKey(IDS.ledger),
    });
    expect(out.kind).toBe("uncertain");
  });

  it("maps malformed success payload to uncertain", async () => {
    const port = createStripePartialRefundProviderPort({
      env: gateOnEnv(),
      createRefund: vi.fn(async () => ({
        ok: true as const,
        data: {
          id: "",
          amount: 1500,
          currency: "usd",
          payment_intent: PI,
          status: "succeeded",
        },
      })) as never,
      retrieveRefund: vi.fn() as never,
    });
    const out = await port.submitPartialRefund({
      providerPaymentRef: PI,
      amountMinor: 1500,
      currency: "USD",
      idempotencyKey: buildPartialRefundProviderIdempotencyKey(IDS.ledger),
    });
    expect(out.kind).toBe("uncertain");
  });

  it("does not call Stripe when config unavailable", async () => {
    const createRefund = vi.fn();
    const port = createStripePartialRefundProviderPort({
      env: { NODE_ENV: "test" },
      createRefund: createRefund as never,
      retrieveRefund: vi.fn() as never,
    });
    const out = await port.submitPartialRefund({
      providerPaymentRef: PI,
      amountMinor: 1500,
      currency: "USD",
      idempotencyKey: buildPartialRefundProviderIdempotencyKey(IDS.ledger),
    });
    expect(out.kind).toBe("failed");
    if (out.kind === "failed") {
      expect(out.failureCode).toBe("stripe_config_unavailable");
    }
    expect(createRefund).not.toHaveBeenCalled();
  });
});

describe("partial refund provider money â€” orchestration", () => {
  it("no provider call when dedicated gate OFF", async () => {
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
    if (!r.ok) expect(r.code).toBe("gate_disabled");
    expect(submit).not.toHaveBeenCalled();
  });

  it("succeeds once and replays without second provider call", async () => {
    const repo = createMemoryPartialRefundProviderExecutionRepository();
    const submit = vi.fn(async () => ({
      kind: "succeeded" as const,
      providerRefundId: "re_ok1",
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

    const first = await executePartialRefundProviderMoney(
      { ledger: committedLedger(), trustedProviderPaymentRef: PI },
      deps
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.value.phase).toBe("succeeded");
    expect(first.value.providerCalled).toBe(true);
    expect(first.value.execution.status).toBe("succeeded");
    expect(first.value.idempotencyKey).toBe(
      buildPartialRefundProviderIdempotencyKey(IDS.ledger)
    );
    expect(first.value.ledgerCompensated).toBe(false);
    expect(first.value.syncPartialRefundApplied).toBe(false);

    const second = await executePartialRefundProviderMoney(
      { ledger: committedLedger(), trustedProviderPaymentRef: PI },
      deps
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value.phase).toBe("replayed_succeeded");
    expect(second.value.providerCalled).toBe(false);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("does not blind-resubmit when uncertain", async () => {
    const repo = createMemoryPartialRefundProviderExecutionRepository();
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

    const first = await executePartialRefundProviderMoney(
      { ledger: committedLedger(), trustedProviderPaymentRef: PI },
      deps
    );
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.value.phase).toBe("uncertain");

    const second = await executePartialRefundProviderMoney(
      { ledger: committedLedger(), trustedProviderPaymentRef: PI },
      deps
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value.phase).toBe("recovery_required");
    expect(second.value.providerCalled).toBe(false);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("persists failed on confirmed provider rejection", async () => {
    const repo = createMemoryPartialRefundProviderExecutionRepository();
    const r = await executePartialRefundProviderMoney(
      { ledger: committedLedger(), trustedProviderPaymentRef: PI },
      {
        repository: repo,
        env: gateOnEnv(),
        resolveProviderPort: () => ({
          providerKind: "stripe",
          submitPartialRefund: async () => ({
            kind: "failed",
            failureCode: "provider_rejected",
            failureMessageSafe: "insufficient funds on charge",
          }),
          lookupPartialRefund: vi.fn(),
        }),
      }
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.phase).toBe("failed");
    expect(r.value.execution.status).toBe("failed");
  });

  it("marks uncertain when provider amount mismatches ledger", async () => {
    const repo = createMemoryPartialRefundProviderExecutionRepository();
    const r = await executePartialRefundProviderMoney(
      { ledger: committedLedger(), trustedProviderPaymentRef: PI },
      {
        repository: repo,
        env: gateOnEnv(),
        resolveProviderPort: () => ({
          providerKind: "stripe",
          submitPartialRefund: async () => ({
            kind: "succeeded",
            providerRefundId: "re_mismatch",
            providerStatusSafe: "succeeded",
            amountMinor: 9999,
            currency: "USD",
          }),
          lookupPartialRefund: vi.fn(),
        }),
      }
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.phase).toBe("uncertain");
    expect(r.value.execution.failureCode).toBe(
      "provider_amount_currency_mismatch"
    );
  });
});

describe("partial refund provider money â€” migration + ownership contracts", () => {
  it("ships 20260915 with service_role-only grants and status model", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/store_partial_refund_provider_executions/);
    expect(sql).toMatch(/'planned',\s*'executing',\s*'succeeded',\s*'failed',\s*'uncertain'/);
    expect(sql).toMatch(/store_pr_prov_exec_store_idempotency_uidx/);
    expect(sql).toMatch(/grant execute[\s\S]*to service_role/i);
    expect(sql).toMatch(
      /revoke all on function public\.service_claim_store_partial_refund_provider_execution[\s\S]*from public, anon, authenticated/i
    );
    expect(sql).not.toMatch(/apply_store_payment_outcome/);
    expect(sql).not.toMatch(/commerce_confirm_enabled|set_.*commerce_confirm/i);
  });

  it("ownership excludes restock/entitlement/settlement/commission/payout/Sync", () => {
    const o = partialRefundProviderMoneyOwnership();
    expect(o.ownsPartialRefundProviderRefundExecution).toBe(true);
    expect(o.ownsPartialRefundRestock).toBe(false);
    expect(o.ownsPartialEntitlementAdjustment).toBe(false);
    expect(o.ownsPartialSettlementUnwind).toBe(false);
    expect(o.ownsPartialCommissionUnwind).toBe(false);
    expect(o.ownsPayoutInteraction).toBe(false);
    expect(o.ownsSyncPartialRefundOutcome).toBe(false);
    expect(o.ownsCommerceConfirmActivation).toBe(false);
    expect(o.ownsAutomaticCompensationOnUncertain).toBe(false);
    expect(o.ownsLedgerCommittedMeaning).toBe(false);
  });

  it("module sources do not import forbidden side-effect runtimes", () => {
    const files = [
      "lib/store/partialRefundProviderMoneyExecution/orchestrator.ts",
      "lib/store/partialRefundProviderMoneyExecution/stripeAdapter.ts",
      "lib/store/partialRefundProviderMoneyExecution/readiness.ts",
      "app/actions/storePartialRefundProviderMoneyExecution.ts",
    ];
    const combined = files.map(read).join("\n");
    expect(combined).not.toMatch(/applyFullOrderRefund/);
    expect(combined).not.toMatch(/apply_store_payment_outcome/);
    expect(combined).not.toMatch(/restockPurchaseStockAfterTrustedRefund/);
    expect(combined).not.toMatch(/revokeDigitalEntitlementsAfterTrustedRefund/);
    expect(combined).not.toMatch(/compensatePartialRefundLedgerCommit/);
    expect(combined).not.toMatch(
      /commerce_confirm_enabled|activateCommerceConfirm|setCommerceConfirm/i
    );
  });

  it("admin UI scaffolding has no live execute control", () => {
    const panel = read(
      "app/admin/store/refunds/PartialRefundProviderMoneyReadinessPanel.tsx"
    );
    expect(panel).toMatch(/hard-disabled|Live clickable flow/i);
    expect(panel).not.toMatch(/adminExecutePartialRefundProviderMoneyAction/);
    expect(panel).not.toMatch(/type=\"submit\"/);
  });

  it("stripeApi exposes createStripeRefund with idempotency support", () => {
    const src = read("lib/store/stripeApi.ts");
    expect(src).toMatch(/export async function createStripeRefund/);
    expect(src).toMatch(/idempotencyKey/);
    expect(src).toMatch(/\/refunds/);
  });
});
