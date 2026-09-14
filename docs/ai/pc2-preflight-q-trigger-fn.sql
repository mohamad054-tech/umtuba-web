select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_result(p.oid) as result_type,
  pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'set_row_updated_at';
