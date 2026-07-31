# Commerce Safety & Inventory Reservation V1

Status: implemented in `umtuba-web` (local; **do not apply remotely** without explicit approval)
Migration: `supabase/migrations/20260819_store_commerce_safety_inventory_reservation_v1.sql`
Integrity fix (B1): `supabase/migrations/20260820_store_commerce_safety_integrity_fix_b1.sql`
Base: `origin/alpha-0.2` @ `8665b723b6833f8ac2bb532bbb588556ce381a6f` (includes Hardening + Reservation V1)
Branch: `office/store-commerce-safety-inventory-reservation-v1`

## Goal

Make checkout confirmation safe against unpaid-order abuse, overselling, duplicate confirmation, abandoned holds, and cancel-without-release — **without** live payment providers.

## Commerce feature gate

**Primary:** `store_commerce_config.commerce_confirm_enabled` (default **0 / OFF**).

**Emergency:** server-only env `STORE_COMMERCE_CONFIRM_KILL_SWITCH` (`1`/`true`).

### Precedence

1. Env kill switch ON → confirm denied
2. Else DB gate OFF → confirm denied
3. Else confirm allowed

Env is **kill-only**. It can never force commerce ON when the DB gate is OFF.
No `NEXT_PUBLIC_*` bypass.

Browsing, cart, and checkout **quote/preview** remain available when the gate is OFF.
Confirm and direct `create_store_order_foundation` fail closed. UI states purchases are unavailable.

Admin toggle: `admin_set_commerce_confirm_enabled` (+ `/admin/store/reservations`).
Toggle writes append-only `store_commerce_config_audit` (actor + old/new value).

## Reservation model

Tables:

- `inventory_reservations` — operational pointer
- `inventory_reservation_events` — **append-only** audit (no client UPDATE/DELETE)

Availability resolution for sellable quantity (unlimited digital vs finite physical) is documented in `SELLER_INVENTORY_AVAILABILITY_FOUNDATION_V1.md` (`commerce.inventory.seller_inventory_availability_foundation_v1`). Reservation holds still decrement sellable finite stock via `reserved`.

Statuses: `active` | `pending_capture` | `consumed` | `released` | `expired`

V1 confirm always creates **`active`** holds.
`pending_capture` / `consumed` are reserved for future payment capture (no auto transition in confirm).

Every status transition updates the pointer and inserts an event **in the same transaction** via `transition_inventory_reservation`.

Required identity fields include **`checkout_session_id`** (server UUID per confirm attempt; client cannot choose/override). Persisted on `checkout_quotes.checkout_session_id` and reused for idempotent confirmed retries.

### Direct order create — Integrity Fix B1

`create_store_order_foundation` (service_role) previously minted a fresh `gen_random_uuid()` session on every call and keyed reservations as `direct:{session}:{variant}`. After an idempotent order replay, that created a **second active reservation set** (double `reserved`).

Fix (`20260820_…_b1`):

- `checkout_session_id` for the direct path = **`order_id`** (stable across retries)
- Reservation idempotency key = **`direct:{order_id}:{variant_id}`**
- Dedup authority remains `inventory_reservations.idempotency_key` UNIQUE + `create_active_inventory_reservation` `FOR UPDATE` replay (no second `reserved` bump)

## Inventory behavior

- Available = `on_hand - reserved - safety_stock` (unchanged formula)
- Confirm: bump `reserved`, create ACTIVE ledger rows — **do not** decrement `on_hand`
- `active` / `pending_capture` contribute to the `reserved` counter; `released` / `expired` / `consumed` (V1 consume path) decrement the counter without double-subtracting `on_hand`
- Seller inventory edits **preserve** existing `reserved` (app layer)
- **DB trigger** `protect_product_inventory_reserved` rejects client/seller mutations of `reserved` unless a transaction-local GUC is set by reservation DEFINER helpers
- Seller cannot set `on_hand` below current `reserved`
- `allow_backorder`: when true, confirm skips the sellable-availability check, but `reserved` still cannot exceed `on_hand` (table constraint + reservation helper). Backorder does **not** mean unbounded oversell of the reserved counter.

## Unpaid fulfillment guard

`update_store_order_status` rejects transitions to `shipped` / `delivered` while `payment_status` is not `paid` or `authorized`. This prevents unpaid orders from escaping buyer-cancel and expiry release paths.

## Release / cancel / expiry

| Path | Behavior |
| --- | --- |
| Confirm failure | Transaction rollback |
| Seller/admin cancel | `update_store_order_status` → release once |
| Buyer cancel | `buyer_cancel_store_order` — unpaid `payment_status=pending`, pre-fulfillment statuses, own order; release once |
| Expiry RPC | `expire_inventory_reservations(limit)` — service_role only |

Expiry releases holds and **auto-cancels only eligible unpaid pending** orders.
Does **not** cancel paid / authorized / shipped / delivered / orders with consumed reservations.
Already-cancelled orders: release/expiry cancel paths are safe no-ops.
System reason: `system:reservation_ttl_expired`.

### TTL

Centralized: `store_commerce_config.reservation_ttl_minutes` = **30**.
RPCs read config — no hard-coded TTL in confirm/expire bodies.

### Scheduling

**Not shipped in this phase.** Migration + RPC + docs + manual/ops invocation foundation only.
Do not claim an active GitHub Actions schedule. Wiring a scheduler is an explicit operational deployment step.

## Admin visibility

`/admin/store/reservations` — active / expired / released / stuck / filter by store.
No buyer email, phone, address, or payment metadata.

Stuck heuristic (read-only, conservative): `active`/`pending_capture` with `expires_at <= now()`.

## App surfaces

| Surface | Change |
| --- | --- |
| Checkout | Gate banner; confirm blocked when unavailable; env kill pre-check |
| Buyer order detail | Cancel unpaid order |
| Seller product edit | Read-only reserved qty |
| Admin | Reservations ops + DB gate toggle |

## Manual expiry invocation (ops)

```sql
select public.expire_inventory_reservations(100);
```

Requires a role that can EXECUTE the function (`service_role` / DB owner). Not callable by buyers/sellers.

## Out of scope

Stripe, PayPal, webhooks, capture, refunds, payouts, commissions, carrier APIs, Ads, Analytics/Finance redesign, Hardening redesign.
