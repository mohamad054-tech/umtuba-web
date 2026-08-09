/**
 * Stripe TEST control plane hardening — focused acceptance tests.
 * NETWORK_STRIPE_CALLS=0 / MONEY_MOVEMENT=0 / PRODUCTION_DB_WRITES=0.
 * No gate activation. No provider execution. No secret echo.
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
} from "./index";
import {
  STRIPE_TEST_CONTROL_PLANE_ACTIVATION_PERFORMED,
  STRIPE_TEST_CONTROL_PLANE_ENVIRONMENT,
  STRIPE_TEST_CONTROL_PLANE_HARDENING_VERSION,
  STRIPE_TEST_CONTROL_PLANE_PROVIDER_EXECUTION_ENTRYPOINTS,
  buildStripeTestControlPlaneReport,
  getStripeTestControlPlaneBlockReasons,
  isStripeTestControlPlaneReady,
} from "./stripeTestControlPlaneHardening";

const CONTROL_PLANE_SOURCE = path.join(
  process.cwd(),
  "lib/store/partialRefundProviderMoneyExecution/stripeTestControlPlaneHardening.ts"
);

/** Distinct fake TEST credentials — must never appear in control-plane output. */
const FAKE_TEST_SECRET = "sk_test_CONTROL_PLANE_FAKE_SECRET_VALUE_3m8k";
const FAKE_TEST_PUBLISHABLE =
  "pk_test_CONTROL_PLANE_FAKE_PUBLISHABLE_VALUE_3m8k";
const FAKE_WEBHOOK = "whsec_CONTROL_PLANE_FAKE_WEBHOOK_VALUE_3m8k";
const FAKE_LIVE_SECRET = "sk_live_CONTROL_PLANE_FAKE_LIVE_SECRET_VALUE_3m8k";

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
  report: ReturnType<typeof buildStripeTestControlPlaneReport>
): void {
  expect(report.networkStripeCalls).toBe(0);
  expect(report.moneyMovement).toBe(0);
  expect(report.productionDbWrites).toBe(0);
  expect(report.providerGates).toBe("OFF");
  expect(report.activationPerformed).toBe(false);
  expect(report.activationAuthorizedByControlPlane).toBe(false);
  expect(report.providerExecutionStarted).toBe(false);
  expect(report.providerExecutionStartCapable).toBe(false);
  expect(report.acceptanceMatrix.networkStripeCalls).toBe(0);
  expect(report.acceptanceMatrix.moneyMovement).toBe(0);
  expect(report.acceptanceMatrix.productionDbWrites).toBe(0);
  expect(report.acceptanceMatrix.activationPerformed).toBe(false);
  expect(STRIPE_TEST_CONTROL_PLANE_ACTIVATION_PERFORMED).toBe(false);
  expect(STRIPE_TEST_CONTROL_PLANE_PROVIDER_EXECUTION_ENTRYPOINTS).toEqual([]);
  assertNoSecretEcho(report);
}

describe("stripe TEST control plane — READY contract", () => {
  it("returns READY with empty reasons when TEST prep prerequisites are met", () => {
    const report = buildStripeTestControlPlaneReport(testCredentialEnv());
    expect(report.status).toBe("READY");
    expect(report.reasons).toEqual([]);
    expect(report.missingPrerequisites).toEqual([]);
    expect(report.answers).toEqual({
      requiredTestConfigurationNamesPresent: true,
      modeTest: true,
      liveDisabled: true,
      providerGatesCorrectStartingState: true,
      fixturesValid: true,
      canActivationProceed: true,
    });
    expect(isStripeTestControlPlaneReady(testCredentialEnv())).toBe(true);
    expect(getStripeTestControlPlaneBlockReasons(testCredentialEnv())).toEqual(
      []
    );
    expect(report.version).toBe(STRIPE_TEST_CONTROL_PLANE_HARDENING_VERSION);
    expect(report.environment).toBe(STRIPE_TEST_CONTROL_PLANE_ENVIRONMENT);
    expect(report.environment).toContain("not_production");
    assertOfflineInvariants(report);
  });

  it("exposes required env NAMES only — never values", () => {
    const report = buildStripeTestControlPlaneReport(testCredentialEnv());
    expect(report.requiredEnvNames).toEqual([
      "STRIPE_MODE",
      "STRIPE_SECRET_KEY",
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "NEXT_PUBLIC_APP_URL",
    ]);
    assertOfflineInvariants(report);
  });
});

