# Current Task

## CENTRAL GO — REWARDS/REFERRAL SECURITY HARDENING V1

**TASK_ID** = `CENTRAL_REWARDS_REFERRAL_SECURITY_HARDENING_V1`
**PRIORITY** = HIGH
**DATE** = 2026-08-20
**STATUS** = IMPLEMENTED_LOCAL
**MODE** = IMPLEMENTATION
**DEVICE** = SERVER / CENTRAL
**BASE_SHA** = `1c5fda85c57a2fe2b05dfa64c36c052b0d19dc29`
**REMOTE_REF** = `origin/central/rewards-referral-engine-v1`
**WORKTREE** = `D:\umtuba-central\repos\umtuba-web-rewards-referral-engine-v1`
**20260931** = HOLD
**20260933** = UNAPPLIED_REPLACE_IN_PLACE
**PRODUCTION_DB_CHANGED** = NO
**DEPLOYED** = NO
**MOBILE_DISTURBED** = NO

Close the three production-apply blockers: client mint via `process_reward_event`, `_trustedActor` metadata bypass, unsafe qualify attribution fallback. Replace unapplied `20260933` in place. No production apply. No web deploy. No mobile.

### Allowed scope

- Rewards worktree from `1c5fda85`
- Unapplied `20260933` rewrite + tests/contracts
- Local commit + FF-only feature ref
- Handoff docs + report

### Forbidden scope

- Production SQL apply; web deploy; `20260931`; `20260929`; re-apply `20260930`/`20260932`
- `umtuba-mobile` / iOS editor P0 (`a9a8b8f`)
- Fake users/points; force push; `origin/alpha-0.2`; secrets

---

## CENTRAL GO — REWARDS/REFERRAL PRODUCTION ACTIVATION V1

**TASK_ID** = `CENTRAL_REWARDS_REFERRAL_PRODUCTION_ACTIVATION_V1`
**PRIORITY** = HIGH
**DATE** = 2026-08-20
**STATUS** = BLOCKED
**MODE** = FINAL_MIGRATION_REVIEW
**DEVICE** = SERVER / CENTRAL
**ACCEPTED_SOURCE_SHA** = `1c5fda85c57a2fe2b05dfa64c36c052b0d19dc29`
**REMOTE_REF** = `origin/central/rewards-referral-engine-v1`
**WORKTREE** = `D:\umtuba-central\repos\umtuba-web-rewards-referral-engine-v1`
**WEB_PRODUCTION** = `26a0d19379b09cd53f08371358903a84745aa842`
**LIVE_RELEASE** = `26a0d193-20260819192000` (unchanged)
**20260931** = HOLD
**20260933** = REVIEWED_NOT_APPLIED
**MIGRATION_APPLIED** = NO
**WEB_DEPLOYED** = NO
**MOBILE_DISTURBED** = NO
**REPORT** = `D:\umtuba-central\reports\UMTUBA_CENTRAL_REWARDS_REFERRAL_PRODUCTION_ACTIVATION_V1.md`

Reviewed `20260933` on accepted SHA. Collision NONE. Lineage is FF from live `26a0d193`. **Did not apply.** Client-callable `process_reward_event` can mint launch_v1 amounts; `_trustedActor` metadata bypasses cross-user checks; `qualify_my_referral_signup` can read another visitor’s pending attribution.

### Allowed scope

- Final review of `20260933` + apply only if all eight pre-apply checks pass
- Targeted production apply (no `db push`) and smallest web deploy from `1c5fda85` if FF-safe
- Handoff docs + this report

### Forbidden scope

- Apply `20260931`; apply `20260929`; re-apply `20260930`/`20260932`
- Touch `umtuba-mobile` or the iOS editor P0 stream
- Fake users / invented points; award on link click alone
- Restore crash web `0b6d35bd`; rewrite `origin/alpha-0.2`
- Force push; `git config --global`; print secrets

### Blockers (do not apply until fixed)

1. `process_reward_event` GRANT to authenticated without source verify
2. Client `_trustedActor` metadata bypass
3. `qualify_my_referral_signup` cross-user pending attribution fallback

