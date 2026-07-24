# UM Games — Hub Runtime Submit Outcome Local Apply Consumer Contract Trusted V1

Status: **code-ready**

Depends on:

- Hub / Runtime Foundation V1 (`GamesRuntimeSessionContract`,
  `GamesRuntimeCompletionHandoff`)
- Hub Runtime Submit Outcome Local Apply Lifecycle Model Contract Trusted V1
  (`GamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted`)

---

## Purpose

Provide a **pure fail-closed consumer contract** over an already-trusted
local-apply lifecycle-model view after strict continuity checks against the
current runtime session and completion handoff.

This slice is **consumer-contract bound metadata only**:

- no apply execution
- no consumer / executor implementation
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

A successful consumer-contract result is **not** an executor and **not** apply
execution permission. `authorized` remains classification only.
`mutationInputPrepared` / `dryRunVerified` / `lifecycleModelOnly` /
`consumerContractOnly` / `acceptedInputType` / `lifecycleModelRequired` /
`runtimeAndHandoffAtomicityRequired` / `duplicatePreventionRequired` /
`failureMustFailClosed` are metadata only. SQL remains the sole submit
decision and mutation authority. Hub Runtime authority remains closed.

### Explicit non-equivalence

- **Contract acceptance ≠ execution permission**
- **Contract acceptance ≠ mutation completion**
- **Contract acceptance ≠ persistence authority**
- **Contract acceptance ≠ Hub synchronization**

---

## Helper

```
bindGamesRuntimeSubmitOutcomeLocalApplyConsumerTrusted(
  runtimeSession,
  completionHandoff,
  trustedLifecycleModel
)
  → structurally validate session / handoff / lifecycle model
  → require non-null valid platformSessionId
  → continuity:
       runtime ↔ handoff (runtimeSessionId / gameId / playerId)
       lifecycle model ↔ runtime (runtimeSessionId / gameId / playerId /
         platformSessionId)
       lifecycle-model resultId identity (valid UUID)
  → require handoff.applied === false (else fail closed)
  → require exact trusted lifecycle-model consistency
       (lifecycleModelOnly / mutationInputPrepared / dryRunVerified /
        accepted-fresh / ready / authorized / intended* /
        lifecycle semantics metadata)
  → require all lifecycle-model authority / execution / token flags
       literal false
  → freeze consumer-contract view
       (consumerContractOnly metadata;
        acceptedInputType: "local_apply_mutation_input";
        lifecycleModelRequired /
        runtimeAndHandoffAtomicityRequired /
        duplicatePreventionRequired /
        failureMustFailClosed: true;
        applied / mutates* / permitsReapply / executesApply /
        grantsCapability / providesAuthorityToken: false)
```

### Signature

```
bindGamesRuntimeSubmitOutcomeLocalApplyConsumerTrusted(
  runtimeSession: unknown,
  completionHandoff: unknown,
  trustedLifecycleModel: unknown
) → GamesValidationResult<
  GamesRuntimeSubmitOutcomeLocalApplyConsumerContractTrusted
>
```

### Consumer-contract return type

```
GamesRuntimeSubmitOutcomeLocalApplyConsumerContractTrusted = Readonly<{
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
  mutationInputPrepared: true;
  dryRunVerified: true;
  lifecycleModelOnly: true;
  consumerContractOnly: true;
  acceptedInputType: "local_apply_mutation_input";
  lifecycleModelRequired: true;
  runtimeAndHandoffAtomicityRequired: true;
  duplicatePreventionRequired: true;
  failureMustFailClosed: true;
  applied: false;
  mutatesRuntime: false;
  mutatesHandoff: false;
  executesApply: false;
  permitsReapply: false;
  grantsCapability: false;
  providesAuthorityToken: false;
}>
```

Hub Runtime camelCase only. Consumer-contract fields are metadata only.
Authority / execution / capability flags are always literal `false`.

---

## Exact consumer-contract semantics (bound only)

| Field | Value | Meaning |
| --- | --- | --- |
| `consumerContractOnly` | `true` | This view is a consumer-contract bound only |
| `acceptedInputType` | `"local_apply_mutation_input"` | Future consumer may accept only this input type |
| `lifecycleModelRequired` | `true` | Trusted lifecycle model is required for binding |
| `runtimeAndHandoffAtomicityRequired` | `true` | Runtime + handoff marks must remain paired |
| `duplicatePreventionRequired` | `true` | Future consumer must prevent duplicate apply |
| `failureMustFailClosed` | `true` | Failure must not leave a partial local apply |

