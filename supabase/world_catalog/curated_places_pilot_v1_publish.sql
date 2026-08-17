-- UMTUBA World catalog ingest — PLATFORM curated places PUBLISH
-- Visibility only. Does not DROP. Does not invent media or users.

begin;
select set_config('umtuba.world_catalog_ingest', 'on', true);

update public.world_places
set
  profile_status = 'published',
  moderation_status = 'approved',
  verification_status = 'verified',
  location_visibility = 'public',
  updated_at = timezone('utc', now())
where slug in (
  'amman-citadel',
  'hagia-sophia',
  'brandenburg-gate',
  'dubai-museum',
  'central-park',
  'senso-ji',
  'egyptian-museum-cairo',
  'british-museum',
  'louvre',
  'colosseum',
  'acropolis-athens',
  'sydney-opera-house',
  'zocalo-mexico-city'
)
  and curated_by = 'platform'
  and source_type = 'platform'
  and owner_user_id is null
  and profile_status in ('draft', 'published');

commit;
