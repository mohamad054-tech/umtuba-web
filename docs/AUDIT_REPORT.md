# UMTUBA repository audit

**Date:** 13 September 2026  
**Checkout:** `C:/Users/Giga store/Desktop/umtuba/umtuba-web-translation-trunk-port-v1`  
**Git branch:** `pc2/umtuba-communications-v1-part1b-identity-discovery`  
**Remote HEAD:** `origin/HEAD` → `origin/alpha-0.2`  
**Method:** read-only inspection of files, migrations, env *names* in `.env.example`, git metadata, `npm audit --omit=dev`, `npm run lint`, and limited HTTPS HEAD checks of https://umtuba.com. No application source was modified. No `.env.local` values were read. No secrets are printed.

**Companion file:** `docs/AUDIT_REPORT_2.md` — sections 8–14 plus schema column appendix.

---

## Section 1 — Stack & environment

| Item | Value | Evidence |
|---|---|---|
| App name / version | `umtuba-web` `0.1.0` private | `package.json:2-4` |
| Framework | Next.js **16.2.10** (App Router; `proxy.ts` instead of root `middleware.ts`) | `package-lock.json` `node_modules/next`; `proxy.ts:1-16`; `next.config.ts:1-10` |
| React | **19.2.4** (`react`, `react-dom`) | lockfile |
| TypeScript | **5.9.3** | lockfile; `package.json:44` `^5.9.3` |
| Package manager | **npm** (`package-lock.json` lockfileVersion **3**) | `package-lock.json:4` |
| Node required | **UNKNOWN — no `.nvmrc`, no `package.json` `engines` field.** Local machine that ran this audit: Node `v24.19.0`, npm `11.17.0`. `@types/node` is `^20`. |
| Hosting config in repo | **No** `vercel.json`, `netlify.toml`, `Dockerfile`, or `fly.toml`. `.vercel` is gitignored (`.gitignore:44-45`). |
| Live hosting evidence | Production https://umtuba.com responds with **nginx** + Next.js (`Server: nginx`, `x-nextjs`-style `Vary: rsc, next-router-state-tree`). Deploy target **not declared in this checkout**. |
| CI | One workflow: `.github/workflows/prune-stale-live-participants.yml` (cron prune RPC). **No** test/lint/build CI. |

### TypeScript `compilerOptions` that matter (`tsconfig.json:2-24`)

| Option | Value |
|---|---|
| `strict` | `true` (`tsconfig.json:7`) |
| `noUncheckedIndexedAccess` | **absent** (TypeScript default: off) |
| `skipLibCheck` | `true` |
| `noEmit` | `true` |
| `target` | `ES2017` |
| `jsx` | `react-jsx` |
| paths | `@/*` → `./*` |

### Dependencies (resolved versions from lockfile)

**Runtime:** `@react-three/drei` (range `^10.7.7`), `@react-three/fiber` `^9.6.1`, `@supabase/ssr` `0.12.0`, `@supabase/supabase-js` `2.110.2`, `@types/three` `^0.185.1`, `livekit-client` `2.20.1`, `livekit-server-sdk` (range `^2.17.0`), `mapbox-gl` `3.26.0`, `next` `16.2.10`, `react` `19.2.4`, `react-dom` `19.2.4`, `react-globe.gl` (range `^2.38.0`), `three` `0.185.1`.

**Dev:** `@tailwindcss/postcss` `^4`, `@types/node` `^20`, `@types/react` `19.2.17`, `@types/react-dom` `19.2.3`, `eslint` `9.39.4`, `eslint-config-next` `16.2.10`, `playwright` `^1.49.0`, `tailwindcss` `4.3.2`, `typescript` `5.9.3`, `vitest` `3.2.7`.

**Duplication / unmaintained flags (from declared deps only):**

- **Three.js stack is duplicated in purpose:** `three` + `@types/three` + `@react-three/fiber` + `@react-three/drei` + `react-globe.gl` (all 3D). Not two date libraries. Not two Redux/Zustand stores (none declared).
- **Two Supabase clients** (`@supabase/ssr` + `@supabase/supabase-js`) — expected pairing, not a fork.
- **Two LiveKit packages** (browser + server SDK) — expected.
- **No `zod`** in `package.json` — input validation is hand-rolled (`sanitizeWorldSearchRequest`, `validateCaption`, FormData parsers).
- Unmaintained status of each npm package over time: **UNKNOWN — not inferred from last-publish dates in this pass.**

### Env *names* documented (`.env.example` only; values not read)

Public: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (alias), `NEXT_PUBLIC_LIVEKIT_URL`, `NEXT_PUBLIC_ALLOW_SURFACE_PREVIEWS`, `NEXT_PUBLIC_HOME_CIRCULAR_ARC_PREVIEW`, `NEXT_PUBLIC_VERCEL_ENV`, `NEXT_PUBLIC_STORE_SHOW_*` flags (see §3).

Server-only *names* in example: `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`, `UMTUBA_PLATFORM_ADMIN_IDS`, `UMTUBA_AI_MODE`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, `GEMINI_API_KEY`, `GEMINI_BASE_URL`, `GEMINI_MODEL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL`, `LOCAL_AI_BASE_URL`, `LOCAL_AI_MODEL`, `LOCAL_AI_API_KEY`, `UMTUBA_AI_ALLOW_STUB`, `UMTUBA_AI_STREAMING`, `UMTUBA_AI_TIMEOUT_MS`, `UMTUBA_AI_MAX_INPUT_CHARS`, `UMTUBA_AI_MAX_CONTEXT_CHARS`, `UMTUBA_AI_RATE_LIMIT_PER_MINUTE`, `APPLE_TEAM_ID`, `ANDROID_APP_LINKS_SHA256`, `CJ_API_KEY`, `CJ_API_KEY_ROTATED`, `CJ_ORDER_FULFILLMENT_ENABLED`, `PRODUCT_LOCALIZATION_PROVIDER`.

