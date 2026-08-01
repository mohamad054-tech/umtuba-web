# Current Task

## Task title

UMTUBA Commerce — Digital Entitlement Revoke on Refund V1

## Status

`pass` — cherry-pick of `306a023` onto `a933624` (no push / no remote migration)

## Capability

`commerce.digital.entitlement_revoke_on_refund_v1`

## Branch / tip

- Branch: `office/commerce-digital-entitlement-revoke-on-refund-v1-current`
- Base (closed tip): `a933624` (Refund Operations Surface V1)
- Milestone: cherry-pick of `306a023` (feat(commerce): revoke digital entitlements after refund v1)

## Worktree

`C:\Users\1\Desktop\umtuba\umtuba-web-commerce-digital-entitlement-revoke-on-refund-v1-current`

## Completed Commerce chain (closed)

1. Category Taxonomy Seed V1
2. Seller Inventory Availability Foundation V1 (`29f0f6b`)
3. Supplier Listing Create Hardening V1
4. Commerce Production Integration Preparation V1
5. Product Production Readiness Audit V1
6. Live Payment Production Gate V1
7. Commerce Transactional Notifications V1
8. Seller Payout Rails V1
9. Refund Operations Surface V1 (`a933624`)

## Coordination

- **Desktop** owns: AI / Dashboard — do not touch
- **Laptop** = Commerce digital entitlement revoke-on-refund only
- Do **not** touch commission / payout rails / Stripe payment config / Admin UI

## Delivered

- TS SSOT `lib/store/digitalEntitlementRevoke.ts` (+ tests)
- SQL RPC `revoke_store_digital_entitlements_after_refund` + revoke events
- Wired into `applyFullOrderRefund` (success + Sync replay)
- Migration `20260889` local only
- Docs: `DIGITAL_ENTITLEMENT_REVOKE_ON_REFUND_V1.md`

## Explicit non-actions

No push · no remote migration · no partial/line revoke · no Stripe refund adapter · no commission/payout/wallet/shipping · no Admin UI · no AI

## Next

Human GO to push when ready. Apply `20260889` only under separate ops GO.
