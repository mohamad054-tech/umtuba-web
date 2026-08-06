# Cursor Report

## Summary

**`PARTIAL_REFUND_ACCOUNTING_AUDIT_REVIEW_V1_CLOSED`**

Closed read-only capture accounting + committed reservation review for admin and seller on base `5d4bf18`. Remaining amount/qty derived from trusted capture facts and DB accounting snapshot. No create/cancel/compensate, no provider/money, no migrations.

## Exact files changed

- `lib/store/partialRefundReservationAccounting/accountingRead.ts` (new)
- `lib/store/partialRefundReservationAccounting/accountingRead.test.ts` (new)
- `lib/store/partialRefundReservationAccounting/capability.ts` (new)
- `lib/store/partialRefundReservationAccounting/index.ts` (new)
- `lib/store/partialRefundReservationAccounting/types.ts` (new)
- `app/actions/storePartialRefundReservationAccounting.ts` (new)
- `app/admin/store/refunds/PartialRefundAccountingReviewPanel.tsx` (new)
- `app/admin/store/refunds/page.tsx`
- `app/components/store/SellerPartialRefundReservationPanel.tsx`
- `app/seller/store/orders/[orderId]/page.tsx`
- `docs/store/implementation/PARTIAL_REFUND_RESERVATION_ACCOUNTING_AUDIT_REVIEW_V1.md` (new)
- `docs/store/implementation/PARTIAL_REFUND_RESERVATION_ACTIONS_WIRING_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/PROJECT_STATE.md`
- `docs/ai/SESSION_HANDOFF.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None.

## Security review

- Admin: `assertPlatformAdminDb`
- Seller: `getOwnedOrMemberStore` + store scope
- Read RPCs only (`getCaptureAccounting`, `listCommitted`, `getCommit`)
- No mutation RPCs; no service_role to browser
- Explicit non-events: no money/provider/create/cancel/compensate

## Tests

PASS — accounting read/UI audits; reservation wiring; ledger/path/adapter; refundOps; restock; `tsc --noEmit`

## Build

Not required.

## git diff --check

PASS

## git status --short

Clean after closeout commit/push (expected).

## Open issues

- Cancel/compensation still deferred
- Provider execution requires separate GO
- Do not claim partial-refund money execution complete
