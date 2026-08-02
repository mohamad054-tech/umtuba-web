SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version IN ('20260822','20260823','20260824','20260881','20260884','20260889','20260890','20260891')
ORDER BY version;
