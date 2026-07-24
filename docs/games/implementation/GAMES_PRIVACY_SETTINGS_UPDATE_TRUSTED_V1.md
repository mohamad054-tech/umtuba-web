# UM Games — Privacy Settings Update Trusted V1

Status: **code-ready**

Depends on:

- Games Platform Foundation V1 (`20260846`) — existing
  `update_my_game_privacy_settings` RPC and ensure helpers
- Privacy Settings Lookup Trusted V1 — shared
  `GamesMyPrivacySettingsView` + `parseGamesMyPrivacySettingsResponse`
- Shared validation helpers in `lib/games/gamesFoundation.ts`
  (`validatePrivacySettingsPatch`, `GAMES_PUBLIC_RPCS.updateMyPrivacy`)

---

## Purpose

Provide a fail-closed, authenticated owner-only update client for the
caller's Games privacy preference flags. Results are **privacy preference
metadata only** and must never be treated as:

- proof that public sharing / public visibility is active
- Hub card or Runtime exposure
- feed or leaderboard publication
- achievement, score, or progress publication
- reward / wallet / points / economy eligibility
- Catalog existence or playability

This helper is **not side-effect free**. SQL ensure-on-write may insert
default rows before UPDATE. Application code must not hide that behavior,
duplicate ensure/default logic, or invent a second mutation authority.

This slice does **not** add a public-read surface and does **not** wire
Hub Runtime, achievements UI, progress UI, profiles, feeds, or
leaderboards.

## RPC contract (authoritative)

| Item | Value |
| --- | --- |
| RPC | `update_my_game_privacy_settings` |
| Registry | `GAMES_PUBLIC_RPCS.updateMyPrivacy` |
| Signature | `(p_patch jsonb) → jsonb` |
| Grants | `authenticated`, `service_role` (SQL layer) |
| App client | authenticated user-JWT / server-side only |

### Exact patch allowlist

Any **non-empty** subset of:

| Field | Type |
| --- | --- |
| `share_achievements` | boolean |
| `share_best_score` | boolean |
| `share_level_or_progress` | boolean |
| `share_activity` | boolean |

### Partial-update semantics

SQL updates each column with:

```
CASE WHEN p_patch ? '<field>' THEN (p_patch ->> '<field>')::boolean
     ELSE <field>
END
```

Omitted fields are **preserved**. The trusted client sends only validated
keys in `p_patch` and never fills omitted fields with application defaults.

SQL also rejects:

- null / non-object `p_patch` → `privacy_not_object`
- unknown keys → `privacy_unknown_field`
- non-boolean jsonb values → `privacy_field_not_boolean`

SQL allows an empty object `{}` (would still bump `updated_at`). The
trusted client **rejects empty patches before RPC** with `privacy_empty`.

### Success JSON shape

Same as lookup:

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

A returned `true` preference flag is **owner preference metadata only**.
It does not enable public sharing, Hub/Runtime exposure, feeds,
leaderboards, achievement/score/progress publication, or economy credit.

### Ensure-on-write side effects (authoritative in SQL)

Call chain:

```
update_my_game_privacy_settings(p_patch)
  → auth.uid() required
  → validate p_patch (object / allowlist / booleans)
  → game_ensure_player_profile(auth.uid())
      → INSERT game_player_profiles (user_id)
          ON CONFLICT (user_id) DO NOTHING
      → INSERT game_privacy_settings (user_id)
          ON CONFLICT (user_id) DO NOTHING
  → UPDATE game_privacy_settings SET <patch fields>, updated_at = now()
      WHERE user_id = auth.uid()
  → jsonb_build_object(four preference flags)
```

Note: update calls `game_ensure_player_profile` directly. It does **not**
call `game_ensure_privacy_settings` (that helper is used by lookup).

| Potential insert | Table | Row content |
| --- | --- | --- |
| Default player profile | `game_player_profiles` | `user_id` only (+ timestamp defaults) |
| Default privacy settings | `game_privacy_settings` | `user_id` only (+ boolean defaults all `false`, timestamps) |

**Idempotency:** ensure inserts are idempotent via
`ON CONFLICT (user_id) DO NOTHING`. Existing preference values are not
overwritten by ensure; only keys present in `p_patch` are mutated by
UPDATE. Repeating the same patch is safe (writes the same booleans again
and refreshes `updated_at`).

Application clients must **not**:

- call `game_ensure_player_profile` / `game_ensure_privacy_settings` directly
- insert/upsert/update privacy or profile rows
- invent application-side default-row logic

SQL remains the sole ensure/default/mutation authority.

### Authentication / ownership

| Condition | SQL behavior |
| --- | --- |
| `auth.uid()` null | raise `Authentication required` |
| Authenticated caller | ensure own rows, update own preference flags |

Update is scoped to `auth.uid()`. Another user's privacy settings are never
mutated or returned.

SQL never returns `NULL` jsonb for absence after ensure+update. Trusted
clients therefore expose `GamesValidationResult<GamesMyPrivacySettingsView>`
only — **no success-null union**.

## Application helper

```
updateMyGamePrivacySettingsTrusted(client, patch)
  → validateGamesMyPrivacySettingsPatch(patch)
       (reuses validatePrivacySettingsPatch; rejects empty)
  → rpc update_my_game_privacy_settings({ p_patch })
       -- GAMES_PUBLIC_RPCS.updateMyPrivacy
  → parseGamesMyPrivacySettingsResponse (fail closed; sole response boundary)
```

## Fail-closed reasons

| Condition | Reason |
| --- | --- |
| Empty patch (before RPC) | `privacy_empty` |
| Non-object / null / array patch | `privacy_not_object` |
| Unknown patch field | `privacy_unknown_field` |
| Non-boolean patch value | `privacy_field_not_boolean` |
| RPC error / throw (incl. auth deny) | `privacy_rpc_failed` |
| Null / unexpected / unknown field / non-boolean response | `privacy_response_invalid` |

## Architecture constraints

- Database authentication, ensure, and update remain authoritative
- Trusted parser is the sole response boundary (shared with lookup)
- Helper is **not** side-effect free — document and preserve ensure-on-write
- No application-side ensure / default-row duplication
- Returned preferences are private owner metadata only
- True preference flags must not be inferred as public-sharing, Hub, reward,
  economy, Catalog, or playability authority
- Hub Runtime authority remains closed
- No public-read surface in this slice
- No service-role client; no direct table writes

## Out of scope

No migrations, no apply of `20260846` / `20260847`, no remote privacy
lookup or update execution, no public privacy/sharing read, no Hub/detail
UI, no achievements/progress/profiles/feeds/leaderboards wiring, no
`start_game_session` / `submit_game_session_result` clients, no playable
runtime, no Kick Blast gameplay, no matchmaking, no rewards/wallet/economy,
no Ads / Store / Learning / World.
