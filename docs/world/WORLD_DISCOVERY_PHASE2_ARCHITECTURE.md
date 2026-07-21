# UMTUBA World Discovery — Phase 2 Architecture

Status: local implementation; migrations are not applied remotely.

Phase 2 extends, and does not replace, Foundation V1:

- `20260825_world_discovery_hello_city_foundation_v1.sql`
- `20260826_world_discovery_domain_phase2.sql`
- `20260827_world_discovery_security_hardening_v1.sql` (RLS, ownership,
  storage, integrity, audited-admin actor safety)

## World Domain

The canonical hierarchy is:

`Country → Region → City → District → Place`

`world_places` remains the single location/profile entity. Point of Interest,
Business, Attraction, Hotel, Restaurant, Store and Local Service are
`place_kind` values, not parallel place tables. Specialized business fields use
a one-to-one `world_business_profiles` extension.

This avoids duplicate coordinates, moderation state and profile URLs.

Existing product domains remain authoritative:

- `stores` owns commerce.
- `posts` owns videos.
- `live_rooms` owns Live.
- Post Journey tables own post reach.

World uses relation tables to those records. It does not copy them.

## Place Model

A public Place requires:

- `location_visibility = public`
- `profile_status = published`
- `moderation_status = approved`
- `verification_status = verified`
- a published parent City

The unified Place profile supports:

- description, tagline and provider-neutral identity;
- cover/gallery metadata through `world_place_media`;
- hierarchical categories and a single primary category;
- city, district, address and public business coordinates;
- HTTPS-only business/booking/menu/commerce/contact links;
- linked ready posts and currently public Live rooms;
- opening-hour schedules and temporary closure state;
- moderated review readiness and aggregates;
- reviewed AI-summary readiness behind the AI layer;
- optional link to the authoritative UMTUBA Store.

- Media rows store bucket/path metadata under the private
  `world-place-media` bucket. Playback and gallery delivery use short-lived
  signed URLs after authorization. Path convention:
  `places/{place_id}/{file}`.
- Security hardening migration:
  `20260827_world_discovery_security_hardening_v1.sql`

## City Model

The City profile adds:

- overview, cover metadata, timezone and verification;
- place counts and featured public places by kind;
- direct city video/Live relation tables;
- City Community and gated Hello City status;
- approved World journeys and Post Journey readiness;
- moderated local events;
- future reviewed AI travel-assistant readiness.

Countries, regions and districts are curated catalog entities. Foundation V1's
country/region display columns remain for backward compatibility while optional
normalized foreign keys support gradual migration.

## Layer Architecture

Eight independently configurable layers exist globally, per City and per Place:

1. Discovery
2. Community
3. Media
4. Commerce
5. Journey
6. Events
7. Live
8. AI

Resolution order is Place override → City override → global default → OFF.
The top-level `world_discovery_enabled` database flag still gates public
profiles, discovery and search.

Community, Events and AI defaults remain OFF. Hello City and arrival detection
retain their separate Foundation V1 flags and remain OFF.

## Hierarchical Categories

`world_place_categories.parent_id` provides an extensible adjacency tree.
Cycles and self-parenting are rejected. `world_place_category_assignments`
supports multiple categories with one primary assignment.

The initial taxonomy seeds structural examples only; it does not import
external provider data.

## Search Model

`search_world_entities` is a dedicated database-authoritative World search RPC.
It searches:

- country;
- city;
- place and its specific kind;
- category.

It uses normalized text, `pg_trgm`, bounded pagination and optional city,
category and entity-type filters. Only published cities and approved,
public, verified places are returned.

The existing global Search `places` registry remains disabled. Phase 2 does not
silently activate an unfinished cross-product search tab. No vectors,
embeddings or AI search are used.

## Return to Exact Context

The session-scoped contract is version 2 and restores:

- internal route and allowlisted route parameters;
- scroll position;
- selected tab and filters;
- modal/detail state;
- open Place and City IDs;
- video ID and playback position;
- current World Journey ID;
- current search query;
- creation and expiration timestamps.

Every route, ID, filter and text field is validated. External destinations,
open redirects, traversal, malformed UUIDs, sensitive form data and expired
contexts are rejected. UI tabs, World filters and World search subscribe to the
validated restoration event. Restore runs only after a marked external
navigation actually caused the page to blur/hide, preventing stale context from
hijacking ordinary in-app navigation. Watch consumes validated video state and
seeks the matching active video.

## Privacy Model

- Device GPS is optional and one-shot.
- Precise user coordinates are never persisted.
- No continuous or background location tracking exists.
- Manual destination discovery remains fully supported.
- Community, Hello City, Events and Journey records reference City/Place only;
  they contain no user-coordinate columns.
- Business coordinates become public only after explicit visibility,
  moderation, verification and publication checks.
- Private Live coordinates and buyer/seller addresses are never joined.
- Public profile RPCs omit owner identity and private provider/operations data.

## Future AI Integration

AI is OFF by default. `world_place_ai_summaries` stores only reviewed output and
publishes it when both record status and the AI layer permit it. Model metadata
is optional and provider-neutral. Generation, embeddings, AI search and
automatic recommendations are outside Phase 2.

## Future Journey Integration

`world_journeys`, ordered stops and post links provide itinerary structure.
Posts remain authoritative and Post Journey remains the reach experience.
Future work can connect a Journey to exact playback/handoff state without
copying Post Journey telemetry.

## Operational Limitations

- The migrations require security review and controlled remote application.
- Country/region/city/place data needs a curated administration workflow.
- Review submission, event creation and owner profile-management UI are not
  activated by this phase.
- Search and profiles stay unavailable while World Discovery is OFF.
- PostGIS remains deferred; bounded Haversine is appropriate for the initial
  curated dataset.
