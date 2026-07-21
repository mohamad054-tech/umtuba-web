import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  COMMERCE_CONFIRM_DISABLED_MESSAGE,
  COMMERCE_PURCHASES_UNAVAILABLE_MESSAGE,
  STORE_COMMERCE_CONFIRM_KILL_SWITCH_ENV,
  decideCommerceConfirmAllowed,
  isCommerceConfirmKillSwitchOn,
  isStuckReservation,
  mapCommerceSafetyRpcError,
} from "./commerceSafety";
import { mapCheckoutRpcError } from "./checkoutRules";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260819_store_commerce_safety_inventory_reservation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("commerce safety gate helpers", () => {
  it("treats env kill switch as kill-only", () => {
    expect(
      isCommerceConfirmKillSwitchOn({
        [STORE_COMMERCE_CONFIRM_KILL_SWITCH_ENV]: "1",
      })
    ).toBe(true);
    expect(
      isCommerceConfirmKillSwitchOn({
        [STORE_COMMERCE_CONFIRM_KILL_SWITCH_ENV]: "true",
      })
    ).toBe(true);
    expect(
      isCommerceConfirmKillSwitchOn({
        [STORE_COMMERCE_CONFIRM_KILL_SWITCH_ENV]: "0",
      })
    ).toBe(false);
    expect(isCommerceConfirmKillSwitchOn({})).toBe(false);
  });

  it("applies precedence: env kill > DB off > allow", () => {
    expect(
      decideCommerceConfirmAllowed({
        dbEnabled: true,
        env: { [STORE_COMMERCE_CONFIRM_KILL_SWITCH_ENV]: "1" },
      })
    ).toEqual({
      allowed: false,
      reason: "env_kill_switch",
      message: COMMERCE_CONFIRM_DISABLED_MESSAGE,
    });

    expect(
      decideCommerceConfirmAllowed({
        dbEnabled: false,
        env: {},
      })
    ).toEqual({
      allowed: false,
      reason: "db_disabled",
      message: COMMERCE_PURCHASES_UNAVAILABLE_MESSAGE,
    });

    // Env cannot force-enable when DB is off.
    expect(
      decideCommerceConfirmAllowed({
        dbEnabled: false,
        env: { [STORE_COMMERCE_CONFIRM_KILL_SWITCH_ENV]: "0" },
      }).allowed
    ).toBe(false);

    expect(
      decideCommerceConfirmAllowed({
        dbEnabled: true,
        env: {},
      })
    ).toEqual({ allowed: true });
  });

  it("maps commerce and reservation RPC errors", () => {
    expect(
      mapCommerceSafetyRpcError("Commerce confirmation is disabled")
    ).toBe(COMMERCE_CONFIRM_DISABLED_MESSAGE);
    expect(mapCheckoutRpcError("Commerce confirmation is disabled")).toMatch(
      /unavailable/i
    );
    expect(mapCommerceSafetyRpcError("Insufficient inventory for checkout")).toMatch(
      /reserve inventory/i
    );
  });

  it("detects stuck reservations conservatively", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(
      isStuckReservation({ status: "active", expiresAtIso: past })
    ).toBe(true);
    expect(
      isStuckReservation({ status: "pending_capture", expiresAtIso: past })
    ).toBe(true);
    expect(
      isStuckReservation({ status: "active", expiresAtIso: future })
    ).toBe(false);
    expect(
      isStuckReservation({ status: "released", expiresAtIso: past })
    ).toBe(false);
    expect(
      isStuckReservation({ status: "expired", expiresAtIso: past })
    ).toBe(false);
  });
});

