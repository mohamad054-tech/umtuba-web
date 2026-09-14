select
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_schema = tc.constraint_schema
 and kcu.constraint_name = tc.constraint_name
where tc.table_schema = 'public'
  and tc.table_name = 'profiles'
  and tc.constraint_type in ('PRIMARY KEY', 'UNIQUE')
order by tc.constraint_type, kcu.ordinal_position;