`.env.example:18-19` states the Next app must **not** contain `SUPABASE_SERVICE_ROLE_KEY`. Workers `scripts/media/articleTeaserWorker.ts:42` and `scripts/media/mediaWorker.ts:39-40` **do** read that name (server scripts, not the Next client bundle).

Disk also has gitignored `.env.local` and `.env.local.hosted.bak` (tree listing). **Not opened.**

---

## Section 2 — Route map

**Scope:** `app/**/page.tsx` = **187** unique routes (no `pages/` directory).  
**Global rendering fact:** root layout calls `resolveRequestLocale()` which uses `cookies()` + `headers()` (`app/layout.tsx:29-30`, `lib/i18n/server.ts:23-28`). That opts the tree into **dynamic SSR** even when a page omits `export const dynamic`.  
**Auth gate (middleware):** `proxy.ts:4-5` → `lib/supabase/middleware.ts` + `PROTECTED_PREFIXES` in `lib/env/supabaseAuthGate.ts:8-28`.  
**Nav (official chrome):** desktop Home / World / Learning / Live / Messages (`app/lib/nav/routes.ts:93-99`). Mobile: Home / Live / Messages / Profile (`app/lib/nav/platformNavContract.ts:28-41`). User menu adds Profile, Create, Saved, Learning, Rewards, Notifications, Settings, Store, Wishlist, Advertise (+ Instructor/Seller/Admin by capability) (`app/lib/nav/userMenuItems.ts:34-80`). Home circles: Learning, Store, Games, Live, World, Search, Messages, Create video (`platformNavContract.ts:47-56`).

Legend — **Auth:** `MW` = middleware prefix; `PAGE` = page-level `getServerUser`/redirect observed on that file or its pattern; `PUBLIC` = not in `PROTECTED_PREFIXES`.  
**Render:** `RSC+dyn` = server component + cookies-forced dynamic; `force-dynamic` = also sets `export const dynamic = "force-dynamic"`; `CSR` = `"use client"` at top of page.  
**Meta:** `Y` = `metadata` or `generateMetadata` on the page (or its layout).  
**Robots:** `noindex` only when this checkout sets it; else `inherit` (root `buildRootMetadata` does **not** set `robots`, so crawlers may index unless robots.txt disallows).  
**Status:** `SHIPPED` usable product surface; `PARTIAL` real UI but incomplete/gated/noindex; `STUB` placeholder / coming-soon / prod `notFound` / honest empty; `DEAD` not linked from official chrome (may still be typed URL).

### 2.1 Table (all 187 routes)

