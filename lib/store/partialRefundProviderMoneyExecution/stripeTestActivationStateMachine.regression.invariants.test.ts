/**
 * POST-IMPLEMENTATION regression + invariant pack for Stripe TEST activation
 * state machine (DESKTOP-A2 WAVE_INV).
 *
 * Consumes SM implementation read-only. Does not alter transition semantics.
 * STRIPE_CALLS=0 / MONEY_MOVEMENT=0 / DB_WRITES=0 / STRIPE_ACTIVATED=NO /
 * PROVIDER_GATES=OFF.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_VALUE,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_NON_PRODUCTION_FIXTURE_TOKEN,
  PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_VALUE,
  evaluatePartialRefundProviderMoneyGate,
} from "./index";
import {
  STRIPE_TEST_ACTIVATION_OPERATOR_AUTHORIZED,
  STRIPE_TEST_ACTIVATION_PERFORMED,
  STRIPE_TEST_ACTIVATION_PROVIDER_EXECUTION_ENTRYPOINTS,
  STRIPE_TEST_ACTIVATION_STATES,
  applyStripeTestActivationTransition,
  buildStripeTestActivationStateMachineReport,
  canTransitionStripeTestActivationState,
  resolveStripeTestActivationState,
  type StripeTestActivationState,
  type StripeTestActivationTransitionResult,
} from "./stripeTestActivationStateMachine";

const SM_SOURCE = path.join(
  process.cwd(),
  "lib/store/partialRefundProviderMoneyExecution/stripeTestActivationStateMachine.ts"
);

/** Distinct fake TEST credentials — must never appear in SM outputs. */
const FAKE_TEST_SECRET = "sk_test_INV_REGRESSION_FAKE_SECRET_VALUE_7m4k";
const FAKE_TEST_PUBLISHABLE =
  "pk_test_INV_REGRESSION_FAKE_PUBLISHABLE_VALUE_7m4k";
const FAKE_WEBHOOK = "whsec_INV_REGRESSION_FAKE_WEBHOOK_VALUE_7m4k";
const FAKE_LIVE_SECRET = "sk_live_INV_REGRESSION_FAKE_LIVE_SECRET_VALUE_7m4k";
const FAKE_LIVE_PUBLISHABLE =
  "pk_live_INV_REGRESSION_FAKE_PUBLISHABLE_VALUE_7m4k";

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
  expect(blob).not.toContain(FAKE_LIVE_PUBLISHABLE);
  expect(blob).not.toContain("sk_test_");
  expect(blob).not.toContain("pk_test_");
  expect(blob).not.toContain("sk_live_");
  expect(blob).not.toContain("pk_live_");
  expect(blob).not.toContain("whsec_");
}

function assertZeroMoneyOffline(
  result: StripeTestActivationTransitionResult
): void {
  expect(result.networkStripeCalls).toBe(0);
  expect(result.moneyMovement).toBe(0);
  expect(result.productionDbWrites).toBe(0);
  expect(result.providerGates).toBe("OFF");
  expect(result.activationPerformed).toBe(false);
  assertNoSecretEcho(result);
}

function assertCannotReachTestActive(
  from: StripeTestActivationState,
  source: Record<string, string | undefined>,
  operatorActivationAuthorized = true
): void {
  const begin = applyStripeTestActivationTransition({
    from,
    event: "BEGIN_ACTIVATION",
    source,
    operatorActivationAuthorized,
  });
  expect(begin.to).not.toBe("TEST_ACTIVE");
  assertZeroMoneyOffline(begin);

  if (begin.to === "TEST_ACTIVATING") {
    const succeeded = applyStripeTestActivationTransition({
      from: "TEST_ACTIVATING",
      event: "MARK_ACTIVATION_SUCCEEDED",
      source,
      operatorActivationAuthorized,
    });
    // Only allowed when precheck + auth + non-LIVE — callers use this helper
    // for blocked paths; assert fail-closed when precheck/LIVE blocks.
    if (!succeeded.precheckSucceeded || source.STRIPE_MODE === "live") {
      expect(succeeded.ok).toBe(false);
      expect(succeeded.to).not.toBe("TEST_ACTIVE");
    }
    assertZeroMoneyOffline(succeeded);
  }
}

