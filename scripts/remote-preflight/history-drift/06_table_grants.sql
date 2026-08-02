SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema='public'
  AND table_name LIKE 'ueos_%'
  AND grantee IN ('anon','authenticated','service_role','PUBLIC')
ORDER BY 1,2,3;
