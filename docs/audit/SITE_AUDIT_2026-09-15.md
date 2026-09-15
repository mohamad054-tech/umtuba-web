# UMTUBA full-site audit — 2026-09-15

Read-only audit of `origin/release/v1` @ `dbadc17f` plus public GET/HEAD of `https://umtuba.com`. No application code was changed. No database writes. No deploy. No load tests or attacks.

## Method and limits

| Check | What was done |
| --- | --- |
| Code SHA | `dbadc17f6798eda431965c7fd7ab979d6af17d13` (`docs/site-audit-2026-09-15` from `origin/release/v1`) |
| Live HTTP | GET/HEAD only: robots, both sitemaps, public pages, security headers, www/http redirects, unknown path, missing Watch id |
| Live DB | **Not queried.** This worktree has no `.env` / `.env.local`. Findings below are from `supabase/migrations`. **The live database may differ** (migrations `20260943`–`20260945` and others may be unapplied). |
| Secrets | Working-tree pattern search only. Secret **values are never printed**. |
| Tests / lint / audit | `npm test` (24 failed / 4611 passed / 11 skipped), `npm run lint` (58 errors / 60 warnings), `npm audit --omit=dev` |
| Live vs this SHA | `docs/ai/PROJECT_STATE.md` still records live web as `57de1988`. Live HTML has **0 hreflang** while this SHA emits hreflang for indexable routes. Treat live SEO as a **deployed build**, not as proof this SHA is live. |

## Positive controls (not findings)

- Every `create table public.*` in migrations (287 tables) has a matching `enable row level security` (0 tables created without RLS).
- `is_platform_admin()` is revoked from `anon` (`20260806` / `20260928`).
- `/admin` live HEAD is `307` to `/login?next=%2Fadmin`.
- Unknown path `https://umtuba.com/this-path-should-404-umtuba-audit` returns real **404**.
- `www` → apex `301`, `http://umtuba.com/` → `https://umtuba.com/` `301`.
- Trailing slash `/learning/` and `/store/` are `308` to the non-slash URL (single hop).
- `dangerouslySetInnerHTML` is only used for `JSON.stringify` JSON-LD (`app/components/JsonLd.tsx`, `BrandJsonLd.tsx`, `VideoObjectJsonLd.tsx`).
- Open redirects go through `getSafeRedirectPath` (`lib/supabase/redirect.ts`).
- Next.js app does not import `SUPABASE_SERVICE_ROLE_KEY`; workers (`scripts/media/*`) read it server-side only.
- Sitemap.xml: **93** `<loc>` (prior pass: 93/93 HEAD 200). Video sitemap: **775** `<loc>` (prior pass: sample 30/30 HEAD 200; this pass 855–851 all 200).
- Missing Watch id is `noindex, nofollow` (but still HTTP 200 — see SEO-03).

---

## Findings (severity order)

### SEC-01 — CRITICAL — Dependencies

**What is wrong.** `npm audit --omit=dev` reports **1 critical** in `next`: unauthenticated RCE on Windows-hosted servers, and unauthenticated RCE in the Image Optimization API when AVIF is used.

**Evidence.** `npm audit --omit=dev` on this SHA: `critical: 1` (`next`). Also `high: 3` (`nanoid`, `postcss`, `sharp`). Live edge is `nginx` + Cloudflare (Linux), so the **Windows-host** RCE may not apply to current production. The **AVIF image optimizer** class still can if Next image optimization is exposed.

**Impact.** A reachable Next RCE is full server takeover (env, cookies, SSR secrets).

**Fix.** Upgrade Next to the patched release tracked in-repo as CVE work (`umtuba-web-nextjs-cve-2026-64643-*`). Confirm image optimizer is not public, or disable AVIF / unoptimized images until patched. Then `npm audit --omit=dev` again.

**Effort.** M. **Migration.** No.

---

### SEC-02 — CRITICAL — RLS / profiles

**What is wrong.** After `20260939_moderation_foundation_v1.sql`, `profiles.moderation_status` (`active|shadowbanned|suspended|banned`) exists, but owner UPDATE RLS is still column-wide. An authenticated owner can set their own `moderation_status` back to `active`.

**Evidence.** Column add: `supabase/migrations/20260939_moderation_foundation_v1.sql:16-21`. Policy: `20260713_profiles_foundation_v1.sql:167-173` (`Users can update their own profile` — `using`/`with check` only `auth.uid() = id`). No later migration restricts columns.

**Impact.** A suspended or banned user can unban themselves through the Supabase client with their own JWT.

**Fix.** Replace owner UPDATE with a column-allowlist (username, display_name, bio, avatar, privacy-safe fields). Move `moderation_status` changes to SECURITY DEFINER admin RPCs only (`is_platform_admin`). Optionally `REVOKE UPDATE (moderation_status)` from `authenticated`.

**Effort.** M. **Migration.** Yes.

---

### SEC-03 — CRITICAL — Admin grant / production

**What is wrong.** The Store E2E sandbox seed **inserts a row into `public.platform_admins`**. That table is the sole DB authority for `is_platform_admin()`. If this seed was ever applied on production (known: sandbox E2E admin on production), that account is a full platform admin.

