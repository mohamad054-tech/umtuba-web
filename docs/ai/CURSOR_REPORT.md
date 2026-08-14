# CURSOR_REPORT — PC2 Remaining User Findings Implementation V1

```text
SOURCE_DEVICE = PC2
DEVICE_ROLE = PLATFORM_USER_FINDINGS_PRIMARY
TASK_ID = PC2_REMAINING_USER_FINDINGS_IMPLEMENTATION_V1
REPORT_TYPE = IMPLEMENTATION / FINDING_FIX
TIMESTAMP_LOCAL = 2026-08-14 ~11:45 +03
SECRET_VALUES_PRINTED = NO
FORCE_PUSH = NO
PUSH = NO
PRODUCTION_MUTATED = NO
SECRETS_EXPOSED = NO
REMOTE_MIGRATION_APPLIED = NO
ALPHA_MERGE = NO
AASA_REIMPLEMENTED = NO
UAF12_REIMPLEMENTED = NO
```

## Summary

PC2 implemented the four remaining user findings on a **fresh worktree/branch from current alpha**, not the stale office tree.

| Field | Evidence |
| --- | --- |
| AUTHORITATIVE_BASE_SHA | `4e075f996cdb4b86835b96ab57987aed924d2dc6` (`origin/alpha-0.2` after `git fetch --all --prune`) |
| TASK_BRANCH | `pc2/wp-qa-user-findings-v1` |
| TASK_WORKTREE | `worktrees/_pc2_wp_qa_user_findings` |
| STALE_OFFICE | `office/platform-translation-trunk-port-v1` @ `2a146bb` — untouched as integration base |
| INVENTORY | Laptop sweep `docs/ai/LAPTOP_WHOLE_PLATFORM_UX_FUNCTIONAL_QA_SWEEP_V1.md` @ `07d1180` (not on alpha) |

Known Central landings verified on alpha: `2df90a29`, `570813f9`, `76598e7f`, `d7b6504f`, `4e075f99`. Learning parity `295e9253` exists but is **not** on `origin/alpha-0.2` (lives on `origin/office/learning-ai-tutor-learner-ui-integration-v1`).

## Finding statuses

### WP-QA-01 / UAF-07 — Explore This City

- **REPRODUCED = YES** on alpha source: Home “Explore this city” used `buildHomeCityFocusHref` → `/?focus={city}`. `DiscoverExperience` reads `city`/`post` only, so `?focus=` was ignored and the user stayed on Worldwide Home.
- **ROOT CAUSE:** Dead handoff. The builder claimed “Living Earth focus” but wrote a Home query that Home never consumed. World already accepts `?city=`.
- **FIX:** `buildHomeCityFocusHref` now returns `/world?city={slug}`. Home and `/discover` leftover `?focus=` redirect through the same builder. DiscoverExperience still calls the shared builder (no feed/swipe/player rewrite).
- **STATUS:** CODE_FIXED. **FIXED_VERIFIED = NO** until this branch is deployed and a guest click is re-probed on production.
- Production today (pre-deploy) still serves the old Home `?focus=` behavior.

### WP-QA-02 / UAF-09 — World

- **REPRODUCED = YES** on production guest GET `https://umtuba.com/world` (200): copy “World Discovery database migrations are not available in this environment yet.” Controls hidden. Matches `databaseReady === false`.
- **ROOT CAUSE:** World UI exists (`/world`, city/place/search, destination + optional GPS). Public bootstrap queries `world_feature_flags` / `world_cities` / `world_place_categories`. Any error → `databaseReady=false`. Docs + SQL: migrations `20260825`–`20260827` are local; `world_discovery_enabled` defaults **OFF**. Production still lacks the tables (or the queries fail). This is **not** a missing globe component on the current product contract — World V1 is destination/places, not Journey Globe Pro (`/journey-pro` is experimental).
- **FIX (code only):** honor Explore-This-City `?city=` in the unavailable state; auto-run destination search when DB+flag are ready; do **not** hide World from nav; do **not** invent a fake globe or enable the flag in code.
- **STATUS:** CODE_IMPROVED / **RUNTIME STILL BLOCKED**. Full World explorer requires Central to apply World migrations remotely and enable `world_discovery_enabled`. **FIXED_VERIFIED = NO**.
- **MIGRATION_REQUIRED = YES** (existing `20260825`/`20260826`/`20260827` — not created this wave; not applied remotely).

### WP-QA-13 / UAF-01 — Create

- **REPRODUCED = YES** on alpha source: Home Create circle + UserMenu Create → `/create/video` only. Supported types already exist: video (`/create/video`), article (`/create/article`), text/image (`createPost` + `CreatePostModal`).
- **ROOT CAUSE:** Generic Create entry was wired to the video route.
- **FIX:** `/create` chooser (auth-gated) with Video, Article, and Text or image. Home circle + UserMenu point at `APP_ROUTES.create`. Video/article pages “Back to Create”.
- **STATUS:** CODE_FIXED. **FIXED_VERIFIED = NO** until deployed + signed-in click-through.
- Did not invent unsupported types.

