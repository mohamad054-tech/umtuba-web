# Current Task

## Task title

UMTUBA — Games Session Result Submit Trusted V1

## Goal

Add the thinnest possible authenticated trusted client for
`submit_game_session_result` by composing the existing request validator,
existing RPC contract, and existing response parser. SQL remains the sole
ownership, expiry, idempotency, claim-decision, progress, achievement, and
mutation authority.

## Allowed scope

- `lib/games/gamesSessionResultSubmit.ts`
- `lib/games/gamesSessionResultSubmit.test.ts`
- `docs/games/implementation/GAMES_SESSION_RESULT_SUBMIT_TRUSTED_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Learning / Ads / Store / World / Financial / Social
- New Supabase migrations; apply of `20260846` or `20260847`
- Remote submit execution / live RPC against remote project
- Hub Runtime / `platformSessionId` wiring
- `/games` UI or game detail UI
- Playable runtime / Kick Blast gameplay / matchmaking / multiplayer
- App-side ownership, expiry, idempotency replay, claim acceptance/rejection
- App-side anti-abuse / progress / achievement mutation
- Rewards / wallet / points / economy
- Merge / push to `alpha-0.2`
- Unrelated files
- Second submit state machine / duplicated request or response parsers

## Branch

`office/games-session-result-submit-trusted-v1`

Required parent: `office/games-session-result-submit-response-parser-v1` at
`bb1b754374fc2425404305e2595f0085aae6f211`

## Status

complete — PASS
