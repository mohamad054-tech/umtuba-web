# Current Task

## Task title

UMTUBA — Games Session Start Trusted V1

## Goal

Add a fail-closed authenticated owner client for the existing
`start_game_session` RPC, covering create/resume session metadata only,
without opening Hub Runtime, gameplay, result submission, rewards, or
economy authority.

## Allowed scope

- `lib/games/gamesSessionStart.ts`
- `lib/games/gamesSessionStart.test.ts`
- `docs/games/implementation/GAMES_SESSION_START_TRUSTED_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Learning / Ads / Store / World / Financial / Social
- New Supabase migrations; apply of `20260846` or `20260847`
- Remote start execution
- `submit_game_session_result` client
- Hub Runtime / `platformSessionId` wiring
- `/games` UI or game detail UI
- Playable runtime / Kick Blast gameplay / matchmaking / multiplayer
- Rewards / wallet / points / economy
- Catalog pre-read as a security gate; `isCatalogPlayable` as mutation authority
- Duplicate Catalog playability checks in this helper
- Merge / push to `alpha-0.2`
- Unrelated files

## Branch

`office/games-session-start-trusted-v1`

Required parent: `office/games-privacy-settings-update-trusted-v1` at
`df6262edb5fc81babe98a3101f512595170cb8ab`

## Status

complete — PASS
