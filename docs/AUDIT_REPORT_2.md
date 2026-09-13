# UMTUBA repository audit — part 2 (sections 8–14)

Companion to `docs/AUDIT_REPORT.md` (sections 1–7). Same date, checkout, and security rule: no secret values.

---

## Section 8 — Accessibility

### Icon-only controls without name

Many chrome controls **do** set `aria-label` (NotificationBell `app/components/NotificationBell.tsx:141-145`, CartIconButton `app/components/store/CartIconButton.tsx:83-87`, feed logo `app/feed/page.tsx:22`). Video rails pass a `label` into `ActionButton` (`app/components/video/VideoActionRail.tsx:291-302`) — those are not unlabeled if `ActionButton` exposes the label (not fully traced for every rail).

**Worst / risky (icon or empty name):**

1. `app/learning/catalog/[courseSlug]/page.tsx:80-83` — `<img alt="">` decorative empty alt on the **only** course hero image (content image, not decorative).  
2. `app/seller/store/marketplace/[productId]/page.tsx:65-67` — `Image` `alt=""`.  
3. `app/components/store/SellerMarketplaceClient.tsx:170-172` — `Image` `alt=""`.  
4. Discover/Watch action icons rely on sibling text; if `ActionButton` hides the label visually without `aria-label`, Like/Comment/Share fail — **PARTIAL UNKNOWN** pending `ActionButton` implementation.  
5–15. Live / Watch floating SVGs (`LiveStreamControls`, `WatchFloatingControls`, `LivingNavigationOverlay`, story composer, message composer icon buttons, profile lightbox, store qty stepper, wishlist heart, UserMenu overflow): many have `aria-hidden` on SVG; **whether the parent control has a name was not verified for all 15.** Honest gap: a full axe/Playwright a11y pass was **not** run.

**Count of icon-only unlabeled buttons:** **UNKNOWN — no automated accessibility crawl in this audit.** Sample of 15 worst *candidates* are the empty-`alt` images plus untraced icon buttons in `VideoActionRail.tsx`, `DiscoverActionRail.tsx`, `WatchFloatingControls.tsx`, `LiveStreamControls.tsx`, `StoryComposer.tsx`, `MessageComposer.tsx`, `UserMenu.tsx`, `HomeCircularArc.tsx`, `StoreQtyStepper.tsx`, `WishlistButton.tsx`, `ProfilePhotosLightbox.tsx`, `LivingNavigationOverlay.tsx`, `OwnerContentDeleteControl.tsx`, `ShareMenu.tsx`, `VideoPlayer.tsx`.

### Images without `alt`

Confirmed empty/missing:

- `app/learning/catalog/[courseSlug]/page.tsx:82` `alt=""`  
- Marketplace Images above `alt=""`  
- Additional `<img>` without alt: **UNKNOWN complete count** (many `next/image` and raw img across store/learning).

### `<a>` with raw URL or empty text

**UNKNOWN — not exhaustively searched.** Legal docs do not dump raw URLs as link text in the sampled `LegalDocumentPage`.

### Inputs without `<label>`

Learning instructor forms use visible `<label>` in sampled pages (`app/learning/instructor/courses/[courseId]/page.tsx` `name="description"`).  
**Complete count UNKNOWN.** High-risk: settings, store checkout, advertise creatives, assessment authoring (`questions/page.tsx` is form-heavy).

---

## Section 9 — Content & data quality

### Home feed source

`/` → `HomeFeedLoader` (`app/page.tsx:19-24`) → `getDiscoverVideosServer` (`app/components/home/HomeFeedLoader.tsx:28-31`) → `loadCanonicalVideoFeedPage` (`lib/supabase/videoPostsServer.ts:200-204`).  
Data is **Supabase video posts**, not a hardcoded home list. Empty/error → empty `DiscoverExperience` + message (`HomeFeedLoader.tsx:34-42`).  
Watch pagination sets `usedDemoFallback: false` always (`videoPostsServer.ts:246`). Demo MP4s exist under `public/videos/demo-*.mp4` and `allowWatchDemoFallback` still exists (`surfaceGates.ts:61-66`) but this server path does not flip the flag to true.

**Production `/learning` HEAD** preloads `/demo/learning/covers/*.svg` — demo cover art is **live**.

### Empty video title / caption