describe("commerce safety migration contracts", () => {
  it("ships the next unused migration after hardening", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(
      existsSync(
        join(ROOT, "supabase/migrations/20260818_store_hardening_v1.sql")
      )
    ).toBe(true);
    const sql = read(MIGRATION);
    expect(sql).toMatch(/20260818_store_hardening_v1/);
  });

  it("defaults commerce gate OFF and TTL to config-backed 30 minutes", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/'commerce_confirm_enabled',\s*\r?\n\s*0,/);
    expect(sql).toMatch(/'reservation_ttl_minutes',\s*\r?\n\s*30,/);
    expect(sql).toMatch(/store_commerce_config_value\('reservation_ttl_minutes'/);
    expect(sql).not.toMatch(
      /expires_at := timezone\('utc', now\(\)\) \+ interval '30 minutes'/
    );
  });

  it("creates reservation ledger with checkout_session_id and pending_capture", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/create table if not exists public\.inventory_reservations/);
    expect(sql).toMatch(/checkout_session_id uuid not null/);
    expect(sql).toMatch(
      /status in \('active', 'pending_capture', 'consumed', 'released', 'expired'\)/
    );
    expect(sql).toMatch(
      /create table if not exists public\.inventory_reservation_events/
    );
    expect(sql).toMatch(/revoke insert, update, delete on public\.inventory_reservation_events/);
  });

  it("keeps pointer transitions and events in the same helper", () => {
    const sql = read(MIGRATION);
    const slice = sql.slice(
      sql.indexOf("create or replace function public.transition_inventory_reservation")
    );
    expect(slice).toMatch(/security definer/);
    expect(slice).toMatch(/set search_path = public/);
    expect(slice).toMatch(/update public\.inventory_reservations/);
    expect(slice).toMatch(/insert into public\.inventory_reservation_events/);
  });

  it("confirm creates ACTIVE reservations only and never decrements on_hand", () => {
    const sql = read(MIGRATION);
    const confirm = sql.slice(
      sql.indexOf("create or replace function public.confirm_store_checkout_quote")
    );
    expect(confirm).toMatch(/assert_store_commerce_confirm_allowed/);
    expect(confirm).toMatch(/create_active_inventory_reservation/);
    expect(confirm).toMatch(/checkout_session_id/);
    expect(confirm).toMatch(/ACTIVE reservations only/);
    expect(confirm).not.toMatch(/on_hand\s*=\s*on_hand\s*-/);
    expect(confirm).not.toMatch(/status\s*=\s*'pending_capture'/);
    expect(confirm).not.toMatch(/status\s*=\s*'consumed'/);
  });

  it("direct order create enforces the same gate and reservations", () => {
    const sql = read(MIGRATION);
    const direct = sql.slice(
      sql.indexOf("create or replace function public.create_store_order_foundation(")
    );
    expect(direct).toMatch(/assert_store_commerce_confirm_allowed/);
    expect(direct).toMatch(/create_active_inventory_reservation/);
    expect(direct).toMatch(/service_role required/);
  });

  it("B1 integrity fix migration replaces random session minting", () => {
    const fixPath =
      "supabase/migrations/20260820_store_commerce_safety_integrity_fix_b1.sql";
    expect(existsSync(join(ROOT, fixPath))).toBe(true);
    const fix = read(fixPath);
    const direct = fix.slice(
      fix.indexOf("create or replace function public.create_store_order_foundation(")
    );
    expect(direct).not.toMatch(/session_id\s+uuid\s*:=\s*gen_random_uuid\s*\(\s*\)/);
    expect(direct).toMatch(/session_id\s*:=\s*order_id/);
    expect(direct).toMatch(/'direct:'\s*\|\|\s*order_id::text/);
    expect(direct).toMatch(/assert_store_commerce_confirm_allowed/);
    expect(direct).toMatch(/service_role required/);
  });

  it("wires release on seller/admin cancel and buyer cancel", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/release_inventory_reservations_for_order/);
    expect(sql).toMatch(/buyer_cancel_store_order/);
    expect(sql).toMatch(/seller_cancel|admin_cancel|buyer_cancel/);
    const buyer = sql.slice(
      sql.indexOf("create or replace function public.buyer_cancel_store_order")
    );
    expect(buyer).toMatch(/payment_status is distinct from 'pending'/);
    expect(buyer).toMatch(/source[\s\S]*'buyer'/);
  });

  it("expiry releases inventory and cancels only eligible unpaid pending orders", () => {
    const sql = read(MIGRATION);
    const expire = sql.slice(
      sql.indexOf("create or replace function public.expire_inventory_reservations")
    );
    expect(expire).toMatch(/security definer/);
    expect(expire).toMatch(/set search_path = public/);
    expect(expire).toMatch(/reservation_ttl_expired/);
    expect(expire).toMatch(/system:reservation_ttl_expired/);
    expect(expire).toMatch(/paid', 'authorized'/);
    expect(expire).toMatch(/shipped', 'delivered'/);
    expect(expire).toMatch(/order_has_consumed_reservations/);
    expect(expire).toMatch(
      /revoke all on function public\.expire_inventory_reservations\(integer\)\s+from public, anon, authenticated;/
    );
    expect(expire).toMatch(
      /grant execute on function public\.expire_inventory_reservations\(integer\)\s+to service_role;/
    );
  });

  it("admin list omits buyer PII columns and supports stuck/store filters", () => {
    const sql = read(MIGRATION);
    const admin = sql.slice(
      sql.indexOf("create or replace function public.admin_list_inventory_reservations")
    );
    expect(admin).toMatch(/require_platform_admin/);
    expect(admin).toMatch(/is_stuck_past_expiry/);
    expect(admin).not.toMatch(/email/);
    expect(admin).not.toMatch(/phone/);
    expect(admin).not.toMatch(/address/);
    expect(admin).not.toMatch(/payment_attempt/);
    expect(admin).not.toMatch(/shipping_address/);
  });

  it("does not ship a GitHub Actions schedule for reservation expiry", () => {
    expect(
      existsSync(
        join(
          ROOT,
          ".github/workflows/expire-store-inventory-reservations.yml"
        )
      )
    ).toBe(false);
    const sql = read(MIGRATION);
    expect(sql).toMatch(/no automatic schedule|Manual \/ ops invocation/i);
  });

  it("protects product_inventory.reserved from client writes via trigger+GUC", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/protect_product_inventory_reserved/);
    expect(sql).toMatch(/umtuba\.allow_inventory_reserved_write/);
    expect(sql).toMatch(/Reserved inventory is system-managed/);
    expect(sql).toMatch(/allow_product_inventory_reserved_write/);
    expect(sql).toMatch(
      /revoke all on function public\.allow_product_inventory_reserved_write\(\)\s+from public, anon, authenticated;/
    );
    const create = sql.slice(
      sql.indexOf("create or replace function public.create_active_inventory_reservation")
    );
    expect(create).toMatch(/allow_product_inventory_reserved_write/);
    const transition = sql.slice(
      sql.indexOf("create or replace function public.transition_inventory_reservation")
    );
    expect(transition).toMatch(/allow_product_inventory_reserved_write/);
  });

  it("audits commerce gate toggles and forces RLS on reservation tables", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/store_commerce_config_audit/);
    expect(sql).toMatch(/insert into public\.store_commerce_config_audit/);
    expect(sql).toMatch(
      /alter table public\.inventory_reservations force row level security/
    );
    expect(sql).toMatch(
      /alter table public\.inventory_reservation_events force row level security/
    );
  });

  it("blocks shipping or delivering unpaid orders", () => {
    const sql = read(MIGRATION);
    const update = sql.slice(
      sql.lastIndexOf("create or replace function public.update_store_order_status")
    );
    expect(update).toMatch(/Cannot ship or deliver an unpaid order/);
    expect(update).toMatch(/payment_status is distinct from 'paid'/);
    expect(update).toMatch(/payment_status is distinct from 'authorized'/);
  });

  it("documents state machine and V1 active-only confirm", () => {
    const sql = read(MIGRATION);
    const transition = sql.slice(
      sql.indexOf("create or replace function public.transition_inventory_reservation")
    );
    expect(transition).toMatch(/from_st = 'active' and p_to_status in/);
    expect(transition).toMatch(/pending_capture', 'consumed', 'released', 'expired'/);
    expect(transition).toMatch(/from_st = 'pending_capture' and p_to_status in/);
    expect(transition).toMatch(/insert into public\.inventory_reservation_events/);
    const confirm = sql.slice(
      sql.indexOf("create or replace function public.confirm_store_checkout_quote")
    );
    expect(confirm).toMatch(/'active'/);
    expect(confirm).not.toMatch(/to_status,\s*'pending_capture'/);
  });

  it("bounds expiry batch size and uses skip locked", () => {
    const sql = read(MIGRATION);
    const expire = sql.slice(
      sql.indexOf("create or replace function public.expire_inventory_reservations")
    );
    expect(expire).toMatch(/least\(coalesce\(p_limit, 100\), 500\)/);
    expect(expire).toMatch(/for update skip locked/i);
  });

  it("revokes authenticated execute on internal reservation helpers", () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(
      /revoke all on function public\.transition_inventory_reservation\([\s\S]*?from public, anon, authenticated;/
    );
    expect(sql).toMatch(
      /revoke all on function public\.create_active_inventory_reservation\([\s\S]*?from public, anon, authenticated;/
    );
    expect(sql).toMatch(
      /revoke all on function public\.release_inventory_reservations_for_order\([\s\S]*?from public, anon, authenticated;/
    );
    expect(sql).toMatch(
      /revoke all on function public\.expire_inventory_reservations\(integer\)\s+from public, anon, authenticated;/
    );
    expect(sql).toMatch(
      /revoke all on function public\.allow_product_inventory_reserved_write\(\)\s+from public, anon, authenticated;/
    );
  });
});

describe("commerce safety app wiring", () => {
  it("exposes admin reservations route and buyer cancel action", () => {
    const routes = read("app/lib/nav/routes.ts");
    expect(routes).toMatch(/adminStoreReservations:\s*"\/admin\/store\/reservations"/);
    expect(
      existsSync(join(ROOT, "app/admin/store/reservations/page.tsx"))
    ).toBe(true);
    const actions = read("app/actions/storeOrders.ts");
    expect(actions).toMatch(/buyerCancelOrderAction/);
    const checkout = read("lib/store/checkout.ts");
    expect(checkout).toMatch(/assertCommerceConfirmNotKilledByEnv/);
  });

  it("seller inventory path preserves reserved and rejects unsafe on_hand", () => {
    const seller = read("lib/store/sellerStore.ts");
    expect(seller).toMatch(/Client must never authoritatively set reserved/);
    expect(seller).toMatch(/preservedReserved/);
    expect(seller).toMatch(/On hand cannot be lower than currently reserved/);
    const catalog = read("app/actions/storeCatalog.ts");
    expect(catalog).not.toMatch(/reserved:\s*formData\.get\("reserved"\)/);
  });

  it("admin reservation page avoids buyer PII fields", () => {
    const page = read("app/admin/store/reservations/page.tsx");
    expect(page).not.toMatch(/email/i);
    expect(page).not.toMatch(/phone/i);
    expect(page).not.toMatch(/address_line/i);
    expect(page).not.toMatch(/payment_attempt/i);
    expect(page).toMatch(/stuck/i);
  });

  it("maps unsafe RPC detail away from clients", () => {
    expect(mapCommerceSafetyRpcError("pq: SQLSTATE 23505 duplicate key")).toBe(
      "Request failed."
    );
    expect(
      mapCommerceSafetyRpcError("Reserved inventory is system-managed")
    ).toMatch(/cannot be edited/i);
  });
});
