-- Read-only probes. Do not print row contents beyond counts/booleans.
select
  (select relrowsecurity and relforcerowsecurity
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'social_sounds') as sounds_force_rls,
  (select relrowsecurity and relforcerowsecurity
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'social_sound_saves') as saves_force_rls,
  (select relrowsecurity and relforcerowsecurity
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'social_sound_reports') as reports_force_rls,
  (select count(*) = 0 from public.social_sounds) as library_empty,
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'posts' and column_name in ('sound_id', 'sound_mix')) as posts_sound_cols,
  (select public from storage.buckets where id = 'social-sounds') as bucket_public,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'search_social_sounds',
        'list_trending_social_sounds',
        'confirm_social_sound_reuse_rights',
        'block_social_sound_reuse',
        'save_social_sound'
      )) as rpcs_present;
