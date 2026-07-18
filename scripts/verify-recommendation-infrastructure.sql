-- Verify Discover & Watch Recommendation Infrastructure V1.
-- Run in Supabase SQL Editor after applying:
--   supabase/migrations/20260731_recommendation_infrastructure_v1.sql
--
-- Expected: every ok column is true.

select check_name, ok from (
  select 'watch_signals_table_exists' as check_name,
    to_regclass('public.watch_signals') is not null as ok
  union all
  select 'user_interest_profiles_exists',
    to_regclass('public.user_interest_profiles') is not null
  union all
  select 'creator_quality_signals_exists',
    to_regclass('public.creator_quality_signals') is not null
  union all
  select 'video_quality_signals_exists',
    to_regclass('public.video_quality_signals') is not null
  union all
  select 'record_watch_signal_exists',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'record_watch_signal'
    )
  union all
  select 'record_watch_signal_anon_execute',
    has_function_privilege(
      'anon',
      'public.record_watch_signal(bigint, text, text, text, integer, numeric, boolean, integer, boolean, boolean, boolean, boolean, boolean, boolean)',
      'execute'
    )
  union all
  select 'record_watch_signal_authenticated_execute',
    has_function_privilege(
      'authenticated',
      'public.record_watch_signal(bigint, text, text, text, integer, numeric, boolean, integer, boolean, boolean, boolean, boolean, boolean, boolean)',
      'execute'
    )
  union all
  select 'refresh_helpers_not_client_callable',
    not has_function_privilege(
      'anon',
      'public.refresh_video_quality_signals(bigint)',
      'execute'
    )
    and not has_function_privilege(
      'authenticated',
      'public.refresh_video_quality_signals(bigint)',
      'execute'
    )
    and not has_function_privilege(
      'anon',
      'public.refresh_creator_quality_signals(uuid)',
      'execute'
    )
    and not has_function_privilege(
      'authenticated',
      'public.refresh_user_interest_profile(uuid)',
      'execute'
    )
  union all
  select 'watch_signals_no_direct_client_writes',
    not has_table_privilege('anon', 'public.watch_signals', 'insert')
    and not has_table_privilege('authenticated', 'public.watch_signals', 'insert')
    and not has_table_privilege('authenticated', 'public.watch_signals', 'update')
    and not has_table_privilege('authenticated', 'public.watch_signals', 'delete')
  union all
  select 'interest_profiles_select_own_only_writable_via_rpc',
    not has_table_privilege('authenticated', 'public.user_interest_profiles', 'insert')
    and not has_table_privilege('authenticated', 'public.user_interest_profiles', 'update')
  union all
  select 'claim_body_has_ml_ready_columns',
    exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'watch_signals'
        and column_name = 'ml_features'
    )
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'user_interest_profiles'
        and column_name = 'model_version'
    )
  union all
  select 'record_body_covers_required_signals',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'record_watch_signal'
        and pg_get_functiondef(p.oid) ilike '%watch_duration_ms%'
        and pg_get_functiondef(p.oid) ilike '%watch_percent%'
        and pg_get_functiondef(p.oid) ilike '%rewatch_count%'
        and pg_get_functiondef(p.oid) ilike '%follow_after_watch%'
        and pg_get_functiondef(p.oid) ilike '%skipped_early%'
        and pg_get_functiondef(p.oid) ilike '%deterministic-v1%'
    )
) checks
order by check_name;
