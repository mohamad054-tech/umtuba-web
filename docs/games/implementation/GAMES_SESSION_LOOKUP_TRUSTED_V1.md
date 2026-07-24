# UM Games — Session Lookup Trusted V1

Status: **code-ready**

Depends on:

- Games Platform Foundation V1 (`20260846`) — existing
  `get_my_game_session` RPC
- Session status / decision enums in `lib/games/gamesFoundation.ts`

---

## Purpose

Provide a fail-closed, authenticated owner-only lookup client for a single
platform game session by UUID. Results are **session metadata only** and must
never be treated as:

- runtime eligibility
- permission to resume or start play
- permission to submit results
- Catalog availability
- Hub card playability
- matchmaking authority

This slice does **not** connect persisted platform sessions to Hub local
`runtime.*` sessions and does **not** populate or reinterpret
`platformSessionId` in Hub Runtime.

## RPC contract (authoritative)

| Item | Value |
| --- | --- |
| RPC | `get_my_game_session` |
| Registry | `GAMES_PUBLIC_RPCS.getMySession` |
| Signature | `(p_session_id uuid) → jsonb` |
| Grants | `authenticated`, `service_role` (SQL layer) |
| App client | authenticated user-JWT / server-side only |

### Success JSON shape

```
{
  session_id, game_id, status,
  started_at, expires_at,
  submitted_at, accepted_at, rejected_at, expired_at,  -- nullable timestamps
  result: null | {
    result_id, decision_status, rejection_reason,
    recorded_score, recorded_level, decided_at
  }
}
```

Notes:

- `status` ∈ `active|submitted|accepted|rejected|expired|cancelled`
- `cancelled_at` exists on the table but is **not** returned by this RPC
- `result` is `null` when no `game_session_results` row exists
- Nested `rejection_reason`, `recorded_score`, `recorded_level` may be null

### Not-found / ownership / auth semantics

| Condition | SQL behavior |
| --- | --- |
| `auth.uid()` null | raise `Authentication required` |
| `p_session_id` null | raise `session_id is required` |
| Missing session **or** non-owner | raise `Not allowed to read this game session` (shared deny) |
| After lazy expiry, ownership mismatch | same shared deny |

SQL never returns `NULL` for absence. Trusted clients therefore expose
`GamesValidationResult<GamesMySessionView>` only — **no success-null union**.
Not-found and unauthorized are intentionally indistinguishable.

## Application helper

```
getMyGameSessionTrusted(client, sessionId)
  → validateGameSessionId (reject before RPC)
  → rpc get_my_game_session({ p_session_id })
  → parseGamesMySessionResponse (fail closed; sole response boundary)
```

## Fail-closed reasons

| Condition | Reason |
| --- | --- |
| Missing / malformed session UUID | `session_id_invalid` |
| RPC error / throw (incl. shared deny / auth) | `session_rpc_failed` |
| Null / unexpected / unknown field / bad status / bad result | `session_response_invalid` |

## Architecture constraints

- Database ownership checks remain authoritative
- Trusted parser is the sole response boundary
- Helper is side-effect free
- No second session authority model
- Hub Runtime authority remains closed
- Successful metadata lookup must not set any runtime/start/resume flag

## Out of scope

No migrations, no apply of `20260846` / `20260847`, no remote session lookup
execution, no `start_game_session` / `submit_game_session_result` clients, no
session creation, no Hub/detail UI, no playable runtime, no Kick Blast
gameplay, no matchmaking, no Ads / Store / Learning / World.
