# PC2-A1 — LIVE_PRODUCTION_POST_RELEASE_REGRESSION_V1

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = INDEPENDENT_RELEASE_QA / PLATFORM_CORE
AGENT_ID = PC2-A1
WAVE_ID = PC2_POST_RELEASE_INDEPENDENT_QA_V1
TASK_ID = PC2_LIVE_PRODUCTION_POST_RELEASE_REGRESSION_V1
REPORT_TYPE = POST_RELEASE_PRODUCTION_REGRESSION
TIMESTAMP_LOCAL = 2026-08-13 01:25 +03
FEATURE_DEVELOPMENT = FORBIDDEN (honored)
DESTRUCTIVE_TESTING = FORBIDDEN (honored)
PAYMENT_MUTATION = FORBIDDEN (honored)
LOAD_STRESS = FORBIDDEN (honored)
LB001_002_003_RERUN = FORBIDDEN (honored)
COMMIT_CREATED = NO
PUSHED = NO
SECRET_VALUES_PRINTED = NO
PRODUCTION_DEPLOY = NOT_ATTEMPTED
BROWSER_MCP = UNAVAILABLE (tabs empty; curl/WebFetch used)
WORKSPACE_HEAD = 1c5ae0b
BRANCH = office/platform-translation-trunk-port-v1
```

## Verdict (machine stamps)

```text
POST_RELEASE_PRODUCTION_REGRESSION = FAIL
NEW_PRODUCTION_CRITICAL_DRIFT = YES
P0_COUNT = 1
P1_COUNT = 2
POST_RELEASE_COUNT = 5
COSMETIC_COUNT = 2
LOCKED_LB_REOPEN = NO
LEARNING_LB_RERUN = NOT_PERFORMED
```

### Return contract

| Field | Value |
| --- | --- |
| POST_RELEASE_PRODUCTION_REGRESSION | **FAIL** |
| NEW_PRODUCTION_CRITICAL_DRIFT | **YES** |
| P0_FINDINGS | Live `/auth/callback` redirects to `https://localhost:3001/...` (sign-in + password-reset next) |
| P1_FINDINGS | (1) Production Store featured catalog dominated by `UMTUBA_E2E_*` sandbox products; (2) Public home/watch feed surfaces `[INTERNAL TEST] Media Processing V1` |
| POST_RELEASE_FINDINGS | www dual-host no apex redirect; staging canonical `http://staging.umtuba.internal`; World Discovery soft-unavailable; PWA `sw.js` absent; `/discover` → `/` while sitemap lists `/discover` |

---

## Scope & method

Independent **read-only** production verification of `https://umtuba.com` (plus related `www` / `staging` / `http` redirect).

- Tools: `curl.exe` status/header/body probes, WebFetch content reads
- No logins with credentials, no checkout/payment, no enrollment mutation, no admin writes, no load tests
- Did **not** reopen LB001/002/003 or Learning release-critical suites
- Workspace contains undeployed auth-callback origin fix (`resolveAuthRedirectOrigin`); live was probed as authoritative for this report

---

## Evidence matrix (safe probes)

### Core surfaces

| URL | Status | Notes |
| --- | --- | --- |
| `https://umtuba.com/` | 200 | HSTS/XFO/XCTO; canonical+og=`https://umtuba.com`; feed includes INTERNAL TEST media |
| `https://umtuba.com/login` | 200 | Auth entry OK |
| `https://umtuba.com/signup` | 200 | Auth entry OK |
| `https://umtuba.com/forgot-password` | 200 | Form entry OK |
| `https://umtuba.com/privacy` | 200 | OK |
| `https://umtuba.com/terms` | 200 | OK |
| `https://umtuba.com/watch` | 200 | Public; INTERNAL TEST caption visible in payload |
| `https://umtuba.com/search` | 200 | OK |
| `https://umtuba.com/games` | 200 | OK |
| `https://umtuba.com/welcome` | 200 | OK |
| `https://umtuba.com/live` | 200 | OK |
| `https://umtuba.com/world` | 200 | Soft-unavailable: World Discovery migrations not available |
| `https://umtuba.com/discover` | 307 → `/` | Sitemap still lists `/discover` |
| `http://umtuba.com/` | 301 → `https://umtuba.com/` | HTTPS redirect OK |
| `https://www.umtuba.com/` | 200 | Serves content; **no** apex redirect observed |
| `https://umtuba.com/robots.txt` | 200 | Host + sitemap OK |
| `https://umtuba.com/sitemap.xml` | 200 | Absolute `https://umtuba.com/...` |
| `https://umtuba.com/manifest.webmanifest` | 200 | Present |
| `https://umtuba.com/sw.js` | 404 | Offline SW not deployed |
| Sample public GETs (`/`, `/learning`, `/store`, `/login`, `/watch`, `/world`, `/search`, `/games`) | all 200 | No 5xx on sample |

