# CURSOR_REPORT — DESKTOP_UMTUBA_POST_PUBLISH_EDITING_V1

## Owner QA follow-up — DESKTOP_UMTUBA_POST_EDIT_REPLACES_DELETE_X_V1

```
TASK_ID = DESKTOP_UMTUBA_POST_EDIT_REPLACES_DELETE_X_V1
STATUS = COMPLETE_CANDIDATE
COMMIT = 322a42e60553ddef82fcb92a126eb19a25e39d05
PREVIEW_URL = http://127.0.0.1:3032
DELETE_MOVED_INTO_EDIT = YES
RED_X_REMOVED_FROM_WATCH = YES
BLOCKERS = none
```

Owner Edit occupies the old Watch/Home right-rail delete slot (`watch-rail-btn` 12×12). Guests still see nothing (`viewerMaySeeDeleteControl`). Standalone on-screen delete is gone from Watch/Home. `/edit/post/[id]` has Delete + confirm dialog via existing `deletePostAction` / owner RLS. Auth not weakened. Watch layout not redesigned.

Preview: detached `next dev -p 3032 -H 0.0.0.0` (production `.next` rebuild was blocked by disk; C: later recovered). Verified `GET /` → 200, `GET /edit/post/542` guest → 307 `/login?next=/edit/post/542`.

## Summary

Owners can edit their own draft and published posts on the same Post ID. Caption, hashtags, article body, single-slot image/video replace, cover, and video IN/OUT trim are editable. Failed media revisions abort before any `posts` update so the live path stays intact. Cancel never writes. No migration. Isolated worktree only; not pushed; not deployed.

```
TASK_ID = DESKTOP_UMTUBA_POST_PUBLISH_EDITING_V1
STATUS = COMPLETE_CANDIDATE
BASE_REF = origin/alpha-0.2
BASE_SHA = b5fbeff29cb0f308481b38c06500c572cd44a9c4
WORKTREE = C:\Users\1\Desktop\umtuba\worktrees\DESKTOP-UMTUBA-POST-PUBLISH-EDITING-V1
BRANCH = desktop/umtuba-post-publish-editing-v1
PARENT_PRESERVED = YES
PARENT_HEAD = 380a36646d4de8a37c39a56ac3ccd449f6d8b20d
TYPECHECK = PASS
TESTS = PASS
BUILD = PASS
LOCAL_PREVIEW = http://localhost:3032
MIGRATION_APPLIED = NO
PUSHED = NO
DEPLOYED = NO
READY_FOR_OWNER_QA = YES
```

Architecture reused (no speculative schema):

- `public.posts` numeric `id`, `content` caption, single `image_url`, single `video_path`, engagement counters, `article_id`, `media_status`, `media_pipeline` JSONB.
- Public URL remains `/watch?post={id}`. Comments/likes/views/saves stay keyed to the same `post_id`.
- Video trim = **A** playback IN/OUT on `media_pipeline.playback` plus **B** atomic `video_path` switch after a validated replacement. Previous object retained in `media_pipeline.edit.previousVideoPath`.
- Create-time overlay editor is unchanged. Spatial crop does not exist and was not invented. Server remux/transcode was not invented.
- App-layer auth is owner-only. Existing posts RLS is owner-only. No admin bypass added (would weaken RLS). No service-role bypass.

## Exact files changed

Modified:

