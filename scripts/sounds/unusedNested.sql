-- Classify leftover nested objects. Safe to delete only if unreferenced.
select count(*)::int as unused_nested_unreferenced
from storage.objects o
where o.bucket_id = 'social-sounds'
  and o.name like 'sounds/sounds/%'
  and not exists (
    select 1
    from public.social_sounds s
    where s.storage_path = o.name
  );

select count(*)::int as nested_still_referenced
from storage.objects o
where o.bucket_id = 'social-sounds'
  and o.name like 'sounds/sounds/%'
  and exists (
    select 1
    from public.social_sounds s
    where s.storage_path = o.name
  );
