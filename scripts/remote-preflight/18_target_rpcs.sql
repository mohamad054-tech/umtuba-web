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
