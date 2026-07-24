# Current Task

## Task title

UMTUBA — Games Catalog Entry Lookup Trusted V1

## Goal

Complete the trusted Games Catalog read surface by adding fail-closed lookup
clients for the existing `get_game_catalog_by_key` and `get_game_catalog_by_id`
RPCs. Metadata only — no runtime eligibility, sessions, or playability.

## Allowed scope

- `lib/games/gamesCatalog.ts`
- `lib/games/gamesCatalog.test.ts`
- `docs/games/implementation/GAMES_CATALOG_ENTRY_LOOKUP_TRUSTED_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Learning / Ads / Store / World / Financial / Social
- New Supabase migrations; apply of `20260846` or `20260847`
- Remote catalog seed execution / direct SQL / service-role bypass
- UI routes / detail pages, lifecycle admin writes
- Game sessions, playable runtime, Kick Blast gameplay
- Matchmaking / multiplayer
- Merge / push to `alpha-0.2`
- Unrelated files

## Branch

`office/games-catalog-entry-lookup-trusted-v1`

Required parent: `office/games-catalog-title-seed-v1` at `c8e5ae2`

## Status

`complete` — PASS
