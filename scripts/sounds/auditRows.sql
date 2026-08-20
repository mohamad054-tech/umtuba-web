-- Read-only row audit. No secrets.
select id, title, storage_path, duration_ms, rights_status, visibility
from public.social_sounds
where source_type = 'platform'
order by created_at, title;

select
  count(*)::int as total_rows,
  count(*) filter (where char_length(btrim(coalesce(title, ''))) > 0)::int as named_count,
  count(*) filter (where title is null or btrim(title) = '')::int as unnamed_count
from public.social_sounds
where source_type = 'platform';
