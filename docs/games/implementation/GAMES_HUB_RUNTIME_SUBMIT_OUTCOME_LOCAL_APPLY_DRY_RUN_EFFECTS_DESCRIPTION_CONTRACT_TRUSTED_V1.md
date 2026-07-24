# UM Games — Hub Runtime Submit Outcome Local Apply Dry-Run Effects Description Contract Trusted V1

Status: **code-ready**

Depends on:

- Hub / Runtime Foundation V1 (`GamesRuntimeSessionContract`,
  `GamesRuntimeCompletionHandoff`)
- Hub Runtime Submit Outcome Local Apply Plan Contract Trusted V1
  (`GamesRuntimeSubmitOutcomeLocalApplyPlan`)
- Hub Runtime Submit Outcome Local Apply Execution Precondition Guard Contract
  Trusted V1
  (`GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionGuard`)
- Hub Runtime Submit Outcome Local Apply Execution Authorization Contract
  Trusted V1
  (`evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorizationTrusted` /
  `GamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorization`)

---

## Purpose

Provide a **pure fail-closed dry-run / effects-description contract** over an
already-trusted local-apply plan, ready precondition guard, and token-less
execution authorization after strict continuity checks against the current
runtime session and completion handoff.

This slice is **description metadata only**:

- no apply execution
- no mutation of runtime session or completion handoff
- no lifecycle transition
- no `handoff.applied = true`
- no reapply permission
- no capability token, authority token, nonce, secret, callback, executor,
  RPC client, mutation function, or writable Runtime / handoff reference
- no Supabase / Submit / Start / RPC
- no progress, achievement, reward, economy, or gameplay authority
- no Hub synchronization

A successful dry-run description is **not** an executor and **not** execution
permission. `authorized` remains classification only. SQL remains the sole
submit decision and mutation authority. Hub Runtime authority remains closed.

---

## Helper

```
describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
  runtimeSession,
  completionHandoff,
  trustedLocalApplyPlan,
  trustedPreconditionGuard,
  trustedExecutionAuthorization
)
  → structurally validate session / handoff / plan / guard / authorization
  → require non-null valid platformSessionId
  → continuity:
       runtime ↔ handoff (runtimeSessionId / gameId / playerId)
       plan ↔ runtime (runtimeSessionId / gameId / playerId /
         platformSessionId)
       guard ↔ runtime (runtimeSessionId / gameId / playerId /
         platformSessionId)
       authorization ↔ runtime (runtimeSessionId / gameId / playerId /
         platformSessionId)
       plan.resultId === guard.resultId
       plan.resultId === authorization.resultId
  → require handoff.applied === false (else fail closed)
  → require exact accepted-fresh trusted-plan consistency
  → require exact ready trusted-guard consistency
  → require exact authorized trusted-authorization consistency
  → require all plan / guard / authorization authority / execution /
      capability flags literal false
  → freeze dry-run effects-description view
       (describes* / intended* metadata;
        dryRun: true;
        applied / mutates* / permitsReapply / executesApply /
        grantsCapability / providesAuthorityToken: false)
```

### Signature

```
describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
  runtimeSession: unknown,
  completionHandoff: unknown,
  trustedLocalApplyPlan: unknown,
  trustedPreconditionGuard: unknown,
  trustedExecutionAuthorization: unknown
) → GamesValidationResult<
  GamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsDescription
>
```

### Dry-run return type

```
GamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsDescription = Readonly<{
  runtimeSessionId: string;
  gameId: string;
  playerId: string;
  platformSessionId: string;
  resultId: string;
  authorizationStatus: "authorized" | "denied";
  preconditionStatus: "ready" | "blocked";
  eligibilityStatus: GamesRuntimeSubmitOutcomeApplyEligibilityStatus;
  acknowledgmentStatus: GamesRuntimeSubmitOutcomeAcknowledgmentStatus;
  decisionStatus: GamesResultDecisionStatus;
  idempotentReplay: boolean;
  describesRuntimeApply: true;
  describesHandoffApply: true;
  intendedRuntimeEffect: "mark_runtime_completion_locally";
  intendedHandoffEffect: "mark_completion_handoff_applied_locally";
  dryRun: true;
  applied: false;
  mutatesRuntime: false;
  mutatesHandoff: false;
  permitsReapply: false;
  executesApply: false;
  grantsCapability: false;
  providesAuthorityToken: false;
}>
```

Hub Runtime camelCase only. `describes*` / `intended*` fields are description
metadata only. `dryRun` is always literal `true`. Authority / execution /
capability flags are always literal `false`.

---

## Exact intended-effect descriptions

| Field | Value | Meaning |
| --- | --- | --- |
| `describesRuntimeApply` | `true` | Describes a future local Runtime apply intent only |
| `describesHandoffApply` | `true` | Describes a future local handoff apply intent only |
| `intendedRuntimeEffect` | `mark_runtime_completion_locally` | Future local Runtime completion-mark description |
| `intendedHandoffEffect` | `mark_completion_handoff_applied_locally` | Future local handoff applied-mark description |

