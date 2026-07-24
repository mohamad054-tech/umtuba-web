# Current Task

## Task title

UMTUBA — UM Games Hub Catalog Data Wiring V1

## Goal

Replace the empty Games Hub catalog loader with a fail-closed, trusted read
of visible Games Catalog entries via Catalog Foundation contracts /
`list_games_catalog`, so `/games` can render real catalog cards.

## Allowed scope

- `lib/games/gamesCatalog.ts`
- `lib/games/gamesCatalog.test.ts`
- `lib/games/gamesHubExperience.ts`
- `lib/games/gamesHubExperience.test.ts`
- `app/games/page.tsx`
- `docs/games/implementation/GAMES_HUB_CATALOG_DATA_WIRING_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Learning / Ads / Store / World / Financial / Social
- Migrations (do not create or apply `20260847`)
- Title seeds / sample production data
- Playable runtime, multiplayer, matchmaking, session creation
- Navigation redesign
- Merge / push to `alpha-0.2`
- Unrelated files

## Branch

`office/games-hub-catalog-data-wiring-v1`

## Status

`complete` — PASS
