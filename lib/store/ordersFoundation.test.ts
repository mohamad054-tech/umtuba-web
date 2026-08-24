import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  FULFILLMENT_STATUSES,
} from "./types";
import {
  ORDER_CREATE_FORBIDDEN_ITEM_KEYS,
  ORDER_STATUS_TRANSITIONS,
  STORE_ORDER_NUMBER_RE,
  assertOrderCreateItemPayloadTrusted,
  assertOrderHeaderIdentityPreserved,
  assertOrderItemBelongsToOrderStore,
  assertOrderItemSnapshotsPreserved,
  assertOrderStatusTransition,
  buildOrderItemProductSnapshot,
  canBuyerReadOrder,
  canReadStoreOrder,
  canSellerReadOrder,
  canTransitionOrderStatus,
  computeOrderGrandTotalMinor,
  computeOrderLineTotalMinor,
  formatFulfillmentStatus,
  formatOrderMoney,
  formatOrderStatus,
  formatPaymentStatus,
  isFulfillmentStatus,
  isOrderStatus,
  isPaymentStatus,
  isValidStoreOrderNumber,
  validateOrderItemSnapshot,
  validateOrderMoneyTotals,
  validateOrderQuantity,
} from "./orderRules";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260811_store_orders_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("orders foundation migration contracts", () => {
  it("ships the orders migration file without version collision", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(MIGRATION).toContain("20260811_store_orders_foundation_v1");
  });

  it("creates orders and order_items with exact money + status constraints", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/create table if not exists public\.orders/);
    expect(sql).toMatch(/create table if not exists public\.order_items/);
    expect(sql).toMatch(/subtotal_minor bigint not null check \(subtotal_minor >= 0\)/);
    expect(sql).toMatch(/discount_total_minor bigint not null default 0/);
    expect(sql).toMatch(/tax_total_minor bigint not null default 0/);
    expect(sql).toMatch(/shipping_total_minor bigint not null default 0/);
    expect(sql).toMatch(/grand_total_minor bigint not null check \(grand_total_minor >= 0\)/);
    expect(sql).toMatch(/orders_grand_total_math_check/);
    expect(sql).toMatch(/quantity integer not null check \(quantity > 0/);
    expect(sql).toMatch(/unit_price_minor bigint not null check \(unit_price_minor >= 0\)/);
    expect(sql).toMatch(/total_price_minor = unit_price_minor \* quantity/);
    expect(sql).toMatch(/currency text not null check \(currency ~ '\^\[A-Z\]\{3\}\$'\)/);
    expect(sql).toMatch(
      /'pending',\s*'confirmed',\s*'processing',\s*'packed',\s*'shipped',\s*'delivered',\s*'cancelled',\s*'refunded'/
    );
    expect(sql).toMatch(
      /'pending',\s*'authorized',\s*'paid',\s*'failed',\s*'refunded'/
    );
    expect(sql).toMatch(/'unfulfilled',\s*'partial',\s*'fulfilled'/);
    expect(sql).toMatch(/variant_id uuid not null references public\.product_variants/);
    expect(sql).toMatch(/on delete restrict/);
    expect(sql).toMatch(/idempotency_key/);
  });

  it("indexes buyer/store created_at, order_number, order_items.order_id, statuses", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/orders_order_number_uidx/);
    expect(sql).toMatch(/orders_buyer_created_at_idx/);
    expect(sql).toMatch(/orders_store_created_at_idx/);
    expect(sql).toMatch(/orders_status_idx/);
    expect(sql).toMatch(/orders_payment_status_idx/);
    expect(sql).toMatch(/orders_fulfillment_status_idx/);
    expect(sql).toMatch(/order_items_order_id_idx/);
    // Avoid redundant single-column buyer/store indexes alongside composites.
    expect(sql).not.toMatch(/create index if not exists orders_buyer_id_idx/);
    expect(sql).not.toMatch(/create index if not exists orders_store_id_idx/);
  });

  it("enforces header + item immutability while allowing status columns to change", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/enforce_order_header_identity_immutable/);
    expect(sql).toMatch(/Order identity, currency, and money totals are immutable/);
    expect(sql).toMatch(/enforce_order_item_snapshot_immutable/);
    expect(sql).toMatch(/new\.buyer_id is distinct from old\.buyer_id/);
    expect(sql).toMatch(/new\.order_number is distinct from old\.order_number/);
    expect(sql).toMatch(/new\.currency is distinct from old\.currency/);
    expect(sql).toMatch(/new\.product_snapshot is distinct from old\.product_snapshot/);
    // Status fields are intentionally omitted from the identity immutability guard.
    expect(sql).not.toMatch(
      /enforce_order_header_identity_immutable[\s\S]*new\.status is distinct from old\.status/
    );
  });

  it("enables FORCE RLS and buyer/seller/admin read isolation with write revokes", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/alter table public\.orders enable row level security;/);
    expect(sql).toMatch(/alter table public\.orders force row level security;/);
    expect(sql).toMatch(
      /alter table public\.order_items enable row level security;/
    );
    expect(sql).toMatch(
      /alter table public\.order_items force row level security;/
    );
    expect(sql).toMatch(/buyer_id = \(select auth\.uid\(\)\)/);
    expect(sql).toMatch(/public\.is_store_member\(store_id\)/);
    expect(sql).toMatch(/public\.is_platform_admin\(\)/);
    expect(sql).toMatch(/public\.can_read_store_order\(order_id\)/);
    expect(sql).toMatch(
      /revoke insert, update, delete on public\.orders from authenticated;/
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on public\.order_items from authenticated;/
    );
    expect(sql).toMatch(/revoke all on public\.orders from anon, public;/);
    expect(sql).toMatch(/grant select on public\.orders to authenticated;/);
  });

  it("uses ON DELETE RESTRICT so catalog/user/store deletes cannot erase history", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(
      /buyer_id uuid not null references auth\.users \(id\) on delete restrict/
    );
    expect(sql).toMatch(
      /store_id uuid not null references public\.stores \(id\) on delete restrict/
    );
    expect(sql).toMatch(
      /product_id uuid not null references public\.store_products \(id\) on delete restrict/
    );
    expect(sql).toMatch(
      /variant_id uuid not null references public\.product_variants \(id\) on delete restrict/
    );
    expect(sql).toMatch(
      /seller_user_id uuid not null references auth\.users \(id\) on delete restrict/
    );
  });

  it("ships service_role-only create RPC that derives prices from catalog", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/create or replace function public\.create_store_order_foundation/);
    expect(sql).toMatch(/security definer/);
    expect(sql).toMatch(/set search_path = public/);
    expect(sql).toMatch(/auth\.role\(\) is distinct from 'service_role'/);
    expect(sql).toMatch(/store_order_active_unit_price_minor/);
    expect(sql).toMatch(/from public\.product_prices pp/);
    expect(sql).toMatch(
      /do not pass priced or snapshot fields/i
    );
    expect(sql).toMatch(/computed_subtotal/);
    expect(sql).toMatch(/prepared_items/);
    expect(sql).toMatch(/Order line totals do not match computed subtotal/);
    expect(sql).toMatch(/Product must be active and approved to order/);
    expect(sql).toMatch(/Store must be active to create orders/);
    expect(sql).toMatch(/idempotency_key/);
    expect(sql).toMatch(/unique_violation/);
    // Must freeze derived values once — no second live price re-fetch loop.
    expect(sql).not.toMatch(/second pass; catalog may race/);
    expect(sql).toMatch(/Insert frozen prepared lines/);
    expect(sql).toMatch(
      /revoke all on function public\.create_store_order_foundation\([\s\S]*?\) from public, anon, authenticated;/
    );
    expect(sql).toMatch(
      /grant execute on function public\.create_store_order_foundation\([\s\S]*?\) to service_role;/
    );
    expect(sql).toMatch(
      /revoke all on function public\.next_store_order_number\(\) from public, anon, authenticated;/
    );
    // Must not trust client unit prices / snapshots.
    expect(sql).not.toMatch(/item_unit := \(item->>'unit_price_minor'\)::bigint/);
    expect(sql).not.toMatch(/item->>'sku_snapshot'/);
    expect(sql).not.toMatch(/item->>'title_snapshot'/);
  });

  it("generates order numbers randomly without count/max sequences", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/gen_random_uuid\(\)/);
    expect(sql).not.toMatch(/count\(\*\)/);
    expect(sql).not.toMatch(/max\(.*order_number/);
  });

  it("does not integrate payment gateways or mutate marketplace tables", () => {
    const sql = read(MIGRATION);
    expect(sql.toLowerCase()).not.toMatch(/stripe|paypal|hyperpay|myfatoorah|\btap\b/);
    expect(sql).not.toMatch(/alter table public\.stores\b/);
    expect(sql).not.toMatch(/alter table public\.store_products\b/);
    expect(sql).not.toMatch(/alter table public\.seller_applications\b/);
  });
});

