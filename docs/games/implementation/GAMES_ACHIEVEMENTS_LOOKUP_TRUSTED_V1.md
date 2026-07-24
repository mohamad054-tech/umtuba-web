# UM Games — Achievements Lookup Trusted V1

Status: **code-ready**

Depends on:

- Games Platform Foundation V1 (`20260846`) — existing
  `get_my_game_achievements` RPC
- Shared validation result types in `lib/games/gamesFoundation.ts`

---

## Purpose

Provide a fail-closed, authenticated owner-only lookup client for a single
player's unlocked achievements by `game_id`. Results are **unlock metadata
only** and must never be treated as:

- Catalog existence or visibility
- playability / runtime eligibility
- session authority
- reward entitlement
- wallet / economy credit
- achievement verification authority outside the RPC result

This slice does **not** unlock achievements, does **not** connect unlocks to
Hub local `runtime.*` sessions, and does **not** populate or reinterpret
`platformSessionId`.

## RPC contract (authoritative)

| Item | Value |
| --- | --- |
| RPC | `get_my_game_achievements` |
| Registry | `GAMES_PUBLIC_RPCS.getMyAchievements` |
| Signature | `(p_game_id uuid) → jsonb` |
| Grants | `authenticated`, `service_role` (SQL layer) |
| App client | authenticated user-JWT / server-side only |

### Success JSON shape

```
{
  game_id,            -- uuid string (echo of p_game_id)
  achievements: [     -- array; may be empty
    {
      achievement_id,   -- uuid string
      achievement_key,  -- non-empty string
      name,             -- non-empty string
      description,      -- string | null
      unlocked_at       -- timestamptz string (required)
    }
  ]
}
```

SQL builds each entry with only those five fields. Table column
`source_session_id` is **not** returned. Exact parsers must reject unknown
fields.

### Empty-list semantics (preserve exactly)

When the authenticated user has no rows in `game_player_achievements` for
`p_game_id`, SQL still returns a **success** object:

```
{
  game_id: <p_game_id>,
  achievements: []
}
```

(`coalesce(jsonb_agg(...), '[]'::jsonb)`). This empty list is **not** an
error and must not be reinterpreted as Catalog/game existence, visibility,
playability, or reward entitlement.

### Ordering

When unlocks exist, SQL orders entries by `pa.unlocked_at desc`.

### Authentication / ownership

| Condition | SQL behavior |
| --- | --- |
| `auth.uid()` null | raise `Authentication required` |
| `p_game_id` null | raise `game_id is required` |
| No unlocks for caller + game | success with `achievements: []` |
| Unlocks for caller + game | success with owner unlocks only |

Lookup is scoped to `pa.user_id = auth.uid()` and `pa.game_id = p_game_id`.
Another user's unlocks are never returned.

SQL never returns `NULL` jsonb for absence. Trusted clients therefore expose
`GamesValidationResult<GamesMyAchievementsView>` only — **no success-null
union**.

### Nullable fields

| Field | Nullability |
| --- | --- |
| `description` | nullable (`string \| null`) |
| `unlocked_at` | required (NOT NULL in SQL) |
| `achievement_id` / `achievement_key` / `name` | required |

## Application helper

```
getMyGameAchievementsTrusted(client, gameId)
  → validateGameAchievementsGameId (reject before RPC)
  → rpc get_my_game_achievements({ p_game_id })
  → parseGamesMyAchievementsResponse (fail closed; sole response boundary)
```

## Fail-closed reasons

| Condition | Reason |
| --- | --- |
| Missing / malformed game UUID | `game_id_invalid` |
| RPC error / throw (incl. auth deny) | `achievements_rpc_failed` |
| Null / unexpected / unknown field / bad entry or value | `achievements_response_invalid` |

Parser-level reasons (used by exported parse helpers) include
`achievements_unknown_field`, `achievement_entry_unknown_field`,
`achievement_id_invalid`, `unlocked_at_invalid`, and related field reasons;
the trusted get path collapses parse failures to
`achievements_response_invalid`.

## Architecture constraints

- Database authentication remains authoritative
- Trusted parser is the sole response boundary
- Helper is side-effect free / read-only
- No second achievement authority model
- Unlock metadata must not become reward or economy authority
- Hub Runtime authority remains closed
- No Catalog pre-read merely to “prove” existence

## Out of scope

No migrations, no apply of `20260846` / `20260847`, no remote achievements
lookup execution, no unlock mutation, no `start_game_session` /
`submit_game_session_result` clients, no Hub/detail UI, no playable
runtime, no Kick Blast gameplay, no matchmaking, no rewards/wallet/economy,
no Ads / Store / Learning / World.
