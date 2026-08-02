-- 22 vs 81 markers
SELECT pg_get_constraintdef(con.oid) AS account_kind_check
FROM pg_constraint con
JOIN pg_class rel ON rel.oid=con.conrelid
JOIN pg_namespace nsp ON nsp.oid=rel.relnamespace
WHERE nsp.nspname='public' AND rel.relname='ueos_accounts'
  AND con.conname='ueos_accounts_account_kind_check';

SELECT
  (pg_get_functiondef('public.ueos_ensure_account(text,uuid,text,text,text)'::regprocedure)
    ILIKE '%in_transit%') AS ensure_body_mentions_in_transit,
  (obj_description('public.ueos_ensure_account(text,uuid,text,text,text)'::regprocedure,'pg_proc')
    ILIKE '%in_transit%') AS ensure_comment_mentions_in_transit,
  obj_description('public.ueos_ensure_account(text,uuid,text,text,text)'::regprocedure,'pg_proc') AS ensure_comment,
  obj_description(
    'public.ueos_post_journal(text,text,text,jsonb,uuid,text,text,text,jsonb,text,uuid)'::regprocedure,
    'pg_proc'
  ) AS post_comment,
  length(pg_get_functiondef('public.ueos_ensure_account(text,uuid,text,text,text)'::regprocedure)) AS ensure_def_len,
  length(pg_get_functiondef(
    'public.ueos_post_journal(text,text,text,jsonb,uuid,text,text,text,jsonb,text,uuid)'::regprocedure
  )) AS post_def_len;
