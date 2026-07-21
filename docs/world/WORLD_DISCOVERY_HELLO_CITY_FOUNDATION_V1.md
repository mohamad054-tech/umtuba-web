# World Discovery & Hello City — Foundation V1

Status: local implementation; migration not applied remotely.

Migration:
`supabase/migrations/20260825_world_discovery_hello_city_foundation_v1.sql`

## Architecture

- `world_cities`: small curated destination catalog with city-center coordinates.
- `world_places`: owner-supplied business places, optionally linked to a Store.
- `discover_world_places`: database-authoritative radius/category query using
  Haversine distance and bounded pagination.
- `world_feature_flags`: database flags with platform-admin audit events.
- `hello_city_posts`: explicit, moderated, expiring city/country-level posts.
- `sessionStorage`: short-lived Return to Exact Context state.

This is not a complete maps database. UMTUBA does not copy or scrape Google
Maps data. Provider identifiers remain optional.

## Privacy

- Device location is optional and requested only by a user action.
- The browser/device supplies GPS.
- Discovery coordinates are sent as one-time RPC inputs and are not stored.
- No continuous location tracking (`watchPosition`) is used.
- Denial/unavailability always leaves manual destination discovery available.
- Private seller/place rows are not returned by public discovery.
- Public results require `public` visibility, `approved` moderation, and
  `verified` verification.
- Hello City stores city/country only—never latitude or longitude.
- Unknown-age users receive minor-safe defaults: followers audience, comments
  off, private messages off.

Business coordinates are public only after the owner chooses public visibility
and platform moderation/verification approves the place.

## External directions

V1 opens Google Maps externally using the universal
`https://www.google.com/maps/dir/?api=1` URL. It:

- does not embed Google Maps;
- does not use the Google Maps JavaScript API;
- does not require an API key;
- prefers validated destination coordinates;
- falls back to a sanitized, URL-encoded destination label/address;
- rejects raw URL/protocol injection.

The universal URL may open the Google Maps mobile app when the OS supports it;
otherwise it opens in the browser. UMTUBA does not provide internal
turn-by-turn navigation in V1.

## Return to Exact Context

Before an external directions link opens, UMTUBA saves only:

- validated internal route and allowlisted route parameters;
- scroll position;
- selected tab/filters and optional modal state;
- video ID and playback time only when applicable;
- creation and expiry timestamps.

The context is session-scoped, expires after two hours, rejects external paths
and open redirects, and restores on normal app resume/page-show. Invalid or
expired state is removed and falls back to the current safe internal page.

Returning from Google Maps depends on normal OS app switching/back behavior.
When UMTUBA resumes, it restores the last valid saved internal context.

## Feature flags

| Flag | V1 default |
| --- | --- |
| `world_discovery_enabled` | OFF |
| `nearby_places_enabled` | OFF |
| `external_directions_enabled` | ON |
| `hello_city_enabled` | OFF |
| `arrival_detection_enabled` | OFF |

Flags are database-authoritative and platform-admin mutations are audited.

Public catalog RLS policies do not call `is_platform_admin()` on anon paths.
Admin bypass uses separate authenticated policies. See also
`20260827_world_discovery_security_hardening_v1.sql`.

## Hello City future activation

Hello City requires explicit user publishing, moderation approval, expiry,
rate-limit enforcement and abuse-report readiness. There is no automatic post.
Arrival detection remains OFF and cannot itself publish in V1.

Before activation:

1. curate destination cities;
2. validate moderation/abuse operations;
3. validate age/guardian policy and private safety-setting administration;
4. run RLS/integration tests against the deployed migration;
5. enable `hello_city_enabled` separately from arrival detection.

## V1 limitations

- No turn-by-turn navigation or embedded map.
- No background/continuous GPS.
- No automatic arrival detection or posting.
- No bulk third-party place ingestion.
- Haversine + bounding indexes are adequate for the initial curated dataset;
  PostGIS can be evaluated later if scale requires it.
- City/place creation and moderation administration are database foundations;
  full business-owner/admin management UI is deferred.
