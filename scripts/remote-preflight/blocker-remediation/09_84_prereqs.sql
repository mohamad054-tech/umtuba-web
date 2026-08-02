-- Read-only: prerequisites for applying 20260884
SELECT 'store_commission_policies' AS object_name,
       to_regclass('public.store_commission_policies') IS NOT NULL AS present
UNION ALL
SELECT 'resolve_store_commission_policy',
       to_regprocedure('public.resolve_store_commission_policy(text,timestamptz)') IS NOT NULL
UNION ALL
SELECT 'compute_store_commission_split',
       EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'compute_store_commission_split'
       )
UNION ALL
SELECT 'payment_attempts',
       to_regclass('public.payment_attempts') IS NOT NULL
UNION ALL
SELECT 'orders',
       to_regclass('public.orders') IS NOT NULL;

SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version IN ('20260884', '20260890', '20260891')
ORDER BY version;

-- Confirm no accidental active commercial policies already (table may be missing)
SELECT
  CASE
    WHEN to_regclass('public.store_commission_policies') IS NULL THEN 'TABLE_MISSING'
    ELSE 'TABLE_PRESENT'
  END AS commission_table_status;