describe("SM regression invariants — (1) DISABLED cannot silently become ACTIVE", () => {
  it("rejects DISABLED → TEST_ACTIVE edge and silent success mark", () => {
    expect(
      canTransitionStripeTestActivationState("DISABLED", "TEST_ACTIVE")
    ).toBe(false);

    const sneak = applyStripeTestActivationTransition({
      from: "DISABLED",
      event: "MARK_ACTIVATION_SUCCEEDED",
      source: testCredentialEnv(),
      operatorActivationAuthorized: true,
    });
    expect(sneak.ok).toBe(false);
    expect(sneak.to).toBe("DISABLED");
    expect(sneak.reasonCodes).toContain(
      "activation_succeeded_requires_test_activating"
    );
    assertZeroMoneyOffline(sneak);

    const begin = applyStripeTestActivationTransition({
      from: "DISABLED",
      event: "BEGIN_ACTIVATION",
      source: testCredentialEnv(),
      operatorActivationAuthorized: true,
    });
    expect(begin.ok).toBe(false);
    expect(begin.to).not.toBe("TEST_ACTIVE");
    expect(begin.to).not.toBe("TEST_ACTIVATING");
    assertZeroMoneyOffline(begin);
  });
});

describe("SM regression invariants — (2) Failed precheck cannot activate", () => {
  it("BEGIN_ACTIVATION and MARK_ACTIVATION_SUCCEEDED fail-closed on empty env", () => {
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
    assertZeroMoneyOffline(begin);

    const succeeded = applyStripeTestActivationTransition({
      from: "TEST_ACTIVATING",
      event: "MARK_ACTIVATION_SUCCEEDED",
      source: {},
      operatorActivationAuthorized: true,
    });
    expect(succeeded.ok).toBe(false);
    expect(succeeded.to).toBe("TEST_FAILED");
    expect(succeeded.reasonCodes).toContain(
      "cannot_enter_test_active_without_precheck_success"
    );
    expect(succeeded.reasonCodes).toContain(
      "failure_cannot_silently_become_active"
    );
    assertZeroMoneyOffline(succeeded);
  });
});

describe("SM regression invariants — (3) Missing TEST credentials cannot activate", () => {
  it("derived state is PRECHECK_BLOCKED and activation path stays fail-closed", () => {
    const report = buildStripeTestActivationStateMachineReport({});
    expect(report.state).toBe("PRECHECK_BLOCKED");
    expect(report.precheckSucceeded).toBe(false);
    expect(report.canEnterTestActivating).toBe(false);
    expect(report.canEnterTestActive).toBe(false);
    expect(report.providerGates).toBe("OFF");
    assertNoSecretEcho(report);

    assertCannotReachTestActive("READY_FOR_TEST", {}, true);
    assertCannotReachTestActive("DISABLED", {}, true);
  });

  it("partial credential sets remain blocked", () => {
    const partial = {
      STRIPE_MODE: "test",
      STRIPE_SECRET_KEY: FAKE_TEST_SECRET,
      // missing publishable + webhook + app url
    };
    const report = buildStripeTestActivationStateMachineReport(partial);
    expect(report.state).toBe("PRECHECK_BLOCKED");
    expect(report.precheckSucceeded).toBe(false);
    assertNoSecretEcho(report);

    const begin = applyStripeTestActivationTransition({
      from: "READY_FOR_TEST",
      event: "BEGIN_ACTIVATION",
      source: partial,
      operatorActivationAuthorized: true,
    });
    expect(begin.ok).toBe(false);
    expect(begin.to).toBe("PRECHECK_BLOCKED");
    assertZeroMoneyOffline(begin);
  });
});

describe("SM regression invariants — (4) Invalid fixture / shape cannot activate", () => {
  it("mixed LIVE publishable + TEST secret cannot activate", () => {
    const env = testCredentialEnv({
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: FAKE_LIVE_PUBLISHABLE,
    });
    const report = buildStripeTestActivationStateMachineReport(env);
    expect(report.state).toBe("PRECHECK_BLOCKED");
    expect(report.precheckSucceeded).toBe(false);
    assertNoSecretEcho(report);

    const begin = applyStripeTestActivationTransition({
      from: "READY_FOR_TEST",
      event: "BEGIN_ACTIVATION",
      source: env,
      operatorActivationAuthorized: true,
    });
    expect(begin.ok).toBe(false);
    expect(begin.to).not.toBe("TEST_ACTIVE");
    expect(begin.to).not.toBe("TEST_ACTIVATING");
    assertZeroMoneyOffline(begin);
  });

  it("secret live prefix with declared test mode cannot activate", () => {
    const env = testCredentialEnv({
      STRIPE_SECRET_KEY: FAKE_LIVE_SECRET,
      STRIPE_MODE: "test",
    });
    const report = buildStripeTestActivationStateMachineReport(env);
    expect(report.state).toBe("PRECHECK_BLOCKED");
    assertNoSecretEcho(report);

    const succeeded = applyStripeTestActivationTransition({
      from: "TEST_ACTIVATING",
      event: "MARK_ACTIVATION_SUCCEEDED",
      source: env,
      operatorActivationAuthorized: true,
    });
    expect(succeeded.ok).toBe(false);
    expect(succeeded.to).toBe("TEST_FAILED");
    expect(succeeded.to).not.toBe("TEST_ACTIVE");
    assertZeroMoneyOffline(succeeded);
  });
});

