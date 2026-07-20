# UMTUBA Store — Commerce Safety & Inventory Reservation V1

**Status:** Implemented in repo (migration apply is ops-owned; not applied by this change)

**Branch base:** `origin/office/store-hardening-v1` (`bd6ebcbb…`)

**Migration:** `supabase/migrations/20260819_store_commerce_safety_inventory_v1.sql`

## Scope

1. **DB-authoritative commerce gate** (`store_commerce_settings.checkout_confirm_enabled`, default **OFF**)
2. **Inventory reservations** on every *new* order create (`create_store_order_foundation_core`)
3. Dedicated **`reservation_token` (UUID)** per reservation row
4. **Release on cancel**; **expiry releases inventory only** (orders are never deleted/cancelled by expiry)
5. **Audit events:** `created` / `released` / `expired` / `consumed` (consume path reserved for later payment settle)
6. App reads DB gate via RPC; env may only **emergency-disable**

**Out of scope:** live payments, finance, payouts, carrier integrations, `on_hand` decrement on ship/paid.

## Commerce gate

| Layer | Behavior |
|-------|----------|
| DB | Source of truth. `assert_store_commerce_checkout_enabled()` on new order creates |
| Admin RPC | `admin_set_store_commerce_checkout_enabled(boolean)` (platform admin) |
| Read RPC | `get_store_commerce_checkout_enabled()` |
| App | `isStoreCommerceCheckoutEnabled` — fail-closed on RPC error |
| Env override | `STORE_COMMERCE_EMERGENCY_DISABLE=1` forces OFF; **cannot enable** when DB is off |

**Gate surface:** confirm + every *new* order create (DB). Browse, cart, and
**quote calculation remain available** when the gate is off. Place-order /
confirm fails clearly in app + DB.

**TTL:** `reservation_ttl_minutes` on `store_commerce_settings` (default **45**).
Do not scatter magic timeouts in app code.

## Reservation model

| Object | Role |
|--------|------|
| `product_inventory.reserved` | Operational sellable counter |
| `inventory_reservations` | Per order-item ledger + `reservation_token` |
| `inventory_reservation_events` | Append-only lifecycle audit |

- TTL default: **45 minutes** (`reservation_ttl_minutes` on settings)
- Warehouse V1: `default`
- **Idempotency key is mandatory** on every new order create (core + service_role wrapper).
- Same key returns the existing order and does **not** re-gate or re-reserve.
- `product_inventory.reserved` is **system-managed** (trigger); sellers may update `on_hand` / `safety_stock` / `allow_backorder` only.
- Reservation helpers set transaction-local `umtuba.allow_inventory_reserved_mutation=1` before counter changes. Ops maintenance uses the same GUC explicitly — no authenticated bypass.

## Release / expiry

| Event | Effect |
|-------|--------|
| Order → `cancelled` via `update_store_order_status` | Release active reservations (`released`) |
| `expire_store_inventory_reservations` (service_role) | Mark `expired`, decrement `reserved` — **orders untouched** |

## Apply checklist (ops)

1. Confirm Store foundations through Hardening (`20260818`) and checkout/order migrations are applied as required by the environment.
2. Apply `20260819_store_commerce_safety_inventory_v1.sql`.
3. Verify `store_commerce_settings` row `id=1` with `checkout_confirm_enabled=false`.
4. Verify `inventory_reservations.reservation_token` unique; client INSERT revoked.
5. Enable commerce only when ready: `admin_set_store_commerce_checkout_enabled(true)`.
6. **Operationally pending:** schedule `expire_store_inventory_reservations()`
   via Ops/cron (`service_role`). This change does **not** create remote cron
   jobs and does **not** apply the migration remotely.

## Rollback / forward fix

- Prefer **forward fix** + keep gate **OFF**.
- Emergency: set DB gate false and/or `STORE_COMMERCE_EMERGENCY_DISABLE=1`.
- Do not down-migrate live reservation ledgers without an ops release script.

## Tests

`lib/store/commerceSafetyInventory.test.ts` — migration contracts, gate, reservation/expiry rules, app wiring.
