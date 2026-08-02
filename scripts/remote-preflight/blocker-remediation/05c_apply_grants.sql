SELECT r.rolname AS grantee,
       has_function_privilege(r.rolname, p.oid, 'EXECUTE') AS can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN (VALUES ('anon'), ('authenticated'), ('service_role'), ('PUBLIC')) AS roles(rolname)
LEFT JOIN pg_roles r ON r.rolname = roles.rolname
WHERE n.nspname = 'public'
  AND p.proname = 'apply_store_payment_outcome'
ORDER BY r.rolname;
