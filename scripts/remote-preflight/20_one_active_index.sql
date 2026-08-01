SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname = 'store_commission_policies_one_active_per_currency_uidx';
