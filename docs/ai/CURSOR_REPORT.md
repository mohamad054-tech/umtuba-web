# CURSOR_REPORT — Store i18n integrate after JA-09 V1

```text
SOURCE_DEVICE = CENTRAL / SERVER
DEVICE_ROLE = IMPLEMENTATION
TASK_ID = CENTRAL_STORE_I18N_INTEGRATE_AFTER_JA09_V1
REPORT_TYPE = INTEGRATE
TIMESTAMP_LOCAL = 2026-08-18 ~18:40 +03
SECRET_VALUES_PRINTED = NO
FORCE_PUSH = NO
REMOTE_MIGRATION_APPLIED = NO
SQL_20260929_APPLIED = NO
MOBILE_SOURCE_CHANGED = NO
```

## Summary

JA-09 tip verified as `89bc560dda683998528e5875bed04ef30e621095`. Store fix `46c941f72065369971df16b07e1a6e8f57f9ade4` cherry-picked onto that tip on `central/store-i18n-on-ja09-v1`. Additive i18n/docs conflicts were resolved by keeping all Learning keys and attaching `StoreMessages`. Learning enroll files and `20260930` remain in this stacked lineage. Production was not reset.

A parallel Store-only cherry-pick onto live `e6b23cc` lives on `central/store-i18n-on-live-e6b23cc-v1` (no JA-09 enroll files, no `20260930`) for the preferred deploy path.

## Exact files changed

Store-only product delta from `46c941f7` plus additive i18n type/test merges. JA-09 Learning files were not rewritten.

## Migrations created

None. Combined tree **contains** JA-09 file `supabase/migrations/20260930_learning_public_catalog_self_enroll_v1.sql`. Not applied remotely. SQL `20260929` not present/applied.

## Security review

- Demo preview remains gated (`STORE_DEMO_PREVIEW=1` + admin/token/non-production). Not enabled on production.
- No secrets printed. No service-role material.
- Live catalog stays truthfully empty until authorized inventory exists.
- Demo products non-purchasable; no real partner claims.

## Tests

PENDING in this report until the isolated integration worktree `npm ci` / vitest run completes.

## TypeScript

PENDING

## Build

PENDING (prior Store worktree junction lock is not a product defect)

## git diff --check

PENDING

## git status --short

See integration worktree after cherry-pick completes.

## Open issues

- Combined SHA must not be shipped to production without `20260930` if enroll SQL would go live.
- Preferred path: deploy Store-only SHA on `e6b23cc` lineage.
