# Cursor Report

**PASS (staged, uncommitted)** — Commerce Digital Entitlement Revoke on Refund V1 (v1b)

## Base

- SoT: `origin/office/unified-integration-verification-v1` @ `9cd20a28c01c8f8d6a5adbb3e85b2ea38c80a721`
- Branch: `office/commerce-digital-entitlement-revoke-on-refund-v1b`
- Worktree: `C:\Users\Admin\Desktop\umtuba\umtuba-web-commerce-digital-entitlement-revoke-on-refund-v1b`
- Decision: **port/cherry-pick** `306a023` (docs conflicts resolved; no commit)

## Summary

After trusted Sync `refunded` (success + idempotent replay), `applyFullOrderRefund` calls service-role `revoke_store_digital_entitlements_after_refund`, setting active digital entitlements to `revoked` (with `revoked_at`). Idempotent via `store_digital_entitlement_revoke_events`. Fail closed if any active entitlement remains or revoke hard-errors. Migration `20260889` local only — not remote-applied.

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
- Docs handoff (`CURRENT_TASK` / `CURSOR_REPORT` / `PROJECT_STATE`)

## Verification

- Focused vitest: **42 passed** (revoke 7 + fullOrderRefundPath 22 + refundOperations 13)
- `npx tsc --noEmit`: **PASS**
- `npm run build`: **PASS**
- `git diff --cached --check`: **PASS**
- `npm ci`: local only; `package.json` / `package-lock.json` unchanged

## Open

Await commit/push GO. Migration not remote-applied.