describe("order status validation", () => {
  it("keeps TS enums aligned with DB lowercase values", () => {
    for (const s of ORDER_STATUSES) expect(isOrderStatus(s)).toBe(true);
    for (const s of PAYMENT_STATUSES) expect(isPaymentStatus(s)).toBe(true);
    for (const s of FULFILLMENT_STATUSES) {
      expect(isFulfillmentStatus(s)).toBe(true);
    }
    expect(isOrderStatus("Pending")).toBe(false);
    expect(isPaymentStatus("Paid")).toBe(false);
    expect(isFulfillmentStatus("Fulfilled")).toBe(false);
    expect(isOrderStatus("unknown")).toBe(false);
  });

  it("formats status labels for UI without changing DB values", () => {
    expect(formatOrderStatus("pending")).toBe("Pending");
    expect(formatPaymentStatus("authorized")).toBe("Authorized");
    expect(formatFulfillmentStatus("unfulfilled")).toBe("Unfulfilled");
  });

  it("allows only documented order status transitions", () => {
    expect(ORDER_STATUS_TRANSITIONS.pending).toEqual([
      "confirmed",
      "cancelled",
    ]);
    expect(canTransitionOrderStatus("pending", "confirmed")).toBe(true);
    expect(canTransitionOrderStatus("pending", "shipped")).toBe(false);
    expect(assertOrderStatusTransition("shipped", "delivered").ok).toBe(true);
    expect(assertOrderStatusTransition("delivered", "pending").ok).toBe(false);
    expect(assertOrderStatusTransition("cancelled", "confirmed").ok).toBe(
      false
    );
    expect(assertOrderStatusTransition("refunded", "pending").ok).toBe(false);
  });

  it("keeps payment and fulfillment independent from order status helpers", () => {
    expect(isPaymentStatus("paid")).toBe(true);
    expect(isFulfillmentStatus("fulfilled")).toBe(true);
    // Transition helper only covers order.status, not payment/fulfillment.
    expect(Object.keys(ORDER_STATUS_TRANSITIONS)).toEqual([...ORDER_STATUSES]);
  });
});

