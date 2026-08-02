# Purchase Stock Decrement Runtime V1

Capability: `commerce.inventory.purchase_stock_decrement_runtime_v1`
Branch: `office/purchase-stock-decrement-runtime-v1`
Base: `f66fa6f9cec55f8adc7ef9791a909567da829c79` (`origin/office/purchase-stock-decrement-v1`)

## Commitment point

`trusted_payment_capture` only — wired in `applyVerifiedStorePaymentOutcome` after allocate/commission and **before** digital entitlement grant.

## Transaction design

RPC: `decrement_store_purchase_stock_after_capture(payment_attempt_id, event_key, correlation_id)`

One Postgres transaction:

1. Advisory xact lock on `store_purchase_stock:{event_key}`
2. Replay from `store_purchase_stock_decrement_events` if present
3. Lock payment attempt + order; require captured/paid
4. Require trusted capture outcome + matching correlation
5. Lock active/pending reservations for the order
6. Finite (`physical`/`booking`) only: `transition_inventory_reservation(consumed)` then `on_hand -= qty`
7. Unlimited types skipped (left for entitlement consume path)
8. Insert idempotency row

## Idempotency

Persisted PK `store_purchase_stock_decrement_events.event_key` = `${captureEventKey}:purchase_stock`.
Concurrent callers serialize via advisory lock; webhook retries replay without double decrement.

## Migration

`20260893_store_purchase_stock_decrement_runtime_v1.sql` — required for atomic on_hand mutation + persisted idempotency. Local file only; not remote-applied by this task.

## Related

Refund restock contracts (trusted Sync `refunded`, `return_increment`, no Runtime) continue in
`REFUND_STOCK_RESTOCK_FOUNDATION_V1.md`.

## Out of scope

Refund restock, cancel restock, warehouses, supplier sync, preorder/backorder orchestration, shipping, pricing, AI/Learning/Navigation/Home.
