# Production security SQL — applied 2026-09-15

These files **record SQL that was already applied manually** to production. Do not `supabase db push` them. Do not re-apply blindly.

## Applied on production

| File | What it did |
| --- | --- |
| `supabase/migrations/20260945_update_own_post_caption_v1.sql` | Caption-only owner RPC `update_own_post_caption` |
| `supabase/migrations/20260946_remove_sandbox_admin_and_lock_moderation_status_v1.sql` | Deleted `platform_admins` rows with `note like 'UMTUBA_E2E_%'`; trigger `guard_profile_moderation_status` blocks `authenticated`/`anon` from changing `profiles.moderation_status` |
| `supabase/migrations/20260947_posts_articles_rls_lockdown_v1.sql` | Closed open posts INSERT; SELECT is public-or-owner and not deleted; revoked anon writes on posts; `guard_post_owner_columns` on posts UPDATE; dropped article owner I/U/D policies; revoked article writes from `anon`/`authenticated` |
| `supabase/migrations/20260948_abuse_limits_v1.sql` | Applied manually 2026-09-16. `rpc_abuse_events` + `rpc_abuse_is_allowed` / `rpc_abuse_record`; throttled `record_post_view` (1/24h), `record_post_share` (20/hour), `record_watch_signal`, `record_referral_attribution`; revoked UPDATE/DELETE on `video_commerce_events`; metadata ≤4 KB. **Skipped:** drop/re-add of `video_commerce_events` `event_type` CHECK (live `video_commerce_events_event_type_check` already enforces `badge_shown`, `badge_opened`, `product_viewed`). Do not re-apply blindly. Do not `supabase db push`. `rpc_abuse_events` grows ~700 rows/day at current traffic; add a cleanup job (delete rows older than 7 days) before traffic grows. |

## App contract after this apply

- Any future code that **UPDATEs `public.posts` with a user session** (`authenticated` or `anon`) may only change:

  `content`, `media_status`, `processing_started_at`, `processing_progress`, `processing_completed_at`, `processing_error`, `thumbnail_path`

  Any other column change raises `post_column_locked` (`42501`). Service-role and SECURITY DEFINER RPCs (caption RPC, `publish_my_article`, `mark_my_article_teaser_uploaded`, admin takedown/restore) are not limited by `current_user in ('authenticated', 'anon')`.

- **`articles` can only be written via `publish_my_article`** (and other SECURITY DEFINER / service-role paths). Direct table INSERT/UPDATE/DELETE from `anon`/`authenticated` is revoked.

## Applied 2026-09-16 (batch 3)

`20260948` is on production with the skip noted in the table above. Verified after apply: `rpc_abuse_events` exists; the four functions call `rpc_abuse_is_allowed`; 0 UPDATE/DELETE grants on `video_commerce_events` for `anon`/`authenticated`; live events are being recorded (view, share, watch_signal).

`rpc_abuse_events` grows ~700 rows/day at current traffic. Add a cleanup job that deletes rows older than 7 days before traffic grows.