describe("order money + quantity helpers", () => {
  it("rejects zero/negative quantity and non-integers", () => {
    expect(validateOrderQuantity(2).ok).toBe(true);
    expect(validateOrderQuantity(0).ok).toBe(false);
    expect(validateOrderQuantity(-1).ok).toBe(false);
    expect(validateOrderQuantity(1.5).ok).toBe(false);
    expect(computeOrderLineTotalMinor(1999, 3)).toBe(5997);
  });

  it("rejects negative totals, invalid currency, and bad grand-total formula", () => {
    expect(
      validateOrderMoneyTotals({
        currency: "usd",
        subtotalMinor: 10000,
        discountTotalMinor: 500,
        taxTotalMinor: 200,
        shippingTotalMinor: 300,
      }).ok
    ).toBe(true);

    expect(
      validateOrderMoneyTotals({
        currency: "USD",
        subtotalMinor: -1,
        discountTotalMinor: 0,
        taxTotalMinor: 0,
        shippingTotalMinor: 0,
      }).ok
    ).toBe(false);

    expect(
      validateOrderMoneyTotals({
        currency: "US",
        subtotalMinor: 100,
        discountTotalMinor: 0,
        taxTotalMinor: 0,
        shippingTotalMinor: 0,
      }).ok
    ).toBe(false);

    expect(
      validateOrderMoneyTotals({
        currency: "usd1",
        subtotalMinor: 100,
        discountTotalMinor: 0,
        taxTotalMinor: 0,
        shippingTotalMinor: 0,
      }).ok
    ).toBe(false);

    expect(
      validateOrderMoneyTotals({
        currency: "USD",
        subtotalMinor: 1000,
        discountTotalMinor: 2000,
        taxTotalMinor: 0,
        shippingTotalMinor: 0,
      }).ok
    ).toBe(false);

    expect(
      validateOrderMoneyTotals({
        currency: "USD",
        subtotalMinor: 1000,
        discountTotalMinor: 0,
        taxTotalMinor: 0,
        shippingTotalMinor: 0,
        grandTotalMinor: 999,
      }).ok
    ).toBe(false);

    expect(
      computeOrderGrandTotalMinor({
        subtotalMinor: 10000,
        discountTotalMinor: 500,
        taxTotalMinor: 200,
        shippingTotalMinor: 300,
      })
    ).toBe(10000);
  });

  it("formats order money via minor units", () => {
    expect(formatOrderMoney(1999, "USD")).toMatch(/19\.99|١٩٫٩٩/);
  });
});

