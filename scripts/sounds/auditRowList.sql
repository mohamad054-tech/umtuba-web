select id, title, storage_path, duration_ms, rights_status
from public.social_sounds
where source_type = 'platform'
order by created_at, title;
