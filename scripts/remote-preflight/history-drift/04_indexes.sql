SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname='public' AND tablename LIKE 'ueos_%'
ORDER BY 1,2;
