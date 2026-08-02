SELECT to_regclass('public.ueos_policies') IS NOT NULL AS ueos_policies,
       to_regclass('public.ueos_journal_entries') IS NOT NULL AS ueos_journal_entries,
       to_regclass('public.ueos_accounts') IS NOT NULL AS ueos_accounts,
       EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20260822') AS hist_22,
       EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20260823') AS hist_23,
       EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20260824') AS hist_24,
       EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20260884') AS hist_84;
