SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS identity_args,
       r.rolname AS grantee,
       has_function_privilege(r.rolname,p.oid,'EXECUTE') AS can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
CROSS JOIN (VALUES ('anon'),('authenticated'),('service_role')) AS roles(rolname)
JOIN pg_roles r ON r.rolname=roles.rolname
WHERE n.nspname='public' AND p.proname LIKE 'ueos_%'
ORDER BY 1,2,3;
