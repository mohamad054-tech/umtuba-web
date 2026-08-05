/**
 * Seller Live Payout Provider V1 — Slice S3 Manual Ops Live tests.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SELLER_LIVE_PAYOUT_NON_PRODUCTION_FIXTURE_TOKEN,
  SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK_VALUE,
  SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
  assertSellerLivePayoutProviderAllowed,
  buildManualOpsLiveProviderRef,
  createManualOpsLiveTransferForTests,
  mapTransferStatusToDurableExecutionStatus,
  resolveSellerLivePayoutProviderPort,
  type SellerLivePayoutTransferInput,
} from "./index";

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

function sampleInput(
  overrides: Partial<SellerLivePayoutTransferInput> = {}
): SellerLivePayoutTransferInput {
  return {
    storeId: "11111111-1111-4111-8111-111111111111",
    captureEventId: "22222222-2222-4222-8222-222222222222",
    executionId: "33333333-3333-4333-8333-333333333333",
    amountMinor: 1500,
    currency: "USD",
    idempotencyKey: "idem-key-manual-ops-01",
    destinationId: "44444444-4444-4444-8444-444444444444",
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Manual Ops Live provider (S3)", () => {
  it("stays unresolved when the live gate is OFF", () => {
    expect(resolveSellerLivePayoutProviderPort("manual_ops_live", {})).toBeNull();
  });

  it("resolves only when the S1 gate is satisfied", () => {
    const port = resolveSellerLivePayoutProviderPort(
      "manual_ops_live",
      baseLiveEnv()
    );
    expect(port).not.toBeNull();
    expect(port?.providerId).toBe("manual_ops_live");
    expect(port?.supportsLiveTransfer).toBe(true);
  });

  it("forbids Connect / Wise / PayPal resolve paths", () => {
    expect(() =>
      assertSellerLivePayoutProviderAllowed("stripe_connect")
    ).toThrow(/forbidden|not allowed/i);
    expect(() => assertSellerLivePayoutProviderAllowed("wise")).toThrow();
    expect(() => assertSellerLivePayoutProviderAllowed("paypal")).toThrow();
    expect(() =>
      resolveSellerLivePayoutProviderPort("stripe_connect", baseLiveEnv())
    ).toThrow();
  });

  it("fails createTransfer when gate is incomplete", async () => {
    const result = await createManualOpsLiveTransferForTests(sampleInput(), {});
    expect(result.status).toBe("failed");
    expect(result.failureCode).toBe("gate_incomplete");
    expect(result.providerRef).toBeNull();
  });

  it("never reports succeeded on create — awaiting attestation only", async () => {
    const result = await createManualOpsLiveTransferForTests(
      sampleInput(),
      baseLiveEnv()
    );
    expect(result.status).toBe("pending");
    expect(result.failureCode).toBe("attestation_required");
    expect(result.providerRef).toMatch(/^mol-/);
    expect(result.note).toMatch(/attestation/i);
    expect(result.note).toMatch(/no bank transfer/i);
    expect(mapTransferStatusToDurableExecutionStatus(result.status)).toBe(
      "awaiting_attestation"
    );
  });

  it("rejects invalid trusted amount without network I/O", async () => {
    const result = await createManualOpsLiveTransferForTests(
      sampleInput({ amountMinor: 0 }),
      baseLiveEnv()
    );
    expect(result.status).toBe("failed");
    expect(result.failureCode).toBe("invalid_amount");
  });

  it("supports fixture gate in non-production for unit tests", async () => {
    const result = await createManualOpsLiveTransferForTests(sampleInput(), {
      NODE_ENV: "test",
      SELLER_LIVE_PAYOUTS_ENABLED: "true",
      SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK:
        SELLER_LIVE_PAYOUT_PRODUCTION_GATE_ACK_VALUE,
      SELLER_LIVE_PAYOUT_ALLOW_IN_NON_PRODUCTION:
        SELLER_LIVE_PAYOUT_NON_PRODUCTION_FIXTURE_TOKEN,
      SELLER_LIVE_PAYOUT_PROVIDER: SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
    });
    expect(result.status).toBe("pending");
    expect(result.failureCode).toBe("attestation_required");
  });

  it("builds non-secret provider refs", () => {
    const ref = buildManualOpsLiveProviderRef(
      "33333333-3333-4333-8333-333333333333",
      "idem-key-manual-ops-01"
    );
    expect(ref).toMatch(/^mol-/);
    expect(ref).not.toMatch(/[0-9]{12,}/);
    expect(ref.toLowerCase()).not.toContain("sk_" + "live_");
    expect(ref.toLowerCase()).not.toContain("whsec" + "_");
    expect(ref.toLowerCase()).not.toContain("password");
  });

  it("maps transfer outcomes to durable-compatible statuses", () => {
    expect(mapTransferStatusToDurableExecutionStatus("pending")).toBe(
      "awaiting_attestation"
    );
    expect(mapTransferStatusToDurableExecutionStatus("failed")).toBe("failed");
    expect(mapTransferStatusToDurableExecutionStatus("uncertain")).toBe(
      "uncertain"
    );
    // Never treat create-time "succeeded" as durable success.
    expect(mapTransferStatusToDurableExecutionStatus("succeeded")).toBe(
      "uncertain"
    );
  });
});
