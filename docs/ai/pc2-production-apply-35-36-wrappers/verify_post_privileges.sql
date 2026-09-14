select
  p.proname,
  r.rolname as grantee,
  has_function_privilege(r.rolname, p.oid, 'EXECUTE') as can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join (values ('public'), ('anon'), ('authenticated'), ('service_role')) as r(rolname)
where n.nspname = 'public'
  and p.proname in (
    'comms_identity_digest',
    'comms_normalize_email',
    'comms_normalize_e164',
    'comms_public_identity',
    'comms_phone_identity_guard',
    'discover_user_by_email',
    'discover_user_by_phone',
    'discover_user_by_username',
    'bind_own_phone',
    'unbind_own_phone',
    'ensure_own_communication_privacy',
    'get_own_communication_privacy',
    'set_own_communication_privacy',
    'get_own_phone_identity',
    'get_own_contact_sync_state',
    'set_own_contact_sync_permission'
  )
order by p.proname, r.rolname;
