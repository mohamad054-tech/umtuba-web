# Current Task

## Task title

UMTUBA — Games Session Lookup Trusted V1

## Goal

Add the first fail-closed trusted application client for the existing
owner-only Games Platform session lookup RPC (`get_my_game_session`), without
opening Hub Runtime authority or playable runtime.

## Allowed scope

- `lib/games/gamesSessions.ts`
- `lib/games/gamesSessions.test.ts`
- `docs/games/implementation/GAMES_SESSION_LOOKUP_TRUSTED_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Learning / Ads / Store / World / Financial / Social
- New Supabase migrations; apply of `20260846` or `20260847`
- Remote session lookup / start / submit execution
- `start_game_session` / `submit_game_session_result` clients
- Session creation / resume wiring
- Hub or detail-page UI / playable runtime / Kick Blast gameplay
- Matchmaking / multiplayer
- Connecting platform sessions to Hub `runtime.*` / `platformSessionId`
- Merge / push to `alpha-0.2`
- Unrelated files

## Branch

`office/games-session-lookup-trusted-v1`

Required parent: `office/games-catalog-lifecycle-trusted-v1` at
`47d4ada73f071875a63fc74c7d84f2cd62f086af`

## Status

`complete` — PASS
