SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS identity_args,
       l.lanname AS language,
       CASE WHEN p.prosecdef THEN 'security_definer' ELSE 'security_invoker' END AS security,
       obj_description(p.oid,'pg_proc') AS comment
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
JOIN pg_language l ON l.oid=p.prolang
WHERE n.nspname='public' AND p.proname LIKE 'ueos_%'
ORDER BY 1,2;
