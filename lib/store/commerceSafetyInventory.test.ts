import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  COMMERCE_CHECKOUT_DISABLED_MESSAGE,
  isCommerceEmergencyDisabled,
} from "./commerceFlags";
import { mapCheckoutRpcError } from "./checkoutRules";
import {
  DEFAULT_RESERVATION_TTL_MINUTES,
  INVENTORY_RESERVATION_EVENT_TYPES,
  INVENTORY_RESERVATION_STATUSES,
  canReserveQuantity,
  reservableUnits,
} from "./inventoryReservation";
import { STOREFRONT_FLAGS } from "./storefrontFlags";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260819_store_commerce_safety_inventory_v1.sql";
const HARDENING = "supabase/migrations/20260818_store_hardening_v1.sql";
const CHECKOUT = "supabase/migrations/20260812_store_checkout_foundation_v1.sql";
const ORDERS_MGMT =
  "supabase/migrations/20260813_store_order_management_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("commerce safety migration presence", () => {
  it("ships after hardening and checkout foundations", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, HARDENING))).toBe(true);
    expect(existsSync(join(ROOT, CHECKOUT))).toBe(true);
    expect(existsSync(join(ROOT, ORDERS_MGMT))).toBe(true);
    expect(MIGRATION).toContain("20260819");
  });
});

describe("commerce gate contracts", () => {
  it("defaults DB commerce gate off and exposes admin/get RPCs", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/create table if not exists public\.store_commerce_settings/);
    expect(sql).toMatch(/checkout_confirm_enabled boolean not null default false/);
    expect(sql).toMatch(/assert_store_commerce_checkout_enabled/);
    expect(sql).toMatch(/get_store_commerce_checkout_enabled/);
    expect(sql).toMatch(/admin_set_store_commerce_checkout_enabled/);
    expect(sql).toMatch(/Store commerce checkout is disabled/);
    expect(sql).toMatch(/perform public\.require_platform_admin\(\)/);
  });

  it("enforces commerce gate inside create_store_order_foundation_core", () => {
    const sql = read(MIGRATION);
    const coreIdx = sql.indexOf(
      "create or replace function public.create_store_order_foundation_core"
    );
    expect(coreIdx).toBeGreaterThan(-1);
    const coreSlice = sql.slice(coreIdx, coreIdx + 12000);
    expect(coreSlice).toMatch(/perform public\.assert_store_commerce_checkout_enabled\(\)/);
    expect(coreSlice).toMatch(
      /perform public\.store_ensure_inventory_reservations_for_order\(new_order_id\)/
    );
    expect(coreSlice).toMatch(/Idempotent replay: do not re-check commerce gate/);
  });

  it("keeps emergency env as override-only in app (cannot enable)", () => {
    const flags = read("lib/store/commerceFlags.ts");
    expect(flags).toMatch(/STORE_COMMERCE_EMERGENCY_DISABLE/);
    expect(flags).toMatch(/source of truth/);
    expect(flags).toMatch(/cannot enable/i);
    expect(flags).toMatch(/get_store_commerce_checkout_enabled/);
    // Merchandising flags stay separate.
    expect(STOREFRONT_FLAGS.SHOW_FLASH_DEALS).toBe(false);
  });
});

