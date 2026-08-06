# Commerce Partial Refund Reservation Server Actions & Admin/Seller Wiring V1

Capability: `commerce.payments.partial_refund_reservation_actions_wiring_v1`  
Module: `lib/store/partialRefundReservation/` + `app/actions/storePartialRefundReservation.ts`  
Version: `commerce-partial-refund-reservation-actions-wiring-v1`

## Status

**CLOSED** (`PARTIAL_REFUND_RESERVATION_ACTIONS_WIRING_V1_CLOSED`).

Do not claim money execution complete.

Migrations `20260899` and `20260900` are **remotely applied** (tip `20260900`) and were **not** created or re-applied here.  
Service-role adapter and reservation orchestration are **closed** (prior milestone).  
This milestone adds **reservation-only server actions** and **safe admin/seller wiring**.

## Semantic boundary

A successful action means a **durable ledger reservation only**.

It does **not** mean:

- provider refund executed
- money moved
- capture/provider marked refunded
- stock restocked
- entitlement adjusted
- settlement or commission unwound
- payout changed
- compensation completed
- buyer/public execution enabled

## Ownership

| Flag | Value |
| --- | --- |
| trustedFactLoading | **true** |
| adminReservationAction | **true** |
| sellerReservationRead | **true** |
| sellerReservationRequest | **false** (seller refund-ops policy is read-only / `canExecuteMoneyRefund: false`) |
| reservationStatusUi | **true** |
| providerRefundExecution | **false** |
| moneyMovement | **false** |
| fullOrderRefundExecution | **false** (untouched) |
| partialRestock | **false** |
| partialEntitlement | **false** |
| partialSettlement | **false** |
| partialCommission | **false** |
| compensation | **false** |
| buyerPublicExecution | **false** |

## Trusted fact sources (server-only)

| Fact | Source |
| --- | --- |
| store / order linkage | `orders.store_id` |
| payment attempt | `payment_attempts` |
| capture | `store_payment_outcome_events` where `outcome='captured'` |
| order lines / qty / unit price | `order_items` |
| currency / amount ceilings | attempt + order + capture agreement |

Client may supply **identity + quantities only**. Client amount/currency/price/totals/status are rejected.

## Authorization

- **Admin request:** `assertPlatformAdminDb` (platform admin).
- **Seller read:** `getOwnedOrMemberStore` + order/store scope; list only.
- **Seller request:** **not implemented** (fail closed — existing policy forbids seller money execution).
- **Buyer/public:** none.

## Idempotency

- Optional admin-supplied key (8–128 chars), else server-derived `prf-res-v1:{hash(capture+sorted intents)}`.
- Conflicting key + different calculation fingerprint → `idempotency_conflict`.
- Orchestrator replay with matching fingerprint → `reservation_replayed`.

## Result statuses

`reservation_committed` · `reservation_replayed` · `validation_failed` · `stale_version` · `idempotency_conflict` · `unauthorized` · `not_found` · `unsupported`

Success always includes: `reservationCommitted=true` and all money/provider/restock/entitlement/settlement/commission/compensation flags **false**.

## Surfaces

- Admin: `/admin/store/refunds` — “Partial refund ledger reservation” panel (qty selection, no money input).
- Seller: order detail — read-only reservation status panel.
- Full-order refund execute buttons remain separate and unchanged.

## Deferred (separate GO)

- Provider / Sync refund execution
- Seller reservation initiation (only if policy is explicitly changed)
- Buyer/public initiation
- Partial restock / entitlement / settlement / commission / compensation
- `commerce_confirm`

Accounting audit/review (read-only): see `PARTIAL_REFUND_RESERVATION_ACCOUNTING_AUDIT_REVIEW_V1.md`.

## Related

- Adapter: `PARTIAL_REFUND_LEDGER_SERVICE_ADAPTER_V1.md`
- Schema/RPC: `PARTIAL_REFUND_LEDGER_COMMIT_BOUNDARY_V1.md`, `PARTIAL_REFUND_LEDGER_RPC_REMOTE_APPLY_READINESS_V1.md`
- Calculation: `PARTIAL_REFUND_PATH_V1.md`
