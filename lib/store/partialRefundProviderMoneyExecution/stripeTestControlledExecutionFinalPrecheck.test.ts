/**
 * Stripe TEST controlled-execution FINAL PRECHECK — focused acceptance tests.
 * STRIPE_CALLS=0 / MONEY_MOVEMENT=0 / DB_WRITES=0 / STRIPE_ACTIVATED=NO /
 * PROVIDER_GATES=OFF. No network. No secret echo. No real Stripe execution.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_ACTIVATION_PERFORMED,
  STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_DEFAULT_SOT,
  STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_ENVIRONMENT,
  STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_GATES,
  STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_PROVIDER_EXECUTION_ENTRYPOINTS,
  STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_REQUIRED_ENV_NAMES,
  STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_VERDICTS,
  STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_VERSION,
  buildFutureOperatorControlledStripeTestExecutionChecklist,
  buildStripeTestControlledExecutionFinalPrecheckReport,
  isReadyForControlledStripeTestExecution,
} from "./stripeTestControlledExecutionFinalPrecheck";

const PRECHECK_SOURCE = path.join(
  process.cwd(),
  "lib/store/partialRefundProviderMoneyExecution/stripeTestControlledExecutionFinalPrecheck.ts"
);

/** Distinct fake TEST credentials — must never appear in precheck outputs. */
const FAKE_TEST_SECRET = "sk_test_FINAL_PRECHECK_HOST_FAKE_SECRET_9z1a";
const FAKE_TEST_PUBLISHABLE =
  "pk_test_FINAL_PRECHECK_HOST_FAKE_PUBLISHABLE_9z1a";
const FAKE_WEBHOOK = "whsec_FINAL_PRECHECK_HOST_FAKE_WEBHOOK_9z1a";
const FAKE_LIVE_SECRET = "sk_live_FINAL_PRECHECK_HOST_FAKE_LIVE_SECRET_9z1a";
const FAKE_LIVE_PUBLISHABLE =
  "pk_live_FINAL_PRECHECK_HOST_FAKE_PUBLISHABLE_9z1a";

const FORBIDDEN = [
  FAKE_TEST_SECRET,
  FAKE_TEST_PUBLISHABLE,
  FAKE_WEBHOOK,
  FAKE_LIVE_SECRET,
  FAKE_LIVE_PUBLISHABLE,
];

function hostReadyEnv(
  extra: Record<string, string | undefined> = {}
): Record<string, string | undefined> {
  return {
    STRIPE_MODE: "test",
    STRIPE_SECRET_KEY: FAKE_TEST_SECRET,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: FAKE_TEST_PUBLISHABLE,
    STRIPE_WEBHOOK_SECRET: FAKE_WEBHOOK,
    NEXT_PUBLIC_APP_URL: "https://example.test",
    ...extra,
  };
}

function allOperatorFixturesReady() {
  return {
    capturedTestPaymentIntentReady: true,
    matchingPaymentAttemptCaptureFactsReady: true,
    committedPartialRefundLedgerReady: true,
    zeroProviderExecutionRowsForLedger: true,
    isolatedSupabaseOrExplicitMoneyFixtureGo: true,
  };
}

function allSotIntegrated() {
  return {
    commerceSotTipSha: "ffffffffffffffffffffffffffffffffffffffff",
    fixturePackOnCommerceSotTip: true,
    controlPlaneOnCommerceSotTip: true,
    offlinePreflightOnCommerceSotTip: true,
    envReadinessOnCommerceSotTip: true,
    stateMachineOnCommerceSotTip: true,
    dryRunOnCommerceSotTip: true,
  };
}

function assertNoSecretEcho(payload: unknown): void {
  const blob = JSON.stringify(payload);
  for (const s of FORBIDDEN) {
    expect(blob).not.toContain(s);
  }
  expect(blob).not.toContain("sk_test_");
  expect(blob).not.toContain("pk_test_");
  expect(blob).not.toContain("sk_live_");
  expect(blob).not.toContain("pk_live_");
  expect(blob).not.toContain("whsec_");
}

