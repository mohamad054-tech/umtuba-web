# Cursor Report

## Summary

**PASS + STAGED** for `commerce.payments.full_order_refund_path_v1` on `office/commerce-payments-full-order-refund-path-v1` (base `54404e8`).

## Exact milestone

`commerce.payments.full_order_refund_path_v1` — approved and implemented.

## Refund behavior

| Step | Behavior |
| --- | --- |
| Validate | Paid + captured; exact store ownership; trusted money only |
| Payout gate | Reject `IN_TRANSIT` and `COMPLETED` |
| Settlement | `RELEASED`→`hold`→`reverse_allocation`; else reverse if allocated/held |
| Sync | `apply_store_payment_outcome(refunded)` full capture amount |
| Idempotency | Same key replays; conflict fails closed |

## Files

- `lib/store/fullOrderRefundPath.ts` (new)
- `lib/store/fullOrderRefundPath.test.ts` (new)
- `docs/store/implementation/FULL_ORDER_REFUND_PATH_V1.md` (new)
- `docs/store/implementation/SETTLEMENT_FOUNDATION_V1.md` (cross-link)
- `docs/ai/CURRENT_TASK.md` / `CURSOR_REPORT.md` / `SESSION_HANDOFF.md`

## Migration

None.

## Boundaries

No Dashboard, Admin UI, AI, bank rails, partial refunds, or COMPLETED clawback.
