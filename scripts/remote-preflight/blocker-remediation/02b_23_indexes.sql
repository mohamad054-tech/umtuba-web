SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'store_payment_outcome_events'
ORDER BY indexname;
