-- Verify Phase B7 live stale participant prune.
-- Run in Supabase SQL Editor after applying
-- supabase/migrations/20260727_live_stale_participant_prune.sql
--
-- Expected: every ok column is true.
--
-- Ops notes (not covered by this script):
--   1) Cron/workflow calls select public.prune_stale_live_participants(120);
--   2) Requires GitHub secret DATABASE_URL (never commit it)
--   3) Function must remain revoked from anon/authenticated

select check_name, ok from (
  select 'prune_rpc_exists' as check_name,
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'prune_stale_live_participants'
        and pg_get_function_identity_arguments(p.oid) = 'p_stale_seconds integer'
    ) as ok
  union all
  select 'prune_rpc_no_anon_execute',
    not has_function_privilege(
      'anon',
      'public.prune_stale_live_participants(integer)',
      'execute'
    )
  union all
  select 'prune_rpc_no_authenticated_execute',
    not has_function_privilege(
      'authenticated',
      'public.prune_stale_live_participants(integer)',
      'execute'
    )
  union all
  select 'prune_body_marks_stale_non_hosts',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'prune_stale_live_participants'
        and pg_get_functiondef(p.oid) ilike '%last_seen_at%'
        and pg_get_functiondef(p.oid) ilike '%left_at%'
        and pg_get_functiondef(p.oid) ilike '%host%'
    )
  union all
  select 'prune_body_refreshes_viewer_counts',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'prune_stale_live_participants'
        and pg_get_functiondef(p.oid) ilike '%refresh_live_room_viewer_count%'
    )
  union all
  select 'prune_enforces_minimum_stale_window',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'prune_stale_live_participants'
        and pg_get_functiondef(p.oid) ilike '%p_stale_seconds < 60%'
    )
  union all
  select 'refresh_viewer_count_still_not_client_callable',
    not has_function_privilege(
      'anon',
      'public.refresh_live_room_viewer_count(uuid)',
      'execute'
    )
    and not has_function_privilege(
      'authenticated',
      'public.refresh_live_room_viewer_count(uuid)',
      'execute'
    )
) checks
order by check_name;
