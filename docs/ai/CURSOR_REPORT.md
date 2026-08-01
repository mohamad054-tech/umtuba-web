# Cursor Report

## Summary

**PASS** for **Commerce Digital Entitlement Revoke on Refund V1**.

After trusted Sync `refunded` (success + idempotent replay), `applyFullOrderRefund` now calls service-role `revoke_store_digital_entitlements_after_refund`, setting active digital entitlements to `revoked` (with `revoked_at`). Idempotent via `store_digital_entitlement_revoke_events`. Fail closed if any active entitlement remains or revoke hard-errors. Delivery mint/list already reject non-`active`. Migration `20260889` created locally and **not** remote-applied. Work left **uncommitted / unpushed**.

## Exact files changed

### Created
- `supabase/migrations/20260889_store_digital_entitlement_revoke_on_refund_v1.sql`
- `lib/store/digitalEntitlementRevoke.ts`
- `lib/store/digitalEntitlementRevoke.test.ts`
- `docs/store/implementation/DIGITAL_ENTITLEMENT_REVOKE_ON_REFUND_V1.md`

### Modified
- `lib/store/fullOrderRefundPath.ts` — wire revoke after Sync refund (success + replay)
- `lib/store/fullOrderRefundPath.test.ts` — assert revoke RPC ordering / fail-closed
- `lib/store/refundOperations/refundOperations.test.ts` — mock includes `entitlementRevoke`
- `docs/store/implementation/FULL_ORDER_REFUND_PATH_V1.md` — document revoke step
- `docs/ai/CURRENT_TASK.md` — active handoff for this capability
- `docs/ai/CURSOR_REPORT.md` — this report

## Migrations created

- `supabase/migrations/20260889_store_digital_entitlement_revoke_on_refund_v1.sql` — local only, not applied to remote

## Security review

- Revoke RPC: `SECURITY DEFINER`, `search_path = public`, **EXECUTE** granted to `service_role` only; revoked from `public`/`anon`/`authenticated`
- Revoke-events table: FORCE RLS; all privileges revoked from clients
- Entitlement table: buyers still SELECT-only; no authenticated UPDATE path
- Revoke requires trusted `refunded` outcome + matching correlation_id
- Fail closed if active entitlements remain after update/replay
- No Stripe secrets, no client money fields, no partial refund

## Tests

Focused suite: **42 passed**
- `digitalEntitlementRevoke` 7
- `fullOrderRefundPath` 22
- `refundOperations` 13

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
- If Sync refund commits and revoke hard-fails, money is already refunded; retry via same Sync idempotency key heals revoke on the replay path
- Stripe PSP refund rail still out of scope
