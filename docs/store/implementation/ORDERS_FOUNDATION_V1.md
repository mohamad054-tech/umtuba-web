# Orders Foundation V1

Status: implemented in `umtuba-web` (local; not applied remotely by default)  
Migration: `supabase/migrations/20260811_store_orders_foundation_v1.sql`

## Scope

Production-ready **Store Orders** foundation without payment gateway
integration:

- `orders` + `order_items` tables
- Separate order / payment / fulfillment status dimensions
- Immutable product / SKU / title snapshots on lines
- Fail-closed RLS (+ FORCE RLS)
- `service_role`-only create RPC that **derives prices and snapshots from DB**

**Out of scope:** Stripe / PayPal / HyperPay / MyFatoorah / Tap, checkout UI,
cart→order conversion, shipping carriers, refunds automation, seller order
console UI changes, authenticated status-update RPCs.

## Database

### `orders`

| Column | Notes |
| --- | --- |
| `buyer_id` | Purchaser (`auth.users`), `ON DELETE RESTRICT` |
| `store_id` | One store per order (V1), `ON DELETE RESTRICT` |
| `order_number` | Unique `UMT-YYYYMMDD-XXXXXX` (random suffix, not count/max) |
| `idempotency_key` | Optional unique key for safe create retries |
| `status` | pending → … → delivered / cancelled / refunded |
| `payment_status` | pending / authorized / paid / failed / refunded (independent) |
| `fulfillment_status` | unfulfilled / partial / fulfilled (independent) |
| `*_minor` money | `bigint` minor units + grand-total math check |
| `currency` | ISO-4217 `^[A-Z]{3}$` |

**Immutable after create (DB trigger):** `buyer_id`, `store_id`,
`order_number`, `currency`, `idempotency_key`, all money totals.

**Mutable for future trusted RPCs:** `status`, `payment_status`,
`fulfillment_status`, `notes` (no authenticated update path in this
foundation).

### `order_items`

| Column | Notes |
| --- | --- |
| `product_id` / `variant_id` | Required FKs (`ON DELETE RESTRICT`) |
| `seller_user_id` | Must match store owner at insert |
| `quantity`, `unit_price_minor`, `total_price_minor` | Line math enforced |
| `product_snapshot` | JSON object frozen at create (DB-derived) |
| `sku_snapshot`, `title_snapshot` | Required historical strings (DB-derived) |
| `variant_title_snapshot` | Optional (DB-derived) |

Hard deletes of referenced catalog/user/store rows are **blocked** while order
lines exist (`RESTRICT`). Catalog field edits after create do not rewrite
snapshots (immutability trigger).

Triggers:

- `enforce_order_header_identity_immutable`
- `enforce_order_item_snapshot_immutable`
- `enforce_order_item_store_alignment` — product/variant/seller ↔ order store

## RLS

| Actor | Access |
| --- | --- |
| Anonymous | None |
| Buyer | `SELECT` own orders (`buyer_id = auth.uid()`) + items via parent |
| Store member | `SELECT` orders for **own** `store_id` only + items via parent |
| Other sellers | No cross-store reads |
| Platform admin | `SELECT` via `is_platform_admin()` (DB `platform_admins`) |
| Authenticated writes | **Revoked** (no insert/update/delete policies) |
| `service_role` | `BYPASSRLS` — create RPC inserts succeed under FORCE RLS |

Both tables use `ENABLE` + `FORCE` row level security.

## RPCs

| Function | Who | Purpose |
| --- | --- | --- |
| `next_store_order_number()` | `service_role` | Random human-friendly candidate |
| `store_order_active_unit_price_minor` | `service_role` | Authoritative active price lookup |
| `can_read_store_order(uuid)` | authenticated / service_role | Item SELECT helper |
| `create_store_order_foundation(...)` | **service_role only** | Atomic header + lines |

### `create_store_order_foundation` trust boundary

**Accepted inputs:** `buyer_id`, `store_id`, `currency`, items
`[{product_id, variant_id, quantity}]`, optional
`discount_total_minor` / `tax_total_minor` / `shipping_total_minor` /
`notes` / `idempotency_key`.

**Rejected on items:** any priced or snapshot fields
(`unit_price_minor`, `title_snapshot`, `product_snapshot`, etc.).

**Derived from DB:** unit price (`product_prices`), SKU/title/variant title,
`product_snapshot`, `seller_user_id` (store owner), `subtotal_minor`
(sum of line totals), `grand_total_minor` (formula).

**Eligibility gates:** store must be `active`; each product must be
`active` + `approved`; each variant must be `active` with an active price
in the order currency.

**Atomic / consistent:** prices and snapshots are frozen in one pass before
insert (no second catalog lookup), then line-sum is asserted equal to
`subtotal_minor`. Failure rolls back header + lines.
**Idempotent:** same non-null `idempotency_key` returns existing order id.
**Order numbers:** unique index + insert retry on collision (not count/max).

All SECURITY DEFINER functions set `search_path = public` and revoke execute
from `public` / `anon` (create/price/number helpers also revoke
`authenticated`).

## Application modules

| Module | Role |
| --- | --- |
| `lib/store/types.ts` | Order enums + row / input types |
| `lib/store/orderRules.ts` | Status transitions, money, snapshots, RLS mirrors, create trust checks |

No UI / route / unrelated-module changes. Marketplace V2 seller/admin flows
remain untouched.

## Status transitions (app contract)

Documented in `ORDER_STATUS_TRANSITIONS` — payment and fulfillment statuses
remain independent. No DB status-update RPC is shipped in V1.

## Future payment integration

Checkout should call `create_store_order_foundation` from a trusted server
context after cart validation. Gateway SDKs are intentionally absent.
`payment_status` is ready for later webhook-driven updates via a future
trusted RPC (identity/money remain immutable).

## Tests

`lib/store/ordersFoundation.test.ts` covers money/qty/currency, status
transitions, snapshot/header immutability, store mismatch, order-number
contract, RPC trust boundary, privilege revocations, and RLS policy text.
