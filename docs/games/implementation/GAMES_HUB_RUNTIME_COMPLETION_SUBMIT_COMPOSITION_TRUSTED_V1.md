# UM Games — Hub Runtime Completion Submit Composition Trusted V1

Status: **code-ready**

Depends on:

- Completion Submit Request Assembly Trusted V1
  (`assembleGamesRuntimeCompletionSubmitRequest`)
- Session Result Submit Trusted V1
  (`submitMyGameSessionResultTrusted`)

---

## Purpose

Provide the **thinnest Hub Runtime composition** that:

1. assembles a validated submit request from a bound runtime session +
   completion handoff + idempotency key
2. invokes the existing trusted submit client

This slice is **composition only**:

- no new business logic
- no new Hub / runtime authority
- no response adaptation
- no Hub state updates
- no `handoff.applied` mutation
- no Session Start
- no UI / gameplay / rewards / economy

Successful submit metadata must **never** be treated as ownership, gameplay
completion, accepted-result application, progress/achievement updates,
reward/economy entitlement, or Hub synchronization.

SQL remains the sole ownership, expiry, idempotency, acceptance, progress,
achievement, and mutation authority.

---

## Helper

```
completeGamesRuntimeSubmitCompositionTrusted(
  client,
  runtimeSession,
  completionHandoff,
  idempotencyKey
)
  → assembleGamesRuntimeCompletionSubmitRequest(...)
       -- preserve failure reasons exactly
  → submitMyGameSessionResultTrusted(client, request)
       -- preserve failure reasons / response exactly
```

### Signature

```
completeGamesRuntimeSubmitCompositionTrusted(
  client: GamesSessionResultSubmitRpcClient,
  runtimeSession: unknown,
  completionHandoff: unknown,
  idempotencyKey: unknown
) → Promise<GamesValidationResult<GamesSessionResultSubmitResponseView>>
```

### Return type

Exact existing `GamesSessionResultSubmitResponseView` only.
No Hub wrapper. No adapted handoff. No authority object.

---

## Boundaries (unchanged)

| Boundary | Owner |
| --- | --- |
| Hub→request assembly / continuity | `assembleGamesRuntimeCompletionSubmitRequest` |
| Claim / idempotency / session_id input | `validateGamesSessionResultSubmitRequest` (via assemble + submit) |
| RPC execution | `submitMyGameSessionResultTrusted` |
| Response parsing | `parseGamesSessionResultSubmitResponse` (via submit client) |

---

## Architecture constraints

- Composition only — no new decision logic
- Do not mutate runtime session or completion handoff
- Do not change `handoff.applied` (contract remains `applied: false`)
- Do not construct a new runtime authority object
- `GAMES_HUB_RUNTIME_AUTHORITY` remains closed
- Keep `gamesHubRuntime.ts` free of submit RPC wiring
- No remote execution required for this slice’s tests

---

## Out of scope

No migrations, no apply of `20260846` / `20260847`, no Session Start
composition, no Hub state updates, no UI, no gameplay, no rewards /
wallet / points / economy, no merge to `alpha-0.2`.
