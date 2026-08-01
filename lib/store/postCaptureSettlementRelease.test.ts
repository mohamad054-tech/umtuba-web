/**
 * Focused tests — Commerce Post-Capture Settlement Release V1.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { STORE_PAYMENT_SYNC_RPC } from "./paymentOutcomeSync";
import { STORE_SETTLEMENT_RPC } from "./settlementFoundation";
import { STORE_DIGITAL_ENTITLEMENT_GRANT_RPC } from "./digitalEntitlementGrant";
import {
  buildPostCaptureReleaseEventKey,
  POST_CAPTURE_RELEASE_ACTION,
  POST_CAPTURE_SETTLEMENT_RELEASE_ID,
  releaseSettlementAfterTrustedFulfillment,
} from "./postCaptureSettlementRelease";
import { applyVerifiedStorePaymentOutcome } from "./stripePaymentOutcomeApply";

const ROOT = join(__dirname, "../..");
const ATTEMPT = "22222222-2222-4222-8222-222222222222";
const CAPTURE_KEY = "stripe:pi_test_1234567890abcdef:captured";
const CORR = "stripe-attempt-222222222222422282222222222222";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Post-capture release — contracts", () => {
  it("reuses Settlement Foundation release action and RPC only", () => {
    expect(POST_CAPTURE_RELEASE_ACTION).toBe("release");
    expect(STORE_SETTLEMENT_RPC).toBe("apply_store_settlement_event");
    expect(buildPostCaptureReleaseEventKey(CAPTURE_KEY)).toBe(
      `${CAPTURE_KEY}:release`
    );
    expect(POST_CAPTURE_SETTLEMENT_RELEASE_ID).toMatch(/post_capture_release/);
    const src = read("lib/store/postCaptureSettlementRelease.ts");
    expect(src).toMatch(/STORE_SETTLEMENT_RPC/);
    expect(src).toMatch(/p_action:\s*POST_CAPTURE_RELEASE_ACTION/);
    expect(src).not.toMatch(/p_action:\s*["']allocate["']/);
    expect(src).not.toMatch(/stripe\.payouts|Payout\.create|transfer\.create/i);
  });

  it("does not add a release migration (reuse Settlement Foundation)", () => {
    const migrations = readdirSync(join(ROOT, "supabase/migrations"));
    expect(
      migrations.some((f) => f.includes("post_capture_settlement_release"))
    ).toBe(false);
  });
});

describe("Post-capture release — RPC behavior", () => {
  it("successful trusted release uses server-derived money once", async () => {
    const rpc = vi.fn(
      async (name: string, args?: Record<string, unknown>) => {
        expect(name).toBe(STORE_SETTLEMENT_RPC);
        expect(args).toMatchObject({
          p_action: "release",
          p_event_key: `${CAPTURE_KEY}:release`,
          p_correlation_id: CORR,
          p_payment_attempt_id: ATTEMPT,
          p_amount_minor: 2500,
          p_currency: "USD",
        });
        return { data: { replayed: false, action: "release" }, error: null };
      }
    );
    const result = await releaseSettlementAfterTrustedFulfillment(
      { rpc } as never,
      {
        paymentAttemptId: ATTEMPT,
        correlationId: CORR,
        captureEventKey: CAPTURE_KEY,
        amountMinor: 2500,
        currency: "USD",
        providerReference: "pi_test_1234567890abcdef",
      }
    );
    expect(result).toEqual({
      status: "released",
      replayed: false,
      data: { replayed: false, action: "release" },
    });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("replayed release event remains safe", async () => {
    const rpc = vi.fn(async () => ({
      data: { replayed: true, action: "release" },
      error: null,
    }));
    const result = await releaseSettlementAfterTrustedFulfillment(
      { rpc } as never,
      {
        paymentAttemptId: ATTEMPT,
        correlationId: CORR,
        captureEventKey: CAPTURE_KEY,
        amountMinor: 2500,
        currency: "USD",
      }
    );
    expect(result.status).toBe("released");
    if (result.status === "released") {
      expect(result.replayed).toBe(true);
    }
  });

  it("rejects non-positive client-like amount before RPC", async () => {
    const rpc = vi.fn();
    const result = await releaseSettlementAfterTrustedFulfillment(
      { rpc } as never,
      {
        paymentAttemptId: ATTEMPT,
        correlationId: CORR,
        captureEventKey: CAPTURE_KEY,
        amountMinor: 0,
        currency: "USD",
      }
    );
    expect(result).toEqual({
      status: "failed",
      message: "Settlement release requires a positive trusted amount.",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("does not report released when RPC fails", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: { message: "settlement action release not allowed: capture is REVERSED" },
    }));
    const result = await releaseSettlementAfterTrustedFulfillment(
      { rpc } as never,
      {
        paymentAttemptId: ATTEMPT,
        correlationId: CORR,
        captureEventKey: CAPTURE_KEY,
        amountMinor: 2500,
        currency: "USD",
      }
    );
    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.message).toMatch(/not allowed|REVERSED/i);
    }
  });
});

describe("Post-capture release — capture wiring", () => {
  it("captured Sync allocates, grants, then releases exactly once", async () => {
    const rpc = vi.fn(
      async (name: string, args?: Record<string, unknown>) => {
        if (name === STORE_PAYMENT_SYNC_RPC) {
          return { data: { replayed: false, event_id: "evt-1" }, error: null };
        }
        if (name === STORE_SETTLEMENT_RPC) {
          if (args?.p_action === "allocate") {
            return {
              data: { replayed: false, action: "allocate" },
              error: null,
            };
          }
          expect(args).toMatchObject({
            p_action: "release",
            p_event_key: `${CAPTURE_KEY}:release`,
            p_amount_minor: 2500,
            p_currency: "USD",
          });
          return { data: { replayed: false, action: "release" }, error: null };
        }
        if (name === "apply_store_commission_decomposition_after_capture") {
          return {
            data: {
              ok: true,
              replayed: false,
              policy_status: "not_configured",
              lifecycle_status: "not_configured",
              capture_amount_minor: 2500,
            },
            error: null,
          };
        }
        if (name === STORE_DIGITAL_ENTITLEMENT_GRANT_RPC) {
          return {
            data: {
              ok: true,
              replayed: false,
              entitlements_granted: 1,
              reservations_consumed: 1,
              fulfillment_marked: true,
            },
            error: null,
          };
        }
        return { data: null, error: { message: `unexpected ${name}` } };
      }
    );

    const applied = await applyVerifiedStorePaymentOutcome(
      {
        paymentAttemptId: ATTEMPT,
        outcome: "captured",
        eventKey: CAPTURE_KEY,
        correlationId: CORR,
        providerReference: "pi_test_1234567890abcdef",
        amountMinor: 2500,
        currency: "USD",
      },
      { supabase: { rpc } as never }
    );
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.settlement.status).toBe("allocated");
    expect(applied.entitlement.status).toBe("granted");
    expect(applied.release.status).toBe("released");
    expect(rpc.mock.calls.map((c) => c[0])).toEqual([
      STORE_PAYMENT_SYNC_RPC,
      STORE_SETTLEMENT_RPC,
      "apply_store_commission_decomposition_after_capture",
      STORE_DIGITAL_ENTITLEMENT_GRANT_RPC,
      STORE_SETTLEMENT_RPC,
    ]);
    expect(rpc.mock.calls[1]?.[1]).toMatchObject({ p_action: "allocate" });
    expect(rpc.mock.calls[4]?.[1]).toMatchObject({
      p_action: "release",
      p_event_key: `${CAPTURE_KEY}:release`,
    });
  });

  it("duplicate capture event does not double-release (replayed release)", async () => {
    const rpc = vi.fn(
      async (name: string, args?: Record<string, unknown>) => {
        if (name === STORE_PAYMENT_SYNC_RPC) {
          return { data: { replayed: true, event_id: "evt-1" }, error: null };
        }
        if (name === STORE_SETTLEMENT_RPC) {
          if (args?.p_action === "allocate") {
            return {
              data: { replayed: true, action: "allocate" },
              error: null,
            };
          }
          return { data: { replayed: true, action: "release" }, error: null };
        }
        if (name === "apply_store_commission_decomposition_after_capture") {
          return {
            data: {
              ok: true,
              replayed: true,
              policy_status: "not_configured",
              lifecycle_status: "not_configured",
              capture_amount_minor: 2500,
            },
            error: null,
          };
        }
        if (name === STORE_DIGITAL_ENTITLEMENT_GRANT_RPC) {
          return {
            data: {
              ok: true,
              replayed: true,
              entitlements_granted: 1,
              reservations_consumed: 1,
              fulfillment_marked: true,
            },
            error: null,
          };
        }
        return { data: null, error: { message: `unexpected ${name}` } };
      }
    );

    const applied = await applyVerifiedStorePaymentOutcome(
      {
        paymentAttemptId: ATTEMPT,
        outcome: "captured",
        eventKey: CAPTURE_KEY,
        correlationId: CORR,
        providerReference: "pi_test_1234567890abcdef",
        amountMinor: 2500,
        currency: "USD",
      },
      { supabase: { rpc } as never }
    );
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.release.status).toBe("released");
    if (applied.release.status === "released") {
      expect(applied.release.replayed).toBe(true);
    }
    const releaseCalls = rpc.mock.calls.filter(
      (c) =>
        c[0] === STORE_SETTLEMENT_RPC &&
        (c[1] as Record<string, unknown> | undefined)?.p_action === "release"
    );
    expect(releaseCalls).toHaveLength(1);
  });

  it("failed and cancelled payments never release", async () => {
    const rpc = vi.fn(
      async (_name: string, _args?: Record<string, unknown>) => ({
        data: { replayed: false },
        error: null,
      })
    );
    for (const outcome of ["failed", "cancelled"] as const) {
      rpc.mockClear();
      const applied = await applyVerifiedStorePaymentOutcome(
        {
          paymentAttemptId: ATTEMPT,
          outcome,
          eventKey: `stripe:pi_x:${outcome}`,
          correlationId: CORR,
          providerReference: "pi_x",
          amountMinor: 2500,
          currency: "USD",
        },
        { supabase: { rpc } as never }
      );
      expect(applied.ok).toBe(true);
      if (!applied.ok) return;
      expect(applied.release.status).toBe("skipped");
      expect(rpc).toHaveBeenCalledTimes(1);
      expect(rpc.mock.calls.map((c) => c[0])).toEqual([STORE_PAYMENT_SYNC_RPC]);
    }
  });

  it("allocate failure blocks release", async () => {
    const rpc = vi.fn(
      async (_name: string, _args?: Record<string, unknown>) => {
        if (_name === STORE_PAYMENT_SYNC_RPC) {
          return { data: { replayed: false }, error: null };
        }
        if (_name === STORE_SETTLEMENT_RPC) {
          return {
            data: null,
            error: {
              message: "settlement requires a trusted capture outcome event",
            },
          };
        }
        if (_name === STORE_DIGITAL_ENTITLEMENT_GRANT_RPC) {
          return {
            data: {
              ok: true,
              replayed: false,
              entitlements_granted: 1,
              reservations_consumed: 0,
              fulfillment_marked: true,
            },
            error: null,
          };
        }
        return { data: null, error: { message: `unexpected ${_name}` } };
      }
    );
    const applied = await applyVerifiedStorePaymentOutcome(
      {
        paymentAttemptId: ATTEMPT,
        outcome: "captured",
        eventKey: CAPTURE_KEY,
        correlationId: CORR,
        providerReference: "pi_test_1234567890abcdef",
        amountMinor: 2500,
        currency: "USD",
      },
      { supabase: { rpc } as never }
    );
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.settlement.status).toBe("failed");
    expect(applied.release.status).toBe("skipped");
    if (applied.release.status === "skipped") {
      expect(applied.release.reason).toMatch(/allocate failed/i);
    }
    expect(
      rpc.mock.calls.some(
        (c) =>
          c[0] === STORE_SETTLEMENT_RPC &&
          (c[1] as Record<string, unknown> | undefined)?.p_action === "release"
      )
    ).toBe(false);
  });

  it("entitlement failure blocks release", async () => {
    const rpc = vi.fn(
      async (name: string, args?: Record<string, unknown>) => {
        if (name === STORE_PAYMENT_SYNC_RPC) {
          return { data: { replayed: false }, error: null };
        }
        if (name === STORE_SETTLEMENT_RPC) {
          expect(args?.p_action).toBe("allocate");
          return { data: { replayed: false, action: "allocate" }, error: null };
        }
        if (name === "apply_store_commission_decomposition_after_capture") {
          return {
            data: {
              ok: true,
              replayed: false,
              policy_status: "not_configured",
              lifecycle_status: "not_configured",
              capture_amount_minor: 2500,
            },
            error: null,
          };
        }
        if (name === STORE_DIGITAL_ENTITLEMENT_GRANT_RPC) {
          return {
            data: null,
            error: { message: "digital entitlement grant failed closed" },
          };
        }
        return { data: null, error: { message: `unexpected ${name}` } };
      }
    );
    const applied = await applyVerifiedStorePaymentOutcome(
      {
        paymentAttemptId: ATTEMPT,
        outcome: "captured",
        eventKey: CAPTURE_KEY,
        correlationId: CORR,
        providerReference: "pi_test_1234567890abcdef",
        amountMinor: 2500,
        currency: "USD",
      },
      { supabase: { rpc } as never }
    );
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.settlement.status).toBe("allocated");
    expect(applied.entitlement.status).toBe("failed");
    expect(applied.release.status).toBe("skipped");
    if (applied.release.status === "skipped") {
      expect(applied.release.reason).toMatch(/entitlement grant failed/i);
    }
  });

  it("release failure never reports success", async () => {
    const rpc = vi.fn(
      async (name: string, args?: Record<string, unknown>) => {
        if (name === STORE_PAYMENT_SYNC_RPC) {
          return { data: { replayed: false }, error: null };
        }
        if (name === STORE_SETTLEMENT_RPC) {
          if (args?.p_action === "allocate") {
            return {
              data: { replayed: false, action: "allocate" },
              error: null,
            };
          }
          return {
            data: null,
            error: {
              message: "settlement action release not allowed: capture is UNALLOCATED",
            },
          };
        }
        if (name === "apply_store_commission_decomposition_after_capture") {
          return {
            data: {
              ok: true,
              replayed: false,
              policy_status: "not_configured",
              lifecycle_status: "not_configured",
              capture_amount_minor: 2500,
            },
            error: null,
          };
        }
        if (name === STORE_DIGITAL_ENTITLEMENT_GRANT_RPC) {
          return {
            data: {
              ok: true,
              replayed: false,
              entitlements_granted: 1,
              reservations_consumed: 0,
              fulfillment_marked: true,
            },
            error: null,
          };
        }
        return { data: null, error: { message: `unexpected ${name}` } };
      }
    );
    const applied = await applyVerifiedStorePaymentOutcome(
      {
        paymentAttemptId: ATTEMPT,
        outcome: "captured",
        eventKey: CAPTURE_KEY,
        correlationId: CORR,
        providerReference: "pi_test_1234567890abcdef",
        amountMinor: 2500,
        currency: "USD",
      },
      { supabase: { rpc } as never }
    );
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.release.status).toBe("failed");
    if (applied.release.status === "failed") {
      expect(applied.release.message).toMatch(/not allowed|UNALLOCATED/i);
    }
  });
});

describe("Post-capture release — architecture boundaries", () => {
  it("keeps release server-only and out of client checkout/actions", () => {
    const apply = read("lib/store/stripePaymentOutcomeApply.ts");
    expect(apply).toMatch(/releaseSettlementAfterTrustedFulfillment/);
    expect(apply).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    const checkout = read("app/components/store/CheckoutClient.tsx");
    expect(checkout).not.toMatch(
      /STORE_SETTLEMENT_RPC|apply_store_settlement|postCaptureSettlementRelease/
    );
    const actions = read("app/actions/storeCheckout.ts");
    expect(actions).not.toMatch(
      /STORE_SETTLEMENT_RPC|SUPABASE_SERVICE_ROLE_KEY|postCaptureSettlementRelease/
    );
    const webhook = read(
      "app/api/store/payments/stripe/webhook/route.ts"
    );
    expect(webhook).toMatch(/release: applied\.release/);
  });

  it("does not introduce bank disbursement behavior", () => {
    const src = read("lib/store/postCaptureSettlementRelease.ts");
    expect(src).not.toMatch(/stripe\.payouts|Payout\.create|bank_account|transfer\.create/i);
    const apply = read("lib/store/stripePaymentOutcomeApply.ts");
    expect(apply).not.toMatch(/stripe\.payouts|Payout\.create|transfer\.create/i);
    expect(existsSync(join(ROOT, "lib/store/postCaptureSettlementRelease.ts"))).toBe(
      true
    );
  });
});
