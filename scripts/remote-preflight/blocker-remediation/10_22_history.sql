SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version IN ('20260814', '20260822', '20260823', '20260824', '20260884')
ORDER BY version;