describe("inventory reservation contracts", () => {
  it("creates reservation ledger with reservation_token and audit events", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/create table if not exists public\.inventory_reservations/);
    expect(sql).toMatch(/reservation_token uuid not null unique/);
    expect(sql).toMatch(
      /status text not null default 'active'[\s\S]*?'active', 'released', 'expired', 'consumed'/
    );
    expect(sql).toMatch(
      /create table if not exists public\.inventory_reservation_events/
    );
    expect(sql).toMatch(
      /event_type text not null[\s\S]*?'created', 'released', 'expired', 'consumed'/
    );
    expect(sql).toMatch(/reservation_ttl_minutes integer not null default 45/);
  });

  it("locks inventory, bumps reserved, and records created audit", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/store_ensure_inventory_reservations_for_order/);
    expect(sql).toMatch(/Insufficient inventory for reservation/);
    expect(sql).toMatch(/set reserved = coalesce\(inv\.reserved, 0\) \+ item\.quantity/);
    expect(sql).toMatch(/'created'/);
    expect(sql).toMatch(/for update/);
  });

  it("releases on cancel and expires inventory only without deleting orders", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/store_release_inventory_reservations_for_order/);
    expect(sql).toMatch(/expire_store_inventory_reservations/);
    expect(sql).toMatch(/Inventory release only — does not cancel/);
    expect(sql).toMatch(/order_cancelled/);
    expect(sql).toMatch(/reservation_expired/);
    expect(sql).not.toMatch(
      /expire_store_inventory_reservations[\s\S]{0,800}update public\.orders/
    );
    expect(sql).not.toMatch(
      /expire_store_inventory_reservations[\s\S]{0,800}delete from public\.orders/
    );

    const statusFn = sql.indexOf(
      "create or replace function public.update_store_order_status"
    );
    expect(statusFn).toBeGreaterThan(-1);
    const statusSlice = sql.slice(statusFn, statusFn + 9000);
    expect(statusSlice).toMatch(
      /store_release_inventory_reservations_for_order\(\s*o\.id, 'order_cancelled', 'released'/
    );
  });

  it("revokes client writes on reservation tables and helper EXECUTE", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(
      /revoke insert, update, delete on public\.inventory_reservations from authenticated/
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on public\.inventory_reservation_events\s+from authenticated/
    );
    expect(sql).toMatch(
      /revoke all on function public\.store_ensure_inventory_reservations_for_order\(uuid\)\s+from public, anon, authenticated, service_role/
    );
    expect(sql).toMatch(
      /grant execute on function public\.expire_store_inventory_reservations\(integer\)\s+to service_role/
    );
    expect(sql).toMatch(/force row level security/);
    expect(sql).toMatch(/can_read_store_order\(order_id\)/);
  });
});

describe("reservation domain helpers", () => {
  it("computes reservable capacity and backorder rules", () => {
    expect(reservableUnits({ onHand: 10, reserved: 3 })).toBe(7);
    expect(reservableUnits({ onHand: 2, reserved: 2 })).toBe(0);
    expect(
      canReserveQuantity({
        onHand: 10,
        reserved: 2,
        safetyStock: 1,
        allowBackorder: false,
        quantity: 7,
      })
    ).toBe(true);
    expect(
      canReserveQuantity({
        onHand: 10,
        reserved: 2,
        safetyStock: 1,
        allowBackorder: false,
        quantity: 8,
      })
    ).toBe(false);
    expect(
      canReserveQuantity({
        onHand: 10,
        reserved: 2,
        safetyStock: 1,
        allowBackorder: true,
        quantity: 8,
      })
    ).toBe(true);
    expect(DEFAULT_RESERVATION_TTL_MINUTES).toBe(45);
    expect(INVENTORY_RESERVATION_STATUSES).toContain("consumed");
    expect(INVENTORY_RESERVATION_EVENT_TYPES).toEqual([
      "created",
      "released",
      "expired",
      "consumed",
    ]);
  });

  it("maps commerce-disabled RPC errors for checkout UX", () => {
    expect(
      mapCheckoutRpcError("Store commerce checkout is disabled")
    ).toBe(COMMERCE_CHECKOUT_DISABLED_MESSAGE);
    expect(mapCheckoutRpcError("Insufficient inventory for reservation")).toBe(
      "An item is out of stock."
    );
  });

  it("treats missing emergency env as not disabled", () => {
    const prev = process.env.STORE_COMMERCE_EMERGENCY_DISABLE;
    delete process.env.STORE_COMMERCE_EMERGENCY_DISABLE;
    expect(isCommerceEmergencyDisabled()).toBe(false);
    process.env.STORE_COMMERCE_EMERGENCY_DISABLE = "1";
    expect(isCommerceEmergencyDisabled()).toBe(true);
    if (prev === undefined) {
      delete process.env.STORE_COMMERCE_EMERGENCY_DISABLE;
    } else {
      process.env.STORE_COMMERCE_EMERGENCY_DISABLE = prev;
    }
  });
});