---

## CENTRAL GO — UMTUBA REWARDS / REFERRAL ENGINE V1

**TASK_ID** = `CENTRAL_UMTUBA_REWARDS_REFERRAL_ENGINE_V1`
**PRIORITY** = HIGH
**DATE** = 2026-08-20
**STATUS** = IMPLEMENTED_LOCAL
**MODE** = IMPLEMENTATION
**DEVICE** = SERVER / CENTRAL
**WORKTREE** = `D:\umtuba-central\repos\umtuba-web-rewards-referral-engine-v1`
**BRANCH** = `central/rewards-referral-engine-v1`
**BASE_SHA** = `f66f1c921c166b9a5fe0a1d103817e2bdf8a6179`
**FINAL_SHA** = `1c5fda85c57a2fe2b05dfa64c36c052b0d19dc29`
**REMOTE_REF** = `origin/central/rewards-referral-engine-v1`
**WEB_PRODUCTION** = `26a0d19379b09cd53f08371358903a84745aa842` (do not FF)
**MOBILE** = do not modify; P0 owns `f66f15c` editor-exit. `MOBILE_SOURCE_CHANGED=NO`
**DEPLOYED** = NO
**MIGRATION** = `20260933` additive launch_v1 (do not apply `20260931`)

Owner authorized product implementation: one authoritative UM Points + referral engine. Internal points only. Web + SQL + contracts. No mobile/editor edits. No store binaries. No web deploy.

### Allowed scope

- Web worktree from `origin/central/create-editor-sound-library-v1`
- Additive SQL `20260933+`
- Rewards/referral contracts, dashboard, `/join?ref=`
- 13-locale rewards chrome
- Local commit + FF-only feature ref (not `origin/alpha-0.2`)

### Forbidden scope

- `umtuba-mobile`, iOS/Android `app.json`, editor UI
- Apply `20260931` blindly; collide `20260929` / `20260930` / `20260932`
- Force push; `git config --global`; print secrets
- AAB/IPA; web deploy; `db push`

---

## CENTRAL GO — 13 LANGUAGE DEEP LINGUISTIC QA FINAL V1

**TASK_ID** = `CENTRAL_13_LANGUAGE_DEEP_LINGUISTIC_QA_FINAL_V1`
**PRIORITY** = HIGH
**DATE** = 2026-08-19
**STATUS** = IN_PROGRESS
**WORKTREE** = `D:\umtuba-central\repos\umtuba-web-13-language-deep-linguistic-qa-v1`
**BRANCH** = `central/13-language-deep-linguistic-qa-v1`
**BASE_SHA** = `618526c96a93f1e602e923c2e6987d0a8d020303`
**LIVE_RELEASE** = `618526c9-20260819175541`
**ROLLBACK** = `618526c9-20260819175541`
**LANGUAGES_TARGET** = `ar,en,fr,es,de,pt,id,hi,ru,tr,zh-CN,ja,ko`
**PORTUGUESE_VARIANT** = `pt-BR`
**CHINESE_VARIANT** = `zh-CN`
**WATCH_TERM_DECISION** = Translate surface label in all 13 locales (glossary). Not English leftover in fr/es/de/pt.
**HELLO_CITY_TERM_DECISION** = Keep branded English **Hello City** in all 13 locales.

### Allowed scope

Deep linguistic QA + professional polish of user-facing product chrome. Incorrect/unnatural translations, missing chrome, terminology, localization-caused layout, hardcoded English chrome. Tests/tsc/lint/build. Deploy only if gates pass. Host `next build` must source `/etc/umtuba/production/umtuba.env`.

### Forbidden scope

- Do not rebuild localization architecture / registry / auto-detect
- Do not translate UGC (posts, comments, DMs, captions, authored lessons, seller descriptions)
- Do not add ur/ms/bn; do not restore crashing `0b6d35bd-20260819011723`
- Do not redesign, add features, change Store/Learning restrictions, Rewards, Originals, or mobile
- No force-push; no `git config --global`; no secrets in git

---

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