| Route | File | Public/Auth | Rendering | dynamic/revalidate | Meta | robots | Status |
|---|---|---|---|---|---|---|---|
| `/` | `app/page.tsx` | PUBLIC | RSC+dyn | `force-dynamic` (`app/page.tsx:7`) | Y `homeFeedMetadata` | inherit (index via `routeMetadata.ts:22-27`) | SHIPPED |
| `/welcome` | `app/welcome/page.tsx` | PUBLIC | RSC+dyn | none | Y | index | PARTIAL (former landing; not primary nav) |
| `/discover` | `app/discover/page.tsx` | PUBLIC | RSC+dyn | `force-dynamic` | N on page | inherit (alias of Home) | SHIPPED |
| `/watch` | `app/watch/page.tsx` | PUBLIC | RSC+dyn | `force-dynamic` | Y | index | SHIPPED |
| `/live` | `app/live/page.tsx` | PUBLIC | RSC+dyn | none | Y | index | SHIPPED |
| `/live/[roomId]` | `app/live/[roomId]/page.tsx` | PUBLIC | RSC+dyn | none | N | inherit | SHIPPED |
| `/live/media-lab` | `app/live/media-lab/page.tsx` | PUBLIC | RSC+dyn | none | N | robots.txt disallow | STUB / DEAD (lab; not chrome) |
| `/messages` | `app/messages/page.tsx` | MW | RSC+dyn | `force-dynamic` | Y | noindex `routeMetadata.ts:78-83` | SHIPPED |
| `/notifications` | `app/notifications/page.tsx` | MW | RSC+dyn | none | Y | noindex | SHIPPED |
| `/settings` | `app/settings/page.tsx` | MW | RSC+dyn | none | Y | noindex | SHIPPED |
| `/saved` | `app/saved/page.tsx` | MW | RSC+dyn | `force-dynamic` | Y | noindex | SHIPPED |
| `/rewards` | `app/rewards/page.tsx` | MW | RSC+dyn | none | Y | noindex | PARTIAL |
| `/search` | `app/search/page.tsx` | PUBLIC | RSC+dyn | `force-dynamic` | Y | index | SHIPPED |
| `/login` | `app/login/page.tsx` | PUBLIC (auth entry) | CSR | none (layout meta) | layout | noindex | SHIPPED |
| `/signup` | `app/signup/page.tsx` | PUBLIC | RSC+dyn | none | layout | noindex | SHIPPED |
| `/register` | `app/register/page.tsx` | PUBLIC | RSC+dyn | none | layout | noindex | PARTIAL (duplicate of signup) |
| `/forgot-password` | `app/forgot-password/page.tsx` | PUBLIC | CSR | none | layout | noindex | SHIPPED |
| `/auth/update-password` | `app/auth/update-password/page.tsx` | PUBLIC | CSR | none | layout | noindex | SHIPPED |
| `/create/video` | `app/create/video/page.tsx` | MW | RSC+dyn | `force-dynamic` | Y | noindex | SHIPPED |
| `/create/article` | `app/create/article/page.tsx` | MW | RSC+dyn | `force-dynamic` | Y | noindex | SHIPPED |
| `/profile` | `app/profile/page.tsx` | PUBLIC (resolver) | RSC+dyn | `force-dynamic` | N | inherit | SHIPPED |
| `/profile/[username]` | `app/profile/[username]/page.tsx` | PUBLIC | RSC+dyn | none | `generateMetadata` | index when found (`lib/site/metadata.ts:248-252`) | SHIPPED |
| `/u/[username]` | `app/u/[username]/page.tsx` | PUBLIC | RSC+dyn | `force-dynamic` | N | inherit | PARTIAL (comms identity) |
| `/invite/[code]` | `app/invite/[code]/page.tsx` | PUBLIC | RSC+dyn | none | `generateMetadata` | inherit | SHIPPED |
| `/articles/[articleId]` | `app/articles/[articleId]/page.tsx` | PUBLIC | RSC+dyn | `force-dynamic` | `generateMetadata` | inherit | SHIPPED |
| `/terms` | `app/terms/page.tsx` | PUBLIC | RSC+dyn | none | Y | index | SHIPPED |
| `/privacy` | `app/privacy/page.tsx` | PUBLIC | RSC+dyn | none | Y | index | SHIPPED |
| `/post-journey` | `app/post-journey/page.tsx` | PUBLIC | RSC+dyn | none | Y | index | PARTIAL / DEAD (secondary; not chrome) |
| `/feed` | `app/feed/page.tsx` | PUBLIC | RSC+dyn | none | N | robots disallow | STUB (`notFound` in production, `app/feed/page.tsx:14-16`) |
| `/journey-pro` | `app/journey-pro/page.tsx` | PUBLIC | RSC+dyn | none | N | robots disallow | STUB (`notFound` in prod, `app/journey-pro/page.tsx:10-12`) |
| `/city/[citySlug]` | `app/city/[citySlug]/page.tsx` | PUBLIC | RSC+dyn | none | N | robots `/city` | STUB (prod empty state `app/city/[citySlug]/page.tsx:27-38`) |
| `/games` | `app/games/page.tsx` | PUBLIC | RSC+dyn | none | Y | **index** (`routeMetadata.ts:36-41`) | STUB (“Unavailable in this Beta”, `app/games/page.tsx:23-29`) |
| `/world` | `app/world/page.tsx` | PUBLIC | RSC+dyn | `force-dynamic` | Y | **noindex** `app/world/page.tsx:11` | PARTIAL |
| `/world/search` | `app/world/search/page.tsx` | PUBLIC | RSC+dyn | `force-dynamic` | Y | noindex `:13` | PARTIAL |
| `/world/city/[citySlug]` | `app/world/city/[citySlug]/page.tsx` | PUBLIC | RSC+dyn | `force-dynamic` | `generateMetadata` | noindex `:26` | PARTIAL |
| `/world/place/[placeSlug]` | `app/world/place/[placeSlug]/page.tsx` | PUBLIC | RSC+dyn | none | N | inherit | PARTIAL |
| `/learning` | `app/learning/page.tsx` | PUBLIC hub | RSC+dyn | `force-dynamic` | Y | inherit | SHIPPED |
| `/learning/catalog` | `app/learning/catalog/page.tsx` | PUBLIC | RSC+dyn | `force-dynamic` | Y | inherit | SHIPPED |
| `/learning/catalog/[courseSlug]` | `app/learning/catalog/[courseSlug]/page.tsx` | PUBLIC | RSC+dyn | `force-dynamic` | `generateMetadata` | inherit | SHIPPED |
| `/learning/courses/[courseId]` | `app/learning/courses/[courseId]/page.tsx` | PAGE login | RSC+dyn | `force-dynamic` | `generateMetadata` | inherit | SHIPPED |
| `/learning/courses/[courseId]/progress` | `…/progress/page.tsx` | PAGE | RSC+dyn | `force-dynamic` | N | inherit | SHIPPED |
| `/learning/courses/[courseId]/resources` | `…/resources/page.tsx` | PAGE | RSC+dyn | `force-dynamic` | N | inherit | SHIPPED |
| `/learning/courses/[courseId]/calendar` | `…/calendar/page.tsx` | PAGE | RSC+dyn | `force-dynamic` | N | inherit | PARTIAL |
| `/learning/courses/[courseId]/community` + qa/discussions/announcements + `[threadId]`/`[questionId]` | under `app/learning/courses/[courseId]/community/` | PAGE | RSC+dyn | `force-dynamic` on listed files | N | inherit | PARTIAL |
| `/learning/courses/[courseId]/live` + `/[sessionId]` | same tree | PAGE | RSC+dyn | `force-dynamic` | N | inherit | PARTIAL |
| `/learning/lessons/[lessonId]` | `app/learning/lessons/[lessonId]/page.tsx` | PAGE | RSC+dyn | `force-dynamic` | `generateMetadata` | inherit | SHIPPED |
| `/learning/lessons/[lessonId]/ai-tutor` | `…/ai-tutor/page.tsx` | PAGE | RSC+dyn | `force-dynamic` | N | inherit | PARTIAL (AI flag-gated) |
| `/learning/activities/[activityId]` + assignment/lab/project/assessment + attempts | `app/learning/activities/**` | PAGE | RSC+dyn | `force-dynamic` | some `generateMetadata` | inherit | SHIPPED/PARTIAL |
| `/learning/attempts/[attemptId]` | `app/learning/attempts/[attemptId]/page.tsx` | PAGE | RSC+dyn | `force-dynamic` | `generateMetadata` | inherit | SHIPPED |
| `/learning/transcript` | `app/learning/transcript/page.tsx` | PAGE | RSC+dyn | `force-dynamic` | N | inherit | PARTIAL |
| `/learning/instructor` + bootstrap/review/spaces/programs/courses/** | `app/learning/instructor/**` | PAGE (not MW) | RSC+dyn | most `force-dynamic` | N | inherit | PARTIAL (capability menu) |
| `/store` | `app/store/page.tsx` | PUBLIC | RSC+dyn | `force-dynamic` | Y | inherit | SHIPPED |
| `/store/search` | `app/store/search/page.tsx` | PUBLIC | RSC+dyn | `force-dynamic` | Y | inherit | SHIPPED |
| `/store/p/[slug]` | `app/store/p/[slug]/page.tsx` | PUBLIC | RSC+dyn | `force-dynamic` | N | inherit | SHIPPED |
| `/store/products/[productId]` | `app/store/products/[productId]/page.tsx` | PUBLIC | RSC+dyn | none | N | inherit | SHIPPED |
| `/store/shops/[shopId]` | `app/store/shops/[shopId]/page.tsx` | PUBLIC | RSC+dyn | none | N | inherit | SHIPPED |
| `/store/[storeSlug]` | `app/store/[storeSlug]/page.tsx` | PUBLIC | RSC+dyn | none | `generateMetadata` | inherit | SHIPPED |
| `/store/[storeSlug]/product/[productSlug]` | `…/product/[productSlug]/page.tsx` | PUBLIC | RSC+dyn | none | `generateMetadata` | inherit | SHIPPED |
| `/store/cart` | `app/store/cart/page.tsx` | MW | RSC+dyn | none | Y | inherit | SHIPPED |
| `/store/checkout` | `app/store/checkout/page.tsx` | MW | RSC+dyn | none | Y | inherit | PARTIAL (payment capture deferred — copy in i18n `store.live.browseNotice`) |
| `/store/orders` + `/[orderId]` | `app/store/orders/**` | MW | RSC+dyn | none | Y / N | inherit | SHIPPED |
| `/store/wishlist` | `app/store/wishlist/page.tsx` | MW | RSC+dyn | none | Y | inherit | SHIPPED |
| `/seller` + apply/setup/products/** + `/seller/store/**` | `app/seller/**` | MW | RSC+dyn | none (metadata on many) | mixed | inherit | PARTIAL |
| `/advertise` | `app/advertise/page.tsx` | PUBLIC | RSC+dyn | none | Y | inherit | PARTIAL |
| `/advertise/apply` + dashboard/campaigns/**/creatives/settings | `app/advertise/**` | MW except landing | RSC+dyn | none | mixed | inherit | PARTIAL |
| `/admin/ads/**` `/admin/store/**` `/admin/ai` `/admin/ai-data/**` `/admin/knowledge/**` `/admin/private-ai/**` `/admin/translation-studio/**` | `app/admin/**` | MW | RSC+dyn | none | most Y | inherit (robots.txt live disallows `/admin`) | PARTIAL (internal) |
| `/ai-hub` + `/ai-hub/assistant` | `app/ai-hub/**` | PUBLIC (not MW) | RSC+dyn | `force-dynamic` | N | inherit | STUB + **not live** (prod HEAD 404) |
| `/creator/insights` | `app/creator/insights/page.tsx` | MW (`/creator`) | RSC+dyn | none | N | robots `/creator` | DEAD (not chrome) |
| `/sandbox/**` (digital-asset, learning/partners, store/cj-*) | `app/sandbox/**` | PUBLIC (not MW) | RSC+dyn | several `force-dynamic`; layouts `robots: noindex` | mixed | live robots `/sandbox` | DEAD (prod `/sandbox/store/cj-pilot` HEAD **404**) |

