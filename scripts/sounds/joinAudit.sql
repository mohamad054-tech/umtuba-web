select
  s.id,
  s.title,
  s.storage_path,
  s.duration_ms,
  s.rights_status,
  o.metadata->>'size' as file_size_bytes,
  o.metadata->>'mimetype' as mime_type,
  case when o.id is null then 'NO' else 'YES' end as file_exists
from public.social_sounds s
left join storage.objects o
  on o.bucket_id = 'social-sounds'
 and o.name = s.storage_path
where s.source_type = 'platform'
order by s.title;
