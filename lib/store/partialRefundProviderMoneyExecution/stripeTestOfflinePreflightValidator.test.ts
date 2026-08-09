/**
 * Offline Stripe TEST preflight validator — focused acceptance tests.
 * NETWORK_CALLS=0 / STRIPE_CALLS=0 / DB_WRITES=0.
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
  evaluatePartialRefundProviderMoneyGate,
} from "./index";
import {
  STRIPE_TEST_OFFLINE_PREFLIGHT_ENVIRONMENT,
  STRIPE_TEST_OFFLINE_PREFLIGHT_PROVIDER_EXECUTION_ENTRYPOINTS,
  STRIPE_TEST_OFFLINE_PREFLIGHT_REQUIRED_ENV_NAMES,
  STRIPE_TEST_OFFLINE_PREFLIGHT_VALIDATOR_VERSION,
  buildStripeTestOfflinePreflightReport,
  isStripeTestOfflinePreflightSafeToStart,
} from "./stripeTestOfflinePreflightValidator";

const VALIDATOR_SOURCE = path.join(
  process.cwd(),
  "lib/store/partialRefundProviderMoneyExecution/stripeTestOfflinePreflightValidator.ts"
);

/** Distinct fake TEST credentials — must never appear in validator output. */
const FAKE_TEST_SECRET = "sk_test_OFFLINE_PREFLIGHT_FAKE_SECRET_VALUE_9x7q";
const FAKE_TEST_PUBLISHABLE =
  "pk_test_OFFLINE_PREFLIGHT_FAKE_PUBLISHABLE_VALUE_9x7q";
const FAKE_WEBHOOK = "whsec_OFFLINE_PREFLIGHT_FAKE_WEBHOOK_VALUE_9x7q";

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
  expect(blob).not.toContain("sk_test_");
  expect(blob).not.toContain("pk_test_");
  expect(blob).not.toContain("sk_live_");
  expect(blob).not.toContain("pk_live_");
  expect(blob).not.toContain("whsec_");
}

describe("stripe TEST offline preflight — required env NAMES + presence", () => {
  it("exposes required TEST env variable NAMES without values", () => {
    expect(STRIPE_TEST_OFFLINE_PREFLIGHT_REQUIRED_ENV_NAMES).toEqual([
      "STRIPE_MODE",
      "STRIPE_SECRET_KEY",
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "NEXT_PUBLIC_APP_URL",
    ]);
    const report = buildStripeTestOfflinePreflightReport(testCredentialEnv());
    expect(report.credentialPresence.requiredEnvNames).toEqual([
      ...STRIPE_TEST_OFFLINE_PREFLIGHT_REQUIRED_ENV_NAMES,
    ]);
    expect(report.version).toBe(STRIPE_TEST_OFFLINE_PREFLIGHT_VALIDATOR_VERSION);
    expect(report.environment).toBe(STRIPE_TEST_OFFLINE_PREFLIGHT_ENVIRONMENT);
    expect(report.environment).toContain("not_production");
    assertNoSecretEcho(report);
  });

  it("reports credential presence as booleans only", () => {
    const report = buildStripeTestOfflinePreflightReport(testCredentialEnv());
    expect(report.credentialPresence.allRequiredPresent).toBe(true);
    expect(report.credentialPresence.stripeModePresent).toBe(true);
    expect(report.credentialPresence.stripeSecretKeyPresent).toBe(true);
    expect(report.credentialPresence.publishableKeyPresent).toBe(true);
    expect(report.credentialPresence.webhookSecretPresent).toBe(true);
    expect(report.credentialPresence.appOriginPresent).toBe(true);
    assertNoSecretEcho(report);
  });
});

