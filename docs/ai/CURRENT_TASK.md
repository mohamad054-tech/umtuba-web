# Current Task

## Task title

CENTRAL GO — PRIVATE STORE DEMO PREVIEW ACCESS

## Identity

- **DEVICE** = SERVER (WIN-MJRKAKK2MEH)
- **DEVICE_ROLE** = IMPLEMENTATION
- **TASK_ID** = `CENTRAL_STORE_PRIVATE_DEMO_PREVIEW_ACCESS_V1`
- **PRIORITY** = HIGH

## Status

IMPLEMENTED_TESTED_NOT_DEPLOYED. JA-09 cutover remains in flight — do not race a web deploy onto live `722ed3e5`. Anonymous `/store/demo-preview` is DENY. Public `/store` stays empty of demo.

## Authoritative base

- **LIVE_BASE_SHA** = `722ed3e597d51dbb5091c714777a319ff97bc3cd`
- **TASK_BRANCH** = `central/store-private-demo-preview-access-v1`
- **TASK_WORKTREE** = `D:\umtuba-central\repos\umtuba-web-store-private-demo-preview-access-v1`

## Allowed scope

Tighten private QA access to the existing 26 DEMO fixtures and `/store/demo-preview` Store UX. Docs for access method (no secrets).

## Forbidden scope

- JA-09 enroll files / apply `20260930` or `20260929`
- Mobile `7cf3960`
- Store pre-company wholesale
- UMTUBA Originals drafts
- Expose demo on public `/store`, sitemap, or nav
- Real checkout/payment
- Force-push / reset production / invent git identity
- Print secret token values

---

## Prior — Store-only i18n on live e6b23cc (JA-09 preserved separately)

**CENTRAL_STORE_I18N_INTEGRATE_AFTER_JA09_V1** — `STORE_ONLY_ON_LIVE`

- **LIVE_BASE_SHA** = `e6b23cc388ddb5e452a405d24d714a5f5bc67818`
- **STORE_FIX_SHA** = `46c941f72065369971df16b07e1a6e8f57f9ade4`
- **JA09_FINAL_BASE_SHA** = `89bc560dda683998528e5875bed04ef30e621095` (stacked separately)
- **TASK_BRANCH** = `central/store-i18n-on-live-e6b23cc-v1`
- **TASK_WORKTREE** = `D:\umtuba-central\repos\umtuba-web-store-i18n-on-live-e6b23cc-v1`

Cherry-pick of `46c941f7` onto production tip `e6b23cc` produced live `722ed3e5`. JA-09 branch remains intact on `central/learning-ja09-enroll-localization-v1`. No Learning enroll files. No `20260930`. SQL `20260929` not applied. Mobile SHA `7cf3960` frozen.

Store buyer chrome localization, Arabic RTL, leakage removal, gated demo preview from `46c941f7` only.

Forbidden: JA-09 enroll SQL / `20260930` / Learning enroll rewrites; SQL `20260929` apply; `STORE_DEMO_PREVIEW=1` as a public anonymous grant; Mobile SHA `7cf3960`; Force-push / invent git identity; Reset production to `2400a378`.

---

## Prior — JA-09 enrollment + Learning chrome localization

**CENTRAL_LEARNING_JA09_ENROLL_LOCALIZATION_V1** — `IMPLEMENTED_NOT_DEPLOYED`  
Tip `89bc560dda683998528e5875bed04ef30e621095`. Remote `20260930` not applied. Do not ship enroll SQL without the migration. Do not race enroll cutover.

---

## Prior — Learning lesson 404 review + deploy

**CENTRAL_LEARNING_LESSON_404_REVIEW_DEPLOY_V1** — `DEPLOYED / GUEST_SMOKE_PASS / SIGNED_IN_BLOCKED`  
Live production `e6b23cc388ddb5e452a405d24d714a5f5bc67818`, release `e6b23cc3-20260818173442`.

## Mobile freeze

Mobile SHA `7cf3960` / umtuba-mobile must not be disturbed.
