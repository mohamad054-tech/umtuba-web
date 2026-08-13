# PC2-A1 — LIVE_PRODUCTION_REGRESSION_AUDIT_V2

```text
PC2 REPORT
SOURCE_DEVICE = PC2
DEVICE_ROLE = INDEPENDENT_RELEASE_QA / PLATFORM_CORE
AGENT_ID = PC2-A1
WAVE_ID = PC2_POST_RELEASE_PLATFORM_AUDIT_V2
TASK_ID = PC2_LIVE_PRODUCTION_REGRESSION_AUDIT_V2
REPORT_TYPE = POST_RELEASE_LIVE_PRODUCTION_REGRESSION_AUDIT
TIMESTAMP_LOCAL = 2026-08-13 01:50 +03
TIMESTAMP_UTC = 2026-08-12T22:50:23Z
FEATURE_DEVELOPMENT = FORBIDDEN (honored)
DESTRUCTIVE_TESTING = FORBIDDEN (honored)
PAYMENT_MUTATION = FORBIDDEN (honored)
LOAD_STRESS = FORBIDDEN (honored)
LB001_002_003_RERUN = FORBIDDEN (honored)
LOCKED_REOPEN_FROM_STALE_ANDROID = FORBIDDEN (honored)
COMMIT_CREATED = NO
PUSHED = NO
SECRET_VALUES_PRINTED = NO
PRODUCTION_DEPLOY = NOT_ATTEMPTED
BROWSER_MCP = UNAVAILABLE (tabs empty / navigate failed; curl + WebFetch used)
WORKSPACE_HEAD = 1c5ae0b
BRANCH = office/platform-translation-trunk-port-v1
PRODUCTION_ORIGIN = https://umtuba.com
```

## Verdict (machine stamps)

```text
LIVE_REGRESSION = FAIL
NEW_CRITICAL_DRIFT = NO
P0_COUNT = 1
P1_COUNT = 2
POST_RELEASE_COUNT = 5
COSMETIC_COUNT = 2
LOCKED_LB_REOPEN = NO
LEARNING_LB_RERUN = NOT_PERFORMED
WEB_PLATFORM_RELEASE_REOPEN = NO
AUTH_CALLBACK_CLASS = KNOWN_P0_DEPLOYMENT_GAP
AUTH_CALLBACK_SOURCE = SOURCE_FIX_COMPLETE
AUTH_CALLBACK_LIVE = LIVE_DEPLOY_PENDING
```

### Return contract

| Field | Value |
| --- | --- |
| LIVE_REGRESSION | **FAIL** |
| NEW_CRITICAL_DRIFT | **NO** |
| P0 | Live `/auth/callback` → `https://localhost:3001/...` (KNOWN; SOURCE_FIX_COMPLETE / LIVE_DEPLOY_PENDING) |
| P1 | (1) Store featured = `UMTUBA_E2E_*` sandbox; (2) Public home/watch `[INTERNAL TEST] Media Processing V1` |
| POST_RELEASE | www dual-host; staging `http://staging.umtuba.internal`; World soft-unavailable; `/sw.js` 404; sitemap `/discover` vs live 307→`/` |

**Severity discipline:** Auth callback localhost is the **same known undeployed P0** already documented in prior PC2 waves. It is **not** counted as new critical drift. No second invented P0. No reopen of LB003 / Learning / Collab / Security / Core / Translation from historical or Android absence.

---

## Scope & method

Independent **read-only** revalidation of `https://umtuba.com` (plus established `www` / `staging` / `http` redirect).

- Tools: `curl.exe` status/header/body probes, WebFetch home content
- No credentials, checkout/payment, enrollment mutation, admin writes, load tests
- Did **not** reopen LB001/002/003 or Learning release-critical suites
- Workspace source fix (`resolveAuthRedirectOrigin`) present locally (modified, undeployed); **live** is authoritative for regression stamp

---

## Audit sections 1–7

### 1) Homepage

| Check | Result |
| --- | --- |
| `GET https://umtuba.com/` | **200** |
| canonical / og:url | `https://umtuba.com` |
| `localhost` in HTML | **0** |
| HSTS / XFO / XCTO / Referrer / Permissions-Policy | Present (see §7) |
| Public feed content | Surfaces `[INTERNAL TEST] Media Processing V1` (P1; known) |

WebFetch home narrative confirms INTERNAL TEST media card on public home. Homepage shell otherwise loads.

### 2) Auth entry (revalidate callback)

| URL | Status | Location |
| --- | --- | --- |
| `/login`, `/signup`, `/forgot-password` | 200 | Forms render; no `localhost` in login HTML |
| `https://umtuba.com/auth/callback` | 307 | `https://localhost:3001/login?error=This+sign-in+link+is+invalid+or+has+expired.+Please+try+again.` |
| `.../auth/callback?code=probe` | 307 | `https://localhost:3001/login?error=This+sign-in+link+could+not+be+verified.+Please+try+again.` |
| `.../auth/callback?next=/auth/update-password` | 307 | `https://localhost:3001/forgot-password?error=This+reset+link+is+invalid+or+has+expired.+Request+a+new+one.` |
| `.../auth/callback?code=probe&next=/auth/update-password` | 307 | `https://localhost:3001/forgot-password?error=This+reset+link+could+not+be+verified.+Request+a+new+one.` |
| `https://www.umtuba.com/auth/callback` | 307 | same `localhost:3001` login error pattern |
| `https://staging.umtuba.com/auth/callback` | 307 | `https://localhost:3000/login?error=...` (staging related) |

