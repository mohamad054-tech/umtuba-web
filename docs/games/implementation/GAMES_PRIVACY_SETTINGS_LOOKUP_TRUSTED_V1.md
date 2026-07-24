# UM Games — Privacy Settings Lookup Trusted V1

Status: **code-ready**

Depends on:

- Games Platform Foundation V1 (`20260846`) — existing
  `get_my_game_privacy_settings` RPC and ensure helpers
- Shared validation result types in `lib/games/gamesFoundation.ts`

---

## Purpose

Provide a fail-closed, authenticated owner-only lookup client for the
caller's Games privacy preference flags. Results are **privacy preference
metadata only** and must never be treated as:

- proof that public sharing is active
- existence of a public profile or leaderboard
- Hub or social feed exposure authority
- reward / economy eligibility
- Catalog existence or playability

This helper is **not side-effect free**. SQL ensure-on-read may insert
default rows. Application code must not hide that behavior, duplicate
ensure/default logic, or invent a second ensure authority.

This slice does **not** implement `update_my_game_privacy_settings`, does
**not** add a public-read surface, and does **not** wire Hub Runtime,
achievements UI, progress UI, profiles, feeds, or leaderboards.

## RPC contract (authoritative)

| Item | Value |
| --- | --- |
| RPC | `get_my_game_privacy_settings` |
| Registry | `GAMES_PUBLIC_RPCS.getMyPrivacy` |
| Signature | `() → jsonb` (no arguments) |
| Grants | `authenticated`, `service_role` (SQL layer) |
| App client | authenticated user-JWT / server-side only |

### Success JSON shape

```
{
  share_achievements,       -- boolean
  share_best_score,         -- boolean
  share_level_or_progress,  -- boolean
  share_activity            -- boolean
}
```

SQL builds the object with only those four fields. Table columns
`user_id`, `created_at`, and `updated_at` are **not** returned. Exact
parsers must reject unknown fields and non-boolean values.

### Default values

Column defaults on `game_privacy_settings` (all private / opt-in only):

| Field | Default |
| --- | --- |
| `share_achievements` | `false` |
| `share_best_score` | `false` |
| `share_level_or_progress` | `false` |
| `share_activity` | `false` |

First-read inserts of `game_privacy_settings (user_id)` rely on these
column defaults. Repeated preference reads may therefore return all-false
until the owner updates settings via a separate (out-of-scope) update RPC.

### Ensure-on-read side effects (authoritative in SQL)

Call chain:

```
get_my_game_privacy_settings()
  → game_ensure_privacy_settings(auth.uid())
      → game_ensure_player_profile(p_user_id)
          → INSERT game_player_profiles (user_id)
              ON CONFLICT (user_id) DO NOTHING
          → INSERT game_privacy_settings (user_id)
              ON CONFLICT (user_id) DO NOTHING
      → SELECT * FROM game_privacy_settings WHERE user_id = p_user_id
  → jsonb_build_object(four preference flags)
```

| Potential insert | Table | Row content |
| --- | --- | --- |
| Default player profile | `game_player_profiles` | `user_id` only (+ timestamp defaults) |
| Default privacy settings | `game_privacy_settings` | `user_id` only (+ boolean defaults all `false`, timestamps) |

**Idempotency:** repeated calls are idempotent for inserts because both
ensure inserts use `ON CONFLICT (user_id) DO NOTHING`. Existing preference
values are not overwritten by ensure-on-read.

Application clients must **not**:

- call `game_ensure_player_profile` / `game_ensure_privacy_settings` directly
- insert/upsert/update privacy or profile rows
- invent application-side default-row logic

SQL remains the sole ensure/default authority.

### Authentication / ownership

| Condition | SQL behavior |
| --- | --- |
| `auth.uid()` null | raise `Authentication required` |
| Authenticated caller | ensure own rows, return own preference flags |

Lookup is scoped to `auth.uid()`. Another user's privacy settings are never
returned.

SQL never returns `NULL` jsonb for absence after ensure. Trusted clients
therefore expose `GamesValidationResult<GamesMyPrivacySettingsView>` only —
**no success-null union**.

## Application helper

```
getMyGamePrivacySettingsTrusted(client)
  → rpc get_my_game_privacy_settings()   -- GAMES_PUBLIC_RPCS.getMyPrivacy
  → parseGamesMyPrivacySettingsResponse (fail closed; sole response boundary)
```

## Fail-closed reasons

| Condition | Reason |
| --- | --- |
| RPC error / throw (incl. auth deny) | `privacy_rpc_failed` |
| Null / unexpected / unknown field / non-boolean | `privacy_response_invalid` |

Parser-level reasons (used by the exported parse helper) include
`privacy_not_object`, `privacy_unknown_field`,
`share_achievements_invalid`, `share_best_score_invalid`,
`share_level_or_progress_invalid`, and `share_activity_invalid`; the
trusted get path collapses parse failures to `privacy_response_invalid`.

## Architecture constraints

- Database authentication remains authoritative
- Trusted parser is the sole response boundary
- Helper is **not** side-effect free — document and preserve ensure-on-read
- No application-side ensure / default-row duplication
- Returned preferences are private owner metadata only
- True preference flags must not be inferred as public-sharing, Hub, reward,
  economy, Catalog, or playability authority
- Hub Runtime authority remains closed
- No public-read surface in this slice
- No `update_my_game_privacy_settings` client in this slice

## Out of scope

No migrations, no apply of `20260846` / `20260847`, no remote privacy
lookup execution, no privacy update client, no public privacy/sharing
read, no Hub/detail UI, no achievements/progress/profiles/feeds/leaderboards
wiring, no `start_game_session` / `submit_game_session_result` clients, no
playable runtime, no Kick Blast gameplay, no matchmaking, no
rewards/wallet/economy, no Ads / Store / Learning / World.
