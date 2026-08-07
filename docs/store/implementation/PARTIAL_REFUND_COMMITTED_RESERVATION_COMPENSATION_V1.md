# Commerce Partial Refund Committed Reservation Compensation V1

Capability: `commerce.payments.partial_refund_committed_reservation_compensation_v1`  
Module: `lib/store/partialRefundCommittedCompensation/`  
Version: `commerce-partial-refund-committed-reservation-compensation-v1`

## Status

**CLOSED** — `PARTIAL_REFUND_COMMITTED_RESERVATION_COMPENSATION_V1_CLOSED`

| Item | Value |
| --- | --- |
| Branch | `office/commerce-partial-refund-committed-reservation-compensation-v1` |
| Migration | `20260907_store_partial_refund_ledger_compensate_committed_v1.sql` |
| Remote apply | **VERIFIED** on `umtuba` / `tgucwnjwoyeqoxqaxmew` |
| History name | `store_partial_refund_ledger_compensate_committed_v1` |
| Focused tests | **124 passed** / 11 files |
| TypeScript | PASS |
| `git diff --check` | PASS |

## Purpose

Admin-only **ACCOUNTING COMPENSATION ONLY** for committed partial-refund ledger reservations:

`committed → compensated`

Restores capture refundable amount and per-line committed quantity ceilings **exactly once**, with idempotent `already_compensated` replay.

## Semantic boundary

Compensation does **not**:

- refund money / reverse buyer payment
- call a payment provider
- restock inventory
- adjust entitlements
- unwind settlement or commission
- mutate payouts
- cancel a committed reservation via money path
- enable or touch `commerce_confirm`
- expose seller/buyer mutation controls

## Surfaces

- SQL RPC: `compensate_store_partial_refund_ledger_commit(uuid, text, uuid)` — `SECURITY DEFINER`, service_role EXECUTE only
- Repository / commit boundary / orchestration: accounting-only
- Admin action: `adminCompensateCommittedPartialRefundReservationAction`
- UI: accounting review panel on `/admin/store/refunds`

## Neighboring remote history (unchanged by this milestone)

Learning `20260906`; Translation `20260910–12`; prior Commerce `20260899` / `20260900` / `20260905`.
