# Cursor report

## Summary

Added optional post origin (ISO-2 country + free-text city) on both create forms. Coordinates are stored only when the typed city matches `world_cities` for that country. Hardcoded UMTUBA / Worldwide is gone; missing origin hides location UI. Migration `20260942` written, not applied.

## Exact files changed

- `supabase/migrations/20260942_posts_origin_location_v1.sql` (added, not applied)
- `lib/site/postsOriginLocationMigration.test.ts` (added)
- `lib/geo/isoCountryCenters.ts`
- `lib/geo/postOrigin.ts` (added)
- `lib/geo/postOrigin.test.ts` (added)
- `lib/geo/resolveWorldCityCenter.ts` (added)
- `lib/geo/resolveWorldCityCenter.test.ts` (added)
- `app/create/PostOriginPicker.tsx` (added)
- `app/create/postOriginPicker.wiring.test.ts` (added)
- `app/create/post/CreatePostForm.tsx`
- `app/create/video/CreateVideoForm.tsx`
- `app/actions/createVideoPost.ts`
- `lib/supabase/videoPosts.ts`
- `lib/supabase/posts.ts`
- `lib/supabase/videoPostsServer.ts`
- `lib/supabase/followingFeed.ts`
- `lib/supabase/profileContent.ts`
- `app/actions/socialInteractions.ts`
- `app/discover/types.ts`
- `app/discover/DiscoverExperience.tsx`
- `app/discover/components/DiscoverLocationBanner.tsx`
- `app/discover/components/DiscoverCreatorInfo.tsx`
- `app/discover/components/DiscoverFeed.tsx`
- `app/discover/components/DiscoverVideoCard.tsx`
- `app/watch/types.ts`
- `app/watch/lib/mapWatchVideo.ts`
- `app/watch/lib/mapWatchVideo.test.ts`
- `app/watch/WatchExperience.tsx`
- `app/components/video/VideoOverlay.tsx`
- `app/lib/journey/handoff.ts`
- `app/lib/journey/resolveLocation.ts`
- `app/lib/nav/routes.ts`
- `app/components/journey/handoffArrival.ts`
- `app/components/journey/handoffArrival.test.ts`
- `app/components/journey-transition/JourneyHandoffArrival.tsx`
- `app/components/journey-transition/JourneyTransitionDirector.tsx`
- `app/components/journey-transition/WatchToJourneyOverlay.tsx`
- `lib/i18n/messages/types.ts`
- `lib/i18n/messages/en.ts`
- `lib/i18n/messages/ar.ts`
- `lib/i18n/messages/fr.ts`
- `lib/i18n/messages/es.ts`
- `lib/i18n/messages/de.ts`
- `lib/i18n/messages/pt.ts`
- `lib/i18n/messages/id.ts`
- `lib/i18n/messages/hi.ts`
- `lib/i18n/messages/ru.ts`
- `lib/i18n/messages/tr.ts`
- `lib/i18n/messages/zh-CN.ts`
- `lib/i18n/messages/ja.ts`
- `lib/i18n/messages/ko.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

`supabase/migrations/20260942_posts_origin_location_v1.sql` — additive nullable origin columns + checks + index. Not applied. No `supabase db push`.

## Security review

Location is opt-in only. No IP/GPS. Did not read `profiles.city` / `profiles.country`. Client cannot send lat/lng; inserts compute coords from `world_cities` or leave them NULL. Inserts/selects tolerate missing origin columns until the migration is applied. Country centroid is never written.

## Tests

Focused vitest PASS (origin helpers, mapper, picker wiring, i18n catalogs, journey handoff).

## TypeScript

`npx tsc --noEmit` PASS

## Build

`npm run build` PASS (Next 16.2.11)

## git diff --check

PASS

## git status --short

Uncommitted local work. Commit forbidden unless user asks.

## Open issues

- `20260942` not applied — origin writes retry without columns until it is.
- Article teaser insert path has no origin picker (out of this GO).
- `discover.worldwide` remains in all 13 catalogs and is now unused.
- Full-repo `npm run lint` historically fails on pre-existing errors; changed origin files lint clean (one pre-existing `<img>` warning on CreatePostForm).
- Did not click a signed-in publish in the browser (create routes require auth).
