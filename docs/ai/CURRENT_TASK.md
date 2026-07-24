# Current Task

## Task title

UMTUBA — Games Progress Lookup Trusted V1

## Goal

Add a fail-closed trusted application client for the existing owner-only
Games Platform progress lookup RPC (`get_my_game_progress`), without opening
Hub Runtime, playable authority, rewards, or economy authority.

## Allowed scope

- `lib/games/gamesProgress.ts`
- `lib/games/gamesProgress.test.ts`
- `docs/games/implementation/GAMES_PROGRESS_LOOKUP_TRUSTED_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Learning / Ads / Store / World / Financial / Social
- New Supabase migrations; apply of `20260846` or `20260847`
- Remote progress lookup execution
- Progress mutation
- `start_game_session` / `submit_game_session_result` clients
- Hub or detail-page UI / playable runtime / Kick Blast gameplay
- Matchmaking / multiplayer
- Connecting progress to Hub `runtime.*` / `platformSessionId`
- Rewards / wallet / points / economy
- Catalog pre-read for existence proof
- Merge / push to `alpha-0.2`
- Unrelated files

## Branch

`office/games-progress-lookup-trusted-v1`

Required parent: `office/games-session-lookup-trusted-v1` at
`da458c7898f873ac12cf7456a488a2d41e04d2ac`

## Status

complete — PASS
