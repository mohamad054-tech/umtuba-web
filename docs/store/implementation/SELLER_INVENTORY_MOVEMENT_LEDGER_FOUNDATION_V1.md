# Seller Inventory Movement Ledger Foundation V1

Capability: `commerce.inventory.seller_inventory_movement_ledger_foundation_v1`
Branch: `office/seller-inventory-movement-ledger-v1`
Base: `6ad44f9fe2255066e9075d4084c546685b427272` (`origin/office/seller-inventory-adjustment-v1`)

## Repository audit

| Concern | Finding |
| --- | --- |
| Quantity SoT | `product_inventory` + Quantity Foundation |
| Reservation SoT | `inventory_reservations` / `reserved` + reservation RPCs |
| Reservation event stream | `inventory_reservation_events` — **hold audit only** |
| Stock / inventory movement ledger | **None** (`inventory_movements` / `stock_movements` / `inventory_ledger` absent) |
| Adjustment foundation | Contract-only intents; `ownsMovementLedger: false` |
| Purchase decrement / refund restock | **Not implemented** on on-hand |
| Catalog on-hand edit | Draft/in-review **seed upsert** — not a movement ledger |
| Migration | **Not required** — inventing a ledger table would expand into append runtime |

## Movement model (contract only)

Types (not DB enums):

- `reservation_created`
- `reservation_released`
- `reservation_consumed`
- `inventory_adjustment`
- `purchase_decrement`
- `return_increment`

Intent = type + `deltaOnHand` + `deltaReserved` (+ optional note).
Validation projects before/after on-hand / reserved / available using Quantity Foundation math.
`recorded` is always `false` in this foundation.

Reservation status transitions can be mapped onto reservation_* movement types for presentation.
That mapping reuses the hold audit boundary; it does not turn reservation events into a general stock ledger.

## Scope

- Owns: movement type parse, delta shape validation, projection helpers, read-row normalize, presentation labels, client-execution reject
- Does **not** own: append/record runtime, purchase decrement runtime, reservation runtime, checkout/refund stock engines

## Related

Purchase stock decrement commitment (`trusted_payment_capture`, consume→decrement) continues in
`PURCHASE_STOCK_DECREMENT_FOUNDATION_V1.md` / `PURCHASE_STOCK_DECREMENT_RUNTIME_V1.md`.

Refund restock commitment (`trusted_payment_refund`, `return_increment`, no Runtime) continues in
`REFUND_STOCK_RESTOCK_FOUNDATION_V1.md`.

## Out of scope

Runtime movement engine, purchase decrement runtime, checkout, reservation runtime, warehouses, supplier sync, pricing, shipping, entitlement, AI/Learning/Navigation/Home.
