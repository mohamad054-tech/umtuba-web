SELECT c.relname AS object_name, c.relkind::text AS kind
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND (
    c.relname LIKE '%settlement%'
    OR c.relname LIKE '%commission%'
    OR c.relname LIKE '%payout%'
  )
ORDER BY c.relkind, c.relname;