`validateCaption` only rejects length `> MAX_CAPTION_LENGTH` (1000). **Empty caption is allowed** (`lib/supabase/videoPostsShared.ts:108-116`).  
`insertVideoPostForUser` stores `content: caption` (`videoPosts.ts:450-511`).  
UI maps empty content to `"Untitled video"` (`videoPosts.ts:404-405`, `lib/supabase/profileContent.ts:203`).  
**There is no “title required” check for publishing a video.**

### `"Worldwide"`

Hardcoded in `lib/supabase/videoPosts.ts:407-410`:

```
location: { city: "UMTUBA", country: "Worldwide" }
```

Also test fixture `app/watch/lib/mapWatchVideo.test.ts:18`. Not a user-editable location in this mapper.

### Learning description vs import metadata

Strings `LEARNING_IMPORT`, `publish_targets`, and `Source locale` : **zero matches** in `app/`, `lib/`, `scripts/`, `docs/`, `data/` of this checkout.

Public catalog renders `course.description` after `sanitizePublicText` (`lib/learning/publicCatalog.ts:106-116`, `:241`; UI `app/learning/catalog/[courseSlug]/page.tsx:91-94` and catalog cards `:85-87`).  
Sanitize strips `umtuba-package://`, package paths, and `sk-` key-shaped tokens — it does **not** strip editorial labels like “Source locale” because those strings are not in the repo.

Enrolled course page shows `outline.data.course.name` only (`app/learning/courses/[courseId]/page.tsx:40`), not description.

**Trace from an import script to the UI:** **UNKNOWN — no import script containing those tokens exists here.** If the owner saw `LEARNING_IMPORT` / `publish_targets` on production, that data is already in `learning_courses.description` (or a remote branch not in this checkout).

### Markdown in course descriptions

Catalog description is a `<p>` of plain text (`catalog/[courseSlug]/page.tsx:92-93`) — **not** a markdown renderer.  
Lesson blocks: `renderSafeBlockText` **escapes HTML** and documents that markdown is shown as escaped source (`lib/learning/contentBlockRender.ts:108-114`; `app/components/learning/ContentBlockRenderer.tsx:52-53` sr-only “(markdown source)”).

---

## Section 10 — Legal & compliance surfaces

| Surface | Status | Path / note |
|---|---|---|
| Terms of Service | **EXISTS** | `/terms` → `app/terms/page.tsx` (“Terms of Use”, `TERMS_SECTIONS` in `lib/legal/legalDocuments.ts`) |
| Privacy Policy | **EXISTS** | `/privacy` → `app/privacy/page.tsx` |
| Community Guidelines | **MISSING** as a route; conduct bullets live **inside Terms** (`legalDocuments.ts:70-80`) | |
| DMCA / copyright | **MISSING** as a route | |
| Cookie notice (banner/CMP) | **MISSING** component (`CookieBanner` / `CookieConsent` : 0 hits). Cookies **described** in Privacy (`legalDocuments.ts:289-293`) | |
| Contact | **MISSING** dedicated `/contact`. `APP_ROUTES.contact` is `/u` (personal comms, `routes.ts:12`). Legal says “contact method provided on UMTUBA” (`legalDocuments.ts:12-13`) without a URL | |
| About | **MISSING** | |
| Account deletion | **MISSING** route/control. Terms mention deletion “where available” (`legalDocuments.ts:123`) | |
| Data export | **MISSING** | |

Effective dates in copy: 19 July 2026 (`legalDocuments.ts:6-7`). Counsel disclaimer present (`:9-10`).

---

## Section 11 — Quality gates

### Tests

- **Framework:** Vitest (`package.json:10-11`, `vitest.config.ts`). Playwright is a **devDependency** (`package.json:42`) — used as a library, not a documented `test:e2e` script.  
- **Count:** **340** `*.test.ts` / `*.test.tsx` / `*.spec.ts` files (excluding `node_modules`, `worktrees`, `.next`). Coverage is **unit/contract** heavy (store, learning, ads, i18n, translation studio, AI).  
- **CI that runs them:** **None** in `.github/workflows/` (only prune job).

### Lint

- Config: `eslint.config.mjs` — `eslint-config-next` core-web-vitals + typescript. Ignores `.next`, `out`, `build`, `next-env.d.ts` only — **does not ignore `worktrees/`**.  
- `npm run lint` **FAILS**: **1785 errors, 35670 warnings** (37455 problems), dominated by nested `worktrees/`.  
- Scoped `npx eslint app lib scripts proxy.ts next.config.ts`: **69 errors, 60 warnings** (prefer-const, no-require-imports in `.cjs` scripts, unused vars).  
- **Does not pass** either way.