Learning instructor/course/activity rows above collapse sibling files that share the same auth/render pattern; every file still exists (187 total). Full path list is the inventory in the audit working notes (every `app/**/page.tsx`).

### 2.2 Routes in repo that are **not live** on https://umtuba.com

Evidence: HTTPS HEAD, 13 Sep 2026, `curl.exe` as Mozilla/5.0 (earlier in this audit). WebFetch without that UA got `422`/`500` on some URLs — treat UA-less fetch as unreliable.

| Route | Live result | Repo |
|---|---|---|
| `/ai-hub` | **404** | page exists (`app/ai-hub/page.tsx`) |
| `/sandbox/store/cj-pilot` | **404** | page exists |
| `/admin/ai` | **307** → `/login?next=…` | exists (gated, so *route is deployed*) |
| `/`, `/terms`, `/privacy`, `/store`, `/learning`, `/world`, `/games`, `/watch` | **200** | exist |
| `/video-sitemap.xml` | **200** | **NO file in this checkout** (0 matches for `video-sitemap`) |
| Live `robots.txt` | extra disallows vs repo (`/following`, `/sandbox`, `/store/demo-preview`, `/life/compose`, `/learning/instructor`, `/learning/attempts`, `/admin`, `/seller`, `/advertise/dashboard`, `/store/cart|checkout|orders|wishlist`, second sitemap) | `app/robots.ts` + `lib/site/indexing.ts:17-34` are **narrower** |

**Conclusion:** production is **not the same revision as this branch**. This checkout is behind or on a different line than umtuba.com.

### 2.3 Nav links that do not exist

Official chrome hrefs (`APP_NAV_ITEMS`, mobile nav, user menu, home circles) all map to existing `page.tsx` files.  
`FORBIDDEN_OFFICIAL_CHROME_PATHS` includes `/ai`, `/uconnect`, `/ideas` (`app/lib/nav/secondarySurfaceContract.ts:72-80`) — **no** `app/ai/page.tsx` or `/uconnect` / `/ideas` pages found. Those are forbidden labels, not broken primary links.

`APP_ROUTES.contact` is `/u` (`routes.ts:12`) — **not** a Contact-us page.

Broken-link UNKNOWN for arbitrary in-content `<Link>` hrefs across 187 pages — not exhaustively crawled.

---

## Section 3 — Feature flags & hidden work

### 3.1 Env / runtime gates

