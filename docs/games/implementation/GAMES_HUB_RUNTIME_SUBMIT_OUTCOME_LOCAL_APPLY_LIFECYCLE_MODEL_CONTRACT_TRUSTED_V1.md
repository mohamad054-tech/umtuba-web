# UM Games — Hub Runtime Submit Outcome Local Apply Lifecycle Model Contract Trusted V1

Status: **code-ready**

Depends on:

- Hub / Runtime Foundation V1 (`GamesRuntimeSessionContract`,
  `GamesRuntimeCompletionHandoff`)
- Hub Runtime Submit Outcome Local Apply Mutation Input Contract Trusted V1
  (`GamesRuntimeSubmitOutcomeLocalApplyMutationInputTrusted`)

---

## Purpose

Provide a **pure fail-closed lifecycle-model description** over an
already-trusted local-apply mutation-input envelope after strict continuity
checks against the current runtime session and completion handoff.

This slice is **lifecycle-model description metadata only**:

- no apply execution
- no mutation consumer / executor
- no mutation of runtime session or completion handoff
- no lifecycle transition
- no `handoff.applied = true`
- no persistence logic
- no rollback implementation
- no reapply permission
- no capability token, authority token, nonce, secret, callback, executor,
  RPC client, mutation function, or writable Runtime / handoff reference
- no Supabase / Submit / Start / RPC
- no progress, achievement, reward, economy, or gameplay authority
- no Hub synchronization

A successful lifecycle-model result is **not** an executor and **not** apply
execution authorization. `authorized` remains classification only.
`mutationInputPrepared` / `dryRunVerified` / `lifecycleModelOnly` /
`allowedFutureTransitions` / `duplicatePreventionRule` / `atomicityPairing` /
`failureSemantics` / `persistenceAuthority` are metadata only.
`rollbackSupported` is always literal `false`. SQL remains the sole submit
decision and mutation authority. Hub Runtime authority remains closed.

---

## Helper

```
describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
  runtimeSession,
  completionHandoff,
  trustedMutationInput
)
  → structurally validate session / handoff / mutation input
  → require non-null valid platformSessionId
  → continuity:
       runtime ↔ handoff (runtimeSessionId / gameId / playerId)
       mutation input ↔ runtime (runtimeSessionId / gameId / playerId /
         platformSessionId)
  → require handoff.applied === false (else fail closed)
  → require exact prepared trusted mutation-input consistency
       (mutationInputPrepared / dryRunVerified /
        accepted-fresh / ready / authorized / intended*)
  → require all mutation-input authority / execution / token flags
       literal false
  → freeze lifecycle-model view
       (lifecycleModelOnly metadata;
        allowedFutureTransitions / duplicatePreventionRule /
        atomicityPairing / failureSemantics / persistenceAuthority;
        rollbackSupported: false;
        applied / mutates* / permitsReapply / executesApply /
        grantsCapability / providesAuthorityToken: false)
```

### Signature

```
describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
  runtimeSession: unknown,
  completionHandoff: unknown,
  trustedMutationInput: unknown
) → GamesValidationResult<
  GamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted
>
```

### Lifecycle-model return type

```
GamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted = Readonly<{
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
  intendedRuntimeEffect: "mark_runtime_completion_locally";
  intendedHandoffEffect: "mark_completion_handoff_applied_locally";
  mutationInputPrepared: true;
  dryRunVerified: true;
  allowedFutureTransitions: readonly ["atomic_paired_local_apply_marks"];
  duplicatePreventionRule: "reject_when_handoff_already_applied";
  atomicityPairing: "runtime_and_handoff_must_apply_together";
  failureSemantics: "fail_closed_no_partial_apply";
  rollbackSupported: false;
  persistenceAuthority: "none";
  lifecycleModelOnly: true;
  applied: false;
  mutatesRuntime: false;
  mutatesHandoff: false;
  permitsReapply: false;
  executesApply: false;
  grantsCapability: false;
  providesAuthorityToken: false;
}>
```

Hub Runtime camelCase only. Lifecycle-model fields are metadata only.
Authority / execution / capability flags are always literal `false`.
`rollbackSupported` is always literal `false`.

---

## Exact lifecycle semantics (description only)

