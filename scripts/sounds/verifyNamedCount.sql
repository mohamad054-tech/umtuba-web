select
  count(*)::int as total_rows,
  count(*) filter (where char_length(btrim(title)) > 0)::int as named_count,
  count(distinct title)::int as unique_titles,
  count(*) filter (where title ilike 'UMTUBA % 0%')::int as old_numbered_titles
from public.social_sounds
where source_type = 'platform';
