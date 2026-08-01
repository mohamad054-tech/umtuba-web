# Current Task

## Task title

UMTUBA Commerce — Commission Policy Activation V1

## Status

`pass` — cherry-pick of `8b6caa0` onto `1746bc7` (no push / no remote migration)

## Capability

`commerce.revenue.commission_policy_activation_v1`

## Branch / tip

- Branch: `office/commerce-commission-policy-activation-v1-current`
- Base (closed tip): `1746bc7` (Commission Decomposition Bridge Apply V1)
- Milestone: cherry-pick of `8b6caa0` only (not merge tip `be87fb3`)

## Worktree

`C:\Users\1\Desktop\umtuba\umtuba-web-commerce-commission-policy-activation-v1-current`

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
10. Digital Entitlement Revoke on Refund V1
11. Commission Decomposition Bridge Apply V1 (`1746bc7`)

## Coordination

- **Desktop** owns: AI / Dashboard — do not touch
- **Laptop** = Commerce commission policy activation only
- Do **not** touch payout-net redesign / Admin UI / store-scoped policies / shipping

## Delivered

- TS SSOT `lib/store/commissionPolicyActivation.ts` (+ tests)
- RPCs: activate/deactivate + activation events
- Foundation resolve: one active per currency; historical superseded windows
- Migration `20260891` local only
- Docs: `COMMISSION_POLICY_ACTIVATION_V1.md`

## Explicit non-actions

No push · no remote migration · no auto-seed commercial rates · no store-specific policies · no Admin UI · no payout-net redesign · no merge tip `be87fb3` · no AI

## Next

Human GO to push when ready. Apply `20260891` only under separate ops GO.
