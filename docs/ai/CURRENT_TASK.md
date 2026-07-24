# Current Task

## Task title

UMTUBA — Games Hub Runtime Submit Outcome Local Apply Plan Contract Trusted V1

## Goal

Add a pure fail-closed local-apply plan/intent contract for an already-trusted
apply-eligibility result. This feature may describe a future local apply only;
it must not execute apply, mutate Runtime or handoff, set `applied=true`,
permit reapply, change lifecycle, or open Hub authority.

## Allowed scope

- `lib/games/gamesHubRuntimeSubmitOutcomeLocalApplyPlan.ts`
- `lib/games/gamesHubRuntimeSubmitOutcomeLocalApplyPlan.test.ts`
- `docs/games/implementation/GAMES_HUB_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_PLAN_CONTRACT_TRUSTED_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Learning / Ads / Store / World / Financial / Social
- New Supabase migrations; apply of `20260846` or `20260847`
- Remote RPC execution / Start / Submit call
- `handoff.applied=true` / runtime lifecycle activation
- Local apply consumer / executor / callback in plan
- Hub authority flag changes
- `/games` UI or gameplay launch
- Progress / achievement mutation
- Rewards / wallet / points / economy
- Merge / push to `alpha-0.2`
- Unrelated files (including modifying `gamesHubRuntime.ts` for wiring)

## Branch

`office/games-hub-runtime-submit-outcome-local-apply-plan-contract-v1`

Required parent: `office/games-hub-runtime-submit-outcome-apply-eligibility-contract-v1` at
`223abd86270d73e56deea78b5577d9496cd5b935`

## Status

complete — PASS
