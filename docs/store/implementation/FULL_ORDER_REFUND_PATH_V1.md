# Full Order Refund Path V1

Capability: `commerce.payments.full_order_refund_path_v1`  
Status: implemented locally (no new migration)

Depends on:

- Payment Outcome Sync V1 (`apply_store_payment_outcome`, outcome=`refunded`)
- Settlement Foundation V1 (`hold`, `reverse_allocation`)
- Seller Payout Foundation V1 (blocks settlement while payout `IN_TRANSIT`/`COMPLETED`; blocks payout after refund)
- Payout Booking Ops Helpers V1 (compatible; refunded funds cannot submit)
- Commission Policy Foundation V1 (optional consistency projection; no settlement amount mutation)
- Digital entitlement grant (unchanged — revoke-on-refund is a separate milestone)

## Purpose

Trusted **service-side** orchestration for **full-order** refunds:

1. Validate refundable paid + captured attempt (exact store ownership)
2. Reject when seller payout is `IN_TRANSIT` or `COMPLETED`
3. Unwind settlement so Sync refund is allowed:
   - `RELEASED` → `hold` → `reverse_allocation` → `REVERSED`
   - `ALLOCATED` / `HELD` → `reverse_allocation` → `REVERSED`
   - `UNALLOCATED` / already `REVERSED` → Sync only
4. Apply Sync `refunded` for the **full** trusted capture amount/currency

## Module

`lib/store/fullOrderRefundPath.ts`

| Export | Role |
| --- | --- |
| `planFullOrderRefund` | Pure planner over trusted facts |
| `loadTrustedFullOrderRefundContext` | Load attempt/order/capture/settlement/payout facts |
| `applyFullOrderRefund` | Orchestrate settlement unwind + Sync refund |

## Guarantees

- Full refund only (amount = trusted capture; no partials)
- No client-supplied totals / commissions / rails
- Exact store ↔ payment-attempt ownership
- Currency must match across attempt, order, capture (optional `expectedCurrency`)
- Duplicate Sync `idempotencyKey` replays; conflicting key fails closed
- Already-refunded attempts fail closed (or replay on exact key)
- Seller payable reversed via hold+reverse when released
- Payout of refunded funds prevented by existing foundation guards
- Immutable append-only financial events (no rewrite/delete)
- Fail closed on malformed IDs, unauthorized store, inconsistent ledger, settlement unwind failure

## Out of scope

- Partial refunds
- Bank/PSP refund rail adapters (caller supplies trusted Sync key after provider confirmation)
- Payout clawback from `COMPLETED`
- Digital entitlement revoke
- Dashboard / Admin UI / AI

## Compatibility

Does not alter Settlement / Payout / Commission / Read-model contracts. Uses existing RPCs only.
