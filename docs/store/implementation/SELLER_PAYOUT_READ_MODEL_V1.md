# Seller Payout Read Model V1

Capability: `commerce.settlement.seller_payout_read_model_v1`
Status: implemented locally (migration not applied remotely in this phase)

Migration: `supabase/migrations/20260882_store_seller_payout_read_model_v1.sql`

Depends on: Seller Payout Foundation (`20260881`), Settlement Foundation (`20260824`)

## Purpose

Trusted **seller-facing read model** over settlement `RELEASED` captures and Seller Payout Foundation states — eligibility, per-currency balances, and newest-first history/status. No bank rails, no Dashboard UI, no write/booking changes.

## RPCs (authenticated owner/manager)

| RPC | Role |
| --- | --- |
| `get_my_seller_payout_eligibility(store_id)` | Honest eligibility flags; `bank_payouts_enabled=false` |
| `get_my_seller_payout_summary(store_id)` | Per-currency `available` / `in_transit` / `completed` minors + counts |
| `get_my_seller_payouts(store_id, limit, before_*)` | Newest-first capture projections; `limit` clamped to 50 |

Helpers `store_payout_read_assert_store_access` and `store_payout_read_project_capture` are internal (project helper not granted to authenticated).

## Projection vocabulary

Reuses foundation payout states exactly:

| `payout_state` | Seller `payout_status` |
| --- | --- |
| `NONE` | `available` |
| `IN_TRANSIT` | `in_transit` |
| `COMPLETED` | `completed` |

Fail events return funds to `NONE` (available again) and increment `fail_count` / `failed_event_count`.

## Inclusion / exclusion

Included only when all hold:

- Capture outcome `captured` with paid order + captured attempt
- Settlement state **`RELEASED`** with completed release journal
- Capture belongs to the requested store
- No trusted `refunded` outcome on the attempt

Excluded (non-payable / unsettled):

- `UNALLOCATED` / `ALLOCATED` / `HELD` / `REVERSED` settlement
- Refunded attempts
- Cross-store captures (fail closed)

## Security

- `auth.uid()` required; `is_store_member_with_role(store_id, owner|manager)` only
- No client-trusted money totals
- Response omits fingerprints, UEOS journal ids, metadata, rails, bank fields
- Per-currency buckets — no mixed-currency sum
- GRANT EXECUTE to `authenticated` + `service_role`; helpers revoked from clients as noted

## Pagination

Newest-first: `capture.created_at desc, capture.id desc`.
Keyset: `before_created_at` + `before_id` together (or both null). Limit default 50, max 50.

## Out of scope

Bank/provider rails, maker-checker batches, Dashboard/admin UI, write RPCs, commissions, dispute tables (none in V1 foundation), broad seller payout screens.

Seller balance visibility through the Revenue Bridge is `commerce.revenue.payout_balance_visibility_v1` (consumes these RPCs; does not enable bank payouts).

Settlement↔payout mismatch diagnostics are `commerce.settlement.payout_reconciliation_read_v1` (`SETTLEMENT_PAYOUT_RECONCILIATION_READ_V1.md`) — read-only; does not change this projection.
