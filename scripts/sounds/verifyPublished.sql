select count(*)::int as rpc_umtuba_hits
from public.search_social_sounds('UMTUBA', 50);

select count(*)::int as table_public_reusable
from public.social_sounds
where visibility = 'public_reusable'
  and reuse_permission = 'public'
  and rights_status in ('owner_confirmed', 'platform_licensed')
  and moderation_status <> 'blocked'
  and rights_confirmed_at is not null;

select count(*)::int as storage_objects
from storage.objects
where bucket_id = 'social-sounds'
  and name like 'sounds/%';
