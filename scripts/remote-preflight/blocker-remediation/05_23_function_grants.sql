-- Read-only: EXECUTE grants on payment outcome RPCs
SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS identity_args,
       g.grantee,
       g.privilege_type,
       g.is_grantable
FROM information_schema.routine_privileges g
JOIN pg_proc p ON p.proname = g.routine_name
JOIN pg_namespace n ON n.oid = p.pronamespace
  AND n.nspname = g.routine_schema
WHERE g.routine_schema = 'public'
  AND (
    p.proname LIKE 'store_payment_%'
    OR p.proname = 'apply_store_payment_outcome'
  )
  AND g.grantee IN ('anon', 'authenticated', 'service_role', 'PUBLIC')
ORDER BY p.proname, g.grantee;
