# Current Task

## Task title

UMTUBA — Games Hub Runtime Submit Outcome Local Apply Execution Authorization
Contract Trusted V1

## Goal

Add a pure fail-closed, token-less authorization classifier over an
already-trusted local-apply plan and ready precondition guard. This feature may
classify authorization only; it must not execute apply, mutate Runtime or
handoff, set `applied=true`, transition lifecycle, return a capability token,
or open Hub authority.

## Allowed scope

- `lib/games/gamesHubRuntimeSubmitOutcomeLocalApplyExecutionAuthorization.ts`
- `lib/games/gamesHubRuntimeSubmitOutcomeLocalApplyExecutionAuthorization.test.ts`
- `docs/games/implementation/GAMES_HUB_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_EXECUTION_AUTHORIZATION_CONTRACT_TRUSTED_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Learning / Ads / Store / World / Financial / Social
- New Supabase migrations; apply of `20260846` or `20260847`
- Remote RPC execution / Start / Submit call
- `handoff.applied=true` / runtime lifecycle activation
- Local apply consumer / executor / capability token
- Dry-run side-effect catalog
- Hub authority flag changes
- `/games` UI or gameplay launch
- Progress / achievement mutation
- Rewards / wallet / points / economy
- Merge / push to `alpha-0.2`
- Unrelated files (including modifying `gamesHubRuntime.ts` for wiring)

## Branch

`office/games-hub-runtime-submit-outcome-local-apply-execution-authorization-contract-v1`

Required parent:
`office/games-hub-runtime-submit-outcome-local-apply-execution-precondition-guard-v1`
at `fdbf74225efbe2f9c48649cdf55ca7fd8802eeeb`

## Status

complete — PASS
