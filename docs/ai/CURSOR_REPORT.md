# Cursor Report — video More menu v1

## Summary

Home Discover and Watch feeds now share one **More** menu.

- Own post: Edit caption, Copy link, Delete (existing `deletePostAction` confirm flow).
- Other posts: Copy link, Not interested, Report (existing `UgcReportControl` / report RPCs).
- Copy link uses `copyPostLink` / `buildPostShareUrl`.
- Not interested is client-side hide + advance (no hide table exists).
- Caption edits `public.posts.content` via owner session update, preferring `update_own_post_caption` when applied.

Branch `feat/video-more-menu-v1` from `origin/release/v1` @ `cd3a479e`. Not deployed. SQL not applied.

## Exact files changed

- `app/components/social/VideoMoreMenu.tsx` (new)
- `app/components/social/UgcReportControl.tsx`
- `app/components/social/videoMoreMenu.contract.test.ts` (new)
- `app/actions/updatePostCaption.ts` (new)
- `lib/supabase/updateOwnPostCaption.ts` (new)
- `lib/supabase/updateOwnPostCaption.test.ts` (new)
- `lib/supabase/deleteOwnedPost.test.ts`
- `lib/moderation/ugcModerationFoundation.test.ts`
- `lib/i18n/messages/types.ts`
- `lib/i18n/messages/moderationCatalogs.ts`
- `app/discover/components/DiscoverActionRail.tsx`
- `app/discover/components/DiscoverVideoCard.tsx`
- `app/discover/components/DiscoverFeed.tsx`
- `app/discover/DiscoverExperience.tsx`
- `app/components/video/VideoActionRail.tsx`
- `app/components/video/VideoOverlay.tsx`
- `app/components/video/VideoSlide.tsx`
- `app/components/video/VerticalVideoFeed.tsx`
- `app/watch/WatchExperience.tsx`
- `supabase/migrations/20260945_update_own_post_caption_v1.sql` (new, not applied)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

`supabase/migrations/20260945_update_own_post_caption_v1.sql` — **not applied**.

Creates `public.update_own_post_caption(p_post_id bigint, p_content text)` (security definer, `auth.uid()` owner check, updates `content` only, max 1000 chars). Grant execute to `authenticated` only.

## Security review

- No secrets or `.env` touched.
- Delete still uses `deletePostAction` / owner RLS. No `service_role`.
- Caption action uses `getServerUser` + owner `user_id` filter. RPC (when applied) is caption-only.
- Existing posts UPDATE RLS is owner-only but column-wide; the new RPC is the narrow contract.
- Report still uses existing UGC RPCs. Not interested is local only (no forged server hide).
- Menu/dialogs lock auto-advance; they do not pause playback.

## Tests

```
npx vitest run lib/supabase/updateOwnPostCaption.test.ts app/components/social/videoMoreMenu.contract.test.ts lib/supabase/deleteOwnedPost.test.ts lib/moderation/ugcModerationFoundation.test.ts lib/i18n/moderationCatalogs.test.ts lib/video app/lib/video app/watch app/components/video app/discover
```

PASS: 15 files, 72 tests.

## TypeScript

```
npx tsc --noEmit
```

PASS.

## Build

```
npm run build
```

PASS. Existing Turbopack NFT warning unchanged.

## git diff --check

PASS.

## git status --short

Clean after commit/push (this report committed with the feature).

## Open issues

- Not interested is session/client-only. Need `post_hides` / `not_interested` table + feed filter to persist across reloads/devices.
- Caption RPC is not applied; action falls back to owner RLS `update({ content })`.
- Existing posts UPDATE policy still allows owners to change any column if they call PostgREST directly.
- Comments / share sheet still do not lock Discover auto-advance (out of this menu’s lock unless those UIs set the same flag).
- Locales needing real translation for `video.more.*`: de, es, fr, hi, id, ja, ko, pt, ru, tr, zh-CN (ar + en are written).
