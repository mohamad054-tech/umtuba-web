# Current Task

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