describe("SM regression invariants — (5) LIVE configuration cannot enter TEST_ACTIVE", () => {
  it("LIVE mode blocks begin and success mark", () => {
    const env = testCredentialEnv({
      STRIPE_MODE: "live",
      STRIPE_SECRET_KEY: FAKE_LIVE_SECRET,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: FAKE_LIVE_PUBLISHABLE,
    });
    expect(resolveStripeTestActivationState(env)).toBe("PRECHECK_BLOCKED");

    const begin = applyStripeTestActivationTransition({
      from: "READY_FOR_TEST",
      event: "BEGIN_ACTIVATION",
      source: env,
      operatorActivationAuthorized: true,
    });
    expect(begin.ok).toBe(false);
    expect(begin.to).toBe("PRECHECK_BLOCKED");
    expect(begin.reasonCodes).toContain("live_cannot_enter_test_activation");
    assertZeroMoneyOffline(begin);

    const succeeded = applyStripeTestActivationTransition({
      from: "TEST_ACTIVATING",
      event: "MARK_ACTIVATION_SUCCEEDED",
      source: env,
      operatorActivationAuthorized: true,
    });
    expect(succeeded.ok).toBe(false);
    expect(succeeded.to).toBe("TEST_FAILED");
    expect(succeeded.reasonCodes).toContain("live_cannot_enter_test_activation");
    expect(succeeded.reasonCodes).toContain(
      "failure_cannot_silently_become_active"
    );
    assertZeroMoneyOffline(succeeded);
  });
});

describe("SM regression invariants — (6) Repeated activation is deterministic", () => {
  it("identical inputs yield identical transition results", () => {
    const env = testCredentialEnv();
    const a = applyStripeTestActivationTransition({
      from: "READY_FOR_TEST",
      event: "BEGIN_ACTIVATION",
      source: env,
      operatorActivationAuthorized: true,
    });
    const b = applyStripeTestActivationTransition({
      from: "READY_FOR_TEST",
      event: "BEGIN_ACTIVATION",
      source: env,
      operatorActivationAuthorized: true,
    });
    expect(a).toEqual(b);
    expect(a.to).toBe("TEST_ACTIVATING");

    const active1 = applyStripeTestActivationTransition({
      from: "TEST_ACTIVATING",
      event: "MARK_ACTIVATION_SUCCEEDED",
      source: env,
      operatorActivationAuthorized: true,
    });
    const active2 = applyStripeTestActivationTransition({
      from: "TEST_ACTIVATING",
      event: "MARK_ACTIVATION_SUCCEEDED",
      source: env,
      operatorActivationAuthorized: true,
    });
    expect(active1).toEqual(active2);
    expect(active1.to).toBe("TEST_ACTIVE");

    const idem = applyStripeTestActivationTransition({
      from: "TEST_ACTIVE",
      event: "BEGIN_ACTIVATION",
      source: env,
      operatorActivationAuthorized: true,
    });
    expect(idem.ok).toBe(true);
    expect(idem.idempotent).toBe(true);
    expect(idem.to).toBe("TEST_ACTIVE");
    assertZeroMoneyOffline(idem);
  });

  it("report builders are byte-stable across repeats", () => {
    const env = testCredentialEnv();
    const r1 = buildStripeTestActivationStateMachineReport(env);
    const r2 = buildStripeTestActivationStateMachineReport(env);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
    expect(r1.state).toBe("READY_FOR_TEST");
  });
});

