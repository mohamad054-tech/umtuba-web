SELECT
  (SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 1) AS live_tip,
  (SELECT count(*) FROM supabase_migrations.schema_migrations) AS row_count,
  (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version = '20260934') AS has_20260934,
  (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version = '20260935') AS has_20260935,
  (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version = '20260936') AS has_20260936,
  (SELECT count(*) FROM supabase_migrations.schema_migrations WHERE version = '20260937') AS has_20260937,
  (SELECT name FROM supabase_migrations.schema_migrations WHERE version = '20260935') AS name_20260935,
  (SELECT name FROM supabase_migrations.schema_migrations WHERE version = '20260936') AS name_20260936;