### Build

`npm run build` was **not completed** in this audit window (lint alone took ~224s). Result: **UNKNOWN — not run to completion.** Do not assume it succeeds.

### `npm audit --omit=dev`

Severity counts only:

| Severity | Count |
|---|---|
| critical | **1** |
| high | **3** |
| moderate | **2** |
| low | 0 |
| info | 0 |
| **total** | **6** |

Package names omitted here to keep the report short; re-run `npm audit --omit=dev` on the owner machine for the advisory list.

---

## Section 12 — Git state

### `git log --oneline -30`

```
196a0358 fix(comms): wrap Messages SSR tree in I18nProvider
d84dbda5 fix(comms): do not export a sync helper from the server-actions module
0f89d449 fix(local-supabase): bootstrap posts precursor and uniquify colliding local migration versions
d354fd2f docs(ai): record 2026-08-30 remote backup push results
05b100f0 docs(ai): 2026-08-30 end of day preservation checkpoint
866749ed fix(comms): part 1b discovery security
1bf012a0 docs(comms): stamp part 1b candidate SHA
1abfb94d feat(comms): part 1b identity discovery privacy entry
455fdca8 docs(profile): part 2b schema report
3d6ed0eb feat(profile): rich personal identity part 2b schema and editor
c4f0fbfc feat(profile): rich personal identity part 2a
8ab99fba docs(um-life): part 1b-a owner review gate report
4d4953d8 feat(um-life): part 1b-a social home candidate
b3c05d8d feat(store): contain sandbox catalog and close storefront release gaps
2a146bb0 docs(ai): record SAVE_ALL commit SHA and no-push status
81857788 chore(pc2): preserve SAVE_ALL closeout state
72190b62 fix(social): let owners delete their own posts and videos (UAF-12)
5dbd7791 feat(ios): add Team-ID-gated Apple App Site Association stub
8204c0c1 docs(ai): stamp Store premium UX closeout SHA
dad5eb5d feat(store): close premium buyer storefront UX overhaul
3ffa2a8e docs(ai): record SAVE_ALL commit SHA and no-push status
eae76d45 chore(pc2): preserve closeout handoff state and PWA auth callback packet
1c5ae0bd docs(ai): persist local PC2 shutdown handoff reports
bc09e137 fix(ai): preserve routing policy boundary for translation hints
68dd8c74 docs(translation): fix V1 handoff whitespace
73835bb1 docs(translation): hand off V1 for central integration
c061c0a5 docs(translation): close Translation Studio V1
0d66bb92 fix(translation): make dual-read shadow race-safe v1
fedd30b9 docs(translation): close persistence acceptance v1
5f8dc5ef test(translation): validate limited shadow observation v1
```

### Branches

Current: `* pc2/umtuba-communications-v1-part1b-identity-discovery`.  
`origin/HEAD` → `origin/alpha-0.2`.  
Dozens of local `office/*`, `pc2/*`, and `remotes/origin/*` branches (um-core platform, store, learning, collab). Full `git branch -a` is long (~600 lines in the capture file).

### `git status --short`

**272** uncommitted paths (count only). Top prefixes: `docs` 164, `lib` 15, `public` 15, `app` 14, `worktrees` 12, `scripts` 5, `supabase` 2, plus log artifacts (`_d1_money_locale_vitest.log`, etc.).  
**Not committed** by this audit. Includes this report after write.

### Tracked file count and tree

- `git ls-files` = **2033** tracked files.  
- Top-level (excluding `node_modules`, `.next`, `.git`): `.cursor/`, `.github/`, `.local/`, `app/`, `data/`, `docs/`, `lib/`, `public/`, `scripts/`, `supabase/`, `tmp-um-life-gate/`, `worktrees/`, plus `package.json`, `proxy.ts`, `eslint.config.mjs`, `.env.example`, assorted `_pc2_*.log` / inventory files.

### Largest 15 **tracked** files

