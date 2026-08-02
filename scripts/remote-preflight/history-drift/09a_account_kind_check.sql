SELECT pg_get_constraintdef(con.oid) AS account_kind_check
FROM pg_constraint con
JOIN pg_class rel ON rel.oid=con.conrelid
JOIN pg_namespace nsp ON nsp.oid=rel.relnamespace
WHERE nsp.nspname='public' AND rel.relname='ueos_accounts'
  AND con.conname='ueos_accounts_account_kind_check';
