# UM Games — Hub Runtime Session Start Composition Trusted V1

Status: **code-ready**

Depends on:

- Session Start Trusted V1 (`startMyGameSessionTrusted`)
- Hub Runtime Platform Session Bind Trusted V1
  (`bindGamesRuntimePlatformSessionId`)
- Hub / Runtime Foundation V1 (`GamesRuntimeSessionContract`)

---

## Purpose

Provide the **thinnest Hub Runtime start composition** that:

1. calls the existing trusted Platform session-start client
2. verifies exact `game_id` continuity against an existing Hub Runtime session
3. binds the returned Platform `session_id` via the existing binder

This slice is **composition only** — metadata binding only:

- no runtime / play / submit / UI / gameplay authority
- no Hub authority flag changes
- no new Runtime authority object
- no rewrite of Hub start behavior
- no mutation of the input runtime session
- no reinterpretation of `resumed=true/false`

Successful composition must **never** be treated as gameplay started,
runtime playable, submit permission, ownership proven by app code, Catalog
visibility/playability outside SQL, or progress / achievement / reward /
economy entitlement.

SQL remains the sole Catalog / start / resume / TTL / expiry authority.
`platformSessionId` remains metadata only. Hub Runtime authority remains
closed.

---

## Helper

```
startGamesRuntimeSessionCompositionTrusted(client, runtimeSession)
  → validate runtimeSession present
  → startMyGameSessionTrusted(client, runtimeSession.gameId)
       -- preserve failure reasons exactly
  → require started.game_id === runtimeSession.gameId
       -- else platform_session_game_mismatch
  → bindGamesRuntimePlatformSessionId(runtimeSession, started.session_id)
       -- preserve binder failure reasons exactly
```

### Signature

```
startGamesRuntimeSessionCompositionTrusted(
  client: GamesSessionStartRpcClient,
  runtimeSession: unknown
) → Promise<GamesValidationResult<GamesRuntimeSessionContract>>
```

### Return type

Exact existing `GamesRuntimeSessionContract` only (via binder).
No Hub wrapper. No Platform start view passthrough. No authority object.

---

## Fail-closed reasons

| Condition | Reason |
| --- | --- |
| Null / undefined / non-object runtime session | `session_required` |
| Start-client validation / RPC / response failures | preserved exactly |
| Platform `game_id` ≠ runtime `gameId` | `platform_session_game_mismatch` |
| Binder UUID / conflict failures | preserved exactly |

### Idempotency

If the runtime session is already bound to the **same** Platform
`session_id`, binder idempotency allows success. A conflicting pre-bound
`platformSessionId` fails closed with `platform_session_id_conflict`.

---

## Boundaries (unchanged)

| Boundary | Owner |
| --- | --- |
| Platform start RPC / response parse | `startMyGameSessionTrusted` |
| Platform/runtime game continuity | this composition (`platform_session_game_mismatch`) |
| `platformSessionId` mutation | `bindGamesRuntimePlatformSessionId` |
| Catalog / start / resume / TTL / expiry | SQL |

---

## Architecture constraints

- Composition only — no second playability or start state machine
- Existing start client is the sole Platform RPC boundary
- Existing binder is the sole `platformSessionId` mutation boundary
- Do not mutate the input runtime session
- Do not reinterpret `resumed`
- `GAMES_HUB_RUNTIME_AUTHORITY` remains closed
- Keep `gamesHubRuntime.ts` free of start RPC wiring
- No remote execution required for this slice’s tests

---

## Out of scope

No migrations, no apply of `20260846` / `20260847`, no remote start
execution, no Submit, no completion handoff changes, no Hub state-machine
activation, no UI, no playable runtime / gameplay, no multiplayer /
matchmaking, no progress / achievement mutation, no rewards / wallet /
points / economy, no merge to `alpha-0.2`.
