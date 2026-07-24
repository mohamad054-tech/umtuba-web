# Current Task

## Task title

UMTUBA — Games Hub Runtime Completion Submit Request Assembly Trusted V1

## Goal

Add a pure fail-closed assembler that maps a bound Hub Runtime session, an
existing completion handoff, and an idempotency key into the already-defined
`GamesSessionResultSubmitRequest` shape, without calling Submit or adding
mutation authority.

## Allowed scope

- `lib/games/gamesHubRuntime.ts`
- `lib/games/gamesHubRuntimeCompletionSubmitRequestAssembly.test.ts`
- `docs/games/implementation/GAMES_HUB_RUNTIME_COMPLETION_SUBMIT_REQUEST_ASSEMBLY_TRUSTED_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Learning / Ads / Store / World / Financial / Social
- New Supabase migrations; apply of `20260846` or `20260847`
- Remote execution / Session Start / Submit client calls
- Completion apply (`handoff.applied` must remain false)
- Hub authority flag changes
- `/games` UI or gameplay launch
- Rewards / wallet / points / economy
- Merge / push to `alpha-0.2`
- Unrelated files

## Branch

`office/games-hub-runtime-completion-submit-request-assembly-v1`

Required parent: `office/games-hub-runtime-platform-session-bind-trusted-v1` at
`5e5cef11b16280ee6ce496ba095353cebed919a1`

## Status

complete — PASS