| Field | Value | Meaning |
| --- | --- | --- |
| `allowedFutureTransitions` | `["atomic_paired_local_apply_marks"]` | Only described future path is the atomic paired local-apply marks |
| `duplicatePreventionRule` | `"reject_when_handoff_already_applied"` | Future consumer must reject when handoff already applied |
| `atomicityPairing` | `"runtime_and_handoff_must_apply_together"` | Runtime + handoff marks must be paired |
| `failureSemantics` | `"fail_closed_no_partial_apply"` | Failure must not leave a partial local apply |
| `rollbackSupported` | `false` | No rollback implementation in this model |
| `persistenceAuthority` | `"none"` | Persistence authority remains none / local-future |
| `lifecycleModelOnly` | `true` | This view is lifecycle-model metadata only |

These fields do **not** execute, authorize, persist, roll back, or transition
lifecycle.

---

## Exact trusted mutation-input consistency

| Field | Required |
| --- | --- |
| `mutationInputPrepared` | `true` |
| `dryRunVerified` | `true` |
| `authorizationStatus` | `"authorized"` |
| `preconditionStatus` | `"ready"` |
| `eligibilityStatus` | `"eligible_accepted_fresh"` |
| `acknowledgmentStatus` | `"accepted_fresh"` |
| `decisionStatus` | `"accepted"` |
| `idempotentReplay` | `false` |
| `intendedRuntimeEffect` | `"mark_runtime_completion_locally"` |
| `intendedHandoffEffect` | `"mark_completion_handoff_applied_locally"` |
| `applied` / `mutatesRuntime` / `mutatesHandoff` / `permitsReapply` / `executesApply` / `grantsCapability` / `providesAuthorityToken` | literal `false` |

---

## Continuity and fail-closed checks

| Check | Reason on failure |
| --- | --- |
| Runtime session not a bounded object | `session_required` |
| Completion handoff not a bounded object | `handoff_required` |
| Mutation input missing / malformed / authority flag not false | `mutation_input_invalid` |
| `mutationInputPrepared` not true | `mutation_input_prepared_required` |
| `dryRunVerified` not true | `dry_run_verified_required` |
| Incorrect intended Runtime effect | `incorrect_intended_runtime_effect` |
| Incorrect intended handoff effect | `incorrect_intended_handoff_effect` |
| Unsupported acknowledgment / eligibility / precondition / authorization status | `unsupported_mutation_input_status` |
| Inconsistent prepared mutation-input metadata | `inconsistent_mutation_input_state` |
| Blocked precondition on mutation input | `mutation_input_not_ready` |
| Denied authorization on mutation input | `mutation_input_not_authorized` |
| `platformSessionId` null / invalid | `platform_session_id_required` |
| Runtime/handoff `runtimeSessionId` mismatch | `runtime_session_id_mismatch` |
| Runtime/handoff `gameId` mismatch | `session_game_mismatch` |
| Runtime/handoff `playerId` mismatch | `session_owner_mismatch` |
| Mutation-input/runtime identity mismatch | `mutation_input_identity_mismatch` |
| Mutation-input `platformSessionId` mismatch | `platform_session_id_mismatch` |
| `completionHandoff.applied !== false` | `handoff_already_applied` |
| Rejected mutation input | `ineligible_rejected` |
| Idempotent-replay mutation input | `ineligible_idempotent_replay` |

---

## Non-inferences

A successful lifecycle-model result must not imply:

- apply execution is authorized
- apply occurred
- duplicate apply is impossible globally in an executor
- rollback behavior exists
- Hub synchronization completed
- progress or achievements should be mutated locally
- rewards or economy should be granted
- Runtime lifecycle may transition automatically
- reapply / replay is permitted
- a capability or authority token was issued
- persistence authority was granted

`authorized` remains classification only.
`mutationInputPrepared` / `dryRunVerified` / `lifecycleModelOnly` remain
metadata only. `grantsCapability` / `providesAuthorityToken` /
`rollbackSupported` remain literal `false`.

---

## Architecture constraints

- Lifecycle-model description-only helper — no apply execution
- No mutation consumer
- No lifecycle transition
- No handoff adaptation to `applied: true`
- No persistence logic
- No rollback implementation
- No reapply / replay authority
- No callback, executor, RPC client, mutation function, writable object,
  capability token, or authority token in the returned view
- SQL remains sole submit decision and mutation authority
- Existing trusted mutation input is the only trusted classification input
- `GAMES_HUB_RUNTIME_AUTHORITY` remains closed

---

## Out of scope

No migrations, no apply of `20260846` / `20260847`, no remote RPC
execution, no Start or Submit call, no `handoff.applied=true`, no local apply
consumer / executor, no persistence / rollback implementation, no runtime
lifecycle activation, no Hub sync, no UI, no gameplay, no progress /
achievement mutation, no rewards / wallet / points / economy, no multiplayer /
matchmaking, no Ads / Store / Learning / World, no merge to `alpha-0.2`.
