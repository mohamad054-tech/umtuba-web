SELECT 'store_commission_policies' AS object_name, to_regclass('public.store_commission_policies') IS NOT NULL AS present
UNION ALL SELECT 'resolve_store_commission_policy', to_regprocedure('public.resolve_store_commission_policy(text,timestamptz)') IS NOT NULL
UNION ALL SELECT 'compute_store_commission_split', EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='compute_store_commission_split')
UNION ALL SELECT 'payment_attempts', to_regclass('public.payment_attempts') IS NOT NULL
UNION ALL SELECT 'orders', to_regclass('public.orders') IS NOT NULL;
