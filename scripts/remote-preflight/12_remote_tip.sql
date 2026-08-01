SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version >= '20260870'
ORDER BY version;