describe("stripe TEST offline preflight — mode + fail-closed", () => {
  it("passes when TEST mode selected, credentials present, gates OFF", () => {
    const env = testCredentialEnv();
    const report = buildStripeTestOfflinePreflightReport(env);
    expect(report.verdict).toBe(
      "offline_preflight_pass_safe_to_start_controlled_stripe_test_prep"
    );
    expect(report.modeChecks.testModeSelected).toBe(true);
    expect(report.modeChecks.liveModeSelected).toBe(false);
    expect(report.modeChecks.modesAlignedTest).toBe(true);
    expect(report.gateStartingState.startingStateSafe).toBe(true);
    expect(report.gateStartingState.gatesRemainOff).toBe(true);
    expect(report.networkCalls).toBe(0);
    expect(report.stripeCalls).toBe(0);
    expect(report.dbWrites).toBe(0);
    expect(report.providerExecutionStarted).toBe(false);
    expect(report.providerExecutionStartCapable).toBe(false);
    expect(isStripeTestOfflinePreflightSafeToStart(env)).toBe(true);
    expect(evaluatePartialRefundProviderMoneyGate(env).ok).toBe(false);
    assertNoSecretEcho(report);
  });

  it("fails closed when credentials missing", () => {
    const report = buildStripeTestOfflinePreflightReport({});
    expect(report.verdict).toBe("blocked_missing_test_credentials");
    expect(report.credentialPresence.allRequiredPresent).toBe(false);
    expect(report.gateStartingState.gatesRemainOff).toBe(true);
    expect(isStripeTestOfflinePreflightSafeToStart({})).toBe(false);
    assertNoSecretEcho(report);
  });

  it("fails closed on obvious TEST/LIVE mismatch", () => {
    const env = testCredentialEnv({
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
        "pk_live_OFFLINE_PREFLIGHT_FAKE_LIVE_PUBLISHABLE",
    });
    const report = buildStripeTestOfflinePreflightReport(env);
    expect(report.verdict).toBe(
      "blocked_test_live_mismatch_or_live_selected"
    );
    expect(report.modeChecks.obviousTestLiveMismatch).toBe(true);
    expect(isStripeTestOfflinePreflightSafeToStart(env)).toBe(false);
    const blob = JSON.stringify(report);
    expect(blob).not.toContain("pk_live_OFFLINE_PREFLIGHT_FAKE_LIVE_PUBLISHABLE");
    expect(blob).not.toContain(FAKE_TEST_SECRET);
  });

  it("fails closed when LIVE mode selected", () => {
    const env = testCredentialEnv({
      STRIPE_MODE: "live",
      STRIPE_SECRET_KEY: "sk_live_OFFLINE_PREFLIGHT_FAKE_LIVE_SECRET",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
        "pk_live_OFFLINE_PREFLIGHT_FAKE_LIVE_PUBLISHABLE",
    });
    const report = buildStripeTestOfflinePreflightReport(env);
    expect(report.verdict).toBe(
      "blocked_test_live_mismatch_or_live_selected"
    );
    expect(report.modeChecks.liveModeSelected).toBe(true);
    expect(isStripeTestOfflinePreflightSafeToStart(env)).toBe(false);
    const blob = JSON.stringify(report);
    expect(blob).not.toContain("sk_live_OFFLINE_PREFLIGHT_FAKE_LIVE_SECRET");
    expect(blob).not.toContain("pk_live_OFFLINE_PREFLIGHT_FAKE_LIVE_PUBLISHABLE");
    expect(blob).not.toContain(FAKE_TEST_SECRET);
  });
});

describe("stripe TEST offline preflight — fixture + gate starting state", () => {
  it("validates fixture schema and deterministic configuration", () => {
    const report = buildStripeTestOfflinePreflightReport(testCredentialEnv());
    expect(report.fixtureChecks.schemaValid).toBe(true);
    expect(report.fixtureChecks.deterministic).toBe(true);
    expect(report.fixtureChecks.stripeModeRequiredTest).toBe(true);
    expect(report.fixtureChecks.remotePersistenceAuthorized).toBe(false);
    expect(report.fixtureChecks.providerExecutionsEmpty).toBe(true);
    assertNoSecretEcho(report);
  });

  it("requires provider gates OFF as starting state", () => {
    const env = testCredentialEnv({
      [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV]: "true",
      [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV]:
        PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_VALUE,
      UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_ALLOW_IN_NON_PRODUCTION:
        PARTIAL_REFUND_PROVIDER_MONEY_NON_PRODUCTION_FIXTURE_TOKEN,
      [PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV]: "test",
    });
    const report = buildStripeTestOfflinePreflightReport(env);
    expect(report.gateStartingState.startingStateSafe).toBe(false);
    expect(report.verdict).toBe(
      "blocked_provider_gate_starting_state_unsafe"
    );
    expect(isStripeTestOfflinePreflightSafeToStart(env)).toBe(false);
    assertNoSecretEcho(report);
  });

  it("blocks when production exec ACK present", () => {
    const env = testCredentialEnv({
      [PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV]:
        "I_UNDERSTAND_PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXECUTION",
    });
    const report = buildStripeTestOfflinePreflightReport(env);
    expect(report.gateStartingState.productionExecAckPresent).toBe(true);
    expect(report.verdict).toBe(
      "blocked_provider_gate_starting_state_unsafe"
    );
    assertNoSecretEcho(report);
  });
});

describe("stripe TEST offline preflight — non-execution + secret safety", () => {
  it("cannot start provider execution (structural + report flags)", () => {
    expect(STRIPE_TEST_OFFLINE_PREFLIGHT_PROVIDER_EXECUTION_ENTRYPOINTS).toEqual(
      []
    );
    const source = readFileSync(VALIDATOR_SOURCE, "utf8");
    expect(source).not.toMatch(/runAdminExecutePartialRefundProviderMoney/);
    expect(source).not.toMatch(/executeCommittedPartialRefundProviderMoney/);
    expect(source).not.toMatch(/executePartialRefundProviderMoney/);
    expect(source).not.toMatch(/createStripePartialRefundProviderPort/);
    expect(source).not.toMatch(/from ["']stripe["']/);
    expect(source).not.toMatch(/fetch\s*\(/);
    expect(source).not.toMatch(/https?:\/\//);
    const report = buildStripeTestOfflinePreflightReport(testCredentialEnv());
    expect(report.providerExecutionStarted).toBe(false);
    expect(report.providerExecutionStartCapable).toBe(false);
  });

  it("never embeds secrets in report JSON", () => {
    const report = buildStripeTestOfflinePreflightReport(testCredentialEnv());
    assertNoSecretEcho(report);
    assertNoSecretEcho(report.issues);
    assertNoSecretEcho(report.note);
  });
});
