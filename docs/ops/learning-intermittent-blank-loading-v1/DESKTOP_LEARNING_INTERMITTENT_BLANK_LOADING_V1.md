# DESKTOP_LEARNING_INTERMITTENT_BLANK_LOADING_V1

```
TASK_ID = DESKTOP_LEARNING_INTERMITTENT_BLANK_LOADING_V1
STATUS = COMPLETE
DATE = 2026-08-24
MACHINE = DESKTOP
OPERATOR = DESKTOP / WEB LEARNING
PRIOR_DEPLOYMENT_SHA = a29a329ddf21c4aa2b7d55887b2b276a12447892
PRIOR_RELEASE = a29a329d-20260824111302
PRIOR_STATUS = FINAL_LEARNING_PRODUCTION_STATUS_PASS_BUT_NEW_OWNER_RUNTIME_EVIDENCE_REOPENS_GATE
LIVE_PRODUCTION_BEFORE_THIS_FIX = /opt/umtuba/production/releases/6d1a2b45-20260824115820
AFFECTED_EXAMPLE = https://umtuba.com/learning/catalog/ja-18
LIVE_LEARNING_URL = https://umtuba.com/learning
ROOT_CAUSE = DATA_FETCH_LATENCY
ROOT_CAUSE_DETAIL = SUPABASE_REQUEST_WATERFALL + AUTH_SESSION_WAIT + LOADING_BOUNDARY
REPRODUCED = YES
FIX = YES
SOURCE_SHA = db1b6bad924b7f654537dbdc182fce067ef8f298
CHERRY_PICK_BASE = 6d1a2b45f (origin/alpha-0.2 live tip after Store deploy)
ISOLATED_FIX_ON_A29 = 99bb02c1a7f1e09aa8ec012bf09aebf715cb2587
TESTS = PASS
TYPECHECK = PASS
BUILD = PASS
REPEATED_NAVIGATION = PASS
LIVE_DEPLOYED = YES
LIVE_RELEASE = /opt/umtuba/production/releases/db1b6bad-20260824171946
HOST_BUILD_ID = 0sv3vdbmI1RYKfZ55P0Nn
LIVE_RETEST = PASS
FINAL_STATUS = PASS
WORKTREE = C:\Users\1\Desktop\umtuba\umtuba-web\worktrees\DESKTOP-LEARNING-INTERMITTENT-BLANK-LOADING-V1
BRANCH = desktop/learning-intermittent-blank-loading-v1-live
PUSHED = YES
MIGRATION_20260934_APPLIED = NO
MOBILE_NATIVE_TOUCHED = NO
ROLLBACK_TARGET = /opt/umtuba/production/releases/6d1a2b45-20260824115820
```

## Evidence before the fix

Live guest TTFB on prior Learning release (SHA `a29a329`):

| URL | tries (ms) |
| --- | --- |
| `https://umtuba.com/healthz` | 326 / 95 / 97 |
| `https://umtuba.com/learning` | 1584 / 637 / 597 |
| `https://umtuba.com/learning/catalog/ja-18` | 2062 / 2281 / 1498 |

`ja-18` spent 1.5–2.3s on the server before HTML. Root layout `body` is `#050510`. Client navigations unmounted the previous Learning tree immediately. `app/learning/loading.tsx` was async and awaited `resolveRequestLocale()` (`cookies()` + `headers()`), so the fallback itself could not paint instantly. The owner-visible result was a prolonged nearly blank dark screen.

Course landing critical path (before):

1. `generateMetadata` → `loadPublicCourseBySlug` (course + settings + sections + lessons + preview RPC)
2. Page → same slug load again (no request cache)
3. `getServerUser()` → `auth.getUser()` even for guests
4. reviews
5. **full** `listPublicCatalogCourses` (every public course + every published section + every published lesson) just to pick 3 related cards

Home was the same full catalog recount on every request, sequenced after Auth.

## Root cause

**`DATA_FETCH_LATENCY`** (primary), composed of evidenced secondary classes:

- **`SUPABASE_REQUEST`**: sequential public catalog/course waterfalls; course page recounted the entire catalog.
- **`AUTH_SESSION_WAIT`**: guest Learning pages still called `getUser()`.
- **`LOADING_BOUNDARY`**: async locale-awaiting `loading.tsx` delayed the navy shell.
- **`ROUTE_TRANSITION`**: `force-dynamic` unmount left only the dark body until RSC finished.

Not a client runtime exception. Not hidden by a spinner-only overlay.

## Fix (Learning web only)

1. Instant sync `app/learning/loading.tsx` → client `LearningRouteLoading` matching VisualShell (navy, pills, hero + card skeletons). No locale/auth I/O.
2. Guest Auth skip when no `*-auth-token` cookie (`getLearningViewerUser`). Signed-in traffic still uses `getUser()`.
3. Request-scoped React `cache()` so metadata + page share one course load.
4. `unstable_cache` 30s for cookie-free public catalog/course reads (`createLearningPublicClient`).
5. Course related rail uses `listRelatedPublicCourses` (3 cards + counts for those IDs only).
6. Parallelize home `viewer + catalog`, course `viewer + reviews + related`, and slug `settings + sections + preview`.

Cherry-pick onto live `6d1a2b4` (Store productization landed after `a29a329`). Deploying `99bb02c` on `a29a329` would have rolled Store back. Conflict-free cherry-pick → `db1b6ba`.

## Gates

| Gate | Result |
| --- | --- |
| Targeted vitest | PASS (productization/loading/viewer + teacher/visual set; 10/10 on live-based SHA) |
| `npx tsc --noEmit` | PASS |
| Local `npm run build` | PASS |
| Local repeated nav `:3022` | PASS — warm `/learning` ~250–280ms; warm `ja-18` ~425–788ms; `lang=ar dir=rtl` |
| Host `npm ci` + `npm run build` | PASS `BUILD_ID=0sv3vdbmI1RYKfZ55P0Nn` |
| healthz after switch | `200 umtuba-production-ok` |

## Live retest (not localhost)

After switch, guest TTFB:

| URL | tries (ms) |
| --- | --- |
| healthz | 380 / 96 / 98 / 107 |
| `/learning` | 718 / 393 / 328 / 319 |
| `/learning/catalog/ja-18` | 750 / 777 / 359 / 449 |

Playwright repeated nav + screenshots: `docs/ops/learning-intermittent-blank-loading-v1/screenshots/`.

- Desktop + mobile-web home and `ja-18` show `learning-visual-root` and live catalog/course chrome.
- Arabic RTL: `lang=ar dir=rtl` on `/learning` and `/learning/catalog/ja-18`.
- One Playwright `ja-18` goto was 3.3s DCL (cold/spike) but the visual root and course text were present — not a featureless blank.
- Subsequent live navigations were sub-second to ~1.1s with full content.

## Security

- No secrets printed. Host env sourced on the existing path only.
- Auth not weakened: guests skip Auth network; cookie-present sessions still validate with `getUser()`.
- No RLS change. No fake courses/enrollments. `20260934` not applied.
- Isolated branches only. No force-push. Parent dirt not committed.

## Rollback

```text
ln -sfn /opt/umtuba/production/releases/6d1a2b45-20260824115820 /opt/umtuba/production/current
systemctl restart umtuba-production.service
```

Previous Learning-only rollback `cfc57402-20260822184650` and `a29a329d-20260824111302` remain on the host.
