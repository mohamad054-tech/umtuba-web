# Supabase setup (UMTUBA Backend Foundation V1)

## Environment

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (publishable / anon key only)

Never put the **service role** key in the Next.js app or commit it.

## Apply SQL migrations (in order)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **SQL Editor** → **New query**.
3. Run (if not already applied):

   `supabase/migrations/20260712_auth_profiles_posts_rls.sql`

4. Then run the additive Foundation V1 migration:

   `supabase/migrations/20260713_profiles_foundation_v1.sql`

5. Then run Video Posts V1:

   `supabase/migrations/20260713_video_posts_v1.sql`

6. Then run Social Interactions V1:

   `supabase/migrations/20260713_social_interactions_v1.sql`

7. Then run Messenger V1 Foundation (**manual apply only — not auto-applied**):

   `supabase/migrations/20260713_messenger_v1_foundation.sql`

8. Optionally run Live Streaming V1 Foundation (**manual apply only — not auto-applied**):

   `supabase/migrations/20260713_live_streaming_v1_foundation.sql`

9. Click **Run**.

### What `20260713_profiles_foundation_v1.sql` adds

- Extra `profiles` columns: `display_name`, `bio`, `city`, `country`, `avatar_url`, `updated_at`
- Username format allowing dots (`a-z`, `0-9`, `.`, `_`, 3–24 chars)
- Case-insensitive username uniqueness index
- Signup trigger updates (metadata → profile, duplicate username fallback)
- RLS re-asserted for public read + own insert/update only
- `avatars` storage bucket (public read, owner folder write, 2 MB, images only)

### What `20260713_video_posts_v1.sql` adds

- `posts` columns: `video_path`, `video_mime_type`, `video_byte_size`
- CHECK constraints for video size, MIME types, video posts requiring a path, and non-video posts clearing video metadata
- Private `post-videos` storage bucket (50 MB, `video/mp4` / `video/webm` / `video/quicktime`)
- Storage RLS (not bucket-wide public SELECT):
  - authenticated owners can SELECT/INSERT/UPDATE/DELETE only under `{auth.uid()}/…`
  - anyone may SELECT an object only when a published `posts` row (`post_type = video`) references that exact path (so short-lived signed URLs can be minted for Discover/feed)
- Indexes on `post_type` and `video_path`

### Manual Dashboard checks (avatars)

If storage policies were already customized, confirm after the migration:

1. **Storage** → bucket `avatars` exists and is **public**.
2. File size limit is **2 MB**.
3. Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
4. Objects are uploaded under `{user_id}/filename`.

If the bucket already existed with different settings, the migration upserts the bucket config and recreates avatar-specific storage policies by name.

### Manual Dashboard checks (post-videos)

After applying Video Posts V1:

1. **Storage** → bucket `post-videos` exists and is **private** (not public).
2. File size limit is **50 MB**.
3. Allowed MIME types: `video/mp4`, `video/webm`, `video/quicktime`.
4. Objects are uploaded under `{user_id}/filename`.
5. Confirm there is **no** bucket-wide public SELECT policy.
6. Confirm SELECT for owners (`{auth.uid()}/…`) plus SELECT only when a published video post references the object path.
7. Confirm INSERT/UPDATE/DELETE are authenticated + owner-folder only (anonymous cannot write).

### What `20260713_social_interactions_v1.sql` adds

- `posts` columns: `saves`, `views` (denormalized counters; likes/comments/shares already existed)
- Counter columns are client-read-only (trigger blocks direct counter UPDATE unless sync flag is set)
- Tables: `post_likes`, `post_comments`, `post_saves`, `post_shares`, `post_views`
- Unique constraints: one like/save per user/post; one share/view row per post + viewer_key
- Triggers keep `posts.likes|comments|saves` in sync; share/view counts update inside RPCs
- RPCs:
  - `toggle_post_like` / `toggle_post_save` — **SECURITY INVOKER**, `authenticated` only, identity from `auth.uid()`
  - `record_post_share` / `record_post_view` — **SECURITY DEFINER** + locked `search_path`, RPC-only table access
  - Auth share/view keys forced to `u:{auth.uid()}`; anon keys must be `d:{uuid}`
  - Share dedupe window: **1 hour**; view dedupe window: **6 hours**
- RLS: own-only like/save rows; comments readable when post exists; share/view tables have **no** direct policies

