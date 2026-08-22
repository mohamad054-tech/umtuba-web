# Current Task

## CENTRAL GO — 13-LOCALE RUNTIME CERTIFICATION AND COMPLETION V1

**TASK_ID** = `CENTRAL_WEB_13_LOCALE_RUNTIME_CERTIFICATION_AND_COMPLETION_V1`  
**DATE** = 2026-08-22  
**STATUS** = CANDIDATE_READY_NOT_DEPLOYED  
**MODE** = IMPLEMENT_VERIFY_PUSH_CANDIDATE  
**BASE_SHA** = `57de1988fc546f5c4f0acdd5e207c48aba1d82ef`  
**WEB_BRANCH** = `central/web-13-locale-runtime-certification-v1`  
**WEB_WORKTREE** = `D:\umtuba-central\repos\umtuba-web-13-locale-runtime-certification-v1`  
**REPORT** = `D:\umtuba-central\reports\UMTUBA_CENTRAL_WEB_13_LOCALE_RUNTIME_CERTIFICATION_AND_COMPLETION_V1.md`

Certify and complete 13-locale runtime localization. Do not treat JSON key existence as proof. Wire profile chrome. Arabic `/profile/marenapost` must not show the observed product English leak set. Commit + push candidate only. **DEPLOYED = NO**. No FF of `origin/alpha-0.2`. No production restart.

### Allowed scope

- Profile / activity-tier chrome i18n wiring
- 13 locale catalogs (`ar en fr es de pt id hi ru tr zh-CN ja ko`)
- Runtime HTML matrix + targeted tests + `tsc` + `npm run build`
- Commit + push `origin/central/web-13-locale-runtime-certification-v1`
- Handoff docs + Central report

### Forbidden scope

- Production deploy / host restart
- Fast-forward `origin/alpha-0.2`
- Mobile / `34e42cc` / iOS lifecycle
- Apply `20260931`; UM Life Phase 2
- Security P1
- Discard WIP

```text
TASK_ID = CENTRAL_WEB_13_LOCALE_RUNTIME_CERTIFICATION_AND_COMPLETION_V1
STATUS = CANDIDATE_READY_NOT_DEPLOYED
BASE_SHA = 57de1988fc546f5c4f0acdd5e207c48aba1d82ef
DEPLOYED = NO
READY_FOR_CENTRAL_DEPLOY_DECISION = YES
```
