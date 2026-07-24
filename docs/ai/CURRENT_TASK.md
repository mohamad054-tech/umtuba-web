# Current Task

## Task title

UMTUBA — Games Hub Runtime Completion Submit Composition Trusted V1

## Goal

Add the thinnest possible Hub Runtime composition helper that assembles a
validated submit request and invokes the existing trusted submit client.
Do not adapt local Hub state, do not mutate completion handoff, and do not
introduce any runtime authority.

## Allowed scope

- `lib/games/gamesHubRuntimeCompletionSubmitComposition.ts`
- `lib/games/gamesHubRuntimeCompletionSubmitComposition.test.ts`
- `docs/games/implementation/GAMES_HUB_RUNTIME_COMPLETION_SUBMIT_COMPOSITION_TRUSTED_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Learning / Ads / Store / World / Financial / Social
- New Supabase migrations; apply of `20260846` or `20260847`
- Remote RPC execution in tests
- Session Start composition
- Hub state updates / `handoff.applied` mutation
- Hub authority flag changes
- `/games` UI or gameplay launch
- Rewards / wallet / points / economy
- Merge / push to `alpha-0.2`
- Unrelated files (including modifying `gamesHubRuntime.ts` for RPC wiring)

## Branch

`office/games-hub-runtime-completion-submit-composition-v1`

Required parent: `office/games-hub-runtime-completion-submit-request-assembly-v1` at
`f5a143ce107d89158c81d9a068cbb44d82bef132`

## Status

complete — PASS