### Manual Dashboard checks (social)

After Social Interactions V1:

1. Confirm new tables exist under **Table Editor**.
2. In **Database → Replication**, enable Realtime for `public.posts` if you want live counter refresh on Discover.
3. Sign in, like/unlike a Discover video, and confirm one row in `post_likes` and `posts.likes` updates.
4. Comment, delete your own comment, confirm count sync.
5. Save a post, open `/saved`, then unsave.
6. Share (native or copy link) and confirm `posts.shares` increments at most once per device/user per hour.
7. Refresh a video repeatedly within 6 hours — `posts.views` should only increase once per device/user.
8. Confirm anon cannot SELECT `post_likes` / `post_saves` / `post_shares` / `post_views` rows directly.

### What `20260713_messenger_v1_foundation.sql` adds

- Tables: `conversations`, `conversation_participants`, `direct_conversation_pairs`, `messages`, `message_attachments`
- Conversation kinds: `direct` | `group` | `channel` | `phone` (V1 UI uses direct only)
- Message types prepared for text/image/video/file/audio/system/call; reply/forward/edit/delete columns; `client_id` idempotency
- Participant columns for unread, last-read (receipts), typing, mute/archive
- RPCs (authenticated): `get_or_create_direct_conversation`, `mark_conversation_read`, `set_conversation_typing`, `list_conversation_messages`
- Helper: `is_conversation_participant` (SECURITY DEFINER, avoids RLS recursion)
- RLS: participants only; no anon/public access; conversation creation via DEFINER RPC (not open client INSERT)

### Manual Dashboard checks (messenger)

After Messenger V1 Foundation:

1. Confirm new tables exist under **Table Editor**.
2. Sign in as two users; open `/messages` and start a DM (e.g. from a creator handoff).
3. Send text both ways; confirm rows in `messages` and preview updates on `conversations`.
4. Confirm unread badge clears after opening the thread (`mark_conversation_read`).
5. Confirm anon / signed-out users cannot SELECT messaging tables.
6. Optionally enable Realtime for `messages` later (not required for V1).

## Live Streaming V1 (optional, additive)

Do **not** auto-apply from the app. When ready, paste:

`supabase/migrations/20260713_live_streaming_v1_foundation.sql`

into the SQL Editor and run it. This adds live rooms, participants, chat, and foundation tables (reports, bans, gifts, reactions, recordings, replays, precise location, moderation events) with RLS + RPCs. Until applied, `/live` runs in demo mode.

**Location privacy:** exact lat/long are stored only in `live_room_precise_location` (host/staff). Public clients receive city/country only.

**Realtime:** enable Realtime for `live_chat_messages` and `live_rooms` if the publication block did not attach (Dashboard → Database → Publications). RLS still filters events per subscriber.

## Auth settings

In **Authentication → Providers**, ensure **Email** is enabled.

If **Confirm email** is enabled, new users must confirm before they get a session. The app shows a clear message in that case. For local testing you can temporarily disable email confirmation.

## Verify quickly

1. Sign up at `/signup` with email/password + username.
2. Confirm a row appears in `profiles` with `username` and `display_name`.
3. Sign in at `/login` and confirm redirect to Discover (or `?next=`).
4. Open `/settings`, edit bio/city, optionally upload an avatar.
5. Open `/profile/{username}` and confirm the real profile loads.
6. Visit `/messages` signed out → redirected to `/login`.
7. Sign out from Settings or Feed AuthStatus.
8. Sign in, open `/create/video`, upload an MP4 under 50 MB with an optional caption.
9. Confirm a `posts` row with `post_type = video` and a non-null `video_path`.
10. Open `/discover` and confirm the clip plays with native controls.
11. Visit `/create/video` signed out → redirected to `/login`.
12. Sign in, like/unlike a Discover video (optimistic UI + persisted count).
13. Open comments, post one, delete your own, confirm count updates.
14. Save a video, open `/saved`, then unsave.
15. Share a video (native share or clipboard fallback) and confirm share count rises.
16. Refresh the same video within 6 hours — view count should not keep climbing.
17. Sign in, open `/messages`, confirm conversation list (empty or with DMs).
18. Open a 1:1 chat, send text, confirm optimistic send then server id.
19. Open the same thread as the other user; confirm receive + unread behavior.
