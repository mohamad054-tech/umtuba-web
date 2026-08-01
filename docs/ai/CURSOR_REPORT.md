# Cursor Report

## Summary

**PASS** for **Commerce Commission Policy Activation V1**.

Adds safe activate/deactivate lifecycle for currency-scoped commission policies: exactly one `active` policy per currency (unique index + fail-closed resolve), historical `superseded` versions preserved and still resolvable inside their effective windows, idempotent activation events, service-role RPCs only. Capture/decomposition continue to resolve at transaction time and permanently store `policy_code`/`policy_version`; refunds reference historical applied decomposition. Migration `20260891` created locally and **not** remote-applied. Work left **uncommitted / unpushed**.

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

## Tests

Focused suite: **110 passed** (activation 8 + foundation 13 + decomposition 9 + refund path 22 + refund ops 13 + entitlement revoke 7 + allocate 15 + revenue bridge 23)

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
- No active commercial policy seed — operators insert `draft` then activate
- Store-scoped policies still out of scope
- Payout booking still full RELEASED capture (commission-aware nets are a future milestone)
