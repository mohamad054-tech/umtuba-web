# Seller Inventory Adjustment Foundation V1

Capability: `commerce.inventory.seller_inventory_adjustment_foundation_v1`
Branch: `office/seller-inventory-adjustment-v1`
Base: `d0eefb18107e29f9e3d21498fe74637fbeca58b9` (`origin/office/seller-inventory-reservation-v1`)

## Repository audit

| Concern | Finding |
| --- | --- |
| Quantity SoT | `product_inventory` + Quantity Foundation |
| Reservation SoT | `inventory_reservations` / `reserved` counter (not an adjustment ledger) |
| Adjustment table | **None** (`inventory_adjustments` / `stock_movements` absent) |
| Event log for stock moves | **None** for seller adjustments (only reservation events) |
| Catalog on-hand edit | Draft/in-review **seed upsert** — explicitly not a movement ledger |
| Migration | **Not required** — inventing tables would expand into full inventory runtime |

## Adjustment model (contract only)

Reasons (not DB enums):

- `correction`
- `stock_count`
- `damaged`
- `returned`
- `manual_adjustment`

Intent = reason + signed `deltaOnHand` (+ optional note).
Validation projects before/after on-hand / reserved / available using Quantity Foundation math.
`applied` is always `false` in this foundation.

## Scope

- Owns: reason parse, delta validation, projection helpers, presentation labels, client-execution reject
- Does **not** own: apply runtime, movement ledger writes, reservation runtime, checkout/refund stock engines

## Related

Movement type contracts (projection/read helpers, no append runtime) continue in
`SELLER_INVENTORY_MOVEMENT_LEDGER_FOUNDATION_V1.md`.

## Out of scope

Decrement after purchase, reservation runtime, warehouses, supplier sync, checkout, shipping, pricing, entitlement, AI/Learning/Navigation/Home.
