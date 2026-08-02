SELECT 'store_payment_outcome_events' AS object_name,
       to_regclass('public.store_payment_outcome_events') IS NOT NULL AS present
UNION ALL
SELECT 'apply_store_payment_outcome',
       to_regprocedure(
         'public.apply_store_payment_outcome(uuid,text,text,text,text,bigint,text,jsonb)'
       ) IS NOT NULL
UNION ALL
SELECT 'ueos_policies',
       to_regclass('public.ueos_policies') IS NOT NULL
UNION ALL
SELECT 'ueos_journal_entries',
       to_regclass('public.ueos_journal_entries') IS NOT NULL
UNION ALL
SELECT 'ueos_ensure_account',
       to_regprocedure('public.ueos_ensure_account(text,uuid,text,text,text)') IS NOT NULL
UNION ALL
SELECT 'ueos_post_journal',
       EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'ueos_post_journal'
       )
UNION ALL
SELECT 'stores', to_regclass('public.stores') IS NOT NULL
UNION ALL
SELECT 'orders', to_regclass('public.orders') IS NOT NULL
UNION ALL
SELECT 'payment_attempts', to_regclass('public.payment_attempts') IS NOT NULL
UNION ALL
SELECT 'store_settlement_events',
       to_regclass('public.store_settlement_events') IS NOT NULL
UNION ALL
SELECT 'store_settlement_active_allocations',
       to_regclass('public.store_settlement_active_allocations') IS NOT NULL
UNION ALL
SELECT 'apply_store_settlement_event',
       EXISTS (
         SELECT 1 FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'apply_store_settlement_event'
       );