| Bytes | Path | Flag |
|---|---|---|
| 1,461,877 | `public/textures/earth-blue-marble.jpg` | Large texture — OK if needed for globe |
| 1,128,375 | `public/videos/demo-1.mp4` | **Demo video in git** |
| 788,493 | `public/videos/demo-2.mp4` | **Demo video in git** |
| 574,823 | `public/videos/demo-3.mp4` | **Demo video in git** |
| 499,137 | `public/brand/umtuba_logo_stacked_from_approved_video.png` | Brand |
| 499,137 | `docs/ai/pc2-official-logo-from-approved-video-v1/package/…png` | **Duplicate** of brand asset in docs |
| 345,060 | `package-lock.json` | Expected |
| 246,924 | `public/textures/earth-blue-marble-2048.jpg` | Texture |
| 228,438 | brand symbol (public + docs duplicate) | Duplicate |
| 197,216 | app icon 1024 (public + docs duplicate) | Duplicate |
| 117,293 | `docs/ai/…/VERIFY_logo_on_black.jpg` | Docs binary |
| 113,572 | `supabase/migrations/20260863_learning_first_course_readiness_v1.sql` | Large migration |
| 91,970 | `supabase/migrations/20260826_world_discovery_domain_phase2.sql` | Large migration |

### `.env*` gitignore

`.gitignore:40-42`: `.env*` ignored, `!.env.example` excepted.  
`git ls-files` matching `^\.env` → **only `.env.example`**.  
Whether a secret was **ever** committed in history: **UNKNOWN — `git log -p` / `git rev-list --all -- .env` was not run** (would risk printing values). `.env.example:98-99` says previous CJ keys must be treated as **compromised** and rotated.

---

## Section 13 — Top 20 findings

| # | Severity | Finding | Evidence | Why it matters | Effort |
|---|---|---|---|---|---|
| 1 | Critical | **This git checkout ≠ production.** Live robots/sitemap/video-sitemap and 404s (`/ai-hub`, `/sandbox`) do not match this branch. | §2.2; live `robots.txt`; HEAD 404/200 | Owner cannot prioritize fixes from the wrong tree; legal/SEO live rules are elsewhere | M |
| 2 | Critical | **`npm audit --omit=dev`: 1 critical + 3 high + 2 moderate** | §11 | Known vulnerable production deps | S–M |
| 3 | Critical | **Service-role key used in media workers**; Next app documents “never put it here” | `scripts/media/articleTeaserWorker.ts:42`; `.env.example:18-19` | Fine if workers stay server-only; disastrous if copied into Next or `NEXT_PUBLIC_*` | S (verify deploy) |
| 4 | Critical | **Public `USING (true)` on `profiles`, `posts`, follows, activity scores, quality signals** | §4.2 | Any new PII column becomes world-readable | M |
| 5 | Critical | **Legal gaps: no DMCA, cookie CMP, contact, about, account deletion, data export** | §10 | Soft-launch legal exposure | M–L |
| 6 | High | **Production Learning serves `/demo/learning/covers/`** | live `/learning` `Link` preload | Demo content on the public site | S |
| 7 | High | **Video publish allows empty caption/title** | `videoPostsShared.ts:108-116` | Empty / “Untitled video” in feed | S |
| 8 | High | **Hardcoded location `UMTUBA` / `Worldwide`** | `videoPosts.ts:407-410` | Fake geography on every mapped video | S |
| 9 | High | **`/games` is indexable but a stub** | `routeMetadata.ts:36-41`; `games/page.tsx:24-29` | SEO lie | S |
| 10 | High | **Sitemap omits Store, Learning, profiles, products; live video-sitemap not in repo** | `indexing.ts:40-48`; no `video-sitemap` file | Discovery + drift | M |
| 11 | High | **Almost no HTTP rate limits** on actions / `/api/live/leave` / callback | §5 | Abuse, leave-spam, auth callback hammering | M |
| 12 | High | **No Zod; public server actions mint signed video URLs** | `loadPosts.ts`; `loadWatchFeed.ts` | Enumeration / bandwidth if combined with weak RLS | M |
| 13 | High | **Sandbox & AI Hub exist in repo, 404 live, not middleware-protected** | §2; `supabaseAuthGate.ts` omits `/sandbox` `/ai-hub` | If a future deploy ships them, they are public | S |
| 14 | High | **CJ example says prior keys compromised** | `.env.example:98-99` | Confirm rotation on every machine | S (ops) |
| 15 | High | **`eslint` fails (worktrees inflate 37k issues; app/lib still 69 errors)** | §11 | No green quality gate | M |
| 16 | Medium | **i18n: FR/ES/DE/PT mostly English; ~70–90% UI hardcoded** | §7 | RTL/Arabic shell only | L |
| 17 | Medium | **Physical `ml-`/`left-` classes across 90+ files** | §7 | Broken Arabic layout | M |
| 18 | Medium | **A11y: empty `alt` on catalog/marketplace images; no axe pass** | §8 | WCAG | M |
| 19 | Medium | **Demo MP4s + duplicate brand binaries in git** | §12 | Repo weight; demo leakage | S |
| 20 | Medium | **272 dirty files; no test CI; build not verified** | §11–12 | Unreleasable process | M |

