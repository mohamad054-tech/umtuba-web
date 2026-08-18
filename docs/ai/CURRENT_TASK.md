# Current Task

## Task title

CENTRAL CONDITIONAL GO — INTEGRATE STORE I18N AFTER JA-09

## Identity

- **DEVICE** = SERVER (WIN-MJRKAKK2MEH)
- **DEVICE_ROLE** = IMPLEMENTATION
- **TASK_ID** = `CENTRAL_STORE_I18N_INTEGRATE_AFTER_JA09_V1`
- **PRIORITY** = HIGH

## Status

INTEGRATING. JA-09 wave finished (implemented, not deployed). Store fix `46c941f7` is being stacked onto JA-09 tip. SQL `20260929` not applied. Remote `20260930` not authorized by this GO. Mobile SHA `7cf3960` frozen.

## Authoritative base

- **JA09_FINAL_BASE_SHA** = `89bc560dda683998528e5875bed04ef30e621095`
- **STORE_FIX_SHA** = `46c941f72065369971df16b07e1a6e8f57f9ade4`
- **CURRENT_WEB_AUTHORITY_LIVE** = `e6b23cc388ddb5e452a405d24d714a5f5bc67818`
- **TASK_BRANCH** = `central/store-i18n-on-ja09-v1`
- **TASK_WORKTREE** = `D:\umtuba-central\repos\umtuba-web-store-i18n-on-ja09-v1`

## Allowed scope

Store buyer chrome localization, Arabic RTL, leakage removal, gated demo preview — authorized only from `46c941f7`. Reconcile onto JA-09 tip. Prefer Store-only cherry-pick onto live `e6b23cc` for production if clean.

## Forbidden scope

- SQL `20260929` apply
- Remote `20260930` apply unless a later GO + DEVELOPMENT_WORKFLOW requires it (this GO does not)
- Reset production to `2400a378`
- Force-push / invent git identity / `git config --global`
- Mobile SHA `7cf3960` / umtuba-mobile
- Pre-company provider branch wholesale / real partner data
- JA-09 logic rewrites / unrelated Learning redesign
- `STORE_DEMO_PREVIEW=1` on production

## Next

Finish integrate + tests + tsc + lint + build. If Store-only onto `e6b23cc` is clean, deploy that SHA on the approved Hetzner path. Combined JA-09+Store SHA remains `STORE_INTEGRATION_SHA`. Do not silently apply `20260930`.

---

## Prior — JA-09 enrollment + Learning chrome localization

**CENTRAL_LEARNING_JA09_ENROLL_LOCALIZATION_V1** — `IMPLEMENTED_NOT_DEPLOYED`  
Branch `central/learning-ja09-enroll-localization-v1` tip `89bc560dda683998528e5875bed04ef30e621095`. Isolated worktree `D:\umtuba-central\repos\umtuba-web-learning-ja09-enroll-v1` from production SHA `e6b23cc388ddb5e452a405d24d714a5f5bc67818`. Migration `20260930_learning_public_catalog_self_enroll_v1.sql` is in the branch file tree and is **not** applied remotely. Deploy not performed. Do not race a broken enroll cutover.

## Prior — Store live localization + gated demo preview

**CENTRAL_STORE_LIVE_LOCALIZATION_DEMO_PREVIEW_V1** — `IMPLEMENTED_TESTED_NOT_DEPLOYED`  
Source SHA `46c941f72065369971df16b07e1a6e8f57f9ade4` on `central/store-live-localization-demo-preview-v1` from `2400a378`. Worktree build was blocked by node_modules lock (not a product defect). SQL `20260929` not applied.

## Prior — Learning lesson 404 review + deploy

**CENTRAL_LEARNING_LESSON_404_REVIEW_DEPLOY_V1** — `DEPLOYED / GUEST_SMOKE_PASS / SIGNED_IN_BLOCKED`  
Live production `e6b23cc388ddb5e452a405d24d714a5f5bc67818`, release `e6b23cc3-20260818173442`. Rollback `2400a378-20260818165601`. Do not reset production.

## Mobile freeze

Mobile SHA `7cf3960` / umtuba-mobile must not be disturbed.