describe("app wiring", () => {
  it("gates confirm/order create but keeps quotes available when disabled", () => {
    const page = read("app/store/checkout/page.tsx");
    const client = read("app/components/store/CheckoutClient.tsx");
    const checkout = read("lib/store/checkout.ts");
    expect(page).toMatch(/isStoreCommerceCheckoutEnabled/);
    expect(page).toMatch(/commerceEnabled=/);
    expect(client).toMatch(/commerceEnabled/);
    expect(client).toMatch(/Order placement is disabled/);
    expect(client).toMatch(/!commerceEnabled/);
    expect(checkout).toMatch(/isStoreCommerceCheckoutEnabled/);
    expect(checkout).toMatch(/COMMERCE_CHECKOUT_DISABLED_MESSAGE/);
    // Quote path must not call the commerce gate helper.
    const quoteFn = checkout.slice(
      checkout.indexOf("export async function createCheckoutQuote"),
      checkout.indexOf("export async function confirmCheckoutQuote")
    );
    expect(quoteFn).not.toMatch(/isStoreCommerceCheckoutEnabled/);
    const confirmFn = checkout.slice(
      checkout.indexOf("export async function confirmCheckoutQuote")
    );
    expect(confirmFn).toMatch(/isStoreCommerceCheckoutEnabled/);
  });

  it("rejects consumed as an inventory-return release event type", () => {
    const sql = read(MIGRATION);
    const releaseIdx = sql.indexOf(
      "create or replace function public.store_release_inventory_reservation_row"
    );
    expect(releaseIdx).toBeGreaterThan(-1);
    const slice = sql.slice(releaseIdx, releaseIdx + 2500);
    expect(slice).toMatch(
      /p_event_type not in \('released', 'expired'\)/
    );
    expect(slice).toMatch(/Terminal rows \(released\/expired\/consumed\)/);
  });

  it("does not introduce live payment providers", () => {
    const sql = read(MIGRATION).toLowerCase();
    expect(sql).not.toMatch(/stripe|paypal|hyperpay|myfatoorah|\btap\b|webhook/);
    expect(sql).not.toMatch(/create table[\s\S]*commission_rate/);
    expect(sql).not.toMatch(/create table[\s\S]*payout_transfers/);
    expect(sql).not.toMatch(/\bcarrier_api\b/);
  });
});

