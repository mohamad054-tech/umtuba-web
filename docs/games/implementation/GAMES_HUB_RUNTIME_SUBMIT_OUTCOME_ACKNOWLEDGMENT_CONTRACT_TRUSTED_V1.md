# UM Games — Hub Runtime Submit Outcome Acknowledgment Contract Trusted V1

Status: **code-ready**

Depends on:

- Hub / Runtime Foundation V1 (`GamesRuntimeSessionContract`,
  `GamesRuntimeCompletionHandoff`)
- Hub Runtime Submit Outcome Adaptation Trusted V1
  (`adaptGamesRuntimeSubmitOutcomeTrusted` /
  `GamesRuntimeSubmitOutcomeObservation`)

---

## Purpose

Provide a **pure fail-closed acknowledgment classifier** for an
already-trusted Runtime submit outcome observation after strict continuity
checks.

This slice is **classification only**:

- no mutation of runtime session or completion handoff
- no lifecycle transition
- no `handoff.applied = true`
- no reapply permission
- no Supabase / Submit / Start / RPC
- no progress, achievement, reward, economy, or gameplay authority
- no Hub synchronization

SQL remains the sole submit decision and mutation authority. The existing
outcome observation is the only decision metadata source. Hub Runtime
authority remains closed.

---

## Helper

```
evaluateGamesRuntimeSubmitOutcomeAcknowledgmentTrusted(
  runtimeSession,
  completionHandoff,
  outcomeObservation
)
  → validate bounded objects
  → structurally validate trusted observation (no Platform re-parse)
  → require non-null valid platformSessionId
  → continuity:
       runtime ↔ handoff (runtimeSessionId / gameId / playerId)
       observation ↔ runtime (runtimeSessionId / gameId / playerId /
         platformSessionId)
  → classify acknowledgmentStatus
  → freeze acknowledgment (applied / mutates* / permitsReapply: false)
```

### Signature

```
evaluateGamesRuntimeSubmitOutcomeAcknowledgmentTrusted(
  runtimeSession: unknown,
  completionHandoff: unknown,
  outcomeObservation: unknown
) → GamesValidationResult<GamesRuntimeSubmitOutcomeAcknowledgment>
```

### Acknowledgment return type

```
GamesRuntimeSubmitOutcomeAcknowledgment = Readonly<{
  runtimeSessionId: string;
  gameId: string;
  playerId: string;
  platformSessionId: string;
  resultId: string;
  acknowledgmentStatus:
    | "rejected"
    | "accepted_fresh"
    | "accepted_idempotent_replay";
  decisionStatus: GamesResultDecisionStatus;
  rejectionReason: string | null;
  recordedScore: number | null;
  idempotentReplay: boolean;
  applied: false;
  mutatesRuntime: false;
  mutatesHandoff: false;
  permitsReapply: false;
}>
```

Hub Runtime camelCase only. Authority flags are always literal `false`.

---

## Classification rules

| Observation metadata | `acknowledgmentStatus` |
| --- | --- |
| `decisionStatus === rejected` | `rejected` |
| `accepted` AND `idempotentReplay === false` | `accepted_fresh` |
| `accepted` AND `idempotentReplay === true` | `accepted_idempotent_replay` |

No additional decision states are invented.

---

## Continuity checks

| Check | Reason on failure |
| --- | --- |
| Runtime session not a bounded object | `session_required` |
| Completion handoff not a bounded object | `handoff_required` |
| Observation missing / malformed | `observation_invalid` |
| Unsupported `decisionStatus` | `unsupported_decision_status` |
| Non-boolean `idempotentReplay` | `invalid_idempotent_replay` |
| `platformSessionId` null / invalid | `platform_session_id_required` |
| Runtime/handoff `runtimeSessionId` mismatch | `runtime_session_id_mismatch` |
| Runtime/handoff `gameId` mismatch | `session_game_mismatch` |
| Runtime/handoff `playerId` mismatch | `session_owner_mismatch` |
| Observation/runtime identity mismatch | `observation_identity_mismatch` |
| Observation/runtime `platformSessionId` mismatch | `platform_session_id_mismatch` |

---

## Non-inferences

| Acknowledgment | Must not imply |
| --- | --- |
| `accepted_fresh` | local Runtime apply success, Hub sync, progress/achievement state, reward/economy entitlement, lifecycle transition permission |
| `accepted_idempotent_replay` | reapply permission, new mutation, progress/achievements changed again |
| `rejected` | automatic Runtime retry, claim modification, new submit permission |

---

## Architecture constraints

- Classification-only helper — no apply / mutation authority
- No lifecycle transition
- No handoff adaptation to `applied: true`
- No reapply / replay authority
- SQL remains sole submit decision and mutation authority
- Existing outcome observation is the only decision metadata source
- Do not re-parse Platform snake_case submit responses here
- `GAMES_HUB_RUNTIME_AUTHORITY` remains closed

---

## Out of scope

No migrations, no apply of `20260846` / `20260847`, no remote RPC
execution, no Start or Submit call, no `handoff.applied=true`, no runtime
lifecycle activation, no UI, no gameplay, no progress / achievement
mutation, no rewards / wallet / points / economy, no multiplayer /
matchmaking, no Ads / Store / Learning / World, no merge to `alpha-0.2`.