### UAF-11 — Username propagation

- **REPRODUCED = YES (source)** / **RUNTIME = BLOCKED_BY_AUTH_ENV**. `updateOwnProfile` writes `profiles` only. `insertVideoPostForUser` / `createPost` snapshot `author_username` / `author_name` onto `posts`. Feed mapped those snapshots. No AUTH_ENV on PC2 — no live rename sequence.
- **ROOT CAUSE:** Identity is **snapshotted on the post row**, then shown. Profile/settings are live. New posts already pick up the current profile.
- **FIX:** `applyLiveAuthorIdentity` / `enrichAuthorIdentityFromProfiles` overlays live `profiles` fields by `user_id` on Discover/Watch/legacy feed loads. **No bulk UPDATE of historical post rows.**
- **STATUS:** CODE_FIXED for feed/watch display. **FIXED_VERIFIED = NO**. Runtime remains partial until Central provides AUTH_ENV.
- Profile page header already uses live `profiles` fields.

### UAF-12

Not reimplemented. No regression found in this delta. Remains CODE_LANDED on alpha (`6e494df` / `d7b6504`); **FIXED_VERIFIED = NO** pending AUTH_ENV.

Closed items not reopened: UAF-02/03/06/08 (`2df90a29`), account deletion (`570813f9`), LanguageSelector + search timeout / WP-QA-09/12 (`660d60d` / `76598e7f`), AASA (`4e075f99`).

## Exact files changed

Product / tests:

- `app/lib/nav/routes.ts`
- `app/lib/nav/platformNavContract.ts`
- `app/lib/nav/userMenuItems.ts`
- `app/page.tsx`
- `app/discover/page.tsx`
- `app/discover/components/HomeSectionCircles.tsx`
- `app/world/WorldDiscoveryClient.tsx`
- `app/create/page.tsx` (new)
- `app/create/CreateChooser.tsx` (new)
- `app/create/video/page.tsx`
- `app/create/article/page.tsx`
- `lib/site/routeMetadata.ts`
- `lib/supabase/videoPosts.ts`
- `lib/supabase/videoPostsServer.ts`
- `app/lib/nav/exploreCityAndCreate.test.ts` (new)
- `app/lib/nav/homeReadinessGuardrails.test.ts`
- `app/lib/nav/platformNavContract.test.ts`
- `app/lib/nav/userMenuItems.test.ts`
- `lib/supabase/authorIdentity.test.ts` (new)
- `lib/world/worldExploreHandoff.test.ts` (new)

Docs (this branch):

- `docs/ai/CURSOR_REPORT.md`
- `docs/ai/CURRENT_TASK.md`

## Migrations created

None. World still depends on existing unapplied `20260825`–`20260827`. Not applied remotely.

## Security review

- Create chooser is auth-gated (`getServerUser` → login `?next=/create`). Text/image still uses existing `createPost` / `uploadPostImage`.
- World unavailable path still does not request GPS.
- Username overlay is read-only SELECT on `profiles` by already-resolved author UUIDs. No bulk write. Snapshot remains fallback.
- Home `?focus=` is treated as a city slug via existing `normalizeCityKey` / `slugifyCity` (no open redirect).
- No secrets, no AUTH_ENV fabrication, no production mutation.

## Tests

```text
npx vitest run app/lib/nav lib/world lib/supabase/authorIdentity.test.ts lib/ios/appleAppSiteAssociation.test.ts
Test Files  19 passed (19)
Tests  127 passed (127)
```

Focused first wave (57/57) also passed.

## TypeScript

`npx tsc --noEmit` — PASS (exit 0) after narrowing `user_id` before `.trim()`.

## Build

`npm run build` — PASS. `/create` listed in the App Router table. Next.js 16.2.10 Turbopack compiled; existing workspace-root lockfile warning only.

## git diff --check

PASS (run before commit).

## git status --short

See commit on `pc2/wp-qa-user-findings-v1`. Office dirty tree / SAVE_ALL / `worktrees/_store_visual_qa*` left untouched.

## Open issues

1. **PUSH_REQUIRED = YES** — branch is local only. Central must fetch after PC2 push is authorized (this wave did not push).
2. **World runtime** — apply `20260825`–`20260827` on production and enable `world_discovery_enabled` (operator/Central). Until then `/world` stays an honest empty hub.
3. **FIXED_VERIFIED** for 01/13/11 needs production deploy + (for 11 and Create text/image) AUTH_ENV.
4. STOP. Do not start another PC2 wave.
