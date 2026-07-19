import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PROTECTED_PREFIXES, isProtectedPath } from "../env/supabaseAuthGate";
import {
  APP_ROUTES,
  buildSellerOrderHref,
  buildStoreOrderHref,
} from "../../app/lib/nav/routes";
import {
  assertSellerFulfillmentConsistentWithOrder,
  assertSellerOrderStatusTransition,
  buyerDisplayNameFromSnapshot,
  canBuyerReadOrder,
  canSellerManageOrders,
  canSellerReadOrder,
  canSellerTransitionOrderStatus,
  canTransitionOrderStatus,
  isSellerTerminalOrderStatus,
  isTerminalOrderStatus,
  mapOrderRpcError,
  nextSellerOrderStatuses,
  sellerSafeFulfillmentContact,
  SELLER_ORDER_STATUS_TRANSITIONS,
} from "./orderRules";
import { validateSellerOrderUpdateProposal } from "./orders";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260813_store_order_management_v1.sql";
const ORDERS_MIGRATION =
  "supabase/migrations/20260811_store_orders_foundation_v1.sql";
const CHECKOUT_MIGRATION =
  "supabase/migrations/20260812_store_checkout_foundation_v1.sql";
const ACTION = "app/actions/storeOrders.ts";
const ORDERS_TS = "lib/store/orders.ts";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("order management migration contracts", () => {
  it("ships after checkout foundation", () => {
    expect(existsSync(join(ROOT, ORDERS_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, CHECKOUT_MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(MIGRATION).toContain("20260813");
  });

  it("adds history, lifecycle stamps, indexes, and seller RPC", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/create table if not exists public\.order_status_history/);
    expect(sql).toMatch(/confirmed_at/);
    expect(sql).toMatch(/processing_at/);
    expect(sql).toMatch(/packed_at/);
    expect(sql).toMatch(/shipped_at/);
    expect(sql).toMatch(/delivered_at/);
    expect(sql).toMatch(/cancelled_at/);
    expect(sql).toMatch(/orders_store_status_created_idx/);
    expect(sql).toMatch(/orders_buyer_status_created_idx/);
    expect(sql).toMatch(/order_status_history_order_created_idx/);
    expect(sql).toMatch(/update_store_order_status/);
    expect(sql).toMatch(/force row level security/);
    expect(sql).toMatch(/on delete restrict/i);
    expect(sql).toMatch(/enforce_order_lifecycle_timestamps_immutable/);
  });

  it("locks RPC privileges and derives store authority from the order", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/security definer/i);
    expect(sql).toMatch(/set search_path = public/);
    expect(sql).toMatch(
      /revoke all on function public\.update_store_order_status\(uuid, text, text, text\)\s+from public, anon/
    );
    expect(sql).toMatch(
      /revoke all on function public\.store_order_status_transition_allowed\(text, text\)\s+from public, anon, authenticated/
    );
    expect(sql).toMatch(
      /is_store_member_with_role\(o\.store_id, array\['owner', 'manager'\]\)/
    );
    expect(sql).toMatch(/Authority from order\.store_id only/);
    expect(sql).toMatch(/never from client-supplied store_id/i);
    expect(sql).toMatch(/payment_status intentionally omitted/);
    expect(sql).toMatch(/Sellers cannot set refunded status/);
    expect(sql).toMatch(/for update/i);
    expect(sql).toMatch(/unchanged', true/);
  });

  it("enforces fulfillment consistency with delivered/shipped", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/forces fulfillment = fulfilled|forces fulfillment/i);
    expect(sql).toMatch(/next_status = 'delivered'/);
    expect(sql).toMatch(/next_fulfillment := 'fulfilled'/);
    expect(sql).toMatch(/Cannot mark shipped\/delivered\/cancelled orders unfulfilled/);
    expect(sql).toMatch(/Cannot reopen fulfillment after ship\/deliver\/cancel/);
  });

  it("history is append-only for clients and readable via parent order", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/can_read_store_order\(order_id\)/);
    expect(sql).toMatch(
      /revoke insert, update, delete on public\.order_status_history from authenticated/
    );
    expect(sql).toMatch(/actor_user_id/);
  });

  it("preserves orders foundation RLS and no authenticated order writes", () => {
    const ordersSql = read(ORDERS_MIGRATION);
    expect(ordersSql).toMatch(/buyer_id = \(select auth\.uid\(\)\)/);
    expect(ordersSql).toMatch(/is_store_member\(store_id\)/);
    expect(ordersSql).toMatch(/is_platform_admin\(\)/);
    expect(ordersSql).toMatch(/revoke all on public\.orders from anon, public/);
    expect(ordersSql).toMatch(
      /grant select on public\.orders to authenticated/
    );
    expect(ordersSql).not.toMatch(
      /grant insert, update, delete on public\.orders to authenticated/
    );
  });
});

