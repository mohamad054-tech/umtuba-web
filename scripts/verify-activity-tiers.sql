-- Verify Activity Tier foundation + event wiring on linked Supabase.
-- Run via: npx supabase db query --linked -f scripts/verify-activity-tiers.sql

with checks as (
  select 'table_activity_score_balances' as name,
    exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'activity_score_balances'
    ) as ok
  union all
  select 'table_activity_score_ledger',
    exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'activity_score_ledger'
    )
  union all
  select 'table_activity_tier_history',
    exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'activity_tier_history'
    )
  union all
  select 'rpc_award_activity_score_to_user',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'award_activity_score_to_user'
    )
  union all
  select 'rpc_try_award_activity_score',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'try_award_activity_score'
    )
  union all
  select 'rpc_reverse_activity_score_entry',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'reverse_activity_score_entry'
    )
  union all
  select 'rpc_get_my_activity_tier_summary',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'get_my_activity_tier_summary'
    )
  union all
  select 'rpc_get_activity_tier_snapshot',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'get_activity_tier_snapshot'
    )
  union all
  select 'rpc_record_screen_time_activity',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'record_screen_time_activity'
    )
  union all
  select 'realtime_activity_score_balances',
    exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'activity_score_balances'
    )
  union all
  select 'rls_balances_enabled',
    (
      select c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'activity_score_balances'
    )
  union all
  select 'trigger_post_likes_activity',
    exists (
      select 1 from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      where c.relname = 'post_likes' and t.tgname = 'post_likes_activity_tier' and not t.tgisinternal
    )
  union all
  select 'trigger_live_participants_activity',
    exists (
      select 1 from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      where c.relname = 'live_participants' and t.tgname = 'live_participants_activity_tier' and not t.tgisinternal
    )
  union all
  select 'trigger_follows_activity',
    exists (
      select 1 from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      where c.relname = 'profile_follows' and t.tgname = 'profile_follows_activity_tier' and not t.tgisinternal
    )
  union all
  select 'snapshot_rpc_ok',
    (public.get_activity_tier_snapshot('00000000-0000-0000-0000-000000000001') ->> 'ok') = 'true'
)
select name, ok from checks order by name;
