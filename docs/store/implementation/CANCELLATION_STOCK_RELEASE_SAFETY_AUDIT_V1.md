# Cancellation Stock Release & Safety Audit V1

Capability: `commerce.inventory.cancellation_stock_release_safety_audit_v1`
Branch: `office/cancellation-stock-release-safety-audit-v1`
Base: `d440622c0bdd3c57e47ea483a84285b024853c55` (`origin/office/refund-stock-restock-runtime-v1`)

## Audit verdict

| Path | Stock effect | Safe? |
| --- | --- | --- |
| Unpaid cancel → `release_inventory_reservations_for_order` | `reserved -=` only | Yes |
| Reservation expiry (unpaid eligible) | `reserved -=` via `expired` | Yes |
| Trusted capture purchase decrement | consume + `on_hand -=` (finite) | Yes |
| Trusted Sync refund restock | `on_hand +=` only with prior decrement | Yes |
| Seller/admin cancel when `paid`/`authorized` (pre-fix) | released active holds | **Unsafe** |

## Minimal fix

Migration `20260895_store_cancellation_stock_release_safety_v1.sql` (local only):

1. `update_store_order_status` refuses cancel when payment is `paid`/`authorized`, or when any reservation is `consumed`.
2. `release_inventory_reservations_for_order` refuses release while payment is `paid`/`authorized` (defense in depth).

Seller presentation blocks paid/authorized cancel options so UI matches RPC.

## Rules preserved

- Cancel / release **never** `on_hand +=`.
- Restock remains refund Runtime only (`ownsCancellationRestock: false`).
- Double-release prevented by selecting only `active`/`pending_capture` + terminal transition rules.
- Release-after-consume prevented by transition matrix + release filter.

## Out of scope

Warehouse, supplier sync, pricing, shipping, partial refund, backorder/preorder, AI/Learning/Navigation/Home.
Remote apply of `20260895` awaits separate GO.
