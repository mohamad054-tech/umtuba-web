# LAPTOP_PRODUCTION_PERFORMANCE_INVESTIGATION_AND_SAFE_OPTIMIZATION_V1

**TASK_ID:** `LAPTOP_PRODUCTION_PERFORMANCE_INVESTIGATION_AND_SAFE_OPTIMIZATION_V1`  
**SOURCE_DEVICE:** LAPTOP  
**DEVICE_ROLE:** LEARNING_COLLABORATION_PRIMARY / TEMPORARY_PRODUCTION_PERFORMANCE_QA  
**Date:** 2026-08-13  
**PRODUCTION_TARGET:** `https://umtuba.com`

## Boundaries respected

- LEARNING / COLLABORATION not reopened (no domain feature work)
- LB003 not executed
- Migrations not touched
- DNS / Cloudflare / cPanel / secrets / Hetzner system config not changed
- No destructive or high-concurrency load tests
- No mass media / Jinn corpus mutation
- No git commit/push

---

## A1 — PERFORMANCE BASELINE

### Method

- `curl.exe` timing with `Accept-Encoding: gzip` (and identity/br compare)
- Browser CDP `performance` Navigation Timing + Resource Timing on desktop viewport
- Multi-sample TTFB (n=3) for key routes
- Mobile viewport lab: **UNAVAILABLE** (no device lab; viewport meta present only)
- INP / CLS: **UNAVAILABLE** (no Interaction/LayoutShift observers captured this wave)
- LCP: **often UNAVAILABLE / null** in CDP (video-first home; LCP entry not always exposed)

### Document TTFB (curl gzip, n=3)

| Route | min | avg | max |
|-------|-----|-----|-----|
| `/` | 0.467s | 0.561s | 0.736s |
| `/login` | 0.254s | 0.265s | 0.277s |
| `/learning` | 0.280s | 0.285s | 0.295s |
| `/store` | 0.975s | **1.271s** | **1.694s** |
| `/store/products` | 0.321s | 0.325s | 0.332s |
| `/world` | 0.316s | 0.595s | 1.093s |
| `/games` | 0.266s | 0.280s | 0.303s |
| `/search` | 0.277s | 0.278s | 0.280s |

Earlier cold single-shot (first connection / TLS): `/` TTFB **1.76s**, `/store` **1.67s** (includes TCP+TLS cold start).

### Browser Navigation Timing (desktop)

| Route | TTFB | FCP | DCL | load | notes |
|-------|------|-----|-----|------|-------|
| `/` (cold-ish) | **1382ms** | **3108ms** | 2301ms | 2992ms | 61 resources; **36 fetch**; ~17 scripts |
| `/` (reload) | 969ms | 1320ms | 1012ms | 1961ms | still **36 RSC/prefetch fetches** |
| `/store` | **1382ms** | 1496ms | 1449ms | 1495ms | 55 resources; 31 fetch |
| Auth-gate sample | `/learning` hard nav landed on `/login` in browser | TTFB 109ms (warm login) | — | — | anonymous Learning gate |

Home HTML: identity **49524 B** / gzip **~11950 B**. Home JS gzip sum (17 chunks) **~306 KB**.

```
PERFORMANCE_BASELINE = HOME_TTFB~0.5–1.4s STORE_TTFB~1.0–1.7s FCP_HOME~1.3–3.1s LOAD_HOME~2.0–3.0s
SLOWEST_ROUTES = ["/store", "/", "/world (variable)"]
SLOWEST_RESOURCES = [
  "RSC prefetch /store?_rsc=… (~700–800ms TTFB from home)",
  "RSC prefetch /learning?_rsc=…",
  "RSC prefetch /games?_rsc=…",
  "RSC prefetch /login?…",
  "JS chunk 0q9a6slt3x9mg.js (~64KB gzip)",
  "JS chunk 2ejk_26znfoeu.js (~64KB gzip)",
  "SSR document /store (~1.3s TTFB)",
  "Signed Supabase MP4 teaser (video/mp4; media TTFB variable)"
]
```

---

## A2 — COMPRESSION / CONTENT ENCODING

### Correction of prior QA finding

Prior `HTML_CONTENT_ENCODING_NOT_OBSERVED_ON_PROBES` was a **probe artifact**: PowerShell `Invoke-WebRequest` without a proper `Accept-Encoding` negotiation did not surface gzip. With `curl -H 'Accept-Encoding: gzip, deflate, br'`:

