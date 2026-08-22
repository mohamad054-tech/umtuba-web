# CURSOR_REPORT — 13-locale runtime certification V1 2026-08-22

```text
TASK_ID = CENTRAL_WEB_13_LOCALE_RUNTIME_CERTIFICATION_AND_COMPLETION_V1
STATUS = CANDIDATE_READY_NOT_DEPLOYED
BASE_SHA = 57de1988fc546f5c4f0acdd5e207c48aba1d82ef
WEB_BRANCH = central/web-13-locale-runtime-certification-v1
WEB_WORKTREE = D:\umtuba-central\repos\umtuba-web-13-locale-runtime-certification-v1
TYPECHECK = PASS
TESTS = PASS
BUILD = PASS
GIT_DIFF_CHECK = PASS
13_LOCALE_MATRIX_COMPLETE = YES
AR_PROFILE_ENGLISH_LEAK_FIXED = CANDIDATE_YES_PRODUCTION_NO
RUNTIME_VERIFIED = CANDIDATE_LOCAL_HTML_YES
DEPLOYED = NO
READY_FOR_CENTRAL_DEPLOY_DECISION = YES
```

## Summary

Previous closeout treated catalog keys as proof and never rendered `/profile`. Live Arabic `/profile/marenapost` still showed product English. This candidate wires profile shell/header/tabs/actions/tier/loading chrome to 13-locale catalogs, formats joined dates per locale, and certifies rendered HTML. Production is unchanged.

Candidate `http://127.0.0.1:3013/profile/marenapost?hl=ar` has none of the observed leak phrases. Production `https://umtuba.com/profile/marenapost?hl=ar` still FAILs those phrases because this branch is not deployed.

## Exact files changed

Profile chrome, activity-tier chrome, 13 message catalogs, `lib/i18n/profileChrome.ts`, runtime cert tests, locale matrix script. See Central report for the full list. No mobile files. No SQL.

## Migrations created

None.

## Security review

No auth/session/secret change. Locale is existing `hl` / translator path. Settings remains auth-gated (production 307 BLOCKED_AUTH). No new public data exposure.

## Tests

`runtimeLocaleCertification`, profile IA/joined/about/identity/loading, arabic leak closeout: PASS (27).

## TypeScript

`node node_modules/typescript/bin/tsc --noEmit` PASS.

## Build

`npm run build` PASS (Next 16.2.10). Prior sibling-`node_modules` prerender failure did not reproduce with a local install.

## git diff --check

PASS (CRLF warnings only).

## git status --short

Candidate files on `central/web-13-locale-runtime-certification-v1` (commit + push this closeout).

## Open issues

- Production still shows the English leak set until Central deploys this candidate.
- Remaining hardcoded English (not in the observed marenapost leak set): linked-article prompt, empty/error panel constants, some aria-labels, IA English contracts, mock UGC.
- `/settings` stays BLOCKED_AUTH on production.
