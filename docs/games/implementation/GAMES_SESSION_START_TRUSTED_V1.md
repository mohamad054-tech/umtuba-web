# UM Games — Session Start Trusted V1

Status: **code-ready**

Depends on:

- Games Platform Foundation V1 (`20260846`) — existing
  `start_game_session` RPC (create/resume body)
- Games Catalog Integration (`20260847`) — Catalog
  existence / status / availability / `sessions_enabled` gates
  (supersedes Platform-only Catalog checks for start)
- Shared validation types in `lib/games/gamesFoundation.ts`
  (`GAMES_PUBLIC_RPCS.startSession`, `GamesValidationResult`)

---

## Purpose

Provide a fail-closed, authenticated owner client for create/resume via
the existing `start_game_session` RPC. Results are **create/resume session
metadata only** and must never be treated as:

- Hub Runtime active / gameplay launched
- permission to submit a result
- Catalog visibility outside SQL
- matchmaking / multiplayer authority
- reward / wallet / points / economy entitlement

This slice does **not** connect started sessions to Hub local `runtime.*`
sessions and does **not** populate or reinterpret `platformSessionId` in
Hub Runtime.

This helper is **not side-effect free**. SQL may ensure player
profile/privacy defaults, expire a due active session, resume an existing
session, or insert a new `game_sessions` row. Application code must not
hide that behavior, duplicate Catalog/session gates, or invent a second
start/playability state machine.

## RPC contract (authoritative)

| Item | Value |
| --- | --- |
| RPC | `start_game_session` |
| Registry | `GAMES_PUBLIC_RPCS.startSession` |
| Signature | `(p_game_id uuid) → jsonb` |
| Grants | `authenticated`, `service_role` (SQL layer) |
| App client | authenticated user-JWT / server-side only |

### Catalog gates: `20260846` vs `20260847`

| Migration | Start Catalog gates |
| --- | --- |
| `20260846` (Platform) | Existence + `status = active` only |
| `20260847` (Catalog) | **Active body** — existence + `status = active` + `availability = available` + `sessions_enabled` (coalesce true) |

Application clients must treat the post-`20260847` body as authoritative.
This module does **not** pre-read Catalog and does **not** call
`isCatalogPlayable`.

### Success JSON shape

```
{
  session_id,   -- uuid
  game_id,      -- uuid
  status,       -- always 'active' on success
  started_at,   -- timestamptz string
  expires_at,   -- timestamptz string
  resumed       -- boolean (false = create, true = resume)
}
```

Notes:

- Create and resume paths share this exact top-level shape
- SQL always returns `status = 'active'` on success
- No Hub / playability / submit / reward fields are returned

### Authoritative SQL gates (order)

1. `auth.uid()` required
2. `p_game_id` required / valid uuid
3. Catalog existence for `p_game_id`
4. Catalog status + availability (post-`20260847`)
5. Catalog `sessions_enabled`
6. `game_ensure_player_profile(auth.uid())` (ensure-on-write)
7. Resume path: find one active owner session for game; run
   `game_session_expire_if_due`; if still active → return with `resumed: true`
8. Create path: insert new `game_sessions` row → `resumed: false`

### Create vs resume

| Path | Condition | `resumed` | Side effects |
| --- | --- | --- | --- |
| Resume | Owner has non-expired `active` session for game | `true` | May expire a due session first; no new insert if still active |
| Create | No resumable active session after expiry check | `false` | Inserts new `game_sessions` row with TTL |

One-active-session semantics remain SQL-authoritative.

### Expiry / TTL

- Session TTL comes from Catalog `games.session_ttl_seconds`
- Allowed range: **60–86400** seconds (SQL-clamped / validated)
- Lazy expiry runs on resume attempt via `game_session_expire_if_due` before deciding
  resume vs create

### Ensure-on-write side effects (authoritative in SQL)

Call chain (simplified):

```
start_game_session(p_game_id)
  → auth.uid() required
  → Catalog gates (existence / status / availability / sessions_enabled)
  → game_ensure_player_profile(auth.uid())
      → INSERT game_player_profiles (user_id)
          ON CONFLICT (user_id) DO NOTHING
      → INSERT game_privacy_settings (user_id)
          ON CONFLICT (user_id) DO NOTHING
  → resume (game_session_expire_if_due) or create
  → jsonb_build_object(six metadata fields)
```

| Potential insert | Table | Row content |
| --- | --- | --- |
| Default player profile | `game_player_profiles` | `user_id` only (+ timestamp defaults) |
| Default privacy settings | `game_privacy_settings` | `user_id` only (+ boolean defaults all `false`, timestamps) |
| New session (create only) | `game_sessions` | owner session row with TTL |

Application clients must **not**:

- call `game_ensure_player_profile` directly
- insert/upsert session, profile, or privacy rows
- invent application-side Catalog playability or TTL logic
- use `isCatalogPlayable` as mutation authority

### Anti-abuse / rate-limit

This RPC / trusted client slice has **no** application anti-abuse or
rate-limit layer. SQL gates and auth remain the only controls.

### Catalog / auth denial semantics

SQL raises (does not return null jsonb). Trusted clients map all RPC
errors / throws to `session_start_rpc_failed`, including:

| SQL message (examples) | App reason |
| --- | --- |
| `Authentication required` | `session_start_rpc_failed` |
| `Game not available` | `session_start_rpc_failed` |
| `Game sessions disabled` | `session_start_rpc_failed` |

SQL never returns `NULL` for denial. Trusted clients therefore expose
`GamesValidationResult<GamesMySessionStartView>` only — **no success-null
union**.

## Application helper

```
startMyGameSessionTrusted(client, gameId)
  → validateGameSessionStartGameId (reject before RPC)
  → rpc start_game_session({ p_game_id })
       -- GAMES_PUBLIC_RPCS.startSession
  → parseGamesMySessionStartResponse (fail closed; sole response boundary)
```

## Fail-closed reasons

| Condition | Reason |
| --- | --- |
| Missing / malformed game UUID | `game_id_invalid` |
| RPC error / throw (auth, Catalog deny, sessions disabled, etc.) | `session_start_rpc_failed` |
| Null / unexpected / unknown field / bad status / bad resumed / bad timestamps | `session_start_response_invalid` |

Parser-local reasons (`session_start_not_object`,
`session_start_unknown_field`, `session_status_invalid`,
`resumed_invalid`, `session_id_invalid`, `started_at_invalid`,
`expires_at_invalid`) collapse to `session_start_response_invalid` on the
trusted RPC path.

## Architecture constraints

- Database authentication, Catalog gates, ensure, resume/create, and TTL
  remain authoritative
- Trusted parser is the sole response boundary
- Helper is **not** side-effect free — document and preserve ensure /
  expire / insert behavior
- No Catalog pre-read; no `isCatalogPlayable` as mutation authority
- No duplicate Catalog playability checks in this helper
- No second start / playability state machine
- Successful metadata must not set Hub Runtime / submit / reward flags
- Does not populate `platformSessionId`
- No service-role client; no direct table reads or writes

## Out of scope

No migrations, no apply of `20260846` / `20260847`, no remote start
execution, no `submit_game_session_result` client, no Hub Runtime /
`platformSessionId` wiring, no `/games` or game detail UI, no playable
runtime, no Kick Blast gameplay, no matchmaking / multiplayer, no
rewards / wallet / points / economy, no Ads / Store / Learning / World /
Financial / Social.