function assertOfflineCounters(payload: {
  networkStripeCalls: 0;
  moneyMovement: 0;
  productionDbWrites: 0;
  providerGates: "OFF";
  activationPerformed: false;
}): void {
  expect(payload.networkStripeCalls).toBe(0);
  expect(payload.moneyMovement).toBe(0);
  expect(payload.productionDbWrites).toBe(0);
  expect(payload.providerGates).toBe("OFF");
  expect(payload.activationPerformed).toBe(false);
}

describe("stripe TEST controlled-execution final precheck — structural", () => {
  it("exposes version/environment and zero activation capabilities", () => {
    expect(STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_VERSION).toBe(
      "commerce-stripe-test-controlled-execution-final-precheck-v1"
    );
    expect(STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_ENVIRONMENT).toContain(
      "not_production"
    );
    expect(
      STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_ACTIVATION_PERFORMED
    ).toBe(false);
    expect(
      STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_PROVIDER_EXECUTION_ENTRYPOINTS
    ).toEqual([]);
    expect([...STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_VERDICTS]).toEqual(
      [
        "READY_FOR_CONTROLLED_STRIPE_TEST_EXECUTION",
        "NOT_READY_FOR_CONTROLLED_STRIPE_TEST_EXECUTION",
      ]
    );
    expect(STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_GATES).toHaveLength(
      11
    );
    expect(
      STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_REQUIRED_ENV_NAMES
    ).toContain("STRIPE_MODE");
  });

  it("source contains no Stripe network / fetch / axios / activation", () => {
    const src = readFileSync(PRECHECK_SOURCE, "utf8");
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/\baxios\b/);
    expect(src).not.toMatch(/stripe\.com/i);
    expect(src).not.toMatch(/new\s+Stripe\b/);
    expect(src).toContain("THIS MODULE DOES NOT EXECUTE STRIPE");
  });

  it("defaults encode current Commerce SoT tip integration gaps", () => {
    expect(
      STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_DEFAULT_SOT.commerceSotTipSha
    ).toBe("5bce626406691d3e64f352ad14c186d5ac7dbe9b");
    expect(
      STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_DEFAULT_SOT
        .stateMachineOnCommerceSotTip
    ).toBe(false);
    expect(
      STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_DEFAULT_SOT
        .dryRunOnCommerceSotTip
    ).toBe(false);
    expect(
      STRIPE_TEST_CONTROLLED_EXECUTION_FINAL_PRECHECK_DEFAULT_SOT
        .envReadinessOnCommerceSotTip
    ).toBe(false);
  });
});

describe("stripe TEST controlled-execution final precheck — current host defaults", () => {
  it("returns NOT_READY with real remaining blockers (empty host env)", () => {
    const report = buildStripeTestControlledExecutionFinalPrecheckReport({
      env: {},
    });

    expect(report.verdict).toBe(
      "NOT_READY_FOR_CONTROLLED_STRIPE_TEST_EXECUTION"
    );
    expect(isReadyForControlledStripeTestExecution({ env: {} })).toBe(false);
    expect(report.waitingForStateMachineIntegration).toBe(true);
    expect(report.futureOperatorExecutionChecklist).toBeNull();
    expect(report.blockers.length).toBeGreaterThan(0);
    expect(report.blockers.some((b) => b.includes("TEST_CREDENTIALS"))).toBe(
      true
    );
    expect(
      report.blockers.some((b) =>
        b.includes("WAITING_FOR_STATE_MACHINE_INTEGRATION")
      )
    ).toBe(true);
    expect(
      report.blockers.some((b) => b.includes("OPERATOR_MONEY_FIXTURES_MISSING"))
    ).toBe(true);
    expect(
      report.blockers.some((b) =>
        b.includes("ENV_READINESS_PACK_NOT_ON_COMMERCE_SOT_TIP")
      )
    ).toBe(true);

    const byGate = Object.fromEntries(
      report.gates.map((g) => [g.gate, g.ready])
    );
    expect(byGate.TEST_CREDENTIALS_AVAILABLE).toBe(false);
    expect(byGate.TEST_MODE_CONFIRMED).toBe(false);
    expect(byGate.LIVE_MODE_BLOCKED).toBe(true);
    expect(byGate.PROVIDER_GATES_OFF).toBe(true);
    expect(byGate.STATE_MACHINE_READY).toBe(false);
    expect(byGate.DRY_RUN_READY).toBe(false);
    expect(byGate.NEGATIVE_PATHS_READY).toBe(true);
    expect(byGate.ROLLBACK_READY).toBe(true);
    expect(byGate.CONTROL_PLANE_READY).toBe(true);
    expect(byGate.OPERATOR_RUNBOOK_READY).toBe(true);

    expect(report.stripeActivated).toBe("NO");
    expect(report.operatorActivationAuthorized).toBe(false);
    expect(report.providerExecutionStartCapable).toBe(false);
    assertOfflineCounters(report);
    assertNoSecretEcho(report);
  });
});

