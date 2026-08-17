-- UMTUBA World catalog pilot ingest — DRAFT upsert
-- Idempotent. Does not overwrite published/verified curated cities.
-- Rollback = unpublish, not DROP. No schema migration.

begin;

insert into public.world_countries (country_code, name, slug, is_active)
values
  ('PS', 'Palestine', 'palestine', true),
  ('JO', 'Jordan', 'jordan', true),
  ('TR', 'Türkiye', 'turkiye', true),
  ('DE', 'Germany', 'germany', true),
  ('AE', 'United Arab Emirates', 'united-arab-emirates', true),
  ('US', 'United States', 'united-states', true),
  ('JP', 'Japan', 'japan', true),
  ('EG', 'Egypt', 'egypt', true)
on conflict (country_code) do update
set is_active = true
where public.world_countries.is_active is distinct from true;

insert into public.world_cities (
  slug,
  city_name,
  country_code,
  country_name,
  country_id,
  center_latitude,
  center_longitude,
  timezone_name,
  is_active,
  profile_status,
  verification_status
)
select
  v.slug,
  v.city_name,
  c.country_code,
  c.name,
  c.id,
  v.center_latitude,
  v.center_longitude,
  v.timezone_name,
  true,
  'draft',
  'unverified'
from (
  values
  ('jerusalem', 'Jerusalem', 'PS', 31.7683, 35.2137, 'Asia/Jerusalem'),
  ('amman', 'Amman', 'JO', 31.9539, 35.9106, 'Asia/Amman'),
  ('istanbul', 'Istanbul', 'TR', 41.0082, 28.9784, 'Europe/Istanbul'),
  ('berlin', 'Berlin', 'DE', 52.52, 13.405, 'Europe/Berlin'),
  ('dubai', 'Dubai', 'AE', 25.2048, 55.2708, 'Asia/Dubai'),
  ('new-york', 'New York', 'US', 40.7128, -74.006, 'America/New_York'),
  ('tokyo', 'Tokyo', 'JP', 35.6762, 139.6503, 'Asia/Tokyo'),
  ('cairo', 'Cairo', 'EG', 30.0444, 31.2357, 'Africa/Cairo')
) as v(slug, city_name, country_code, center_latitude, center_longitude, timezone_name)
join public.world_countries c on c.country_code = v.country_code
on conflict (slug) do update
set
  city_name = excluded.city_name,
  country_code = excluded.country_code,
  country_name = excluded.country_name,
  country_id = excluded.country_id,
  center_latitude = excluded.center_latitude,
  center_longitude = excluded.center_longitude,
  timezone_name = excluded.timezone_name,
  updated_at = timezone('utc', now())
where public.world_cities.profile_status = 'draft'
  and public.world_cities.verification_status in ('unverified', 'pending');

commit;
