# Current Task

## Task title

UMTUBA — Games Catalog Lifecycle Trusted V1

## Goal

Complete the final declared Games Catalog trusted contract by implementing a
fail-closed lifecycle mutation wrapper for the existing
`set_game_catalog_lifecycle` RPC. Metadata only — no runtime eligibility,
sessions, or playability.

## Allowed scope

- `lib/games/gamesCatalog.ts`
- `lib/games/gamesCatalog.test.ts`
- `docs/games/implementation/GAMES_CATALOG_LIFECYCLE_TRUSTED_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Learning / Ads / Store / World / Financial / Social
- New Supabase migrations; apply of `20260846` or `20260847`
- Remote catalog seed execution / remote lifecycle write / direct SQL /
  service-role bypass
- Admin UI / Hub UI expansion / game detail route
- Game sessions, playable runtime, Kick Blast gameplay
- Matchmaking / multiplayer
- Merge / push to `alpha-0.2`
- Unrelated files

## Branch

`office/games-catalog-lifecycle-trusted-v1`

Required parent: `office/games-catalog-entry-lookup-trusted-v1` at `e3d2eb1`

## Status

`complete` — PASS
