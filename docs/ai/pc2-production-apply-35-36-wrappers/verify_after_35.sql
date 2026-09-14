select
  (select version from supabase_migrations.schema_migrations order by version desc limit 1) as live_tip,
  (select count(*) from supabase_migrations.schema_migrations) as schema_migrations_count,
  (select count(*) from supabase_migrations.schema_migrations where version = '20260934') as has_20260934,
  (select count(*) from supabase_migrations.schema_migrations where version = '20260935') as has_20260935,
  (select count(*) from supabase_migrations.schema_migrations where version = '20260936') as has_20260936,
  (select name from supabase_migrations.schema_migrations where version = '20260935') as name_20260935,
  (select count(*)::bigint from public.profiles) as profiles_count,
  to_regclass('public.profile_places') is not null as has_profile_places,
  to_regclass('public.profile_education') is not null as has_profile_education,
  to_regclass('public.profile_work') is not null as has_profile_work,
  to_regclass('public.profile_tags') is not null as has_profile_tags,
  to_regclass('public.profile_milestones') is not null as has_profile_milestones,
  to_regclass('public.profile_links') is not null as has_profile_links,
  to_regclass('public.learning_teacher_profiles') is not null as has_learning_teacher_profiles,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'bio_long'
  ) as has_bio_long,
  exists (
    select 1 from storage.buckets where id = 'profile-covers'
  ) as has_profile_covers_bucket;
