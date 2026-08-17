-- UMTUBA World catalog pilot ingest — UNPUBLISH (rollback)
-- Visibility only. Rows remain. No DROP.

begin;

update public.world_cities
set
  profile_status = 'draft',
  updated_at = timezone('utc', now())
where slug in ('jerusalem', 'amman', 'istanbul', 'berlin', 'dubai', 'new-york', 'tokyo', 'cairo');

commit;
