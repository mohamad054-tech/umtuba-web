# UM Games — Hub Runtime Submit Outcome Local Apply Execution Authorization Contract Trusted V1

Status: **code-ready**

Depends on:

- Hub / Runtime Foundation V1 (`GamesRuntimeSessionContract`,
  `GamesRuntimeCompletionHandoff`)
- Hub Runtime Submit Outcome Local Apply Plan Contract Trusted V1
  (`GamesRuntimeSubmitOutcomeLocalApplyPlan`)
- Hub Runtime Submit Outcome Local Apply Execution Precondition Guard Contract
  Trusted V1
  (`evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted` /
  `GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionGuard`)

---

## Purpose

Provide a **pure fail-closed, token-less authorization classifier** over an
already-trusted local-apply plan and ready precondition guard after strict
continuity checks against the current runtime session and completion handoff.

This slice is **authorization classification only**:

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

An `authorized` result is **not** an executor and **not** a capability token.
It must not be inferred as apply execution permission without another bounded
consumer. SQL remains the sole submit decision and mutation authority. Hub
Runtime authority remains closed.

---

## Helper

```
evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorizationTrusted(
  runtimeSession,
  completionHandoff,
  trustedLocalApplyPlan,
  trustedPreconditionGuard
)
  → structurally validate session / handoff / plan / guard fields
  → require non-null valid platformSessionId
  → continuity:
       runtime ↔ handoff (runtimeSessionId / gameId / playerId)
       plan ↔ runtime (runtimeSessionId / gameId / playerId /
         platformSessionId)
       guard ↔ runtime (runtimeSessionId / gameId / playerId /
         platformSessionId)
       plan.resultId === guard.resultId
  → require handoff.applied === false (else fail closed)
  → require exact accepted-fresh trusted-plan consistency
  → require exact ready trusted-guard consistency
  → require all plan / guard authority / execution flags literal false
  → freeze authorization view (applied / mutates* / permitsReapply /
      executesApply / grantsCapability / providesAuthorityToken: false)
```

### Signature

```
evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorizationTrusted(
  runtimeSession: unknown,
  completionHandoff: unknown,
  trustedLocalApplyPlan: unknown,
  trustedPreconditionGuard: unknown
) → GamesValidationResult<
  GamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorization
>
```

### Authorization return type

```
GamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorization = Readonly<{
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
  applied: false;
  mutatesRuntime: false;
  mutatesHandoff: false;
  permitsReapply: false;
  executesApply: false;
  grantsCapability: false;
  providesAuthorityToken: false;
}>
```

Hub Runtime camelCase only. Authority / execution / capability flags are
always literal `false`.

---

## Fail-closed vs bounded denied

| Outcome | When |
| --- | --- |
| Fail closed (`ok: false`) | malformed / inconsistent inputs; already-applied handoff; blocked guard; rejected / idempotent-replay / inconsistent plan; non-false authority flags; prepares\* not true; identity / platformSessionId / resultId mismatch |
| Bounded denied (`ok: true`, `authorizationStatus: "denied"`) | reserved only for explicit supported non-authorized states; **this V1 slice has no successful `denied` path** — every non-authorized case fails closed |
| Authorized (`ok: true`, `authorizationStatus: "authorized"`) | ready guard (`preconditionStatus: "ready"`, `blockedReason: null`), unapplied handoff, exact accepted-fresh plan, continuity OK |

### Distinction

- Prefer fail-closed for malformed, inconsistent, already-applied, blocked,
  replay, ineligible, or non-false-authority inputs.
- Do not use successful `denied` as a catch-all for validation failures.
- `authorized` classifies continuity + consistency only; it does not grant
  execution capability or imply apply may run without another bounded consumer.

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

## Continuity checks

| Check | Reason on failure |
| --- | --- |
| Runtime session not a bounded object | `session_required` |
| Completion handoff not a bounded object | `handoff_required` |
| Plan missing / malformed / authority flag not false | `plan_invalid` |
| Guard missing / malformed / authority flag not false | `guard_invalid` |
| `preparesRuntimeApply` not true (plan) | `plan_prepares_runtime_apply_required` |
| `preparesHandoffApply` not true (plan) | `plan_prepares_handoff_apply_required` |
| `preparesRuntimeApply` not true (guard) | `guard_prepares_runtime_apply_required` |
| `preparesHandoffApply` not true (guard) | `guard_prepares_handoff_apply_required` |
| Unsupported acknowledgment / eligibility status | `unsupported_plan_status` |
| Unsupported precondition status | `unsupported_guard_status` |
| Inconsistent accepted-fresh plan metadata | `inconsistent_plan_state` |
| Inconsistent ready guard metadata | `inconsistent_guard_state` |
| Blocked guard | `guard_blocked` |
| `platformSessionId` null / invalid | `platform_session_id_required` |
| Runtime/handoff `runtimeSessionId` mismatch | `runtime_session_id_mismatch` |
| Runtime/handoff `gameId` mismatch | `session_game_mismatch` |
| Runtime/handoff `playerId` mismatch | `session_owner_mismatch` |
| Plan/runtime identity mismatch | `plan_identity_mismatch` |
| Guard/runtime identity mismatch | `guard_identity_mismatch` |
| Plan or guard `platformSessionId` mismatch | `platform_session_id_mismatch` |
| Plan/guard `resultId` mismatch | `plan_guard_result_id_mismatch` |
| `completionHandoff.applied !== false` | `handoff_already_applied` |
| Rejected plan | `ineligible_rejected` |
| Idempotent-replay plan | `ineligible_idempotent_replay` |

---

## Non-inferences

An `authorized` classification must not imply:

- apply execution is permitted without another bounded consumer
- apply occurred
- duplicate apply is impossible globally
- Hub synchronization completed
- progress or achievements should be mutated locally
- rewards or economy should be granted
- Runtime lifecycle may transition automatically
- reapply / replay is permitted
- a capability or authority token was issued

`grantsCapability` / `providesAuthorityToken` remain literal `false`.

---

## Architecture constraints

- Authorization-classification-only helper — no apply execution
- Token-less — no capability / authority token in the return value
- No lifecycle transition
- No handoff adaptation to `applied: true`
- No reapply / replay authority
- No callback, executor, RPC client, mutation function, writable object,
  capability token, or authority token in the returned view
- SQL remains sole submit decision and mutation authority
- Existing trusted local-apply plan + ready precondition guard are the only
  trusted classification inputs
- `GAMES_HUB_RUNTIME_AUTHORITY` remains closed

---

## Out of scope

No migrations, no apply of `20260846` / `20260847`, no remote RPC
execution, no Start or Submit call, no `handoff.applied=true`, no local apply
consumer / executor, no dry-run side-effect catalog, no runtime lifecycle
activation, no Hub sync, no UI, no gameplay, no progress / achievement
mutation, no rewards / wallet / points / economy, no multiplayer /
matchmaking, no Ads / Store / Learning / World, no merge to `alpha-0.2`.