describe("stripe TEST control plane — NOT_READY reasons", () => {
  it("NOT_READY when required configuration names are missing", () => {
    const report = buildStripeTestControlPlaneReport({});
    expect(report.status).toBe("NOT_READY");
    expect(report.answers.requiredTestConfigurationNamesPresent).toBe(false);
    expect(report.answers.canActivationProceed).toBe(false);
    expect(report.reasons).toContain(
      "missing_required_test_configuration_names"
    );
    expect(
      report.missingPrerequisites.some(
        (m) => m.code === "missing_required_test_configuration_names"
      )
    ).toBe(true);
    expect(isStripeTestControlPlaneReady({})).toBe(false);
    assertOfflineInvariants(report);
  });

  it("NOT_READY when LIVE mode / live key prefix present", () => {
    const report = buildStripeTestControlPlaneReport(
      testCredentialEnv({
        STRIPE_MODE: "live",
        STRIPE_SECRET_KEY: FAKE_LIVE_SECRET,
      })
    );
    expect(report.status).toBe("NOT_READY");
    expect(report.answers.modeTest).toBe(false);
    expect(report.answers.liveDisabled).toBe(false);
    expect(report.answers.canActivationProceed).toBe(false);
    expect(report.reasons).toContain("stripe_mode_not_test");
    expect(report.reasons).toContain("live_not_disabled");
    assertOfflineInvariants(report);
  });

  it("NOT_READY when provider gate starting state is unsafe", () => {
    const report = buildStripeTestControlPlaneReport(
      testCredentialEnv({
        [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV]: "true",
        [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV]:
          PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_VALUE,
        UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_ALLOW_IN_NON_PRODUCTION:
          PARTIAL_REFUND_PROVIDER_MONEY_NON_PRODUCTION_FIXTURE_TOKEN,
        NODE_ENV: "test",
      })
    );
    expect(report.status).toBe("NOT_READY");
    expect(report.answers.providerGatesCorrectStartingState).toBe(false);
    expect(report.answers.canActivationProceed).toBe(false);
    expect(report.reasons).toContain("provider_gates_starting_state_unsafe");
    assertOfflineInvariants(report);
  });

  it("NOT_READY when execution mode is not off", () => {
    const report = buildStripeTestControlPlaneReport(
      testCredentialEnv({
        [PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV]: "test",
      })
    );
    expect(report.status).toBe("NOT_READY");
    expect(report.answers.providerGatesCorrectStartingState).toBe(false);
    expect(report.reasons).toContain("provider_gates_starting_state_unsafe");
    assertOfflineInvariants(report);
  });

  it("NOT_READY when production exec ACK is present", () => {
    const report = buildStripeTestControlPlaneReport(
      testCredentialEnv({
        [PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV]:
          PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_VALUE,
      })
    );
    expect(report.status).toBe("NOT_READY");
    expect(report.answers.providerGatesCorrectStartingState).toBe(false);
    expect(report.reasons).toContain("provider_gates_starting_state_unsafe");
    assertOfflineInvariants(report);
  });

  it("reasons are deterministic across repeated calls", () => {
    const env = testCredentialEnv({ STRIPE_MODE: "live" });
    const a = getStripeTestControlPlaneBlockReasons(env);
    const b = getStripeTestControlPlaneBlockReasons(env);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
  });
});

describe("stripe TEST control plane — hard offline guarantees", () => {
  it("source has no Stripe network / fetch / money movement hooks", () => {
    const src = readFileSync(CONTROL_PLANE_SOURCE, "utf8");
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/stripe\.com/i);
    expect(src).not.toMatch(/new\s+Stripe\b/);
    expect(src).not.toMatch(/createRefund|refunds\.create/i);
    expect(src).toMatch(/NETWORK_STRIPE_CALLS = 0/);
    expect(src).toMatch(/MONEY_MOVEMENT = 0/);
    expect(src).toMatch(/PRODUCTION_DB_WRITES = 0/);
  });

  it("never authorizes or performs activation", () => {
    const report = buildStripeTestControlPlaneReport(testCredentialEnv());
    expect(report.status).toBe("READY");
    expect(report.activationAuthorizedByControlPlane).toBe(false);
    expect(report.activationPerformed).toBe(false);
    expect(report.providerExecutionStartCapable).toBe(false);
    assertOfflineInvariants(report);
  });
});
