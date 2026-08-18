# Current Task

## Task title

CENTRAL GO — UMTUBA FULL BUSINESS SANDBOX EXPERIENCE V1

## Identity

- **DEVICE** = SERVER (WIN-MJRKAKK2MEH)
- **DEVICE_ROLE** = IMPLEMENTATION
- **TASK_ID** = `CENTRAL_FULL_BUSINESS_SANDBOX_EXPERIENCE_V1`
- **PRIORITY** = HIGH

## Status

IMPLEMENTED_NOT_DEPLOYED. Private hub `/sandbox/business-preview` on `central/full-business-sandbox-on-a085f667-v1` from live tip `a085f667`. Auth/token gate. noindex. Not in public nav. SQL `20260929` not applied. `STORE_DEMO_PREVIEW=1` not set. Mobile `7cf3960` frozen.

## Authoritative base

- **PRODUCTION_SHA** = `a085f6675bfd3a657858c17879ae037ac6bdc9f6`
- **PRODUCTION_RELEASE** = `a085f667-20260818193948`
- **ROLLBACK_RELEASE** = `722ed3e5-20260818185403`
- **TASK_BRANCH** = `central/full-business-sandbox-on-a085f667-v1`
- **TASK_WORKTREE** = `D:\umtuba-central\repos\umtuba-web-full-business-sandbox-on-a085f667-v1`

## Allowed scope

Private sandbox hub + fixture modules + operator docs. Reuse 26 DEMO products and three UMTUBA Original drafts as sandbox-only fixtures.

## Forbidden scope

- Public nav / sitemap / anonymous access
- SQL `20260929` apply
- Re-apply `20260930`
- Reset production
- `STORE_DEMO_PREVIEW=1` as the only public gate
- Real partners, payments, catalogs, emails
- Mobile SHA `7cf3960`

---

## Prior — JA-09 migration preflight + controlled cutover

**CENTRAL_JA09_MIGRATION_PREFLIGHT_CUTOVER_V1** — `WEB_DEPLOYED / 20260930 APPLIED / 20260929 NOT APPLIED`
Live `a085f6675bfd3a657858c17879ae037ac6bdc9f6` (`a085f667-20260818193948`). Rollback `722ed3e5-20260818185403`. Do not reset. Do not re-apply migrations.

## Prior — Store i18n integrate after JA-09

**CENTRAL_STORE_I18N_INTEGRATE_AFTER_JA09_V1** — Store Arabic is live on `a085f667`. SQL `20260929` not applied. `STORE_DEMO_PREVIEW` unset on production.

## Prior — Store private demo preview cherry-pick

**CENTRAL_STORE_PRIVATE_DEMO_PREVIEW_CHERRYPICK_DEPLOY_V1** — IN FLIGHT on a separate worktree. Sandbox reuses the access policy independently and does not edit those files.

## Prior — Learning lesson 404 review + deploy

**CENTRAL_LEARNING_LESSON_404_REVIEW_DEPLOY_V1** — prior live `e6b23cc`. Do not reset production.

## Mobile freeze

Mobile SHA `7cf3960` / umtuba-mobile must not be disturbed.
