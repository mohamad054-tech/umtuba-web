/**
 * Stripe TEST external-prerequisite OPERATOR PACKET — focused acceptance tests.
 * STRIPE_CALLS=0 / MONEY_MOVEMENT=0 / DB_WRITES=0 / STRIPE_ACTIVATED=NO /
 * PROVIDER_GATES=OFF / STRIPE_EXECUTION_AUTHORIZED=NO.
 * No network. No secret echo. No real Stripe execution.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  FIXTURE_VALIDATION_RULES,
  LIVE_CREDENTIAL_REJECTION,
  REQUIRED_FIXTURE_FIELDS,
  REQUIRED_TEST_CONFIGURATION_NAMES,
  SAFE_STORAGE_INJECTION_BOUNDARY,
  SECRET_REDACTION_RULES,
  STRIPE_TEST_EXTERNAL_PREREQUISITE_CENTRAL_INTEGRATION_STILL_REQUIRED,
  STRIPE_TEST_EXTERNAL_PREREQUISITE_DEFAULT_OPERATOR_FIXTURES,
  STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_ACTIVATION_PERFORMED,
  STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_ENVIRONMENT,
  STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_EXECUTION_AUTHORIZED,
  STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_PROVIDER_EXECUTION_ENTRYPOINTS,
  STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_VERDICTS,
  STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_VERSION,
  TEST_ONLY_VALIDATION,
  buildExternalPrerequisitePostTestCleanupRequirements,
  buildExternalPrerequisitePreExecutionChecklist,
  buildStripeTestExternalPrerequisiteOperatorPacketReport,
  isStripeTestExternalPrerequisiteOperatorPacketReady,
} from "./stripeTestExternalPrerequisiteOperatorPacket";

const PACKET_SOURCE = path.join(
  process.cwd(),
  "lib/store/partialRefundProviderMoneyExecution/stripeTestExternalPrerequisiteOperatorPacket.ts"
);

/** Distinct fake TEST credentials — must never appear in packet outputs. */
const FAKE_TEST_SECRET = "sk_test_OPPKT_HOST_FAKE_SECRET_7m2q";
const FAKE_TEST_PUBLISHABLE = "pk_test_OPPKT_HOST_FAKE_PUBLISHABLE_7m2q";
const FAKE_WEBHOOK = "whsec_OPPKT_HOST_FAKE_WEBHOOK_7m2q";
const FAKE_LIVE_SECRET = "sk_live_OPPKT_HOST_FAKE_LIVE_SECRET_7m2q";
const FAKE_LIVE_PUBLISHABLE = "pk_live_OPPKT_HOST_FAKE_PUBLISHABLE_7m2q";

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
  stripeExecutionAuthorized: false;
}): void {
  expect(payload.networkStripeCalls).toBe(0);
  expect(payload.moneyMovement).toBe(0);
  expect(payload.productionDbWrites).toBe(0);
  expect(payload.providerGates).toBe("OFF");
  expect(payload.activationPerformed).toBe(false);
  expect(payload.stripeExecutionAuthorized).toBe(false);
}

