# Payout Booking Ops Helpers V1

Capability: `commerce.settlement.payout_booking_ops_helpers_v1`  
Status: implemented locally (no new migration)

Depends on:

- Seller Payout Foundation V1 (`20260881`, `apply_store_payout_event`)
- Seller Payout Read Model V1
- Settlement ↔ Payout Reconciliation Read V1
- Commission Policy Foundation V1 (unchanged; no money mutation)

## Purpose

Trusted **service-side** helpers for payout booking lifecycle operations after settlement `RELEASED`:

| Helper | Foundation action | Transition |
| --- | --- | --- |
| `submitPayoutBooking` | `submit` | `NONE` → `IN_TRANSIT` (reserve payable) |
| `failPayoutBooking` | `fail` | `IN_TRANSIT` → `NONE` (release reservation) |
| `confirmPayoutBooking` | `confirm` | `IN_TRANSIT` → `COMPLETED` (custody exit) |

Money movement remains **DB-authoritative** via existing `apply_store_payout_event`. No bank/provider rail. No Dashboard / Admin / seller write UI.

## Module

`lib/store/payoutBookingOpsHelpers.ts`

## Guarantees

- Authenticated trusted **service_role** boundary (foundation RPC grant unchanged)
- Exact `storeId` ↔ payment-attempt ownership validation before write
- **No client-supplied** amounts, commissions, balances, rails, or posting lines
- Amount / currency / correlation loaded from trusted capture + attempt + order
- Currency must match across attempt, order, and capture (optional `expectedCurrency` assertion)
- Only `RELEASED`, non-refunded, non-disputed, non-reversed funds may move
- Concurrent submit cannot double-reserve (foundation unique active in-transit + advisory locks)
- Duplicate `idempotencyKey` returns original result (`replayed: true`) or fails closed on fingerprint conflict
- Fail and confirm are mutually exclusive terminals from `IN_TRANSIT`
- `COMPLETED` permanently blocks fail / re-confirm / re-submit
- After fail (`NONE`), a **new** submit with a new idempotency key may retry
- Immutable audit history preserved (append-only `store_payout_events`)
- Fail closed on malformed IDs, stale states, unauthorized store, missing capture/settlement, currency mismatch, refund/dispute/reverse flags, inconsistent ledger data

## Compatibility

Does not alter:

- Seller Payout Foundation contracts or state vocabulary (`NONE` / `IN_TRANSIT` / `COMPLETED`)
- Seller Payout Read Model RPCs
- Settlement ↔ Payout Reconciliation issue vocabulary
- Commission Policy Foundation
- Refund / dispute / reversal guards already enforced by foundation + settlement

Each successful helper result includes a pure `reconciliation` projection via `reconcileSettlementPayoutCapture`.

## Out of scope

- Bank / PSP / connected-account payout rails
- Dashboard / Admin UI / seller payout buttons
- New migrations (reuse `20260881`)
- Partial amounts / multi-capture batches
- AI / Usage / Quotas / Billing
