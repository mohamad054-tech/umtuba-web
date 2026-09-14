-- READ-ONLY PREFLIGHT. SELECT only. Do not apply.

-- 1) schema_migrations catalog
select column_name, data_type
from information_schema.columns
where table_schema = 'supabase_migrations'
  and table_name = 'schema_migrations'
order by ordinal_position;

-- 2) tip + count
select count(*)::int as row_count, max(version) as live_tip
from supabase_migrations.schema_migrations;

-- 3) target versions + 15/16 collision check
select *
from supabase_migrations.schema_migrations
where version in (
  '20260915',
  '20260916',
  '20260933',
  '20260934',
  '20260935',
  '20260936'
)
order by version;

-- 4) all 202609xx
select version
from supabase_migrations.schema_migrations
where version like '202609%'
order by version;

-- 5) named constraint proof
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

-- 6) information_schema fallback for the same constraint
select
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  kcu.ordinal_position
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on kcu.constraint_schema = tc.constraint_schema
 and kcu.constraint_name = tc.constraint_name
where tc.constraint_name = 'communication_privacy_settings_pkey'
order by kcu.ordinal_position;
