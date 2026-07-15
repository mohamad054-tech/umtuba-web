-- Database verification for Notifications V2 Automation
select check_name, ok from (
  select 'post_views_columns' as check_name,
    (
      select count(*)::int
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'post_views'
        and column_name in (
          'viewer_id', 'country_code', 'country_name', 'city',
          'qualified_view', 'viewed_at'
        )
    ) = 6 as ok
  union all
  select 'um_points_config_rows',
    (select count(*)::int from public.um_points_config) >= 10
  union all
  select 'record_post_view_exists',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'record_post_view'
    )
  union all
  select 'award_um_points_to_user_exists',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'award_um_points_to_user'
    )
  union all
  select 'get_post_journey_exists',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'get_post_journey'
    )
  union all
  select 'nearby_live_default_off',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'notification_preferences'
        and column_name = 'nearby_live_enabled'
        and column_default ilike '%false%'
    )
) checks
order by check_name;
