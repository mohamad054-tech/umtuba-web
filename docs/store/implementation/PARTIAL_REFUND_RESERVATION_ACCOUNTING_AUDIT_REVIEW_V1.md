# Commerce Partial Refund Reservation Accounting Audit & Review Surface V1

Capability: `commerce.payments.partial_refund_reservation_accounting_audit_review_v1`  
Module: `lib/store/partialRefundReservationAccounting/`  
Version: `commerce-partial-refund-reservation-accounting-audit-review-v1`

## Status

**CLOSED** (`PARTIAL_REFUND_ACCOUNTING_AUDIT_REVIEW_V1_CLOSED`).

Do not claim money execution complete.

Migrations `20260899` / `20260900` remain remotely applied (tip `20260900`); unchanged here.  
Reservation create wiring remains closed from the prior milestone and is **untouched** by this audit surface.

## Purpose

Read-only capture accounting + committed reservation review for admin and seller.

## Semantic boundary

Displayed amounts are **ledger reservation accounting only**.

They do **not** mean:

- provider refund executed
- money moved
- reservation cancelled or compensated
- restock / entitlement / settlement / commission / payout changes

## Ownership

| Flag | Value |
| --- | --- |
| captureAccountingRead | **true** |
| committedReservationRead | **true** |
| adminAccountingReviewUi | **true** |
| sellerAccountingReviewRead | **true** (order totals already shown on seller refund-ops) |
| commitDetailRead | **true** |
| reservationCreateInThisMilestone | **false** |
| reservationCancel | **false** |
| reservationCompensation | **false** |
| providerRefundExecution | **false** |
| moneyMovement | **false** |
| sellerReservationRequest | **false** |
| buyerPublicRead / buyerPublicExecution | **false** |
| partialRestock / entitlement / settlement / commission | **false** |
| payoutInteraction / commerceConfirmActivation | **false** |

## Trusted derivation

| Field | Source |
| --- | --- |
| capture amount / currency | Trusted capture facts (attempt + order + captured outcome) |
| committed reservation amount / qty | DB capture-accounting snapshot (`getCaptureAccounting`) |
| remaining amount | `capture − committed` (fail closed if negative or inconsistent) |
| remaining qty | `purchased − committed reserved` per line |
| accounting version | DB snapshot (read-only metadata; `0` if no row yet) |
| history | `listCommittedForCapture` only |

## Surfaces

- Admin: `/admin/store/refunds` — “Partial refund reservation accounting” panel (separate from create panel).
- Seller: order detail — accounting summary + reservation history (read-only).

## Deferred

Provider execution · cancel/compensation · seller request · buyer/public · restock/entitlement/settlement/commission · payout · `commerce_confirm`
