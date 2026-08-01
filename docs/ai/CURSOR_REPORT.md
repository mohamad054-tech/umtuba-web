# Cursor Report

## Summary

**PASS** for **Commerce Commission Decomposition Bridge Apply V1**.

After trusted Sync `captured` + settlement `allocate`, `applyVerifiedStorePaymentOutcome` persists commission decomposition via service-role `apply_store_commission_decomposition_after_capture` (or explicit `not_configured` when no active policy). Exact party shares (platform/seller/supplier/affiliate/partner) are stored with payment/order/store/seller/supplier provenance, policy version, basis, lines, and fingerprint. Full-order refund marks the row `superseded_by_refund` without deleting history. Settlement/payout booking amounts unchanged. Migration `20260890` created locally and **not** remote-applied. Work left **uncommitted / unpushed**.

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

- Apply/mark/get RPCs: `SECURITY DEFINER`, `search_path = public`, **EXECUTE** to `service_role` only
- Events table: FORCE RLS; client write privileges revoked
- No client percentages/rates; resolve uses foundation policy registry only
- Fail closed on linkage / currency / amount / correlation / supplier-share-without-supplier
- No Stripe secrets; no settlement amount mutation; no payout execution enablement

## Tests

Focused suite: **99 passed**
- commissionDecompositionBridgeApply 9
- commissionPolicyFoundation 13
- fullOrderRefundPath 22
- digitalEntitlementGrant 6
- digitalEntitlementRevoke 7
- postCaptureSettlementAllocate 15
- postCaptureSettlementRelease 14
- refundOperations 13

## TypeScript

`npx tsc --noEmit` — **PASS**

## Build

Not required for this capability (no app UI/entry-point change).

## git diff --check

**PASS**

## git status --short

Uncommitted (see Final Verification Report).

## Open issues

- Migration not applied remotely (by design until human GO)
- No active commission policy seed — production remains `not_configured` until operators insert an active policy
- Affiliate/partner entity graphs still unsupported (amounts only)
- Seller payout booking remains full RELEASED capture (commission-aware nets are a future milestone)
- Partial refunds remain out of scope