| Flag / gate | Default | Effect | Evidence |
|---|---|---|---|
| `NEXT_PUBLIC_ALLOW_SURFACE_PREVIEWS` | unset: Watch/Live **dev** previews ON; Messenger fake presence **OFF** unless `1` | Hides Watch demo panels, Live collab mocks, messenger dots in production | `app/lib/product/surfaceGates.ts:13-101`; `.env.example:47-52` |
| `isExperimentalRouteAvailable` | off when `NODE_ENV===production` | `/feed`, `/journey-pro`, `/city` prototype | `surfaceGates.ts:44-48`; pages cited in §2 |
| `NEXT_PUBLIC_STORE_SHOW_LIVE_SHOPPING` and `SHOW_SHOPPABLE_VIDEO_RAIL`, `SHOW_FLASH_DEALS`, `SHOW_BRAND_RAIL`, `SHOW_PROFILE_*`, `SHOW_PDP_REVIEWS_PLACEHOLDER`, `SHOW_FOLLOW_UI`, `SHOW_SANDBOX_CATALOG` | all require `=== "1"` | Unfinished store merchandising off | `lib/store/storefrontFlags.ts:10-33` |
| `NEXT_PUBLIC_STORE_SHOW_SANDBOX_CATALOG` | off | Hides `UMTUBA_E2E_*` sandbox catalog | `lib/store/sandboxCatalog.ts:73` |
| `NEXT_PUBLIC_HOME_CIRCULAR_ARC_PREVIEW` | off unless `1` | Home circular-arc preview | `app/components/home/circularArc/homeCircularArcFlags.ts:11-33` |
| `UMTUBA_AI_HUB` | off unless `1`/`true` | AI Hub | `lib/ai/hub/featureFlag.ts:14-21` |
| `UMTUBA_AI_ASSISTANT_RUNTIME` | off | Assistant runtime | `lib/ai/assistant/runtime/featureFlag.ts:14-23` |
| `UMTUBA_AI_MODE` | documented `disabled` | AI providers | `.env.example:57-61` |
| `CJ_ORDER_FULFILLMENT_ENABLED` | `false` in example | CJ orders | `.env.example:103` |
| `PRODUCT_LOCALIZATION_PROVIDER` | `local` | No paid LLM for catalog until GO | `.env.example:109` |
| `APPLE_TEAM_ID` / `ANDROID_APP_LINKS_SHA256` unset | AASA / assetlinks **404** | `app/.well-known/*/route.ts` |
| Ads / games `featureFlags` | in-domain objects, default-off placements | `lib/ads/platform/*`, `lib/games/gamesCatalog.ts:73-82` |

### 3.2 TODO / placeholder sweep

Loose regex `TODO|FIXME|HACK|XXX|coming soon|placeholder|mock|demo|dummy|lorem` (excludes `node_modules`, `.next`, `worktrees`):

| Directory | Approx hits |
|---|---|
| `docs/` | 1072 |
| `lib/` | 859 |
| `app/` | 463 |
| `data/` | 237 |
| `supabase/` | 20 |
| `scripts/` | 4 |
| `public/` | 6 |
| **Total (ts/tsx/md/sql)** | **~1561** |

Tight `\b(TODO|FIXME|HACK|XXX)\b` in `app/**/*.ts(x)`: **0 matches**. Markers are mostly “demo/placeholder/mock” product language, not classic TODOs.

**20 significant hidden / unfinished surfaces:**

1. `app/feed/page.tsx:14-16` — production `notFound()`  
2. `app/journey-pro/page.tsx:10-12` — production `notFound()`  
3. `app/city/[citySlug]/page.tsx:27-38` — production empty “being prepared”  
4. `app/games/page.tsx:23-29` — indexed hub that says play is unavailable  
5. `app/lib/product/surfaceGates.ts:61-73` — Watch demo / prototype panels never in production  
6. `app/lib/product/surfaceGates.ts:75-87` — Live collab mocks never in production  
7. `lib/store/storefrontFlags.ts:10-33` — store rails/tabs off  
8. `lib/store/sandboxCatalog.ts:73` — E2E catalog hidden  
9. `app/ai-hub/page.tsx` + `lib/ai/hub/featureFlag.ts:14-21` — hub default off; **404 live**  
10. `lib/ai/assistant/runtime/featureFlag.ts:14-23` — assistant default off  
11. `app/sandbox/**` — WIP; **404 live**  
12. `app/live/media-lab/page.tsx` — lab  
13. `lib/site/indexing.ts:7-13` — `/feed`, `/journey-pro`, `/city` called “gated labs”  
14. `.env.example:47-52` — surface previews  
15. `app/lib/nav/secondarySurfaceContract.ts:32-68` — secondary surfaces  
16. Learning live prod preload of `/demo/learning/covers/*.svg` (HEAD `Link` on `/learning`) — demo assets on production  
17. `public/videos/demo-1.mp4` etc. committed (see §12)  
18. `app/learning/catalog/[courseSlug]/page.tsx:80-83` — cover `alt=""`  
19. Store copy: “Payment capture is not enabled” (`lib/i18n/messages/en.ts:532-533`)  
20. Translation FR/ES/DE/PT inherit English for App Shell (`lib/i18n/messages/fr.ts:4-5`)

---

## Section 4 — Supabase / data layer

### 4.1 Tables

**275** `create table if not exists public.<name>` statements across `supabase/migrations/` (114 SQL files). **Every one of those 275 names also has `alter table public.<name> enable row level security`** (scripted set-diff: 0 missing).

