select
  c.conname,
  c.contype,
  (
    select string_agg(a.attname, ',' order by u.ord)
    from unnest(c.conkey) with ordinality as u(attnum, ord)
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = u.attnum
  ) as columns,
  t.relrowsecurity as rls_enabled,
  t.relforcerowsecurity as rls_forced
from pg_constraint c
join pg_class t on t.oid = c.conrelid
where c.conrelid = 'public.communication_privacy_settings'::regclass
  and c.conname = 'communication_privacy_settings_pkey';