describe("snapshot preservation + store alignment", () => {
  it("builds a frozen product snapshot payload", () => {
    const snap = buildOrderItemProductSnapshot({
      productId: "p1",
      storeId: "s1",
      slug: "tee",
      title: "Tee",
      productType: "physical",
      sku: "TEE-1",
      variantId: "v1",
      variantTitle: "M",
      unitPriceMinor: 2500,
      currency: "usd",
    });
    expect(snap.sku).toBe("TEE-1");
    expect(snap.unit_price_minor).toBe(2500);
    expect(snap.currency).toBe("USD");
    expect(snap.title).toBe("Tee");
  });

  it("validates order item snapshots and line math", () => {
    const result = validateOrderItemSnapshot({
      currency: "USD",
      quantity: 2,
      unitPriceMinor: 1500,
      skuSnapshot: "SKU-1",
      titleSnapshot: "Product A",
      variantTitleSnapshot: "Red / M",
      productSnapshot: { product_id: "p1", title: "Product A" },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.totalPriceMinor).toBe(3000);
    expect(result.titleSnapshot).toBe("Product A");
  });

  it("rejects mutating frozen snapshot fields", () => {
    const before = {
      productId: "p1",
      variantId: "v1",
      sellerUserId: "seller",
      quantity: 1,
      unitPriceMinor: 1000,
      totalPriceMinor: 1000,
      productSnapshot: { title: "Original" },
      skuSnapshot: "SKU",
      titleSnapshot: "Original",
      variantTitleSnapshot: null as string | null,
    };
    expect(
      assertOrderItemSnapshotsPreserved({
        before,
        after: { ...before, titleSnapshot: "Changed later" },
      }).ok
    ).toBe(false);
    expect(
      assertOrderItemSnapshotsPreserved({
        before,
        after: {
          ...before,
          productSnapshot: { title: "Changed in catalog" },
        },
      }).ok
    ).toBe(false);
    expect(
      assertOrderItemSnapshotsPreserved({ before, after: { ...before } }).ok
    ).toBe(true);
  });

  it("rejects order/item store mismatches", () => {
    expect(
      assertOrderItemBelongsToOrderStore({
        orderStoreId: "store-a",
        productStoreId: "store-a",
      }).ok
    ).toBe(true);
    expect(
      assertOrderItemBelongsToOrderStore({
        orderStoreId: "store-a",
        productStoreId: "store-b",
      }).ok
    ).toBe(false);
  });

  it("rejects mutating immutable order header identity/money fields", () => {
    const before = {
      buyerId: "b1",
      storeId: "s1",
      orderNumber: "UMT-20260811-ABC123",
      currency: "USD",
      subtotalMinor: 1000,
      discountTotalMinor: 0,
      taxTotalMinor: 0,
      shippingTotalMinor: 0,
      grandTotalMinor: 1000,
    };
    expect(
      assertOrderHeaderIdentityPreserved({ before, after: { ...before } }).ok
    ).toBe(true);
    expect(
      assertOrderHeaderIdentityPreserved({
        before,
        after: { ...before, buyerId: "b2" },
      }).ok
    ).toBe(false);
    expect(
      assertOrderHeaderIdentityPreserved({
        before,
        after: { ...before, currency: "EUR" },
      }).ok
    ).toBe(false);
    expect(
      assertOrderHeaderIdentityPreserved({
        before,
        after: { ...before, grandTotalMinor: 900 },
      }).ok
    ).toBe(false);
  });

  it("keeps historical title even if a later catalog title differs", () => {
    const ordered = validateOrderItemSnapshot({
      currency: "USD",
      quantity: 1,
      unitPriceMinor: 999,
      skuSnapshot: "OLD-SKU",
      titleSnapshot: "Title at purchase",
      productSnapshot: {
        title: "Title at purchase",
        product_id: "p1",
      },
    });
    expect(ordered.ok).toBe(true);
    if (!ordered.ok) return;

    const catalogTitleNow = "Title after seller edit";
    expect(ordered.titleSnapshot).not.toBe(catalogTitleNow);
    expect(ordered.productSnapshot.title).toBe("Title at purchase");
  });
});

describe("RPC create trust boundary", () => {
  it("accepts only product_id, variant_id, and quantity on line payloads", () => {
    expect(
      assertOrderCreateItemPayloadTrusted({
        product_id: "p1",
        variant_id: "v1",
        quantity: 2,
      }).ok
    ).toBe(true);
  });

  it("rejects client-supplied prices and snapshots", () => {
    for (const key of ORDER_CREATE_FORBIDDEN_ITEM_KEYS) {
      expect(
        assertOrderCreateItemPayloadTrusted({
          product_id: "p1",
          variant_id: "v1",
          quantity: 1,
          [key]: "injected",
        }).ok
      ).toBe(false);
    }
  });
});

describe("RLS access assumptions (app-layer mirrors)", () => {
  it("allows buyers to read only their own orders", () => {
    expect(
      canBuyerReadOrder({ buyerId: "b1", requesterUserId: "b1" })
    ).toBe(true);
    expect(
      canBuyerReadOrder({ buyerId: "b1", requesterUserId: "b2" })
    ).toBe(false);
    expect(
      canBuyerReadOrder({ buyerId: "b1", requesterUserId: null })
    ).toBe(false);
  });

  it("allows sellers to read only orders for their own store membership", () => {
    expect(
      canSellerReadOrder({
        orderStoreId: "store-a",
        memberStoreId: "store-a",
        memberRole: "owner",
        memberStatus: "active",
      })
    ).toBe(true);
    expect(
      canSellerReadOrder({
        orderStoreId: "store-a",
        memberStoreId: "store-b",
        memberRole: "owner",
        memberStatus: "active",
      })
    ).toBe(false);
    expect(
      canSellerReadOrder({
        orderStoreId: "store-a",
        memberStoreId: "store-a",
        memberRole: "viewer",
        memberStatus: "invited",
      })
    ).toBe(false);
  });

  it("never lets one seller read another store's buyer orders", () => {
    expect(
      canReadStoreOrder({
        buyerId: "buyer-1",
        storeId: "store-a",
        requesterUserId: "seller-of-b",
        memberStoreId: "store-b",
        memberRole: "owner",
        memberStatus: "active",
      })
    ).toBe(false);
  });

  it("allows platform admin read bypass via explicit DB-backed flag only", () => {
    expect(
      canReadStoreOrder({
        buyerId: "buyer-1",
        storeId: "store-a",
        requesterUserId: "admin-1",
        isPlatformAdmin: true,
      })
    ).toBe(true);
    expect(
      canReadStoreOrder({
        buyerId: "buyer-1",
        storeId: "store-a",
        requesterUserId: "admin-1",
        isPlatformAdmin: false,
      })
    ).toBe(false);
  });
});

describe("order number format", () => {
  it("matches the DB human-friendly pattern", () => {
    expect(STORE_ORDER_NUMBER_RE.test("UMT-20260811-ABC123")).toBe(true);
    expect(isValidStoreOrderNumber("UMT-20260811-ABC123")).toBe(true);
    expect(isValidStoreOrderNumber("ORD-1")).toBe(false);
    expect(isValidStoreOrderNumber("UMT-20260811-abc123")).toBe(false);
  });
});