Full name list (alphabetical):  
`activity_score_balances`, `activity_score_ledger`, `activity_tier_config`, `activity_tier_history`, `ad_campaigns`, `ad_click_events`, `ad_creatives`, `ad_daily_metrics`, `ad_impression_events`, `ad_review_events`, `ad_sets`, `ads`, `advertiser_accounts`, `advertiser_members`, `ai_dataset_version_workflows`, `ai_dataset_versions`, `ai_dataset_workflows`, `ai_datasets`, `ai_evaluation_sets`, `ai_evaluations`, `ai_experiment_candidates`, `ai_experiments`, `ai_memory_records`, `ai_model_candidates`, `ai_models`, `ai_promotion_queue`, `ai_run_events`, `ai_runs`, `ai_sessions`, `ai_usage_records`, `ai_workflow_audit_trail`, `article_teaser_jobs`, `articles`, `buyer_addresses`, `cart_items`, `carts`, `checkout_quotes`, `communication_contact_sync_state`, `communication_phone_identities`, `communication_privacy_settings`, `content_registry`, `conversation_participants`, `conversations`, `creator_ai_insights`, `creator_quality_signals`, `direct_conversation_pairs`, `game_achievements`, `game_player_achievements`, `game_player_profiles`, `game_player_progress`, `game_privacy_settings`, `game_session_results`, `game_sessions`, `games`, `hello_city_posts`, `hello_city_reports`, `inventory_reservation_events`, `inventory_reservations`, `knowledge_acquisition_history`, `knowledge_assets`, `knowledge_datasets`, `knowledge_graph_edges`, `knowledge_graph_nodes`, `knowledge_sources`, `learning_*` (spaces through certificates — see appendix), plus live_*, messages, notifications, orders/payments, posts/social, private_ai_*, store_*, stories, translation_*, ueos_*, um_points_*, world_*.

**Columns / indexes / FKs:** a best-effort parse of every `CREATE TABLE` body is in `docs/AUDIT_REPORT_2.md` Appendix A. Parser includes some constraint keywords as false columns — treat as an index, not a dump. Exact live remote schema: **UNKNOWN** (migrations not applied in this audit).

**Tables referenced in app/lib (examples, not exhaustive):** `profiles`, `posts`, `stores`, `store_products`, `orders`, `conversations`, `messages`, `notifications`, `live_rooms`, `learning_courses`, `articles`, `stories` — via `.from("…")` and RPCs.

### 4.2 RLS

- **Enabled:** all 275 created `public` tables in this migration tree (scripted).  
- **Policy statements:** **535** `create policy` lines. Listing every policy name would be a second catalog; names live in the same SQL files.  
- **`USING (true)` SELECT (or equivalent) — flagged:**

| Policy name | Table | File:line |
|---|---|---|
| `Profiles are viewable by everyone` | `profiles` | `20260712_auth_profiles_posts_rls.sql:27-30` (also `20260713000001_profiles_foundation_v1.sql:155-158`) |
| `Posts are viewable by everyone` | `posts` | `20260712_auth_profiles_posts_rls.sql:112-115` |
| `Post journey countries are viewable by everyone` | `post_journey_countries` | `20260716_notifications_v2.sql:212-216` |
| `UM points config is readable` | `um_points_config` | `20260717_notifications_v2_automation.sql:105-109` |
| `Follows are viewable by everyone` | `profile_follows` | `20260715_notifications_v1.sql:26-30` |
| `Activity score balances are publicly readable` | `activity_score_balances` | `20260720_activity_tiers_foundation.sql:77-81` |
| `Activity tier history is publicly readable` | `activity_tier_history` | `:91-95` |
| `Activity tier config is readable` | `activity_tier_config` | `:98-102` |
| `Creator quality signals are publicly readable` | `creator_quality_signals` | `20260731_recommendation_infrastructure_v1.sql:150-154` |
| `Video quality signals are publicly readable` | `video_quality_signals` | `:197-201` |
| `Anyone can read search entity types` | `search_entity_types` | `20260804_global_search_foundation_v1.sql:77-81` |
| `Auth can read tax configs` | `store_tax_configs` | `20260812_store_checkout_foundation_v1.sql:264-266` (authenticated only) |
| `Store commerce config is readable` | `store_commerce_config` | `20260819_store_commerce_safety_inventory_reservation_v1.sql:42-46` |
| `Authenticated read ueos products/assets/policies` | `ueos_*` | `20260822_ueos_foundation_v1.sql:46-48, 103-105, 164-166` (authenticated) |
| `World feature flags are readable` | `world_feature_flags` | `20260825_world_discovery_hello_city_foundation_v1.sql:40-43` |
| `World layers are public` | `world_layers` | `20260826_world_discovery_domain_phase2.sql:1110-1111` |

Public-read on `profiles` / `posts` / follows / activity scores is **intentional social**, but it is still `USING (true)` — any extra columns added later are world-readable unless policies tighten.

FORCE RLS appears on UEOS tables (`20260822_ueos_foundation_v1.sql:40-41`).

### 4.3 Storage buckets

| Bucket | Public? | Evidence |
|---|---|---|
| `avatars` | **public** `true` | `20260713000001_profiles_foundation_v1.sql:182-188` |
| `post-images` | **public** `true` | `20260712_auth_profiles_posts_rls.sql:141-147` |
| `post-videos` | **private** `false` | `20260713000002_video_posts_v1.sql:74-81` |
| `stories` | **private** | `20260803_stories_foundation_v1.sql:295-300` |
| `ad-creatives` | **private** | `20260805000001_ads_platform_foundation_v1.sql:1197-1202` |
| `store-product-media` | **private** | `20260818_store_hardening_v1.sql:347-351` |
| `world-place-media` | **private** | `20260827_world_discovery_security_hardening_v1.sql:410-414` |
| `learning-assignment-files` | **private** | `20260857_learning_assignments_coursework_foundation_v1.sql:399-403` |
| `profile-covers` | **public** `true` | `20260915_rich_personal_profile_foundation_v1.sql:597-603` |

**Signed URL code paths:** `lib/supabase/videoPosts.ts:256` (`VIDEO_SIGNED_URL_TTL_SECONDS` 15 min, `videoPostsShared.ts:10-11`); `lib/store/productMediaUrl.ts:167`; `lib/stories/queries.ts:71`; `lib/ads/upload.ts:89`; `lib/ads/adminQueries.ts:256`.  
**Public URL code paths:** `lib/supabase/avatars.ts:69` `getPublicUrl`; `lib/supabase/profileCovers.ts:45`; `lib/supabase/posts.ts:79`.

