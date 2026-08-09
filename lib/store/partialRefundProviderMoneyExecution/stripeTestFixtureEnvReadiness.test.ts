/**
 * Stripe TEST fixture env readiness — deterministic NON-SECRET fixtures only.
 * Never network / never live keys / never activates process.env gates.
 */

import { describe, expect, it } from "vitest";
import {
  PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_VALUE,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_NON_PRODUCTION_FIXTURE_TOKEN,
  PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_VALUE,
} from "./index";
import {
  buildStripeTestFixtureEnvReadinessReport,
  isStripeTestFixtureEnvReadyForIsolatedPrep,
  STRIPE_TEST_FIXTURE_ENV_READINESS_VERSION,
} from "./stripeTestFixtureEnvReadiness";

function testShapeEnv(
  extra: Record<string, string | undefined> = {}
): Record<string, string | undefined> {
  return {
    NODE_ENV: "test",
    STRIPE_MODE: "test",
    STRIPE_SECRET_KEY: "sk_test_INVALID_FIXTURE_ONLY_NOT_A_SECRET",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_INVALID_FIXTURE_ONLY_NOT_A_SECRET",
    STRIPE_WEBHOOK_SECRET: "whsec_INVALID_FIXTURE_ONLY_NOT_A_SECRET",
    NEXT_PUBLIC_APP_URL: "https://example.test",
    ...extra,
  };
}

describe("stripeTestFixtureEnvReadiness", () => {
  it("reports operator_credentials_required when Stripe TEST config absent", () => {
    const report = buildStripeTestFixtureEnvReadinessReport({
      NODE_ENV: "test",
    });
    expect(report.version).toBe(STRIPE_TEST_FIXTURE_ENV_READINESS_VERSION);
    expect(report.verdict).toBe("operator_credentials_required");
    expect(report.stripeTestConfigShapeReady).toBe(false);
    expect(report.liveKeyPrefixDetected).toBe(false);
    expect(report.dedicatedGateCurrentlySatisfied).toBe(false);
    expect(report.executionModeCurrent).toBe("off");
    expect(report.productionExecAckPresent).toBe(false);
    expect(report.missingEnvNames).toContain("STRIPE_SECRET_KEY");
    expect(report.missingEnvNames).toContain("STRIPE_MODE");
    expect(report.operatorInputsRequired.some((i) => i.envName === "STRIPE_SECRET_KEY")).toBe(
      true
    );
    expect(isStripeTestFixtureEnvReadyForIsolatedPrep({ NODE_ENV: "test" })).toBe(
      false
    );
    // Never surface secret material — report must not embed raw key bodies
    expect(JSON.stringify(report)).not.toMatch(/sk_test_[A-Za-z0-9]{8,}/);
    expect(JSON.stringify(report)).not.toMatch(/sk_live_[A-Za-z0-9]{8,}/);
    expect(JSON.stringify(report)).not.toMatch(/whsec_[A-Za-z0-9]{8,}/);
  });

  it("accepts TEST config shape while gates remain OFF", () => {
    const env = testShapeEnv();
    const report = buildStripeTestFixtureEnvReadinessReport(env);
    expect(report.verdict).toBe(
      "stripe_test_config_shape_ready_gates_remain_off"
    );
    expect(report.stripeTestConfigShapeReady).toBe(true);
    expect(report.stripeModeDetected).toBe("test");
    expect(report.dedicatedGateCurrentlySatisfied).toBe(false);
    expect(report.executionModeCurrent).toBe("off");
    expect(report.fixturePackGaps.length).toBeGreaterThan(0);
    expect(isStripeTestFixtureEnvReadyForIsolatedPrep(env)).toBe(true);
  });

  it("blocks live key prefix shapes", () => {
    const report = buildStripeTestFixtureEnvReadinessReport(
      testShapeEnv({
        STRIPE_MODE: "live",
        STRIPE_SECRET_KEY: "sk_live_INVALID_FIXTURE_ONLY_NOT_A_SECRET",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
          "pk_live_INVALID_FIXTURE_ONLY_NOT_A_SECRET",
        STRIPE_LIVE_PAYMENTS_ENABLED: "true",
        STRIPE_PRODUCTION_GATE_ACK:
          "I_UNDERSTAND_LIVE_STRIPE_CHARGES_REAL_MONEY",
        STRIPE_ALLOW_LIVE_IN_NON_PRODUCTION:
          "commerce-live-payment-production-gate-fixture-v1",
      })
    );
    expect(report.liveKeyPrefixDetected).toBe(true);
    expect(report.verdict).toBe("blocked_live_or_mixed_stripe_shape");
    expect(isStripeTestFixtureEnvReadyForIsolatedPrep(
      testShapeEnv({
        STRIPE_MODE: "live",
        STRIPE_SECRET_KEY: "sk_live_INVALID_FIXTURE_ONLY_NOT_A_SECRET",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
          "pk_live_INVALID_FIXTURE_ONLY_NOT_A_SECRET",
      })
    )).toBe(false);
  });

  it("flags currently-on dedicated gate / non-off mode as misconfigured for prep", () => {
    const env = testShapeEnv({
      [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV]: "true",
      [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV]:
        PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_VALUE,
      UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_ALLOW_IN_NON_PRODUCTION:
        PARTIAL_REFUND_PROVIDER_MONEY_NON_PRODUCTION_FIXTURE_TOKEN,
      [PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV]: "test",
    });
    const report = buildStripeTestFixtureEnvReadinessReport(env);
    expect(report.dedicatedGateCurrentlySatisfied).toBe(true);
    expect(report.executionModeCurrent).toBe("test");
    expect(report.verdict).toBe("blocked_misconfigured");
    expect(report.issues).toContain("dedicated_provider_money_gate_currently_on");
    expect(report.issues).toContain("execution_mode_not_off:test");
  });

  it("flags production exec ACK present during TEST prep", () => {
    const report = buildStripeTestFixtureEnvReadinessReport(
      testShapeEnv({
        [PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV]:
          PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_VALUE,
      })
    );
    expect(report.productionExecAckPresent).toBe(true);
    expect(report.verdict).toBe("blocked_misconfigured");
    expect(report.issues).toContain(
      "production_exec_ack_present_during_test_prep"
    );
  });

  it("lists operator input names without values", () => {
    const report = buildStripeTestFixtureEnvReadinessReport({});
    const names = report.operatorInputsRequired.map((i) => i.envName);
    expect(names).toContain("STRIPE_SECRET_KEY");
    expect(names).toContain(PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV);
    expect(names).toContain(PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV);
    for (const input of report.operatorInputsRequired) {
      expect(input).not.toHaveProperty("value");
      expect(input.location.length).toBeGreaterThan(0);
    }
  });
});