**Evidence.** `scripts/store-e2e/seed-store-sandbox.sql:131-139` (`insert into public.platform_admins ... on conflict do nothing`). Admin check: `lib/ads/adminAuth.ts:46-55` (`rpc("is_platform_admin")`). Admin routes/actions call `assertPlatformAdminDb` (`app/admin/requirePlatformAdminPage.ts`, `app/actions/adsAdmin.ts`, `app/actions/moderationAdmin.ts`, store/ads/AI/Translation Studio gates).

**Admin grant types (every row/role that can become “admin-like”):**

| Grant | Scope | Authority |
| --- | --- | --- |
| `public.platform_admins.user_id` | Whole platform (Ads, Store admin, UGC moderation, Translation Studio, AI consoles) | **Authoritative** via `is_platform_admin()` |
| JWT `app_metadata.platform_admin` or `role=platform_admin` | UX hint only | **Not** sufficient (`adminAuth.ts:25-43`) |
| `UMTUBA_PLATFORM_ADMIN_IDS` | UX hint only | **Not** sufficient |
| `store_members` roles (owner / manager / catalog editor) | That store | Store catalog, orders, media |
| Ads advertiser members | That advertiser account | Campaigns/creatives, not platform admin |
| Learning course staff / managers | That course | Authoring, grading, discussions |
| World place managers | That place | Place media/layers |
| E2E seed `platform_admins` row | Platform-wide if applied | Same as first row |

**Impact.** A leftover sandbox identity can approve sellers, take down posts, ban users, and operate Translation Studio on production.

**Fix.** `SELECT` production `platform_admins` (operator, not this audit). Delete sandbox notes/users. Make the seed refuse `production` project refs. Add an alert if `note` contains `sandbox`.

**Effort.** S. **Migration.** Optional (cleanup DML, not a schema change).

---

### SEC-04 — HIGH — RLS / posts owner UPDATE

**What is wrong.** `"Users can update their own posts"` allows UPDATE of **any column** except interaction counters (trigger-blocked). Owners can write `deleted_at`, `visibility`, media paths, `media_pipeline` (overlays/JSON), `user_id`, processing fields.

**Evidence.** Policy: `supabase/migrations/20260712_auth_profiles_posts_rls.sql:123-128`. Soft-delete / visibility columns: `20260939_moderation_foundation_v1.sql:3-13`. Counter trigger only: `20260713_social_interactions_v1.sql:56-82`. Documented fallback: `20260945_update_own_post_caption_v1.sql:3-5` (caption-only RPC **not applied**). App still can UPDATE `content` via RLS if the RPC is missing (`lib/supabase/updateOwnPostCaption.ts`).

**Sensitive columns exposed to owner UPDATE:** `deleted_at`, `visibility`, `content`, `video_path`, `video_url`, `image_url`, `thumbnail_path`, `media_pipeline`, `media_status`, processing timestamps/errors, `user_id`, `post_type`. Counters (`likes`, `comments`, `shares`, `saves`, `views`) are the only fields the trigger reverts.

**Impact.** A creator can undelete an admin soft-delete, flip `private`/`followers` after the fact, or swap `video_path` to another object they can sign.

**Fix.** Apply `20260945` (caption RPC). Drop broad UPDATE; grant UPDATE(`content`) only, or a CHECK trigger that rejects changes to moderation/media/identity columns unless `umtuba.allow_post_admin = on`.

**Effort.** M. **Migration.** Yes.

---

### SEC-05 — HIGH — RLS / posts SELECT

**What is wrong.** Posts remain `FOR SELECT USING (true)`. Soft-delete and visibility added in `20260939` are **not** enforced in RLS. `20260944` adds helper functions and says not to change this SELECT policy — visibility stays app-layer.

**Evidence.** `20260712_auth_profiles_posts_rls.sql:112-115`. `20260944_ugc_post_viewer_visibility_v1.sql` (helpers `post_is_visible_to_viewer` / `post_is_interactable` granted to `anon, authenticated`; SELECT policy unchanged).

**Impact.** Anyone with the anon key can read deleted, private, and followers-only rows (captions, paths, pipeline JSON) via PostgREST even when the UI hides them.

**Fix.** Change SELECT to `post_is_visible_to_viewer(...)` (or equivalent) for `anon`/`authenticated`, keep owner/admin bypass. Coordinate with `20260944` so feed queries stay consistent.

**Effort.** M. **Migration.** Yes.

---

### SEC-06 — HIGH — Web headers / CSP

