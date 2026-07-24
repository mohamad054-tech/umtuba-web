# UM Games — Catalog Lifecycle Trusted V1

Status: **code-ready** (remote lifecycle write **NOT executed**)

Depends on:

- Games Catalog Foundation V1 (`20260847`) — existing
  `set_game_catalog_lifecycle` RPC
- Validators: `validateGameKey`, `validateLifecyclePatch`
- Parser: `parseGamesCatalogEntryView`
- Title Seed V1 admin assertion pattern (`assertPlatformAdmin`)

---

## Purpose

Provide a fail-closed, admin-gated application wrapper for bounded Catalog
lifecycle mutations (`status` / `availability` / `visibility`). Results are
**metadata only** and must never be treated as runtime eligibility, session
authority, playability, or matchmaking permission.

## RPC contract (authoritative)

| Item | Value |
| --- | --- |
| RPC | `set_game_catalog_lifecycle(p_game_key text, p_patch jsonb) → jsonb` |
| Registry | `GAMES_CATALOG_ADMIN_RPCS.setLifecycle` |
| Auth | `auth.uid()` required + `is_platform_admin(uid)` |
| Allowed patch keys | `status`, `availability`, `visibility` only |
| Empty patch | Rejected (`lifecycle_empty`) |
| Unknown fields | Rejected (`lifecycle_unknown_field`) |
| Success | `game_catalog_row_to_json(row)` |
| Missing key | Raises `'Game not available'` |

### Status / availability / visibility enums

- `status`: `draft` \| `active` \| `archived`
- `availability`: `available` \| `unavailable` \| `coming_soon` \| `maintenance`
- `visibility`: `hidden` \| `authenticated` \| `listed`

### Transition semantics

SQL applies any valid enum values present in the patch. There is **no**
from→to transition matrix in `set_game_catalog_lifecycle`. Database validation
and `is_platform_admin` remain authoritative.

## Application helper

```
setGamesCatalogLifecycleTrusted(client, auth, gameKey, patch)
  → auth.assertPlatformAdmin()   // app-layer fail-closed
                                 // (caller supplies assertPlatformAdminDb /
                                 //  is_platform_admin)
  → validateGameKey
  → validateLifecyclePatch
  → rpc set_game_catalog_lifecycle({ p_game_key, p_patch })
  → parseGamesCatalogEntryView (reject unexpected shape)
```

No service-role helper and no direct `games` table writes.

## Local transition-validation decision

`canTransitionCatalogStatus` is **not** enforced in the trusted wrapper.

Reasons:

1. SQL has no from→to matrix — any valid status enum is accepted.
2. Enforcing the advisory helper would invent a parallel state machine that
   could disagree with SQL (and would require a current-status pre-read
   outside this RPC contract).
3. The helper remains available for optional UI/advisory use only.

**SQL is the sole transition authority.**

## Fail-closed reasons

| Condition | Reason |
| --- | --- |
| Admin assertion throws | `lifecycle_auth_failed` |
| Admin assertion false / missing | `lifecycle_unauthorized` |
| Malformed / missing key | `game_key_invalid` |
| Empty patch | `lifecycle_empty` |
| Unknown patch field | `lifecycle_unknown_field` |
| Invalid status / availability / visibility | `status_invalid` / `availability_invalid` / `visibility_invalid` |
| RPC error / throw | `catalog_lifecycle_rpc_failed` |
| Null / malformed / unexpected response | `catalog_lifecycle_response_invalid` |

## Out of scope

No migrations, remote lifecycle write, remote seed, admin UI, Hub expansion,
detail routes, sessions, playable runtime, Kick Blast gameplay, matchmaking,
Ads, Store, Learning, or World.
