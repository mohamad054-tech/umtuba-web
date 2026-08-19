# Current Task

## CENTRAL GO — PROFESSIONAL 13-LANGUAGE LOCALIZATION V1

**TASK_ID** = `CENTRAL_PROFESSIONAL_13_LANGUAGE_LOCALIZATION_V1`
**PRIORITY** = HIGH
**DATE** = 2026-08-19
**STATUS** = LOCAL_GATES_PASS_DEPLOY_NEXT
**WORKTREE** = `D:\umtuba-central\repos\umtuba-web-professional-13-language-localization-v1`
**BRANCH** = `central/professional-13-language-localization-v1`
**BASE_SHA** = `f72d625acbc1a3c8f6d6e9b5a6fc5772b99c63fa`
**LIVE_RELEASE** = `f72d625a-20260819151734`
**ROLLBACK** = `f72d625a-20260819151734`
**CHINESE_VARIANT** = `zh-CN` (Simplified; Traditional `zh-TW` does not collapse)
**LANGUAGES_BEFORE** = `ar,en,fr,es,de,pt`
**LANGUAGES_ADDED** = `id,hi,ru,tr,zh-CN,ja,ko`
**LANGUAGES_TARGET** = `ar,en,fr,es,de,pt,id,hi,ru,tr,zh-CN,ja,ko`

### Allowed scope

Professional chrome localization for 13 authorized languages in the existing i18n architecture (registry, selector, auto-detect, cookie, hl, html lang/dir, dictionaries). Quality-pass the six. Add seven. Tests/tsc/lint/build. Host `next build` must source `/etc/umtuba/production/umtuba.env`. Docs.

### Forbidden scope

- Do not reopen closed WEB_READY / six-locale runtime gate
- Do not add ur/ms/bn; do not restore crashing `0b6d35bd-20260819011723`
- Do not apply `20260931`; do not make sandbox public; no `STORE_DEMO_PREVIEW=1`
- Do not overwrite authored lessons, posts, captions, DMs, seller descriptions
- Do not touch umtuba-mobile; no `git config --global`; no force-push; no secrets in git

---

## CENTRAL GO — RESUME YESTERDAY LOCALIZATION WORK V1

**TASK_ID** = `CENTRAL_RESUME_YESTERDAY_LOCALIZATION_WORK_V1`
**PRIORITY** = HIGH
**SCOPE** = WEB + PRIVATE BUSINESS SANDBOX chrome i18n
**DATE** = 2026-08-19
**MODE** = IMPLEMENTATION + PRIVATE DEPLOY
**STATUS** = IN_PROGRESS
**WORKTREE** = `D:\umtuba-central\repos\umtuba-web-resume-yesterday-localization-v1`
**BRANCH** = `central/resume-yesterday-localization-v1`
**SOURCE_TO_CONTINUE** = leftover chrome quality + residual English leakage after live `f1fe053c`
**YESTERDAY_TASK_ID** = `CENTRAL_UNIFIED_WEB_LOCALE_AUTO_DETECTION_V1`
**LIVE** = `f1fe053c-20260819141126` / `f1fe053c5bdad86409b830626a38e24b6d26e287`
**ROLLBACK** = `0b6d35bd-20260819100057`

### Status

Locale auto-detection + persistence already DEPLOYED in `f1fe053c`. Runtime gate CLOSED_PASS. Do not redo the resolver. Remaining authorized work is six-locale chrome quality and residual English leakage (store-profile About/Currency, sandbox commercial/rights chrome, fr/es/de/pt shell + sandbox catalogs).

```text
LANGUAGES = ar,en,fr,es,de,pt
PARENT_LIVE = f1fe053c5bdad86409b830626a38e24b6d26e287
TASK_BRANCH = central/resume-yesterday-localization-v1
TASK_WORKTREE = D:\umtuba-central\repos\umtuba-web-resume-yesterday-localization-v1
```

### Identity

- **DEVICE** = SERVER (WIN-MJRKAKK2MEH)
- **DEVICE_ROLE** = IMPLEMENTATION + DEPLOY
- **SANDBOX_PATH** = `/sandbox/business-preview`

### Allowed scope

High-quality chrome localization for all six current locales. RTL/LTR. Existing `lib/i18n/messages` catalogs. Store-profile About/Currency labels. Sandbox commercial/rights chrome. Home/Watch/Discover/Search/Create/Profile/Messages/Settings/Store/Learning/auth/nav empty-loading-error buttons forms dialogs validation mobile-web. Tests/tsc/lint/build. One Hetzner cutover after gates, sourcing `/etc/umtuba/production/umtuba.env`. Docs.

### Forbidden scope

- Restart the localization project; redo accepted locale-resolution engine
- Invent a new language list; take Wave2 tr/id/hi/ja/ru/zh-CN
- Blindly translate authored course lessons or synthetic product names
- Disturb mobile `7cf3960`; apply rewards `20260931`; make sandbox public
- Restore crashing `0b6d35bd-20260819011723`; reopen closed Supabase incident
- Force-push; `git config --global`; print secrets
