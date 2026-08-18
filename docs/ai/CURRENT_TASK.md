# Current Task

## Task title

CENTRAL GO — PRIVATE STORE DEMO PREVIEW ACCESS

## Identity

- **DEVICE** = SERVER (WIN-MJRKAKK2MEH)
- **DEVICE_ROLE** = IMPLEMENTATION
- **TASK_ID** = `CENTRAL_STORE_PRIVATE_DEMO_PREVIEW_ACCESS_V1`
- **PRIORITY** = HIGH

## Status

CHERRY_PICK_ONTO_LIVE_A085F667. Access control from `04cb5fae` stacked onto live `a085f667` (JA-09 enroll + Store Arabic). Do not reset production. Do not re-apply `20260930`. Do not apply `20260929`. `STORE_DEMO_PREVIEW` stays unset on public hosts. Anonymous `/store/demo-preview` is DENY. Public `/store` stays empty of demo.

## Authoritative base

- **LIVE_BASE_SHA** = `a085f6675bfd3a657858c17879ae037ac6bdc9f6`
- **LIVE_RELEASE** = `a085f667-20260818193948`
- **ROLLBACK_OF_THIS_CUTOVER** = `722ed3e5-20260818185403`
- **ACCESS_SOURCE_SHA** = `04cb5faeaceb8d8a8ad5aa7fcadeadc5c76ebbe4`
- **TASK_BRANCH** = `central/store-private-demo-preview-access-on-a085f667-v1`
- **TASK_WORKTREE** = `D:\umtuba-central\repos\umtuba-web-store-private-demo-preview-access-on-a085f667-v1`

## Allowed scope

Tighten private QA access to the existing 26 DEMO fixtures and `/store/demo-preview` Store UX. Docs for access method (no secrets). Cherry-pick onto live `a085f667` only.

## Forbidden scope

- Reset production / deploy onto `722ed3e5` / race a Learning enroll reset
- Re-apply `20260930` or apply `20260929`
- `STORE_DEMO_PREVIEW=1` on production public hosts
- Mobile `7cf3960`
- Store pre-company wholesale
- UMTUBA Originals drafts
- Expose demo on public `/store`, sitemap, or nav
- Real checkout/payment
- Force-push / invent git identity
- Print secret token values

---

## Prior — JA-09 enroll on live 722ed3e5 (DEPLOYED)

**CENTRAL_LEARNING_JA09_ON_722ED3E5** — `DEPLOYED`  
Live `a085f6675bfd3a657858c17879ae037ac6bdc9f6`, release `a085f667-20260818193948`. Remote `20260930` **APPLIED**. SQL `20260929` **NOT** applied. Store Arabic from `722ed3e5` is on this SHA. Rollback `722ed3e5-20260818185403`. Do not reset Learning enroll.

---

## Prior — Store-only i18n on live e6b23cc

**CENTRAL_STORE_I18N_INTEGRATE_AFTER_JA09_V1** — `STORE_ONLY_ON_LIVE` (now rollback of JA-09 cutover)

- **LIVE_BASE_SHA** = `e6b23cc388ddb5e452a405d24d714a5f5bc67818`
- **STORE_FIX_SHA** = `46c941f72065369971df16b07e1a6e8f57f9ade4`
- **STORE_ONLY_LIVE_SHA** = `722ed3e597d51dbb5091c714777a319ff97bc3cd`
- **JA09_FINAL_BASE_SHA** = `89bc560dda683998528e5875bed04ef30e621095`

Cherry-pick of `46c941f7` onto `e6b23cc` produced `722ed3e5` (`722ed3e5-20260818185403`).

---

## Prior — JA-09 enrollment + Learning chrome localization

**CENTRAL_LEARNING_JA09_ENROLL_LOCALIZATION_V1** — stacked into live `a085f667`  
Original tip `89bc560dda683998528e5875bed04ef30e621095`. Migration `20260930_learning_public_catalog_self_enroll_v1.sql` is now applied remotely. Do not re-apply.

---

## Prior — Learning lesson 404 review + deploy

**CENTRAL_LEARNING_LESSON_404_REVIEW_DEPLOY_V1** — `DEPLOYED / GUEST_SMOKE_PASS / SIGNED_IN_BLOCKED`  
Was live `e6b23cc388ddb5e452a405d24d714a5f5bc67818`, release `e6b23cc3-20260818173442`.

## Mobile freeze

Mobile SHA `7cf3960` / umtuba-mobile must not be disturbed.