### Auth callback (critical)

| URL | Status | Location |
| --- | --- | --- |
| `https://umtuba.com/auth/callback` | 307 | `https://localhost:3001/login?error=This+sign-in+link+is+invalid+or+has+expired.+Please+try+again.` |
| `https://umtuba.com/auth/callback?code=probe` | 307 | `https://localhost:3001/login?error=This+sign-in+link+could+not+be+verified.+Please+try+again.` |
| `https://umtuba.com/auth/callback?next=/auth/update-password` | 307 | `https://localhost:3001/forgot-password?error=This+reset+link+is+invalid+or+has+expired.+Request+a+new+one.` |
| `https://umtuba.com/auth/callback?code=probe&next=/auth/update-password` | 307 | `https://localhost:3001/forgot-password?error=This+reset+link+could+not+be+verified.+Request+a+new+one.` |
| `https://www.umtuba.com/auth/callback` | 307 | same localhost:3001 login error pattern |
| `https://staging.umtuba.com/auth/callback` | 307 | `https://localhost:3000/login?error=...` (staging; related) |

**Classification:** **P0** — live PKCE/email/recovery callback completion lands users on loopback, not `https://umtuba.com`. Password **form** pages still render; defect is callback **redirect origin** after link exchange/error. Matches prior undeployed fix note; **still live** as of this probe → counts as production-critical drift for this wave.

Workspace source already has `resolveAuthRedirectOrigin` in `app/auth/callback/route.ts` + `lib/site/siteUrl.ts` (uncommitted); **operator deploy/commit not performed** in this task.

### Learning (public / auth boundaries)

| URL | Status | Boundary observation |
| --- | --- | --- |
| `/learning` | 200 | Public shell; “Loading learning…” / sign-in affordances; no localhost |
| `/learning/catalog` | 200 | Public catalog lists courses; CTA Create account / Log in |
| `/learning/catalog/ai-foundations-for-builders` | 200 | Public outline; “Full content unlocks after enrollment” |
| `/learning/instructor`, `/bootstrap`, `/transcript` | 200 | Soft client gate (Loading / Unauthorized markers); no hard 307; **no private lesson body / emails observed** in unauth HTML |
| `/learning/courses/ja-01`, `/lessons/test`, `/activities/test`, `/attempts/test` | 200 | Soft Unauthorized/Loading; no email-like PII in HTML |
| `/certification`, `/certificates` | 404 | No public cert surface; authorized cert mutation **not** attempted |

Learning public/auth boundary: **PASS for safe unauth probes** (no reopen of LB suites). Catalog public; privileged collaboration-adjacent learning shells do not expose private content in HTML snapshot.

### Collaboration boundaries

| URL | Status | Notes |
| --- | --- | --- |
| `/messages` | 307 → `/login?next=%2Fmessages` | Hard gate OK |
| `/notifications` | 307 → login | Hard gate OK |
| `/create/video` | 307 → login | Hard gate OK |
| `/settings`, `/profile`, `/saved`, `/rewards` | 307 → login | Hard gate OK |
| `/collaboration`, `/collaborate` | 404 | No product alias at these paths (messages/live used instead) |

Collaboration auth boundary (messages + create): **PASS** on unauth probes.

### Commerce / store (read-only)

| URL | Status | Notes |
| --- | --- | --- |
| `/store` | 200 | Catalog loads; featured = E2E sandbox SKUs |
| `/store/search` | 200 | OK |
| `/store/umtuba-e2e-20260721/product/e2e-simple-mug` | 200 | Product detail; Add to cart UI present; **no purchase executed** |
| `/store/checkout`, `/store/orders`, `/store/wishlist` | 307 → login | Mutation paths gated |
| `/seller`, `/seller/apply`, `/seller/store` | 307 → login | Seller gated |
| `/admin`, `/admin/translation-studio` | 307 → login | Admin gated |

