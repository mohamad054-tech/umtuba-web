# Current Task

## CENTRAL GO — 13-LOCALE RUNTIME CERTIFICATION AND COMPLETION V1

**TASK_ID** = `CENTRAL_WEB_13_LOCALE_RUNTIME_CERTIFICATION_AND_COMPLETION_V1`  
**DATE** = 2026-08-22  
**STATUS** = DEPLOYED  
**MODE** = FINAL_LOCALIZATION_CLOSEOUT  
**BASE_SHA** = `57de1988fc546f5c4f0acdd5e207c48aba1d82ef`  
**FINAL_CANDIDATE_SHA** = `18785e79b7bf46f7503f603a5bf20d2982689a0b`  
**WEB_BRANCH** = `central/web-13-locale-runtime-certification-v1`  
**WEB_WORKTREE** = `D:\umtuba-central\repos\umtuba-web-13-locale-runtime-certification-v1`  
**LIVE_RELEASE** = `18785e79-20260822163955`  
**PRODUCTION_SHA** = `18785e79b7bf46f7503f603a5bf20d2982689a0b`  
**REPORT** = `D:\umtuba-central\reports\UMTUBA_CENTRAL_WEB_13_LOCALE_RUNTIME_CERTIFICATION_AND_COMPLETION_V1.md`

Closeout complete. User-visible profile chrome is localized. RSC payload no longer serializes English `Rising Creator` / `Joined August`. Production cut over. Live Arabic `/profile/marenapost?hl=ar` is clean.

### Allowed scope

- Remaining user-visible profile / content-card product chrome
- 13 locale catalogs
- Targeted tests + tsc + build + candidate HTML matrix
- Commit + push
- Production deploy via Central path if all deploy gates pass

### Forbidden scope

- Mobile / Security P1 / `20260931` / UM Life Phase 2 / video egress
- Force-push
- Printing secrets from `/etc/umtuba/production/umtuba.env`
