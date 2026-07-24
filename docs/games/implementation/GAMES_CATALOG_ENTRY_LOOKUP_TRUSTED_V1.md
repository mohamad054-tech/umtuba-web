# UM Games — Catalog Entry Lookup Trusted V1

Status: **code-ready**

Depends on:

- Games Catalog Foundation V1 (`20260847`) — existing
  `get_game_catalog_by_key` / `get_game_catalog_by_id` RPCs
- Trusted parser: `parseGamesCatalogEntryView` (single response boundary)

---

## Purpose

Provide fail-closed, authenticated lookup clients for a single Catalog entry by
stable `game_key` or UUID. Results are **metadata only** and must never be
treated as runtime eligibility, session authority, playability, or matchmaking
permission.

## RPC contracts (authoritative)

| RPC | Signature | Success | Absence / deny |
| --- | --- | --- | --- |
| `get_game_catalog_by_key` | `(p_game_key text) → jsonb` | `game_catalog_row_to_json(row)` | Raises `'Game not available'` (also for hidden/draft/archived non-admin) |
| `get_game_catalog_by_id` | `(p_game_id uuid) → jsonb` | `game_catalog_row_to_json(row)` | Same raise semantics |

Neither RPC returns SQL `NULL` for not-found. Trusted clients therefore expose
`GamesValidationResult<GamesCatalogEntryView>` only — **no success-null union**.

Granted to `authenticated` (and `service_role` at SQL layer). Application code
uses authenticated user-JWT / server-side clients only — no service-role helper
and no direct `games` table reads.

## Application helpers

```
getGamesCatalogByKeyTrusted(client, gameKey)
  → validateGameKey (reject before RPC)
  → rpc get_game_catalog_by_key({ p_game_key })
  → parseGamesCatalogEntryView (fail closed)

getGamesCatalogByIdTrusted(client, gameId)
  → validateCatalogEntryId (reject before RPC)
  → rpc get_game_catalog_by_id({ p_game_id })
  → parseGamesCatalogEntryView (fail closed)
```

## Fail-closed reasons

| Condition | Reason |
| --- | --- |
| Malformed / missing key | `game_key_invalid` |
| Malformed UUID | `entry_id_invalid` |
| RPC error / throw (incl. not-found / visibility deny) | `catalog_rpc_failed` |
| Null / unexpected / unsupported enum payload | `catalog_get_response_invalid` |

Hidden, draft, and archived visibility for non-admins remain governed by the
SQL RPCs. This layer does not invent alternate visibility policy.

## Out of scope

No migrations, remote seed, UI detail routes, lifecycle admin writes, sessions,
playable runtime, Kick Blast gameplay, matchmaking, Ads, Store, Learning, or
World.
