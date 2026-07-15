-- Verify Phase A5 profile follow integrity RPCs.
-- Run against the linked project after applying 20260724_profile_follow_integrity.sql.

select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as args,
  has_function_privilege('anon', p.oid, 'execute') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'get_profile_follow_snapshot',
    'toggle_profile_follow'
  )
order by p.proname;

-- Snapshot should be callable; toggle only for authenticated (anon execute = false).
-- Expected:
-- get_profile_follow_snapshot | uuid | true  | true
-- toggle_profile_follow       | uuid | false | true
