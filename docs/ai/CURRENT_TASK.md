# Current Task

## Milestone

Commerce Partial Refund Reservation Server Actions & Admin/Seller Wiring V1 — **CLOSED**

## Status

**`PARTIAL_REFUND_RESERVATION_ACTIONS_WIRING_V1_CLOSED`**

Reservation-only server actions + admin/seller wiring closed and pushed.

- Migrations `20260899`/`20260900` remotely applied (unchanged; tip `20260900`)
- Service-role adapter + reservation orchestration closed (prior)
- Admin may request durable ledger reservation (trusted facts; no client money)
- Seller may **read** reservations only (`ownsSellerReservationRequest=false`)
- No provider refund, money movement, restock, entitlement, settlement, commission, payout, compensation
- No buyer/public execution
- Provider execution requires a later separate GO

## Branch / worktree

- Worktree: `C:\Users\1\Desktop\umtuba\umtuba-web-commerce-partial-refund-reservation-actions-wiring-v1`
- Branch: `office/commerce-partial-refund-reservation-actions-wiring-v1`
- Base: `6a2420e829280aa951f4f87150c820d6b6c45e04`

## Forbidden without new GO

Provider/Sync refund · money movement · seller reservation request · buyer/public · restock/entitlement/settlement/commission · compensation · payout/Manual Ops · commerce_confirm · migrations · merge

## Doc

`docs/store/implementation/PARTIAL_REFUND_RESERVATION_ACTIONS_WIRING_V1.md`