describe("read isolation / IDOR mirrors", () => {
  it("buyer can read only own orders (IDOR denied)", () => {
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

  it("seller can read only own-store orders (cross-store IDOR denied)", () => {
    expect(
      canSellerReadOrder({
        orderStoreId: "s1",
        memberStoreId: "s1",
        memberRole: "viewer",
        memberStatus: "active",
      })
    ).toBe(true);
    expect(
      canSellerReadOrder({
        orderStoreId: "s1",
        memberStoreId: "s2",
        memberRole: "owner",
        memberStatus: "active",
      })
    ).toBe(false);
    expect(
      canSellerReadOrder({
        orderStoreId: "s1",
        memberStoreId: "s1",
        memberRole: "owner",
        memberStatus: "revoked",
      })
    ).toBe(false);
  });

  it("detail helpers use uniform Order not found for IDOR", () => {
    const src = read(ORDERS_TS);
    expect(src).toMatch(/Uniform not-found for IDOR/);
    expect(src).toMatch(/buyer_id !== options\.expectBuyerId/);
    expect(src).toMatch(/store_id !== options\.expectStoreId/);
    expect(src).toMatch(/message: "Order not found\."/);
  });
});

describe("seller role authority", () => {
  it("only owner/manager may manage orders; viewer/catalog_editor cannot", () => {
    expect(canSellerManageOrders("owner")).toBe(true);
    expect(canSellerManageOrders("manager")).toBe(true);
    expect(canSellerManageOrders("catalog_editor")).toBe(false);
    expect(canSellerManageOrders("viewer")).toBe(false);
    expect(canSellerManageOrders(null)).toBe(false);
    expect(
      validateSellerOrderUpdateProposal({
        fromStatus: "pending",
        toStatus: "confirmed",
        fromFulfillment: "unfulfilled",
        role: "viewer",
      }).ok
    ).toBe(false);
    expect(
      validateSellerOrderUpdateProposal({
        fromStatus: "pending",
        toStatus: "confirmed",
        fromFulfillment: "unfulfilled",
        role: "catalog_editor",
      }).ok
    ).toBe(false);
    expect(
      validateSellerOrderUpdateProposal({
        fromStatus: "pending",
        toStatus: "confirmed",
        fromFulfillment: "unfulfilled",
        role: "owner",
      }).ok
    ).toBe(true);
  });

  it("server action rejects client store_id/payment_status and resolves store from order", () => {
    const action = read(ACTION);
    expect(action).toMatch(/Payment status cannot be changed/i);
    expect(action).toMatch(/Store authority is derived server-side/);
    expect(action).toMatch(/getMembership/);
    expect(action).toMatch(/canSellerManageOrders/);
    expect(action).not.toMatch(/getOwnedOrMemberStore/);
    expect(action).not.toMatch(/service_role|SERVICE_ROLE|supabaseService/);
  });
});

describe("status transitions", () => {
  it("allows valid seller transitions and blocks skips/backward", () => {
    expect(canSellerTransitionOrderStatus("pending", "confirmed")).toBe(true);
    expect(canSellerTransitionOrderStatus("confirmed", "processing")).toBe(true);
    expect(canSellerTransitionOrderStatus("processing", "packed")).toBe(true);
    expect(canSellerTransitionOrderStatus("packed", "shipped")).toBe(true);
    expect(canSellerTransitionOrderStatus("shipped", "delivered")).toBe(true);
    expect(canSellerTransitionOrderStatus("pending", "shipped")).toBe(false);
    expect(canSellerTransitionOrderStatus("shipped", "pending")).toBe(false);
    expect(canSellerTransitionOrderStatus("delivered", "packed")).toBe(false);
    expect(assertSellerOrderStatusTransition("shipped", "pending").ok).toBe(
      false
    );
  });

  it("blocks seller refunded and freezes delivered/cancelled/refunded", () => {
    expect(canSellerTransitionOrderStatus("delivered", "refunded")).toBe(false);
    expect(canTransitionOrderStatus("delivered", "refunded")).toBe(true);
    expect(SELLER_ORDER_STATUS_TRANSITIONS.delivered).toEqual([]);
    expect(isTerminalOrderStatus("cancelled")).toBe(true);
    expect(isSellerTerminalOrderStatus("delivered")).toBe(true);
    expect(nextSellerOrderStatuses("cancelled")).toEqual([]);
    expect(
      validateSellerOrderUpdateProposal({
        fromStatus: "delivered",
        toStatus: "refunded",
        fromFulfillment: "fulfilled",
        role: "owner",
      }).ok
    ).toBe(false);
  });

  it("enforces fulfillment consistency (no delivered+unfulfilled)", () => {
    expect(
      assertSellerFulfillmentConsistentWithOrder({
        orderStatus: "packed",
        fromFulfillment: "fulfilled",
        toFulfillment: "partial",
      }).ok
    ).toBe(true);
    expect(
      assertSellerFulfillmentConsistentWithOrder({
        orderStatus: "shipped",
        fromFulfillment: "fulfilled",
        toFulfillment: "partial",
      }).ok
    ).toBe(false);
    expect(
      assertSellerFulfillmentConsistentWithOrder({
        orderStatus: "delivered",
        fromFulfillment: "fulfilled",
        toFulfillment: "unfulfilled",
      }).ok
    ).toBe(false);
    expect(
      validateSellerOrderUpdateProposal({
        fromStatus: "shipped",
        toStatus: "delivered",
        fromFulfillment: "partial",
        toFulfillment: "unfulfilled",
        role: "manager",
      }).ok
    ).toBe(false);
  });

  it("treats same-state retry as no-op at proposal layer when nothing changes", () => {
    // Empty change rejected; identical targets still need an explicit field —
    // RPC is the source of truth for unchanged without audit.
    expect(
      validateSellerOrderUpdateProposal({
        fromStatus: "pending",
        fromFulfillment: "unfulfilled",
        role: "owner",
      }).ok
    ).toBe(false);
    const sql = read(MIGRATION);
    expect(sql).toMatch(/Same-state retry: no write, no audit row/);
  });
});

describe("privacy + error mapping + no service-role leakage", () => {
  it("exposes only fulfillment contact keys", () => {
    const safe = sellerSafeFulfillmentContact({
      full_name: "Ada",
      phone: "+1",
      secret_profile_id: "nope",
      payment_token: "tok",
    });
    expect(safe?.full_name).toBe("Ada");
    expect(safe?.phone).toBe("+1");
    expect(safe).not.toHaveProperty("secret_profile_id");
    expect(safe).not.toHaveProperty("payment_token");
    expect(buyerDisplayNameFromSnapshot({ full_name: "Ada" })).toBe("Ada");
    expect(buyerDisplayNameFromSnapshot(null)).toBe("Customer");
  });

  it("sanitizes seller/buyer detail projections", () => {
    const src = read(ORDERS_TS);
    expect(src).toMatch(/sanitizeOrderForMode/);
    expect(src).toMatch(/buyer_id: ""/);
    expect(src).toMatch(/tax_snapshot: null/);
    expect(src).toMatch(/discount_snapshot: null/);
    expect(src).toMatch(/actor_user_id: mode === "buyer" \? null/);
    expect(src).not.toMatch(/SERVICE_ROLE|serviceRoleKey|createServiceClient/);
  });

  it("maps RPC errors safely without leaking existence details", () => {
    expect(mapOrderRpcError("Not authorized to update this order")).toMatch(
      /cannot update/i
    );
    expect(mapOrderRpcError("Sellers cannot set refunded status")).toMatch(
      /refunded/i
    );
  });
});

describe("routes + auth gate", () => {
  it("exposes buyer/seller order routes and protects buyer path", () => {
    expect(APP_ROUTES.storeOrders).toBe("/store/orders");
    expect(APP_ROUTES.sellerOrders).toBe("/seller/store/orders");
    expect(buildStoreOrderHref("11111111-1111-1111-1111-111111111111")).toBe(
      "/store/orders/11111111-1111-1111-1111-111111111111"
    );
    expect(buildSellerOrderHref("11111111-1111-1111-1111-111111111111")).toBe(
      "/seller/store/orders/11111111-1111-1111-1111-111111111111"
    );
    expect(PROTECTED_PREFIXES).toContain("/store/orders");
    expect(isProtectedPath("/store/orders")).toBe(true);
    expect(isProtectedPath("/store/orders/abc")).toBe(true);
    expect(isProtectedPath("/seller/store/orders")).toBe(true);
  });
});
