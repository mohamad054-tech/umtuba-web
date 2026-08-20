select
  (select count(*)::int from public.social_sounds) as social_sounds_count,
  (
    select count(*)::int
    from public.social_sounds
    where visibility = 'public_reusable'
      and reuse_permission = 'public'
      and rights_status in ('owner_confirmed', 'platform_licensed')
      and moderation_status <> 'blocked'
      and rights_status not in ('blocked', 'takedown')
      and rights_confirmed_at is not null
  ) as public_reusable_count,
  (
    select count(*)::int
    from public.social_sounds
    where source_type = 'platform'
      and rights_status = 'platform_licensed'
  ) as platform_licensed_count,
  (select count(*)::int from public.platform_admins) as platform_admin_count,
  (
    select count(*)::int
    from storage.objects
    where bucket_id = 'social-sounds'
  ) as social_sounds_objects,
  (
    select count(*)::int
    from supabase_migrations.schema_migrations
    where version = '20260932'
  ) as migration_20260932_applied,
  (
    select count(*)::int
    from supabase_migrations.schema_migrations
    where version = '20260931'
  ) as migration_20260931_applied;
