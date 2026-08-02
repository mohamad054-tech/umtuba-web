SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE name ILIKE '%ueos%'
   OR name ILIKE '%payment_outcome%'
   OR name ILIKE '%settlement%'
   OR name ILIKE '%commission%'
   OR version IN ('20260822','20260823','20260824','20260884')
ORDER BY version;
