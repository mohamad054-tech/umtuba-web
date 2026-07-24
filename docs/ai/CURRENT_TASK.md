# Current Task

## Task title

UMTUBA — Games Hub Runtime Submit Outcome Local Apply Lifecycle Model
Contract Trusted V1

## Goal

Add a pure fail-closed lifecycle-model description over an already-trusted
local-apply mutation-input envelope after continuity checks against the
current runtime session and completion handoff. This feature may return a
frozen bounded lifecycle/semantics view only (allowed future transitions,
duplicate-prevention rule, atomicity pairing, failure semantics,
rollbackSupported false, persistence authority none); it must not execute
apply, mutate Runtime or handoff, set `applied=true`, transition lifecycle,
persist state, implement rollback, expose writable references, return
capability tokens, or open Hub authority.

## Allowed scope

- `lib/games/gamesHubRuntimeSubmitOutcomeLocalApplyLifecycleModel.ts`
- `lib/games/gamesHubRuntimeSubmitOutcomeLocalApplyLifecycleModel.test.ts`
- `docs/games/implementation/GAMES_HUB_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_LIFECYCLE_MODEL_CONTRACT_TRUSTED_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Learning / Ads / Store / World / Financial / Social
- New Supabase migrations; apply of `20260846` or `20260847`
- Remote RPC execution / Start / Submit call
- `handoff.applied=true` / runtime lifecycle activation
- Local apply consumer / executor / capability token
- Persistence logic / rollback implementation
- Hub authority flag changes
- `/games` UI or gameplay launch
- Progress / achievement mutation
- Rewards / wallet / points / economy
- Merge / push to `alpha-0.2`
- Unrelated files (including modifying `gamesHubRuntime.ts` for wiring)

## Branch

`office/games-hub-runtime-submit-outcome-local-apply-lifecycle-model-contract-v1`

Required parent:
`office/games-hub-runtime-submit-outcome-local-apply-mutation-input-contract-v1`
at `cc0fc5281a2c884cc8e177f989c0e9b071ca2400`

## Status

complete
