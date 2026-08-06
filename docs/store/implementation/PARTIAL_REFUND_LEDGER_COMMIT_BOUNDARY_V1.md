# Commerce Partial Refund Durable Ledger & Commit Boundary V1

Capability: `commerce.payments.partial_refund_ledger_commit_boundary_v1`
Module: `lib/store/partialRefundLedger/`
Version: `commerce-partial-refund-ledger-commit-boundary-v1`
Migration (local draft only): `supabase/migrations/20260899_store_partial_refund_ledger_commit_boundary_v1.sql`

## Status

**FOUNDATION COMPLETE** — closed as durable ledger + commit-boundary foundation only
(`PARTIAL_REFUND_LEDGER_FOUNDATION_V1_CLOSED` after closeout push).

## Purpose

Durable **ledger reservation** and **commit boundary** for partial refunds.

- Records trusted planned refunds (from calculation foundation)
- Transitions: `planned → committing → committed | failed` (`failed → committing` retry)
- Enforces capture money ceilings and per-line quantity ceilings
- Optimistic `accounting_version` + exclusive one-`committing`-per-capture

**`committed` means durable prior-accounting reservation only.**
It is **not** a Stripe refund, Sync refund, provider refund, settlement unwind, commission unwind, stock restock, entitlement change, payout, or any production money movement.

No partial refund was executed in this milestone. No production money moved.
Migration `20260899` is **local only and not remotely applied**. Remote apply requires a **separate explicit GO**.
Provider / runtime integration is a **later independent milestone**.
Compensation for committed reservations is **deferred** and must not be invented.

## Ownership

| Flag | Value |
| --- | --- |
| `ownsPartialRefundLedgerDomain` | **true** |
| `ownsPartialRefundCommitBoundary` | **true** |
| `ownsPartialRefundMoneyExecution` | **false** |
| `ownsPartialRefundProviderRefund` | **false** |
| `ownsPartialRefundRestock` | **false** |
| `ownsPartialEntitlementAdjustment` | **false** |
| `ownsPartialSettlementUnwind` | **false** |
| `ownsPartialCommissionUnwind` | **false** |

## Ledger model

- Capture accounting row: currency, capture amount, committed refund sum, version
- Commit header: ids, status, fingerprint, idempotency key, amounts
- Lines: order_item_id + quantity + trusted refund_amount_minor
- Committed qty aggregate per (capture, order_item)

## Commit boundary

`planPartialRefundLedgerCommit` → `beginPartialRefundLedgerCommit` → `completePartialRefundLedgerCommit`
or `failPartialRefundLedgerCommit` from `committing` (retry from `failed`).

Provider money movement remains `unsupported_runtime`.

## Locking

Capture-scoped optimistic version (`expectedAccountingVersion` / `accounting_version`) plus at-most-one `committing` row per capture.

## Idempotency

Unique `(store_id, idempotency_key)`. Same key + same fingerprint replays; conflicting payload fails closed.

## Retry / rollback

- Retry: `failed → committing` only
- Rollback: none for `committed` (compensation requires a new GO)
- Fail from `committing` releases in-flight reservation without incrementing committed ceilings

## Migration version proof (local draft)

- Fresh remote tip (closeout preflight): **`20260898`**
- Remote versions `20260896–20260902`: `96` Learning, `97` Learning, `98` payout; **`99`–`902` absent**
- Local duplicate `20260899` files: **only this migration path**
- **Not applied remotely**

## Related

Calculation foundation: `docs/store/implementation/PARTIAL_REFUND_PATH_V1.md`