These fields do **not** execute, authorize, or imply mutation.

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

## Exact trusted-guard consistency

| Field | Required |
| --- | --- |
| `preconditionStatus` | `"ready"` |
| `blockedReason` | `null` |
| `preparesRuntimeApply` | `true` |
| `preparesHandoffApply` | `true` |
| `applied` / `mutatesRuntime` / `mutatesHandoff` / `permitsReapply` / `executesApply` | literal `false` |

---

## Exact trusted-authorization consistency

| Field | Required |
| --- | --- |
| `authorizationStatus` | `"authorized"` |
| mirrored plan/guard accepted-fresh / ready metadata | exact match |
| `applied` / `mutatesRuntime` / `mutatesHandoff` / `permitsReapply` / `executesApply` / `grantsCapability` / `providesAuthorityToken` | literal `false` |

---

## Continuity and fail-closed checks

| Check | Reason on failure |
| --- | --- |
| Runtime session not a bounded object | `session_required` |
| Completion handoff not a bounded object | `handoff_required` |
| Plan missing / malformed / authority flag not false | `plan_invalid` |
| Guard missing / malformed / authority flag not false | `guard_invalid` |
| Authorization missing / malformed / authority or token flag not false | `authorization_invalid` |
| `preparesRuntimeApply` not true (plan) | `plan_prepares_runtime_apply_required` |
| `preparesHandoffApply` not true (plan) | `plan_prepares_handoff_apply_required` |
| `preparesRuntimeApply` not true (guard) | `guard_prepares_runtime_apply_required` |
| `preparesHandoffApply` not true (guard) | `guard_prepares_handoff_apply_required` |
| Unsupported acknowledgment / eligibility status | `unsupported_plan_status` |
| Unsupported precondition status | `unsupported_guard_status` |
| Unsupported authorization status | `unsupported_authorization_status` |
| Inconsistent accepted-fresh plan metadata | `inconsistent_plan_state` |
| Inconsistent ready guard metadata | `inconsistent_guard_state` |
| Inconsistent authorized authorization metadata | `inconsistent_authorization_state` |
| Blocked guard | `guard_blocked` |
| Denied authorization | `authorization_denied` |
| `platformSessionId` null / invalid | `platform_session_id_required` |
| Runtime/handoff `runtimeSessionId` mismatch | `runtime_session_id_mismatch` |
| Runtime/handoff `gameId` mismatch | `session_game_mismatch` |
| Runtime/handoff `playerId` mismatch | `session_owner_mismatch` |
| Plan/runtime identity mismatch | `plan_identity_mismatch` |
| Guard/runtime identity mismatch | `guard_identity_mismatch` |
| Authorization/runtime identity mismatch | `authorization_identity_mismatch` |
| Plan, guard, or authorization `platformSessionId` mismatch | `platform_session_id_mismatch` |
| Plan/guard `resultId` mismatch | `plan_guard_result_id_mismatch` |
| Plan/authorization `resultId` mismatch | `plan_authorization_result_id_mismatch` |
| `completionHandoff.applied !== false` | `handoff_already_applied` |
| Rejected plan | `ineligible_rejected` |
| Idempotent-replay plan | `ineligible_idempotent_replay` |

---

## Non-inferences

A successful dry-run description must not imply:

- apply execution is permitted
- apply occurred
- duplicate apply is impossible globally
- Hub synchronization completed
- progress or achievements should be mutated locally
- rewards or economy should be granted
- Runtime lifecycle may transition automatically
- reapply / replay is permitted
- a capability or authority token was issued

`authorized` remains classification only. `dryRun` remains literal `true`.
`grantsCapability` / `providesAuthorityToken` remain literal `false`.

---

## Architecture constraints

- Dry-run effects-description-only helper — no apply execution
- No mutation capability
- No lifecycle transition
- No handoff adaptation to `applied: true`
- No reapply / replay authority
- No callback, executor, RPC client, mutation function, writable object,
  capability token, or authority token in the returned view
- SQL remains sole submit decision and mutation authority
- Existing trusted local-apply plan + ready precondition guard + token-less
  authorized execution authorization are the only trusted classification
  inputs
- `GAMES_HUB_RUNTIME_AUTHORITY` remains closed

---

## Out of scope

No migrations, no apply of `20260846` / `20260847`, no remote RPC
execution, no Start or Submit call, no `handoff.applied=true`, no local apply
consumer / executor, no runtime lifecycle activation, no Hub sync, no UI, no
gameplay, no progress / achievement mutation, no rewards / wallet / points /
economy, no multiplayer / matchmaking, no Ads / Store / Learning / World, no
merge to `alpha-0.2`.