describe("SM regression invariants — (7) Failed activation remains fail-closed", () => {
  it("TEST_FAILED cannot promote to TEST_ACTIVE via success or begin", () => {
    const env = testCredentialEnv();
    const failed = applyStripeTestActivationTransition({
      from: "TEST_ACTIVATING",
      event: "MARK_ACTIVATION_FAILED",
      source: env,
      operatorActivationAuthorized: true,
    });
    expect(failed.to).toBe("TEST_FAILED");

    const sneakSuccess = applyStripeTestActivationTransition({
      from: "TEST_FAILED",
      event: "MARK_ACTIVATION_SUCCEEDED",
      source: env,
      operatorActivationAuthorized: true,
    });
    expect(sneakSuccess.ok).toBe(false);
    expect(sneakSuccess.to).toBe("TEST_FAILED");
    assertZeroMoneyOffline(sneakSuccess);

    const sneakBegin = applyStripeTestActivationTransition({
      from: "TEST_FAILED",
      event: "BEGIN_ACTIVATION",
      source: env,
      operatorActivationAuthorized: true,
    });
    expect(sneakBegin.ok).toBe(false);
    expect(sneakBegin.to).toBe("TEST_FAILED");
    assertZeroMoneyOffline(sneakBegin);

    expect(
      canTransitionStripeTestActivationState("TEST_FAILED", "TEST_ACTIVE")
    ).toBe(false);
  });
});

describe("SM regression invariants — (8) Deactivation is deterministic", () => {
  it("DEACTIVATE from ACTIVE/FAILED/ACTIVATING is stable and idempotent", () => {
    const env = testCredentialEnv();
    for (const from of [
      "TEST_ACTIVE",
      "TEST_FAILED",
      "TEST_ACTIVATING",
    ] as const) {
      const d1 = applyStripeTestActivationTransition({
        from,
        event: "DEACTIVATE",
        source: env,
      });
      const d2 = applyStripeTestActivationTransition({
        from,
        event: "DEACTIVATE",
        source: env,
      });
      expect(d1).toEqual(d2);
      expect(d1.ok).toBe(true);
      expect(d1.to).toBe("TEST_DEACTIVATED");
      assertZeroMoneyOffline(d1);
    }

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
    assertZeroMoneyOffline(reset);
  });
});

describe("SM regression invariants — (9) Validation cannot call Stripe", () => {
  it("SM source has no network / Stripe SDK / money hooks", () => {
    const src = readFileSync(SM_SOURCE, "utf8");
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/stripe\.com/i);
    expect(src).not.toMatch(/api\.stripe/i);
    expect(src).not.toMatch(/new\s+Stripe\b/);
    expect(src).not.toMatch(/createRefund|paymentIntents\.create/i);
    expect(src).not.toMatch(/https?:\/\//);
    expect(src).toContain("THIS MODULE DOES NOT ACTIVATE STRIPE");
    expect(src).toContain("STRIPE_CALLS = 0");
  });

  it("transition + report paths always report networkStripeCalls=0", () => {
    const env = testCredentialEnv();
    const report = buildStripeTestActivationStateMachineReport(env);
    expect(report.networkStripeCalls).toBe(0);

    for (const event of [
      "EVALUATE_PRECHECK",
      "BEGIN_ACTIVATION",
      "MARK_ACTIVATION_SUCCEEDED",
      "MARK_ACTIVATION_FAILED",
      "DEACTIVATE",
      "RESET",
    ] as const) {
      const result = applyStripeTestActivationTransition({
        from: "READY_FOR_TEST",
        event,
        source: env,
        operatorActivationAuthorized: true,
      });
      expect(result.networkStripeCalls).toBe(0);
      assertZeroMoneyOffline(result);
    }
  });
});

describe("SM regression invariants — (10) State inspection cannot move money", () => {
  it("inspection helpers never claim money movement or DB writes", () => {
    const env = testCredentialEnv();
    const report = buildStripeTestActivationStateMachineReport(env);
    expect(report.moneyMovement).toBe(0);
    expect(report.productionDbWrites).toBe(0);
    expect(report.activationPerformed).toBe(false);
    expect(STRIPE_TEST_ACTIVATION_PERFORMED).toBe(false);
    expect(STRIPE_TEST_ACTIVATION_PROVIDER_EXECUTION_ENTRYPOINTS).toEqual([]);
    expect(resolveStripeTestActivationState(env)).toBe("READY_FOR_TEST");

    // Re-evaluate while already READY does not invent ACTIVE.
    const reeval = applyStripeTestActivationTransition({
      from: "READY_FOR_TEST",
      event: "EVALUATE_PRECHECK",
      source: env,
    });
    expect(reeval.to).toBe("READY_FOR_TEST");
    expect(reeval.moneyMovement).toBe(0);
    expect(reeval.productionDbWrites).toBe(0);
    assertZeroMoneyOffline(reeval);
  });
});

