SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version IN (
  '20260823','20260824','20260884','20260887','20260888',
  '20260889','20260890','20260891'
)
ORDER BY version;
