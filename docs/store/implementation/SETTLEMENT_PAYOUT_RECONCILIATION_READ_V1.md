# Settlement ↔ Payout Reconciliation Read V1

Capability: `commerce.settlement.payout_reconciliation_read_v1`
Status: implemented locally (migration not applied remotely in this phase)

Migration: `supabase/migrations/20260883_store_settlement_payout_reconciliation_read_v1.sql`

Depends on:

- Settlement Foundation (`20260824`)
- Seller Payout Foundation (`20260881`)
- Seller Payout Read Model (`20260882` — access/clamp helpers reused)
- Revenue Bridge / Balance Visibility (consumers may diagnose later; this milestone is RPC + pure TS only)

## Purpose

Trusted **read-only reconciliation** of settlement state against payout state across:

`capture → allocation → release → payout booking → payout completion`

Detects mismatches safely without payout execution, bank rails, Dashboard/Admin UI, or a new financial engine.

## RPCs (authenticated owner/manager)

| RPC | Role |
| --- | --- |
| `get_my_seller_settlement_payout_reconciliation(store_id, limit, before_*, issues_only)` | Newest-first capture reconciliation rows; `limit` ≤ 50 |
| `get_my_seller_settlement_payout_reconciliation_summary(store_id)` | Per-currency capture/issue counts + global issue code counts |

Internal helpers (not granted to clients):

- `store_settlement_payout_recon_build_issues`
- `store_settlement_payout_recon_highest_severity`
- `store_settlement_payout_recon_project_capture`

Access reuses `store_payout_read_assert_store_access` / `store_payout_read_clamp_limit`.

## Issue codes

| Code | Severity | Meaning |
| --- | --- | --- |
| `aligned` | ok | Settlement and payout facts are consistent |
| `released_without_payout_booking` | info | `RELEASED` with no submit / payout still `NONE` |
| `payout_without_released_settlement` | error | Payout activity without settlement `RELEASED` |
| `unsettled_with_payout` | error | Unsettled settlement (`UNALLOCATED`/`ALLOCATED`/`HELD`/`REVERSED`) with payout activity |
| `duplicate_payout_booking` | error | Extra submits vs fail/open lifecycle, or >1 confirm |
| `completed_without_release` | error | Payout `COMPLETED` without `RELEASED` |
| `completed_missing_confirm` | error | Payout `COMPLETED` without confirm event |
| `in_transit_missing_submit` | error | `IN_TRANSIT` without matching open submit |
| `refunded_with_active_payout` | error | Trusted refund while payout `IN_TRANSIT`/`COMPLETED` |

## Inclusion

Captures for the store with `outcome = captured` that have **either** settlement events **or** payout events. Cross-store captures fail closed (projection returns null).

Amounts/currency come only from trusted capture rows — never from client input.

## Pagination / ordering

- Newest-first: `capture.created_at desc, capture.id desc`
- Keyset: `before_created_at` + `before_id` together (or both null)
- Default/max limit: 50
- Optional `issues_only` skips `highest_severity = ok`

## TypeScript

`lib/store/settlementPayoutReconciliation.ts` — pure `reconcileSettlementPayoutCapture`, parsers, RPC wrappers. Server-side trusted computations only; rejects client money fields; strips sensitive ledger keys.

## Security

- `auth.uid()` + owner/manager membership (via shared payout-read access helper)
- No client-trusted money
- Response omits fingerprints, UEOS journal ids, metadata, rails, bank fields
- Per-currency summary buckets — no mixed-currency totals
- Fail closed on auth / malformed store id / half cursor

## Out of scope

Payout execution, bank/provider rails, Dashboard/Admin UI, new financial engine, write/booking RPCs, commission invention, seller store UI wiring (this milestone is read model only).

Seller-facing diagnostics UI on the existing seller store is `commerce.settlement.payout_reconciliation_surface_v1` (`PAYOUT_RECONCILIATION_SURFACE_V1.md`) — consumes these RPCs; no bank rails or repair actions.
