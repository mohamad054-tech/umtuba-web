-- Verification for 20260808_live_started_insert_notification_fix.sql
-- Run after targeted remote apply. Expected: all ok = true.

select
  'notify_on_live_started_exists' as check_name,
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'notify_on_live_started'
  ) as ok
union all
select
  'notify_on_live_started_security_definer',
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'notify_on_live_started'
      and p.prosecdef
  )
union all
select
  'notify_on_live_started_search_path_public',
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'notify_on_live_started'
      and p.proconfig is not null
      and exists (
        select 1
        from unnest(p.proconfig) cfg
        where cfg like 'search_path%=%public%'
      )
  )
union all
select
  'trigger_live_rooms_notify_started',
  exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'live_rooms'
      and t.tgname = 'live_rooms_notify_started'
      and not t.tgisinternal
  )
union all
select
  'trigger_fires_on_insert',
  exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'live_rooms'
      and t.tgname = 'live_rooms_notify_started'
      and not t.tgisinternal
      and (t.tgtype::integer & 4) = 4  -- INSERT event bit
  )
union all
select
  'trigger_fires_on_update',
  exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'live_rooms'
      and t.tgname = 'live_rooms_notify_started'
      and not t.tgisinternal
      and (t.tgtype::integer & 16) = 16  -- UPDATE event bit
  )
union all
select
  'no_direct_grants_to_authenticated',
  not exists (
    select 1
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = 'notify_on_live_started'
      and grantee in ('authenticated', 'anon', 'PUBLIC')
      and privilege_type = 'EXECUTE'
  );