describe("stripeTestExternalPrerequisiteOperatorPacket", () => {
  it("exports stable version, environment, structural flags, and required contracts", () => {
    expect(STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_VERSION).toBe(
      "commerce-stripe-test-external-prerequisite-operator-packet-v1"
    );
    expect(
      STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_ENVIRONMENT
    ).toContain("not_production");
    expect(
      STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_ACTIVATION_PERFORMED
    ).toBe(false);
    expect(
      STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_EXECUTION_AUTHORIZED
    ).toBe(false);
    expect(
      STRIPE_TEST_EXTERNAL_PREREQUISITE_CENTRAL_INTEGRATION_STILL_REQUIRED
    ).toBe(true);
    expect(
      STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_PROVIDER_EXECUTION_ENTRYPOINTS
    ).toEqual([]);
    expect([
      ...STRIPE_TEST_EXTERNAL_PREREQUISITE_OPERATOR_PACKET_VERDICTS,
    ]).toEqual([
      "OPERATOR_PACKET_CONTRACT_READY_B3_B4_CLEARANCE_PENDING",
      "OPERATOR_PACKET_BLOCKED_LIVE_OR_UNSAFE_HOST_SHAPE",
      "OPERATOR_PACKET_BLOCKED_PROVIDER_GATES_NOT_OFF",
    ]);
    expect([...REQUIRED_TEST_CONFIGURATION_NAMES]).toEqual([
      "STRIPE_MODE",
      "STRIPE_SECRET_KEY",
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "NEXT_PUBLIC_APP_URL",
    ]);
    expect(REQUIRED_FIXTURE_FIELDS).toHaveLength(5);
    expect(TEST_ONLY_VALIDATION.STRIPE_MODE).toBe("exactly_test");
    expect(LIVE_CREDENTIAL_REJECTION.rejectStripeModeLive).toBe(true);
    expect(SECRET_REDACTION_RULES.forbidSecretValues).toBe(true);
    expect(SECRET_REDACTION_RULES.neverAskOperatorToCommitCredentials).toBe(
      true
    );
    expect(FIXTURE_VALIDATION_RULES.doNotFabricateFixtureIdentifiersInGit).toBe(
      true
    );
    expect(SAFE_STORAGE_INJECTION_BOUNDARY.allowedInjectionLocation).toBe(
      ".env.local"
    );
    expect(
      SAFE_STORAGE_INJECTION_BOUNDARY.injectionDoesNotAuthorizeStripeExecution
    ).toBe(true);
  });

  it("defaults to packet-ready with B3/B4 uncleared and Central still required", () => {
    const report = buildStripeTestExternalPrerequisiteOperatorPacketReport();
    expect(report.operatorPacketReady).toBe(true);
    expect(report.centralIntegrationStillRequired).toBe(true);
    expect(report.stripeExecutionAuthorized).toBe(false);
    expect(report.b3CredentialsCleared).toBe(false);
    expect(report.b4FixturesCleared).toBe(false);
    expect(report.verdict).toBe(
      "OPERATOR_PACKET_CONTRACT_READY_B3_B4_CLEARANCE_PENDING"
    );
    expect(report.operatorFixtures).toEqual(
      STRIPE_TEST_EXTERNAL_PREREQUISITE_DEFAULT_OPERATOR_FIXTURES
    );
    expect(report.blockers).toContain(
      "central_integration_still_required_sm_dry_run_and_env_readiness"
    );
    expect(report.blockers).toContain("stripe_execution_authorized_remains_no");
    assertOfflineCounters(report);
    assertNoSecretEcho(report);
    expect(isStripeTestExternalPrerequisiteOperatorPacketReady()).toBe(true);
  });

  it("marks B3/B4 cleared only when TEST host shape + fixture attestations are ready", () => {
    const report = buildStripeTestExternalPrerequisiteOperatorPacketReport({
      env: hostReadyEnv(),
      operatorFixtures: allOperatorFixturesReady(),
    });
    expect(report.b3CredentialsCleared).toBe(true);
    expect(report.b4FixturesCleared).toBe(true);
    expect(report.configuration.testModeConfirmed).toBe(true);
    expect(report.configuration.liveCredentialRejected).toBe(true);
    expect(report.fixtures.allRequiredFixturesReady).toBe(true);
    expect(report.fixtures.codeFixturePackDefinitionsValid).toBe(true);
    expect(report.stripeExecutionAuthorized).toBe(false);
    expect(report.centralIntegrationStillRequired).toBe(true);
    expect(report.blockers).toContain(
      "central_integration_still_required_sm_dry_run_and_env_readiness"
    );
    assertOfflineCounters(report);
    assertNoSecretEcho(report);
  });

  it("rejects LIVE host credentials without echoing secret values", () => {
    const report = buildStripeTestExternalPrerequisiteOperatorPacketReport({
      env: hostReadyEnv({
        STRIPE_MODE: "live",
        STRIPE_SECRET_KEY: FAKE_LIVE_SECRET,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: FAKE_LIVE_PUBLISHABLE,
      }),
      operatorFixtures: allOperatorFixturesReady(),
    });
    expect(report.verdict).toBe(
      "OPERATOR_PACKET_BLOCKED_LIVE_OR_UNSAFE_HOST_SHAPE"
    );
    expect(report.b3CredentialsCleared).toBe(false);
    expect(report.configuration.liveCredentialRejected).toBe(false);
    expect(report.configuration.liveRejectionReasonCodes.length).toBeGreaterThan(
      0
    );
    expect(report.stripeExecutionAuthorized).toBe(false);
    assertOfflineCounters(report);
    assertNoSecretEcho(report);
  });

  it("blocks when provider-money gate/mode env is present on host", () => {
    const report = buildStripeTestExternalPrerequisiteOperatorPacketReport({
      env: hostReadyEnv({
        UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_ENABLED: "true",
        UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE: "test",
      }),
    });
    expect(report.verdict).toBe(
      "OPERATOR_PACKET_BLOCKED_PROVIDER_GATES_NOT_OFF"
    );
    expect(report.blockers).toContain(
      "provider_gates_or_execution_mode_not_off"
    );
    expect(report.providerGates).toBe("OFF");
    expect(report.stripeExecutionAuthorized).toBe(false);
    assertNoSecretEcho(report);
  });

  it("emits pre-execution checklist and post-test cleanup without secret material", () => {
    const pre = buildExternalPrerequisitePreExecutionChecklist();
    const post = buildExternalPrerequisitePostTestCleanupRequirements();
    expect(pre.length).toBeGreaterThanOrEqual(8);
    expect(post.length).toBeGreaterThanOrEqual(6);
    expect(pre.some((s) => s.includes("B3/B4"))).toBe(true);
    expect(pre.some((s) => s.includes(".env.local"))).toBe(true);
    expect(post.some((s) => s.toLowerCase().includes("cleanup") || s.includes("Remove temporary"))).toBe(
      true
    );
    for (const line of [...pre, ...post]) {
      expect(line).not.toContain("sk_test_");
      expect(line).not.toContain("pk_test_");
      expect(line).not.toContain("sk_live_");
      expect(line).not.toContain("pk_live_");
      expect(line).not.toContain("whsec_");
    }
  });

  it("source has no Stripe network / money / gate-enable / secret-creation side effects", () => {
    const src = readFileSync(PACKET_SOURCE, "utf8");
    expect(src).not.toMatch(/stripe\.com/i);
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toMatch(/\baxios\b/);
    expect(src).not.toMatch(/createRefund|refunds\.create|paymentIntents\.create/i);
    expect(src).toContain("STRIPE_EXECUTION_AUTHORIZED");
    expect(src).toContain("REQUIRED_TEST_CONFIGURATION_NAMES");
    expect(src).toContain("REQUIRED_FIXTURE_FIELDS");
    expect(src).toContain("TEST_ONLY_VALIDATION");
    expect(src).toContain("LIVE_CREDENTIAL_REJECTION");
    expect(src).toContain("SECRET_REDACTION_RULES");
    expect(src).toContain("FIXTURE_VALIDATION_RULES");
    expect(src).toContain("SAFE_STORAGE_INJECTION_BOUNDARY");
    expect(src).toContain("buildExternalPrerequisitePreExecutionChecklist");
    expect(src).toContain("buildExternalPrerequisitePostTestCleanupRequirements");
  });
});
