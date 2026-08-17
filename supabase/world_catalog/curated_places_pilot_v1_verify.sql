select
  (select count(*) from public.world_cities where profile_status = 'published') as published_cities,
  (select count(*) from public.world_places) as places_total,
  (select count(*) from public.world_places where curated_by = 'platform' and owner_user_id is null) as platform_places,
  (select count(*) from public.world_places where profile_status = 'published' and curated_by = 'platform') as published_platform_places,
  (select count(*) from public.world_places where owner_user_id is not null) as user_owned_places,
  (select enabled from public.world_feature_flags where key = 'nearby_places_enabled') as nearby_places_enabled,
  (select enabled from public.world_feature_flags where key = 'world_discovery_enabled') as world_discovery_enabled;
