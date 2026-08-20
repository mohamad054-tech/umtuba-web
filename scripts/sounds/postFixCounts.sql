select
  count(*) filter (where name like 'sounds/sounds/%')::int as doubled_prefix_objects,
  count(*) filter (where name like 'sounds/%' and name not like 'sounds/sounds/%')::int as intended_prefix_objects,
  count(*)::int as all_social_sound_objects
from storage.objects
where bucket_id = 'social-sounds';
