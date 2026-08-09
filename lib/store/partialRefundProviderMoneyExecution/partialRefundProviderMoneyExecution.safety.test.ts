/**
 * Provider Money Execution — reconciliation / admin / E2E safety pack (non-live).
 * DESKTOP-A3 WAVE2. No Stripe network. No gate flips on process.env. No DB mutation.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  PARTIAL_REFUND_PROVIDER_EXECUTION_STATUSES,
  PARTIAL_REFUND_PROVIDER_EXECUTION_TRANSITIONS,
  PARTIAL_REFUND_PROVIDER_MONEY_FAILED_RETRY_POLICY_V1,
  assertPartialRefundProviderIdempotencyKey,
  buildPartialRefundProviderIdempotencyKey,
  buildProviderMoneyExecuteCandidate,
  canTransitionPartialRefundProviderExecution,
  createMemoryPartialRefundProviderExecutionRepository,
  deriveProviderMoneyLatestOperation,
  evaluateFirstTimeProviderMoneyExecuteEligibility,
  executePartialRefundProviderMoney,
  failedProviderExecutionRetryBlockedMessage,
  isFailedProviderExecutionRetryAllowedInV1,
  isTerminalProviderExecutionStatus,
  partialRefundProviderMoneyOwnership,
  toProviderMoneyAuditView,
  type PartialRefundProviderExecutionRecord,
  type PartialRefundProviderExecutionStatus,
  type PartialRefundProviderPort,
  PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_VALUE,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_NON_PRODUCTION_FIXTURE_TOKEN,
} from "./index";
import type { CommittedLedgerFactsForProviderMoney } from "./orchestrator";

const ROOT = process.cwd();
const ACTION =
  "app/actions/storePartialRefundProviderMoneyExecution.ts";
const EXECUTE_PANEL =
  "app/admin/store/refunds/PartialRefundProviderMoneyExecutePanel.tsx";
const RECOVERY_PANEL =
  "app/admin/store/refunds/PartialRefundProviderMoneyRecoveryPanel.tsx";
const SAFETY_PLAN =
  "docs/store/implementation/PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_V1_RECONCILIATION_ADMIN_E2E_SAFETY_PLAN.md";

const IDS = {
  store: "11111111-1111-4111-8111-111111111111",
  order: "22222222-2222-4222-8222-222222222222",
  attempt: "33333333-3333-4333-8333-333333333333",
  capture: "44444444-4444-4444-8444-444444444444",
  ledger: "55555555-5555-4555-8555-555555555555",
  execution: "66666666-6666-4666-8666-666666666666",
};

const PI = "pi_3SafetyTrustedPaymentIntent0001";

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
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
    refundAmountMinor: 2500,
    currency: "USD",
    ...overrides,
  };
}

function baseExecution(
  overrides: Partial<PartialRefundProviderExecutionRecord> = {}
): PartialRefundProviderExecutionRecord {
  const now = "2026-08-09T12:00:00.000Z";
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
    idempotencyKey: buildPartialRefundProviderIdempotencyKey(IDS.ledger),
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
    createdAtIso: now,
    updatedAtIso: now,
    ...overrides,
  };
}

function walkTsxFiles(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    const full = path.join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walkTsxFiles(full, acc);
    } else if (/\.(tsx|ts)$/.test(name)) {
      acc.push(full);
    }
  }
  return acc;
}

describe("safety — exhaustive state transition matrix", () => {
  const allowed = PARTIAL_REFUND_PROVIDER_EXECUTION_TRANSITIONS;

  it("enumerates every status and only documents legal edges", () => {
    expect([...PARTIAL_REFUND_PROVIDER_EXECUTION_STATUSES].sort()).toEqual(
      ["executing", "failed", "planned", "succeeded", "uncertain"].sort()
    );
    for (const from of PARTIAL_REFUND_PROVIDER_EXECUTION_STATUSES) {
      expect(allowed[from]).toBeDefined();
      for (const to of PARTIAL_REFUND_PROVIDER_EXECUTION_STATUSES) {
        const ok = canTransitionPartialRefundProviderExecution(from, to);
        const listed = from === to || allowed[from].includes(to);
        expect(ok).toBe(listed);
      }
    }
  });

  it("terminal succeeded/failed cannot leave terminal family unsafely", () => {
    expect(isTerminalProviderExecutionStatus("succeeded")).toBe(true);
    expect(isTerminalProviderExecutionStatus("failed")).toBe(true);
    expect(canTransitionPartialRefundProviderExecution("succeeded", "failed")).toBe(
      false
    );
    expect(
      canTransitionPartialRefundProviderExecution("succeeded", "uncertain")
    ).toBe(false);
    expect(
      canTransitionPartialRefundProviderExecution("failed", "succeeded")
    ).toBe(false);
    expect(
      canTransitionPartialRefundProviderExecution("failed", "executing")
    ).toBe(false);
  });

  it("uncertain recovers only to succeeded|failed|uncertain (never planned/executing)", () => {
    expect(canTransitionPartialRefundProviderExecution("uncertain", "planned")).toBe(
      false
    );
    expect(
      canTransitionPartialRefundProviderExecution("uncertain", "executing")
    ).toBe(false);
    expect(
      canTransitionPartialRefundProviderExecution("uncertain", "succeeded")
    ).toBe(true);
    expect(canTransitionPartialRefundProviderExecution("uncertain", "failed")).toBe(
      true
    );
  });
});

describe("safety — reservation → provider execution relationship", () => {
  it("ownership keeps reservation meaning outside provider-money module", () => {
    const o = partialRefundProviderMoneyOwnership();
    expect(o.ownsPartialRefundProviderRefundExecution).toBe(true);
    expect(o.ownsLedgerCommittedMeaning).toBe(false);
    expect(o.ownsAutomaticCompensationOnUncertain).toBe(false);
    expect(o.ownsPartialRefundRestock).toBe(false);
    expect(o.ownsSyncPartialRefundOutcome).toBe(false);
  });

  it("non-committed ledger is never eligible to execute", () => {
    for (const status of ["reserved", "committing", "failed", "cancelled"]) {
      const e = evaluateFirstTimeProviderMoneyExecuteEligibility({
        ledgerStatus: status,
        refundAmountMinor: 100,
        currency: "USD",
        storeId: IDS.store,
        existingExecution: null,
        trustedPaymentIntentId: PI,
        firstTimeSubmitAllowed: true,
      });
      expect(e.eligibleToExecute).toBe(false);
      expect(e.code).toBe("ledger_not_committed");
    }
  });

  it("candidate builder couples committed ledger + trusted PI + gates", () => {
    const eligible = buildProviderMoneyExecuteCandidate({
      ledger: {
        ledgerId: IDS.ledger,
        storeId: IDS.store,
        orderId: IDS.order,
        paymentAttemptId: IDS.attempt,
        refundAmountMinor: 2500,
        currency: "USD",
        status: "committed",
      },
      existingExecution: null,
      trustedPaymentIntentId: PI,
      env: gateOnEnv(),
    });
    expect(eligible.eligibleToExecute).toBe(true);
    expect(eligible.eligibilityCode).toBe("eligible");
    expect(eligible.trustedPaymentIntentPresent).toBe(true);

    const blocked = buildProviderMoneyExecuteCandidate({
      ledger: {
        ledgerId: IDS.ledger,
        storeId: IDS.store,
        orderId: IDS.order,
        paymentAttemptId: IDS.attempt,
        refundAmountMinor: 2500,
        currency: "USD",
        status: "committed",
      },
      existingExecution: null,
      trustedPaymentIntentId: PI,
      env: {},
    });
    expect(blocked.eligibleToExecute).toBe(false);
    expect(["gate_disabled", "execution_mode_off"]).toContain(
      blocked.eligibilityCode
    );
  });

  it("store mismatch blocks eligibility (unauthorized ownership)", () => {
    const e = evaluateFirstTimeProviderMoneyExecuteEligibility({
      ledgerStatus: "committed",
      refundAmountMinor: 100,
      currency: "USD",
      storeId: IDS.store,
      expectedStoreId: "99999999-9999-4999-8999-999999999999",
      existingExecution: null,
      trustedPaymentIntentId: PI,
      firstTimeSubmitAllowed: true,
    });
    expect(e.eligibleToExecute).toBe(false);
    expect(e.code).toBe("missing_ownership");
  });
});

describe("safety — idempotency + duplicate execution prevention", () => {
  it("idempotency key is stable prf-prov:{ledgerId} and rejects drift", () => {
    const key = buildPartialRefundProviderIdempotencyKey(IDS.ledger);
    expect(key).toBe(`prf-prov:${IDS.ledger}`);
    expect(assertPartialRefundProviderIdempotencyKey(IDS.ledger, key).ok).toBe(
      true
    );
    expect(
      assertPartialRefundProviderIdempotencyKey(IDS.ledger, "prf-prov:other").ok
    ).toBe(false);
  });

  it("succeeded replay does not call provider submit again", async () => {
    const repo = createMemoryPartialRefundProviderExecutionRepository();
    const submit = vi.fn(async () => ({
      kind: "succeeded" as const,
      providerRefundId: "re_safety_1",
      providerStatusSafe: "succeeded",
      amountMinor: 2500,
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
      {
        ledger: committedLedger(),
        trustedProviderPaymentRef: PI,
        operatorUserId: "op-1",
        operatorReasonSafe: "safety pack idempotency",
      },
      deps
    );
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.value.phase).toBe("succeeded");
    const second = await executePartialRefundProviderMoney(
      {
        ledger: committedLedger(),
        trustedProviderPaymentRef: PI,
        operatorUserId: "op-1",
        operatorReasonSafe: "safety pack idempotency replay",
      },
      deps
    );
    expect(second.ok).toBe(true);
    if (second.ok) {
      expect(second.value.phase).toBe("replayed_succeeded");
      expect(second.value.providerSubmitCalled).toBe(false);
    }
    expect(submit).toHaveBeenCalledTimes(1);
  });
});

describe("safety — committed / failed / retry + failure visibility", () => {
  it("V1 failed retry policy is no_retry and surfaces a clear message", () => {
    expect(PARTIAL_REFUND_PROVIDER_MONEY_FAILED_RETRY_POLICY_V1).toBe("no_retry");
    expect(isFailedProviderExecutionRetryAllowedInV1()).toBe(false);
    expect(failedProviderExecutionRetryBlockedMessage()).toMatch(/does not allow retry/i);
  });

  it("prior failed execution is not eligible and marks no recovery submit path", () => {
    const e = evaluateFirstTimeProviderMoneyExecuteEligibility({
      ledgerStatus: "committed",
      refundAmountMinor: 100,
      currency: "USD",
      storeId: IDS.store,
      existingExecution: baseExecution({ status: "failed", failureCode: "provider_rejected" }),
      trustedPaymentIntentId: PI,
      firstTimeSubmitAllowed: true,
    });
    expect(e.eligibleToExecute).toBe(false);
    expect(e.recoveryRequired).toBe(false);
    expect(e.code).toBe("prior_failed_no_retry");
  });

  it("provider definitive failure persists failed and blocks second submit", async () => {
    const repo = createMemoryPartialRefundProviderExecutionRepository();
    const submit = vi.fn(async () => ({
      kind: "failed" as const,
      failureCode: "provider_rejected",
      failureMessageSafe: "card_declined_fixture",
      providerStatusSafe: "failed",
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
        operatorUserId: "op-1",
        operatorReasonSafe: "safety failure path",
      },
      deps
    );
    expect(first.ok).toBe(true);
    if (first.ok) expect(first.value.phase).toBe("failed");

    const second = await executePartialRefundProviderMoney(
      {
        ledger: committedLedger(),
        trustedProviderPaymentRef: PI,
        operatorUserId: "op-1",
        operatorReasonSafe: "safety failure retry attempt",
      },
      deps
    );
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.message).toMatch(/does not allow retry/i);
    expect(submit).toHaveBeenCalledTimes(1);
  });
});

describe("safety — reconciliation evidence (audit view)", () => {
  it("audit view exposes reconciliation fields without secret-like keys", () => {
    const row = baseExecution({
      status: "succeeded",
      providerRefundId: "re_safety_ok",
      providerStatusSafe: "succeeded",
      startedAtIso: "2026-08-09T12:00:01.000Z",
      completedAtIso: "2026-08-09T12:00:02.000Z",
    });
    const view = toProviderMoneyAuditView(row);
    expect(view.idempotencyKey).toBe(
      buildPartialRefundProviderIdempotencyKey(IDS.ledger)
    );
    expect(view.status).toBe("succeeded");
    expect(view.amountMinor).toBe(2500);
    expect(view.latestOperation).toBe("SUBMIT");
    const keys = Object.keys(view).sort();
    expect(keys).toEqual(
      [
        "amountMinor",
        "completedAtIso",
        "createdAtIso",
        "currency",
        "executionId",
        "failureCode",
        "idempotencyKey",
        "lastLookupAtIso",
        "latestOperation",
        "ledgerId",
        "orderId",
        "paymentAttemptId",
        "providerKind",
        "providerRefundId",
        "providerStatusSafe",
        "startedAtIso",
        "status",
        "storeId",
      ].sort()
    );
    expect(JSON.stringify(view)).not.toMatch(/sk_(live|test)_/);
    expect(JSON.stringify(view)).not.toMatch(/rawStripe|client_secret|webhook/i);
  });

  it("lookup timestamp wins latestOperation=LOOKUP for recovery evidence", () => {
    const op = deriveProviderMoneyLatestOperation({
      status: "uncertain",
      createdAtIso: "2026-08-09T12:00:00.000Z",
      startedAtIso: "2026-08-09T12:00:01.000Z",
      completedAtIso: null,
      lastLookupAtIso: "2026-08-09T12:05:00.000Z",
    });
    expect(op).toBe("LOOKUP");
  });
});

describe("safety — admin visibility + unauthorized denial contracts", () => {
  it("server actions require platform admin and deny unauthenticated readiness", () => {
    const src = read(ACTION);
    expect(src).toMatch(/assertPlatformAdminDb/);
    expect(src).toMatch(/getServerUser/);
    expect(src).toMatch(/adminGetPartialRefundProviderMoneyReadinessAction/);
    expect(src).toMatch(/adminExecutePartialRefundProviderMoneyAction/);
    expect(src).toMatch(/adminRecoverPartialRefundProviderMoneyLookupAction/);
    expect(src).toMatch(/code:\s*"unauthorized"/);
    expect(src).toMatch(/ADMIN_STORE_UNAUTHORIZED/);
    expect(src).toMatch(/LOOKUP ONLY/);
    expect(src).not.toMatch(/submitPartialRefund\(/);
  });

  it("execute + recovery panels expose stable testids for admin E2E anchors", () => {
    expect(read(EXECUTE_PANEL)).toMatch(
      /data-testid="partial-refund-provider-money-execute-panel"/
    );
    expect(read(RECOVERY_PANEL)).toMatch(
      /data-testid="partial-refund-provider-money-recovery-panel"/
    );
    expect(read(RECOVERY_PANEL)).toMatch(
      /data-testid="pr-prov-operator-observability"/
    );
    expect(read(RECOVERY_PANEL)).toMatch(
      /buildProviderMoneyOperatorObservability/
    );
    expect(read(RECOVERY_PANEL)).toMatch(
      /data-testid="pr-prov-reconciliation"/
    );
    expect(read(RECOVERY_PANEL)).toMatch(/buildRefundProviderReconciliation/);
    expect(read(RECOVERY_PANEL)).toMatch(/LOCAL_STATE/);
    expect(read(RECOVERY_PANEL)).toMatch(/MATCH_STATUS/);
    expect(read(RECOVERY_PANEL)).toMatch(/RETRY_SAFE/);
    expect(read(RECOVERY_PANEL)).toMatch(/OPERATOR_ACTION_REQUIRED/);
    expect(read(EXECUTE_PANEL)).toMatch(/prior failed \(no V1 retry\)/);
    expect(read(EXECUTE_PANEL)).toMatch(/recovery required/);
  });
});

describe("safety — seller-visible state absence", () => {
  it("seller/storefront app trees do not wire provider-money execute/recovery", () => {
    const roots = [
      path.join(ROOT, "app", "components", "store"),
      path.join(ROOT, "app", "store"),
      path.join(ROOT, "app", "s"),
      path.join(ROOT, "app", "(store)"),
    ];
    const forbidden = [
      "PartialRefundProviderMoneyExecutePanel",
      "PartialRefundProviderMoneyRecoveryPanel",
      "adminExecutePartialRefundProviderMoneyAction",
      "adminRecoverPartialRefundProviderMoneyLookupAction",
      "partial-refund-provider-money-execute-panel",
      "partial-refund-provider-money-recovery-panel",
    ];
    const hits: string[] = [];
    for (const root of roots) {
      for (const file of walkTsxFiles(root)) {
        const text = readFileSync(file, "utf8");
        for (const needle of forbidden) {
          if (text.includes(needle)) {
            hits.push(`${path.relative(ROOT, file)}:${needle}`);
          }
        }
      }
    }
    expect(hits).toEqual([]);
  });
});

describe("safety — rollback / recovery expectations + plan presence", () => {
  it("safety plan documents E2E scenarios and rollback rules", () => {
    const plan = read(SAFETY_PLAN);
    expect(plan).toMatch(/E2E-S1/);
    expect(plan).toMatch(/E2E-S6/);
    expect(plan).toMatch(/LOOKUP only/i);
    expect(plan).toMatch(/no_retry|No V1 retry|does not allow retry/i);
    expect(plan).toMatch(/Rollback|rollback/);
    expect(plan).toMatch(/seller UI must not/i);
    expect(plan).toMatch(/prf-prov:\{ledgerId\}/);
  });

  it("default empty env keeps execute path fail-closed (zero submit)", async () => {
    const repo = createMemoryPartialRefundProviderExecutionRepository();
    const submit = vi.fn();
    const r = await executePartialRefundProviderMoney(
      {
        ledger: committedLedger(),
        trustedProviderPaymentRef: PI,
      },
      {
        repository: repo,
        env: {},
        resolveProviderPort: () =>
          ({
            providerKind: "stripe" as const,
            submitPartialRefund: submit,
            lookupPartialRefund: vi.fn(),
          }) satisfies PartialRefundProviderPort,
      }
    );
    expect(r.ok).toBe(false);
    expect(submit).not.toHaveBeenCalled();
  });

  it("uncertain eligibility requires recovery (no first-time submit)", () => {
    const e = evaluateFirstTimeProviderMoneyExecuteEligibility({
      ledgerStatus: "committed",
      refundAmountMinor: 100,
      currency: "USD",
      storeId: IDS.store,
      existingExecution: baseExecution({ status: "uncertain" }),
      trustedPaymentIntentId: PI,
      firstTimeSubmitAllowed: true,
    });
    expect(e.eligibleToExecute).toBe(false);
    expect(e.recoveryRequired).toBe(true);
    expect(e.code).toBe("recovery_required");
  });
});

describe("safety — transition matrix snapshot for statuses type", () => {
  it("every status key is covered in TRANSITIONS record", () => {
    const keys = Object.keys(
      PARTIAL_REFUND_PROVIDER_EXECUTION_TRANSITIONS
    ) as PartialRefundProviderExecutionStatus[];
    expect(keys.sort()).toEqual(
      [...PARTIAL_REFUND_PROVIDER_EXECUTION_STATUSES].sort()
    );
  });
});
