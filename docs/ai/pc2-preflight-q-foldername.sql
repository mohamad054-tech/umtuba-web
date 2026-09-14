select exists (
  select 1
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'storage'
    and p.proname = 'foldername'
) as storage_foldername_exists;
