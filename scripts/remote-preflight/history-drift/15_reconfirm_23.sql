-- Reconfirm 23 quickly
SELECT EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20260823') AS hist_23,
       to_regclass('public.store_payment_outcome_events') IS NOT NULL AS outcome_table,
       to_regprocedure('public.apply_store_payment_outcome(uuid,text,text,text,text,bigint,text,jsonb)') IS NOT NULL AS apply_rpc,
       (pg_get_functiondef('public.apply_store_payment_outcome(uuid,text,text,text,text,bigint,text,jsonb)'::regprocedure)
         ILIKE '%store_settlement_assert_refund_allowed%') AS apply_has_24_guard,
       to_regprocedure('public.store_settlement_assert_refund_allowed(uuid,text)') IS NOT NULL AS settlement_guard_fn,
       obj_description(
         'public.apply_store_payment_outcome(uuid,text,text,text,text,bigint,text,jsonb)'::regprocedure,'pg_proc'
       ) AS apply_comment;
