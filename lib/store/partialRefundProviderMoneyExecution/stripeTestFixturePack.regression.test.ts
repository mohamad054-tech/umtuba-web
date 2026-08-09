/**
 * POST-IMPLEMENTATION regression pack for Stripe TEST fixture pack.
 * Isolated assertions only — does not alter fixture-pack semantics.
 * No Stripe network. No gate activation. No DB writes. No live credentials.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildProviderMoneyExecuteCandidate,
  evaluateFirstTimeProviderMoneyExecuteEligibility,
  evaluatePartialRefundProviderMoneyGate,
  partialRefundProviderMoneyOwnership,
  PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV,
  PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV,
} from "./index";
import {
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

const PACK_SOURCE = path.join(
  process.cwd(),
  "lib/store/partialRefundProviderMoneyExecution/stripeTestFixturePack.ts"
);

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

describe("fixture pack regression — deterministic repeatability", () => {
  it("builders return byte-identical JSON across repeated calls", () => {
    const a = {
      defs: getStripeTestFixturePackDefinitions(),
      ledger: buildStripeTestFixtureCommittedLedgerFacts(),
      facts: buildStripeTestFixturePersistedFactShapes(),
      manifest: buildStripeTestFixtureP6Manifest(),
    };
    const b = {
      defs: getStripeTestFixturePackDefinitions(),
      ledger: buildStripeTestFixtureCommittedLedgerFacts(),
      facts: buildStripeTestFixturePersistedFactShapes(),
      manifest: buildStripeTestFixtureP6Manifest(),
    };
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.defs.version).toBe(STRIPE_TEST_FIXTURE_PACK_VERSION);
    expect(a.facts.provider_executions_for_ledger).toEqual([]);
  });

  it("report verdict is stable for empty env and TEST shape env", () => {
    const empty1 = buildStripeTestFixturePackReport({});
    const empty2 = buildStripeTestFixturePackReport({});
    expect(empty1.verdict).toBe(empty2.verdict);
    expect(empty1.verdict).toBe("blocked_test_credentials_absent");

    const readyEnv = testCredentialEnv();
    const r1 = buildStripeTestFixturePackReport(readyEnv);
    const r2 = buildStripeTestFixturePackReport(readyEnv);
    expect(r1.verdict).toBe(r2.verdict);
    expect(r1.verdict).toBe(
      "fixture_pack_ready_gates_remain_off_operator_remote_go_pending"
    );
    expect(r1.filledP6Manifest).toEqual(r2.filledP6Manifest);
  });
});

describe("fixture pack regression — TEST/LIVE separation + fail-closed", () => {
  it("blocks mixed live publishable with test secret", () => {
    const env = testCredentialEnv({
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
        "pk_live_INVALID_FIXTURE_ONLY_NOT_A_SECRET",
    });
    const report = buildStripeTestFixturePackReport(env);
    expect(report.liveKeyPrefixDetected).toBe(true);
    expect(report.verdict).toBe("blocked_live_or_mixed_stripe_shape");
    expect(isStripeTestFixturePackReadyForControlledValidation(env)).toBe(
      false
    );
  });

  it("blocks secret live with declared STRIPE_MODE=test", () => {
    const env = testCredentialEnv({
      STRIPE_SECRET_KEY: "sk_live_INVALID_FIXTURE_ONLY_NOT_A_SECRET",
      STRIPE_MODE: "test",
    });
    const report = buildStripeTestFixturePackReport(env);
    expect(report.liveKeyPrefixDetected).toBe(true);
    expect(report.issues).toEqual(
      expect.arrayContaining(["secret_live_with_declared_test_mode"])
    );
    expect(report.verdict).toBe("blocked_live_or_mixed_stripe_shape");
  });

  it("never mutates process.env while evaluating readiness", () => {
    const before = {
      gate: process.env[PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV],
      mode: process.env[PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV],
      ack: process.env[PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV],
      gateAck: process.env[PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV],
      stripe: process.env.STRIPE_SECRET_KEY,
      stripeMode: process.env.STRIPE_MODE,
    };
    void buildStripeTestFixturePackReport(testCredentialEnv());
    void isStripeTestFixturePackReadyForControlledValidation({});
    expect(process.env[PARTIAL_REFUND_PROVIDER_MONEY_GATE_ENV]).toBe(
      before.gate
    );
    expect(process.env[PARTIAL_REFUND_PROVIDER_MONEY_EXECUTION_MODE_ENV]).toBe(
      before.mode
    );
    expect(
      process.env[PARTIAL_REFUND_PROVIDER_MONEY_PRODUCTION_EXEC_ACK_ENV]
    ).toBe(before.ack);
    expect(process.env[PARTIAL_REFUND_PROVIDER_MONEY_GATE_ACK_ENV]).toBe(
      before.gateAck
    );
    expect(process.env.STRIPE_SECRET_KEY).toBe(before.stripe);
    expect(process.env.STRIPE_MODE).toBe(before.stripeMode);
    expect(
      evaluatePartialRefundProviderMoneyGate(process.env).ok
    ).toBe(false);
  });
});

describe("fixture pack regression — no production identifiers", () => {
  it("uses reserved a2010001 UUID namespace and synthetic TEST PI marker only", () => {
    const defs = getStripeTestFixturePackDefinitions();
    const ids = Object.values(defs.ids);
    for (const id of ids) {
      expect(id.startsWith("a2010001-")).toBe(true);
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    }
    expect(defs.paymentIntentRef).toBe(
      STRIPE_TEST_FIXTURE_PACK_PAYMENT_INTENT_REF
    );
    expect(defs.paymentIntentRef).toContain("TestFixturePack");
    expect(defs.paymentIntentRef).not.toMatch(/live/i);
    expect(defs.environment).toBe(STRIPE_TEST_FIXTURE_PACK_ENVIRONMENT);
    expect(defs.environment).toContain("not_production");

    const blob = JSON.stringify({
      defs,
      facts: buildStripeTestFixturePersistedFactShapes(),
      manifest: buildStripeTestFixtureP6Manifest(),
    });
    expect(blob).not.toMatch(/cus_/);
    expect(blob).not.toMatch(/acct_/);
    expect(blob).not.toMatch(/price_/);
    expect(blob).not.toMatch(/sk_live_/);
    expect(blob).not.toMatch(/pk_live_/);
    expect(blob).not.toMatch(/tgucwnjwoyeqoxqaxmew/);
  });
});

describe("fixture pack regression — provider-execution compatibility", () => {
  it("F-COMMITTED-CLEAN pack facts are eligible only when submit allowed; gates OFF blocks", () => {
    const ledger = buildStripeTestFixtureCommittedLedgerFacts();
    const facts = buildStripeTestFixturePersistedFactShapes();

    expect(ledger.status).toBe("committed");
    expect(facts.provider_executions_for_ledger).toHaveLength(0);
    expect(facts.payment_attempt.provider).toBe("stripe");
    expect(facts.payment_attempt.status).toBe("captured");

    const blocked = evaluateFirstTimeProviderMoneyExecuteEligibility({
      ledgerStatus: ledger.status,
      refundAmountMinor: ledger.refundAmountMinor,
      currency: ledger.currency,
      storeId: ledger.storeId,
      existingExecution: null,
      trustedPaymentIntentId: facts.paymentIntentRef,
      firstTimeSubmitAllowed: false,
      firstTimeSubmitBlockCode: "gate_disabled",
      providerKind: "stripe",
    });
    expect(blocked.eligibleToExecute).toBe(false);
    expect(blocked.code).toBe("gate_disabled");

    const eligibleShape = evaluateFirstTimeProviderMoneyExecuteEligibility({
      ledgerStatus: ledger.status,
      refundAmountMinor: ledger.refundAmountMinor,
      currency: ledger.currency,
      storeId: ledger.storeId,
      existingExecution: null,
      trustedPaymentIntentId: facts.paymentIntentRef,
      firstTimeSubmitAllowed: true,
      providerKind: "stripe",
    });
    expect(eligibleShape.eligibleToExecute).toBe(true);
    expect(eligibleShape.code).toBe("eligible");

    const candidateGatesOff = buildProviderMoneyExecuteCandidate({
      ledger: {
        ledgerId: ledger.ledgerId,
        storeId: ledger.storeId,
        orderId: ledger.orderId,
        paymentAttemptId: ledger.paymentAttemptId,
        refundAmountMinor: ledger.refundAmountMinor,
        currency: ledger.currency,
        status: ledger.status,
      },
      existingExecution: null,
      trustedPaymentIntentId: facts.paymentIntentRef,
      env: {},
    });
    expect(candidateGatesOff.eligibleToExecute).toBe(false);
    expect(["gate_disabled", "execution_mode_off"]).toContain(
      candidateGatesOff.eligibilityCode
    );
  });

  it("pack ledger ids match P6 manifest and idempotency contract", () => {
    const ledger = buildStripeTestFixtureCommittedLedgerFacts();
    const manifest = buildStripeTestFixtureP6Manifest();
    expect(manifest.ledgerId).toBe(ledger.ledgerId);
    expect(manifest.ledgerId).toBe(STRIPE_TEST_FIXTURE_PACK_IDS.ledgerId);
    expect(manifest.expectedIdempotencyKey).toBe(
      `prf-prov:${ledger.ledgerId}`
    );
    expect(manifest.currency).toBe(ledger.currency);
    expect(manifest.refundAmountMinor).toBe(ledger.refundAmountMinor);
    expect(manifest.refundAmountMinor).toBeLessThanOrEqual(
      manifest.capturedAmountMinor
    );
    expect(manifest.preRunStatuses).toEqual({
      ledger: "committed",
      providerExecutions: "none",
    });
    expect(manifest.remotePersistenceAuthorized).toBe(false);
    expect(manifest.operatorRemoteGoStillRequired).toBe(true);
  });
});

describe("fixture pack regression — safety-pack + E2E-spec compatibility", () => {
  it("keeps provider-money ownership non-events intact (safety pack contract)", () => {
    const o = partialRefundProviderMoneyOwnership();
    expect(o.ownsPartialRefundProviderRefundExecution).toBe(true);
    expect(o.ownsLedgerCommittedMeaning).toBe(false);
    expect(o.ownsAutomaticCompensationOnUncertain).toBe(false);
    expect(o.ownsPartialRefundRestock).toBe(false);
    expect(o.ownsSyncPartialRefundOutcome).toBe(false);
  });

  it("maps controlled E2E P6 required fields (synthetic TEST pack shape)", () => {
    const manifest = buildStripeTestFixtureP6Manifest();
    const facts = buildStripeTestFixturePersistedFactShapes();
    // E2E SPEC §2.1 field presence — synthetic offline pack (operator remote GO still required)
    expect(manifest.environmentClassification).toContain("not_production");
    expect(manifest.stripeMode).toBe("test");
    expect(manifest.testPaymentIntentSafeRef.startsWith("pi_")).toBe(true);
    expect(manifest.captureOrderStoreSafeRefs.storeId).toBe(
      facts.order.store_id
    );
    expect(manifest.captureOrderStoreSafeRefs.orderId).toBe(facts.order.id);
    expect(manifest.captureOrderStoreSafeRefs.paymentAttemptId).toBe(
      facts.payment_attempt.id
    );
    expect(manifest.captureOrderStoreSafeRefs.captureEventId).toBe(
      facts.capture_outcome.id
    );
    expect(typeof manifest.ledgerId).toBe("string");
    expect(manifest.refundAmountMinor).toBeGreaterThan(0);
    expect(manifest.currency).toBe("USD");
    expect(manifest.expectedIdempotencyKey).toMatch(/^prf-prov:/);
    expect(manifest.preRunStatuses.ledger).toBe("committed");
    expect(manifest.preRunStatuses.providerExecutions).toBe("none");
    // providerKind is implied by payment_attempt.provider + stripeMode; not a top-level P6 field in pack v1
    expect(facts.payment_attempt.provider).toBe("stripe");
    expect(
      Object.prototype.hasOwnProperty.call(manifest, "providerKind")
    ).toBe(false);
  });

  it("gates remain OFF under host-empty and TEST-credential pack reports", () => {
    const empty = buildStripeTestFixturePackReport({});
    const ready = buildStripeTestFixturePackReport(testCredentialEnv());
    expect(empty.gatesRemainOff).toBe(true);
    expect(ready.gatesRemainOff).toBe(true);
    expect(empty.dedicatedGateCurrentlySatisfied).toBe(false);
    expect(ready.dedicatedGateCurrentlySatisfied).toBe(false);
    expect(empty.executionModeCurrent).toBe("off");
    expect(ready.executionModeCurrent).toBe("off");
    expect(empty.productionExecAckPresent).toBe(false);
    expect(ready.productionExecAckPresent).toBe(false);
  });
});

describe("fixture pack regression — no accidental live Stripe path + secret safety", () => {
  it("pack module source does not import stripeApi / SDK / network clients", () => {
    const src = readFileSync(PACK_SOURCE, "utf8");
    expect(src).not.toMatch(/from\s+["']stripe["']/);
    expect(src).not.toMatch(/from\s+["'][^"']*stripeApi["']/);
    expect(src).not.toMatch(/createStripePartialRefundProviderPort/);
    expect(src).not.toMatch(/createStripeRefund/);
    expect(src).not.toMatch(/api\.stripe\.com/);
    expect(src).not.toMatch(/\bfetch\s*\(/);
    // Prefix detectors (startsWith("sk_live_")) are allowed; credential VALUES are not.
    expect(src).not.toMatch(/sk_live_[A-Za-z0-9]+/);
    expect(src).not.toMatch(/pk_live_[A-Za-z0-9]+/);
    expect(src).not.toMatch(/sk_test_[A-Za-z0-9]+/);
    expect(src).not.toMatch(/pk_test_[A-Za-z0-9]+/);
    expect(src).not.toMatch(/whsec_[A-Za-z0-9]+/);
    expect(src).toContain('startsWith("sk_live_")');
    expect(src).toContain('startsWith("sk_test_")');
  });

  it("ready report never embeds credential values", () => {
    const report = buildStripeTestFixturePackReport(testCredentialEnv());
    const blob = JSON.stringify(report);
    expect(blob).not.toContain("sk_test_");
    expect(blob).not.toContain("pk_test_");
    expect(blob).not.toContain("whsec_");
    expect(blob).not.toContain("INVALID_FIXTURE_ONLY_NOT_A_SECRET");
    expect(report.testCredentialsPresent).toBe(true);
    expect(report.operatorRemoteGaps.length).toBeGreaterThan(0);
  });
});
