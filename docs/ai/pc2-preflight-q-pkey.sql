select
  n.nspname as schema_name,
  c.relname as table_name,
  con.conname as constraint_name,
  con.contype as constraint_type,
  pg_get_constraintdef(con.oid) as constraint_def,
  (
    select string_agg(a.attname, ',' order by k.ord)
    from unnest(con.conkey) with ordinality as k(attnum, ord)
    join pg_attribute a
      on a.attrelid = con.conrelid
     and a.attnum = k.attnum
  ) as columns
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where con.conname = 'communication_privacy_settings_pkey';