Commerce boundary: checkout/orders gated **PASS**. Catalog content quality: **P1** (sandbox E2E inventory featured in production).

### APIs / persistence (safe)

| Probe | Result |
| --- | --- |
| `/api/health`, `/api/ready`, `/api/store/catalog`, `/api/learning`, `/api/auth/session` | 404 (no public health aliases at these paths) |
| `GET /api/live/leave` | 405 (route exists; method not allowed — expected for leave) |
| Persistence / certification authenticated paths | **NOT TESTED** (would require auth + mutation; out of safe scope) |

### HTTPS / security headers (sample)

Public HTML responses observed with:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`

Homepage sampled Next chunks: **no `localhost` string**. Auth callback Location header is the confirmed localhost leak vector.

### Staging (related, not production apex)

| Check | Result |
| --- | --- |
| `https://staging.umtuba.com/` | 200 |
| canonical / og:url | `http://staging.umtuba.internal` |
| `/auth/callback` | 307 → `https://localhost:3000/login?...` |

---

## Findings

### P0

1. **Production auth callback redirect origin = loopback**  
   - Live `Location: https://localhost:3001/...` for sign-in and password-reset callback error/completion paths.  
   - Impact: email magic-link / PKCE / recovery users cannot land on production origin.  
   - Source fix present in worktree, **not live**.  
   - Drives `POST_RELEASE_PRODUCTION_REGRESSION=FAIL` and `NEW_PRODUCTION_CRITICAL_DRIFT=YES`.

### P1

1. **Production Store featured catalog is E2E sandbox inventory** (`UMTUBA_E2E_20260721*` products as Featured / New arrivals).  
2. **Public feed shows `[INTERNAL TEST] Media Processing V1`** on home/watch (test media in production discovery surface).

### POST_RELEASE

1. `www.umtuba.com` answers 200 without redirect to apex `umtuba.com` (dual-host SEO/ops debt).  
2. Staging metadata base `http://staging.umtuba.internal` (related env hygiene).  
3. World Discovery explicitly unavailable (migrations not in this environment) — soft fail messaging, not 5xx.  
4. PWA service worker absent (`/sw.js` 404); manifest present without 192/512 icons (favicon-only) — aligns with prior PWA post-release backlog.  
5. Sitemap includes `/discover` while live `/discover` 307→`/`.

### COSMETIC

1. Guessed aliases `/learn`, `/shop`, `/marketplace`, `/collaboration` → 404 (product uses `/learning`, `/store`, `/messages`).  
2. `/manifest.json` 404 while `/manifest.webmanifest` 200.

---

## Explicit non-findings / locked areas

- No evidence in this wave to reopen **LB001 / LB002 / LB003** or Learning PRODUCTION_READY lock.  
- No unexpected 5xx on core public GETs sampled.  
- No payment/checkout mutation performed.  
- Collaboration hard gates on `/messages` and create paths behave correctly for anonymous users.  
- Learning catalog public outline behavior consistent with enrollment unlock messaging.  
- HTTP→HTTPS apex redirect OK; production canonical/og on apex pages OK.

---

## Recommended operator next (out of this agent’s write scope)

1. Deploy/commit the existing auth-callback public-origin fix; re-smoke:  
   - `GET /auth/callback` → `https://umtuba.com/login?error=...` (not localhost)  
   - `GET /auth/callback?next=/auth/update-password` → `https://umtuba.com/forgot-password?error=...`  
2. Hide or unpublish E2E sandbox store listings from production featured surfaces.  
3. Remove or unpublish INTERNAL TEST media from public home/watch.  
4. (Post-release) www→apex redirect; staging SITE_URL; PWA SW/icons; discover sitemap alignment.

---

## Artifacts

- This file: `worktrees/PC2_A1_LIVE_PRODUCTION_POST_RELEASE_REGRESSION_V1.md`
- Companion narrative: `docs/ai/CURSOR_REPORT.md` (same TASK_ID)
