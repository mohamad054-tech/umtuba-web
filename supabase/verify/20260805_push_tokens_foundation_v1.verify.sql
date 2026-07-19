-- Verification queries for 20260805_push_tokens_foundation_v1.sql
-- Run after applying the migration (SQL editor or psql).
-- Expected: all check rows return ok = true.

-- 0) Dependency: set_row_updated_at exists
select
  'set_row_updated_at_exists' as check_name,
  exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_row_updated_at'
  ) as ok;

-- 1) Table exists with required columns
select
  'table_columns' as check_name,
  (
    select count(*) = 16
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'push_tokens'
      and c.column_name in (
        'id', 'user_id', 'platform', 'provider', 'token', 'device_id',
        'device_name', 'app_version', 'os_version', 'locale', 'timezone',
        'is_active', 'last_seen_at', 'created_at', 'updated_at'
      )
  ) as ok;

-- 2) RLS enabled
select
  'rls_enabled' as check_name,
  c.relrowsecurity as ok
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'push_tokens';

-- 3) Owner policies present
select
  'owner_policies' as check_name,
  (
    select count(*) = 4
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = 'push_tokens'
      and p.policyname in (
        'Users can read own push tokens',
        'Users can insert own push tokens',
        'Users can update own push tokens',
        'Users can delete own push tokens'
      )
  ) as ok;

-- 4) Unique token index + active device uniqueness
select
  'indexes' as check_name,
  (
    select count(*) filter (
      where i.relname in (
        'push_tokens_token_uidx',
        'push_tokens_user_device_active_uidx',
        'push_tokens_user_id_idx',
        'push_tokens_user_active_idx'
      )
    ) = 4
    from pg_class t
    join pg_namespace n on n.oid = t.relnamespace
    join pg_index ix on ix.indrelid = t.oid
    join pg_class i on i.oid = ix.indexrelid
    where n.nspname = 'public' and t.relname = 'push_tokens'
  ) as ok;

-- 5) RPCs exist (including service_role transfer)
select
  'rpcs' as check_name,
  (
    select count(*) = 4
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'register_push_token',
        'unregister_push_token',
        'touch_push_token',
        'transfer_active_push_token'
      )
  ) as ok;

-- 6) updated_at trigger present
select
  'updated_at_trigger' as check_name,
  exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'push_tokens'
      and t.tgname = 'push_tokens_set_updated_at'
      and not t.tgisinternal
  ) as ok;

-- 7) transfer_active_push_token is not executable by authenticated
select
  'transfer_not_granted_to_authenticated' as check_name,
  not has_function_privilege(
    'authenticated',
    'public.transfer_active_push_token(text, uuid, text, text, text)',
    'execute'
  ) as ok;