- `app/actions/createVideoPost.ts` — optional trim passthrough only; Create form still does not use the timeline.
- `app/articles/[articleId]/page.tsx` — owner Edit link + Edited stamp.
- `app/components/ContentCard.tsx` — subtle Edited stamp.
- `app/components/social/OwnerContentDeleteControl.tsx` — owner Edit href.
- `app/components/video/VideoOverlay.tsx` — Edited stamp on Watch.
- `app/components/video/VideoPlayer.tsx` — playback IN/OUT clip.
- `app/components/video/VideoSlide.tsx` — trim props.
- `app/data/types/post.ts` — `editedAt`.
- `app/discover/components/DiscoverNativeVideo.tsx` — trim clip.
- `app/discover/components/DiscoverVideoCard.tsx` — trim props.
- `app/discover/types.ts` — `editedAt` / trim.
- `app/lib/nav/index.ts` — export `buildEditPostHref`.
- `app/lib/nav/routes.ts` — `APP_ROUTES.editPost` + `buildEditPostHref`.
- `app/watch/lib/mapWatchVideo.ts` — `editedAt`.
- `app/watch/types.ts` — `editedAt`.
- `docs/ai/CURRENT_TASK.md` — this task packet.
- `lib/supabase/videoPosts.ts` — pipeline trim / editedAt / playback attach.

Added:

- `app/actions/updateOwnedPost.ts`
- `app/actions/updateOwnedPost.test.ts`
- `app/create/video/VideoTrimTimeline.tsx` (edit workspace only)
- `app/edit/post/[postId]/page.tsx`
- `app/edit/post/EditPostWorkspace.tsx`
- `lib/media/videoTrim.ts`
- `lib/media/videoTrim.test.ts`
- `lib/posts/editOwnedPost.ts`
- `lib/supabase/editOwnedPost.test.ts`
- `docs/ai/CURSOR_REPORT.md`

Not touched: Android Watch V3, Globe, Learning product, Store, payments/Stripe, `_port_extract`, parent office branch, Windows Desktop.

## Migrations created

None. `SCHEMA_CHANGE_REQUIRED = NO`. `MIGRATION_REQUIRED = NO`. `MIGRATION_APPLIED = NO`. Extra keys live in existing `media_pipeline` JSONB.

## Security review

- Edit page: unauthenticated → login `?next=/edit/post/{id}`. Non-owner → `notFound()`.
- Server action uses `getServerUser` + `updatePostForOwner` with `.eq("user_id", userId)`. No service-role client.
- `assertSafeUpdatePatch` refuses `id`, `user_id`, `created_at`, and engagement columns (`likes`, `comments`, `shares`, `saves`, `views`).
- Unvalidated media revision returns `media_failed` with `livePreserved: true` and does not call update.
- Video replacement must be an owned storage path; signed-URL validation required before switch.
- RLS not bypassed. Ownership not weakened. Admin bypass not added.
- `.env.local` copied from parent for local preview only; gitignored; values never printed.

## Tests

PASS — targeted vitest covering trim normalize/validate, abort-vs-switch, owner forbidden, same Post ID, engagement refuse, draft same-row, article append, failed replace leaves live path, server-action contract (no service-role).

## TypeScript

PASS — `npx tsc --noEmit`.

## Build

PASS — `npm run build` (Next 16.2.11). `/edit/post/[postId]` present. Pre-existing Turbopack NFT warning on translation-studio is unrelated.

## git diff --check

PASS (no whitespace errors).

## git status --short

Recorded after the authorized local commit on `desktop/umtuba-post-publish-editing-v1`. Parent `office/profile-hero-completeness-v1` @ `380a366` remains dirty and was not reset/cleaned/stashed.

## Open issues

- `MEDIA_REORDER = NO` — posts schema is one image + one video, not a gallery.
- Spatial crop does not exist in the media pipeline; not invented.
- Server remux of a published trim is not implemented; playback IN/OUT metadata plus optional uploaded replacement.
- Owner signed-in browser E2E was not executed in this agent (no owner credentials). Preview proved `/edit/post/1` → `307 /login?next=/edit/post/1`, `/watch?post=1` 200, `/` 200 on `http://localhost:3032`.
- PUSHED = NO. Deploy not authorized.

## Owner QA candidate

Sign in as the post owner → own video on Home or `/watch?post={id}` → right-rail **Edit** (same slot as the old red X) → change caption and/or IN/OUT → Preview → Cancel (confirm `/watch?post={id}` unchanged) → Edit again → Save → same URL, same comments/likes/views, subtle Edited stamp. Delete lives only on `/edit/post/{id}` behind a confirm dialog.
