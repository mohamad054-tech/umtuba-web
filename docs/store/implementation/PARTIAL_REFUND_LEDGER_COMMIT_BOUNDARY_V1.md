# Commerce Partial Refund Durable Ledger & Commit Boundary V1

Capability: `commerce.payments.partial_refund_ledger_commit_boundary_v1`
Module: `lib/store/partialRefundLedger/`
Version: `commerce-partial-refund-ledger-commit-boundary-v1`
Migration (remotely applied): `supabase/migrations/20260899_store_partial_refund_ledger_commit_boundary_v1.sql`

## Status

**FOUNDATION COMPLETE** — durable ledger + commit-boundary foundation
(`PARTIAL_REFUND_LEDGER_FOUNDATION_V1_CLOSED`).

Migration `20260899` is **remotely applied** (with `20260900` RPCs; remote tip `20260900`).
Service-role adapter + reservation orchestration: see
`PARTIAL_REFUND_LEDGER_SERVICE_ADAPTER_V1.md`.
Provider / money execution remains a **later independent milestone**.
Compensation for committed reservations is **deferred** and must not be invented.

**`committed` means durable prior-accounting reservation only.**
It is **not** a payment-provider refund, Sync refund, settlement unwind, commission unwind,
stock restock, entitlement change, payout, or any production money movement.

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

- Remote tip after apply closeout: **`20260900`**
- Learning `20260896–97` and payout `20260898` unchanged
- `20260899` / `20260900` **remotely applied and registered**

## Related

Calculation foundation: `docs/store/implementation/PARTIAL_REFUND_PATH_V1.md`