| Asset | Accept-Encoding | Content-Encoding | Notes |
|-------|-----------------|------------------|-------|
| HTML `/` | gzip | **gzip** | PASS |
| HTML `/` | br | *(none)* body=identity size | **brotli not offered** |
| HTML `/` | identity | none | expected |
| JS/CSS `/_next/static/...` | gzip | **gzip** | PASS |
| favicon.ico | gzip | none | already compressed binary — OK |
| manifest | gzip | none (tiny) | OK |

Origin: **`Server: nginx`**. **No `cf-ray`** → apex is **not** Cloudflare-fronted in these probes.

```
HTML_COMPRESSION = PASS   # gzip active
JS_CSS_COMPRESSION = PASS # gzip active
TEXT_COMPRESSION = PASS_WITH_GAP  # gzip YES; brotli NO
```

### Central packet — enable brotli (optional uplift)

```
CENTRAL_REQUEST = ENABLE_NGINX_BROTLI_OR_GZIP_VERIFY_ON_UMTUBA_APEX
COMMAND_OR_CHECK =
  curl -sI -H 'Accept-Encoding: br' https://umtuba.com/ | findstr /i content-encoding
  curl -sI -H 'Accept-Encoding: gzip' https://umtuba.com/_next/static/chunks/<any>.js | findstr /i content-encoding
EXPECTED_EVIDENCE = Content-Encoding: br for HTML/JS/CSS text; gzip remains fallback
SAFE_CHANGE_IF_CONFIRMED = enable ngx_brotli / brotli on; do not recompress mp4/jpeg/png/webp
ROLLBACK = disable brotli module / revert nginx site snippet
```

Laptop is **not** authorized to mutate Hetzner nginx → **not executed**.

---

## A3 — CACHE POLICY

| Class | Observed | Verdict |
|-------|----------|---------|
| HTML documents | `private, no-cache, no-store, max-age=0, must-revalidate` | Correct for dynamic/auth-sensitive HTML |
| `/_next/static/*` | `public, max-age=31536000, immutable` | **PASS** |
| `/favicon.ico` | `public, max-age=0, must-revalidate` | PARTIAL — short TTL for static icon |
| `/manifest.webmanifest` | `public, max-age=0` | PARTIAL — acceptable for install-lite |

```
STATIC_CACHE_POLICY = PASS
CACHE_MISCONFIGURATIONS = [
  "favicon/manifest max-age=0 (minor; not navigation-blocking)",
  "HTML no-store is intentional under force-dynamic + auth cookies — not a misconfig"
]
```

No unsafe public caching of private responses observed.

---

## A4 — NEXT.JS BUNDLE / CLIENT COST

- Home ships **17** JS chunks; largest ~64KB gzip each; total ~306KB gzip — moderate, not primary pain
- **Primary pain:** default `Link` prefetch → **dozens of concurrent `?_rsc=` fetches** of **force-dynamic** routes while still on `/`
- Home: `export const dynamic = "force-dynamic"` + `HomeFeedLoader` → `getServerUser` + `getDiscoverVideosServer`
- Store: server `createClient()` (cookies) + `listPublicCatalog(limit:48)` + categories → high SSR TTFB
- No root `middleware.ts` in this checkout (only `lib/supabase/middleware.ts` helper)
- `next.config.ts` empty (no redirects/compress overrides)

### Safe optimization executed (code, not yet on production)

Set `prefetch={false}` on platform navigation Links:

- `app/discover/components/HomeSectionCircles.tsx` (section shortcuts — main prefetch storm source)
- `app/components/AppTopNav.tsx`
- `app/components/AppMobileBottomNav.tsx`

Rationale: evidence shows prefetch of `/store`, `/learning`, `/games`, `/login` etc. each costing **~500–800ms** server TTFB concurrently, amplifying origin load and making subsequent navigations feel slow.

```
BUNDLE_PERFORMANCE = PARTIAL
```

Regression: `npx vitest run app/lib/nav` → **68 PASS**. `tsc --noEmit` — see CURSOR_REPORT.

**Production AFTER measurement:** **not available** until Central deploys this commit/branch → `MEASURED_IMPROVEMENT = NO` for live apex.

---

## A5 — IMAGE / MEDIA

- Home is **video-first** (signed Supabase `post-videos` MP4 teasers/full)
- `NEXT_IMAGE` count in home HTML: **0**
- Store product cards: **"Media coming soon"** placeholders — not oversized hero images
- Favicon ~25KB
- Jinn corpus: **not touched**; public `/jinn` still 404

