/**
 * Focused tests — Commerce Buyer Delivery & Post-Purchase Flow V1.
 */

import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BUYER_DELIVERY_POST_PURCHASE_FLOW_ID,
  buyerOrdersHaveDigitalEntitlements,
  mapOrdersWithDigitalEntitlements,
} from "./buyerDigitalPostPurchase";
import {
  buildBuyerStatusChips,
  buyerDeliveryStatusLabel,
  buyerFulfillmentStatusLabel,
} from "./buyerOrdersPresentation";

const ROOT = join(__dirname, "../..");
const ORDER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORDER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ENT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

describe("Buyer post-purchase flow — contracts", () => {
  it("exposes capability id and wires surfaces without new mint path", () => {
    expect(BUYER_DELIVERY_POST_PURCHASE_FLOW_ID).toMatch(
      /buyer_delivery_post_purchase/
    );
    expect(
      existsSync(join(ROOT, "app/store/orders/digital-access/page.tsx"))
    ).toBe(true);
    expect(
      existsSync(
        join(ROOT, "app/components/store/BuyerDigitalAccessLibrary.tsx")
      )
    ).toBe(true);
    const actions = read("app/actions/storeOrders.ts");
    expect(actions).toMatch(/probeBuyerDigitalAccessForOrdersAction/);
    expect(actions).toMatch(/mintBuyerDigitalAccessSignedUrl/);
    expect(actions).not.toMatch(/createSignedUrl/);
    expect(read("lib/store/digitalAccessDelivery.ts")).toMatch(
      /mintBuyerDigitalAccessSignedUrl/
    );
  });
});

describe("Buyer post-purchase flow — fail-closed entitlement map", () => {
  it("marks only orders with active entitlements", async () => {
    const client = {
      rpc: vi.fn(async () => ({
        data: {
          entitlements: [
            {
              id: ENT,
              order_id: ORDER_A,
              order_item_id: ORDER_A,
              product_id: ORDER_A,
              store_id: ORDER_A,
              status: "active",
              title_snapshot: "Pack",
              sku_snapshot: null,
              granted_at: "2026-07-30T00:00:00.000Z",
            },
            {
              id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
              order_id: ORDER_B,
              order_item_id: ORDER_B,
              product_id: ORDER_B,
              store_id: ORDER_B,
              status: "inactive",
              title_snapshot: "Old",
              sku_snapshot: null,
              granted_at: "2026-07-30T00:00:00.000Z",
            },
          ],
        },
        error: null,
      })),
    };

    const mapped = await mapOrdersWithDigitalEntitlements(client as never, [
      ORDER_A,
      ORDER_B,
    ]);
    expect(mapped.has(ORDER_A)).toBe(true);
    expect(mapped.has(ORDER_B)).toBe(false);

    const probe = await buyerOrdersHaveDigitalEntitlements(client as never, [
      ORDER_A,
      ORDER_B,
    ]);
    expect(probe.hasDigitalAccess).toBe(true);
    expect(probe.entitlementCount).toBe(1);
  });

  it("fails closed when entitlement listing errors", async () => {
    const client = {
      rpc: vi.fn(async () => ({
        data: null,
        error: { message: "denied" },
      })),
    };
    const mapped = await mapOrdersWithDigitalEntitlements(client as never, [
      ORDER_A,
    ]);
    expect(mapped.size).toBe(0);
    const probe = await buyerOrdersHaveDigitalEntitlements(client as never, [
      ORDER_A,
    ]);
    expect(probe.hasDigitalAccess).toBe(false);
    expect(probe.entitlementCount).toBe(0);
  });
});

describe("Buyer post-purchase flow — digital-aware presentation", () => {
  it("uses digital access wording instead of shipping metaphors", () => {
    expect(
      buyerDeliveryStatusLabel({
        status: "confirmed",
        hasDigitalAccess: true,
      }).label
    ).toBe("Digital access");
    expect(
      buyerFulfillmentStatusLabel("fulfilled", { hasDigitalAccess: true })
    ).toBe("Digital fulfillment complete");

    const chips = buildBuyerStatusChips({
      status: "confirmed",
      paymentStatus: "paid",
      fulfillmentStatus: "fulfilled",
      hasDigitalAccess: true,
    });
    expect(chips.find((c) => c.kind === "delivery")?.label).toMatch(/Access/);
    expect(chips.find((c) => c.kind === "delivery")?.raw).toBe("digital_access");
  });

  it("preserves physical shipping wording when digital access is absent", () => {
    expect(
      buyerDeliveryStatusLabel({ status: "packed" }).label
    ).toBe("Ready for shipping");
    const chips = buildBuyerStatusChips({
      status: "processing",
      paymentStatus: "pending",
      fulfillmentStatus: "unfulfilled",
    });
    expect(chips.find((c) => c.kind === "delivery")?.label).toMatch(
      /Not handed to shipping/
    );
  });
});

describe("Buyer post-purchase flow — surface copy", () => {
  it("removes deferred-payment-only framing from orders page", () => {
    const page = read("app/store/orders/page.tsx");
    expect(page).toMatch(/Digital access/);
    expect(page).not.toMatch(/Payment collection remains deferred/);
    expect(page).toMatch(/storeDigitalAccess/);
  });

  it("adds checkout success CTA wiring for digital entitlements", () => {
    const checkout = read("app/components/store/CheckoutClient.tsx");
    expect(checkout).toMatch(/probeBuyerDigitalAccessForOrdersAction/);
    expect(checkout).toMatch(/Digital access is ready/);
    expect(checkout).toMatch(/storeDigitalAccess/);
  });
});
