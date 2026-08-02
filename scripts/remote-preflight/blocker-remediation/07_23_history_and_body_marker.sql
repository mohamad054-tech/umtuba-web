-- Read-only: history row + whether apply RPC comment looks like 23 vs 24
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version = '20260823';

SELECT obj_description(
  'public.apply_store_payment_outcome(uuid,text,text,text,text,bigint,text,jsonb)'::regprocedure,
  'pg_proc'
) AS apply_comment;

SELECT
  CASE
    WHEN obj_description(
      'public.apply_store_payment_outcome(uuid,text,text,text,text,bigint,text,jsonb)'::regprocedure,
      'pg_proc'
    ) ILIKE '%Settlement refund guard%'
      THEN 'BODY_MARKER_LOOKS_LIKE_20260824_OR_LATER'
    WHEN obj_description(
      'public.apply_store_payment_outcome(uuid,text,text,text,text,bigint,text,jsonb)'::regprocedure,
      'pg_proc'
    ) ILIKE '%Trusted Store payment outcome sync%'
      THEN 'BODY_MARKER_LOOKS_LIKE_20260823_BASELINE'
    ELSE 'BODY_MARKER_UNKNOWN_OR_MISSING'
  END AS apply_body_marker;

SELECT to_regprocedure(
  'public.store_settlement_assert_refund_allowed(uuid,text)'
) IS NOT NULL AS settlement_refund_guard_present;
