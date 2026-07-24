# UM Games — Catalog Title Seed V1

Status: **code-ready locally** (remote seed **NOT executed**)

Depends on:

- Games Platform Foundation V1 (`20260846`) — **not applied remotely**
- Games Catalog Foundation V1 (`20260847`) — **not applied remotely**
- Catalog contracts: `validateGamesCatalogDefinition`,
  `upsertGamesCatalogEntryTrusted` → `upsert_game_catalog_entry`

---

## Purpose

Provide a fail-closed, metadata-only registration foundation for the first
approved UM Games title (**UM Kick Blast**) using the existing Catalog admin
upsert authority. This slice is application/code readiness only.

## Seed metadata (UM Kick Blast)

| Field | Value | Notes |
| --- | --- | --- |
| `game_key` | `kick_blast` | Stable key |
| `slug` | `kick-blast` | Stable slug |
| `name` | `UM Kick Blast` | Official product title |
| `description` | `null` | No evidenced copy |
| `short_blurb` | `null` | No evidenced copy |
| `status` | `active` | Required for Hub display (Hub hides drafts) |
| `availability` | `coming_soon` | Visible, non-playable |
| `visibility` | `authenticated` | Authenticated catalog visibility |
| `category` | `action` | **Provisional repository convention only** — schema requires a concrete allowlisted category; not final product classification |
| `difficulty` | `unset` | No evidenced difficulty |
| `min_players` / `max_players` | `1` / `1` | Solo metadata |
| `platforms` | `["web"]` | Only evidenced platform |
| `feature_flags.sessions_enabled` | `false` | Hard non-playable gate |
| other feature flags | `false` | Fail-closed for non-playable title |
| `catalog_version` | `1` | Initial |
| `content_version` | `null` | Deferred |
| `sort_order` | *(omitted)* | Contract/DB default `0` — no invented production ordering |
| `is_featured` | `false` | Not featured |
| `result_validation_mode` | `fail_closed` | Platform default |

No production URLs, asset URLs, runtime identifiers, age ratings, or ownership
claims are included.

## Authorization path

```
registerGamesCatalogTitleSeed
  → auth.assertPlatformAdmin()   // app-layer fail-closed
                                 // (caller supplies assertPlatformAdminDb /
                                 //  is_platform_admin)
  → resolve allowlisted seed only
  → validate sessions_enabled === false
  → upsertGamesCatalogEntryTrusted
       → validateGamesCatalogDefinition
       → rpc upsert_game_catalog_entry(p_def)
       → SQL re-checks is_platform_admin
       → parseGamesCatalogEntryView (reject unexpected shape)
```

Database RPC authorization remains authoritative. Seed definitions are
immutable, bounded application inputs — not client payloads. UI never receives
write-capable objects from this module.

## Fail-closed behavior

Rejected when:

- platform-admin auth is missing / false / throws
- seed id is unknown or definition fails validation
- `sessions_enabled` is not strictly `false`
- Catalog upsert RPC errors (including missing remote schema prerequisites)
- upsert response fails EntryView parse

## Code-ready vs remote-ready

| State | Meaning |
| --- | --- |
| **Code-ready** (this slice) | Seed constants, admin-gated registration function, Catalog upsert helper, tests, docs exist in-repo |
| **Remote-ready** (deferred) | Migrations `20260846` + `20260847` applied; a real platform-admin session invokes `registerGamesCatalogTitleSeed` once |

Until remote prerequisites exist, registration fails closed (expected).

## Hub visibility note

`active` + `coming_soon` + `authenticated` + `sessions_enabled=false` is
compatible with current Hub display rules as a **non-playable** card. Hub
availability/play rules were not weakened.

## Deferred ops (intentional)

1. Apply Supabase migrations `20260846` and `20260847` (human/ops only).
2. Execute a one-time admin registration call under a real platform-admin JWT
   (human/ops only) — e.g. server/admin context calling
   `registerGamesCatalogTitleSeed(client, { assertPlatformAdmin: () =>
   assertPlatformAdminDb(supabase) }, "kick_blast")`.
3. Do **not** use service-role bypass or direct SQL insert/update for seeding.

## Out of scope

Gameplay, sessions, matchmaking, multiplayer, UI redesign, Ads/Store/Learning/
World, migration apply, remote seed execution.
