# LAPTOP_HOME_SSR_LATENCY_ROOT_CAUSE_V1

**TASK_ID:** `LAPTOP_HOME_SSR_LATENCY_ROOT_CAUSE_V1`  
**WAVE:** `LAPTOP_POST_RELEASE_PERFORMANCE_QA_V4` / A1  
**Date:** 2026-08-13  
**Scope:** Source/runtime analysis only — no broad refactor, no deploy, prefetch patch not modified.

## Evidence anchors

- `app/page.tsx` — `export const dynamic = "force-dynamic"`
- `app/components/home/HomeFeedLoader.tsx` — `Promise.all([getServerUser, getDiscoverVideosServer])`
- `lib/supabase/videoPostsServer.ts` — `loadCanonicalVideoFeedPage` / `getDiscoverVideosServer`
- `lib/supabase/server.ts` — `cookies()` via `createClient` / `getServerUser`
- `lib/supabase/videoPosts.ts` — `attachPlaybackUrls` (per-post signed URL)
- `app/layout.tsx` — no cookies; client chrome only via `AppChrome`
- No root `middleware.ts` in this worktree

## HOME_FORCE_DYNAMIC_REASON

```
HOME_FORCE_DYNAMIC_REASON = [
  "Explicit export const dynamic = \"force-dynamic\" on app/page.tsx (blocks Full Route Cache / static HTML)",
  "HomeFeedLoader always calls getServerUser() which uses cookies() — dynamic even without the export",
  "getDiscoverVideosServer → loadCanonicalVideoFeedPage also createClient()+getServerUser() (cookie-bound)",
  "Personalized feed needs viewer like/save/follow state before first paint of DiscoverExperience"
]
```

## HOME_SSR_ROOT_CAUSES

Dominant (ordered):

1. **Mandatory dynamic SSR** — `force-dynamic` + cookie auth on every `/` request → TTFB cannot be CDN-static.
2. **Deep sequential Supabase waterfall inside `loadCanonicalVideoFeedPage`** after the posts query:
   - `createClient` → `getServerUser`
   - posts `select` (possible **retry** without `article_id` column on schema miss)
   - optional focus-post query
   - **`attachPlaybackUrls`** — N signed-URL ops (parallel per post, but still storage/auth RTT on critical path)
   - `enrichAuthorUserIdsFromProfiles`
   - `loadViewerInteractionState`
   - optional `listArticleTitlesByIds`
   - `loadViewerFollowingSet`
3. **Duplicate auth work** — `HomeFeedLoader` awaits `getServerUser` **and** `loadCanonicalVideoFeedPage` calls `getServerUser` again (and its own `createClient`).
4. **Suspense does not hide TTFB** — document still waits on `HomeFeedLoader` for meaningful HTML; fallback does not replace the need for feed data in the streamed primary path as measured by document TTFB.
5. **Layout** — root layout is not the cookie culprit; `AppChrome` is client-only. Middleware file absent here (deploy may differ — unconfirmed).

Not dominant for document TTFB (separate amp): Link prefetch storm (owned by Central prefetch handoff).

```
HOME_SSR_ROOT_CAUSES = [
  "force-dynamic + cookies() auth on every home request",
  "Sequential post-query enrichment waterfall in loadCanonicalVideoFeedPage (signed URLs, viewer state, follows, articles)",
  "Duplicate getServerUser/createClient between HomeFeedLoader and loadCanonicalVideoFeedPage",
  "Possible double posts query when article_id column missing (error then retry)",
  "No HTML Full Route Cache / no short ISR for anonymous shell"
]
```

## SAFE_OPTIMIZATION_CANDIDATES

(Smallest first; do not implement in this wave)

1. **Deduplicate auth** — pass `user` from `HomeFeedLoader` into feed loader; remove inner `getServerUser` / share one `createClient`.
2. **Defer non-critical viewer enrichment** — ship anonymous playback first; load likes/follows/saves via client or nested Suspense (keep auth truth, reduce TTFB).
3. **Anonymous shell caching** — for signed-out users, cache public feed HTML/RSC briefly (`revalidate` / `unstable_cache` on posts query only) while keeping viewer overlays dynamic.
4. **Cap / batch signed URLs** — sign only first 1–3 videos for LCP; lazy-sign rest.
5. **Remove redundant `force-dynamic` only after** cookie usage is scoped — export alone is not enough; must change cookie boundary first.
6. **Prefetch=false deploy** (already handed to Central) — reduces origin contention, not intrinsic SSR cost of `/`.

```
SAFE_OPTIMIZATION_CANDIDATES = [
  "Deduplicate getServerUser/createClient across HomeFeedLoader and loadCanonicalVideoFeedPage",
  "Defer viewer interaction/follow enrichment off the HTML critical path",
  "Sign playback URLs only for above-the-fold videos on first paint",
  "Short-TTL cache for anonymous public feed query",
  "Central: deploy prefetch=false to reduce competing RSC load on origin"
]
```

## EXPECTED_IMPACT

```
EXPECTED_IMPACT = [
  "Auth dedupe: small but reliable (one less Auth getUser RTT) — tens of ms",
  "Defer viewer enrichment: medium — removes 2–3 sequential Supabase round-trips from TTFB",
  "Above-fold signed URLs only: medium — cuts N storage sign RTTs on cold home",
  "Anonymous feed cache: large for signed-out TTFB if safe — can move / toward sub-400ms HTML when warm",
  "Prefetch deploy: improves navigation contention; modest effect on isolated / TTFB"
]
```