### 4.4 Functions / triggers / edge

- Many `SECURITY DEFINER` RPCs in migrations (store checkout, learning, ads, prune).  
- App trigger example: `handle_new_user` (`20260712_auth_profiles_posts_rls.sql:48+`).  
- CI calls `public.prune_stale_live_participants(120)` (workflow `:65`).  
- **Supabase Edge Functions directory:** not found as a first-class `supabase/functions` tree in this pass. **UNKNOWN** if any are deployed only on the remote project.

### 4.5 Service role

| Location | Client-reachable? |
|---|---|
| `scripts/media/articleTeaserWorker.ts:42` | No (Node worker) |
| `scripts/media/mediaWorker.ts:39-40` | No (Node worker) |
| Next.js `app/` / `lib/` construction of service-role client | **Not found.** Tests assert actions do not contain `SUPABASE_SERVICE_ROLE_KEY` (e.g. `lib/env/supabasePublic.test.ts:238-252`). |
| SQL `grant … to service_role` | Many RPCs (store order create, settlement, teaser claim) — database role, not a browser secret |

### 4.6 `NEXT_PUBLIC_*` safety

| Name | Safe to expose? |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Yes — public origin |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes — project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `ANON_KEY` | Yes **if** RLS holds — designed for the browser |
| `NEXT_PUBLIC_LIVEKIT_URL` | Yes — `wss://` only; secrets are `LIVEKIT_API_*` |
| `NEXT_PUBLIC_ALLOW_SURFACE_PREVIEWS` | Yes — boolean; do not set `1` in production |
| `NEXT_PUBLIC_STORE_SHOW_*` | Yes — merchandising; `SHOW_SANDBOX_CATALOG=1` would leak E2E products |
| `NEXT_PUBLIC_HOME_CIRCULAR_ARC_PREVIEW` | Yes — preview chrome |
| `NEXT_PUBLIC_VERCEL_ENV` | Platform-injected; safe |

---

## Section 5 — API routes & server actions

### 5.1 `route.ts` (this checkout; excluding `worktrees/`)

| Endpoint | Method(s) | Auth? | Input validation | Rate limited? | File |
|---|---|---|---|---|---|
| `/auth/callback` | GET | Exchanges `code` via Supabase; no session required to hit | `code` / `next` sanitized (`getSafeRedirectPath`); tokens not echoed | **No** (Supabase may rate-limit Auth) | `app/auth/callback/route.ts:53-116` |
| `/api/live/leave` | POST | **Yes** `getServerUser` → 401 | UUID regex on `roomId` (`:5-6`, `:36-38`) | **No** | `app/api/live/leave/route.ts:12-49` |
| `/.well-known/apple-app-site-association` | GET | No (public) | Env Team ID or 404 | No | `app/.well-known/apple-app-site-association/route.ts:8-19` |
| `/.well-known/assetlinks.json` | GET | No (public) | SHA env or 404 | No | `app/.well-known/assetlinks.json/route.ts:9-20` |

**No other `app/**/route.ts`.** Live site’s `/video-sitemap.xml` is **not** in this tree.

### 5.2 Server actions (`"use server"`)

**60+ modules** (see grep files: `app/actions/*.ts`, `app/learning/**/actions.ts`, `app/admin/private-ai/lifecycle/actions.ts`).

**No Zod.** Validation is per-module (FormData helpers, UUID checks, `sanitizeWorldSearchRequest` in `app/actions/worldSearch.ts:20-21`).

**Auth present (examples):** `createVideoPostAction` `getServerUser` (`app/actions/createVideoPost.ts:40-48`); store/ads/admin/messenger/learning mutation files generally call `getServerUser` (counts in `app/actions/*`).

**No auth check (public read — flagged):**

| Action | File | Notes |
|---|---|---|
| `loadDiscoverVideosAction` / `loadFeedPostsAction` | `app/actions/loadPosts.ts:14-21` | Public feed; signed URLs minted server-side |
| `loadDiscoverFeedPageAction` | `app/actions/loadDiscoverFeed.ts:18-28` | Same |
| `loadWatchFeedPageAction` | `app/actions/loadWatchFeed.ts:19-39` | Same; `usedDemoFallback` always `false` in `videoPostsServer.ts:246` |
| `searchWorldAction` | `app/actions/worldSearch.ts:10-32` | Public RPC; validated input; **no user** |

**Rate limited?** Only the **AI gateway** (`lib/ai/config.ts:35`, `lib/ai/gateway/execute.ts:95`, `UMTUBA_AI_RATE_LIMIT_PER_MINUTE`). **No** app-level limiter on leave, callback, world search, or most store/learning actions.

---

## Section 6 — SEO

### Sitemap

- `app/sitemap.ts` **exists**. Includes only `SITEMAP_STATIC_ROUTES`: `/`, `/discover`, `/live`, `/watch`, `/post-journey`, `/terms`, `/privacy` (`lib/site/indexing.ts:40-48`).  
- **Misses:** `/store`, `/learning`, `/learning/catalog`, `/games`, `/world`, `/search`, `/welcome`, `/advertise`, public profiles (`sitemap.ts:8-10` says profiles deferred), articles, products.  
- Live `/sitemap.xml` HEAD **200**. Live also advertises `/video-sitemap.xml` (**200**) — **absent here**.  
- WebFetch of sitemap without browser UA returned **500** — possible bot/WAF mismatch.

### Robots

- `app/robots.ts` **exists**; `public/robots.txt` **does not**.  
- Repo rules: allow `/`, disallow list in `lib/site/indexing.ts:17-34`, sitemap `${origin}/sitemap.xml`, `host` from `getSiteUrl()`.  
- **Live robots.txt (fetched 13 Sep 2026)** is **longer** than this file (see §2.2). Production and this branch have **diverged**.

