SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS identity_args,
       r.rolname AS grantee,
       CASE WHEN has_function_privilege(r.oid, p.oid, 'EXECUTE') THEN 'yes' ELSE 'no' END AS can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN pg_roles r
WHERE n.nspname = 'public'
  AND p.proname IN (
    'apply_store_payment_outcome',
    'grant_store_digital_entitlements_after_capture',
    'list_my_store_digital_entitlements'
  )
  AND r.rolname IN ('anon', 'authenticated', 'service_role')
ORDER BY p.proname, r.rolname;
