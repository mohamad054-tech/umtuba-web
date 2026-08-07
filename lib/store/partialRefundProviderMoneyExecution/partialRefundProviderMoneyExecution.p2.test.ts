/**
 * P2 tests â€” service-role repo, trusted PI resolution, recovery (lookup-only).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_VALUE,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_NON_PRODUCTION_FIXTURE_TOKEN,
  PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS,
  ServiceRolePartialRefundProviderExecutionRepository,
  buildPartialRefundProviderIdempotencyKey,
  createMemoryPartialRefundProviderExecutionRepository,
  createPartialRefundProviderExecutionRpcPort,
  executePartialRefundProviderMoney,
  isRecoveryEligibleProviderExecution,
  isStaleExecutingProviderExecution,
  parseClaimEnvelope,
  parsePartialRefundProviderExecution,
  recoverPartialRefundProviderMoneyLookup,
  resolveTrustedStripePaymentIntentRef,
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
  execution: "66666666-6666-4666-8666-666666666666",
};

const PI = "pi_3TrustedCaptureIntent0001";

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

function stripeOnlyEnv(): Record<string, string | undefined> {
  return {
    NODE_ENV: "test",
    STRIPE_SECRET_KEY: "sk_test_INVALID_FIXTURE_ONLY_NOT_A_SECRET",
    STRIPE_MODE: "test",
    NEXT_PUBLIC_APP_URL: "https://example.test",
  };
}

function committedLedger(): CommittedLedgerFactsForProviderMoney {
  return {
    ledgerId: IDS.ledger,
    storeId: IDS.store,
    orderId: IDS.order,
    paymentAttemptId: IDS.attempt,
    captureEventId: IDS.capture,
    status: "committed",
    refundAmountMinor: 1500,
    currency: "USD",
  };
}

function executionJson(overrides: Record<string, unknown> = {}) {
  return {
    execution_id: IDS.execution,
    store_id: IDS.store,
    ledger_id: IDS.ledger,
    order_id: IDS.order,
    payment_attempt_id: IDS.attempt,
    capture_event_id: IDS.capture,
    provider_kind: "stripe",
    provider_payment_ref: PI,
    trusted_amount_minor: 1500,
    currency: "USD",
    idempotency_key: buildPartialRefundProviderIdempotencyKey(IDS.ledger),
    status: "planned",
    provider_refund_id: null,
    provider_status_safe: null,
    failure_code: null,
    failure_message_safe: null,
    operator_user_id: null,
    operator_reason_safe: null,
    started_at: null,
    completed_at: null,
    last_lookup_at: null,
    created_at: "2026-08-07T12:00:00.000Z",
    updated_at: "2026-08-07T12:00:00.000Z",
    ...overrides,
  };
}

describe("P2 service-role repository", () => {
  it("claims idempotently and parses happy path", async () => {
    const invoke = vi.fn(async () => ({
      data: {
        ok: true,
        replayed: false,
        execution: executionJson(),
      },
      error: null,
    }));
    const repo = new ServiceRolePartialRefundProviderExecutionRepository(
      createPartialRefundProviderExecutionRpcPort(invoke)
    );
    const first = await repo.claim({
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
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.replayed).toBe(false);
    expect(first.execution.status).toBe("planned");
  });

  it("duplicate claim returns replayed", async () => {
    const invoke = vi.fn(async () => ({
      data: {
        ok: true,
        replayed: true,
        execution: executionJson({ status: "succeeded" }),
      },
      error: null,
    }));
    const repo = new ServiceRolePartialRefundProviderExecutionRepository(
      createPartialRefundProviderExecutionRpcPort(invoke)
    );
    const r = await repo.claim({
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
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.replayed).toBe(true);
  });

  it("fails closed on malformed RPC response", async () => {
    const invoke = vi.fn(async () => ({
      data: { ok: true, execution: { status: "planned" } },
      error: null,
    }));
    const repo = new ServiceRolePartialRefundProviderExecutionRepository(
      createPartialRefundProviderExecutionRpcPort(invoke)
    );
    const r = await repo.claim({
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
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("malformed_rpc_response");
  });

  it("terminal succeeded cannot be downgraded (memory + guard)", async () => {
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
      toStatus: "executing",
    });
    const succeeded = await repo.update({
      executionId: claimed.execution.executionId,
      toStatus: "succeeded",
      providerRefundId: "re_ok",
    });
    expect(succeeded.ok).toBe(true);
    const downgrade = await repo.update({
      executionId: claimed.execution.executionId,
      fromStatus: "succeeded",
      toStatus: "failed",
    });
    expect(downgrade.ok).toBe(false);
    if (!downgrade.ok) expect(downgrade.code).toBe("unsupported_transition");
  });

  it("parseClaimEnvelope rejects garbage", () => {
    expect(parseClaimEnvelope(null).ok).toBe(false);
    expect(parsePartialRefundProviderExecution({})).toBeNull();
  });
});

describe("P2 trusted PaymentIntent resolution", () => {
  function mockClient(tables: Record<string, unknown>) {
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

  it("resolves from capture provider_reference", async () => {
    const client = mockClient({
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
        provider_reference: PI,
        event_key: `stripe:${PI}:captured`,
      },
    });
    const r = await resolveTrustedStripePaymentIntentRef(client, {
      storeId: IDS.store,
      orderId: IDS.order,
      paymentAttemptId: IDS.attempt,
      captureEventId: IDS.capture,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.paymentIntentId).toBe(PI);
    expect(r.source).toBe("capture_provider_reference");
  });

  it("rejects client-supplied pi_", async () => {
    const r = await resolveTrustedStripePaymentIntentRef({} as never, {
      storeId: IDS.store,
      orderId: IDS.order,
      paymentAttemptId: IDS.attempt,
      captureEventId: IDS.capture,
      clientProviderPaymentRef: PI,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("missing_provider_payment_ref");
  });

  it("rejects ownership mismatch", async () => {
    const client = mockClient({
      orders: { id: IDS.order, store_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
    });
    const r = await resolveTrustedStripePaymentIntentRef(client, {
      storeId: IDS.store,
      orderId: IDS.order,
      paymentAttemptId: IDS.attempt,
      captureEventId: IDS.capture,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("unauthorized");
  });

  it("rejects missing provider ref", async () => {
    const client = mockClient({
      orders: { id: IDS.order, store_id: IDS.store },
      payment_attempts: {
        id: IDS.attempt,
        order_id: IDS.order,
        provider: "stripe",
        provider_reference: "cs_test_only",
        status: "captured",
      },
      store_payment_outcome_events: {
        id: IDS.capture,
        payment_attempt_id: IDS.attempt,
        order_id: IDS.order,
        outcome: "captured",
        provider_reference: "cs_test_only",
        event_key: "stripe:session-not-pi:captured",
      },
    });
    const r = await resolveTrustedStripePaymentIntentRef(client, {
      storeId: IDS.store,
      orderId: IDS.order,
      paymentAttemptId: IDS.attempt,
      captureEventId: IDS.capture,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("missing_provider_payment_ref");
  });
});

describe("P2 recovery â€” lookup only", () => {
  it("uncertain â†’ succeeded via lookup with ZERO submit calls", async () => {
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
      toStatus: "executing",
    });
    await repo.update({
      executionId: claimed.execution.executionId,
      toStatus: "uncertain",
      providerRefundId: "re_pending",
      failureCode: "network_error",
      failureMessageSafe: "timeout",
    });

    const submit = vi.fn();
    const lookup = vi.fn(async () => ({
      kind: "succeeded" as const,
      providerRefundId: "re_pending",
      providerStatusSafe: "succeeded",
      amountMinor: 1500,
      currency: "USD",
    }));

    const r = await recoverPartialRefundProviderMoneyLookup(
      { storeId: IDS.store, ledgerId: IDS.ledger },
      {
        repository: repo,
        env: stripeOnlyEnv(),
        resolveProviderPort: () =>
          ({
            providerKind: "stripe",
            submitPartialRefund: submit,
            lookupPartialRefund: lookup,
          }) satisfies PartialRefundProviderPort,
      }
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.phase).toBe("succeeded");
    expect(r.value.providerSubmitCalled).toBe(false);
    expect(r.value.providerLookupCalled).toBe(true);
    expect(r.value.ledgerCompensated).toBe(false);
    expect(submit).not.toHaveBeenCalled();
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it("uncertain â†’ failed via definitive lookup", async () => {
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
    if (!claimed.ok) return;
    await repo.update({
      executionId: claimed.execution.executionId,
      toStatus: "executing",
    });
    await repo.update({
      executionId: claimed.execution.executionId,
      toStatus: "uncertain",
      providerRefundId: "re_missing",
    });
    const submit = vi.fn();
    const r = await recoverPartialRefundProviderMoneyLookup(
      { storeId: IDS.store, ledgerId: IDS.ledger },
      {
        repository: repo,
        env: stripeOnlyEnv(),
        resolveProviderPort: () => ({
          providerKind: "stripe",
          submitPartialRefund: submit,
          lookupPartialRefund: async () => ({
            kind: "failed",
            failureCode: "provider_refund_not_found",
            failureMessageSafe: "not found",
            providerRefundId: "re_missing",
          }),
        }),
      }
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.phase).toBe("failed");
    expect(submit).not.toHaveBeenCalled();
  });

  it("uncertain â†’ remains uncertain when lookup ambiguous", async () => {
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
    if (!claimed.ok) return;
    await repo.update({
      executionId: claimed.execution.executionId,
      toStatus: "executing",
    });
    await repo.update({
      executionId: claimed.execution.executionId,
      toStatus: "uncertain",
    });
    const submit = vi.fn();
    const r = await recoverPartialRefundProviderMoneyLookup(
      { storeId: IDS.store, ledgerId: IDS.ledger },
      {
        repository: repo,
        env: stripeOnlyEnv(),
        resolveProviderPort: () => ({
          providerKind: "stripe",
          submitPartialRefund: submit,
          lookupPartialRefund: async () => ({
            kind: "uncertain",
            failureCode: "lookup_requires_provider_refund_id",
            failureMessageSafe: "still unknown",
          }),
        }),
      }
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.phase).toBe("uncertain");
    expect(r.value.execution.status).toBe("uncertain");
    expect(submit).not.toHaveBeenCalled();
  });

  it("duplicate execute after uncertain does not resubmit", async () => {
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
      {
        ledger: committedLedger(),
        trustedProviderPaymentRef: PI,
      },
      deps
    );
    expect(first.ok).toBe(true);
    const second = await executePartialRefundProviderMoney(
      {
        ledger: committedLedger(),
        trustedProviderPaymentRef: PI,
      },
      deps
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value.phase).toBe("recovery_required");
    expect(second.value.providerSubmitCalled).toBe(false);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("stale executing does not blindly resubmit; fresh waits", async () => {
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
    if (!claimed.ok) return;
    const exec = await repo.update({
      executionId: claimed.execution.executionId,
      toStatus: "executing",
    });
    expect(exec.ok).toBe(true);
    if (!exec.ok) return;

    expect(
      isStaleExecutingProviderExecution(
        exec.execution,
        Date.parse(exec.execution.startedAtIso!) + 1_000
      )
    ).toBe(false);
    expect(
      isStaleExecutingProviderExecution(
        exec.execution,
        Date.parse(exec.execution.startedAtIso!) +
          PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS +
          1
      )
    ).toBe(true);

    const submit = vi.fn();
    const fresh = await recoverPartialRefundProviderMoneyLookup(
      { storeId: IDS.store, ledgerId: IDS.ledger },
      {
        repository: repo,
        env: stripeOnlyEnv(),
        nowMs: Date.parse(exec.execution.startedAtIso!) + 1_000,
        resolveProviderPort: () => ({
          providerKind: "stripe",
          submitPartialRefund: submit,
          lookupPartialRefund: vi.fn(),
        }),
      }
    );
    expect(fresh.ok).toBe(true);
    if (!fresh.ok) return;
    expect(fresh.value.phase).toBe("recovery_required");
    expect(fresh.value.recoveryEligible).toBe(false);
    expect(submit).not.toHaveBeenCalled();

    const lookup = vi.fn(async () => ({
      kind: "succeeded" as const,
      providerRefundId: "re_crash",
      providerStatusSafe: "succeeded",
      amountMinor: 1500,
      currency: "USD",
    }));
    const stale = await recoverPartialRefundProviderMoneyLookup(
      { storeId: IDS.store, ledgerId: IDS.ledger },
      {
        repository: repo,
        env: stripeOnlyEnv(),
        nowMs:
          Date.parse(exec.execution.startedAtIso!) +
          PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS +
          5_000,
        resolveProviderPort: () => ({
          providerKind: "stripe",
          submitPartialRefund: submit,
          lookupPartialRefund: lookup,
        }),
      }
    );
    expect(stale.ok).toBe(true);
    if (!stale.ok) return;
    expect(stale.value.phase).toBe("succeeded");
    expect(submit).not.toHaveBeenCalled();
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(
      isRecoveryEligibleProviderExecution(
        exec.execution,
        Date.parse(exec.execution.startedAtIso!) +
          PARTIAL_REFUND_PROVIDER_STALE_EXECUTING_MS +
          1
      )
    ).toBe(true);
  });

  it("recovery works without dedicated money gate (Stripe config only)", async () => {
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
    if (!claimed.ok) return;
    await repo.update({
      executionId: claimed.execution.executionId,
      toStatus: "executing",
    });
    await repo.update({
      executionId: claimed.execution.executionId,
      toStatus: "uncertain",
      providerRefundId: "re_x",
    });
    const submit = vi.fn();
    const r = await recoverPartialRefundProviderMoneyLookup(
      { storeId: IDS.store, ledgerId: IDS.ledger },
      {
        repository: repo,
        env: stripeOnlyEnv(),
        resolveProviderPort: () => ({
          providerKind: "stripe",
          submitPartialRefund: submit,
          lookupPartialRefund: async () => ({
            kind: "succeeded",
            providerRefundId: "re_x",
            providerStatusSafe: "succeeded",
            amountMinor: 1500,
            currency: "USD",
          }),
        }),
      }
    );
    expect(r.ok).toBe(true);
    expect(submit).not.toHaveBeenCalled();
  });
});

describe("P2 contracts â€” migration/admin/ownership", () => {
  it("20260915 includes list/get-by-id and terminal success immutability", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(
      /service_list_store_partial_refund_provider_executions/
    );
    expect(sql).toMatch(
      /service_get_store_partial_refund_provider_execution\(/
    );
    expect(sql).toMatch(/Terminal success is immutable/);
    expect(sql).toMatch(
      /revoke all on function public\.service_list_store_partial_refund_provider_executions[\s\S]*from public, anon, authenticated/i
    );
  });

  it("recovery + admin sources never submit / compensate / Sync", () => {
    const combined = [
      "lib/store/partialRefundProviderMoneyExecution/recoveryService.ts",
      "app/actions/storePartialRefundProviderMoneyExecution.ts",
      "app/admin/store/refunds/PartialRefundProviderMoneyRecoveryPanel.tsx",
    ]
      .map((f) => {
        try {
          return read(f);
        } catch {
          return "";
        }
      })
      .join("\n");
    expect(combined).toMatch(/LOOKUP ONLY|lookupPartialRefund|hard-disabled/i);
    expect(combined).not.toMatch(/submitPartialRefund\s*\(/);
    expect(combined).not.toMatch(/compensatePartialRefundLedgerCommit/);
    expect(combined).not.toMatch(/apply_store_payment_outcome/);
    expect(combined).not.toMatch(/restockPurchaseStockAfterTrustedRefund/);
  });
});
