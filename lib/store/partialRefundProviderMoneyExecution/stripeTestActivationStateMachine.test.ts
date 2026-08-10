/**
 * Stripe TEST activation state-machine safety — focused acceptance tests.
 * STRIPE_CALLS=0 / MONEY_MOVEMENT=0 / PRODUCTION_DB_WRITES=0.
 * No gate activation. No provider execution. No secret echo.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_VALUE,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_NON_PRODUCTION_FIXTURE_TOKEN,
  PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_VALUE,
} from "./index";
import {
  STRIPE_TEST_ACTIVATION_OPERATOR_AUTHORIZED,
  STRIPE_TEST_ACTIVATION_PERFORMED,
  STRIPE_TEST_ACTIVATION_PROVIDER_EXECUTION_ENTRYPOINTS,
  STRIPE_TEST_ACTIVATION_STATES,
  STRIPE_TEST_ACTIVATION_STATE_MACHINE_ENVIRONMENT,
  STRIPE_TEST_ACTIVATION_STATE_MACHINE_VERSION,
  applyStripeTestActivationTransition,
  buildStripeTestActivationStateMachineReport,
  canTransitionStripeTestActivationState,
  isStripeTestActivationReadyForTest,
  resolveStripeTestActivationState,
} from "./stripeTestActivationStateMachine";

const SM_SOURCE = path.join(
  process.cwd(),
  "lib/store/partialRefundProviderMoneyExecution/stripeTestActivationStateMachine.ts"
);

/** Distinct fake TEST credentials — must never appear in SM output. */
const FAKE_TEST_SECRET = "sk_test_ACTIVATION_SM_FAKE_SECRET_VALUE_9q2n";
const FAKE_TEST_PUBLISHABLE =
  "pk_test_ACTIVATION_SM_FAKE_PUBLISHABLE_VALUE_9q2n";
const FAKE_WEBHOOK = "whsec_ACTIVATION_SM_FAKE_WEBHOOK_VALUE_9q2n";
const FAKE_LIVE_SECRET = "sk_live_ACTIVATION_SM_FAKE_LIVE_SECRET_VALUE_9q2n";

