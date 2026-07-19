# UMTUBA Story Foundation V1

Production-ready foundation for ephemeral Stories inside UMTUBA web (`alpha-0.2`). Images and video only. No music, stickers, AI, reactions, replies, or UM Points.

## Architecture

```
Discover (StoryRail)
  ├─ Add Story → StoryComposer → uploadStoryMedia (client)
  │                              → createStoryAction (server)
  ├─ Avatar circles → StoryViewer (fullscreen)
  │                    ├─ recordStoryViewAction
  │                    ├─ deleteStoryAction (owner)
  │                    └─ getMyStoryViewersAction (owner)
  └─ useStoriesRail → listActiveStoriesAction
                      + Supabase Realtime on public.stories
```

Domain code lives under `lib/stories/` (types, validation, expiry, upload, queries, views, errors). Server entrypoints are `app/actions/stories.ts`. UI lives under `app/stories/`.

The Story rail mounts on **Discover** (`app/discover/DiscoverExperience.tsx`), above the video stage, inside `DiscoverShell` so `AppTopNav` and `AppMobileBottomNav` offsets remain intact. There is no standalone `/stories` route in V1.

## Database schema

Migration: `supabase/migrations/20260803_stories_foundation_v1.sql`

### `public.stories`

| Column | Notes |
|---|---|
| `id` | uuid PK |
| `owner_id` | auth.users, cascade delete |
| `media_path` | storage object path `{user_id}/{uuid}.{ext}` |
| `media_type` | `image` \| `video` |
| `caption` | optional, ≤ 500 chars |
| `created_at` | timestamptz |
| `expires_at` | timestamptz, enforced to `created_at + 24 hours` |

Trigger `stories_enforce_expiry` sets/locks the 24h lifetime and prevents media/owner mutation on update.

### `public.story_views`

| Column | Notes |
|---|---|
| `id` | uuid PK |
| `story_id` | FK → stories, cascade delete |
| `viewer_id` | auth.users |
| `first_viewed_at` | preserved on update |
| `last_viewed_at` | refreshed on re-view |

Unique `(story_id, viewer_id)` prevents duplicate rows. Trigger preserves `first_viewed_at`.

### Indexes

- `stories_owner_id_idx`, `stories_expires_at_idx`, `stories_owner_created_idx`, `stories_expires_created_idx`, `stories_media_path_idx`
- `story_views_story_id_idx`, `story_views_viewer_id_idx`, `story_views_story_last_idx`

## RLS

Both tables use `ENABLE` + `FORCE` row level security.

### Stories

- **INSERT**: owner only (`owner_id = auth.uid()`)
- **DELETE**: owner only
- **UPDATE**: owner only (caption); trigger locks media/expiry/owner
- **SELECT**:
  - owner can read own rows (including expired, for cleanup)
  - followers can read via `can_view_active_story(owner_id, expires_at)` which requires `expires_at > now()` and a `profile_follows` edge (or self)

### Story views

- **INSERT / UPDATE**: `viewer_id = auth.uid()` only; insert also requires the story to be actively viewable
- **SELECT**: viewer can read own rows; story owner can read viewers of their stories
- **DELETE**: revoked from authenticated and anon

### Privileges

- `REVOKE ALL` on both tables from `anon` / `public`
- `can_view_active_story` is granted to `authenticated` only; execute revoked from `anon`
- No `service_role` usage in the web UI or actions

Expired stories are non-readable for followers at the RLS layer; the application also filters `expires_at > now()` when listing the rail.

## Storage

Private bucket `stories`:

- `public = false`
- Max 50 MB
- MIME: `image/jpeg`, `image/png`, `image/webp`, `video/mp4`, `video/webm`, `video/quicktime`
- Path: `{auth.uid()}/{uuid}.{ext}`

Policies:

- Owner read / upload / update / delete under own folder only
- Authenticated viewers may SELECT an object only when an **active** story row references that path and `can_view_active_story` passes

Playback uses **short-lived signed URLs** (15 minutes), matching Video Posts. Paths are stored in the database; URLs are minted server-side after RLS allows the row/object.

## User flow

1. Signed-in user opens Discover → Story rail loads own + followed active stories.
2. **Add Story** opens composer → client uploads to `stories` bucket → `createStoryAction` validates and inserts.
3. Tapping an avatar opens fullscreen viewer with progress bars, next/previous (tap, keyboard, swipe), close, loading/error fallbacks.
4. Viewing someone else’s story records a view (first + last timestamps). Own stories skip view recording.
5. Owner can delete from the viewer and open a basic viewers list with view count.
6. Realtime INSERT/DELETE on `stories` refreshes the rail; channel is removed on unmount.

Privacy model for V1: **followers + owner**, not public. No audience selector. Profiles have no private-account flag today; Stories intentionally start more intimate than Discover video.

There is **no `profile_blocks` / user-block graph** in the current schema, so Stories V1 cannot gate on blocks. When a block system ships, `can_view_active_story` should be extended. Messenger mute is conversation-scoped and does not apply here.

Hardening notes:

- `media_path` must match `{owner_id}/…` (DB check + insert trigger)
- `created_at` is forced to `now()` on insert (no extended lifetime tricks)
- `story_views` insert/update triggers force `viewer_id = auth.uid()` and protect `first_viewed_at`
- Client DTOs expose signed `mediaUrl` only — raw `media_path` is never returned from list/create mappers

## Realtime

`public.stories` is added to `supabase_realtime` with `REPLICA IDENTITY FULL`. The client hook `useStoriesRail` subscribes to INSERT/DELETE and calls `listActiveStoriesAction` to resync. No polling.

## Limitations (V1)

- Image + video only
- No music, stickers, text overlays, AI, reactions, replies, or mentions
- No UM Points / rewards hooks
- No dedicated `/stories` route or nav item
- No demo seed data
- No archive / highlights
- Caption update is allowed by RLS but not exposed in the UI yet
- Viewer remints signed URLs on media error via `refreshStoryPlaybackAction` (bounded retries; raw `media_path` never sent to the client)

## Test strategy

Vitest source + pure-logic contracts in `lib/stories/storiesFoundation.test.ts`:

- Expiry math and filtering
- Media / caption / owned-path validation
- Migration RLS / storage / anon revoke contracts
- Server action surface (no service_role)
- Owner delete + view recording contracts
- Unread/read grouping
- Discover integration + viewer UX contracts
- Realtime cleanup (no `setInterval`)
- Docs presence

Run locally:

```bash
npx tsc --noEmit
npx vitest run
npm run build
```

## Next phases

1. Apply migration remotely (targeted apply + repair) after review
2. Signed URL refresh inside long viewer sessions
3. Optional public / close-friends visibility
4. Highlights / archive after expiry
5. Lightweight reactions or replies (product decision)
6. Push / notification when a followed creator posts a story
7. Mobile app parity (`umtuba-mobile`)

## Apply notes

Do **not** run a database reset. Prefer targeted apply of `20260803_stories_foundation_v1.sql` against the linked project once approved. Confirm Realtime is enabled for `stories` after apply.
