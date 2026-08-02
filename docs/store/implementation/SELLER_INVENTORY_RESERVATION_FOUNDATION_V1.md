# Seller Inventory Reservation Foundation V1

Capability: `commerce.inventory.seller_inventory_reservation_foundation_v1`
Branch: `office/seller-inventory-reservation-v1`
Base: `d120c0c579d4510c6b8ad56287942f8dac90fdcc` (`origin/office/seller-inventory-quantity-v1`)

## Repository audit

| Concern | Finding |
| --- | --- |
| Reserved counter SoT | `product_inventory.reserved` (system-managed) |
| Hold ledger SoT | `inventory_reservations` + `inventory_reservation_events` |
| Runtime | Existing Commerce Safety RPCs (`20260819` / `20260820`) |
| Quantity foundation | Complementary — reserved subtracts inside `availableUnits` |
| Migration | **Not required** for this foundation |

## Reservation model

| Status | Seller meaning |
| --- | --- |
| `active` | Blocking hold |
| `pending_capture` | Blocking hold (payment path) |
| `consumed` | Terminal |
| `released` | Terminal |
| `expired` | Terminal |

Blocking pressure = sum of `active` + `pending_capture` quantities.
Stuck = blocking hold past `expires_at` (read-only heuristic).

## This foundation provides

- Central status parse / blocking / terminal helpers
- Hold snapshot mapping from `SellerReservationRow`
- Reserved-counter vs hold-pressure consistency heuristic (no repair)
- Client mutation reject helper
- Presentation attention wired through the foundation
- Explicit non-ownership of checkout reserve/release/expire/consume runtime

## Out of scope

Checkout reservation runtime, expire schedulers, queues, release-after-payment, on-hand decrement after purchase, warehouses, shipping, pricing.
