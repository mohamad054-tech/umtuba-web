/**
 * Focused tests — Commerce Post-Capture Digital Entitlement Grant V1.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { STORE_PAYMENT_SYNC_RPC } from "./paymentOutcomeSync";
import { STORE_SETTLEMENT_RPC } from "./settlementFoundation";
import {
  buildDigitalEntitlementGrantEventKey,
  DIGITAL_ENTITLEMENT_GRANT_ID,
  grantDigitalEntitlementsAfterTrustedCapture,
  STORE_DIGITAL_ENTITLEMENT_GRANT_RPC,
  STORE_DIGITAL_ENTITLEMENT_LIST_RPC,
} from "./digitalEntitlementGrant";
import { STORE_COMMISSION_DECOMPOSITION_APPLY_RPC } from "./commissionDecompositionBridgeApply";
import { applyVerifiedStorePaymentOutcome } from "./stripePaymentOutcomeApply";

const ROOT = join(__dirname, "../..");
const MIGRATION =
  "supabase/migrations/20260877_store_digital_entitlement_grant_v1.sql";
const ATTEMPT = "22222222-2222-4222-8222-222222222222";
const CAPTURE_KEY = "stripe:pi_test_1234567890abcdef:captured";
const CORR = "stripe-attempt-222222222222422282222222222222";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Digital entitlement grant — migration contracts", () => {
  it("ships 20260877 with grant/list RPCs and buyer RLS", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(readdirSync(join(ROOT, "supabase/migrations"))).toContain(
      "20260877_store_digital_entitlement_grant_v1.sql"
    );
    const sql = read(MIGRATION);
    expect(sql).toMatch(/create table if not exists public\.store_digital_entitlements/);
    expect(sql).toMatch(/grant_store_digital_entitlements_after_capture/);
    expect(sql).toMatch(/list_my_store_digital_entitlements/);
    expect(sql).toMatch(/force row level security/);
    expect(sql).toMatch(/Buyers select own digital entitlements/);
    expect(sql).toMatch(
      /grant execute on function public\.grant_store_digital_entitlements_after_capture\([\s\S]*?\)\s+to service_role;/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.grant_store_digital_entitlements_after_capture\([\s\S]*?\)\s+from public, anon, authenticated;/i
    );
    expect(sql).toMatch(/transition_inventory_reservation/);
    expect(sql).toMatch(/fulfillment_status = 'fulfilled'/);
    expect(sql).not.toMatch(/payout|carrier|warehouse_pick|shipping_label/i);
  });
});

describe("Digital entitlement grant — helpers", () => {
  it("builds deterministic entitlement event keys", () => {
    expect(buildDigitalEntitlementGrantEventKey(CAPTURE_KEY)).toBe(
      `${CAPTURE_KEY}:entitlement`
    );
    expect(DIGITAL_ENTITLEMENT_GRANT_ID).toMatch(/entitlement_grant/);
  });

  it("grants once via RPC and reports replayed on duplicate", async () => {
    const rpc = vi.fn(
      async (_name: string, _args?: Record<string, unknown>) => ({
        data: {
          ok: true,
          replayed: false,
          entitlements_granted: 1,
          reservations_consumed: 1,
          fulfillment_marked: true,
        },
        error: null,
      })
    );
    const first = await grantDigitalEntitlementsAfterTrustedCapture(
      { rpc } as never,
      {
        paymentAttemptId: ATTEMPT,
        captureEventKey: CAPTURE_KEY,
        correlationId: CORR,
      }
    );
    expect(first.status).toBe("granted");
    if (first.status === "granted") {
      expect(first.entitlementsGranted).toBe(1);
      expect(first.fulfillmentMarked).toBe(true);
    }
    expect(rpc.mock.calls.map((c) => c[0])).toEqual([
      STORE_DIGITAL_ENTITLEMENT_GRANT_RPC,
    ]);
    expect(rpc.mock.calls[0]?.[1]).toMatchObject({
      p_event_key: `${CAPTURE_KEY}:entitlement`,
      p_correlation_id: CORR,
    });

    rpc.mockResolvedValueOnce({
      data: {
        ok: true,
        replayed: true,
        entitlements_granted: 1,
        reservations_consumed: 1,
        fulfillment_marked: true,
      },
      error: null,
    } as never);
    const second = await grantDigitalEntitlementsAfterTrustedCapture(
      { rpc } as never,
      {
        paymentAttemptId: ATTEMPT,
        captureEventKey: CAPTURE_KEY,
        correlationId: CORR,
      }
    );
    expect(second.status).toBe("granted");
    if (second.status === "granted") expect(second.replayed).toBe(true);
  });

  it("does not report granted when RPC fails", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: { message: "digital entitlement grant requires payment_attempt.status=captured" },
    }));
    const result = await grantDigitalEntitlementsAfterTrustedCapture(
      { rpc } as never,
      {
        paymentAttemptId: ATTEMPT,
        captureEventKey: CAPTURE_KEY,
        correlationId: CORR,
      }
    );
    expect(result.status).toBe("failed");
  });
});

describe("Digital entitlement grant — capture wiring", () => {
  it("captured Sync allocates then grants then releases; failed outcomes skip grant", async () => {
    const rpc = vi.fn(async (name: string, args?: Record<string, unknown>) => {
      if (name === STORE_PAYMENT_SYNC_RPC) {
        return { data: { replayed: false, event_id: "evt-1" }, error: null };
      }
      if (name === STORE_SETTLEMENT_RPC) {
        if (args?.p_action === "release") {
          return { data: { replayed: false, action: "release" }, error: null };
        }
        return { data: { replayed: false, action: "allocate" }, error: null };
      }
      if (name === STORE_COMMISSION_DECOMPOSITION_APPLY_RPC) {
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
            entitlements_granted: 2,
            reservations_consumed: 1,
            fulfillment_marked: true,
          },
          error: null,
        };
      }
            if (name === "decrement_store_purchase_stock_after_capture") {
        return {
          data: {
            ok: true,
            replayed: false,
            lines_decremented: 0,
            quantity_decremented: 0,
            reservations_consumed: 0,
          },
          error: null,
        };
      }
      return { data: null, error: { message: `unexpected ${name}` } };
    });

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
    expect(applied.commission.status).toBe("not_configured");
    expect(applied.entitlement.status).toBe("granted");
    expect(applied.release.status).toBe("released");
    expect(rpc.mock.calls.map((c) => c[0])).toEqual([
      STORE_PAYMENT_SYNC_RPC,
      STORE_SETTLEMENT_RPC,
      STORE_COMMISSION_DECOMPOSITION_APPLY_RPC,
      "decrement_store_purchase_stock_after_capture",
      STORE_DIGITAL_ENTITLEMENT_GRANT_RPC,
      STORE_SETTLEMENT_RPC,
    ]);

    rpc.mockClear();
    rpc.mockImplementation(
      async (_name: string, _args?: Record<string, unknown>) =>
        ({
          data: { replayed: false },
          error: null,
        }) as never
    );
    const cancelled = await applyVerifiedStorePaymentOutcome(
      {
        paymentAttemptId: ATTEMPT,
        outcome: "cancelled",
        eventKey: "stripe:pi_x:cancelled",
        correlationId: CORR,
        providerReference: "pi_x",
        amountMinor: 2500,
        currency: "USD",
      },
      { supabase: { rpc } as never }
    );
    expect(cancelled.ok).toBe(true);
    if (!cancelled.ok) return;
    expect(cancelled.entitlement.status).toBe("skipped");
    expect(cancelled.release.status).toBe("skipped");
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("keeps grant server-only and list RPC buyer-facing", () => {
    const apply = read("lib/store/stripePaymentOutcomeApply.ts");
    expect(apply).toMatch(/grantDigitalEntitlementsAfterTrustedCapture/);
    expect(apply).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);

    const checkout = read("app/components/store/CheckoutClient.tsx");
    expect(checkout).not.toMatch(/grant_store_digital_entitlements/);

    const actions = read("app/actions/storeStripePayments.ts");
    expect(actions).not.toMatch(/grant_store_digital_entitlements/);

    expect(STORE_DIGITAL_ENTITLEMENT_LIST_RPC).toBe(
      "list_my_store_digital_entitlements"
    );
    expect(read("lib/store/orders.ts")).toMatch(/listMyDigitalEntitlements/);
    expect(read("app/components/store/OrderDetailView.tsx")).toMatch(
      /Digital access|BuyerDigitalAccessButton/
    );
  });
});
