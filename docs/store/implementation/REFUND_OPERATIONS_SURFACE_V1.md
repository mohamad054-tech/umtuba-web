# Commerce Refund Operations Surface V1

Capability: `commerce.refund.operations_surface_v1`  
Module: `lib/store/refundOperations/`  
Migration: `supabase/migrations/20260888_store_refund_operations_surface_v1.sql` (**not remote-applied here**)  
Admin: `/admin/store/refunds`

## Purpose

Durable request → review → approve/reject → execute workflow on top of the existing **full-order** refund path. Money movement stays in `applyFullOrderRefund`.

## Storage

- `store_refund_operation_requests` — current status, identities, server-trusted amount/currency, idempotency keys
- `store_refund_operation_events` — append-only transition audit
- Partial unique index: one active request per order
- Unique `(store_id, idempotency_key)`

## Lifecycle

`requested → under_review → approved|rejected|cancelled`  
`approved → processing → completed|failed`  
`failed → processing` (retry execute)

## Guarantees

- No partial refunds
- No client money fields
- Admin-gated approve/reject/execute (server actions + DB admin checks)
- Seller read surface cannot execute money refunds
- Notifications: requested / completed / rejected / failed

## Related (calculation only)

Partial refund **calculation** foundation: `docs/store/implementation/PARTIAL_REFUND_PATH_V1.md`
(`ownsPartialRefundCommit` remains false — ops execute still full-order only.)

## Out of scope

Stripe refund adapter, payout rails changes, commission changes, wallet mutations, remote migration apply
