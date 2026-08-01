# Current Task

## Task title

UMTUBA Commerce — Commission Decomposition Bridge Apply V1

## Status

`pass` — cherry-pick of `7d90a05` onto `0ccdb63` (no push / no remote migration)

## Capability

`commerce.revenue.commission_decomposition_bridge_apply_v1`

## Branch / tip

- Branch: `office/commerce-commission-decomposition-bridge-apply-v1-current`
- Base (closed tip): `0ccdb63` (Digital Entitlement Revoke on Refund V1)
- Milestone: cherry-pick of `7d90a05` (feat(commerce): apply commission decomposition bridge v1)

## Worktree

`C:\Users\1\Desktop\umtuba\umtuba-web-commerce-commission-decomposition-bridge-apply-v1-current`

## Completed Commerce chain (closed)

1. Category Taxonomy Seed V1
2. Seller Inventory Availability Foundation V1 (`29f0f6b`)
3. Supplier Listing Create Hardening V1
4. Commerce Production Integration Preparation V1
5. Product Production Readiness Audit V1
6. Live Payment Production Gate V1
7. Commerce Transactional Notifications V1
8. Seller Payout Rails V1
9. Refund Operations Surface V1
10. Digital Entitlement Revoke on Refund V1 (`0ccdb63`)

## Coordination

- **Desktop** owns: AI / Dashboard — do not touch
- **Laptop** = Commerce commission decomposition bridge apply only
- Do **not** touch payout-net redesign / Admin UI / shipping

## Delivered

- TS SSOT `lib/store/commissionDecompositionBridgeApply.ts` (+ tests)
- RPCs: apply after capture, mark after refund, get for attempt
- Wired into `applyVerifiedStorePaymentOutcome` + `applyFullOrderRefund`
- Migration `20260890` local only
- Docs: `COMMISSION_DECOMPOSITION_BRIDGE_APPLY_V1.md`

## Explicit non-actions

No push · no remote migration · no invented shares · no partial refund · no payout-net redesign · no bank rails · no Admin UI · no settlement amount mutation · no AI

## Next

Human GO to push when ready. Apply `20260890` only under separate ops GO.
