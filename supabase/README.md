# Supabase setup (UMTUBA Backend Foundation V1)

## Environment

Copy `.env.example` to `.env.local` and set:

### Required (browser + server + middleware)

| Variable | Runtime | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser, server, middleware (`proxy.ts`) | Supabase project URL (`https://…supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser, server, middleware | Publishable / anon key only |

Optional alias: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same key) if `PUBLISHABLE_KEY` is unset.

Validated by `lib/env/supabasePublic.ts`. Clients are never created with empty placeholders.

### Optional (LiveKit — only when using live media)

| Variable | Runtime | Purpose |
|----------|---------|---------|
| `LIVEKIT_API_KEY` | Server only | Token minting |
| `LIVEKIT_API_SECRET` | Server only | Token minting |
| `LIVEKIT_URL` | Server only | LiveKit API / WS URL |
| `NEXT_PUBLIC_LIVEKIT_URL` | Browser | Public `wss://` URL (no secrets) |

### Forbidden in this app

- `SUPABASE_SERVICE_ROLE_KEY` — do **not** add to `.env.local` for the Next.js app and never use `NEXT_PUBLIC_*` for it. Privileged work stays in Postgres SECURITY DEFINER functions.

### Unfinished surface gating (Phase A4)

| Surface | Production | Development |
|---------|------------|-------------|
| `/feed` | `notFound()` | Legacy feed (banner: use Discover) |
| `/city/[slug]` | “City experience is being prepared” empty state | Placeholder prototype |
| `/journey-pro` | `notFound()` | Experimental lab |
| `/live/media-lab` | `notFound()` | Media lab |
| `/watch` demo videos | Never | Allowed unless `NEXT_PUBLIC_ALLOW_SURFACE_PREVIEWS=0` |
| Watch Related/AI/UConnect panels | Hidden | Shown unless previews disabled |
| Live collab mock files / entry | Hidden | Shown unless previews disabled |
| Messenger attach/voice controls | Removed (text / reactions / edit / mute only; no attach or voice) | Same — not previewed |
| Messenger fake presence dots | Hidden | Opt-in only (`NEXT_PUBLIC_ALLOW_SURFACE_PREVIEWS=1`) |

Logic: `app/lib/product/surfaceGates.ts`.

### Fail-closed behavior (missing / invalid Supabase public config)

- Protected prefixes (`/messages`, `/notifications`, `/settings`, `/create`, `/saved`, `/rewards`, `/creator`) → **HTTP 503** (never treated as anonymous-allowed).
- Auth pages (`/login`, `/signup`, `/register`) → **HTTP 503** (no redirect loops to a broken login).
- Other public routes may continue without a session; browser/server Supabase helpers throw sanitized errors (no key material in messages).

Safe local setup: copy `.env.example` → `.env.local`, paste URL + publishable key from the Supabase Dashboard → **Settings → API**. Never commit `.env.local`.

## Migration governance (read before applying)

Production migration **history** and the local `supabase/migrations/` folder are **not** a safe 1:1 pushable chronology. Many objects exist remotely without matching `schema_migrations` rows; some local files (for example Push Tokens `20260805`) are **not** present as objects until a targeted apply.

- Do **not** run `supabase db push` or `supabase db push --include-all` against the linked production project.
- Do **not** mass-`migration repair` without an approved cutover window.
- Operating plan: [`docs/operations/MIGRATION_BASELINE_CUTOVER_PLAN_V1.md`](../docs/operations/MIGRATION_BASELINE_CUTOVER_PLAN_V1.md).

The numbered list below remains a **manual SQL Editor** guide for greenfield / lab apply. Prefer targeted apply of a single reviewed file when working on an already-live project.

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

   Then optionally Live Streaming V2 Realtime (participants channel):

   `supabase/migrations/20260714_live_streaming_v2_realtime.sql`

   Then optionally Live Streaming V3 Realtime hardening (idempotent publication check for chat/rooms/participants/reactions):

   `supabase/migrations/20260714_live_streaming_v3_realtime_hardening.sql`

   Then Live Media V2 multi-guest (stage queue, sessions, interactive + AI foundations):

   `supabase/migrations/20260714_live_media_v2_multi_guest.sql`

   Then Live Media V2 host stage fix (create_live_room on-stage + ensure_live_host_on_stage):

   `supabase/migrations/20260714_live_media_v2_host_stage_fix.sql`

10. Then Notifications V1 (follows + notifications inbox + realtime):

   `supabase/migrations/20260715_notifications_v1.sql`

11. Then Notifications V2 (Journey / rewards / nearby live / AI + preferences):

   `supabase/migrations/20260716_notifications_v2.sql`

12. Then Notifications V2 Automation (qualified views, journey auto, UM Points):

   `supabase/migrations/20260717_notifications_v2_automation.sql`

13. Then Notifications V2 event wiring (save/share notifications + AI milestone insights):

   `supabase/migrations/20260718_notifications_v2_event_wiring.sql`

14. Then Wallet balance Realtime (header live updates on `um_point_balances`):

   `supabase/migrations/20260719_wallet_balance_realtime.sql`

15. Then Activity Tier foundation (score ledger + badges, separate from UM Points):

   `supabase/migrations/20260720_activity_tiers_foundation.sql`

16. Then Activity Tier event wiring (posts/comments/likes/saves/shares/live/follows/referrals):

   `supabase/migrations/20260721_activity_tiers_event_wiring.sql`

17. Then Referral Rewards V1 (Growth Mode — immediate signup credit, invite links, attribution cookies):

   `supabase/migrations/20260722_referral_rewards_v1.sql`

18. Then UM Points award security (revoke client generic awards; trusted writers only):

   `supabase/migrations/20260723_um_points_award_security.sql`

19. Then Profile follow integrity (snapshot RPC + idempotent toggle with counts):

   `supabase/migrations/20260724_profile_follow_integrity.sql`


20. Then Profile content stats (video/like/view totals for public profiles):

   `supabase/migrations/20260725_profile_content_stats.sql`

21. Then Referral claim reliability (visitor resolution + existing-account guard for claim RPC):

   `supabase/migrations/20260726_referral_claim_reliability.sql`
   (**Required for invite-alpha** — enables cookie-loss / login-later claim paths. Verify with `scripts/verify-referral-claim-reliability.sql`.)
   Also blocks existing-account signup rewards. Apply manually after steps 17–20.

22. Then complete referral signup client-revoke follow-up (locks `complete_referral_signup` execute down to server-only):

   `supabase/migrations/20260728_complete_referral_signup_client_revoke.sql`

   Required so `complete_referral_signup` cannot bypass B4 (SECURITY DEFINER +
   client-chosen `p_referred_user_id`). Idempotent REVOKEs only — no client GRANT.

23. Then Live stale participant prune (ops/cron ghost-viewer cleanup):

   `supabase/migrations/20260727_live_stale_participant_prune.sql`
   (**Required for live reliability** — prunes ghost viewers left behind by dropped connections. Verify with `scripts/verify-live-stale-participant-prune.sql`. Runs on a schedule via `.github/workflows/prune-stale-live-participants.yml`, which needs the `DATABASE_URL` secret set in the repo.)
   Not client-callable (`anon` / `authenticated` execute revoked). Ops workflow calls
   `prune_stale_live_participants(120)` every 5 minutes once on the default branch.

24. Click **Run**.

25. Then Recommendation infrastructure V1 (watch signals + user interest / creator / video quality tables, deterministic-v1 feature snapshotting — additive, no ranking rewrite of the chronological feed):

   `supabase/migrations/20260731_recommendation_infrastructure_v1.sql`
   (Verify with `scripts/verify-recommendation-infrastructure.sql`.)
   **No AI.** Does **not** change chronological Discover/Watch feed APIs,
   Media Pipeline, Messenger, or Rewards award paths. Client-callable
   `record_watch_signal` only; aggregate refresh helpers are not granted to clients.

Verify automation objects (optional):

`scripts/verify-notifications-v2-automation.sql`

`scripts/verify-activity-tiers.sql`

`scripts/verify-um-points-award-security.sql`

`scripts/verify-profile-follow-integrity.sql`

`scripts/verify-profile-content-stats.sql`

`scripts/verify-referral-claim-reliability.sql`

`scripts/verify-live-stale-participant-prune.sql`

`scripts/verify-recommendation-infrastructure.sql`

`scripts/verify-messenger-production-phase2.sql`

`supabase/verify/20260808_live_started_insert_notification_fix.verify.sql`

`supabase/verify/20260805_push_tokens_foundation_v1.verify.sql`  
(Use after a **targeted** Push Tokens apply only — do not treat a green verify as proof that a full `db push` is safe.)

### Trusted UM Points reward flow

Reward **amounts**, **reasons**, **recipients**, and **dedupe keys** are owned by the
**database layer** (SECURITY DEFINER triggers / fixed-rule claim RPCs +
`um_points_config`). The Next.js app must never expose a generic
“award N points for reason X” API to browsers.

| Layer | Role |
|-------|------|
| DB `um_points_config` + event triggers | Decide when points are earned and how many |
| DB `award_um_points_to_user` | Internal append-only ledger writer + balance update (not granted to `anon` / `authenticated`) |
| DB `claim_verified_welcome_bonus` / `claim_my_referral_signup` | Client-callable only with **fixed** server rules (no client-chosen points/reason). B4 also resolves pending visitor attribution when the invite cookie is missing and rejects accounts older than `referral_attribution_ttl_days`. |
| DB `complete_referral_signup` | Internal award helper only — execute revoked from `anon` / `authenticated` (`20260728_complete_referral_signup_client_revoke.sql`). |
| DB `award_um_points` | **Retired** — always raises; execute revoked from clients (`20260723_um_points_award_security.sql`) |
| App server actions / UI | Trigger eligible product events (post, comment, signup claim); never pass arbitrary award payloads |
| RLS on `um_point_balances` / `um_points_ledger` | Users **SELECT** own rows only; direct INSERT/UPDATE/DELETE revoked |

`lib/rewards/umPointsConfig.ts` mirrors SQL defaults for UI copy and unit tests only — it is not an award authority.

### Live Media V2 (LiveKit)

Add to `.env.local` (never commit secrets):

- `LIVEKIT_API_KEY` — server only
- `LIVEKIT_API_SECRET` — server only
- `LIVEKIT_URL` — e.g. `wss://your-project.livekit.cloud`
- `NEXT_PUBLIC_LIVEKIT_URL` — same WS URL for the browser (no secrets)

Apply `20260714_live_media_v2_multi_guest.sql` and
`20260714_live_media_v2_host_stage_fix.sql` before testing Go live media.

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

### What `20260729_messenger_production_phase2.sql` adds

- `message_reactions` (👍 ❤️ 😂 😮 😢) with toggle RPC + RLS
- `message_hides` for delete-for-me (keeps rows for replies/receipts)
- `muted_until` + `set_conversation_mute` (1h / 8h / 1w / forever / off)
- SECURITY DEFINER RPCs: `edit_own_text_message`, `soft_delete_message_for_everyone`
- Mute-aware `notify_on_direct_message` (skips muted participants; unread still increments)
- Realtime publication for `messages`, `message_reactions`, `conversation_participants`
- Peer `last_read_at` exposed via `list_conversation_peers` for Sent/Delivered/Seen

Apply manually after V1 foundation. Do **not** auto-apply from the app.  
Verify (read-only): `scripts/verify-messenger-production-phase2.sql`.

## Live Streaming V1 (optional, additive)

Do **not** auto-apply from the app. When ready, paste:

`supabase/migrations/20260713_live_streaming_v1_foundation.sql`

into the SQL Editor and run it. This adds live rooms, participants, chat, and foundation tables (reports, bans, gifts, reactions, recordings, replays, precise location, moderation events) with RLS + RPCs. Until applied, `/live` shows an empty/migration-needed state.

For Live V2 participant list realtime, also apply:

`supabase/migrations/20260714_live_streaming_v2_realtime.sql`

For Live V3 (idempotent — ensures chat, rooms, participants, and reactions are published to Realtime):

`supabase/migrations/20260714_live_streaming_v3_realtime_hardening.sql`

**Location privacy:** exact lat/long are stored only in `live_room_precise_location` (host/staff). Public clients receive city/country only.

**Realtime:** enable Realtime for `live_chat_messages`, `live_rooms`, `live_participants`, and `live_reactions` if the publication blocks did not attach (Dashboard → Database → Publications). RLS still filters events per subscriber.

### Live started notifications (`20260808`)

`create_live_room` often **INSERT**s a room already in `status = live`. Follower / nearby notifications must fire on that path as well as on idle → live **UPDATE**.

- Migration: `supabase/migrations/20260808_live_started_insert_notification_fix.sql`
- Replaces `notify_on_live_started` + trigger `live_rooms_notify_started` to run `AFTER INSERT OR UPDATE OF status`
- Verify (read-only): `supabase/verify/20260808_live_started_insert_notification_fix.verify.sql`

Do **not** auto-apply from the app. Prefer a targeted SQL Editor / linked query apply after review.

## Auth settings

In **Authentication → Providers**, ensure **Email** is enabled.

If **Confirm email** is enabled, new users must confirm before they get a session. The app shows a clear message in that case. For local testing you can temporarily disable email confirmation.

Public legal pages (app routes, not SQL migrations):

- `/terms` — Terms of Use (Beta soft-launch text; counsel review before wider commercial launch)
- `/privacy` — Privacy Policy

`/signup` requires accepting both; the checkbox links to those routes.

### Password reset

App routes:

- `/forgot-password` — request reset email
- `/auth/callback` — PKCE code exchange (server-side; no tokens in the page URL)
- `/auth/update-password` — set a new password, then redirect to `/login?reset=success`

In **Authentication → URL Configuration**, add redirect allow-list entries for:

- `http://localhost:3000/auth/callback`
- `https://YOUR_PRODUCTION_DOMAIN/auth/callback`

Site URL should match your deployed origin. Recovery emails use
`redirectTo = {origin}/auth/callback?next=/auth/update-password`.

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
