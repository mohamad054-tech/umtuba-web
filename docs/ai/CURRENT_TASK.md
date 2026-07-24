# Current Task

## Task title

UMTUBA — Games Hub Runtime Session Start Composition Trusted V1

## Goal

Add the thinnest possible Hub Runtime start composition helper that calls
the existing trusted Platform session-start client, verifies game
continuity, and binds the returned Platform session ID to an existing Hub
Runtime session. Metadata binding only; no runtime, play, submit, UI, or
gameplay authority.

## Allowed scope

- `lib/games/gamesHubRuntimeSessionStartComposition.ts`
- `lib/games/gamesHubRuntimeSessionStartComposition.test.ts`
- `docs/games/implementation/GAMES_HUB_RUNTIME_SESSION_START_COMPOSITION_TRUSTED_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Learning / Ads / Store / World / Financial / Social
- New Supabase migrations; apply of `20260846` or `20260847`
- Remote start / RPC execution in tests
- Submit call / completion handoff changes
- Hub state-machine activation / Hub authority flag changes
- `/games` UI or gameplay launch
- Rewards / wallet / points / economy
- Merge / push to `alpha-0.2`
- Unrelated files (including modifying `gamesHubRuntime.ts` for RPC wiring)

## Branch

`office/games-hub-runtime-session-start-composition-v1`

Required parent: `office/games-hub-runtime-completion-submit-composition-v1` at
`24476db891cedded9ed050665f979fb6d7d7f741`

## Status

complete — PASS
