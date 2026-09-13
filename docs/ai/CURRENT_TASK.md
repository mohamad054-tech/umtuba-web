# Current Task

## Task title

CENTRAL_UMTUBA_POSTS_ORIGIN_LOCATION_V1

## Status

**LOCAL COMPLETE.** Optional post origin (ISO-2 country + free-text city). Migration printed, not applied.

```
TASK_ID = CENTRAL_UMTUBA_POSTS_ORIGIN_LOCATION_V1
STATUS = LOCAL_COMPLETE
DATE = 2026-09-13
PRODUCTION_DB = DO_NOT_TOUCH
SUPABASE_DB_PUSH = FORBIDDEN
MIGRATION = supabase/migrations/20260942_posts_origin_location_v1.sql
COMMIT = FORBIDDEN_UNLESS_USER_ASKS
PROFILE_GEO = FORBIDDEN
GEOLOCATION = FORBIDDEN
PICKER = OPTION_B_ISO_COUNTRY_PLUS_OPTIONAL_CITY
```

## Allowed scope

- Additive `posts` origin columns (not applied).
- Shared optional picker on CreatePostForm and CreateVideoForm.
- Persist origin through createVideoPostAction / insertVideoPostForUser / insertVideoPostLegacy / createPost.
- world_cities match for lat/lng only; no country-centroid write.
- Remove hardcoded UMTUBA / Worldwide; hide location UI when origin is null.

## Forbidden scope

- Do not read `profiles.city` / `profiles.country`.
- Do not auto-detect IP or GPS.
- Do not add dependencies.
- Do not connect to production or run `supabase db push`.
- Do not commit unless the user asks.