---

## Section 14 — Open questions

1. Which **git SHA** is deployed to https://umtuba.com? (This branch is not `alpha-0.2`.)  
2. Where does live `/video-sitemap.xml` and the extra `robots.txt` disallows live in source?  
3. Are `DATABASE_URL` and prune workflow **actually configured** on GitHub?  
4. Remote DB: have **all 114 migrations** been applied? Any tables created only in SQL editor?  
5. Is `SUPABASE_SERVICE_ROLE_KEY` present on worker hosts only?  
6. Was `CJ_API_KEY` **rotated** after the compromise note?  
7. Should `/games` stay in sitemap/Home circles while stubbed?  
8. Where did the owner see `LEARNING_IMPORT` / `publish_targets` / `Source locale` — another repo, CMS, or production DB rows?  
9. Intended cookie/GDPR jurisdiction and counsel review of 19 July 2026 Beta terms?  
10. Node version to standardize (no `engines` / `.nvmrc`)?  
11. Should `worktrees/` be eslint-ignored and gitignored?  
12. Does `npm run build` succeed on this branch?  
13. Are AASA / Android assetlinks env vars set in production? (routes 404 if unset)  
14. Payment capture timeline (store copy says not enabled)?  
15. Full a11y audit and icon-button inventory?  
16. Was a secret ever committed? (history not scanned to avoid printing values)

---

## Appendix A — Best-effort `CREATE TABLE` column parse

Parser: first identifier on each line inside `create table if not exists public.X (…);`. **Includes false positives** (`references`, `or`, `and`, duplicate constraint names). Use migrations as source of truth.

See the machine listing captured during the audit (`PARSED_TABLES=275`). Representative rows:

| Table | Parsed col count | Parsed names (noisy) |
|---|---|---|
| `profiles` | 6 | id, full_name, username, avatar_initial, created_at, username |
| `posts` | 12 | id, content, post_type, author_name, author_username, author_avatar, image_url, video_url, likes, comments, shares, created_at |
| `learning_courses` | 40 | id, program_id, slug, name, description, status, visibility, … branding_metadata, seo_metadata, ai_metadata … |
| `orders` | 19 | id, buyer_id, store_id, order_number, status, payment_status, fulfillment_status, totals, currency … |
| `messages` | 22 | id, conversation_id, sender_id, body, message_type, … |
| `live_rooms` | 31 | id, host_id, title, visibility, status, city, country, sfu_room_id … |

Full 275-line dump is in the audit agent capture file; reproducing every noisy line here adds little vs opening `supabase/migrations/*.sql`.

**Indexes:** many `create index if not exists` in the same migrations (e.g. `profiles_username_idx` at `20260712_auth_profiles_posts_rls.sql:21-22`). Complete index/FK inventory: **not listed line-by-line** (would exceed usefulness); grep `create index` / `references` in `supabase/migrations/`.

---

## UNKNOWN index (all `UNKNOWN — reason` from both parts)

| Topic | Reason |
|---|---|
| Required Node version | No `.nvmrc` / `engines` |
| Hosting product (Vercel vs VPS) | No deploy manifest; live is nginx |
| Package unmaintained status | Not checked on npm registry |
| Exact live SHA | Not in this checkout |
| Remote schema == migrations | Migrations not applied/inspected remotely |
| Edge Functions | No `supabase/functions` tree found |
| Secret ever in git history | History not scanned |
| `npm run build` | Not finished |
| Complete unlabeled-button / missing-label / empty-`<a>` counts | No a11y crawl |
| Learning import token path | Strings absent from this repo |
| Broken in-content links | Not crawled |
| ActionButton accessible name | Implementation not fully read |
| GitHub `DATABASE_URL` secret set? | Cannot know without GitHub access |
