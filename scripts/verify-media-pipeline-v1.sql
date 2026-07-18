-- Verify Media Pipeline V1 after applying:
--   supabase/migrations/20260730_media_pipeline_v1.sql
--
-- Run in Supabase SQL Editor. Expected: every ok column is true.
-- Safe / read-only.

select check_name, ok from (
  select 'media_status_column' as check_name,
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'posts'
        and column_name = 'media_status'
    ) as ok
  union all
  select 'upload_started_at_column',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'posts'
        and column_name = 'upload_started_at'
    )
  union all
  select 'processing_progress_column',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'posts'
        and column_name = 'processing_progress'
    )
  union all
  select 'thumbnail_path_column',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'posts'
        and column_name = 'thumbnail_path'
    )
  union all
  select 'media_pipeline_column',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'posts'
        and column_name = 'media_pipeline'
    )
  union all
  select 'visibility_helper',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'is_video_post_publicly_visible'
    )
  union all
  select 'no_null_media_status',
    not exists (select 1 from public.posts where media_status is null)
  union all
  select 'profile_stats_ready_only',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'get_profile_content_stats'
        and pg_get_functiondef(p.oid) ilike '%is_video_post_publicly_visible%'
    )
) checks
order by check_name;
