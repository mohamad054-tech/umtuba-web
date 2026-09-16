# Cursor Report — merge release/v1 (20260948 record) into feat/video-view-count-v1

## Summary

Merged `origin/release/v1` (`b5146049`, docs-only record that `20260948_abuse_limits_v1` was applied on production) into `feat/video-view-count-v1` (`63828f11`, already deployed and user-tested). Conflicts were docs-only (`CURRENT_TASK.md`, `CURSOR_REPORT.md`); both histories were kept. Application code is unchanged from `63828f11` except the docs-only 20260948 files from `b5146049`. No SQL applied. Not deployed. No force-push.

---

# Cursor Report — Show view count on videos

## Summary

Video posts now show an eye icon and compact view count on Home (Discover action rail), `/watch` (Watch action rail), and UM Life video cards. Counts come from the existing `posts.views` column already selected by `postColumns` + `postsSelectVisible`. When `record_post_view` returns `counted=true`, Home and Watch patch the displayed count from the returned `views` value only (no refetch). `0` renders as `"0"`. Visible to everyone, including guests. Not a button. Like / comment / share behaviour is unchanged.

No SQL. Not deployed from the feature worktree (feature was later deployed and user-tested OK).

## Exact files changed

- `app/components/video/VideoViewCountStat.tsx` (new)
- `app/discover/components/DiscoverActionRail.tsx`
- `app/components/video/VideoActionRail.tsx`
- `app/discover/components/DiscoverVideoCard.tsx`
- `app/watch/WatchExperience.tsx`
- `app/life/LifeEngagementBar.tsx`
- `app/life/lib/lifePosts.ts`
- `lib/supabase/videoPosts.ts`
- `lib/i18n/messages/types.ts`
- `lib/i18n/messages/en.ts`
- `lib/i18n/messages/ar.ts`
- `lib/i18n/messages/fr.ts` — unchanged (inherits English via `...enMessages`)
- `lib/i18n/messages/es.ts` — unchanged (inherits English via `...enMessages`)
- `lib/i18n/messages/de.ts` — unchanged (inherits English via `...enMessages`)
- `lib/i18n/messages/pt.ts` — unchanged (inherits English via `...enMessages`)
- `lib/i18n/messages/id.ts`
- `lib/i18n/messages/hi.ts`
- `lib/i18n/messages/ru.ts`
- `lib/i18n/messages/tr.ts`
- `lib/i18n/messages/zh-CN.ts`
- `lib/i18n/messages/ja.ts`
- `lib/i18n/messages/ko.ts`
- `app/lib/social/shareAndViews.format.test.ts` (new)
- `app/lib/video/videoViewCount.contract.test.ts` (new)
- `app/life/umLifePhase1.contract.test.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## How views are selected / mapped

- Shared `postColumns` in `lib/supabase/videoPosts.ts` already includes `views`.
- Home / Watch / Life loaders already wrap that list with `postsSelectVisible(...)`.
- `attachPlaybackUrls` maps `views: post.views ?? 0` onto `PublicPostDTO`.
- `mapVideoPostToDiscover` maps `stats.views` (now `post.views ?? 0`).
- `discoverVideoToWatchVideo` copies `stats`.
- `mapPublicPostToLifePost` maps `views: post.views ?? 0`.
- No extra query per video.

## Where UI was added

- **Home:** `DiscoverActionRail` — `VideoViewCountStat` directly under Share, before More.
- **Watch:** `VideoActionRail` — `VideoViewCountStat` directly under Share, before Save.
- **UM Life:** `LifeEngagementBar` — `VideoViewCountStat` variant `life` next to like/comment/share/save, **video posts only**.

Non-button. Same compact count style as like/comment/share. RTL-safe (flex/grid + logical classes; no `left`/`right`/`ml`/`mr`).

## Formatter used

Existing `formatInteractionCount` in `app/lib/social/shareAndViews.ts` (`0` → `"0"`, `1200` → `"1.2K"`, `3400000` → `"3.4M"`). Same helper as like/comment/share so counts stay consistent. Not Intl-compact (that would change sibling rail counts).

## Live update path when `counted=true`

- Home: `DiscoverVideoCard` calls `recordFeedViewOnce`; if `result.ok && result.counted`, `onStatsChange({ views: result.views })`.
- Watch: `WatchExperience.handleActiveChange` same gate; patches that video’s `stats.views` from `result.views`.
- Rate-limit / throttle (`counted=false`, including `views: 0`) does **not** overwrite the displayed count.
- No refetch.

## i18n

- Key: `video.views.label`
- **en:** `{count} views`
- **ar:** `{count} مشاهدة`
- Locales that fall back to English: `fr`, `es`, `de`, `pt` (via `...enMessages`), `id`, `hi`, `ru`, `tr`, `zh-CN`, `ja`, `ko` (explicit English string for catalog type completeness).

## Migrations created

None.

## Security review

- Reads the already-public `posts.views` column. No new RPC, no new endpoint, no extra SELECT.
- Display is visible to guests. Write path remains `record_post_view` (SECURITY DEFINER, throttled).
- Optimistic UI uses only the RPC’s returned `views` when `counted=true`.
- No secrets printed. No remote DB writes from this machine.

## Tests

- `npx tsc --noEmit` PASS
- `npx vitest run` related suites PASS:
  - `app/lib/social/shareAndViews.format.test.ts` (3)
  - `app/lib/video/videoViewCount.contract.test.ts` (6)
  - `app/life/umLifePhase1.contract.test.ts` (13)
  - also `feedUnification`, `socialEngagement.harden`, `mapWatchVideo`, `videoMoreMenu.contract`, `authorIdentity`, `i18nFoundation`
- `npm run build` PASS

## TypeScript

PASS (`npx tsc --noEmit` and Next build TypeScript step)

## Build

PASS (`npm run build`)

## ESLint (edited files)

New issues: none.

Pre-existing (unchanged by this task):

- `WatchExperience.tsx`: 4 `react-hooks/refs` errors (ref writes during render). Unrelated to the counted-view patch.
- `LifeEngagementBar.tsx`: 1 `@typescript-eslint/no-unused-vars` warning (`shareWithNative`). Pre-existing unused import.

## git diff --check

PASS (no whitespace errors)

## git status --short

Recorded at commit time on `feat/video-view-count-v1`.

## Open issues

- UM Life does not call `recordFeedViewOnce`; it displays the mapped count only. Live increment still happens on Home / Watch when a video becomes active.
- Profile aggregate view stats were not changed.
- Browser click-through of the new rail/Life count was not verified here (no signed-in feed in this worktree).
- SQL not applied from the feature worktree.

---

# Cursor Report — record 20260948 applied

## Summary

Documented that `20260948_abuse_limits_v1.sql` was applied manually on production 2026-09-16. The `event_type` CHECK replacement block was skipped because live `video_commerce_events_event_type_check` already matches. SQL body unchanged. No SQL applied from this machine. Not deployed.

## Exact files changed

- `supabase/migrations/20260948_abuse_limits_v1.sql` (header comment only)
- `docs/audit/PROD_SECURITY_SQL_2026-09-15.md`
- `lib/security/abuseLimits.foundation.test.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None. `20260948` already existed; header only.

## Security review

- Docs-only. No application code. No remote DB writes.
- Note recorded: `rpc_abuse_events` ~700 rows/day; add 7-day cleanup before traffic grows.

## Tests

- `npx vitest run lib/security/abuseLimits.foundation.test.ts` — run at handoff.

## TypeScript

Not required (docs/comments/test assertion only).

## Build

Not required.

## git diff --check

Run at handoff.

## git status --short

Run at handoff.

## Open issues

- Cleanup job for `rpc_abuse_events` (delete rows older than 7 days) is not implemented.
- File still contains the skipped CHECK replacement SQL; do not re-apply blindly.
