# Purchase Stock Decrement Foundation V1

Capability: `commerce.inventory.purchase_stock_decrement_foundation_v1`
Branch: `office/purchase-stock-decrement-v1`
Base: `93009b0d1348dc4e10f3ec8b4c7be2993ef228ed` (`origin/office/seller-inventory-movement-ledger-v1`)

## Repository audit (commitment point)

| Stage | Decrements `on_hand`? | Evidence |
| --- | --- | --- |
| Order create / checkout confirm | **No** — `reserved += qty` only | `20260819` ACTIVE holds; Commerce Safety docs |
| Reservation create | **No** | same |
| Trusted payment capture | **Yes (designed; not implemented)** | SQL: "on_hand decrement is payment-phase only (not V1)" |
| Reservation consume | Drops `reserved` only | `transition_inventory_reservation` consume branch |
| Fulfillment / settlement / entitlement | **No** stock decrement | separate post-capture stacks |
| Refund / cancel restock | **Out of scope** | no restock path in this foundation |

**Chosen commitment:** `trusted_payment_capture` only.

**Runtime status:** No safe reusable `on_hand` decrement RPC exists. Digital grant consumes holds without touching `on_hand`. Therefore this milestone is **Foundation/Contract only** — no migration, no apply Runtime.

## Sequence contract

For finite (`physical` / `booking`) lines with eligible holds (`active` / `pending_capture`):

1. `reservation_consumed` — `deltaReserved = -qty`, `deltaOnHand = 0`
2. `purchase_decrement` — `deltaOnHand = -qty`, `deltaReserved = 0`

Quantity source: trusted reservation only (never client).
`applied` / `recorded` remain `false`.

Unlimited (`digital` / `service` / `subscription` / `bundle`): **no-op** — do not invent finite stock or change entitlement/delivery.

## Idempotency (contract)

Mirrors post-capture suffixes:

- Order/capture scope: `${captureEventKey}:purchase_stock`
- Line/reservation scope: `${captureEventKey}:purchase_stock:{reservationId}`

Persisted uniqueness + replay no-op must be enforced by a future Runtime RPC. This foundation only defines stable keys and refuse silent re-plan against already-`consumed` holds without Runtime proof.

## Scope

- Owns: commitment-point guard, relation checks, finite vs unlimited disposition, consume→decrement projection, idempotency key builders, client-execution reject
- Does **not** own: apply RPC, migration, refund/cancel restock, reservation/checkout Runtime, entitlement redesign

## Out of scope

Refund restock, cancellation restock, warehouses, supplier sync, backorder/preorder, shipping, pricing, payout/settlement redesign, entitlement/digital delivery, AI/Learning/Navigation/Home.
