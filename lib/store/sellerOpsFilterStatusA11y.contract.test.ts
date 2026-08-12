/**
 * Commerce Seller Ops Filter/Status A11y Contract V1
 * Deterministic source contracts for seller filter pressed/current state,
 * order-list attention status naming, loading live region, and ops shell landmark.
 * No money/Stripe/migration/release-gate coverage.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const ORDERS_PAGE = read("app/seller/store/orders/page.tsx");
const ORDER_LIST = read("app/components/store/SellerOrderList.tsx");
const PRODUCT_DASH = read("app/components/store/SellerProductDashboard.tsx");
const INVENTORY = read("app/components/store/SellerInventoryWorkspace.tsx");
const LOADING = read("app/seller/store/loading.tsx");
const OPS_SHELL = read("app/components/store/SellerOpsShell.tsx");
const PRESENTATION = read("lib/store/sellerOrdersPresentation.ts");

describe("Seller ops orders filter — aria-current", () => {
  it("exposes filter navigation landmark and current page on active chips", () => {
    expect(ORDERS_PAGE).toMatch(/role="navigation"/);
    expect(ORDERS_PAGE).toMatch(/aria-label="Filter seller orders"/);
    expect(ORDERS_PAGE).toMatch(
      /aria-current=\{statusFilter === "all" \? "page" : undefined\}/
    );
    expect(ORDERS_PAGE).toMatch(
      /aria-current=\{statusFilter === status \? "page" : undefined\}/
    );
  });

  it("preserves auth/store gates and deferred payment honesty copy", () => {
    expect(ORDERS_PAGE).toMatch(/getServerUser\(\)/);
    expect(ORDERS_PAGE).toMatch(/getOwnedOrMemberStore/);
    expect(ORDERS_PAGE).toMatch(/listSellerOrders/);
    expect(ORDERS_PAGE).toMatch(/sellers cannot mark payments successful/);
    expect(ORDERS_PAGE).not.toMatch(/markPayment|capturePayment|stripe/i);
  });
});

describe("Seller order list — attention status naming", () => {
  it("uses presentation helper for accessible attention badge labels", () => {
    expect(PRESENTATION).toMatch(/export function sellerOrderAttentionBadgeLabel/);
    expect(ORDER_LIST).toMatch(/sellerOrderAttentionBadgeLabel\(attention\)/);
    expect(ORDER_LIST).toMatch(/aria-label=\{attentionBadgeLabel\}/);
    expect(ORDER_LIST).toMatch(/role="status"/);
  });

  it("labels order operation links with order number and buyer label", () => {
    expect(ORDER_LIST).toMatch(
      /aria-label=\{`Open operations for order \$\{order\.orderNumber\}, \$\{buyerLabel\}`\}/
    );
  });

  it("keeps empty state on StoreEmptyState and does not invent payment mutation UI", () => {
    expect(ORDER_LIST).toMatch(/StoreEmptyState/);
    expect(ORDER_LIST).toMatch(/No orders yet/);
    expect(ORDER_LIST).not.toMatch(/mark as paid|collect payment/i);
  });
});

describe("Seller catalog + inventory filters — aria-pressed", () => {
  it("marks active catalog filter buttons as pressed", () => {
    expect(PRODUCT_DASH).toMatch(/aria-label="Filter by status"/);
    expect(PRODUCT_DASH).toMatch(/aria-label="Filter by health"/);
    expect(PRODUCT_DASH).toMatch(/aria-label="Filter by product type"/);
    expect(PRODUCT_DASH).toMatch(
      /aria-pressed=\{applied\.status === filter\.id\}/
    );
    expect(PRODUCT_DASH).toMatch(
      /aria-pressed=\{applied\.health === filter\.id\}/
    );
    expect(PRODUCT_DASH).toMatch(
      /aria-pressed=\{applied\.productType === filter\.id\}/
    );
  });

  it("marks active inventory filter buttons as pressed and status empty match", () => {
    expect(INVENTORY).toMatch(/aria-label="Filter inventory"/);
    expect(INVENTORY).toMatch(/aria-pressed=\{bucket === filter\.id\}/);
    expect(INVENTORY).toMatch(
      /No inventory rows match this search or filter\./
    );
    expect(INVENTORY).toMatch(/role="status"/);
  });
});

describe("Seller ops shell + loading — landmarks and busy status", () => {
  it("names the seller ops main landmark from title/subtitle", () => {
    expect(OPS_SHELL).toMatch(
      /aria-label=\{subtitle \? `Seller \$\{title\} — \$\{subtitle\}` : `Seller \$\{title\}`\}/
    );
    expect(OPS_SHELL).not.toMatch(/CheckoutCart|BuyerCart|CartDrawer/);
  });

  it("exposes loading workspace as a polite busy status region", () => {
    expect(LOADING).toMatch(/role="status"/);
    expect(LOADING).toMatch(/aria-busy="true"/);
    expect(LOADING).toMatch(/aria-live="polite"/);
    expect(LOADING).toMatch(/Loading seller store workspace/);
  });
});
