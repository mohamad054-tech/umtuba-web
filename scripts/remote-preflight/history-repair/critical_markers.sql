SELECT
  EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20260822') AS hist_22,
  EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20260823') AS hist_23,
  EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20260824') AS hist_24,
  EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version='20260881') AS hist_81,
  to_regclass('public.ueos_accounts') IS NOT NULL AS ueos_accounts,
  to_regclass('public.store_payment_outcome_events') IS NOT NULL AS outcome_table,
  to_regclass('public.store_settlement_events') IS NOT NULL AS settlement_table,
  to_regprocedure('public.apply_store_payment_outcome(uuid,text,text,text,text,bigint,text,jsonb)') IS NOT NULL AS apply_rpc,
  to_regprocedure('public.store_settlement_assert_refund_allowed(uuid,text)') IS NOT NULL AS settlement_guard_fn,
  (
    SELECT pg_get_constraintdef(con.oid)
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid=con.conrelid
    JOIN pg_namespace nsp ON nsp.oid=rel.relnamespace
    WHERE nsp.nspname='public' AND rel.relname='ueos_accounts'
      AND con.conname='ueos_accounts_account_kind_check'
  ) AS account_kind_check,
  (pg_get_functiondef('public.ueos_ensure_account(text,uuid,text,text,text)'::regprocedure)
    ILIKE '%in_transit%') AS ensure_has_in_transit,
  obj_description('public.ueos_ensure_account(text,uuid,text,text,text)'::regprocedure,'pg_proc') AS ensure_comment,
  obj_description(
    'public.ueos_post_journal(text,text,text,jsonb,uuid,text,text,text,jsonb,text,uuid)'::regprocedure,'pg_proc'
  ) AS post_comment,
  obj_description(
    'public.apply_store_payment_outcome(uuid,text,text,text,text,bigint,text,jsonb)'::regprocedure,'pg_proc'
  ) AS apply_comment,
  (pg_get_functiondef(
     'public.apply_store_payment_outcome(uuid,text,text,text,text,bigint,text,jsonb)'::regprocedure
   ) ILIKE '%store_settlement_assert_refund_allowed%') AS apply_has_24_guard,
  EXISTS(
    SELECT 1 FROM public.ueos_policies
    WHERE policy_code='ueos.foundation' AND version=1 AND status='active'
  ) AS ueos_foundation_policy,
  EXISTS(
    SELECT 1 FROM public.ueos_policies
    WHERE policy_code='store.payment.captured' AND version=1 AND status='active'
  ) AS store_payment_captured_policy,
  (SELECT count(*)::int FROM public.ueos_accounts WHERE asset_code='UMT') AS umt_accounts,
  has_function_privilege('anon', 'public.apply_store_payment_outcome(uuid,text,text,text,text,bigint,text,jsonb)', 'EXECUTE') AS anon_exec_apply,
  has_function_privilege('authenticated', 'public.apply_store_payment_outcome(uuid,text,text,text,text,bigint,text,jsonb)', 'EXECUTE') AS auth_exec_apply,
  has_function_privilege('service_role', 'public.apply_store_payment_outcome(uuid,text,text,text,text,bigint,text,jsonb)', 'EXECUTE') AS sr_exec_apply;
