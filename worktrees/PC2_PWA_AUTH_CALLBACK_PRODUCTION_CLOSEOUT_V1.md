# PC2 — PWA_AUTH_CALLBACK_PRODUCTION_CLOSEOUT_V1

```
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = INDEPENDENT_RELEASE_QA / PLATFORM_CORE
TASK_ID = PC2_PWA_AUTH_CALLBACK_PRODUCTION_CLOSEOUT_V1
REPORT_TYPE = PWA_AUTH_CALLBACK_PRODUCTION_CLOSEOUT
TIMESTAMP_LOCAL = 2026-08-12 15:36 +03
FEATURE_DEVELOPMENT = FORBIDDEN
COMMIT_SHA = N/A
PUSH_STATUS = NOT_PUSHED
WHOLE_PROJECT_PRODUCTION_READY = NO
PC2_STATUS_AFTER_REPORT = READY_FOR_LB003_AUTH_EXECUTION
MOBILE_BLOCKS_CURRENT_WEB_PLATFORM_RELEASE = NO
PWA_STATUS = NOT_PRODUCTION_READY
ANDROID_PLAY_STATUS = POST_RELEASE / NOT_AUTHORIZED
```

Canonical narrative: `docs/ai/CURSOR_REPORT.md` (same TASK_ID).

---

## Live revalidation (2026-08-12)

| URL | Status | Location |
| --- | --- | --- |
| `https://umtuba.com/auth/callback` | 307 | `https://localhost:3001/login?error=This+sign-in+link+is+invalid+or+has+expired.+Please+try+again.` |
| `https://umtuba.com/auth/callback?code=probe` | 307 | `https://localhost:3001/login?error=This+sign-in+link+could+not+be+verified.+Please+try+again.` |
| `https://staging.umtuba.com/auth/callback` | 307 | `https://localhost:3000/login?error=This+sign-in+link+is+invalid+or+has+expired.+Please+try+again.` |
| `https://umtuba.com/` | 200 | canonical / og:url = `https://umtuba.com` |
| `https://staging.umtuba.com/` | 200 | canonical / og:url = `http://staging.umtuba.internal` |

Prior audit lead **CONFIRMED** on current live prod.

---

## Contract (existing SoT / docs / brand — not invented)

```
PRODUCTION_APP_ORIGIN = https://umtuba.com
PRODUCTION_AUTH_CALLBACK = https://umtuba.com/auth/callback
STAGING_APP_ORIGIN = https://staging.umtuba.com
STAGING_AUTH_CALLBACK = https://staging.umtuba.com/auth/callback
DEV_APP_ORIGIN = http://localhost:3000
DEV_AUTH_CALLBACK = http://localhost:3000/auth/callback
SUPABASE_AUTH_REDIRECT_CONTRACT = Site URL + allowlist /auth/callback for each deployed origin (see supabase/README.md + .env.example)
PRODUCTION_AUTH_CALLBACK_ALREADY_ALLOWED = UNVERIFIABLE
STAGING_AUTH_CALLBACK_ALREADY_ALLOWED = UNVERIFIABLE
DEV_AUTH_CALLBACK_ALREADY_ALLOWED = UNVERIFIABLE
AUTH_GATE = PASS (preserved; no gate file edits)
```

Related SoT (`Desktop\umtuba\umtuba-web-translation-sot`): same `/auth/callback` + `NEXT_PUBLIC_SITE_URL` docs; no alternate production callback definition.

---

## Root cause + correction

```
PRODUCTION_AUTH_CALLBACK_LOCALHOST_BEFORE = YES
ROOT_CAUSE = request.url origin behind nginx upstream localhost:3001
AUTH_CALLBACK_CORRECTED = YES
CORRECTION = resolveAuthRedirectOrigin(requestOrigin) in app/auth/callback/route.ts
  - loopback request + public getSiteUrl() → public origin
  - loopback request + loopback getSiteUrl() → keep request origin (dev)
PRODUCTION_AUTH_CALLBACK_LOCALHOST = NO   # code/contract
LIVE_CLEARANCE = PENDING_OPERATOR_DEPLOY
```

---

## Regression

```
TEST_COMMANDS = npx vitest run lib/site/siteUrl.test.ts lib/supabase/authSession.harden.test.ts lib/supabase/passwordReset.test.ts lib/env/supabasePublic.test.ts ; npx tsc --noEmit ; git diff --check
TEST_RESULTS = vitest 47/47 PASS ; tsc PASS ; diff --check PASS
AUTH_GATE_REGRESSION = NO
DEV_LOCALHOST_PRESERVED = YES
```

---

## PWA / Android remaining (classify only)

```
PWA_REMAINING_POST_RELEASE = [
  OPERATOR_DEPLOY_AUTH_CALLBACK_ORIGIN_FIX,
  AUTHORIZE_PWA_YES,
  APPROVED_PWA_ICON_ASSETS_192_512,
  SERVICE_WORKER_OFFLINE
]
ANDROID_PLAY = POST_RELEASE / NOT_AUTHORIZED
AAB = NOT_CREATED
PLAY_UPLOAD = NOT_ATTEMPTED
MOBILE_BLOCKS_CURRENT_WEB_PLATFORM_RELEASE = NO
```

---

## LB003 watch

```
AUTHORIZED_FIXTURES_CURRENTLY_AVAILABLE = NO
LB003_SWITCH = NOT_TRIGGERED
NEXT = READY_FOR_LB003_AUTH_EXECUTION when fixtures arrive via approved mechanism
```

END PC2_PWA_AUTH_CALLBACK_PRODUCTION_CLOSEOUT_V1
