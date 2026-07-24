# Current Task

## Task title

UMTUBA — Games Hub Runtime Submit Outcome Local Apply Mutation Input
Contract Trusted V1

## Goal

Add a pure fail-closed mutation-input envelope over an already-trusted
local-apply plan, ready precondition guard, token-less authorization, and
dry-run effects description. This feature may prepare a bounded future
mutation input only; it must not execute apply, mutate Runtime or handoff,
set `applied=true`, transition lifecycle, expose writable references, return
capability tokens, or open Hub authority.

## Allowed scope

- `lib/games/gamesHubRuntimeSubmitOutcomeLocalApplyMutationInput.ts`
- `lib/games/gamesHubRuntimeSubmitOutcomeLocalApplyMutationInput.test.ts`
- `docs/games/implementation/GAMES_HUB_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_MUTATION_INPUT_CONTRACT_TRUSTED_V1.md`
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

`office/games-hub-runtime-submit-outcome-local-apply-mutation-input-contract-v1`

Required parent:
`office/games-hub-runtime-submit-outcome-local-apply-dry-run-effects-description-contract-v1`
at `1eb141cc8bf390ce0f30dc23f72aebde36e33a81`

## Status

in_progress