**What is wrong.** Live `https://umtuba.com/` has HSTS, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`. **No `Content-Security-Policy`.** `next.config.ts` defines redirects only — no security headers in the Next app.

**Evidence.** Live `HEAD /` 2026-09-15 (no CSP line). `next.config.ts:1-15`.

**Impact.** A successful XSS (or injected third-party script) is not contained; inline/eval and unexpected origins can run.

**Fix.** Add a report-only CSP on nginx first (`default-src 'self'`; allow Supabase, LiveKit, Cloudflare, Next hashes/nonces). Then enforce. Prefer `frame-ancestors 'self'` in CSP (keep XFO during rollout).

**Effort.** M. **Migration.** No.

---

### SEC-07 — HIGH — Storage signed URLs in SSR HTML

**What is wrong.** `post-videos` is a **private** bucket, but home and UM Life server-render **signed** URLs into HTML. Tokens then sit in CDN/HTML caches, referrer logs, and “View Source”.

**Evidence.** Bucket private: `20260713_video_posts_v1.sql:75-79` (`public = false`). Signer: `lib/supabase/videoPosts.ts:261-273` (`createSignedUrl`). Live home HTML (79117 bytes): **13** `token=` occurrences and **28** `Untitled video` strings. Live `/life` HTML (198835 bytes): **98** `token=` occurrences. Tokens not reproduced here.

**Impact.** Anyone who can fetch `/` or `/life` (or a cached copy) can play private objects until TTL expiry, without passing storage RLS.

**Fix.** Do not print signed URLs in the initial HTML. Sign in the active-window client (Watch already does this) or use short-lived cookie-auth’d media routes. Purge CDN after deploy.

**Effort.** M. **Migration.** No.

---

### SEC-08 — HIGH — Server actions / no rate limits

**What is wrong.** Product mutations (views, shares, referrals, comments, reports, watch signals, video commerce events, checkout-adjacent actions) have **no application rate limiter**. AI gateway has an in-process limit; ads invalid-traffic code explicitly has none.

**Evidence.** No limiter in `app/actions/**`. Unauthenticated-capable: `recordViewAction` / `recordShareAction` (`app/actions/socialInteractions.ts`), `recordReferralAttributionAction` (`app/actions/referral.ts`), `recordWatchSignalAction` (`app/actions/recommendations.ts:36-57` — no `getServerUser` gate before RPC), `recordVideoCommerceEventAction`. AI-only: `lib/ai/safety/hooks.ts`. Ads: `lib/ads/platform/invalidTraffic.ts` (no rate limits by design).

**Impact.** Anon can inflate views/shares, flood referral attributions, spam reports, and write watch-signal / commerce-event rows at will.

**Fix.** Edge or middleware limits by IP + `anon` JWT + action name. Add DB-side quotas on `record_post_view` / `record_post_share` / `record_referral_attribution`. Return 429.

**Effort.** M. **Migration.** Optional (quota tables).

---

### SEC-09 — HIGH — RLS / anon write

**What is wrong.** The only clear **anon INSERT** policy in public schema is `"Anyone can insert video commerce events"`.

**Evidence.** `20260801_video_commerce_shelf_v1.sql:149-158` (`to anon, authenticated`, `with check (user_id is null or user_id = auth.uid())`). Migration scan: 287 tables, this is the intentional anon write. No table `GRANT` of INSERT/UPDATE/DELETE to `anon` was found beyond RLS.

**Impact.** Unauthenticated clients can flood `video_commerce_events` (storage, analytics poison).

**Fix.** Require session, or insert only via SECURITY DEFINER with per-IP/day cap. Drop anon INSERT.

**Effort.** S. **Migration.** Yes.

---

### SEC-10 — HIGH — SECURITY DEFINER granted to anon

**What is wrong.** Several SECURITY DEFINER functions are `GRANT EXECUTE … TO anon` and do not require `auth.uid()`. Sampled replacements **do** set `search_path = public`. A full `pg_proc` audit of live was not run.

**Evidence (anon + write/side-effect):**

| Function | Grant | `auth.uid()` required? | `search_path` (migration) |
| --- | --- | --- | --- |
| `record_post_view` | anon, authenticated | No (guest views) | Yes — `20260944:448-449` |
| `record_post_share` | anon, authenticated | No | Yes — `20260944` |
| `record_referral_attribution` | anon, authenticated | No | Yes — `20260722:544-545` |
| `is_username_available` | anon, authenticated | No (read) | Yes — `20260939:36-37` |
| `get_post_journey`, `get_profile_content_stats`, store/world read helpers | anon | Read | Varies |

`is_platform_admin` is **not** granted to anon.

**Impact.** Combined with SEC-08, guests can inflate counters and write attribution rows. Username oracle is intentional but enumerates UMTUBA usernames.

**Fix.** Keep guest views if product requires them, but add caps and bot checks. Review whether share/referral must be anon.

**Effort.** M. **Migration.** Yes (if changing grants/quotas).

---

### SEC-11 — HIGH — Server actions / client-trusted notification fields

**What is wrong.** Signed-in users can invoke notification actions that accept **client-supplied** country names, view counts, titles, and insight bodies. Auth is “logged in”, not “owner/admin + server-derived facts”.

**Evidence.** `app/actions/notifications.ts:137-218` (`notifyPostReachedCountryAction`, `notifyPostTrendingCountryAction`, `notifyPostViewMilestoneAction` with `input.views`, `notifyAiCreatorInsightAction` with `title`/`body`/`metadata`).

**Impact.** A user can spam their own (or, if the helper is loose, others’) notification inbox with fake milestones and arbitrary text.

**Fix.** Derive country/views on the server from `post_journey` / view RPC. Delete client-triggered “notify*” actions from the browser bundle.

**Effort.** M. **Migration.** No (unless moving to triggers).

---

### SEO-01 — HIGH — SEO / hreflang missing on live

**What is wrong.** This SHA builds `alternates.languages` for all 13 locales via `?hl=` (`lib/site/metadata.ts:81-91`, `lib/site/hreflang.ts:21-30`). Live HTML for `/`, `/watch?post=855`, `/store`, `/life`, `/learning/catalog`, legal `/privacy` has **hreflang=0**.

**Evidence.** Live GET 2026-09-15: home, watch 855, store, life, catalog, privacy — `hreflang` count 0. Code: `SUPPORTED_LOCALES` = ar, en, fr, es, de, pt, id, hi, ru, tr, zh-CN, ja, ko (`lib/i18n/locales.ts:10-24`).

**Impact.** Google cannot see locale alternates; `?hl=` URLs are not advertised. Matches deploy drift (live older than this SHA) **or** a runtime path that skips `buildPageMetadata`.

**Fix.** Deploy the SHA that emits hreflang. Confirm `<link rel="alternate" hreflang>` in live HTML. Keep canonical without `hl`.

**Effort.** S (if already in this SHA) / M (if a live bug). **Migration.** No.

---

### SEO-02 — HIGH — SEO / thin and duplicate video titles

**What is wrong.** Empty captions are allowed, so indexable surfaces fall back to “Untitled video” (home) or “Video by {name}” (Watch). Home HTML contains **28** `Untitled video` strings.

**Evidence.** `validateCaption` allows `""` (`lib/supabase/videoPostsShared.ts:108-116`). `truthfulVideoTitle` → `Video by ${creator}` (`lib/site/videoSeo.ts:82-94`). Live `/` : 28 Untitled hits, robots `index, follow`. Live `/watch?post=855`: title `Video by mohamad abu tair | UMTUBA`, description `A video by mohamad abu tair on UMTUBA.`, robots `index, follow`.

**Impact.** Many Watch/home URLs compete as near-duplicates with no unique snippet.

**Fix.** Require a non-empty caption (or filename-derived title) at publish. `noindex` Watch URLs with no caption/article title until filled. Stop rendering “Untitled video” on indexable home.

**Effort.** M. **Migration.** Optional (`content` CHECK).

---

### SEO-03 — HIGH — SEO / soft 404

**What is wrong.** `GET /watch?post=99999999` returns **HTTP 200** with `noindex, nofollow` and “This video is unavailable”. Sitemap/video URLs that later vanish will stay 200.

**Evidence.** Live HEAD/GET 2026-09-15: `200`. HTML: robots `noindex, nofollow`, canonical `https://umtuba.com/watch?post=99999999`, title `Watch | UMTUBA`. Code: `buildWatchUnavailableMetadata` (`lib/site/videoSeo.ts:111-119`) does not set status.

**Impact.** Google treats many dead Watch URLs as soft 404s; crawl budget waste and quality signals.

**Fix.** Return **404** (or 410 after admin remove) from the Watch page/route when the post is missing or not viewer-visible. Keep noindex as belt-and-suspenders.

**Effort.** S. **Migration.** No.

---

### SEC-12 — MEDIUM — RLS / articles owner UPDATE

**What is wrong.** `"Owners update own articles"` is column-wide (`status`, teaser binding, body).

**Evidence.** `20260865_articles_teaser_foundation_v1.sql:58-62`.

**Impact.** Owners can flip `published` without going through the publish RPC, or rewrite teaser linkage.

**Fix.** Column-limit owner UPDATE, or RPC-only mutations (already the intended pattern for teasers).

**Effort.** S. **Migration.** Yes.

---

### SEC-13 — MEDIUM — Storage / buckets

**What is wrong.** Mix of public and private buckets. Public: `post-images`, `avatars`. Private: `post-videos` (signed). Other buckets created in later migrations (stories, ads, store product media, world place media, assignment files, sound library) follow the same public-read vs signed pattern. Signed URLs leak in HTML (SEC-07).

**Evidence.** `20260712` post-images public; `20260713_profiles` avatars public; `20260713_video_posts` post-videos private; additional `insert into storage.buckets` in `20260803`, `20260807`, `20260818`, `20260827`, `20260857`, `20260932`.

**Impact.** Public buckets are enumerable if object paths leak; private buckets are only as private as signed-URL TTL and HTML leakage.

**Fix.** Keep videos private; fix SSR leak (SEC-07). Review store/world public media for PII.

**Effort.** S. **Migration.** Only if changing bucket `public` flags.

---

### SEC-14 — MEDIUM — Secrets / client surface

**What is wrong.** No service-role key in Next client modules (tests assert this). `NEXT_PUBLIC_*` is publishable config only (`.env.example:18`). Locale cookies are **not** HttpOnly (intentional). This worktree has no committed `.env`. Git-history blob dump was **not** run; only working-tree pattern search.

**Evidence.** `.env.example` forbids service role in the Next app. `lib/env/supabasePublic.test.ts` (client modules must not mention `SUPABASE_SERVICE_ROLE_KEY`). `lib/i18n/cookie.ts:19-26` (`httpOnly: false`). Workers: `scripts/media/mediaWorker.ts` / `articleTeaserWorker.ts` read the env **name** only.

**Impact.** Residual risk is operational (a future `NEXT_PUBLIC_SERVICE_ROLE` mistake, or a secret committed in history on another machine).

**Fix.** Keep the existing tests. Run a secrets scanner on git history in an isolated job (do not paste hits into chat). Make locale cookies `Secure; SameSite=Lax` (already) and accept they are readable by XSS — another reason for CSP (SEC-06).

**Effort.** S. **Migration.** No.

---

### SEC-15 — MEDIUM — CSRF / cookies

**What is wrong.** Mutations are Server Actions (Next origin check) plus Supabase cookies. Referral cookies are `httpOnly` + `SameSite=lax` + `secure` in production (`lib/supabase/middleware.ts:70-78`). Locale cookies are JS-writable. Demo/sandbox enter routes set cookies on **GET** (`app/store/demo-preview/enter/route.ts`) — login CSRF is low, but GET-set cookies are a smell.

**Evidence.** `getSafeRedirectPath` tests block `//evil`. Demo enter: `app/store/demo-preview/enter/route.ts`. No custom CSRF token layer.

**Impact.** Cross-site GET cannot (should not) mutate; lax cookies still send on top-level POSTs from other sites if a form targets a Server Action URL.

**Fix.** Keep actions POST-only. Avoid session-establishing GET. Add `Origin`/`Host` assert on sensitive actions if Next’s built-in check is bypassed.

**Effort.** S. **Migration.** No.

---

### SEC-16 — MEDIUM — Dependencies (high)

**What is wrong.** High: `nanoid` (non-secure generator loop), `postcss` (stringify XSS / source map file read), `sharp` (libvips/libheif CVEs). 2 moderate (not listed).

**Evidence.** `npm audit --omit=dev` on this SHA.

**Impact.** Build-toolchain and image-processing CVEs are lower than Next RCE but should not sit on a public optimizer.

**Fix.** Bump in a dedicated deps PR after SEC-01. Re-audit.

**Effort.** S. **Migration.** No.

---

### SEO-04 — MEDIUM — SEO / demo-preview canonical

**What is wrong.** `/store/demo-preview` is 200, `noindex, nofollow`, Disallow in robots — but **canonical is `https://umtuba.com`** (the homepage). Title is duplicated: `Demo catalog preview | UMTUBA | UMTUBA`.

**Evidence.** Live GET 2026-09-15. `robots.txt` Disallow `/store/demo-preview`. Code enter route sets `X-Robots-Tag` (`app/store/demo-preview/enter/route.ts:9-11`).

**Impact.** If a crawler ignores noindex, it may collapse demo content onto the home canonical.

**Fix.** Self-canonical + noindex (or `noindex` and **no** canonical to `/`). Keep robots Disallow.

**Effort.** S. **Migration.** No.

---

### SEO-05 — MEDIUM — SEO / noindex on /world and /learning

**What is wrong (confirmed, partly intended).** Live `/world` and `/learning` are `noindex, nofollow`. Code marks them noindex on purpose (`lib/site/routeMetadata.ts:137-156`: Learning hub and World Discovery). `/learning/catalog` and `/learning/catalog/ja-01` are **index, follow**. `/world` is **not** in `robots.txt` Disallow.

**Evidence.** Live HTML robots as above. `robots.txt` Allows `/learning/catalog` and `/learning/lessons`; Disallow instructor/attempts. No `/world` Disallow.

**Impact.** Intended if World/My Learning are app shells. Risk: World stays crawlable via links (200 + noindex only). Catalog demo course `ja-01` **is** indexable.

**Fix.** If World must stay out of the index: add `Disallow: /world`. If Learning hub should be indexed after launch, flip `learningHubMetadata` to index and give it unique copy. Review whether `ja-01` / `ai-foundations-for-builders` are production or demo.

**Effort.** S. **Migration.** No.

---

### SEO-06 — MEDIUM — Structured data

**What is wrong.** Watch 855 includes `VideoObject` JSON-LD (valid presence). Title/description are generic (“Video by …”). Thumbnail matcher did not find `"thumbnailUrl":"` in the first script blob (likely site OG `/opengraph-image.png` via `buildPageMetadata`, not a per-video frame). Home/life JSON-LD count is 4 (brand/org, not per-video).

**Evidence.** Live `/watch?post=855` `VideoObject=True`. `app/watch/VideoObjectJsonLd.tsx` uses `JSON.stringify`. `lib/site/metadata.ts:15-18` default OG 1200×630.

**Impact.** Rich results may show a generic image and weak name, so VideoObject is technically present but low quality.

**Fix.** Emit `name` from caption, `thumbnailUrl` from a public or separately cached poster (not a signed video URL), `uploadDate`, `duration` when known (`iso8601DurationFromMs`).

**Effort.** M. **Migration.** No.

---

### SEO-07 — MEDIUM — Duplicate / thin / demo indexables

**What is wrong.** Indexable demo/thin URLs: home Untitled strings; Watch generic titles; Learning catalog courses in sitemap (`/learning/catalog/ja-01`, `ai-foundations-for-builders`) return 200 index; `/store/demo-preview` is noindex (good) but canonical-wrong (SEO-04). `/life` is indexable with a large SSR body.

**Evidence.** Sitemap locs include those catalog slugs. Live ja-01: `index, follow`, title `JA-01 — AI Foundations for Builders | UMTUBA`.

**Impact.** Demo or unfinished courses can rank beside real catalog entries.

**Fix.** `noindex` or drop from sitemap until publish QA. Unique descriptions per course.

**Effort.** S. **Migration.** No.

---

### SEO-08 — MEDIUM — Performance signals

**What is wrong.** This worktree has no `.next` build output (no bundle inventory). Live home is **79 KB** HTML with 13 signed media URLs; `/life` is **199 KB** HTML with 98 tokens. ESLint `@next/next/no-img-element` **8** (raw `<img>` without Next/Image). `next.config.ts` has no `images` / headers / experimental optimize package.

**Evidence.** Live byte sizes 2026-09-15. Lint rule count. No `/.next/static/chunks` in this worktree.

**Impact.** LCP/TBT suffer from huge HTML, render-blocking RSC payload, and unsigned dimension images (CLS).

**Fix.** After next production build, list the largest JS chunks and split admin/studio out of the public graph. Use `next/image` with width/height. Stop inlining signed media (SEC-07).

**Effort.** L. **Migration.** No.

---

### QA-01 — MEDIUM — Tests / 24 failures

**What is wrong.** `npm test`: **Test Files 21 failed | 419 passed (440). Tests 24 failed | 4611 passed | 11 skipped (4646).**

**Evidence / grouping (likely cause):**

| Area | Failed tests | Likely cause |
| --- | --- | --- |
| Learning runtime / catalog | `lib/learning/oneToOne.runtime.test.ts` (RLS runtime + live booking gate), `learnerDelivery.test.ts`, `publicCatalog.test.ts`, `publicCatalogSelfEnroll.test.ts`, `app/components/learning/learningPremiumSurfaces.test.ts` (2) | **Stale contracts vs Learning Hub / productization** on `release/v1`, plus oneToOne wanting a local Supabase (this tree has no env). |
| Profile / content foundation | `contentFoundation.test.ts`, `profileCoursesProductsStructure.v1.test.ts`, `profileHeroCompleteness.v1.test.ts`, `profileHeroSocialLinks.v1.test.ts` | **Stale wiring** after profile hero / All-panel changes. |
| Ads admin | `adsAdminReviewFoundation.test.ts` | **Stale route-protection string contract**. |
| Messenger | `app/messages/messengerProduction.test.ts` | **Stale UI contract** (composer / `NEXT_PUBLIC_ALLOW_SURFACE_PREVIEWS`). |
| Auth | `lib/supabase/passwordReset.test.ts` | **Stale page-contract** (session / `getSafeRedirectPath` wiring). |
| Translation Studio | `translationStudioAppShellIngestion.test.ts`, `translationStudioMemoryDbContractAlign.test.ts` (2) | **Stale catalog / memory-DB contract**. |
| Landing / nav / live copy | `joinCta.contract.test.ts`, `appTopNavContrast.test.ts`, `creatorProfileArticleDeeplink.test.ts` (2), `shellCoherence.test.ts`, `liveTrustHonesty.contract.test.ts` | **Stale copy/DOM contracts** (`Go Live` missing on `LandingHero`; language control; article deeplink). Mix of **real UX drift** and frozen tests. |
| Rewards | `rewardsProfileJourney.harden.test.ts` | **Stale journey marker**. |
| Media processing | `mediaProcessing.foundation.test.ts` | **Stale negative assertion**: test forbids `20260869`, but that migration file exists. Not a runtime bug. |

**Impact.** CI red hides real regressions; several “foundation” tests no longer describe the shipped UI.

**Fix.** Triage in one sitting: update stale source-reading tests; keep failures that still match product intent (landing CTA, password-reset session). Do not “fix” product to satisfy a dead `20260869` absence test.

**Effort.** M. **Migration.** No.

---

### QA-02 — MEDIUM — Lint

**What is wrong.** `npm run lint`: **118 problems (58 errors, 60 warnings)**; 6 errors / 1 warning `--fix`able.

**By identifiable rule (parser; wrap-around messages inflate “render*” tokens):**

| Count | Rule |
| --- | --- |
| 46 | `@typescript-eslint/no-unused-vars` (mostly warnings) |
| 8 | `@next/next/no-img-element` |
| 6 | `prefer-const` |
| 5 | `react-hooks/rules-of-hooks` (**errors — treat as real**) |
| 5 | `react-hooks/exhaustive-deps` |
| ~1 each | `@typescript-eslint/no-require-imports`, `no-explicit-any`, `no-console` |

**Top files by issue count:** `app/components/learning/AttemptPlayer.tsx` (5), `app/discover/components/DiscoverNativeVideo.tsx` (5), `lib/store/commerceReadiness.ts` (5), `app/search/SearchExperience.tsx` (4), `app/watch/WatchExperience.tsx` (4).

**Impact.** `rules-of-hooks` can mean broken hook order in production. Unused vars are noise.

**Fix.** Fix the 5 `rules-of-hooks` first. Then img dimensions. Do not mass `--fix` in this audit branch.

**Effort.** M. **Migration.** No.

---

### QA-03 — MEDIUM — Known item: Not interested not persisted

**What is wrong.** “Not interested” only calls `onHideFromFeed` and local React state. Reload / other device / other surface shows the video again.

**Evidence.** `app/components/social/VideoMoreMenu.tsx:174` (`onHideFromFeed?.(postId)`). Discover/Watch pass `onVideoDeleted` (`DiscoverFeed.tsx:344`, `VerticalVideoFeed.tsx:423`). Profile: `useState<number[]>([])` (`ProfileExperience.tsx:117`). No table/RPC for hides.

**Impact.** Users believe they dismissed a video; it returns immediately.

**Fix.** Persist `user_id + post_id` (or viewer_key) and filter feeds server-side.

**Effort.** M. **Migration.** Yes.

---

### QA-04 — MEDIUM — Known item: empty video titles

**What is wrong.** `validateCaption("")` is ok. Publish and caption-edit allow blank. SEO then uses Untitled / “Video by”.

**Evidence.** `lib/supabase/videoPostsShared.ts:108-116`. `20260945` trims but allows empty (`btrim` + length cap only).

**Fix.** Reject whitespace-only captions at action + RPC + CHECK.

**Effort.** S. **Migration.** Optional.

---

### QA-05 — MEDIUM — Known item: 11 locales missing `video.more.*`

**What is wrong.** `video.more.*` keys exist for all 13 locales via fallback, but **only `en` and `ar` are translated**. `fr es de pt id hi ru tr zh-CN ja ko` show English.

**Evidence.** `lib/i18n/messages/moderationCatalogs.ts:1-4` (comment: other catalogs reuse English). Keys at `:103-126` (en) and `:226-249` (ar).

**Impact.** More menu on 11 locales is English in an otherwise translated chrome.

**Fix.** Translate the ~23 keys per locale in the same catalog file.

**Effort.** S. **Migration.** No.

---

### QA-06 — MEDIUM — Known item: `?hl=` language switching

**What is wrong (still exists).** `?hl=` / `?locale=` is still the public locale override. Live `GET /?hl=ar` sets `<html lang="ar" dir="rtl">` and an Arabic title. Resolver order puts **saved cookie/profile above `?hl=`** (`lib/i18n/resolve.ts:3-8, 20-23`), while auth-gate uses query first (`lib/site/hreflang.ts:61-70`). So hreflang links can lose to `umtuba_locale`.

**Evidence.** Live `/?hl=ar` 2026-09-15 (curl has no cookie → Arabic). Middleware copies `hl` into `x-umtuba-hl` (`lib/supabase/middleware.ts:26-34`).

**Impact.** Shared `?hl=ar` links look English for users who already have an `en` cookie; crawlers without cookies see the override (good). Users report “language switching via URL does not stick / fights the selector”.

**Fix.** Decide product: either `?hl=` always wins for that request (better for hreflang), or drop `?hl=` from user-facing shares and keep cookie-only. Document the winner.

**Effort.** S. **Migration.** No.

---

### QA-07 — MEDIUM — Routes / 5xx

**What is wrong.** Sampled public GET/HEAD returned **no 5xx**. Failures were 307/308/301/404 by design. Soft-404 Watch is 200 (SEO-03), not 5xx.

**Evidence.** Live 2026-09-15: `/` 200, `/robots.txt` 200, `/sitemap.xml` 200, `/video-sitemap.xml` 200, `/watch` 200, `/discover` **307 → /**, `/learning` 200, `/world` 200, `/store` 200, `/life` 200, `/store/demo-preview` 200, `/privacy` `/terms` `/community-guidelines` 200, `/admin` 307 login, unknown path 404, `/watch?post=99999999` 200. Video ids 855–851 200.

**Impact.** No crash-on-GET found on this sample. Authenticated/admin/lesson-engine routes were **not** exercised (would need a session). Learning lesson 404 behavior is covered by a **failing** contract test (`learnerDelivery.test.ts`) — treat as **unverified on live**.

**Fix.** After login, GET a private lesson URL and `/admin` as a non-admin (expect 307/403, not 500). Add synthetic 5xx alerts.

**Effort.** S. **Migration.** No.

---

### QA-08 — LOW — Lint / unused and img

**What is wrong.** 46 unused-vars and 8 raw `<img>` tags. Quality/a11y/CLS, not exploit.

**Evidence.** ESLint totals above.

**Fix.** Incremental cleanup with the hooks pass.

**Effort.** S. **Migration.** No.

---

### SEC-17 — LOW — SECURITY DEFINER search_path completeness

**What is wrong.** High-risk replaced functions set `search_path`. A complete live `proconfig` listing was not possible. Older function **signatures** remain in history (e.g. `record_post_view(bigint, text)` dropped in later files). If live has not applied `20260944`, an older body may still be deployed.

**Evidence.** Sampled: `20260944:448-449`, `20260722:544-545`, `20260939:36-37`. Live DB not selected.

**Impact.** Missing `search_path` on SECURITY DEFINER is schema-hijack if a malicious `public` object exists — only if an old function remains.

**Fix.** On production (operator): `SELECT n.nspname, p.proname, p.proconfig FROM pg_proc p … WHERE prosecdef`. Patch any NULL `search_path`. Apply pending migrations in the normal workflow (not this task).

**Effort.** S. **Migration.** Yes if live lags.

---

### SEO-09 — LOW — Host / slash / robots Host

**What is wrong.** Canonicalization is generally healthy (www/http/slash). `robots.txt` includes non-standard `Host: umtuba.com` (ignored by Google; used by Yandex). `/discover` 307 to `/` is correct for a merged home. `/world` not Disallowed (SEO-05).

**Evidence.** Live robots.txt 2026-09-15 (Allow/Disallow list + two sitemaps). `/discover` 307.

**Impact.** Low. Extra Host line is harmless.

**Fix.** Optional: add `Disallow: /world` if World must stay out.

**Effort.** S. **Migration.** No.

---

## Live SEO matrix (2026-09-15 GET)

| URL | Status | robots | canonical | hreflang | html lang/dir | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | 200 | index,follow | `https://umtuba.com` | 0 | en/ltr (`?hl=ar` → ar/rtl) | 13 signed tokens; Untitled video ×28; title+OG+Twitter present |
| `/watch?post=855` | 200 | index,follow | watch?post=855 | 0 | en | VideoObject present; generic title |
| `/watch?post=99999999` | 200 | noindex,nofollow | self | 0 | en | Soft 404 |
| `/discover` | 307 → `/` | — | — | — | — | Not a standalone index URL |
| `/learning` | 200 | noindex,nofollow | /learning | 0 | en | **Intended** hub noindex |
| `/learning/catalog` | 200 | index,follow | /learning/catalog | 0 | en | |
| `/world` | 200 | noindex,nofollow | /world | 0 | en | **Intended** in `routeMetadata` |
| `/store` | 200 | index,follow | /store | 0 | en | 6 JSON-LD scripts |
| `/life` | 200 | index,follow | /life | 0 | en | 98 signed tokens |
| `/store/demo-preview` | 200 | noindex,nofollow | **home** | 0 | en | robots Disallow; bad canonical |
| `/privacy` | 200 | index,follow | /privacy | 0 | en | Legal OG/Twitter present |

---

## Recommended fix order (small deployable batches)

### Batch 1 — Production admin and self-unban (same sitting)

1. SEC-03: remove sandbox `platform_admins` on production; lock the seed.  
2. SEC-02: column-lock `profiles.moderation_status`.  
**Verify:** banned test user cannot UPDATE status; sandbox user loses `/admin`.

### Batch 2 — Posts RLS (same sitting, one migration)

1. SEC-04: column-limit posts UPDATE; apply caption RPC `20260945` if still pending.  
2. SEC-05: SELECT uses visibility/deleted helpers.  
**Verify:** owner can edit caption only; anon cannot read `deleted_at` rows; counters still increment.

### Batch 3 — Abuse and leakage (no schema required for first half)

1. SEC-07: stop SSR signed URLs on `/` and `/life`.  
2. SEC-08 + SEC-09 + SEC-10: rate-limit view/share/referral/commerce-event; drop anon INSERT on events.  
3. SEC-11: remove client-trusted notify actions.  
**Verify:** View Source on `/` has zero `token=`; 429 after N views.

### Batch 4 — Headers and Next CVE

1. SEC-01 + SEC-16: patched Next + audit clean for high/critical.  
2. SEC-06: CSP report-only on nginx, then enforce.  
**Verify:** `npm audit --omit=dev` critical=0; CSP report URI receiving only expected violations.

### Batch 5 — SEO (can ship without DB)

1. SEO-03: Watch missing → 404.  
2. SEO-01: ship hreflang (deploy this SHA or fix live).  
3. SEO-02 + QA-04: require captions; stop Untitled on indexable HTML.  
4. SEO-04: demo-preview self-canonical.  
5. SEO-05/07: World Disallow and/or catalog demo noindex.  
6. SEO-06: VideoObject thumbnail + real name.  
**Verify:** `watch?post=99999999` is 404; live home has 13 `hreflang` + `x-default`; GSC soft-404s drop.

### Batch 6 — Product quality

1. QA-03: persist Not interested.  
2. QA-05: translate `video.more.*` for 11 locales.  
3. QA-06: pick a single `?hl=` vs cookie winner.  
4. QA-01 / QA-02: unstick stale tests; fix `rules-of-hooks`.  
5. SEO-08: image dimensions + bundle split after a real production build.  
**Verify:** hide survives refresh; More menu in `ja` is Japanese; `npm test` / lint trend down.

---

## Operator follow-ups (need production credentials; not done here)

- `SELECT user_id, note, created_at FROM public.platform_admins;`
- `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND relkind = 'r';`
- `SELECT proname, proconfig FROM pg_proc WHERE prosecdef AND pronamespace = 'public'::regnamespace;`
- Confirm whether `20260939`, `20260943`, `20260944`, `20260945` are applied.
- Confirm live deploy SHA (expected drift vs `dbadc17f`).
