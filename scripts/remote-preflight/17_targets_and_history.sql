SELECT 'table' AS kind, c.relname AS name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'store_payment_outcome_events',
    'store_digital_entitlements',
    'store_digital_entitlement_revoke_events',
    'store_settlement_events',
    'store_commission_policies',
    'store_commission_decomposition_events',
    'store_commission_policy_activation_events'
  )
ORDER BY 2;

SELECT p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'revoke_store_digital_entitlements_after_refund',
    'apply_store_commission_decomposition_after_capture',
    'mark_store_commission_decomposition_after_refund',
    'get_store_commission_decomposition_for_attempt',
    'activate_store_commission_policy',
    'deactivate_store_commission_policy',
    'resolve_store_commission_policy',
    'compute_store_commission_split'
  )
ORDER BY 1;

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname = 'store_commission_policies_one_active_per_currency_uidx';

SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version IN (
  '20260823','20260824','20260884','20260887','20260888',
  '20260889','20260890','20260891'
)
ORDER BY version;
