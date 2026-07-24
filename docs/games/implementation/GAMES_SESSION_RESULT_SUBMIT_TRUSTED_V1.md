# UM Games — Session Result Submit Trusted V1

Status: **code-ready**

Depends on:

- Games Platform Foundation V1 (`20260846`) — existing
  `submit_game_session_result` RPC
- Request validator Trusted V1 —
  `validateGamesSessionResultSubmitRequest`
- Response parser Trusted V1 —
  `parseGamesSessionResultSubmitResponse`
- Shared registry: `GAMES_PUBLIC_RPCS.submitResult`

---

## Purpose

Provide a fail-closed, authenticated owner client for submit via the
existing `submit_game_session_result` RPC by **thin composition only**:

1. `validateGamesSessionResultSubmitRequest` (sole input boundary)
2. `rpc(GAMES_PUBLIC_RPCS.submitResult, { p_session_id, p_idempotency_key, p_claim })`
3. `parseGamesSessionResultSubmitResponse` (sole output boundary)

Results are **submit metadata only** and must never be treated as:

- gameplay was valid
- ownership proven by app code
- accepted result may be applied again
- idempotent replay may trigger another mutation
- progress or achievements definitely changed in every case
- reward / wallet / points / economy entitlement
- Hub Runtime authority

This helper is **not side-effect free**. SQL may insert/update result and
session rows; accepted results may invoke `game_apply_accepted_result`;
progress and achievements may change inside SQL. Application code must not
hide that behavior, duplicate ownership/expiry/idempotency/claim gates, or
invent a second submit state machine.

This slice does **not** connect to Hub Runtime and does **not** populate
`platformSessionId`.

---

## RPC contract (authoritative)

| Item | Value |
| --- | --- |
| RPC | `submit_game_session_result` |
| Registry | `GAMES_PUBLIC_RPCS.submitResult` |
| Signature | `(p_session_id uuid, p_idempotency_key text, p_claim jsonb) → jsonb` |
| Grants | `authenticated`, `service_role` (SQL layer) |
| App client | authenticated user-JWT / server-side only |

### Argument mapping

| Validated request key | RPC argument |
| --- | --- |
| `session_id` | `p_session_id` |
| `idempotency_key` | `p_idempotency_key` |
| `claim` | `p_claim` |

Exact validated request keys and SQL argument names are preserved. Claim
semantics are not revalidated or reinterpreted after the request validator.

### Success JSON shape

Fresh insert and idempotent replay share:

```
{
  session_id,          -- uuid
  result_id,           -- uuid
  decision_status,     -- 'accepted' | 'rejected'
  rejection_reason,    -- text | null
  recorded_score,      -- number | null
  idempotent_replay    -- boolean
}
```

No Hub / reward / economy / progress-delta fields are returned.

---

## Authoritative SQL behavior (summary)

1. `auth.uid()` required
2. Validate `p_idempotency_key` shape
3. Load session; deny if missing or not owned
4. `game_session_expire_if_due(p_session_id)`
5. Idempotent replay: same user+game+key → return prior decision with
   `idempotent_replay: true` (**no re-mutation**)
6. Else require active (non-expired) session
7. Validate claim (mode from Catalog); accept or reject
8. Insert `game_session_results`; update `game_sessions` status timestamps
9. If accepted → `game_apply_accepted_result` (progress / achievements)
10. Return metadata with `idempotent_replay: false`

`idempotent_replay: true` is **not** permission to reapply anything.
`decision_status` is **not** reward/economy authority.

---

## Application helper

```
submitMyGameSessionResultTrusted(client, raw)
  → validateGamesSessionResultSubmitRequest(raw)
       -- preserve request-validation reason codes
  → rpc submit_game_session_result({
       p_session_id,
       p_idempotency_key,
       p_claim
     })
       -- GAMES_PUBLIC_RPCS.submitResult
  → parseGamesSessionResultSubmitResponse (fail closed; sole response boundary)
```

### Signature

```
submitMyGameSessionResultTrusted(
  client: GamesSessionResultSubmitRpcClient,
  raw: unknown
) → Promise<GamesValidationResult<GamesSessionResultSubmitResponseView>>
```

`GamesSessionResultSubmitRpcClient` exposes only the narrow `rpc` method
required for this call. No service-role. No direct table access.

---

## Fail-closed reasons

| Condition | Reason |
| --- | --- |
| Request validation failure | existing validator reason (preserved) |
| RPC error / throw (auth, ownership deny, expired, not active, etc.) | `session_result_submit_rpc_failed` |
| Null / malformed / parser failure | `session_result_submit_response_invalid` |

Parser-local reasons (`submit_response_not_object`,
`submit_response_unknown_field`, `decision_status_invalid`,
`idempotent_replay_invalid`, etc.) collapse to
`session_result_submit_response_invalid` on the trusted RPC path.

SQL raises (does not return null jsonb) for auth / ownership / expiry /
status denials. Trusted clients therefore expose
`GamesValidationResult<GamesSessionResultSubmitResponseView>` only — **no
success-null union**.

---

## Architecture constraints

- Existing request validator is the sole input boundary
- Existing response parser is the sole output boundary
- SQL is the sole mutation and decision authority
- Helper is **not** side-effect free — document ensure/insert/update/apply
- Do not add a second submit state machine
- Do not treat `idempotent_replay` as permission to reapply
- Do not treat `decision_status` as reward/economy authority
- Hub Runtime remains closed; no `platformSessionId`
- No service-role client; no direct table reads or writes
- No UI or gameplay wiring in this slice

---

## Out of scope

No migrations, no apply of `20260846` / `20260847`, no remote submit
execution, no Hub Runtime / `platformSessionId` wiring, no `/games` or
game detail UI, no playable runtime, no Kick Blast gameplay, no
matchmaking / multiplayer, no app-side anti-abuse / progress / achievement
mutation, no rewards / wallet / points / economy, no Ads / Store /
Learning / World / Financial / Social.
