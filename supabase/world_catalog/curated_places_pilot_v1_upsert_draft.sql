-- UMTUBA World catalog ingest — PLATFORM curated places DRAFT upsert
-- Idempotent. Does not overwrite published/verified platform places.
-- Does not mutate real user-owned places. No fake auth.users.
-- Rollback = unpublish, not DROP.

begin;
select set_config('umtuba.world_catalog_ingest', 'on', true);

insert into public.world_places (
  owner_user_id,
  city_id,
  name,
  slug,
  category,
  place_kind,
  latitude,
  longitude,
  location_visibility,
  verification_status,
  moderation_status,
  source_type,
  curated_by,
  profile_status,
  provenance_kind,
  provenance_source,
  provenance_citation,
  opening_hours_status,
  reviews_status,
  ai_summary_status
)
select
  null,
  c.id,
  v.name,
  v.slug,
  v.category,
  v.place_kind,
  v.latitude,
  v.longitude,
  'public',
  'unverified',
  'pending',
  'platform',
  'platform',
  'draft',
  v.provenance_kind,
  v.provenance_source,
  v.provenance_citation,
  'not_provided',
  'not_enabled',
  'not_requested'
from (
  values
  ('amman-citadel', 'Amman Citadel', 'amman', 'attraction', 'point_of_interest', 31.9547, 35.9343, 'public_geographic_fact', 'https://en.wikipedia.org/wiki/Amman_Citadel', 'Wikidata Q3157009 P625 31.9547, 35.9343 retrieved 2026-08-17; English Wikipedia sitelink Amman Citadel. Article Geo coordinates were absent.'),
  ('hagia-sophia', 'Hagia Sophia', 'istanbul', 'attraction', 'attraction', 41.00833333, 28.98, 'public_geographic_fact', 'https://en.wikipedia.org/wiki/Hagia_Sophia', 'Wikipedia primary Geo coordinates retrieved 2026-08-17 via action=query&prop=coordinates (pageid 42764).'),
  ('brandenburg-gate', 'Brandenburg Gate', 'berlin', 'attraction', 'attraction', 52.5163, 13.3777, 'public_geographic_fact', 'https://en.wikipedia.org/wiki/Brandenburg_Gate', 'Wikipedia primary Geo coordinates retrieved 2026-08-17 via action=query&prop=coordinates (pageid 156604).'),
  ('dubai-museum', 'Dubai Museum', 'dubai', 'attraction', 'attraction', 25.26305556, 55.29722222, 'public_geographic_fact', 'https://en.wikipedia.org/wiki/Dubai_Museum', 'Wikipedia primary Geo coordinates retrieved 2026-08-17 via action=query&prop=coordinates (pageid 34371004).'),
  ('central-park', 'Central Park', 'new-york', 'attraction', 'point_of_interest', 40.78222222, -73.96527778, 'public_geographic_fact', 'https://en.wikipedia.org/wiki/Central_Park', 'Wikipedia primary Geo coordinates retrieved 2026-08-17 via action=query&prop=coordinates (pageid 37536).'),
  ('senso-ji', 'Sensō-ji', 'tokyo', 'attraction', 'attraction', 35.71472222, 139.79675, 'public_geographic_fact', 'https://en.wikipedia.org/wiki/Sensō-ji', 'Wikipedia primary Geo coordinates retrieved 2026-08-17 via action=query&prop=coordinates (pageid 871044).'),
  ('egyptian-museum-cairo', 'Egyptian Museum', 'cairo', 'attraction', 'attraction', 30.047778, 31.233333, 'public_geographic_fact', 'https://en.wikipedia.org/wiki/Egyptian_Museum', 'Wikipedia primary Geo coordinates retrieved 2026-08-17 via action=query&prop=coordinates (pageid 187781).'),
  ('british-museum', 'British Museum', 'london', 'attraction', 'attraction', 51.5194, -0.1269, 'public_geographic_fact', 'https://en.wikipedia.org/wiki/British_Museum', 'Wikipedia primary Geo coordinates retrieved 2026-08-17 via action=query&prop=coordinates (pageid 4675).'),
  ('louvre', 'Louvre', 'paris', 'attraction', 'attraction', 48.8611, 2.3358, 'public_geographic_fact', 'https://en.wikipedia.org/wiki/Louvre', 'Wikipedia primary Geo coordinates retrieved 2026-08-17 via action=query&prop=coordinates (pageid 17546).'),
  ('colosseum', 'Colosseum', 'rome', 'attraction', 'attraction', 41.8903, 12.4922, 'public_geographic_fact', 'https://en.wikipedia.org/wiki/Colosseum', 'Wikipedia primary Geo coordinates retrieved 2026-08-17 via action=query&prop=coordinates (pageid 49603).'),
  ('acropolis-athens', 'Acropolis of Athens', 'athens', 'attraction', 'point_of_interest', 37.97166667, 23.72611111, 'public_geographic_fact', 'https://en.wikipedia.org/wiki/Acropolis_of_Athens', 'Wikipedia primary Geo coordinates retrieved 2026-08-17 via action=query&prop=coordinates (pageid 2076).'),
  ('sydney-opera-house', 'Sydney Opera House', 'sydney', 'attraction', 'attraction', -33.85681, 151.21514, 'public_geographic_fact', 'https://en.wikipedia.org/wiki/Sydney_Opera_House', 'Wikipedia primary Geo coordinates retrieved 2026-08-17 via action=query&prop=coordinates (pageid 28222).'),
  ('zocalo-mexico-city', 'Zócalo', 'mexico-city', 'attraction', 'point_of_interest', 19.43277778, -99.13305556, 'public_geographic_fact', 'https://en.wikipedia.org/wiki/Zócalo', 'Wikipedia primary Geo coordinates retrieved 2026-08-17 via action=query&prop=coordinates (pageid 1566846).')
) as v(slug, name, city_slug, category, place_kind, latitude, longitude, provenance_kind, provenance_source, provenance_citation)
join public.world_cities c
  on c.slug = v.city_slug
 and c.is_active
 and c.profile_status = 'published'
on conflict (slug) do update
set
  name = excluded.name,
  category = excluded.category,
  place_kind = excluded.place_kind,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  provenance_kind = excluded.provenance_kind,
  provenance_source = excluded.provenance_source,
  provenance_citation = excluded.provenance_citation,
  updated_at = timezone('utc', now())
where public.world_places.curated_by = 'platform'
  and public.world_places.owner_user_id is null
  and public.world_places.profile_status = 'draft'
  and public.world_places.verification_status in ('unverified', 'pending');

insert into public.world_place_category_assignments (
  place_id, category_id, is_primary
)
select p.id, cat.id, true
from (
  values
  ('amman-citadel', 'point-of-interest'),
  ('hagia-sophia', 'attraction'),
  ('brandenburg-gate', 'attraction'),
  ('dubai-museum', 'attraction'),
  ('central-park', 'point-of-interest'),
  ('senso-ji', 'attraction'),
  ('egyptian-museum-cairo', 'attraction'),
  ('british-museum', 'attraction'),
  ('louvre', 'attraction'),
  ('colosseum', 'attraction'),
  ('acropolis-athens', 'point-of-interest'),
  ('sydney-opera-house', 'attraction'),
  ('zocalo-mexico-city', 'point-of-interest')
) as v(place_slug, category_slug)
join public.world_places p on p.slug = v.place_slug
join public.world_place_categories cat on cat.slug = v.category_slug
where p.curated_by = 'platform'
  and p.owner_user_id is null
on conflict (place_id, category_id) do nothing;

commit;
