-- Read-only Sound Library V1 audit. No secrets. No 20260931.
select
  s.id,
  s.title,
  s.storage_path,
  s.duration_ms,
  s.source_type,
  s.rights_status,
  s.visibility,
  s.reuse_permission,
  s.moderation_status,
  s.rights_confirmed_at is not null as rights_confirmed,
  char_length(btrim(s.title)) as title_len
from public.social_sounds s
where s.source_type = 'platform'
order by s.created_at, s.title;

select
  count(*)::int as total_rows,
  count(*) filter (where char_length(btrim(title)) > 0)::int as named_count,
  count(*) filter (where title is null or btrim(title) = '')::int as unnamed_count,
  count(*) filter (where storage_path is not null)::int as has_storage_path
from public.social_sounds
where source_type = 'platform';

select
  count(*) filter (where name like 'sounds/sounds/%')::int as doubled_prefix_objects,
  count(*) filter (where name like 'sounds/%' and name not like 'sounds/sounds/%')::int as intended_prefix_objects,
  count(*)::int as all_social_sound_objects
from storage.objects
where bucket_id = 'social-sounds';

select name, metadata
from storage.objects
where bucket_id = 'social-sounds'
order by name;