**Classification:** **KNOWN P0 deployment gap** — not a newly invented issue.  
Workspace: `app/auth/callback/route.ts` + `lib/site/siteUrl.ts` use `resolveAuthRedirectOrigin` (**SOURCE_FIX_COMPLETE** in tree; git shows local `M` on those files).  
Live Location still loopback → **LIVE_DEPLOY_PENDING**.

### 3) Public Learning (no LB003)

| URL | Status | Notes |
| --- | --- | --- |
| `/learning` | 200 | Public shell |
| `/learning/catalog` | 200 | Courses listed; Create account / Log in CTAs; no localhost |
| `/learning/catalog/ai-foundations-for-builders` | 200 | “Full content unlocks after enrollment”; auth CTAs |
| `/learning/instructor`, `/learning/transcript` | 200 | Soft Unauthorized/Loading; no localhost |
| `/learning/bootstrap` | 404 | Differs from prior soft-200 observation; not treated as P0 (no private body leak) |

Learning public/auth boundary on safe unauth probes: **PASS**. LB003 **not** rerun; Learning lock **not** reopened.

### 4) Store public (NO purchase/payment)

| URL | Status | Notes |
| --- | --- | --- |
| `/store` | 200 | Featured slide aria-label includes `UMTUBA_E2E_20260721 Simple Mug` |
| `/store/search` | 200 | OK |
| `/store/umtuba-e2e-20260721/product/e2e-simple-mug` | 200 | Product detail; “Add to cart” UI present; **no purchase executed** |
| `/store/checkout`, `/store/orders`, `/seller`, `/admin` | 307 → login | Mutation/admin paths gated |

Commerce boundary (checkout/orders gated): **PASS**. Catalog quality: **P1** (sandbox E2E featured). No Stripe/payment mutation.

### 5) Observable APIs (safe known endpoints only)

| Probe | Result |
| --- | --- |
| `/api/health`, `/api/ready`, `/api/store/catalog`, `/api/learning`, `/api/version` | **404** (no public aliases) |
| `GET /api/live/leave` | **405** (route exists; method not allowed — expected) |
| Auth/session/CSRF API probes | **NOT PERFORMED** (credential-adjacent; out of safe scope) |
| Persistence / certification authenticated paths | **NOT TESTED** |

No unexpected 5xx on sampled public page GETs. No invent of hidden API surface.

### 6) Browser / runtime errors

| Check | Result |
| --- | --- |
| Browser MCP | Tabs empty; navigate unavailable this run |
| Fallback | curl headers/bodies + WebFetch home |
| Homepage HTML `localhost` | 0 |
| Sampled public pages | No 5xx; no JS console capture (tooling gap) |

**BROWSER_RUNTIME_ERRORS = NOT_OBSERVABLE_THIS_RUN** (tooling), not treated as a new defect.

### 7) HTTPS / redirects

| Check | Result |
| --- | --- |
| `http://umtuba.com/` | **301** → `https://umtuba.com/` |
| Apex HSTS | `max-age=31536000; includeSubDomains` |
| X-Frame-Options | SAMEORIGIN |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |
| Permissions-Policy | camera=(), microphone=(), geolocation=(), payment=() |
| `https://www.umtuba.com/` | **200**, no Location to apex (POST_RELEASE dual-host) |
| `/discover` | **307** → `/` while sitemap lists `https://umtuba.com/discover` |
| Staging home canonical/og | `http://staging.umtuba.internal` |
| `/sw.js` | **404**; `/manifest.webmanifest` **200** |
| `/world` | Soft unavailable: World Discovery migrations not in this environment |

HTTPS apex redirect + security headers: **PASS**. Remaining items are POST_RELEASE hygiene.

---

## Core surface matrix (sample)

| URL | Status |
| --- | --- |
| `/`, `/login`, `/signup`, `/forgot-password`, `/privacy`, `/terms` | 200 |
| `/watch`, `/search`, `/games`, `/welcome`, `/live`, `/world` | 200 |
| `/learning`, `/learning/catalog`, `/store`, `/store/search` | 200 |
| `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest` | 200 |
| `/sw.js` | 404 |
| `/discover` | 307 → `/` |
| `/messages`, `/notifications`, `/create/video`, `/settings`, `/profile` | 307 → login |

Collaboration hard gates: **PASS** on unauth probes.

---

## Findings detail (required fields)

### P0

#### P0-1 — Production auth callback redirect origin = loopback

