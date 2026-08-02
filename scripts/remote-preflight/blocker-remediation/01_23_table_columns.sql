-- Read-only: columns of store_payment_outcome_events
SELECT column_name, data_type, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'store_payment_outcome_events'
ORDER BY ordinal_position;