These fields do **not** execute, authorize, persist, roll back, or transition
lifecycle. They do **not** grant execution permission.

---

## Exact trusted lifecycle-model consistency

| Field | Required |
| --- | --- |
| `lifecycleModelOnly` | `true` |
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
| `allowedFutureTransitions` | `["atomic_paired_local_apply_marks"]` |
| `duplicatePreventionRule` | `"reject_when_handoff_already_applied"` |
| `atomicityPairing` | `"runtime_and_handoff_must_apply_together"` |
| `failureSemantics` | `"fail_closed_no_partial_apply"` |
| `rollbackSupported` | `false` |
| `persistenceAuthority` | `"none"` |
| `applied` / `mutatesRuntime` / `mutatesHandoff` / `permitsReapply` / `executesApply` / `grantsCapability` / `providesAuthorityToken` | literal `false` |

---

## Continuity and fail-closed checks

| Check | Reason on failure |
| --- | --- |
| Runtime session not a bounded object | `session_required` |
| Completion handoff not a bounded object | `handoff_required` |
| Lifecycle model missing / malformed / authority flag not false | `lifecycle_model_invalid` |
| `lifecycleModelOnly` not true | `lifecycle_model_only_required` |
| `mutationInputPrepared` not true | `mutation_input_prepared_required` |
| `dryRunVerified` not true | `dry_run_verified_required` |
| Incorrect intended Runtime effect | `incorrect_intended_runtime_effect` |
| Incorrect intended handoff effect | `incorrect_intended_handoff_effect` |
| Unsupported acknowledgment / eligibility / precondition / authorization status | `unsupported_lifecycle_model_status` |
| Inconsistent trusted lifecycle-model metadata | `inconsistent_lifecycle_model_state` |
| Blocked precondition on lifecycle model | `lifecycle_model_not_ready` |
| Denied authorization on lifecycle model | `lifecycle_model_not_authorized` |
| `platformSessionId` null / invalid | `platform_session_id_required` |
| Runtime/handoff `runtimeSessionId` mismatch | `runtime_session_id_mismatch` |
| Runtime/handoff `gameId` mismatch | `session_game_mismatch` |
| Runtime/handoff `playerId` mismatch | `session_owner_mismatch` |
| Lifecycle-model/runtime identity mismatch | `lifecycle_model_identity_mismatch` |
| Lifecycle-model `platformSessionId` mismatch | `platform_session_id_mismatch` |
| `completionHandoff.applied !== false` | `handoff_already_applied` |
| Rejected lifecycle model | `ineligible_rejected` |
| Idempotent-replay lifecycle model | `ineligible_idempotent_replay` |

---

## Non-inferences

A successful consumer-contract result must not imply:

- apply execution permission
- mutation completion
- persistence authority
- Hub synchronization completed
- apply occurred
- duplicate apply is impossible globally in an executor
- rollback behavior exists
- progress or achievements should be mutated locally
- rewards or economy should be granted
- Runtime lifecycle may transition automatically
- reapply / replay is permitted
- a capability or authority token was issued

`authorized` remains classification only.
`mutationInputPrepared` / `dryRunVerified` / `lifecycleModelOnly` /
`consumerContractOnly` remain metadata only.
`grantsCapability` / `providesAuthorityToken` remain literal `false`.

---

## Architecture constraints

- Consumer-contract binding-only helper — no apply execution
- No consumer implementation
- No lifecycle transition
- No handoff adaptation to `applied: true`
- No persistence logic
- No rollback implementation
- No reapply / replay authority
- No callback, executor, RPC client, mutation function, writable object,
  capability token, or authority token in the returned view
- SQL remains sole submit decision and mutation authority
- Existing trusted lifecycle model is the only trusted classification input
- `GAMES_HUB_RUNTIME_AUTHORITY` remains closed

---

## Out of scope

No migrations, no apply of `20260846` / `20260847`, no remote RPC
execution, no Start or Submit call, no `handoff.applied=true`, no local apply
consumer / executor implementation, no persistence / rollback
implementation, no runtime lifecycle activation, no Hub sync, no UI, no
gameplay, no progress / achievement mutation, no rewards / wallet / points /
economy, no multiplayer / matchmaking, no Ads / Store / Learning / World, no
merge to `alpha-0.2`.
