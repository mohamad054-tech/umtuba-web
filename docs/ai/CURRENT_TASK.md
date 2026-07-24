# Current Task

## Task title

UMTUBA — Games Hub Runtime Submit Outcome Local Apply Dry-Run Effects
Description Contract Trusted V1

## Goal

Add a pure fail-closed dry-run/effects-description contract over an
already-trusted local-apply plan, ready precondition guard, and token-less
execution authorization. This feature may describe intended future local
effects only; it must not execute apply, mutate Runtime or handoff, set
`applied=true`, transition lifecycle, provide a capability token, or open Hub
authority.

## Allowed scope

- `lib/games/gamesHubRuntimeSubmitOutcomeLocalApplyDryRunEffectsDescription.ts`
- `lib/games/gamesHubRuntimeSubmitOutcomeLocalApplyDryRunEffectsDescription.test.ts`
- `docs/games/implementation/GAMES_HUB_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_DRY_RUN_EFFECTS_DESCRIPTION_CONTRACT_TRUSTED_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Learning / Ads / Store / World / Financial / Social
- New Supabase migrations; apply of `20260846` or `20260847`
- Remote RPC execution / Start / Submit call
- `handoff.applied=true` / runtime lifecycle activation
- Local apply consumer / executor / capability token
- Hub authority flag changes
- `/games` UI or gameplay launch
- Progress / achievement mutation
- Rewards / wallet / points / economy
- Merge / push to `alpha-0.2`
- Unrelated files (including modifying `gamesHubRuntime.ts` for wiring)

## Branch

`office/games-hub-runtime-submit-outcome-local-apply-dry-run-effects-description-contract-v1`

Required parent:
`office/games-hub-runtime-submit-outcome-local-apply-execution-authorization-contract-v1`
at `34a5f90b79c4abb01a834d02ace67217a9bda2a6`

## Status

complete — PASS
