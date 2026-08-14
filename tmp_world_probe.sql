select version, name from supabase_migrations.schema_migrations
where version in ('20260824','20260825','20260826','20260827','20260828','20260928')
order by version;

select
  to_regclass('public.world_feature_flags') as world_feature_flags,
  to_regclass('public.world_cities') as world_cities,
  to_regclass('public.world_places') as world_places,
  to_regclass('public.hello_city_posts') as hello_city_posts;

select exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='is_platform_admin') as is_platform_admin_present;
