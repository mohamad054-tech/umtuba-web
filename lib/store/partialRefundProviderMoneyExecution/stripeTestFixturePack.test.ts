/**
 * Stripe TEST fixture pack — deterministic NON-SECRET fixtures only.
 * No network. No gate activation. No money movement.
 */

import { describe, expect, it } from "vitest";
import {
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_VALUE,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_NON_PRODUCTION_FIXTURE_TOKEN,
  evaluatePartialRefundProviderMoneyGate,
} from "./gate";
import {
  PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV,
} from "./executionMode";
import {
  STRIPE_TEST_FIXTURE_PACK_CURRENCY,
  STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT,
  STRIPE_TEST_FIXTURE_PACK_IDS,
  STRIPE_TEST_FIXTURE_PACK_PAYMENT_INTENT_REF,
  STRIPE_TEST_FIXTURE_PACK_VERSION,
  buildStripeTestFixtureCommittedLedgerFacts,
  buildStripeTestFixtureP6Manifest,
  buildStripeTestFixturePackReport,
  buildStripeTestFixturePersistedFactShapes,
  getStripeTestFixturePackDefinitions,
  isStripeTestFixturePackReadyForControlledValidation,
} from "./stripeTestFixturePack";
import { isStripePaymentIntentRef } from "./validate";

function testCredentialEnv(
  extra: Record<string, string | undefined> = {}
): Record<string, string | undefined> {
  return {
    STRIPE_MODE: "test",
    STRIPE_SECRET_KEY: "sk_test_INVALID_FIXTURE_ONLY_NOT_A_SECRET",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      "pk_test_INVALID_FIXTURE_ONLY_NOT_A_SECRET",
    STRIPE_WEBHOOK_SECRET: "whsec_INVALID_FIXTURE_ONLY_NOT_A_SECRET",
    NEXT_PUBLIC_APP_URL: "https://example.test",
    ...extra,
  };
}

describe("stripe TEST fixture pack — definitions", () => {
  it("exposes deterministic NON-SECRET TEST-marked ids and PI ref", () => {
    const defs = getStripeTestFixturePackDefinitions();
    expect(defs.version).toBe(STRIPE_TEST_FIXTURE_PACK_VERSION);
    expect(defs.environment).toBe(STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT);
    expect(defs.environment).toContain("not_production");
    expect(defs.environment).not.toMatch(/\blive\b/i);
    expect(defs.ids).toEqual(STRIPE_TEST_FIXTURE_PACK_IDS);
    expect(isStripePaymentIntentRef(defs.paymentIntentRef)).toBe(true);
    expect(defs.paymentIntentRef).toBe(
      STRIPE_TEST_FIXTURE_PACK_PAYMENT_INTENT_REF
    );
    expect(defs.paymentIntentRef).toContain("TestFixturePack");
    expect(defs.refundAmountMinor).toBeGreaterThan(0);
    expect(defs.refundAmountMinor).toBeLessThanOrEqual(defs.capturedAmountMinor);
    expect(defs.currency).toBe(STRIPE_TEST_FIXTURE_PACK_CURRENCY);
    expect(defs.expectedIdempotencyKey).toBe(
      `prf-prov:${STRIPE_TEST_FIXTURE_PACK_IDS.ledgerId}`
    );
  });

  it("builds committed ledger + empty provider executions + filled P6 manifest", () => {
    const ledger = buildStripeTestFixtureCommittedLedgerFacts();
    expect(ledger.status).toBe("committed");
    expect(ledger.refundAmountMinor).toBeGreaterThan(0);

    const facts = buildStripeTestFixturePersistedFactShapes();
    expect(facts.stripeModeRequired).toBe("test");
    expect(facts.payment_attempt.provider_reference).toBe(
      STRIPE_TEST_FIXTURE_PACK_PAYMENT_INTENT_REF
    );
    expect(facts.capture_outcome.event_key).toContain(
      STRIPE_TEST_FIXTURE_PACK_PAYMENT_INTENT_REF
    );
    expect(facts.provider_executions_for_ledger).toEqual([]);
    expect(facts.environment).toContain("test");

    const manifest = buildStripeTestFixtureP6Manifest();
    expect(manifest.stripeMode).toBe("test");
    expect(manifest.remotePersistenceAuthorized).toBe(false);
    expect(manifest.operatorRemoteGoStillRequired).toBe(true);
    expect(manifest.preRunStatuses).toEqual({
      ledger: "committed",
      providerExecutions: "none",
    });
    expect(manifest.testPaymentIntentSafeRef).toBe(
      STRIPE_TEST_FIXTURE_PACK_PAYMENT_INTENT_REF
    );
  });
});

