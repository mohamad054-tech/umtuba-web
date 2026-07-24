# UM Games — Hub Runtime Completion Submit Request Assembly Trusted V1

Status: **code-ready**

Depends on:

- Hub / Runtime Foundation V1 (`lib/games/gamesHubRuntime.ts`)
- Platform Session Bind Trusted V1 (`bindGamesRuntimePlatformSessionId`)
- Session Result Submit Request Validation Trusted V1
  (`validateGamesSessionResultSubmitRequest`)

---

## Purpose

Provide a **pure fail-closed assembler** that maps:

1. a bound Hub Runtime session contract
2. an existing completion handoff
3. a raw idempotency key

into the already-defined `GamesSessionResultSubmitRequest` shape.

This slice is **assembly-only**:

- pure and side-effect free
- no Submit / Session Start / RPC / Supabase
- no completion apply (`handoff.applied` stays false)
- no Hub authority changes
- no UI / gameplay / rewards / economy

Successful assembly must **never** be treated as ownership, submit
permission, session active/unexpired status, claim acceptance, gameplay
validity, persistence, progress/achievement updates, or reward/economy
entitlement.

`platformSessionId` remains **metadata only**. SQL remains the future
ownership, expiry, decision, and mutation authority.

---

## Helper

```
assembleGamesRuntimeCompletionSubmitRequest(
  runtimeSession,
  completionHandoff,
  idempotencyKey
)
  → validate runtime / handoff objects
  → require non-null platformSessionId
  → continuity: runtimeSessionId, gameId, playerId
  → validateGamesSessionResultSubmitRequest({
       session_id: platformSessionId,
       idempotency_key,
       claim
     })
```

### Signature

```
assembleGamesRuntimeCompletionSubmitRequest(
  runtimeSession: unknown,
  completionHandoff: unknown,
  idempotencyKey: unknown
) → GamesValidationResult<GamesSessionResultSubmitRequest>
```

### Exact mapping

| Source | Target |
| --- | --- |
| `runtimeSession.platformSessionId` | `session_id` |
| `idempotencyKey` | `idempotency_key` |
| `completionHandoff.claim` | `claim` |

Claim and idempotency validation are **not** duplicated. Final bounded
output is produced solely by `validateGamesSessionResultSubmitRequest`.

---

## Continuity checks (stable contract fields only)

| Check | Reason on failure |
| --- | --- |
| Runtime session not an object | `session_required` |
| Completion handoff not an object | `handoff_required` |
| `platformSessionId` null / undefined | `platform_session_id_required` |
| `runtimeSessionId` mismatch | `runtime_session_id_mismatch` |
| `gameId` mismatch | `session_game_mismatch` |
| `playerId` mismatch | `session_owner_mismatch` |
| Invalid Platform UUID / claim / idempotency / final request | reasons from `validateGamesSessionResultSubmitRequest` |

Handoff has no `platformSessionId`. Continuity does not invent unsupported
identifiers.

---

## Architecture constraints

- Pure function only — no side effects
- Existing submit request validator is the sole final input boundary
- Does not connect completion handoff to Submit execution
- Does not mutate runtime session or completion handoff
- Does not set `handoff.applied` to true
- `GAMES_HUB_RUNTIME_AUTHORITY` remains closed (all capability flags false)

---

## Out of scope

No migrations, no apply of `20260846` / `20260847`, no remote execution,
no Session Start / Submit calls, no completion apply, no UI, no gameplay,
no rewards / wallet / points / economy, no merge to `alpha-0.2`.
