/**
 * Seller Live Payout Provider V1 — Slice S1 gate + port tests.
 * Placeholders only. Never real secrets or live transfers.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  SELLER_LIVE_PAYOUT_NON_PRODUCTION_FIXTURE_TOKEN,
  SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK_VALUE,
  SELLER_LIVE_PAYOUT_PROVIDER_VERSION,
  SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
  assertSellerLivePayoutProviderAllowed,
  buildSellerLivePayoutGateReadinessReport,
  evaluateSellerLivePayoutGateForTests,
  getSellerLivePayoutProviderContract,
  isSellerLivePayoutGateSatisfied,
  resolveSellerLivePayoutProviderPort,
} from "./index";

const ROOT = join(__dirname, "../../..");

function baseLiveEnv(): Record<string, string> {
  return {
    NODE_ENV: "production",
    VERCEL_ENV: "production",
    SELLER_LIVE_PAYOUTS_ENABLED: "true",
    SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK:
      SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK_VALUE,
    SELLER_LIVE_PAYOUT_PROVIDER: SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Seller Live Payout Gate V1 (S1)", () => {
  it("defaults to live OFF with empty env", () => {
    const result = evaluateSellerLivePayoutGateForTests({});
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.livePayoutsEnabled).toBe(false);
    expect(result.code).toBe("live_flag_disabled");
    expect(isSellerLivePayoutGateSatisfied({})).toBe(false);
  });

  it("rejects missing production ACK when flag is on", () => {
    const result = evaluateSellerLivePayoutGateForTests({
      NODE_ENV: "production",
      SELLER_LIVE_PAYOUTS_ENABLED: "true",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("production_gate_ack_missing");
  });

  it("rejects live in non-production without fixture token", () => {
    const result = evaluateSellerLivePayoutGateForTests({
      NODE_ENV: "development",
      SELLER_LIVE_PAYOUTS_ENABLED: "true",
      SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK:
        SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK_VALUE,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("live_forbidden_non_production");
  });

  it("allows fixture live shape in non-production with token", () => {
    const result = evaluateSellerLivePayoutGateForTests({
      NODE_ENV: "test",
      SELLER_LIVE_PAYOUTS_ENABLED: "true",
      SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK:
        SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK_VALUE,
      SELLER_LIVE_PAYOUT_ALLOW_IN_NON_PRODUCTION:
        SELLER_LIVE_PAYOUT_NON_PRODUCTION_FIXTURE_TOKEN,
      SELLER_LIVE_PAYOUT_PROVIDER: SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.providerId).toBe(SELLER_LIVE_PAYOUT_V1_PROVIDER_ID);
    expect(result.productionGateSatisfied).toBe(true);
  });

  it("accepts complete production gate for manual_ops_live", () => {
    const result = evaluateSellerLivePayoutGateForTests(baseLiveEnv());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.livePayoutsEnabled).toBe(true);
    expect(result.providerId).toBe("manual_ops_live");
  });

  it("rejects stripe_connect as V1 provider even when flag/ack set", () => {
    const result = evaluateSellerLivePayoutGateForTests({
      ...baseLiveEnv(),
      SELLER_LIVE_PAYOUT_PROVIDER: "stripe_connect",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("provider_not_allowed");
  });

  it("builds redacted readiness report without secrets", () => {
    const empty = buildSellerLivePayoutGateReadinessReport({});
    expect(empty.version).toBe(SELLER_LIVE_PAYOUT_PROVIDER_VERSION);
    expect(empty.ready).toBe(false);
    expect(empty.livePayoutsEnabledFlag).toBe(false);
    expect(empty.issues.length).toBeGreaterThan(0);
    expect(JSON.stringify(empty)).not.toMatch(/sk_live_|whsec_|password/i);

    const ready = buildSellerLivePayoutGateReadinessReport(baseLiveEnv());
    expect(ready.ready).toBe(true);
    expect(ready.productionGateAck).toBe(true);
    expect(ready.v1ProviderId).toBe(SELLER_LIVE_PAYOUT_V1_PROVIDER_ID);
  });
});

describe("Seller Live Payout Provider Port V1 (S1)", () => {
  it("exposes manual_ops_live as V1-enabled live contract", () => {
    const c = getSellerLivePayoutProviderContract("manual_ops_live");
    expect(c?.enabledForV1).toBe(true);
    expect(c?.supportsLiveTransfer).toBe(true);
  });

  it("keeps stripe_connect reserved and disabled for V1", () => {
    const c = getSellerLivePayoutProviderContract("stripe_connect");
    expect(c?.enabledForV1).toBe(false);
    expect(() => assertSellerLivePayoutProviderAllowed("stripe_connect")).toThrow(
      /forbidden|not allowed/i
    );
  });

  it("forbids wise/paypal-style provider ids", () => {
    expect(() => assertSellerLivePayoutProviderAllowed("wise")).toThrow();
    expect(() => assertSellerLivePayoutProviderAllowed("paypal")).toThrow();
  });

  it("allows manual_ops_live id but resolves no concrete port in S1", () => {
    expect(() =>
      assertSellerLivePayoutProviderAllowed("manual_ops_live")
    ).not.toThrow();
    expect(resolveSellerLivePayoutProviderPort("manual_ops_live")).toBeNull();
  });
});

describe("Seller Live Payout S1 — env example contracts", () => {
  it("documents gate env names as placeholders only", () => {
    const envExample = readFileSync(join(ROOT, ".env.example"), "utf8");
    expect(envExample).toContain("SELLER_LIVE_PAYOUTS_ENABLED");
    expect(envExample).toContain("SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK");
    expect(envExample).toContain("SELLER_LIVE_PAYOUT_PROVIDER");
    expect(envExample).toContain(
      SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK_VALUE
    );
    expect(envExample).toMatch(/Never set SELLER_LIVE_PAYOUT_ALLOW_IN_NON_PRODUCTION/i);
    expect(envExample).not.toMatch(/sk_live_[A-Za-z0-9]{10,}/);
  });
});
