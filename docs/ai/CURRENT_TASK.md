# Current Task

## Task title

UMTUBA — Games Hub Runtime Submit Outcome Apply Eligibility Contract Trusted V1

## Goal

Add a pure fail-closed eligibility classifier that determines whether an
already-trusted submit acknowledgment is eligible for a future local apply
step, without performing that apply, mutating Runtime or handoff, setting
`applied=true`, permitting reapply, or opening Hub authority.

## Allowed scope

- `lib/games/gamesHubRuntimeSubmitOutcomeApplyEligibility.ts`
- `lib/games/gamesHubRuntimeSubmitOutcomeApplyEligibility.test.ts`
- `docs/games/implementation/GAMES_HUB_RUNTIME_SUBMIT_OUTCOME_APPLY_ELIGIBILITY_CONTRACT_TRUSTED_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Learning / Ads / Store / World / Financial / Social
- New Supabase migrations; apply of `20260846` or `20260847`
- Remote RPC execution / Start / Submit call
- `handoff.applied=true` / runtime lifecycle activation
- Hub authority flag changes
- `/games` UI or gameplay launch
- Progress / achievement mutation
- Rewards / wallet / points / economy
- Merge / push to `alpha-0.2`
- Unrelated files (including modifying `gamesHubRuntime.ts` for wiring)

## Branch

`office/games-hub-runtime-submit-outcome-apply-eligibility-contract-v1`

Required parent: `office/games-hub-runtime-submit-outcome-acknowledgment-contract-v1` at
`04d8b3c650e43a41a78abac53e9a69cbae77e3e5`

## Status

complete — PASS
