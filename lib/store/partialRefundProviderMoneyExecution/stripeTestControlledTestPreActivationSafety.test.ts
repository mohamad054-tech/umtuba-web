/**
 * Controlled Stripe TEST pre-activation safety — focused acceptance tests.
 * NETWORK_STRIPE_CALLS=0 / MONEY_MOVEMENT=0 / DB_WRITES=0.
 * No gate activation. No provider execution. No secret echo.
 * Real credentials are NOT required — FAKE/OFFLINE placeholders only.
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
  STRIPE_TEST_CONTROLLED_TEST_ACTIVATION_AUTHORIZED,
  STRIPE_TEST_CONTROLLED_TEST_PRE_ACTIVATION_ENVIRONMENT,
  STRIPE_TEST_CONTROLLED_TEST_PRE_ACTIVATION_PROVIDER_EXECUTION_ENTRYPOINTS,
  STRIPE_TEST_CONTROLLED_TEST_PRE_ACTIVATION_SAFETY_VERSION,
  buildStripeTestControlledTestPreActivationSafetyReport,
  isStripeTestControlledTestPreActivationCredentialReady,
  isStripeTestControlledTestPreActivationStructurallySafe,
} from "./stripeTestControlledTestPreActivationSafety";

const SAFETY_SOURCE = path.join(
  process.cwd(),
  "lib/store/partialRefundProviderMoneyExecution/stripeTestControlledTestPreActivationSafety.ts"
);

/** Distinct fake TEST credentials — must never appear in safety output. */
const FAKE_TEST_SECRET = "sk_test_PRE_ACTIVATION_FAKE_SECRET_VALUE_4k2m";
const FAKE_TEST_PUBLISHABLE =
  "pk_test_PRE_ACTIVATION_FAKE_PUBLISHABLE_VALUE_4k2m";
const FAKE_WEBHOOK = "whsec_PRE_ACTIVATION_FAKE_WEBHOOK_VALUE_4k2m";
const FAKE_LIVE_SECRET = "sk_live_PRE_ACTIVATION_FAKE_LIVE_SECRET_VALUE_4k2m";
const FAKE_LIVE_PUBLISHABLE =
  "pk_live_PRE_ACTIVATION_FAKE_LIVE_PUBLISHABLE_VALUE_4k2m";

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

describe("controlled TEST pre-activation — structural zero-money (no credentials)", () => {
  it("passes structural safety with empty env (CI-safe, no real credentials)", () => {
    const report = buildStripeTestControlledTestPreActivationSafetyReport({});
    expect(report.verdict).toBe(
      "pre_activation_zero_money_safe_gates_off_activation_forbidden"
    );
    expect(isStripeTestControlledTestPreActivationStructurallySafe({})).toBe(
      true
    );
    expect(isStripeTestControlledTestPreActivationCredentialReady({})).toBe(
      false
    );
    expect(report.activationAuthorized).toBe(false);
    expect(report.networkStripeCalls).toBe(0);
    expect(report.moneyMovement).toBe(0);
    expect(report.dbWrites).toBe(0);
    expect(report.providerGates).toBe("OFF");
    expect(report.gateState.gatesRemainOff).toBe(true);
    expect(report.fixtureChecks.schemaValid).toBe(true);
    expect(report.fixtureChecks.deterministic).toBe(true);
    expect(report.credentialPresence.allRequiredPresent).toBe(false);
    expect(report.offlinePreflightSafeToStartPrep).toBe(false);
    assertNoSecretEcho(report);
  });

  it("exposes version/environment and typed activation non-capability", () => {
    expect(STRIPE_TEST_CONTROLLED_TEST_ACTIVATION_AUTHORIZED).toBe(false);
    expect(
      STRIPE_TEST_CONTROLLED_TEST_PRE_ACTIVATION_PROVIDER_EXECUTION_ENTRYPOINTS
    ).toEqual([]);
    const report = buildStripeTestControlledTestPreActivationSafetyReport({});
    expect(report.version).toBe(
      STRIPE_TEST_CONTROLLED_TEST_PRE_ACTIVATION_SAFETY_VERSION
    );
    expect(report.environment).toBe(
      STRIPE_TEST_CONTROLLED_TEST_PRE_ACTIVATION_ENVIRONMENT
    );
    expect(report.environment).toContain("not_production");
    expect(report.providerExecutionStarted).toBe(false);
    expect(report.providerExecutionStartCapable).toBe(false);
  });
});

describe("controlled TEST pre-activation — TEST/LIVE fail-closed", () => {
  it("blocks live mode / live key prefixes with operator-safe errors", () => {
    const report = buildStripeTestControlledTestPreActivationSafetyReport(
      testCredentialEnv({
        STRIPE_MODE: "live",
        STRIPE_SECRET_KEY: FAKE_LIVE_SECRET,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: FAKE_LIVE_PUBLISHABLE,
      })
    );
    expect(report.verdict).toBe("blocked_live_or_test_live_mismatch");
    expect(report.liveOrMismatchDetected).toBe(true);
    expect(report.activationAuthorized).toBe(false);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        "stripe_mode_not_test",
        "secret_key_live_prefix",
        "publishable_key_live_prefix",
      ])
    );
    expect(report.operatorErrors.length).toBeGreaterThan(0);
    for (const err of report.operatorErrors) {
      expect(err.code.length).toBeGreaterThan(0);
      expect(err.message.length).toBeGreaterThan(0);
    }
    expect(
      isStripeTestControlledTestPreActivationStructurallySafe(
        testCredentialEnv({
          STRIPE_MODE: "live",
          STRIPE_SECRET_KEY: FAKE_LIVE_SECRET,
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: FAKE_LIVE_PUBLISHABLE,
        })
      )
    ).toBe(false);
    assertNoSecretEcho(report);
  });

  it("blocks obvious TEST/LIVE mismatch", () => {
    const report = buildStripeTestControlledTestPreActivationSafetyReport(
      testCredentialEnv({
        STRIPE_SECRET_KEY: FAKE_TEST_SECRET,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: FAKE_LIVE_PUBLISHABLE,
      })
    );
    expect(report.verdict).toBe("blocked_live_or_test_live_mismatch");
    expect(report.issues).toContain("obvious_test_live_mismatch");
    assertNoSecretEcho(report);
  });
});