### `noindex` / `robots: { index: false }` in this checkout

| Source | Routes |
|---|---|
| `lib/site/routeMetadata.ts` | `/create/article`, `/messages`, `/notifications`, `/rewards`, `/saved`, `/create/video`, `/settings`, `/login`, `/signup`, `/register`, `/forgot-password`, `/auth/update-password` |
| `app/world/page.tsx:11` | `/world` |
| `app/world/search/page.tsx:13` | `/world/search` |
| `app/world/city/[citySlug]/page.tsx:26` | world city pages |
| `app/sandbox/*/layout.tsx` | sandbox layouts |
| `buildPublicProfileMetadata` empty username | noindex (`lib/site/metadata.ts:229-234`) |
| Root `buildRootMetadata` | **no** `robots` key — children inherit “indexable” unless they set otherwise |

`/games` is **index: true** while the page says the product is unavailable (`routeMetadata.ts:36-41` vs `app/games/page.tsx:24-29`).

### JSON-LD

**1** block: `Organization` in `app/components/brand/BrandJsonLd.tsx:8-15`, mounted in `app/layout.tsx:41`. No Product / Course / VideoObject / Article JSON-LD found.

### Open Graph / Twitter

- Root + `buildPageMetadata` set OG + Twitter (`lib/site/metadata.ts:82-104`, `108-168`).  
- Route-specific titles/descriptions: pages that import `*Metadata` from `routeMetadata.ts` or call `generateMetadata` (store slugs, profiles, articles, learning catalog, invite).  
- Most `/admin/*`, `/learning/instructor/*`, `/seller/*` set `title` only — **inherit** default OG image `/opengraph-image`.

### Canonical / `metadataBase`

- `metadataBase` set in `buildRootMetadata` (`lib/site/metadata.ts:111`).  
- `getSiteUrl()` prefers `NEXT_PUBLIC_SITE_URL`, then `VERCEL_URL`, then production `https://umtuba.com` (`lib/site/siteUrl.ts` + `.env.example:3-8`).  
- Root also sets `alternates.canonical: "/"` (`metadata.ts:128-130`) **and** child pages set their own canonical via `buildPageMetadata`. Risk of mixed signals if a page omits metadata (many admin/learning pages).

### `next/image` + `fill` without `sizes`

Inspected `fill` usages:

- `app/seller/store/marketplace/[productId]/page.tsx:65-70` — **has** `sizes`  
- `app/components/store/SellerMarketplaceClient.tsx:170-176` — **has** `sizes`  
- `UmtubaStackedLogo` uses width/height, not `fill` (`app/components/brand/UmtubaStackedLogo.tsx`)

**No** `fill` without `sizes` found in those Image call sites. Most product UI uses `<img>` or CSS backgrounds instead (`app/learning/catalog/[courseSlug]/page.tsx:78-83` eslint-disable `no-img-element`).

---

## Section 7 — i18n & RTL

### Mechanism

- Custom foundation — **not** `next-intl` / `react-i18next`.  
- Locales: `ar`, `en`, `fr`, `es`, `de`, `pt` (`lib/i18n/locales.ts:6`). Default `en`. `ar` → `dir="rtl"` (`locales.ts:26-31`).  
- Resolution: cookie `umtuba_locale` → `Accept-Language` → fallback (`lib/i18n/server.ts:19-52`, `lib/i18n/cookie.ts:9-12`). Cookie is **not** httpOnly (`cookie.ts:16`) so `LanguageSelector` can write it.  
- Provider: `I18nProvider` in `app/layout.tsx:42`.  
- **No** locale-prefixed routes / middleware locale rewrite.

### Catalogs and key counts

`FoundationMessages` / `en` / `ar`: **490** keys each (`lib/i18n/messages/types.ts`, `en.ts`, `ar.ts`).  
`fr.ts` / `es.ts` / `de.ts` / `pt.ts`: spread `enMessages` and override **~17** foundation strings (`fr.ts:4-26`). App-shell French/Spanish/German/Portuguese remain English.

### Hardcoded UI

Approximate: **the majority of user-facing copy is hardcoded English**. Catalog covers chrome, settings, social composer, profile tabs, store preview — **not** Learning instructor, Ads admin, Private AI, sandbox, Games body, legal documents (legal is English-primary by design, `lib/legal/legalDocuments.ts:2-3`).

**Rough count:** 490 catalog strings vs thousands of JSX literals in `app/` + `lib/`. Percentage of UI **not** on the translation layer: **on the order of 70–90%** (estimate; not a full AST count).

**10 worst files (hardcoded product English):**

1. `app/games/page.tsx`  
2. `app/learning/instructor/**` (course authoring forms)  
3. `app/admin/private-ai/**`  
4. `app/admin/translation-studio/**`  
5. `app/admin/ads/**`  
6. `app/seller/store/**`  
7. `lib/legal/legalDocuments.ts` (intentional EN)  
8. `app/advertise/**`  
9. `app/sandbox/**`  
10. `app/city/[citySlug]/page.tsx` / `app/feed/page.tsx`

### RTL

- `dir={direction}` on `<html>` (`app/layout.tsx:35-36`).  
- Physical Tailwind / CSS: **90+** `app/**/*.tsx` files match `\b(ml-|mr-|pl-|pr-|left-|right-|text-left|text-right)` (ripgrep counts). Highest: `SellerAnalyticsClient.tsx` (19), `MessageBubble.tsx` (8), `ShareMenu.tsx` (7), live stage/collab (6–7).  
- Some store chrome already uses logical `-end` (`CartIconButton.tsx:104`).

---

*Sections 8–14 continue in `docs/AUDIT_REPORT_2.md`.*
