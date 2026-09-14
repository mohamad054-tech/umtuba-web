select version, name
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