function testCredentialEnv(
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

function assertNoSecretEcho(payload: unknown): void {
  const blob = JSON.stringify(payload);
  expect(blob).not.toContain(FAKE_TEST_SECRET);
  expect(blob).not.toContain(FAKE_TEST_PUBLISHABLE);
  expect(blob).not.toContain(FAKE_WEBHOOK);
  expect(blob).not.toContain(FAKE_LIVE_SECRET);
  expect(blob).not.toContain("sk_test_");
  expect(blob).not.toContain("pk_test_");
  expect(blob).not.toContain("sk_live_");
  expect(blob).not.toContain("pk_live_");
  expect(blob).not.toContain("whsec_");
}

function assertOfflineInvariants(
  report: ReturnType<typeof buildStripeTestActivationStateMachineReport>
): void {
  expect(report.networkStripeCalls).toBe(0);
  expect(report.moneyMovement).toBe(0);
  expect(report.productionDbWrites).toBe(0);
  expect(report.providerGates).toBe("OFF");
  expect(report.activationPerformed).toBe(false);
  expect(report.operatorActivationAuthorized).toBe(false);
  expect(report.providerExecutionStartCapable).toBe(false);
  expect(report.canEnterTestActivating).toBe(false);
  expect(report.canEnterTestActive).toBe(false);
  expect(STRIPE_TEST_ACTIVATION_PERFORMED).toBe(false);
  expect(STRIPE_TEST_ACTIVATION_OPERATOR_AUTHORIZED).toBe(false);
  expect(STRIPE_TEST_ACTIVATION_PROVIDER_EXECUTION_ENTRYPOINTS).toEqual([]);
  assertNoSecretEcho(report);
}

describe("stripe TEST activation state machine — candidate states", () => {
  it("exposes the canonical candidate states without inventing conflicting ones", () => {
    expect([...STRIPE_TEST_ACTIVATION_STATES]).toEqual([
      "DISABLED",
      "PRECHECK_BLOCKED",
      "READY_FOR_TEST",
      "TEST_ACTIVATING",
      "TEST_ACTIVE",
      "TEST_FAILED",
      "TEST_DEACTIVATED",
    ]);
    expect(STRIPE_TEST_ACTIVATION_STATE_MACHINE_VERSION).toBe(
      "commerce-stripe-test-activation-state-machine-safety-v1"
    );
    expect(STRIPE_TEST_ACTIVATION_STATE_MACHINE_ENVIRONMENT).toContain(
      "not_production"
    );
  });
});

describe("stripe TEST activation state machine — precheck derivation", () => {
  it("READY_FOR_TEST when control-plane precheck succeeds", () => {
    const report = buildStripeTestActivationStateMachineReport(
      testCredentialEnv()
    );
    expect(report.state).toBe("READY_FOR_TEST");
    expect(report.precheckSucceeded).toBe(true);
    expect(report.controlPlaneStatus).toBe("READY");
    expect(report.reasonCodes).toEqual([]);
    expect(isStripeTestActivationReadyForTest(testCredentialEnv())).toBe(true);
    assertOfflineInvariants(report);
  });

  it("PRECHECK_BLOCKED when required credentials are missing", () => {
    const report = buildStripeTestActivationStateMachineReport({});
    expect(report.state).toBe("PRECHECK_BLOCKED");
    expect(report.precheckSucceeded).toBe(false);
    expect(report.controlPlaneStatus).toBe("NOT_READY");
    expect(report.reasonCodes.length).toBeGreaterThan(0);
    expect(resolveStripeTestActivationState({})).toBe("PRECHECK_BLOCKED");
    assertOfflineInvariants(report);
  });

  it("PRECHECK_BLOCKED / LIVE cannot enter TEST activation", () => {
    const env = testCredentialEnv({
      STRIPE_MODE: "live",
      STRIPE_SECRET_KEY: FAKE_LIVE_SECRET,
    });
    const report = buildStripeTestActivationStateMachineReport(env);
    expect(report.state).toBe("PRECHECK_BLOCKED");
    expect(report.precheckSucceeded).toBe(false);

    const begin = applyStripeTestActivationTransition({
      from: "READY_FOR_TEST",
      event: "BEGIN_ACTIVATION",
      source: env,
      operatorActivationAuthorized: true,
    });
    expect(begin.ok).toBe(false);
    expect(begin.to).toBe("PRECHECK_BLOCKED");
    expect(begin.reasonCodes).toContain("live_cannot_enter_test_activation");
    expect(begin.providerGates).toBe("OFF");
    assertNoSecretEcho(begin);
  });

  it("PRECHECK_BLOCKED when provider gate starting state is unsafe", () => {
    const env = testCredentialEnv({
      [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV]: "true",
      [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV]:
        PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_VALUE,
      UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_ALLOW_IN_NON_PRODUCTION:
        PARTIAL_REFUND_PROVIDER_MONEY_NON_PRODUCTION_FIXTURE_TOKEN,
      NODE_ENV: "test",
    });
    const report = buildStripeTestActivationStateMachineReport(env);
    expect(report.state).toBe("PRECHECK_BLOCKED");
    assertOfflineInvariants(report);
  });

  it("precheck evaluation is deterministic across repeated calls", () => {
    const env = {};
    const a = buildStripeTestActivationStateMachineReport(env);
    const b = buildStripeTestActivationStateMachineReport(env);
    expect(a).toEqual(b);
    expect(resolveStripeTestActivationState(env)).toBe(
      resolveStripeTestActivationState(env)
    );
  });
});

describe("stripe TEST activation state machine — fail-closed activation", () => {
  it("cannot BEGIN_ACTIVATION without operator authorization (gates stay OFF)", () => {
    const env = testCredentialEnv();
    const begin = applyStripeTestActivationTransition({
      from: "READY_FOR_TEST",
      event: "BEGIN_ACTIVATION",
      source: env,
    });
    expect(begin.ok).toBe(false);
    expect(begin.to).toBe("READY_FOR_TEST");
    expect(begin.reasonCodes).toContain("operator_activation_not_authorized");
    expect(begin.providerGates).toBe("OFF");
    expect(begin.activationPerformed).toBe(false);
    expect(STRIPE_TEST_ACTIVATION_OPERATOR_AUTHORIZED).toBe(false);
  });

  it("cannot enter TEST_ACTIVE without precheck success", () => {
    const bad = applyStripeTestActivationTransition({
      from: "TEST_ACTIVATING",
      event: "MARK_ACTIVATION_SUCCEEDED",
      source: {},
      operatorActivationAuthorized: true,
    });
    expect(bad.ok).toBe(false);
    expect(bad.to).toBe("TEST_FAILED");
    expect(bad.reasonCodes).toContain(
      "cannot_enter_test_active_without_precheck_success"
    );
    expect(bad.reasonCodes).toContain("failure_cannot_silently_become_active");
    expect(bad.providerGates).toBe("OFF");
  });

  it("failure cannot silently become active", () => {
    const failed = applyStripeTestActivationTransition({
      from: "TEST_ACTIVATING",
      event: "MARK_ACTIVATION_FAILED",
      source: testCredentialEnv(),
      operatorActivationAuthorized: true,
    });
    expect(failed.ok).toBe(true);
    expect(failed.to).toBe("TEST_FAILED");

    const sneak = applyStripeTestActivationTransition({
      from: "TEST_FAILED",
      event: "MARK_ACTIVATION_SUCCEEDED",
      source: testCredentialEnv(),
      operatorActivationAuthorized: true,
    });
    expect(sneak.ok).toBe(false);
    expect(sneak.to).toBe("TEST_FAILED");
    expect(sneak.reasonCodes).toContain(
      "activation_succeeded_requires_test_activating"
    );
  });

  it("authorized happy-path graph is deterministic and idempotent", () => {
    const env = testCredentialEnv();
    const begin1 = applyStripeTestActivationTransition({
      from: "READY_FOR_TEST",
      event: "BEGIN_ACTIVATION",
      source: env,
      operatorActivationAuthorized: true,
    });
    const begin2 = applyStripeTestActivationTransition({
      from: "READY_FOR_TEST",
      event: "BEGIN_ACTIVATION",
      source: env,
      operatorActivationAuthorized: true,
    });
    expect(begin1).toEqual(begin2);
    expect(begin1.ok).toBe(true);
    expect(begin1.to).toBe("TEST_ACTIVATING");

    const again = applyStripeTestActivationTransition({
      from: "TEST_ACTIVATING",
      event: "BEGIN_ACTIVATION",
      source: env,
      operatorActivationAuthorized: true,
    });
    expect(again.ok).toBe(true);
    expect(again.idempotent).toBe(true);
    expect(again.to).toBe("TEST_ACTIVATING");

    const active = applyStripeTestActivationTransition({
      from: "TEST_ACTIVATING",
      event: "MARK_ACTIVATION_SUCCEEDED",
      source: env,
      operatorActivationAuthorized: true,
    });
    expect(active.ok).toBe(true);
    expect(active.to).toBe("TEST_ACTIVE");

    const activeAgain = applyStripeTestActivationTransition({
      from: "TEST_ACTIVE",
      event: "MARK_ACTIVATION_SUCCEEDED",
      source: env,
      operatorActivationAuthorized: true,
    });
    expect(activeAgain.ok).toBe(true);
    expect(activeAgain.idempotent).toBe(true);
    expect(activeAgain.to).toBe("TEST_ACTIVE");
  });

  it("deactivation is deterministic and idempotent", () => {
    const env = testCredentialEnv();
    const d1 = applyStripeTestActivationTransition({
      from: "TEST_ACTIVE",
      event: "DEACTIVATE",
      source: env,
    });
    const d2 = applyStripeTestActivationTransition({
      from: "TEST_ACTIVE",
      event: "DEACTIVATE",
      source: env,
    });
    expect(d1).toEqual(d2);
    expect(d1.to).toBe("TEST_DEACTIVATED");

    const again = applyStripeTestActivationTransition({
      from: "TEST_DEACTIVATED",
      event: "DEACTIVATE",
      source: env,
    });
    expect(again.ok).toBe(true);
    expect(again.idempotent).toBe(true);
    expect(again.to).toBe("TEST_DEACTIVATED");

    const reset = applyStripeTestActivationTransition({
      from: "TEST_DEACTIVATED",
      event: "RESET",
      source: env,
    });
    expect(reset.ok).toBe(true);
    expect(reset.to).toBe("DISABLED");
  });

  it("cannot BEGIN_ACTIVATION without precheck success", () => {
    const begin = applyStripeTestActivationTransition({
      from: "READY_FOR_TEST",
      event: "BEGIN_ACTIVATION",
      source: {},
      operatorActivationAuthorized: true,
    });
    expect(begin.ok).toBe(false);
    expect(begin.to).toBe("PRECHECK_BLOCKED");
    expect(begin.reasonCodes).toContain(
      "cannot_begin_activation_without_precheck_success"
    );
  });

  it("edge helper rejects inventing TEST_ACTIVE from DISABLED", () => {
    expect(
      canTransitionStripeTestActivationState("DISABLED", "TEST_ACTIVE")
    ).toBe(false);
    expect(
      canTransitionStripeTestActivationState("PRECHECK_BLOCKED", "TEST_ACTIVE")
    ).toBe(false);
    expect(
      canTransitionStripeTestActivationState("TEST_FAILED", "TEST_ACTIVE")
    ).toBe(false);
  });
});

describe("stripe TEST activation state machine — hard offline guarantees", () => {
  it("source has no Stripe network / fetch / money movement hooks", () => {
    const src = readFileSync(SM_SOURCE, "utf8");
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/stripe\.com/i);
    expect(src).not.toMatch(/new\s+Stripe\b/);
    expect(src).not.toMatch(/createRefund|paymentIntents\.create/i);
    expect(src).toContain("STRIPE_CALLS = 0");
    expect(src).toContain("THIS MODULE DOES NOT ACTIVATE STRIPE");
  });

  it("never authorizes or performs activation structurally", () => {
    const report = buildStripeTestActivationStateMachineReport(
      testCredentialEnv()
    );
    expect(report.state).toBe("READY_FOR_TEST");
    expect(report.activationPerformed).toBe(false);
    expect(report.operatorActivationAuthorized).toBe(false);
    expect(report.canEnterTestActivating).toBe(false);
    expect(report.canEnterTestActive).toBe(false);
    expect(report.providerGates).toBe("OFF");
    // Gate / production ACK constants remain unused for enablement.
    expect(PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV).toBeTruthy();
    expect(PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_VALUE).toBeTruthy();
    assertOfflineInvariants(report);
  });
});
