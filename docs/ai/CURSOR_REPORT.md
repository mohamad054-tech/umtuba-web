# Cursor Report

## Summary

**PASS** for `commerce.revenue.commission_decomposition_bridge_apply_v1` on `office/commerce-commission-decomposition-bridge-apply-v1-current` (base `0ccdb63`, cherry-pick `7d90a05`).

After trusted Sync `captured` + settlement `allocate`, `applyVerifiedStorePaymentOutcome` persists commission decomposition via `apply_store_commission_decomposition_after_capture` (or explicit `not_configured` when no active policy). Full-order refund marks the row `superseded_by_refund` without deleting history. Settlement/payout booking amounts unchanged. Migration `20260890` local only — not remote-applied.

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
10. Digital Entitlement Revoke on Refund V1 (`0ccdb63`)

## Exact files changed

### Created
- `supabase/migrations/20260890_store_commission_decomposition_bridge_apply_v1.sql`
- `lib/store/commissionDecompositionBridgeApply.ts`
- `lib/store/commissionDecompositionBridgeApply.test.ts`
- `docs/store/implementation/COMMISSION_DECOMPOSITION_BRIDGE_APPLY_V1.md`

### Modified
- `lib/store/stripePaymentOutcomeApply.ts` — apply after allocate
- `lib/store/fullOrderRefundPath.ts` — refund supersede mark
- `lib/store/fullOrderRefundPath.test.ts`
- `lib/store/digitalEntitlementGrant.test.ts`
- `lib/store/digitalEntitlementRevoke.test.ts`
- `lib/store/postCaptureSettlementAllocate.test.ts`
- `lib/store/postCaptureSettlementRelease.test.ts`
- `lib/store/refundOperations/refundOperations.test.ts`
- `docs/store/implementation/COMMISSION_POLICY_FOUNDATION_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `docs/ai/PROJECT_STATE.md`

## Migrations created

- `supabase/migrations/20260890_store_commission_decomposition_bridge_apply_v1.sql` — local only, not applied to remote

## Security review

- Apply/mark/get RPCs: `SECURITY DEFINER`, service_role execute only
- Events table: FORCE RLS; client write privileges revoked
- No client percentages/rates; foundation policy registry only
- Fail closed on linkage / currency / amount / correlation / supplier-share-without-supplier
- No Stripe secrets; no settlement amount mutation; no payout execution enablement

## Boundaries

No AI, no Admin UI, no shipping, no invented shares, no payout-net redesign, no remote apply, no push.
