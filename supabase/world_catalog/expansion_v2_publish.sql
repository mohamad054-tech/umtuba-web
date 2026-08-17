-- UMTUBA World catalog pilot ingest — PUBLISH verified geo skeleton
-- Visibility only. Does not DROP. Does not invent places or media.

begin;

update public.world_cities
set
  profile_status = 'published',
  verification_status = 'verified',
  is_active = true,
  updated_at = timezone('utc', now())
where slug in ('riyadh', 'doha', 'beirut', 'abu-dhabi', 'baghdad', 'london', 'paris', 'madrid', 'rome', 'amsterdam', 'vienna', 'athens', 'lisbon', 'prague', 'barcelona', 'los-angeles', 'chicago', 'toronto', 'mexico-city', 'vancouver', 'sao-paulo', 'rio-de-janeiro', 'buenos-aires', 'lima', 'bogota', 'santiago', 'lagos', 'nairobi', 'cape-town', 'johannesburg', 'casablanca', 'accra', 'tunis', 'seoul', 'beijing', 'shanghai', 'mumbai', 'new-delhi', 'hong-kong', 'bangkok', 'singapore', 'jakarta', 'kuala-lumpur', 'manila', 'sydney', 'melbourne', 'auckland')
  and profile_status in ('draft', 'published')
  and is_active;

commit;
