# Commerce Commission Decomposition Bridge Apply V1

Capability: `commerce.revenue.commission_decomposition_bridge_apply_v1`  
Branch: `office/commerce-commission-decomposition-bridge-apply-v1`  
Migration: `20260890_store_commission_decomposition_bridge_apply_v1.sql` (in repository; **not** remote-applied until separate GO)
Apply readiness: `COMMERCE_CHAIN_MIGRATION_APPLY_READINESS_V1.md` (order `20260889 → 20260890 → 20260891`)

Depends on:

- Commission Policy Foundation V1 (`resolve_store_commission_policy`, `compute_store_commission_split`)
- Payment Outcome Sync V1 (trusted `captured` / `refunded`)
- Settlement Foundation V1 (requires prior `allocate`)
- Full Order Refund Path V1 (marks decomposition superseded after refund)

## Purpose

Persist the authoritative commission decomposition into the Commerce transaction lifecycle after trusted capture + settlement allocate, so payout and refund operations can reference exact party shares without inventing merchant nets.

## Lifecycle

1. Trusted Stripe return/webhook verifies session + PaymentIntent.
2. Sync applies `captured`.
3. Settlement `allocate` succeeds.
4. `apply_store_commission_decomposition_after_capture` resolves policy (or records `not_configured`), computes split with foundation rounding, and persists one immutable event per payment attempt / capture.
5. Entitlement grant + settlement release continue unchanged (commission does **not** gate release).
6. On full-order refund success/replay, `mark_store_commission_decomposition_after_refund` sets `lifecycle_status=superseded_by_refund` without deleting historical amounts.

## Party roles (supported)

`platform` · `seller` · `supplier` · `affiliate` · `partner`

- **No `marketer`** role exists in repository contracts.
- Affiliate / partner amounts may persist with null entity FKs (no affiliate graph in V1).
- Supplier share with `supplier_bps > 0` requires at least one `order_items.supplier_store_id` (fail closed).

## Guarantees

- Apply only after trusted capture + prior settlement allocate
- Floor division; remainder to seller (foundation SSOT)
- Party amount sum must equal `basis_minor`
- `grand_total` basis must equal trusted capture amount
- Idempotent event key: `${captureEventKey}:commission`
- Unique per `payment_attempt_id` and `capture_event_id`
- Missing active policy → explicit `not_configured` (no invented share)
- Wrong buyer/currency/amount/correlation/seller linkage → fail closed
- Historical rows preserved; refund only supersedes lifecycle status
- Settlement / payout booking amounts unchanged (`commissionDoesNotEnablePayoutExecution`)

## Module

| Layer | Path |
| --- | --- |
| Apply RPC | `apply_store_commission_decomposition_after_capture` |
| Refund mark RPC | `mark_store_commission_decomposition_after_refund` |
| Read RPC | `get_store_commission_decomposition_for_attempt` |
| TS | `lib/store/commissionDecompositionBridgeApply.ts` |
| Capture wire-in | `applyVerifiedStorePaymentOutcome` |
| Refund wire-in | `applyFullOrderRefund` |

## Out of scope

Partial refunds, commission-aware payout nets, bank rails, Dashboard/Admin UI, inventing marketer/affiliate entity graphs, changing settlement posting amounts, Learning/AI/Home/Creator/Navigation.
