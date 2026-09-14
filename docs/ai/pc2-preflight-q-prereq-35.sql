select
  to_regclass('public.profiles') is not null as profiles_exists,
  to_regclass('public.profile_follows') is not null as profile_follows_exists,
  to_regclass('public.profile_places') is not null as profile_places_exists,
  to_regclass('public.profile_education') is not null as profile_education_exists,
  to_regclass('public.profile_work') is not null as profile_work_exists,
  to_regclass('public.profile_tags') is not null as profile_tags_exists,
  to_regclass('public.profile_milestones') is not null as profile_milestones_exists,
  to_regclass('public.profile_links') is not null as profile_links_exists,
  to_regclass('storage.buckets') is not null as storage_buckets_exists,
  to_regclass('storage.objects') is not null as storage_objects_exists,
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_row_updated_at'
  ) as set_row_updated_at_exists,
  exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'can_read_profile_audience'
  ) as can_read_profile_audience_exists;
