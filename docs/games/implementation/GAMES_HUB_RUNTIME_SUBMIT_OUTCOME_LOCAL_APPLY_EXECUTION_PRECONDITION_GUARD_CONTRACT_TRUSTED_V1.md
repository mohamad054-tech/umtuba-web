# UM Games — Hub Runtime Submit Outcome Local Apply Execution Precondition Guard Contract Trusted V1

Status: **code-ready**

Depends on:

- Hub / Runtime Foundation V1 (`GamesRuntimeSessionContract`,
  `GamesRuntimeCompletionHandoff`, existing `lifecycleState` /
  `finalized` fields)
- Hub Runtime Submit Outcome Local Apply Plan Contract Trusted V1
  (`buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted` /
  `GamesRuntimeSubmitOutcomeLocalApplyPlan`)

---

## Purpose

Provide a **pure fail-closed execution-precondition guard** that classifies
whether an already-trusted local-apply plan is ready for a future local apply
step after strict continuity checks against the current runtime session and
completion handoff.

This slice is **precondition / guard classification only**:

- no apply execution
- no mutation of runtime session or completion handoff
- no lifecycle transition
- no `handoff.applied = true`
- no reapply permission
- no executor, callback, RPC client, mutation token, or authority token
- no Supabase / Submit / Start / RPC
- no progress, achievement, reward, economy, or gameplay authority
- no Hub synchronization

A `ready` result is **not** execution permission. SQL remains the sole submit
decision and mutation authority. Hub Runtime authority remains closed.

---

## Helper

```
evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
  runtimeSession,
  completionHandoff,
  trustedLocalApplyPlan
)
  → structurally validate session / handoff / plan fields used by the guard
  → require non-null valid platformSessionId
  → continuity:
       runtime ↔ handoff (runtimeSessionId / gameId / playerId)
       plan ↔ runtime (runtimeSessionId / gameId / playerId /
         platformSessionId)
  → require handoff.applied === false (else fail closed)
  → require exact accepted-fresh trusted-plan consistency
  → require all plan authority / execution flags literal false
  → inspect existing lifecycleState + finalized only
  → freeze guard (prepares*: true; applied / mutates* / permitsReapply /
      executesApply: false)
```

### Signature

```
evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
  runtimeSession: unknown,
  completionHandoff: unknown,
  trustedLocalApplyPlan: unknown
) → GamesValidationResult<
  GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionGuard
>
```

### Guard return type

```
GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionGuard = Readonly<{
  runtimeSessionId: string;
  gameId: string;
  playerId: string;
  platformSessionId: string;
  resultId: string;
  preconditionStatus: "ready" | "blocked";
  blockedReason: "lifecycle_abandoned" | "lifecycle_expired" | null;
  preparesRuntimeApply: true;
  preparesHandoffApply: true;
  applied: false;
  mutatesRuntime: false;
  mutatesHandoff: false;
  permitsReapply: false;
  executesApply: false;
}>
```

Hub Runtime camelCase only. Authority / execution flags are always literal
`false`.

---

## Fail-closed vs bounded blocked

| Outcome | When |
| --- | --- |
| Fail closed (`ok: false`) | malformed / inconsistent inputs; already-applied handoff; rejected / idempotent-replay / inconsistent plan; non-false authority flags; prepares\* not true; identity / platformSessionId mismatch; non-terminal lifecycle (`created` / `active` / `paused`); completed without `finalized`; abandoned/expired without `finalized` |
| Bounded blocked (`ok: true`, `preconditionStatus: "blocked"`) | only explicit supported non-ready terminal states already defined by the Runtime contract: `lifecycleState === "abandoned"` or `"expired"` with `finalized === true`, after all other checks pass |
| Ready (`ok: true`, `preconditionStatus: "ready"`) | `lifecycleState === "completed"` and `finalized === true`, unapplied handoff, exact accepted-fresh plan, continuity OK |

No new lifecycle state machine is introduced. Ready/blocked classification uses
only explicit existing contract fields (`lifecycleState`, `finalized`).

---

## Exact trusted-plan consistency

| Field | Required |
| --- | --- |
| `eligibilityStatus` | `"eligible_accepted_fresh"` |
| `acknowledgmentStatus` | `"accepted_fresh"` |
| `decisionStatus` | `"accepted"` |
| `idempotentReplay` | `false` |
| `preparesRuntimeApply` | `true` |
| `preparesHandoffApply` | `true` |
| `applied` / `mutatesRuntime` / `mutatesHandoff` / `permitsReapply` / `executesApply` | literal `false` |

---

## Continuity checks

| Check | Reason on failure |
| --- | --- |
| Runtime session not a bounded object | `session_required` |
| Completion handoff not a bounded object | `handoff_required` |
| Plan missing / malformed / authority flag not false | `plan_invalid` |
| `preparesRuntimeApply` not true | `plan_prepares_runtime_apply_required` |
| `preparesHandoffApply` not true | `plan_prepares_handoff_apply_required` |
| Unsupported acknowledgment / eligibility status | `unsupported_plan_status` |
| Inconsistent accepted-fresh metadata | `inconsistent_plan_state` |
| `platformSessionId` null / invalid | `platform_session_id_required` |
| Runtime/handoff `runtimeSessionId` mismatch | `runtime_session_id_mismatch` |
| Runtime/handoff `gameId` mismatch | `session_game_mismatch` |
| Runtime/handoff `playerId` mismatch | `session_owner_mismatch` |
| Plan/runtime identity mismatch | `plan_identity_mismatch` |
| Plan/runtime `platformSessionId` mismatch | `platform_session_id_mismatch` |
| `completionHandoff.applied !== false` | `handoff_already_applied` |
| Rejected plan | `ineligible_rejected` |
| Idempotent-replay plan | `ineligible_idempotent_replay` |
| Non-terminal lifecycle | `lifecycle_incompatible` |
| Terminal/finalization inconsistency | `lifecycle_finalization_inconsistent` |

---

## Non-inferences

A `ready` guard must not imply:

- apply execution is authorized
- apply occurred
- Hub synchronization completed
- duplicate apply is globally impossible
- progress or achievements should be mutated locally
- rewards or economy should be granted
- Runtime lifecycle may transition automatically
- reapply / replay is permitted

`preparesRuntimeApply` / `preparesHandoffApply` remain planning metadata only.

---

## Architecture constraints

- Precondition/guard-only helper — no apply execution
- No lifecycle transition
- No handoff adaptation to `applied: true`
- No reapply / replay authority
- No callback, executor, RPC client, mutation function, writable object, or
  authority token in the returned guard
- SQL remains sole submit decision and mutation authority
- Existing trusted local-apply plan is the only trusted plan input
- Do not invent a new lifecycle state machine
- `GAMES_HUB_RUNTIME_AUTHORITY` remains closed

---

## Out of scope

No migrations, no apply of `20260846` / `20260847`, no remote RPC
execution, no Start or Submit call, no `handoff.applied=true`, no local apply
consumer, no runtime lifecycle activation, no UI, no gameplay, no progress /
achievement mutation, no rewards / wallet / points / economy, no multiplayer /
matchmaking, no Ads / Store / Learning / World, no merge to `alpha-0.2`.
