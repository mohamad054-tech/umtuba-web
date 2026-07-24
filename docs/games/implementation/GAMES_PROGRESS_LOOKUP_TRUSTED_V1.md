# UM Games — Progress Lookup Trusted V1

Status: **code-ready**

Depends on:

- Games Platform Foundation V1 (`20260846`) — existing
  `get_my_game_progress` RPC
- Shared validation result types in `lib/games/gamesFoundation.ts`

---

## Purpose

Provide a fail-closed, authenticated owner-only lookup client for a single
player's per-game progress summary by `game_id`. Results are **progress
metadata only** and must never be treated as:

- Catalog existence or visibility
- playability / runtime eligibility
- session authority
- reward entitlement
- wallet / economy credit
- achievement completion authority

This slice does **not** connect progress to Hub local `runtime.*` sessions
and does **not** populate or reinterpret `platformSessionId`.

## RPC contract (authoritative)

| Item | Value |
| --- | --- |
| RPC | `get_my_game_progress` |
| Registry | `GAMES_PUBLIC_RPCS.getMyProgress` |
| Signature | `(p_game_id uuid) → jsonb` |
| Grants | `authenticated`, `service_role` (SQL layer) |
| App client | authenticated user-JWT / server-side only |

### Success JSON shape

```
{
  game_id,                 -- uuid string
  play_count,              -- non-negative integer
  accepted_result_count,   -- non-negative integer
  best_score,              -- number | null
  current_level,           -- non-negative integer
  experience_value,        -- non-negative integer
  last_played_at           -- timestamptz string | null
}
```

### Empty / default semantics (preserve exactly)

When no `game_player_progress` row exists for `(auth.uid(), p_game_id)`,
SQL returns a **success** object:

```
{
  game_id: <p_game_id>,
  play_count: 0,
  accepted_result_count: 0,
  best_score: null,
  current_level: 0,
  experience_value: 0,
  last_played_at: null
}
```

This empty-default is **not** an error and must not be reinterpreted as
Catalog/game existence, visibility, or playability.

### Authentication / ownership

| Condition | SQL behavior |
| --- | --- |
| `auth.uid()` null | raise `Authentication required` |
| `p_game_id` null | raise `game_id is required` |
| No row for caller + game | success empty-default (above) |
| Row for caller + game | success with row values |

Lookup is scoped to `user_id = auth.uid()`. Another user's progress is never
returned; absence for the caller yields empty-default, not a foreign row.

SQL never returns `NULL` jsonb for absence. Trusted clients therefore expose
`GamesValidationResult<GamesMyProgressView>` only — **no success-null union**.

## Application helper

```
getMyGameProgressTrusted(client, gameId)
  → validateGameProgressGameId (reject before RPC)
  → rpc get_my_game_progress({ p_game_id })
  → parseGamesMyProgressResponse (fail closed; sole response boundary)
```

## Fail-closed reasons

| Condition | Reason |
| --- | --- |
| Missing / malformed game UUID | `game_id_invalid` |
| RPC error / throw (incl. auth deny) | `progress_rpc_failed` |
| Null / unexpected / unknown field / bad value shape | `progress_response_invalid` |

## Architecture constraints

- Database authentication remains authoritative
- Trusted parser is the sole response boundary
- Helper is side-effect free
- No second progress authority model
- Progress metadata must not become gameplay, reward, or economy authority
- Hub Runtime authority remains closed
- No Catalog pre-read merely to “prove” existence

## Out of scope

No migrations, no apply of `20260846` / `20260847`, no remote progress
lookup execution, no progress mutation, no `start_game_session` /
`submit_game_session_result` clients, no Hub/detail UI, no playable
runtime, no Kick Blast gameplay, no matchmaking, no rewards/wallet/economy,
no Ads / Store / Learning / World.
