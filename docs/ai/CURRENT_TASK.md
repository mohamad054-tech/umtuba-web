# Current Task

## Task title

UMTUBA — Games Hub Runtime Platform Session Bind Trusted V1

## Goal

Add a pure fail-closed binder that attaches a validated Platform
`session_id` to an existing Hub Runtime session contract. Metadata only —
does not open Hub authority, gameplay, submit, ownership, or playability.

## Allowed scope

- `lib/games/gamesHubRuntime.ts`
- `lib/games/gamesHubRuntimePlatformSessionBind.test.ts`
- `docs/games/implementation/GAMES_HUB_RUNTIME_PLATFORM_SESSION_BIND_TRUSTED_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Learning / Ads / Store / World / Financial / Social
- New Supabase migrations; apply of `20260846` or `20260847`
- Remote execution
- Session Start / Submit client changes
- Completion → submit wiring
- Hub authority flag changes
- `/games` UI or gameplay launch
- Rewards / wallet / points / economy
- Merge / push to `alpha-0.2`
- Unrelated files

## Branch

`office/games-hub-runtime-platform-session-bind-trusted-v1`

Required parent: `office/games-session-result-submit-trusted-v1` at
`4a52818fb52527621c6f55053c70d847fcbe5762`

## Status

complete — PASS
