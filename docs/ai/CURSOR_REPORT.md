# CURSOR_REPORT — Store + Learning Pre-Company Foundation V2

```text
SOURCE_DEVICE = CENTRAL / WIN-MJRKAKK2MEH
DEVICE_ROLE = SOURCE_AUTHORITY
TASK_ID = STORE_LEARNING_PRECOMPANY_FOUNDATION_V2
REPORT_TYPE = IMPLEMENTATION
TIMESTAMP_LOCAL = 2026-08-18 ~12:00 +03
SECRET_VALUES_PRINTED = NO
FORCE_PUSH = NO
PUSH = NO
PRODUCTION_MUTATED = NO
SECRETS_EXPOSED = NO
REMOTE_MIGRATION_APPLIED = NO
ALPHA_MERGE = NO
MOBILE_RELEASE_TRAIN_DISTURBED = NO
REAL_PRODUCTS_IMPORTED = 0
REAL_PARTNER_COURSES_IMPORTED = 0
PARTNERSHIPS_CLAIMED = 0
OUTREACH_SENT = 0
```

## Summary

Provider-neutral Store + Learning foundation on `origin/alpha-0.2` (`198d2224`) via worktree `central/store-learning-precompany-foundation-v2`. Extends the existing seller/learning catalogs with a staging import + rights/provenance layer. MOCK only. Unknown rights DENY. REAL_PARTNER_DATA cannot become ACTIVE. No plaintext credentials. No real payouts/tax. Mobile release train untouched.

## Exact files changed

- `lib/store/providers/*` — registry, adapter modes, rights, provenance, import, checkout routing, mock fixtures/E2E
- `lib/learning/providers/*` — provider types, course import, rights, AI/certificate/hosting gates, mock fixtures/E2E
- `lib/learning/originals/*` — UMTUBA-owned draft/publish, lessons, versioning, AI + certificate permission
- `lib/partners/*` — onboarding lifecycle, credential flags, commercial placeholders, admin
- `supabase/migrations/20260929_store_learning_precompany_foundation_v2.sql` — local schema only
- `vitest.config.ts` — include `lib/partners/**/*.test.ts`
- `docs/store/implementation/PRECOMPANY_PROVIDER_FOUNDATION_V2.md`
- `docs/learning/implementation/PRECOMPANY_PROVIDER_FOUNDATION_V2.md`
- `docs/partners/implementation/PRECOMPANY_PARTNER_ADMIN_V2.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/PROJECT_STATE.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

- `20260929_store_learning_precompany_foundation_v2.sql` (local only, not applied remotely)

## Security review

- Unknown rights default DENY; AI_USAGE_ALLOWED defaults FALSE
- MOCK isolated from production-purchasable catalog
- Forbidden third-party brand tokens rejected at import
- Credential model is vault_ref + status only; plaintext rejected
- SQL: FORCE RLS, revoke anon/authenticated writes, audit append-only
- `partner_onboarding_no_real_active_check` blocks REAL_PARTNER_DATA + ACTIVE
- No secrets printed or committed

## Tests

`npx vitest run` on 6 focused files — **24 passed**

## TypeScript

`npx tsc --noEmit` — **PASS**

## Lint

`npx eslint` on new Store/Learning/partner modules — PASS (0 errors)

## Build

Not run (no app UI/entry-point change)

## git diff --check

PASS

## git status --short

See commit on `central/store-learning-precompany-foundation-v2`

## Open issues

- Local SQL not applied remotely (intentional)
- Partner admin is domain/API only; no new admin chrome page
- Existing first-party seller/learning catalogs remain unbound until a later bind wave
- Real partner ACTIVE remains impossible until a later company-registration GO
