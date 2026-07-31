/**
 * Commerce Live Payment Production Gate V1 — focused tests.
 * Uses placeholders only. Never real Stripe secrets.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  STRIPE_LIVE_NON_PRODUCTION_FIXTURE_TOKEN,
  STRIPE_PRODUCTION_GATE_ACK_VALUE,
  STRIPE_PAYMENT_PRODUCTION_GATE_VERSION,
  buildStripePaymentConfigReadinessReport,
  evaluateStripeLiveCaptureConfigForTests,
  getStripeLiveCaptureConfig,
} from "./stripeConfig";

const ROOT = join(__dirname, "../..");

const TEST_SECRET = "sk_test_PLACEHOLDER_NOT_A_REAL_KEY_000000";
const TEST_PUBLISHABLE = "pk_test_PLACEHOLDER_NOT_A_REAL_KEY_000000";
const LIVE_SECRET = "sk_live_PLACEHOLDER_NOT_A_REAL_KEY_000000";
const LIVE_PUBLISHABLE = "pk_live_PLACEHOLDER_NOT_A_REAL_KEY_000000";
const WEBHOOK = "whsec_PLACEHOLDER_NOT_A_REAL_SECRET_000000";

function baseLiveEnv(): Record<string, string> {
  return {
    NODE_ENV: "production",
    VERCEL_ENV: "production",
    STRIPE_SECRET_KEY: LIVE_SECRET,
    STRIPE_PUBLISHABLE_KEY: LIVE_PUBLISHABLE,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: LIVE_PUBLISHABLE,
    STRIPE_WEBHOOK_SECRET: WEBHOOK,
    STRIPE_MODE: "live",
    STRIPE_LIVE_PAYMENTS_ENABLED: "true",
    STRIPE_PRODUCTION_GATE_ACK: STRIPE_PRODUCTION_GATE_ACK_VALUE,
    NEXT_PUBLIC_APP_URL: "https://umtuba.example",
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Live Payment Production Gate V1", () => {
  it("accepts valid test config", () => {
    const cfg = evaluateStripeLiveCaptureConfigForTests({
      NODE_ENV: "development",
      STRIPE_SECRET_KEY: TEST_SECRET,
      STRIPE_MODE: "test",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    });
    expect(cfg.ok).toBe(true);
    if (!cfg.ok) return;
    expect(cfg.mode).toBe("test");
    expect(cfg.productionGateSatisfied).toBe(false);
    expect(cfg.successUrlTemplate).toContain(
      "/api/store/payments/stripe/return"
    );
    expect(cfg.cancelUrlPathTemplate).toContain("/store/orders/");
  });

  it("accepts valid live-shaped config via safe placeholders only", () => {
    const cfg = evaluateStripeLiveCaptureConfigForTests(baseLiveEnv());
    expect(cfg.ok).toBe(true);
    if (!cfg.ok) return;
    expect(cfg.mode).toBe("live");
    expect(cfg.productionGateSatisfied).toBe(true);
    expect(cfg.webhookSecret).toBe(WEBHOOK);
    expect(cfg.publishableKey).toBe(LIVE_PUBLISHABLE);
    expect(cfg.appOrigin).toBe("https://umtuba.example");
  });

  it("rejects mixed test/live secrets and flags", () => {
    const mixedPk = evaluateStripeLiveCaptureConfigForTests({
      NODE_ENV: "production",
      STRIPE_SECRET_KEY: TEST_SECRET,
      STRIPE_PUBLISHABLE_KEY: LIVE_PUBLISHABLE,
      STRIPE_MODE: "test",
      NEXT_PUBLIC_APP_URL: "https://umtuba.example",
    });
    expect(mixedPk.ok).toBe(false);
    if (!mixedPk.ok) expect(mixedPk.code).toBe("mode_mismatch");

    const mixedFlag = evaluateStripeLiveCaptureConfigForTests({
      NODE_ENV: "development",
      STRIPE_SECRET_KEY: TEST_SECRET,
      STRIPE_LIVE_PAYMENTS_ENABLED: "true",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    });
    expect(mixedFlag.ok).toBe(false);
    if (!mixedFlag.ok) expect(mixedFlag.code).toBe("mode_mismatch");

    const mixedDeclared = evaluateStripeLiveCaptureConfigForTests({
      ...baseLiveEnv(),
      STRIPE_SECRET_KEY: TEST_SECRET,
      STRIPE_PUBLISHABLE_KEY: TEST_PUBLISHABLE,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: TEST_PUBLISHABLE,
    });
    expect(mixedDeclared.ok).toBe(false);
  });

  it("rejects missing webhook secret in live mode", () => {
    const cfg = evaluateStripeLiveCaptureConfigForTests({
      ...baseLiveEnv(),
      STRIPE_WEBHOOK_SECRET: "",
    });
    expect(cfg.ok).toBe(false);
    if (!cfg.ok) expect(cfg.code).toBe("live_webhook_required");

    const report = buildStripePaymentConfigReadinessReport({
      ...baseLiveEnv(),
      STRIPE_WEBHOOK_SECRET: "",
    });
    expect(report.checks.webhookSecretPresent).toBe(false);
    expect(report.issues).toContain("webhook_secret_missing");
    expect(report.ready).toBe(false);
  });

  it("rejects development live without explicit fixture token", () => {
    const cfg = evaluateStripeLiveCaptureConfigForTests({
      ...baseLiveEnv(),
      NODE_ENV: "development",
      VERCEL_ENV: "development",
    });
    expect(cfg.ok).toBe(false);
    if (!cfg.ok) expect(cfg.code).toBe("live_forbidden_non_production");
  });

  it("allows live-shaped config in test only with fixture token", () => {
    const cfg = evaluateStripeLiveCaptureConfigForTests({
      ...baseLiveEnv(),
      NODE_ENV: "test",
      VERCEL_ENV: "development",
      STRIPE_ALLOW_LIVE_IN_NON_PRODUCTION:
        STRIPE_LIVE_NON_PRODUCTION_FIXTURE_TOKEN,
    });
    expect(cfg.ok).toBe(true);
    if (!cfg.ok) return;
    expect(cfg.mode).toBe("live");
  });

  it("rejects production test when policy requires live", () => {
    const cfg = evaluateStripeLiveCaptureConfigForTests({
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      STRIPE_SECRET_KEY: TEST_SECRET,
      STRIPE_MODE: "test",
      STRIPE_REQUIRE_LIVE_IN_PRODUCTION: "true",
      NEXT_PUBLIC_APP_URL: "https://umtuba.example",
    });
    expect(cfg.ok).toBe(false);
    if (!cfg.ok) expect(cfg.code).toBe("production_requires_live");
  });

  it("readiness report never leaks secrets", () => {
    const report = buildStripePaymentConfigReadinessReport(baseLiveEnv());
    expect(report.version).toBe(STRIPE_PAYMENT_PRODUCTION_GATE_VERSION);
    expect(report.captureConfigured).toBe(true);
    expect(report.ready).toBe(true);
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain(LIVE_SECRET);
    expect(serialized).not.toContain(LIVE_PUBLISHABLE);
    expect(serialized).not.toContain(WEBHOOK);
    expect(serialized).not.toContain(STRIPE_PRODUCTION_GATE_ACK_VALUE);
    expect(report.fingerprints.secretKeyPrefix).toMatch(/^sk_live_/);
    expect(report.fingerprints.secretKeyPrefix?.endsWith("…")).toBe(true);
  });

  it("rejects incomplete live production gate", () => {
    const cfg = evaluateStripeLiveCaptureConfigForTests({
      NODE_ENV: "production",
      STRIPE_SECRET_KEY: LIVE_SECRET,
      NEXT_PUBLIC_APP_URL: "https://umtuba.example",
    });
    expect(cfg.ok).toBe(false);
    if (!cfg.ok) expect(cfg.code).toMatch(/live_/);
  });

  it("rejects live http app origin", () => {
    const cfg = evaluateStripeLiveCaptureConfigForTests({
      ...baseLiveEnv(),
      NEXT_PUBLIC_APP_URL: "http://umtuba.example",
    });
    expect(cfg.ok).toBe(false);
    if (!cfg.ok) expect(cfg.code).toBe("live_https_required");
  });

  it("process env helper stays fail-closed without stubs", () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.test");
    expect(getStripeLiveCaptureConfig().ok).toBe(false);
  });

  it("source modules avoid embedding real-looking live secrets", () => {
    const configSrc = readFileSync(
      join(ROOT, "lib/store/stripeConfig.ts"),
      "utf8"
    );
    expect(configSrc).toMatch(/STRIPE_PRODUCTION_GATE_ACK/);
    expect(configSrc).not.toMatch(/sk_live_[A-Za-z0-9]{20,}/);
    expect(configSrc).not.toMatch(/whsec_[A-Za-z0-9]{20,}/);

    const webhook = readFileSync(
      join(ROOT, "app/api/store/payments/stripe/webhook/route.ts"),
      "utf8"
    );
    expect(webhook).toMatch(/stripe-signature/);
    expect(webhook).toMatch(/verifyStripeWebhookEvent/);

    const returnRoute = readFileSync(
      join(ROOT, "app/api/store/payments/stripe/return/route.ts"),
      "utf8"
    );
    expect(returnRoute).toMatch(/verifyStripeCheckoutSessionForCapture/);

    const checkout = readFileSync(
      join(ROOT, "app/components/store/CheckoutClient.tsx"),
      "utf8"
    );
    expect(checkout).not.toMatch(/STRIPE_SECRET_KEY/);
  });
});
