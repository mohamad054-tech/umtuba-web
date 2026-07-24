# Current Task

## Task title

UMTUBA — Games Session Result Submit Response Parser Trusted V1

## Goal

Add a pure, fail-closed response parser for the existing
`submit_game_session_result` success payload, without calling the RPC or
adding any mutation, ownership, idempotency, progress, achievement, Hub,
gameplay, reward, or economy authority.

## Allowed scope

- `lib/games/gamesSessionResultSubmitResponse.ts`
- `lib/games/gamesSessionResultSubmitResponse.test.ts`
- `docs/games/implementation/GAMES_SESSION_RESULT_SUBMIT_RESPONSE_PARSER_TRUSTED_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Learning / Ads / Store / World / Financial / Social
- New Supabase migrations; apply of `20260846` or `20260847`
- Remote RPC execution / `submit_game_session_result` call
- Submit client
- Ownership, expiry, idempotency replay logic, claim acceptance/rejection
- Anti-abuse scoring / result persistence / progress / achievement updates
- Hub Runtime / `platformSessionId` wiring
- `/games` UI or game detail UI
- Playable runtime / Kick Blast gameplay / matchmaking / multiplayer
- Rewards / wallet / points / economy
- Merge / push to `alpha-0.2`
- Unrelated files
- Reuse of `parseGamesMySessionResult` (different response shape)

## Branch

`office/games-session-result-submit-response-parser-v1`

Required parent: `office/games-session-result-submit-request-validation-v1` at
`6e8b1fb63d0af935a2877781f09664025d2b6a1d`

## Status

complete — PASS
