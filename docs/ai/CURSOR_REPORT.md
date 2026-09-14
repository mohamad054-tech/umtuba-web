# Cursor Report — UGC post viewer visibility V1

## Summary

Step 2 on `feat/legal-pages-v1` at `c7dd4d68`. One shared helper now owns the post visibility rule. Every listed public surface calls it. Migration `20260944` is written only — not applied. Not committed.

The rule: hide a post when `deleted_at` is set, or the author's `profiles.moderation_status` is not `active`. Owner still sees their own removed post (with a Removed badge). A shadowbanned author sees their own posts; nobody else does. Suspended and banned authors are hidden on every public surface, including themselves. Platform admins are not widened on public surfaces. `/admin/moderation` does not call the helper.

Interactions (like, save, share, view, report, comment) reject removed posts and non-active authors, including the owner.

## Exact files changed

Created:

- `lib/supabase/postVisibility.ts`
- `lib/supabase/postVisibility.test.ts`
- `supabase/migrations/20260944_ugc_post_viewer_visibility_v1.sql`
- `lib/moderation/ugcPostVisibilityFoundation.test.ts`

Modified (visibility wiring):

- `lib/supabase/videoPostsServer.ts` — all six post queries
- `lib/supabase/followingFeed.ts`
- `lib/supabase/profileContent.ts` — stats fallback + videos + posts
- `lib/search/queries.ts` — `searchVideos`
- `lib/supabase/publicVideoSeo.ts` — OG + sitemap (anonymous)
- `app/actions/socialInteractions.ts` — saved posts
- `lib/store/videoCommerceQueries.ts` — product videos (anonymous)
- `lib/supabase/videoPosts.ts` — `deleted_at` select + `removed` on DTO
- `lib/supabase/socialInteractions.ts` — `createPostComment` + like/save not-found mapping
- `lib/supabase/rewards.ts` — `getPostJourney`
- `lib/content/services/profileProjectionService.ts` — drop cards whose `discovery_post_id` is not visible
- `app/profile/[username]/page.tsx` — pass `viewerId` into stats/videos/posts
- `app/sitemap.ts` — Life entries use `getLifePostsServer({ indexableOnly: true })`
- Watch / Discover / Life / profile removed badge + i18n `feed.postRemoved`
- `docs/ai/CURRENT_TASK.md`

Prior uncommitted moderation V1 files (`20260943`, `/admin`, Report control) remain on the same branch.

## Migrations created

**`supabase/migrations/20260944_ugc_post_viewer_visibility_v1.sql` — PRINT ONLY. Not applied. Never `supabase db push`.**

Contents:

- Optional `posts.user_id → profiles(id)` FK so PostgREST can embed `visibility_author:profiles!user_id!inner(moderation_status)`. Skipped if orphan `user_id` rows exist.
- `post_is_visible_to_viewer(...)` — same boolean as `isPostVisibleToViewer`
- `post_is_interactable(p_post_id)` — same boolean as `isPostInteractable`
- Replaces `get_profile_content_stats` so counts use `auth.uid()` + `post_is_visible_to_viewer` (still ANDed with `is_video_post_publicly_visible`)
- Replaces `toggle_post_like`, `toggle_post_save`, `record_post_share`, `record_post_view`, `report_ugc_content` to reject when not interactable
- Replaces `get_post_journey` to reject when not visible to `auth.uid()`
- No RLS policy changes
- `NOTIFY pgrst, 'reload schema'`

`20260943` is still print-only from Step 1.

## Security review

- Query-level only. No RLS edits.
- Viewer UUID is validated before interpolation into `.or()`.
- Public/SEO surfaces force `viewerId = null` (OG, video sitemap, Life sitemap, product videos).
- Admin queue does not import the helper and still sees taken-down rows.
- Interaction RPCs fail closed (`Post not found` / `Content not found`) when the post is removed or the author is not `active`.
- `post_is_interactable` is SECURITY DEFINER with `search_path = public` so the gate sees the real row.
- No secrets, env files, or remote DB access.

## Tests

```
npx vitest run lib/supabase/postVisibility.test.ts \
  lib/moderation/ugcPostVisibilityFoundation.test.ts \
  lib/moderation/ugcModerationFoundation.test.ts \
  lib/i18n/moderationCatalogs.test.ts \
  lib/supabase/profileContent.test.ts \
  lib/supabase/followingFeed.test.ts \
  lib/search/globalSearchFoundation.test.ts \
  lib/store/videoCommerce.test.ts \
  lib/content/contentServices.v2.test.ts \
  app/life/umLifePhase1.contract.test.ts \
  app/watch/lib/mapWatchVideo.test.ts
```

**PASS** (plus the helper matrix):

- Removed post hidden from others
- Banned author hidden
- Suspended author hidden
- Shadowbanned author sees own
- Owner sees own removed (removed state)
- Admin is not a widened public viewer; queue stays unfiltered
- Sitemap/OG use anonymous visibility
- Profile counts match visible rows (visitor vs owner)
- Like/comment on removed / non-active rejected via `isPostInteractable`

## TypeScript

`npx tsc --noEmit` — **PASS**

## Build

`npm run build` — **PASS**. `/admin`, `/admin/moderation`, `/sitemap.xml`, `/video-sitemap.xml` present.

## Lint

ESLint on touched visibility files — **PASS** after `prefer-const` fix in `profileContent.ts`.

Pre-existing Life `<img>` warnings only. Full-repo `npm run lint` still has the older unrelated error set.

## git diff --check

**PASS** (no whitespace errors)

## git status --short

Uncommitted on `feat/legal-pages-v1` @ `c7dd4d68`. New this step: `postVisibility.ts`, `20260944`, tests, and the surface wiring listed above. Prior Step 1 moderation files still untracked/modified. **No commit.**

## Open issues

- `20260943` and `20260944` must be applied together by the owner. Until then, `deleted_at` and the profiles embed do not exist on the live DB; feeds will error if this code is deployed first.
- If orphan `posts.user_id` rows exist, the profiles FK is skipped and the PostgREST embed will fail until those rows are cleaned up.
- Browser E2E of owner-removed / shadowban / admin-queue was not run (needs applied migrations, real posts, and a `platform_admins` session).
- Pre-existing `passwordReset.test.ts` failure (i18n key vs hardcoded English) is unrelated.
