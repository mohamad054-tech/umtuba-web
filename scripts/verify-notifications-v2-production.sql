-- Full Notifications V2 production readiness checks
select check_name, ok from (
  select 'post_views_columns' as check_name,
    (
      select count(*)::int from information_schema.columns
      where table_schema = 'public' and table_name = 'post_views'
        and column_name in (
          'viewer_id', 'country_code', 'country_name', 'city',
          'qualified_view', 'viewed_at'
        )
    ) = 6 as ok
  union all
  select 'um_points_config_rows',
    (select count(*)::int from public.um_points_config) >= 10
  union all
  select 'notifications_has_post_save_type',
    exists (
      select 1 from pg_constraint
      where conname = 'notifications_type_check'
        and pg_get_constraintdef(oid) like '%post_save%'
        and pg_get_constraintdef(oid) like '%post_share%'
    )
  union all
  select 'rpc_create_notification',
    exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='create_notification')
  union all
  select 'rpc_record_post_view',
    exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='record_post_view')
  union all
  select 'rpc_award_um_points_to_user',
    exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='award_um_points_to_user')
  union all
  select 'rpc_get_post_journey',
    exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_post_journey')
  union all
  select 'rpc_emit_ai_insight',
    exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='emit_ai_creator_insight_for_user')
  union all
  select 'trigger_post_likes_notify',
    exists (select 1 from pg_trigger where tgname='post_likes_notify' and not tgisinternal)
  union all
  select 'trigger_post_comments_notify',
    exists (select 1 from pg_trigger where tgname='post_comments_notify' and not tgisinternal)
  union all
  select 'trigger_profile_follows_notify',
    exists (select 1 from pg_trigger where tgname='profile_follows_notify' and not tgisinternal)
  union all
  select 'trigger_live_rooms_notify',
    exists (select 1 from pg_trigger where tgname='live_rooms_notify_started' and not tgisinternal)
  union all
  select 'trigger_messages_notify',
    exists (select 1 from pg_trigger where tgname='messages_notify' and not tgisinternal)
  union all
  select 'rls_notifications_enabled',
    (select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='notifications')
  union all
  select 'rls_notification_preferences_enabled',
    (select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='notification_preferences')
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
