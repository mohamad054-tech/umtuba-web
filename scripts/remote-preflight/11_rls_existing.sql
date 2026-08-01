SELECT c.relname AS table_name,
       CASE WHEN c.relrowsecurity THEN 'yes' ELSE 'no' END AS rls_enabled,
       CASE WHEN c.relforcerowsecurity THEN 'yes' ELSE 'no' END AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'store_digital_entitlements',
    'store_payment_outcome_events',
    'orders',
    'order_items',
    'payment_attempts'
  )
ORDER BY c.relname;
