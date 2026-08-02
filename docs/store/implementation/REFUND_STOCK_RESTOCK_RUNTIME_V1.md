# Refund Stock Restock Runtime V1

Capability: `commerce.inventory.refund_stock_restock_runtime_v1`
Branch: `office/refund-stock-restock-runtime-v1`
Base: `c0faff223395f156becc89cfb7e8155866a49475` (`origin/office/refund-stock-restock-foundation-v1`)

## Commitment point

`trusted_payment_refund` only — wired in `applyFullOrderRefund` after Sync `refunded` and **before** digital entitlement revoke.

## Transaction design

RPC: `restock_store_purchase_stock_after_refund(payment_attempt_id, event_key, correlation_id)`

One Postgres transaction:

1. Advisory xact lock on `store_purchase_stock_restock:{event_key}`
2. Replay from `store_purchase_stock_restock_events` if present
3. Lock payment attempt + order; require trusted `refunded` + `captured` outcomes
4. Require prior `store_purchase_stock_decrement_events` at `${capture.event_key}:purchase_stock` (fail closed if missing)
5. Prior decrement qty `0` → persisted restock noop (unlimited / no finite take)
6. Lock consumed reservations for the order; skip unlimited types; finite only: `on_hand += qty`
7. Restock total must equal prior `quantity_decremented`
8. Insert idempotency row

## Idempotency

Persisted PK `store_purchase_stock_restock_events.event_key` = `${captureEventKey}:purchase_stock:restock`.
Concurrent callers serialize via advisory lock; webhook/retry replays without double restock.

## Migration

`20260894_store_purchase_stock_restock_runtime_v1.sql` — required for atomic on_hand restock + persisted idempotency + prior-decrement gate. Local file only; not remote-applied by this task.

## Related

Foundation contracts: `REFUND_STOCK_RESTOCK_FOUNDATION_V1.md`.
Capture decrement Runtime: `PURCHASE_STOCK_DECREMENT_RUNTIME_V1.md`.

## Out of scope

Partial refund restock, cancel restock, warehouses, supplier sync, shipping, pricing, AI/Learning/Navigation/Home.
