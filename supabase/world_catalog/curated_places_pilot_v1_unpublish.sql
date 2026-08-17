-- UMTUBA World catalog ingest — PLATFORM curated places UNPUBLISH
-- Visibility only. Rows remain. No DROP. User-owned places are not touched.

begin;
select set_config('umtuba.world_catalog_ingest', 'on', true);

update public.world_places
set
  profile_status = 'draft',
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
  and owner_user_id is null;

commit;
