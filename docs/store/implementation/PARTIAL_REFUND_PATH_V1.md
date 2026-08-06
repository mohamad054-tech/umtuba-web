# Commerce Partial Refund Path V1 — Foundation

Capability: `commerce.payments.partial_refund_path_v1`  
Module: `lib/store/partialRefundPath/`  
Version: `commerce-partial-refund-path-foundation-v1`

## Status

**CLOSED** as calculation / validation foundation only (`PARTIAL_REFUND_FOUNDATION_V1_CLOSED`).

## Purpose

Fail-closed, server-trusted **calculation / validation** foundation for partial refunds.

This milestone does **not** and **cannot yet** commit a partial refund durably. No production or live refund occurred. No money movement, Stripe call, restock, entitlement revoke, or settlement/commission unwind is owned here.

A future **runtime / commit** phase requires a **separate design and explicit GO**.

## Ownership (explicit)

| Flag | Value |
| --- | --- |
| `ownsPartialRefundCalculation` | **true** |
| `ownsPartialRefundCommit` | **false** |
| `ownsPartialRefundRestock` | **false** |
| `ownsPartialEntitlementAdjustment` | **false** |
| `ownsPartialSettlementUnwind` | **false** |
| `ownsPartialCommissionUnwind` | **false** |

Full-order money commit remains `applyFullOrderRefund` / Refund Operations Surface execute.

## Trusted inputs

- Capture: `captureAmountMinor`, `currency`, attempt/capture/order/store ids
- Lines: `orderItemId`, `purchasedQuantity`, `unitPriceMinor`, `totalPriceMinor` (= unit × qty), `currency`
- Prior accounting: `priorRefundedAmountMinor` + per-line `priorRefundedQuantityByLineId`
- Intent: **line ids + requested quantities only** (no client money)

## Amount formula

`refundAmountMinor = unitPriceMinor × requestedQuantity` (integer, deterministic)

Rejects: zero/negative/malformed qty, unknown/duplicate lines, over-qty, over-refund vs remaining capture, currency mismatch, inconsistent line math, inconsistent prior accounting.

## Compatibility

- Existing full-order refund path unchanged
- Selecting all remaining quantities with merchandise-equal capture yields `isFullRemainingCaptureRefund`
- Does **not** require `commerce_confirm` or live Stripe

## Deferred blockers (runtime commit GO required)

These remain **unsupported** until designed and authorized separately:

- Durable per-line refund ledger + concurrency-safe commit RPC (**blocker**)
- Non-invented partial settlement / commission unwind semantics (**blocker**)
- Sync / provider partial refund execution
- Partial restock (foundation still forbids `partial_refund` commitment)
- Partial entitlement reduction

Do **not** begin the runtime milestone from this closeout without a new GO.

## Migration

**None** created. Pure TypeScript foundation; durable prior-refund accounting for commit is a future GO.

## Tests

`lib/store/partialRefundPath/partialRefundPath.test.ts`