describe("mandatory idempotency on every order-create path", () => {
  it("requires non-blank idempotency keys in core and service_role wrapper", () => {
    const sql = read(MIGRATION);
    const coreIdx = sql.indexOf(
      "create or replace function public.create_store_order_foundation_core"
    );
    const wrapIdx = sql.indexOf(
      "create or replace function public.create_store_order_foundation("
    );
    expect(coreIdx).toBeGreaterThan(-1);
    expect(wrapIdx).toBeGreaterThan(coreIdx);

    const coreSlice = sql.slice(coreIdx, wrapIdx);
    expect(coreSlice).toMatch(/idempotency_key is required/);
    expect(coreSlice).toMatch(
      /idempotency_key length must be between 8 and 128/
    );
    expect(coreSlice).toMatch(
      /Idempotent replay: do not re-check commerce gate or re-reserve/
    );
    // Null/blank keys cannot skip into create — required check precedes gate.
    const requiredIdx = coreSlice.indexOf("idempotency_key is required");
    const gateIdx = coreSlice.indexOf("assert_store_commerce_checkout_enabled");
    expect(requiredIdx).toBeGreaterThan(-1);
    expect(gateIdx).toBeGreaterThan(requiredIdx);

    const wrapSlice = sql.slice(wrapIdx, wrapIdx + 3500);
    expect(wrapSlice).toMatch(/service_role required to create store orders/);
    expect(wrapSlice).toMatch(/idempotency_key is required/);
    expect(wrapSlice).toMatch(
      /Defense in depth: wrapper rejects missing\/blank keys before core/
    );
  });

  it("same idempotency key returns existing order without double reservation", () => {
    const sql = read(MIGRATION);
    const coreIdx = sql.indexOf(
      "create or replace function public.create_store_order_foundation_core"
    );
    const coreSlice = sql.slice(coreIdx, coreIdx + 14000);
    expect(coreSlice).toMatch(/where o\.idempotency_key = idem_key/);
    expect(coreSlice).toMatch(/return existing_order_id/);
    expect(coreSlice).toMatch(
      /store_ensure_inventory_reservations_for_order\(new_order_id\)/
    );

    const ensureIdx = sql.indexOf(
      "create or replace function public.store_ensure_inventory_reservations_for_order"
    );
    const ensureSlice = sql.slice(ensureIdx, ensureIdx + 2500);
    // Early return if reservations already exist for the order (retry-safe).
    expect(ensureSlice).toMatch(
      /if exists \(\s*select 1\s*from public\.inventory_reservations r\s*where r\.order_id = p_order_id/
    );
    expect(ensureSlice).toMatch(/then\s+return;/);
  });
});

describe("system-managed product_inventory.reserved", () => {
  it("protects reserved via trigger and GUC-gated lifecycle helpers", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/product_inventory_protect_reserved/);
    expect(sql).toMatch(/product_inventory\.reserved is system-managed/);
    expect(sql).toMatch(/umtuba\.allow_inventory_reserved_mutation/);
    expect(sql).toMatch(/store_allow_inventory_reserved_mutation/);
    expect(sql).toMatch(
      /revoke insert, update, delete on public\.product_inventory from anon/
    );

    const ensureIdx = sql.indexOf(
      "create or replace function public.store_ensure_inventory_reservations_for_order"
    );
    const ensureSlice = sql.slice(ensureIdx, ensureIdx + 4000);
    expect(ensureSlice).toMatch(
      /perform public\.store_allow_inventory_reserved_mutation\(\)/
    );
    expect(ensureSlice).toMatch(
      /set reserved = coalesce\(inv\.reserved, 0\) \+ item\.quantity/
    );

    const releaseIdx = sql.indexOf(
      "create or replace function public.store_release_inventory_reservation_row"
    );
    const releaseSlice = sql.slice(releaseIdx, releaseIdx + 3500);
    expect(releaseSlice).toMatch(
      /perform public\.store_allow_inventory_reserved_mutation\(\)/
    );
    expect(releaseSlice).toMatch(
      /set reserved = greatest\(coalesce\(inv\.reserved, 0\) - r\.quantity, 0\)/
    );
  });

  it("seller inventory writes omit reserved mutation and force insert zero", () => {
    const seller = read("lib/store/sellerStore.ts");
    expect(seller).toMatch(/reserved is system-managed/);
    expect(seller).toMatch(/Do not send reserved/);
    expect(seller).toMatch(/reserved: 0/);
    // Update payload must not include reserved:
    expect(seller).toMatch(
      /\.update\(\{\s*on_hand: inventory\.onHand,\s*safety_stock: inventory\.safetyStock,\s*allow_backorder: inventory\.allowBackorder,\s*\}\)/
    );
    // Client-supplied reserved must not drive updates.
    expect(seller).not.toMatch(/reserved:\s*inventory\.reserved/);
    expect(seller).not.toMatch(/reserved:\s*raw\.reserved/);
  });

  it("documents confirm/cancel/expiry reserved consistency contracts", () => {
    const sql = read(MIGRATION);
    // Create path bumps reserved once per order-item under FOR UPDATE.
    expect(sql).toMatch(/unique \(order_item_id\)/);
    expect(sql).toMatch(/inventory_reservations_order_item_uidx/);
    // Cancel and expiry release only active rows (no double decrement).
    expect(sql).toMatch(/r\.status = 'active'/);
    expect(sql).toMatch(/Terminal rows \(released\/expired\/consumed\)/);
    expect(sql).toMatch(/order_cancelled/);
    expect(sql).toMatch(/reservation_expired/);
  });
});
