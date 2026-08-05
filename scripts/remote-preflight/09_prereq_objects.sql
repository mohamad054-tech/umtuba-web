SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS identity_args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND (
    p.proname LIKE '%settlement%'
    OR p.proname LIKE '%commission%'
    OR p.proname LIKE '%entitlement%'
    OR p.proname LIKE '%payment_outcome%'
  )
ORDER BY p.proname, identity_args;