describe("stripe TEST fixture pack — fail closed / gates OFF", () => {
  it("fails closed when TEST credentials absent", () => {
    const report = buildStripeTestFixturePackReport({});
    expect(report.verdict).toBe("blocked_test_credentials_absent");
    expect(report.testCredentialsPresent).toBe(false);
    expect(report.gatesRemainOff).toBe(true);
    expect(report.definitionsValid).toBe(true);
    expect(isStripeTestFixturePackReadyForControlledValidation({})).toBe(
      false
    );
    // Gate remains OFF on empty env
    expect(evaluatePartialRefundProviderMoneyGate({}).ok).toBe(false);
  });

  it("blocks live / mixed Stripe shape", () => {
    const liveEnv = testCredentialEnv({
      STRIPE_SECRET_KEY: "sk_live_INVALID_FIXTURE_ONLY_NOT_A_SECRET",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
        "pk_live_INVALID_FIXTURE_ONLY_NOT_A_SECRET",
      STRIPE_MODE: "live",
    });
    const report = buildStripeTestFixturePackReport(liveEnv);
    expect(report.verdict).toBe("blocked_live_or_mixed_stripe_shape");
    expect(report.liveKeyPrefixDetected).toBe(true);
    expect(isStripeTestFixturePackReadyForControlledValidation(liveEnv)).toBe(
      false
    );
  });

  it("ready only with TEST credential shape and gates/mode OFF", () => {
    const env = testCredentialEnv();
    const report = buildStripeTestFixturePackReport(env);
    expect(report.verdict).toBe(
      "fixture_pack_ready_gates_remain_off_operator_remote_go_pending"
    );
    expect(report.testCredentialsPresent).toBe(true);
    expect(report.gatesRemainOff).toBe(true);
    expect(report.dedicatedGateCurrentlySatisfied).toBe(false);
    expect(report.executionModeCurrent).toBe("off");
    expect(report.productionExecAckPresent).toBe(false);
    expect(report.operatorRemoteGaps.length).toBeGreaterThan(0);
    expect(isStripeTestFixturePackReadyForControlledValidation(env)).toBe(
      true
    );
  });

  it("blocks when dedicated gate / execution mode activated", () => {
    const env = testCredentialEnv({
      [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV]: "true",
      [PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV]:
        PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_VALUE,
      UMTUBA_STORE_PARTIAL_REFUND_PROVIDER_MONEY_ALLOW_IN_NON_PRODUCTION:
        PARTIAL_REFUND_PROVIDER_MONEY_NON_PRODUCTION_FIXTURE_TOKEN,
      [PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV]: "test",
    });
    const report = buildStripeTestFixturePackReport(env);
    expect(report.gatesRemainOff).toBe(false);
    expect(report.verdict).toBe(
      "blocked_misconfigured_or_unsafe_activation_state"
    );
    expect(isStripeTestFixturePackReadyForControlledValidation(env)).toBe(
      false
    );
  });

  it("blocks when production exec ACK present", () => {
    const env = testCredentialEnv({
      [PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV]:
        "I_UNDERSTAND_PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXECUTION",
    });
    const report = buildStripeTestFixturePackReport(env);
    expect(report.productionExecAckPresent).toBe(true);
    expect(report.verdict).toBe(
      "blocked_misconfigured_or_unsafe_activation_state"
    );
  });

  it("embeds no secret credential material in pack constants", () => {
    const blob = JSON.stringify({
      defs: getStripeTestFixturePackDefinitions(),
      manifest: buildStripeTestFixtureP6Manifest(),
      facts: buildStripeTestFixturePersistedFactShapes(),
    });
    expect(blob).not.toMatch(/sk_live_/);
    expect(blob).not.toMatch(/pk_live_/);
    expect(blob).not.toContain("sk_test_");
    expect(blob).not.toContain("pk_test_");
    expect(blob).not.toContain("whsec_");
    expect(blob).not.toContain("INVALID_FIXTURE_ONLY_NOT_A_SECRET");
  });
});