describe("SM regression invariants — (11) Secrets never appear in results/errors", () => {
  it("reports and transitions never echo credential material", () => {
    const env = testCredentialEnv();
    const liveEnv = testCredentialEnv({
      STRIPE_MODE: "live",
      STRIPE_SECRET_KEY: FAKE_LIVE_SECRET,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: FAKE_LIVE_PUBLISHABLE,
    });

    assertNoSecretEcho(buildStripeTestActivationStateMachineReport(env));
    assertNoSecretEcho(buildStripeTestActivationStateMachineReport(liveEnv));
    assertNoSecretEcho(buildStripeTestActivationStateMachineReport({}));

    for (const source of [env, liveEnv, {}]) {
      const result = applyStripeTestActivationTransition({
        from: "READY_FOR_TEST",
        event: "BEGIN_ACTIVATION",
        source,
        operatorActivationAuthorized: true,
      });
      assertNoSecretEcho(result);
      assertNoSecretEcho(result.reasonCodes);
      assertNoSecretEcho(result.note);
    }
  });
});

describe("SM regression invariants — (12) Provider gates remain OFF unless separately authorized", () => {
  it("structural authorization stays false and gates stay OFF on ready path", () => {
    expect(STRIPE_TEST_ACTIVATION_OPERATOR_AUTHORIZED).toBe(false);
    expect(STRIPE_TEST_ACTIVATION_PERFORMED).toBe(false);

    const env = testCredentialEnv();
    const report = buildStripeTestActivationStateMachineReport(env);
    expect(report.state).toBe("READY_FOR_TEST");
    expect(report.providerGates).toBe("OFF");
    expect(report.operatorActivationAuthorized).toBe(false);
    expect(report.canEnterTestActivating).toBe(false);
    expect(report.canEnterTestActive).toBe(false);

    const unauthorizedBegin = applyStripeTestActivationTransition({
      from: "READY_FOR_TEST",
      event: "BEGIN_ACTIVATION",
      source: env,
    });
    expect(unauthorizedBegin.ok).toBe(false);
    expect(unauthorizedBegin.to).toBe("READY_FOR_TEST");
    expect(unauthorizedBegin.reasonCodes).toContain(
      "operator_activation_not_authorized"
    );
    expect(unauthorizedBegin.providerGates).toBe("OFF");
    assertZeroMoneyOffline(unauthorizedBegin);

    // Gate evaluator remains fail-closed for default env (no process mutation).
    const gate = evaluatePartialRefundProviderMoneyGate(env);
    expect(gate.ok).toBe(false);
  });

  it("unsafe gate starting env cannot enter activation path", () => {
    const env = testCredentialEnv({
      [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV]: "true",
      [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV]:
        PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_VALUE,
      UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_ALLOW_IN_NON_PRODUCTION:
        PARTIAL_REFUND_PROVIDER_MONEY_NON_PRODUCTION_FIXTURE_TOKEN,
      [PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV]: "live",
      [PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV]:
        PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_VALUE,
      NODE_ENV: "test",
    });
    const report = buildStripeTestActivationStateMachineReport(env);
    expect(report.state).toBe("PRECHECK_BLOCKED");
    expect(report.providerGates).toBe("OFF");
    expect(report.canEnterTestActive).toBe(false);

    const begin = applyStripeTestActivationTransition({
      from: "READY_FOR_TEST",
      event: "BEGIN_ACTIVATION",
      source: env,
      operatorActivationAuthorized: true,
    });
    expect(begin.ok).toBe(false);
    expect(begin.to).not.toBe("TEST_ACTIVATING");
    expect(begin.providerGates).toBe("OFF");
    assertZeroMoneyOffline(begin);
  });
});

describe("SM regression invariants — supported state surface", () => {
  it("exposes only the canonical seven states", () => {
    expect([...STRIPE_TEST_ACTIVATION_STATES]).toEqual([
      "DISABLED",
      "PRECHECK_BLOCKED",
      "READY_FOR_TEST",
      "TEST_ACTIVATING",
      "TEST_ACTIVE",
      "TEST_FAILED",
      "TEST_DEACTIVATED",
    ]);
  });

  it("PRECHECK_BLOCKED cannot jump to TEST_ACTIVE", () => {
    expect(
      canTransitionStripeTestActivationState("PRECHECK_BLOCKED", "TEST_ACTIVE")
    ).toBe(false);
    const sneak = applyStripeTestActivationTransition({
      from: "PRECHECK_BLOCKED",
      event: "MARK_ACTIVATION_SUCCEEDED",
      source: testCredentialEnv(),
      operatorActivationAuthorized: true,
    });
    expect(sneak.ok).toBe(false);
    expect(sneak.to).toBe("PRECHECK_BLOCKED");
    assertZeroMoneyOffline(sneak);
  });
});
