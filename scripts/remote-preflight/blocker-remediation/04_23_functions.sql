-- Read-only: payment-outcome helper + main RPC inventory
SELECT p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS identity_args,
       l.lanname AS language,
       CASE WHEN p.prosecdef THEN 'security_definer' ELSE 'security_invoker' END AS security,
       p.provolatile AS volatility,
       obj_description(p.oid, 'pg_proc') AS comment
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
WHERE n.nspname = 'public'
  AND (
    p.proname LIKE 'store_payment_%'
    OR p.proname = 'apply_store_payment_outcome'
  )
ORDER BY p.proname, identity_args;
