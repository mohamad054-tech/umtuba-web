/**
 * Commerce RELEASE-CANDIDATE FINAL REGRESSION PACK — focused acceptance.
 * STRIPE_CALLS=0 · MONEY_MOVEMENT=0 · DB_WRITES=0 · MIGRATIONS=0 · PROVIDER_GATES=OFF
 */

import { describe, expect, it } from "vitest";
import {
  COMMERCE_RELEASE_CANDIDATE_FINAL_REGRESSION_PACK_ENVIRONMENT,
  COMMERCE_RELEASE_CANDIDATE_FINAL_REGRESSION_PACK_VERSION,
  FINAL_REGRESSION_COVERAGE_DOMAINS,
  runCommerceReleaseCandidateFinalRegressionPack,
} from "./commerceReleaseCandidateFinalRegressionPack";

describe("final RC regression pack — contracts", () => {
  it("exposes version, environment, and required coverage domains", () => {
    expect(COMMERCE_RELEASE_CANDIDATE_FINAL_REGRESSION_PACK_VERSION).toBe(
      "commerce-release-candidate-final-regression-pack-v1"
    );
    expect(COMMERCE_RELEASE_CANDIDATE_FINAL_REGRESSION_PACK_ENVIRONMENT).toBe(
      "isolated_commerce_release_candidate_final_regression_pack_v1_not_production"
    );
    expect([...FINAL_REGRESSION_COVERAGE_DOMAINS]).toEqual([
      "PROVIDER_CONTROL_PLANE",
      "STRIPE_TEST_SAFETY_OFFLINE",
      "REFUND_RESERVATION",
      "PROVIDER_EXECUTION_SAFETY",
      "UNCERTAIN_OUTCOMES",
      "RECONCILIATION",
      "RECOVERY",
      "COMPENSATION",
      "TERMINAL_STATES",
      "REPLAY_IDEMPOTENCY",
      "OBSERVABILITY",
      "OPERATOR_DIAGNOSTICS",
      "SELLER_ADMIN_AUTHORIZATION",
    ]);
  });
});

describe("final RC regression pack — consolidated run", () => {
  it("PASS with COMMERCE_CODE_RELEASE_CANDIDATE=YES and full coverage", () => {
    const run = runCommerceReleaseCandidateFinalRegressionPack();

    expect(run.allPass).toBe(true);
    expect(run.violations).toEqual([]);
    expect(run.blockers).toEqual([]);
    expect(run.COMMERCE_CODE_RELEASE_CANDIDATE).toBe("YES");
    expect(run.domainsCovered).toEqual([...FINAL_REGRESSION_COVERAGE_DOMAINS]);
    expect(run.safety).toEqual({
      STRIPE_CALLS: 0,
      MONEY_MOVEMENT: 0,
      DB_WRITES: 0,
      MIGRATIONS: 0,
      PROVIDER_GATES: "OFF",
    });

    for (const domain of FINAL_REGRESSION_COVERAGE_DOMAINS) {
      expect(run.coverageMatrix[domain]).toBe(true);
    }
    for (const suite of run.suites) {
      expect(suite.pass).toBe(true);
      expect(suite.violations).toEqual([]);
      expect(suite.evidence.length).toBeGreaterThan(0);
    }
  });

  it("keeps hard offline safety: no activation, no money, gates OFF", () => {
    const run = runCommerceReleaseCandidateFinalRegressionPack();
    expect(run.safety.STRIPE_CALLS).toBe(0);
    expect(run.safety.MONEY_MOVEMENT).toBe(0);
    expect(run.safety.DB_WRITES).toBe(0);
    expect(run.safety.MIGRATIONS).toBe(0);
    expect(run.safety.PROVIDER_GATES).toBe("OFF");

    const control = run.suites.find((s) => s.suite === "control_plane")!;
    const stripe = run.suites.find((s) => s.suite === "stripe_test_offline")!;
    const counters = run.suites.find((s) => s.suite === "hard_safety_counters")!;
    expect(control.pass).toBe(true);
    expect(stripe.pass).toBe(true);
    expect(counters.pass).toBe(true);
    expect(JSON.stringify(run)).not.toMatch(
      /sk_live_|rk_live_|whsec_[A-Za-z0-9]|BEGIN PRIVATE KEY|SUPABASE_SERVICE_ROLE/
    );
  });

  it("covers refund/provider critical paths via consumed RC matrix suite", () => {
    const run = runCommerceReleaseCandidateFinalRegressionPack();
    const rc = run.suites.find((s) => s.suite === "refund_provider_rc_matrix")!;
    expect(rc.pass).toBe(true);
    expect(rc.domains).toEqual(
      expect.arrayContaining([
        "REFUND_RESERVATION",
        "PROVIDER_EXECUTION_SAFETY",
        "UNCERTAIN_OUTCOMES",
        "RECONCILIATION",
        "RECOVERY",
        "COMPENSATION",
        "TERMINAL_STATES",
        "REPLAY_IDEMPOTENCY",
      ])
    );
    expect(rc.evidence.some((e) => e.includes("rcMatrix.allPass=true"))).toBe(
      true
    );
  });

  it("covers observability, operator diagnostics, and seller/admin auth", () => {
    const run = runCommerceReleaseCandidateFinalRegressionPack();
    const obs = run.suites.find((s) => s.suite === "observability_diagnostics")!;
    const auth = run.suites.find((s) => s.suite === "seller_admin_authorization")!;
    expect(obs.pass).toBe(true);
    expect(auth.pass).toBe(true);
    expect(obs.domains).toEqual(["OBSERVABILITY", "OPERATOR_DIAGNOSTICS"]);
    expect(auth.domains).toEqual(["SELLER_ADMIN_AUTHORIZATION"]);
    expect(
      auth.evidence.some((e) => e.includes("adminBlocked.ok=false"))
    ).toBe(true);
    expect(
      auth.evidence.some((e) => e.includes("storeMismatch.code=missing_ownership"))
    ).toBe(true);
  });

  it("notes code-RC vs Stripe-TEST/production readiness separation", () => {
    const run = runCommerceReleaseCandidateFinalRegressionPack();
    expect(run.notes.join(" ")).toMatch(/Does not imply STRIPE_TEST_READY/);
    expect(run.notes.join(" ")).toMatch(/A2 stripeTestActivation/);
  });
});
