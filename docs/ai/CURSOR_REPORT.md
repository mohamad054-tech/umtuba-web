# Cursor Report

## Summary

**PASS** for `commerce.digital.entitlement_revoke_on_refund_v1` on `office/commerce-digital-entitlement-revoke-on-refund-v1-current` (base `a933624`, cherry-pick `306a023`).

After trusted Sync `refunded` (success + idempotent replay), `applyFullOrderRefund` calls service-role `revoke_store_digital_entitlements_after_refund`, setting active digital entitlements to `revoked`. Idempotent via `store_digital_entitlement_revoke_events`. Fail closed if any active entitlement remains or revoke hard-errors. Migration `20260889` local only — not remote-applied.

## Completed Commerce chain (closed)

1. Category Taxonomy Seed V1
2. Seller Inventory Availability Foundation V1
3. Supplier Listing Create Hardening V1
4. Commerce Production Integration Preparation V1
5. Product Production Readiness Audit V1
6. Live Payment Production Gate V1
7. Commerce Transactional Notifications V1
8. Seller Payout Rails V1
9. Refund Operations Surface V1 (`a933624`)

## Exact files changed

### Created
- `supabase/migrations/20260889_store_digital_entitlement_revoke_on_refund_v1.sql`
- `lib/store/digitalEntitlementRevoke.ts`
- `lib/store/digitalEntitlementRevoke.test.ts`
- `docs/store/implementation/DIGITAL_ENTITLEMENT_REVOKE_ON_REFUND_V1.md`

### Modified
- `lib/store/fullOrderRefundPath.ts` — wire revoke after Sync refund (success + replay)
- `lib/store/fullOrderRefundPath.test.ts`
- `lib/store/refundOperations/refundOperations.test.ts`
- `docs/store/implementation/FULL_ORDER_REFUND_PATH_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `docs/ai/PROJECT_STATE.md`

## Migrations created

- `supabase/migrations/20260889_store_digital_entitlement_revoke_on_refund_v1.sql` — local only, not applied to remote

## Security review

- Revoke RPC: `SECURITY DEFINER`, service_role execute only
- Revoke-events table: FORCE RLS; client privileges revoked
- Revoke requires trusted `refunded` outcome + matching correlation_id
- Fail closed if active entitlements remain after update/replay
- No Stripe secrets, no client money fields, no partial refund/revoke

## Boundaries

No AI, no Admin UI, no shipping, no commission/payout invention, no remote apply, no push.
