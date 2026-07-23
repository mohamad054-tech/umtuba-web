# UM Games — Catalog Foundation V1

Status: **implemented locally** (migration **NOT APPLIED** remotely)

Migration: `supabase/migrations/20260843_games_catalog_foundation_v1.sql`

Constants: `lib/games/gamesCatalog.ts`

Depends on: Games Platform Foundation V1 (`20260842`) — **file untouched**.

---

## Purpose

Authoritative **registry** of all UMTUBA games. Single source of truth for
catalog metadata so future titles (Kick Blast, Cards, Sudoku, …) register via
admin RPCs without changing application code.

## Locked decisions

1. Extends `public.games` additively — does not rewrite Platform migration.
2. Catalog metadata ≠ gameplay / economy / Ads / matchmaking / anti-cheat.
3. Defaults fail-closed: `availability=unavailable`, `visibility=hidden`.
4. Sessions require `status=active` **and** `availability=available` **and**
   `feature_flags.sessions_enabled=true`.
5. Admin-only upsert / lifecycle (`is_platform_admin`).
6. No public leaderboards; visibility is catalog listing only.
7. Feature flags are allowlisted booleans only.

## Catalog fields (on `games`)

| Field | Notes |
| --- | --- |
| `short_blurb` | Optional ≤280 chars |
| `availability` | available \| unavailable \| coming_soon \| maintenance |
| `visibility` | hidden \| authenticated \| listed |
| `category` | action \| cards \| puzzle \| sports \| casual \| strategy \| other |
| `difficulty` | unset \| easy \| medium \| hard \| expert |
| `min_players` / `max_players` | 1–64, min ≤ max |
| `platforms` | jsonb array: web \| ios \| android |
| `feature_flags` | sessions/achievements/progress/privacy booleans |
| `catalog_version` | integer ≥ 1 |
| `content_version` | optional opaque version string |
| `sort_order` / `is_featured` | listing helpers |

Platform fields retained: `game_key`, `slug`, `name`, `description`, `status`,
`result_validation_mode`, `session_ttl_seconds`, reserved integration ids.

## RPCs

| RPC | Role |
| --- | --- |
| `list_games_catalog()` | Authenticated player list (visible entries) |
| `get_game_catalog_by_key(key)` | Player/admin get |
| `get_game_catalog_by_id(id)` | Player/admin get |
| `upsert_game_catalog_entry(def)` | **Admin** register/update |
| `set_game_catalog_lifecycle(key, patch)` | **Admin** status/availability/visibility |

Internal (revoked from authenticated):

- `game_catalog_validate_definition`
- `game_catalog_row_to_json`

`start_game_session` is **replaced** in this migration (Platform file unchanged)
to enforce availability + `sessions_enabled`.

## Out of scope

Gameplay, UM Points, Ads activation, matchmaking, public leaderboards,
anti-cheat engines, playable seeds (Kick Blast etc. register later via upsert).

## Migration apply status

**NOT APPLIED** to remote Supabase.

## Rollback

Drop catalog RPCs/helpers; optionally drop added columns in a future down
migration. Do not edit `20260842`.
