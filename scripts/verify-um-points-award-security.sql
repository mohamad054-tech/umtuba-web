-- Database verification for UM Points award security (Phase A1)
-- Run in Supabase SQL Editor after applying
-- supabase/migrations/20260723_um_points_award_security.sql
--
-- Expected: every ok column is true.
-- Manual abuse checks (run as a normal authenticated user session / anon key):
--   1) select public.award_um_points(50, 'forged', 'forge:1', '{}'::jsonb);
--      → permission denied OR exception (must NOT credit ledger)
--   2) select public.award_um_points_to_user(auth.uid(), 50, 'forged', 'forge:2', '{}'::jsonb, null);
--      → permission denied
--   3) select public.award_um_points_to_user('<other-user-uuid>', 50, 'forged', 'forge:3', '{}'::jsonb, null);
--      → permission denied
--   4) Re-call claim_verified_welcome_bonus() twice → second call created=false / deduped
--   5) select * from um_points_ledger where user_id <> auth.uid() → 0 rows (RLS)
--   6) select public.get_my_um_points_summary() → succeeds for own balance/ledger

select check_name, ok from (
  select 'award_um_points_exists' as check_name,
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'award_um_points'
    ) as ok
  union all
  select 'award_um_points_no_anon_execute',
    not has_function_privilege(
      'anon',
      'public.award_um_points(integer, text, text, jsonb)',
      'execute'
    )
  union all
  select 'award_um_points_no_authenticated_execute',
    not has_function_privilege(
      'authenticated',
      'public.award_um_points(integer, text, text, jsonb)',
      'execute'
    )
  union all
  select 'award_um_points_to_user_no_anon_execute',
    not has_function_privilege(
      'anon',
      'public.award_um_points_to_user(uuid, integer, text, text, jsonb, integer)',
      'execute'
    )
  union all
  select 'award_um_points_to_user_no_authenticated_execute',
    not has_function_privilege(
      'authenticated',
      'public.award_um_points_to_user(uuid, integer, text, text, jsonb, integer)',
      'execute'
    )
  union all
  select 'welcome_bonus_still_authenticated',
    has_function_privilege(
      'authenticated',
      'public.claim_verified_welcome_bonus()',
      'execute'
    )
  union all
  select 'summary_rpc_still_authenticated',
    has_function_privilege(
      'authenticated',
      'public.get_my_um_points_summary()',
      'execute'
    )
  union all
  select 'referral_claim_still_authenticated',
    has_function_privilege(
      'authenticated',
      'public.claim_my_referral_signup(text, text, text, text)',
      'execute'
    )
  union all
  select 'balances_no_direct_write_authenticated',
    not has_table_privilege('authenticated', 'public.um_point_balances', 'insert')
    and not has_table_privilege('authenticated', 'public.um_point_balances', 'update')
    and not has_table_privilege('authenticated', 'public.um_point_balances', 'delete')
  union all
  select 'ledger_no_direct_write_authenticated',
    not has_table_privilege('authenticated', 'public.um_points_ledger', 'insert')
    and not has_table_privilege('authenticated', 'public.um_points_ledger', 'update')
    and not has_table_privilege('authenticated', 'public.um_points_ledger', 'delete')
  union all
  select 'balances_select_own_policy',
    exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'um_point_balances'
        and cmd = 'SELECT'
    )
  union all
  select 'ledger_select_own_policy',
    exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'um_points_ledger'
        and cmd = 'SELECT'
    )
) checks
order by check_name;
