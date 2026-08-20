select
  count(*)::int as total_rows,
  count(*) filter (where char_length(btrim(title)) > 0)::int as named_count,
  count(*) filter (where title ~ '^[0-9]+$' or title ilike 'sound[_]%' or title ilike '%generated_clip%')::int as generic_filename_titles,
  count(distinct title)::int as unique_titles
from public.social_sounds
where source_type = 'platform';

select id, title, storage_path, duration_ms
from public.social_sounds
where source_type = 'platform'
order by title;
