# Order Management V1 — Seller Dashboard + Buyer History

Status: implemented in `umtuba-web` (local; migration not applied remotely by default)  
Migration: `supabase/migrations/20260813_store_order_management_v1.sql`

## Scope

Production-ready order surfaces **without payment gateways**:

- Seller list + detail for own-store orders
- Seller-safe status / fulfillment updates with audit history
- Buyer order history + detail for own orders only
- Lifecycle timestamps (`confirmed_at`, `processing_at`, `packed_at`,
  `shipped_at`, `delivered_at`, `cancelled_at`) — set-once, server-controlled

**Deferred:** payment collection, seller payment-status mutation, carrier APIs,
refunds workflow UI, inventory reservation release on cancel.

## Seller workflow

1. Open `/seller/store/orders` (linked from seller hub + store dashboard).
2. Filter by order status; open an order for items, shipping snapshot, totals,
   timeline, and audit history.
3. **Owners/managers only** update order status and/or fulfillment via
   `update_store_order_status` (server action → SECURITY DEFINER RPC).
4. Viewers and catalog editors may read orders but cannot mutate.

Authority is derived from the order’s `store_id` + `is_store_member_with_role`
(`owner`/`manager`) or `is_platform_admin()`. Client `store_id` / role / buyer
claims are rejected by the server action and ignored by the RPC.

## Buyer history

1. Open `/store/orders` (auth protected; linked from cart).
2. Filter by status; open `/store/orders/[orderId]` for snapshots and timeline.
3. Pending-payment notice is shown when `payment_status = pending`.

Buyers only see rows where `buyer_id = auth.uid()` (RLS + app filter). Cross-buyer
IDOR attempts return uniform **Order not found.**

## Status transition rules

Order status (seller-callable subset):

| From | Allowed next |
| --- | --- |
| pending | confirmed, cancelled |
| confirmed | processing, cancelled |
| processing | packed, cancelled |
| packed | shipped, cancelled |
| shipped | delivered |
| delivered | _(seller-frozen; refunded is admin/payment only)_ |
| cancelled / refunded | terminal |

Same-state retries return `unchanged: true` with **no** audit row.

Fulfillment:

| From | Allowed next | Notes |
| --- | --- | --- |
| unfulfilled | partial, fulfilled | |
| partial | unfulfilled, fulfilled | |
| fulfilled | partial | **Only while order is still pre-ship** (pending/confirmed/processing/packed) |

Consistency rules enforced in RPC:

- Transitioning to `delivered` **forces** `fulfillment_status = fulfilled`
- After ship/deliver/cancel: cannot set `unfulfilled`; cannot reopen
  `fulfilled → partial`
- `payment_status` is never mutated by sellers

## Privacy boundaries

Sellers see fulfillment-minimum contact fields from address snapshots only.
UI projections also strip: buyer UUID, idempotency key, checkout quote id,
tax/discount engine snapshots, order notes. Coupon **code** may appear on the
order; redemption internals are not exposed.

Buyers do not receive seller actor UUIDs, seller-internal audit notes, or
`seller_user_id` on line items.

## Audit history

`order_status_history` records actor (`auth.uid()`), from/to status and
fulfillment, optional note, and source (`seller`/`admin`). Readable via
`can_read_store_order(order_id)`. Inserts are SECURITY DEFINER only.

`ON DELETE RESTRICT` on `order_id` so order deletion cannot silently wipe
audit history.

## Intentionally deferred

- Payment gateways and seller payment-status edits
- Carrier tracking numbers / label purchase
- Automated inventory release on cancel
- Buyer-initiated cancel RPC
- Refunded status UI for sellers
