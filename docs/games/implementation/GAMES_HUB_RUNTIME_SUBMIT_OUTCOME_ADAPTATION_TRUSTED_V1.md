# UM Games — Hub Runtime Submit Outcome Adaptation Trusted V1

Status: **code-ready**

Depends on:

- Hub / Runtime Foundation V1 (`GamesRuntimeSessionContract`,
  `GamesRuntimeCompletionHandoff`)
- Session Result Submit Response Parser Trusted V1
  (`parseGamesSessionResultSubmitResponse` /
  `GamesSessionResultSubmitResponseView`)
- Completion Submit Request Assembly continuity patterns

---

## Purpose

Provide a **pure fail-closed adapter** that converts a trusted Platform
submit response into an immutable Hub Runtime **observation** after strict
continuity checks.

This slice is **observation only**:

- no mutation of runtime session, completion handoff, or submit response
- no lifecycle transition
- no `handoff.applied = true`
- no Supabase / Submit / Start / RPC
- no progress, achievement, reward, economy, or gameplay authority
- no Hub synchronization

SQL remains the sole submit decision and mutation authority. The existing
trusted submit response is the only decision metadata source. Hub Runtime
authority remains closed.

---

## Helper

```
adaptGamesRuntimeSubmitOutcomeTrusted(
  runtimeSession,
  completionHandoff,
  submitResponse
)
  → validate bounded objects
  → parse trusted submit response (fail → submit_response_invalid)
  → require non-null valid platformSessionId
  → continuity:
       platformSessionId === session_id
       runtimeSessionId / gameId / playerId match handoff
  → freeze observation (applied: false)
```

### Signature

```
adaptGamesRuntimeSubmitOutcomeTrusted(
  runtimeSession: unknown,
  completionHandoff: unknown,
  submitResponse: unknown
) → GamesValidationResult<GamesRuntimeSubmitOutcomeObservation>
```

### Observation return type

```
GamesRuntimeSubmitOutcomeObservation = Readonly<{
  runtimeSessionId: string;
  gameId: string;
  playerId: string;
  platformSessionId: string;
  resultId: string;
  decisionStatus: GamesResultDecisionStatus;
  rejectionReason: string | null;
  recordedScore: number | null;
  idempotentReplay: boolean;
  applied: false;
}>
```

Hub Runtime camelCase only. `applied` is always literal `false`.

---

## Continuity checks

| Check | Reason on failure |
| --- | --- |
| Runtime session not a bounded object | `session_required` |
| Completion handoff not a bounded object | `handoff_required` |
| Submit response missing / malformed | `submit_response_invalid` |
| `platformSessionId` null / invalid | `platform_session_id_required` |
| `platformSessionId` ≠ `session_id` | `platform_session_id_mismatch` |
| `runtimeSessionId` mismatch | `runtime_session_id_mismatch` |
| `gameId` mismatch | `session_game_mismatch` |
| `playerId` mismatch | `session_owner_mismatch` |

Identities used are only those guaranteed by current contracts:
`platformSessionId` ↔ `session_id`, `runtimeSessionId`, `gameId`,
`playerId`.

---

## Non-inferences

| Source metadata | Must not imply |
| --- | --- |
| `decision_status = accepted` | local apply success, progress/achievement changes, reward/economy entitlement, gameplay validity, Hub sync |
| `idempotent_replay = true` | reapply permission, new progress/achievement mutation |

---

## Architecture constraints

- Observation-only adapter — no mutation authority
- No lifecycle transition
- No handoff adaptation to `applied: true`
- SQL remains sole submit decision and mutation authority
- Existing trusted submit response is the only decision metadata source
- `GAMES_HUB_RUNTIME_AUTHORITY` remains closed
- Keep RPC / submit / start wiring out of this module beyond response parse

---

## Out of scope

No migrations, no apply of `20260846` / `20260847`, no remote RPC
execution, no Start or Submit call, no `handoff.applied=true`, no runtime
lifecycle activation, no UI, no gameplay, no progress / achievement
mutation, no rewards / wallet / points / economy, no multiplayer /
matchmaking, no Ads / Store / Learning / World, no merge to `alpha-0.2`.
