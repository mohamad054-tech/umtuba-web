# UM Games — Hub Runtime Submit Outcome Local Apply Plan Contract Trusted V1

Status: **code-ready**

Depends on:

- Hub / Runtime Foundation V1 (`GamesRuntimeSessionContract`,
  `GamesRuntimeCompletionHandoff`)
- Hub Runtime Submit Outcome Apply Eligibility Contract Trusted V1
  (`evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted` /
  `GamesRuntimeSubmitOutcomeApplyEligibility`)

---

## Purpose

Provide a **pure fail-closed local-apply plan/intent builder** that turns an
already-trusted apply-eligibility view into a bounded future-intent plan after
strict continuity checks.

This slice is **plan/intent only**:

- no apply execution
- no mutation of runtime session or completion handoff
- no lifecycle transition
- no `handoff.applied = true`
- no reapply permission
- no executor, callback, RPC client, or authority token in the plan
- no Supabase / Submit / Start / RPC
- no progress, achievement, reward, economy, or gameplay authority
- no Hub synchronization

`preparesRuntimeApply` / `preparesHandoffApply` are **planning metadata only**.
SQL remains the sole submit decision and mutation authority. The existing
apply-eligibility view is the only trusted classification input. Hub Runtime
authority remains closed.

---

## Helper

```
buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
  runtimeSession,
  completionHandoff,
  trustedApplyEligibility
)
  → validate bounded objects
  → structurally validate trusted eligibility (no Platform re-parse)
  → require non-null valid platformSessionId
  → continuity:
       runtime ↔ handoff (runtimeSessionId / gameId / playerId)
       eligibility ↔ runtime (runtimeSessionId / gameId / playerId /
         platformSessionId)
  → accept only eligible_accepted_fresh with exact accepted-fresh consistency
  → reject ineligible_rejected / ineligible_idempotent_replay fail-closed
  → freeze plan (prepares*: true; applied / mutates* / permitsReapply /
      executesApply: false)
```

### Signature

```
buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
  runtimeSession: unknown,
  completionHandoff: unknown,
  trustedApplyEligibility: unknown
) → GamesValidationResult<GamesRuntimeSubmitOutcomeLocalApplyPlan>
```

### Plan return type

```
GamesRuntimeSubmitOutcomeLocalApplyPlan = Readonly<{
  runtimeSessionId: string;
  gameId: string;
  playerId: string;
  platformSessionId: string;
  resultId: string;
  acknowledgmentStatus:
    | "rejected"
    | "accepted_fresh"
    | "accepted_idempotent_replay";
  eligibilityStatus:
    | "ineligible_rejected"
    | "eligible_accepted_fresh"
    | "ineligible_idempotent_replay";
  decisionStatus: GamesResultDecisionStatus;
  idempotentReplay: boolean;
  preparesRuntimeApply: true;
  preparesHandoffApply: true;
  applied: false;
  mutatesRuntime: false;
  mutatesHandoff: false;
  permitsReapply: false;
  executesApply: false;
}>
```

Hub Runtime camelCase only. A successful plan always carries
`eligibilityStatus: "eligible_accepted_fresh"`. Authority / execution flags
are always literal `false`.

---

## Acceptance rules

| Input | Result |
| --- | --- |
| `eligibilityStatus === "eligible_accepted_fresh"` with exact accepted-fresh consistency | frozen plan |
| `eligibilityStatus === "ineligible_rejected"` | fail closed (`ineligible_rejected`) |
| `eligibilityStatus === "ineligible_idempotent_replay"` | fail closed (`ineligible_idempotent_replay`) |
| malformed / unsupported eligibility status | fail closed |

### Exact consistency for accepted fresh

| Field | Required |
| --- | --- |
| `eligibilityStatus` | `"eligible_accepted_fresh"` |
| `acknowledgmentStatus` | `"accepted_fresh"` |
| `decisionStatus` | `"accepted"` |
| `idempotentReplay` | `false` |

Input authority flags on the eligibility view must remain literal `false`
(`applied` / `mutatesRuntime` / `mutatesHandoff` / `permitsReapply`).

---

## Continuity checks

| Check | Reason on failure |
| --- | --- |
| Runtime session not a bounded object | `session_required` |
| Completion handoff not a bounded object | `handoff_required` |
| Eligibility missing / malformed / authority flag not false | `eligibility_invalid` |
| Unsupported acknowledgment / eligibility status | `unsupported_eligibility_status` |
| Inconsistent accepted-fresh metadata | `inconsistent_eligibility_state` |
| `platformSessionId` null / invalid | `platform_session_id_required` |
| Runtime/handoff `runtimeSessionId` mismatch | `runtime_session_id_mismatch` |
| Runtime/handoff `gameId` mismatch | `session_game_mismatch` |
| Runtime/handoff `playerId` mismatch | `session_owner_mismatch` |
| Eligibility/runtime identity mismatch | `eligibility_identity_mismatch` |
| Eligibility/runtime `platformSessionId` mismatch | `platform_session_id_mismatch` |
| Rejected eligibility | `ineligible_rejected` |
| Idempotent-replay eligibility | `ineligible_idempotent_replay` |

---

## Non-inferences

A valid plan must not imply:

- apply occurred
- apply may run without additional authority
- Hub synchronization completed
- progress or achievements should be mutated locally
- rewards or economy should be granted
- Runtime lifecycle may transition automatically
- reapply / replay is permitted

`preparesRuntimeApply` / `preparesHandoffApply` describe future intent only.

---

## Architecture constraints

- Plan/intent-only helper — no apply execution
- No lifecycle transition
- No handoff adaptation to `applied: true`
- No reapply / replay authority
- No callback, executor, RPC client, mutation function, writable object, or
  authority token in the returned plan
- SQL remains sole submit decision and mutation authority
- Existing apply-eligibility view is the only trusted classification input
- Do not re-parse Platform snake_case submit responses here
- `GAMES_HUB_RUNTIME_AUTHORITY` remains closed

---

## Out of scope

No migrations, no apply of `20260846` / `20260847`, no remote RPC
execution, no Start or Submit call, no `handoff.applied=true`, no local apply
consumer, no runtime lifecycle activation, no UI, no gameplay, no progress /
achievement mutation, no rewards / wallet / points / economy, no multiplayer /
matchmaking, no Ads / Store / Learning / World, no merge to `alpha-0.2`.
