SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public'
  AND table_name IN (
    'ueos_products','ueos_assets','ueos_policies','ueos_accounts',
    'ueos_journal_entries','ueos_ledger_lines','ueos_account_balances'
  )
ORDER BY table_name, ordinal_position;