| Field | Value |
| --- | --- |
| ISSUE | Live `/auth/callback` error/completion redirects use `https://localhost:3001` (staging related: `localhost:3000`) instead of public origin |
| EVIDENCE | `curl -sI https://umtuba.com/auth/callback` → `307` `Location: https://localhost:3001/login?error=...`; same host for `?code=probe` and password-reset `next`; www mirrors; staging → `localhost:3000` |
| OWNER | OPERATOR (deploy) / PLATFORM (source already fixed in workspace) |
| CLOSE_ACTION | Deploy source fix (`resolveAuthRedirectOrigin`); re-smoke until Location host is `umtuba.com` (and staging public host if in scope) |
| KNOWN_OR_NEW | **KNOWN** |
| REPRODUCIBLE | **YES** (2026-08-13 01:50 +03) |
| SOURCE_FIX | **SOURCE_FIX_COMPLETE** (workspace `app/auth/callback/route.ts` + `lib/site/siteUrl.ts`) |
| LIVE_STATE | **LIVE_DEPLOY_PENDING** |

Drives `LIVE_REGRESSION=FAIL`. Does **not** drive `NEW_CRITICAL_DRIFT=YES`.

### P1

#### P1-1 — Store featured catalog dominated by E2E sandbox SKUs

| Field | Value |
| --- | --- |
| ISSUE | Production Store featured surfaces `UMTUBA_E2E_20260721*` products (e.g. Featured slide “Simple Mug”) |
| EVIDENCE | `/store` HTML contains many `UMTUBA_E2E_20260721` markers; featured aria-label includes E2E Simple Mug; product URL 200 |
| OWNER | COMMERCE / CONTENT_OPS |
| CLOSE_ACTION | Unpublish or demote E2E sandbox listings from production featured surfaces |
| KNOWN_OR_NEW | **KNOWN** (same class as V1) |
| REPRODUCIBLE | **YES** |

#### P1-2 — Public feed shows INTERNAL TEST media

| Field | Value |
| --- | --- |
| ISSUE | Home/watch public discovery shows `[INTERNAL TEST] Media Processing V1` |
| EVIDENCE | Home HTML marker count INTERNAL TEST / Media Processing ≥1; WebFetch home lists the card |
| OWNER | MEDIA / CONTENT_OPS |
| CLOSE_ACTION | Remove or unpublish INTERNAL TEST media from public home/watch |
| KNOWN_OR_NEW | **KNOWN** (same class as V1) |
| REPRODUCIBLE | **YES** |

### POST_RELEASE

| ID | ISSUE | EVIDENCE | OWNER | CLOSE_ACTION | KNOWN_OR_NEW | REPRODUCIBLE |
| --- | --- | --- | --- | --- | --- | --- |
| PR-1 | www answers without apex redirect | `https://www.umtuba.com/` 200, no Location | OPS / DNS | www→apex 301/308 | KNOWN | YES |
| PR-2 | Staging metadata base internal HTTP | staging canonical/og = `http://staging.umtuba.internal` | OPS | Set public staging SITE_URL | KNOWN | YES |
| PR-3 | World Discovery soft-unavailable | copy: migrations not available in this environment | PLATFORM | Apply World migrations when authorized | KNOWN | YES |
| PR-4 | PWA SW absent | `/sw.js` 404; manifest 200 | PWA / OPS | Deploy SW + icons when AUTHORIZE_PWA | KNOWN | YES |
| PR-5 | Sitemap lists `/discover` while live redirects | sitemap `<loc>https://umtuba.com/discover</loc>`; live 307→`/` | SEO / PLATFORM | Align sitemap or restore discover route | KNOWN | YES |

### COSMETIC (non-blocking)

1. Guessed aliases `/collaboration` etc. not product paths (product uses `/messages`, `/learning`, `/store`).
2. `/manifest.json` historically 404 while `/manifest.webmanifest` 200 (not re-inflated).

---

## Explicit non-findings / locked areas

- **No NEW critical production drift** beyond the already-known auth-callback deploy gap.
- Do **not** reopen WEB_PLATFORM_RELEASE, LB003, Learning, Collab, Security PASS, Core/Translation from this audit.
- Android / Play absence is **out of reopen scope** and not used to invent web P0s.
- No unexpected 5xx on core public GETs sampled.
- No payment/checkout mutation performed.
- Collaboration hard gates behave correctly for anonymous users.
- Learning catalog public outline consistent with enrollment unlock messaging.

---

## Operator next (out of this agent write scope)

1. **Deploy** auth-callback public-origin fix; re-smoke Location host = `umtuba.com`.
2. Hide/unpublish E2E store featured inventory.
3. Remove/unpublish INTERNAL TEST media from public feed.
4. Post-release hygiene: www→apex, staging SITE_URL, PWA SW/icons, discover sitemap.

---

## Artifacts

- This file: `worktrees/PC2_A1_LIVE_PRODUCTION_REGRESSION_AUDIT_V2.md`
- Prior V1: `worktrees/PC2_A1_LIVE_PRODUCTION_POST_RELEASE_REGRESSION_V1.md`
- Companion narrative: `docs/ai/CURSOR_REPORT.md` (same TASK_ID)

END PC2_A1_LIVE_PRODUCTION_REGRESSION_AUDIT_V2
