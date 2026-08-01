# Cursor Report

## Summary

**PASS** for `commerce.revenue.commission_policy_activation_v1` on `office/commerce-commission-policy-activation-v1-current` (base `1746bc7`, cherry-pick `8b6caa0` only — not merge tip `be87fb3`).

Safe activate/deactivate lifecycle for currency-scoped commission policies: exactly one `active` policy per currency, historical `superseded` versions preserved and resolvable inside effective windows, idempotent activation events, service-role RPCs only. Bridge apply continues to resolve at capture time and store `policy_code`/`policy_version`. Migration `20260891` local only — not remote-applied.

## Completed Commerce chain (closed)

1. Category Taxonomy Seed V1
2. Seller Inventory Availability Foundation V1
3. Supplier Listing Create Hardening V1
4. Commerce Production Integration Preparation V1
5. Product Production Readiness Audit V1
6. Live Payment Production Gate V1
7. Commerce Transactional Notifications V1
8. Seller Payout Rails V1
9. Refund Operations Surface V1
10. Digital Entitlement Revoke on Refund V1
11. Commission Decomposition Bridge Apply V1 (`1746bc7`)

## Exact files changed

### Created
- `supabase/migrations/20260891_store_commission_policy_activation_v1.sql`
- `lib/store/commissionPolicyActivation.ts`
- `lib/store/commissionPolicyActivation.test.ts`
- `docs/store/implementation/COMMISSION_POLICY_ACTIVATION_V1.md`

### Modified
- `lib/store/commissionPolicyFoundation.ts` — fail-closed ambiguous actives; historical superseded window resolve
- `lib/store/commissionPolicyFoundation.test.ts`
- `docs/store/implementation/COMMISSION_POLICY_FOUNDATION_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `docs/ai/PROJECT_STATE.md`

## Migrations created

- `supabase/migrations/20260891_store_commission_policy_activation_v1.sql` — local only, not applied to remote

## Security review

- Activate/deactivate RPCs: `SECURITY DEFINER`, service_role execute only
- Activation events: FORCE RLS; client writes revoked
- Unique index enforces one active per currency
- Resolve fails closed on ambiguous actives/windows
- No client percentages; no auto-seed; no silent policy fallback
- Does not mutate settlement/payout booking amounts

## Boundaries

No AI, no Admin UI, no shipping, no store-scoped policies, no auto-seed commercial rates, no payout-net redesign, no remote apply, no push.