describe("controlled TEST pre-activation — gate starting state", () => {
  it("blocks when dedicated gate is ON", () => {
    const env = testCredentialEnv({
      [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV]: "true",
      [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV]:
        PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_VALUE,
      UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_ALLOW_IN_NON_PRODUCTION:
        PARTIAL_REFUND_PROVIDER_MONEY_NON_PRODUCTION_FIXTURE_TOKEN,
      NODE_ENV: "test",
    });
    expect(evaluatePartialRefundProviderMoneyGate(env).ok).toBe(true);
    const report = buildStripeTestControlledTestPreActivationSafetyReport(env);
    expect(report.verdict).toBe(
      "blocked_provider_gate_starting_state_unsafe"
    );
    expect(report.issues).toContain("dedicated_provider_money_gate_on");
    expect(report.providerGates).toBe("OFF");
    expect(report.activationAuthorized).toBe(false);
    assertNoSecretEcho(report);
  });

  it("blocks when execution mode is not off", () => {
    const report = buildStripeTestControlledTestPreActivationSafetyReport(
      testCredentialEnv({
        [PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV]: "test",
      })
    );
    expect(report.verdict).toBe(
      "blocked_provider_gate_starting_state_unsafe"
    );
    expect(report.issues).toContain("execution_mode_not_off");
    assertNoSecretEcho(report);
  });

  it("blocks when production exec ACK present", () => {
    const report = buildStripeTestControlledTestPreActivationSafetyReport(
      testCredentialEnv({
        [PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV]:
          PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_VALUE,
      })
    );
    expect(report.verdict).toBe(
      "blocked_provider_gate_starting_state_unsafe"
    );
    expect(report.issues).toContain("production_exec_ack_present");
    assertNoSecretEcho(report);
  });
});

describe("controlled TEST pre-activation — credential readiness composition", () => {
  it("marks credential-ready with FAKE TEST shape while activation stays forbidden", () => {
    const env = testCredentialEnv();
    const report = buildStripeTestControlledTestPreActivationSafetyReport(env);
    expect(report.verdict).toBe(
      "pre_activation_zero_money_safe_gates_off_activation_forbidden"
    );
    expect(report.offlinePreflightSafeToStartPrep).toBe(true);
    expect(report.credentialPresence.testShapeAligned).toBe(true);
    expect(isStripeTestControlledTestPreActivationCredentialReady(env)).toBe(
      true
    );
    expect(report.activationAuthorized).toBe(false);
    expect(STRIPE_TEST_CONTROLLED_TEST_ACTIVATION_AUTHORIZED).toBe(false);
    assertNoSecretEcho(report);
  });

  it("report is deterministic for the same env", () => {
    const env = testCredentialEnv();
    const a = buildStripeTestControlledTestPreActivationSafetyReport(env);
    const b = buildStripeTestControlledTestPreActivationSafetyReport(env);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("controlled TEST pre-activation — acceptance matrix + source invariants", () => {
  it("acceptance matrix asserts zero-money and activation forbidden", () => {
    const report = buildStripeTestControlledTestPreActivationSafetyReport({});
    expect(report.acceptanceMatrix).toMatchObject({
      networkStripeCalls: 0,
      moneyMovement: 0,
      dbWrites: 0,
      providerGatesOff: true,
      executionModeOff: true,
      productionExecAckAbsent: true,
      fixtureSchemaValid: true,
      fixtureDeterministic: true,
      remotePersistenceUnauthorized: true,
      liveModeOrLiveKeyPrefixesAbsent: true,
      activationAuthorized: false,
      providerExecutionStartCapable: false,
      credentialPresenceReportedWithoutValues: true,
      offlinePreflightEvaluated: true,
    });
  });

  it("source has no network/stripe SDK/db write surfaces", () => {
    const src = readFileSync(SAFETY_SOURCE, "utf8");
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/\baxios\b/);
    expect(src).not.toMatch(/from\s+["']stripe["']/);
    expect(src).not.toMatch(/new\s+Stripe\b/);
    expect(src).not.toMatch(/\.refunds\.create\b/);
    expect(src).not.toMatch(/\binsert\s*\(/i);
    expect(src).not.toMatch(/\bupdate\s*\(/i);
    expect(src).not.toMatch(/\bupsert\s*\(/i);
    expect(src).not.toMatch(/executePartialRefundProviderMoney/);
    expect(src).not.toMatch(/runAdminExecutePartialRefundProviderMoney/);
    expect(src).toContain("activationAuthorized: false");
    expect(src).toContain("networkStripeCalls: 0");
    expect(src).toContain("moneyMovement: 0");
    expect(src).toContain("dbWrites: 0");
  });
});
