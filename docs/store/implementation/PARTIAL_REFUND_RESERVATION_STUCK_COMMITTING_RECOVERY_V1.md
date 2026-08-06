# Commerce Partial Refund Reservation Stuck-Committing Recovery V1

Capability: `commerce.payments.partial_refund_reservation_stuck_committing_recovery_v1`  
Module: `lib/store/partialRefundStuckCommittingRecovery/`  
Version: `commerce-partial-refund-reservation-stuck-committing-recovery-v1`

## Status

**CLOSED** — `PARTIAL_REFUND_STUCK_COMMITTING_RECOVERY_V1_CLOSED` @ tip `8e16c8c108d418457ccdcbeb2ed542cca4d30472`.

Migrations `20260899` / `20260900` remain remotely applied (tip `20260900`); unchanged by recovery.

## Purpose

Admin-only recovery for stuck in-flight ledger rows:

`committing → failed`

This releases the capture-scoped committing lock only.

## Semantic boundary

Recovery does **not**:

- cancel or compensate a **committed** reservation
- refund money
- call a provider
- restock / entitlement / settlement / commission / payout

## Ownership

| Flag | Value |
| --- | --- |
| adminStuckCommittingRecovery | **true** |
| committingToFailedTransition | **true** |
| inFlightLockRelease | **true** |
| recoveryAuditResult | **true** |
| committedReservationCancellation | **false** |
| committedReservationCompensation | **false** |
| providerRefundExecution | **false** |
| moneyMovement | **false** |
| sellerRecovery / buyerPublicRecovery | **false** |

## Contract

1. Platform admin required
2. Load commit by ledger id (`getCommit`)
3. Optional `expectedStoreId` scope check
4. Status must be exactly `committing`
5. Call existing fail RPC / `failPartialRefundLedgerCommit`
6. Optional operator reason (3–500 chars; sanitized; cannot claim money/compensation)

Reject: `planned`, `committed`, `failed` (`already_failed`), unknown, unauthorized, malformed.

## Deferred

Committed compensation/cancel · provider money execution · seller/buyer recovery · restock/entitlement/settlement/commission · payout · `commerce_confirm`