```
IMAGE_MEDIA_PERFORMANCE = PARTIAL
HEAVIEST_MEDIA = ["signed Supabase MP4 teaser/full on home feed", "favicon.ico ~25KB"]
SAFE_MEDIA_OPTIMIZATIONS = [
  "POST_RELEASE: ensure only active/viewport video buffers; posters for offscreen",
  "POST_RELEASE: Next/Image for store product media when assets exist",
  "Do not mass-convert; no Jinn mutation"
]
```

---

## A6 — API / BACKEND LATENCY

Observable from browser Resource Timing (no secrets printed):

- Dominant “API-like” cost is **Next.js RSC/document fetches** to same origin (`?_rsc=`), not separate REST spam
- Store SSR path uses Supabase catalog queries server-side → **DATABASE_ORIGIN_SUSPECTED = YES** for `/store` TTFB (inferred from code + high document TTFB; direct DB timings UNAVAILABLE without server access)
- Home feed uses `getDiscoverVideosServer` → DB/storage origin suspected for cold `/`
- No timeout/retry storm observed in resource list
- Auth-gate `/saved` → 307 quickly (~0.25s)

```
API_LATENCY_STATUS = PARTIAL
SLOW_API_CALLS = [
  "GET /store (SSR HTML/RSC) avg TTFB ~1.27s",
  "GET / (SSR) cold up to ~1.7s; browser TTFB ~1.0–1.4s",
  "RSC prefetch burst from home (many routes 500–800ms each)"
]
DATABASE_ORIGIN_SUSPECTED = YES
```

---

## A7 — SSR / NEXT.JS RUNTIME

Confirmed from repo + headers:

- Home **`force-dynamic`** — correct for personalized feed; explains HTML `no-store`
- Learning page also `force-dynamic` (not modified)
- Store dynamic via `cookies()` in `createClient()`
- Production mode: Next static chunks + SSR HTML (not a static export)
- Middleware cost at edge: **INSUFFICIENT_EVIDENCE** (no root middleware file in this checkout; may differ on deploy)

```
SSR_RUNTIME_STATUS = PARTIAL
```

### Central packet — origin SSR capacity / Next process

```
CENTRAL_REQUEST = CAPTURE_ORIGIN_SSR_LATENCY_AND_NODE_HEALTH_FOR_UMTUBA
COMMAND_OR_CHECK =
  # on app host (authorized Operator only)
  curl -s -o /dev/null -w 'ttfb=%{time_starttransfer}\n' https://127.0.0.1:<app_port>/store
  journalctl / process RSS / PM2 or systemd status for next start
  optional: enable temporary Server-Timing if app supports it
EXPECTED_EVIDENCE = local TTFB vs public TTFB; CPU steal; single-worker queueing under prefetch burst
SAFE_CHANGE_IF_CONFIRMED = scale Node workers / tune nginx upstream keepalive; deploy prefetch=false nav build
ROLLBACK = revert process scale / redeploy prior build
```

---

## A8 — `/marketplace` AND `/commerce`

Evidence:

- Production: both **404** (gzip HTML ~5.6KB), no redirect
- `APP_ROUTES.store = "/store"`; seller marketplace is **`/seller/store/marketplace`** (different route)
- No app `page.tsx` for `/marketplace` or `/commerce`
- Grep: **no** public `href="/marketplace"` or `href="/commerce"` in app source
- Store page copy: “this Store surface is the commerce layer”

| Route | Classification |
|-------|----------------|
| `/marketplace` | **EXPECTED_404** (not a public product route; seller path is under `/seller/store/marketplace`) |
| `/commerce` | **EXPECTED_404** (label/concept only; canonical public surface is `/store`) |

No stale internal nav links to fix. Redirects would be **optional product-intent aliases** — **INSUFFICIENT_EVIDENCE** to implement without Central product confirmation → prepared as optional Central change only.

```
MARKETPLACE_ROUTE_STATUS = EXPECTED_404
COMMERCE_ROUTE_STATUS = EXPECTED_404
```

---

## A9 — REGRESSION / BEFORE vs AFTER

| Check | Result |
|-------|--------|
| vitest `app/lib/nav` | 68 PASS |
| `git diff --check` (touched nav files) | clean |
| `tsc --noEmit` | see CURSOR_REPORT |
| Production AFTER probes | **NOT APPLICABLE** — code not deployed to umtuba.com |
| MEASURED_IMPROVEMENT | **NO** |

