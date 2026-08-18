# Current Task

## Task title

CENTRAL CONDITIONAL GO — STORE-ONLY I18N ON LIVE e6b23cc (JA-09 PRESERVED SEPARATELY)

## Identity

- **DEVICE** = SERVER (WIN-MJRKAKK2MEH)
- **DEVICE_ROLE** = IMPLEMENTATION
- **TASK_ID** = `CENTRAL_STORE_I18N_INTEGRATE_AFTER_JA09_V1`
- **PRIORITY** = HIGH

## Status

STORE_ONLY_ON_LIVE. Cherry-pick of `46c941f7` onto production tip `e6b23cc` for a deployable Store-only SHA. JA-09 branch remains intact on `central/learning-ja09-enroll-localization-v1`. No Learning enroll files. No `20260930`. SQL `20260929` not applied. Mobile SHA `7cf3960` frozen.

## Authoritative base

- **LIVE_BASE_SHA** = `e6b23cc388ddb5e452a405d24d714a5f5bc67818`
- **STORE_FIX_SHA** = `46c941f72065369971df16b07e1a6e8f57f9ade4`
- **JA09_FINAL_BASE_SHA** = `89bc560dda683998528e5875bed04ef30e621095` (stacked separately)
- **TASK_BRANCH** = `central/store-i18n-on-live-e6b23cc-v1`
- **TASK_WORKTREE** = `D:\umtuba-central\repos\umtuba-web-store-i18n-on-live-e6b23cc-v1`

## Allowed scope

Store buyer chrome localization, Arabic RTL, leakage removal, gated demo preview from `46c941f7` only.

## Forbidden scope

- JA-09 enroll SQL / `20260930` / Learning enroll rewrites
- SQL `20260929` apply
- `STORE_DEMO_PREVIEW=1` on production
- Mobile SHA `7cf3960`
- Force-push / invent git identity
- Reset production to `2400a378`

---

## Prior — JA-09 enrollment + Learning chrome localization

**CENTRAL_LEARNING_JA09_ENROLL_LOCALIZATION_V1** — `IMPLEMENTED_NOT_DEPLOYED`  
Tip `89bc560dda683998528e5875bed04ef30e621095`. Remote `20260930` not applied. Do not ship enroll SQL without the migration.

## Prior — Learning lesson 404 review + deploy

**CENTRAL_LEARNING_LESSON_404_REVIEW_DEPLOY_V1** — `DEPLOYED / GUEST_SMOKE_PASS / SIGNED_IN_BLOCKED`  
Live production `e6b23cc388ddb5e452a405d24d714a5f5bc67818`, release `e6b23cc3-20260818173442`.

## Mobile freeze

Mobile SHA `7cf3960` / umtuba-mobile must not be disturbed.