describe("stripe TEST controlled-execution final precheck — READY path (simulated)", () => {
  it("returns READY only when host + SoT + operator fixtures all clear", () => {
    const report = buildStripeTestControlledExecutionFinalPrecheckReport({
      env: hostReadyEnv(),
      sotIntegration: allSotIntegrated(),
      operatorFixtures: allOperatorFixturesReady(),
    });

    expect(report.verdict).toBe("READY_FOR_CONTROLLED_STRIPE_TEST_EXECUTION");
    expect(
      isReadyForControlledStripeTestExecution({
        env: hostReadyEnv(),
        sotIntegration: allSotIntegrated(),
        operatorFixtures: allOperatorFixturesReady(),
      })
    ).toBe(true);
    expect(report.blockers).toEqual([]);
    expect(report.waitingForStateMachineIntegration).toBe(false);
    expect(report.gates.every((g) => g.ready)).toBe(true);
    expect(report.futureOperatorExecutionChecklist).not.toBeNull();
    expect(report.futureOperatorExecutionChecklist?.length).toBeGreaterThan(5);
    expect(report.activationPerformed).toBe(false);
    expect(report.stripeActivated).toBe("NO");
    assertOfflineCounters(report);
    assertNoSecretEcho(report);
  });

  it("blocks LIVE host credentials even if SoT/fixtures are simulated ready", () => {
    const report = buildStripeTestControlledExecutionFinalPrecheckReport({
      env: hostReadyEnv({
        STRIPE_MODE: "live",
        STRIPE_SECRET_KEY: FAKE_LIVE_SECRET,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: FAKE_LIVE_PUBLISHABLE,
      }),
      sotIntegration: allSotIntegrated(),
      operatorFixtures: allOperatorFixturesReady(),
    });

    expect(report.verdict).toBe(
      "NOT_READY_FOR_CONTROLLED_STRIPE_TEST_EXECUTION"
    );
    expect(
      report.gates.find((g) => g.gate === "LIVE_MODE_BLOCKED")?.ready
    ).toBe(false);
    expect(report.futureOperatorExecutionChecklist).toBeNull();
    assertNoSecretEcho(report);
  });
});

describe("stripe TEST controlled-execution final precheck — checklist", () => {
  it("publishes future operator checklist without executing Stripe", () => {
    const checklist = buildFutureOperatorControlledStripeTestExecutionChecklist();
    expect(checklist.some((s) => s.includes("separate coordinator GO"))).toBe(
      true
    );
    expect(checklist.some((s) => s.includes("DEACTIVATE"))).toBe(true);
    expect(checklist.every((s) => !s.includes("sk_test_"))).toBe(true);
    expect(checklist.every((s) => !s.includes("pk_test_"))).toBe(true);
    expect(checklist.every((s) => !s.includes("whsec_"))).toBe(true);
  });
});
