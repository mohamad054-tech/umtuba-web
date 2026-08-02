-- Detect whether remote apply body still includes settlement guard (24) or not
SELECT
  (pg_get_functiondef(
     'public.apply_store_payment_outcome(uuid,text,text,text,text,bigint,text,jsonb)'::regprocedure
   ) ILIKE '%store_settlement_assert_refund_allowed%') AS calls_settlement_refund_guard,
  (pg_get_functiondef(
     'public.apply_store_payment_outcome(uuid,text,text,text,text,bigint,text,jsonb)'::regprocedure
   ) ILIKE '%Settlement refund guard%') AS comment_mentions_settlement_guard,
  length(pg_get_functiondef(
     'public.apply_store_payment_outcome(uuid,text,text,text,text,bigint,text,jsonb)'::regprocedure
  )) AS apply_def_length;
