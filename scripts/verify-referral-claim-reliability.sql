-- Verify Phase B4 referral claim reliability (+ complete_referral client revoke).
-- Run in Supabase SQL Editor after applying:
--   supabase/migrations/20260726_referral_claim_reliability.sql
--   supabase/migrations/20260728_complete_referral_signup_client_revoke.sql
--
-- Expected: every ok column is true.
--
-- Manual smoke (authenticated sessions; no client-chosen points):
--   1) Fresh invitee with cookie code → claim_my_referral_signup → ok / rewarded
--   2) Same visitor, cookie cleared, p_referral_code null → resolves pending attribution
--   3) Account older than referral_attribution_ttl_days → not_eligible_existing_account
--   4) No code and no pending visitor row → no_pending_attribution
--   5) Anon key must not execute claim_my_referral_signup
--   6) Anon/authenticated must not execute complete_referral_signup

select check_name, ok from (
  select 'claim_rpc_exists' as check_name,
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'claim_my_referral_signup'
        and pg_get_function_identity_arguments(p.oid) =
          'p_referral_code text, p_anonymous_visitor_id text, p_ip_hash text, p_user_agent_hash text'
    ) as ok
  union all
  select 'claim_rpc_authenticated_execute',
    has_function_privilege(
      'authenticated',
      'public.claim_my_referral_signup(text, text, text, text)',
      'execute'
    )
  union all
  select 'claim_rpc_no_anon_execute',
    not has_function_privilege(
      'anon',
      'public.claim_my_referral_signup(text, text, text, text)',
      'execute'
    )
  union all
  select 'complete_referral_still_not_client_callable',
    not has_function_privilege(
      'anon',
      'public.complete_referral_signup(uuid, text, text, text, text)',
      'execute'
    )
    and not has_function_privilege(
      'authenticated',
      'public.complete_referral_signup(uuid, text, text, text, text)',
      'execute'
    )
  union all
  select 'claim_body_resolves_visitor_attribution',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'claim_my_referral_signup'
        and pg_get_functiondef(p.oid) ilike '%referral_attributions%'
        and pg_get_functiondef(p.oid) ilike '%anonymous_visitor_id%'
        and pg_get_functiondef(p.oid) ilike '%pending%'
    )
  union all
  select 'claim_body_rejects_existing_accounts',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'claim_my_referral_signup'
        and pg_get_functiondef(p.oid) ilike '%not_eligible_existing_account%'
        and pg_get_functiondef(p.oid) ilike '%referral_attribution_ttl_days%'
        and pg_get_functiondef(p.oid) ilike '%existing_account_invite%'
    )
  union all
  select 'claim_body_stable_no_pending_reason',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'claim_my_referral_signup'
        and pg_get_functiondef(p.oid) ilike '%no_pending_attribution%'
    )
  union all
  select 'claim_delegates_to_complete_referral_signup',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'claim_my_referral_signup'
        and pg_get_functiondef(p.oid) ilike '%complete_referral_signup%'
    )
  union all
  select 'claim_does_not_call_retired_award_um_points',
    exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname = 'claim_my_referral_signup'
        and pg_get_functiondef(p.oid) !~* 'award_um_points\('
    )
  union all
  select 'attributions_table_no_direct_client_access',
    not has_table_privilege('anon', 'public.referral_attributions', 'select')
    and not has_table_privilege('authenticated', 'public.referral_attributions', 'select')
    and not has_table_privilege('authenticated', 'public.referral_attributions', 'insert')
    and not has_table_privilege('authenticated', 'public.referral_attributions', 'update')
    and not has_table_privilege('authenticated', 'public.referral_attributions', 'delete')
) checks
order by check_name;