---

## ROOT CAUSES

```
ROOT_CAUSES_CONFIRMED = [
  "High SSR TTFB on /store (catalog queries + dynamic cookies) — avg ~1.27s",
  "High SSR TTFB on / (force-dynamic home feed) — browser ~1.0–1.4s",
  "Aggressive Next.js Link prefetch of many dynamic routes from home (36 fetches; multi-hundred-ms RSC each) — primary navigation-slowness amplifier",
  "Origin is nginx without Cloudflare; gzip works; prior missing Content-Encoding finding was probe artifact"
]
ROOT_CAUSES_SUSPECTED_NOT_CONFIRMED = [
  "Single Node worker queueing under prefetch burst (needs host metrics)",
  "Supabase query latency contribution vs Node render time split",
  "Brotli absence as secondary payload cost (gzip already PASS)",
  "Video MP4 startup cost on home LCP/INP"
]
```

---

## FINAL REPORT

```
SOURCE_DEVICE = LAPTOP
DEVICE_ROLE = LEARNING_COLLABORATION_PRIMARY / TEMPORARY_PRODUCTION_PERFORMANCE_QA
TASK_ID = LAPTOP_PRODUCTION_PERFORMANCE_INVESTIGATION_AND_SAFE_OPTIMIZATION_V1
PRODUCTION_PERFORMANCE_VERDICT = NEEDS_OPTIMIZATION
BASELINE_TTFB = HOME~0.97–1.38s browser / STORE~1.27s avg curl / STORE~1.38s browser
BASELINE_LCP = UNAVAILABLE
BASELINE_TOTAL_LOAD = HOME~2.0–3.0s browser loadEvent
SLOWEST_ROUTES = ["/store", "/", "/world(variable)"]
SLOWEST_RESOURCES = ["RSC prefetches from home", "SSR /store document", "large JS ~64KB gzip chunks", "home MP4"]
HTML_COMPRESSION = PASS
JS_CSS_COMPRESSION = PASS
STATIC_CACHE_POLICY = PASS
BUNDLE_PERFORMANCE = PARTIAL
IMAGE_MEDIA_PERFORMANCE = PARTIAL
API_LATENCY_STATUS = PARTIAL
SSR_RUNTIME_STATUS = PARTIAL
MARKETPLACE_ROUTE_STATUS = EXPECTED_404
COMMERCE_ROUTE_STATUS = EXPECTED_404
SAFE_OPTIMIZATIONS_EXECUTED = [
  "prefetch={false} on HomeSectionCircles, AppTopNav, AppMobileBottomNav (local code; awaiting Central deploy)"
]
FILES_CHANGED = [
  "app/discover/components/HomeSectionCircles.tsx",
  "app/components/AppTopNav.tsx",
  "app/components/AppMobileBottomNav.tsx",
  "docs/ai/LAPTOP_PRODUCTION_PERFORMANCE_INVESTIGATION_AND_SAFE_OPTIMIZATION_V1.md",
  "docs/ai/CURRENT_TASK.md",
  "docs/ai/PROJECT_STATE.md",
  "docs/ai/CURSOR_REPORT.md"
]
COMMITS_CREATED = []
CHANGES_PREPARED_FOR_CENTRAL = [
  "Deploy nav prefetch=false build; re-measure home fetchCount and route TTFB",
  "Optional nginx brotli enable packet",
  "Origin SSR/Node health capture packet",
  "Optional /marketplace|/commerce → /store redirects only if product confirms aliases"
]
POST_CHANGE_TTFB = UNAVAILABLE_ON_PRODUCTION
POST_CHANGE_LCP = UNAVAILABLE
POST_CHANGE_TOTAL_LOAD = UNAVAILABLE_ON_PRODUCTION
MEASURED_IMPROVEMENT = NO
IMPROVEMENT_SUMMARY = Local safe prefetch disable implemented and tested; live apex unchanged until Central deploy + re-measure
NEW_CURRENT_RELEASE_BLOCKER_FOUND = NO
CENTRAL_ACTION_REQUIRED = [
  "Deploy platform nav prefetch=false and re-probe https://umtuba.com/",
  "Optional: ENABLE_NGINX_BROTLI_OR_GZIP_VERIFY_ON_UMTUBA_APEX",
  "Optional: CAPTURE_ORIGIN_SSR_LATENCY_AND_NODE_HEALTH_FOR_UMTUBA",
  "Pre-existing: SYNC_GIT_FILE_20260921… ; PC2 LB003 (unchanged owners)"
]
LEARNING_TOUCHED = NO
COLLABORATION_TOUCHED = NO
LB003_EXECUTED = NO
MIGRATIONS_TOUCHED = NO
LAPTOP_RETURN_TO_LEARNING_FEATURE_WORK = NO
LAPTOP_STATUS_AFTER_REPORT = READY_FOR_NEXT_PERFORMANCE_CLOSEOUT
```

