# Current Task

## Task title

UMTUBA — Games Catalog Title Seed V1

## Goal

Create a fail-closed, metadata-only Catalog title registration foundation for
the first approved UM Games title (UM Kick Blast), using existing Games Catalog
admin contracts and `upsert_game_catalog_entry` authority. Code readiness only
— no migration apply, no remote seed execution.

## Allowed scope

- `lib/games/gamesCatalog.ts`
- `lib/games/gamesCatalog.test.ts`
- `lib/games/gamesCatalogTitleSeed.ts`
- `lib/games/gamesCatalogTitleSeed.test.ts`
- `docs/games/implementation/GAMES_CATALOG_TITLE_SEED_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Learning / Ads / Store / World / Financial / Social (except reusing
  platform-admin auth check via injection / existing RPC)
- New Supabase migrations; apply of `20260846` or `20260847`
- Remote catalog seed execution / direct SQL / service-role bypass
- UI redesign, gameplay, playable runtime, session creation
- Matchmaking / multiplayer
- Merge / push to `alpha-0.2`
- Unrelated files

## Branch

`office/games-catalog-title-seed-v1`

## Status

`complete` — PASS
