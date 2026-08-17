-- UMTUBA World catalog pilot ingest — PUBLISH verified geo skeleton
-- Visibility only. Does not DROP. Does not invent places or media.

begin;

update public.world_cities
set
  profile_status = 'published',
  verification_status = 'verified',
  is_active = true,
  updated_at = timezone('utc', now())
where slug in ('jerusalem', 'amman', 'istanbul', 'berlin', 'dubai', 'new-york', 'tokyo', 'cairo')
  and profile_status in ('draft', 'published')
  and is_active;

commit;