---

## EXECUTION_RESULT ADDENDUM — PRODUCTION ACCESS BLOCK

Recorded after Central/runtime reported inability to deploy/remeasure from a chat without executable production access.

```
EXECUTION_RESULT = BLOCKED_BY_PRODUCTION_EXECUTION_ACCESS
SOURCE_WORKTREE = C:/Users/Admin/Desktop/umtuba/umtuba-web
SOURCE_BRANCH = office/um-core-platform-manifest-validation-p2
SOURCE_HEAD = 99300de78530b25bc19dff877926919957de6d06
DEPLOYMENT_EXECUTED = NO
DEPLOYED_COMMIT = NONE
PREFETCH_OPTIMIZATION_LIVE = NOT_VERIFIED
PREFETCH_DIFF_STATUS = UNCOMMITTED_LOCAL
PREFETCH_FILES = [
  app/discover/components/HomeSectionCircles.tsx,
  app/components/AppTopNav.tsx,
  app/components/AppMobileBottomNav.tsx
]
BEFORE_HOME_RSC_REQUESTS = ~36
AFTER_HOME_RSC_REQUESTS = NOT_MEASURED_POST_DEPLOY
BEFORE_HOME_TTFB = ~0.97-1.38s
AFTER_HOME_TTFB = NOT_MEASURED_POST_DEPLOY
BEFORE_HOME_TOTAL_LOAD = ~2.0-3.0s
AFTER_HOME_TOTAL_LOAD = NOT_MEASURED_POST_DEPLOY
BEFORE_STORE_TTFB = ~1.27s
AFTER_STORE_TTFB = NOT_MEASURED_POST_DEPLOY
PREFETCH_OPTIMIZATION_EFFECTIVE = NOT_VERIFIABLE
PREFETCH_ROOT_CAUSE = OPEN_UNTIL_DEPLOYMENT_VALIDATION
MEASURED_IMPROVEMENT = NO
IMPROVEMENT_SUMMARY = No production deployment was performed; no legitimate BEFORE→AFTER improvement claim.
HOME_SSR_STILL_SLOW = NOT_REMEASURED
STORE_SSR_STILL_SLOW = NOT_REMEASURED
NEXT_PERFORMANCE_ROOT_CAUSE = PREFETCH_DEPLOYMENT_VALIDATION_FIRST
TESTS = PREVIOUS_EVIDENCE: NAV_TESTS 68 PASS
TSC = PREVIOUS_EVIDENCE: PASS
BUILD = NOT_EXECUTED_FROM_BLOCKED_RUNTIME
APPLICATION_POST_DEPLOY = NOT_APPLICABLE
NEW_CURRENT_RELEASE_BLOCKER_FOUND = NO
PRODUCTION_PUBLIC_SMOKE = HOME=LIVE · STORE=LIVE
BLOCKER_CLASSIFICATION = PRODUCTION_ACCESS_NOT_AVAILABLE
CENTRAL_ACTION_REQUIRED = [
  PROVIDE/USE_ACTUAL_LAPTOP_CURSOR_EXECUTION_CONTEXT,
  OR_PROVIDE_EXECUTABLE_GIT_AND_PRODUCTION_DEPLOY_ACCESS,
  THEN_CONTINUE_SAME_TASK_WITHOUT_NEW_GO:
    locate exact prefetch diff,
    run tests/build,
    commit clean change (explicit auth only),
    integrate via existing canonical path,
    deploy,
    prove prefetch=false behavior live,
    remeasure production
]
LEARNING_TOUCHED = NO
COLLABORATION_TOUCHED = NO
MIGRATIONS_TOUCHED = NO
LB003_EXECUTED = NO
LAPTOP_STATUS_AFTER_REPORT = BLOCKED_WAITING_EXECUTABLE_LAPTOP_OR_PRODUCTION_ACCESS
```
