-- UMTUBA World catalog pilot ingest — UNPUBLISH (rollback)
-- Visibility only. Rows remain. No DROP.

begin;

update public.world_cities
set
  profile_status = 'draft',
  updated_at = timezone('utc', now())
where slug in ('riyadh', 'doha', 'beirut', 'abu-dhabi', 'baghdad', 'london', 'paris', 'madrid', 'rome', 'amsterdam', 'vienna', 'athens', 'lisbon', 'prague', 'barcelona', 'los-angeles', 'chicago', 'toronto', 'mexico-city', 'vancouver', 'sao-paulo', 'rio-de-janeiro', 'buenos-aires', 'lima', 'bogota', 'santiago', 'lagos', 'nairobi', 'cape-town', 'johannesburg', 'casablanca', 'accra', 'tunis', 'seoul', 'beijing', 'shanghai', 'mumbai', 'new-delhi', 'hong-kong', 'bangkok', 'singapore', 'jakarta', 'kuala-lumpur', 'manila', 'sydney', 'melbourne', 'auckland');

commit;
