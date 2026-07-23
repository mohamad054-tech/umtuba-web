# UM Games — Platform Foundation V1

Status: **implemented locally** (migration **NOT APPLIED** remotely)

Migration: `supabase/migrations/20260846_games_platform_foundation_v1.sql`

Constants / contracts: `lib/games/gamesFoundation.ts`

---

## Purpose

Shared, server-authoritative foundation for **all** UMTUBA games: catalog,
lightweight player profile, sessions, claim-based results, per-game
progression, achievements, and privacy defaults.

## Locked decisions

1. **No playable game** in this slice — schema + RPCs + contracts only.
2. **Session ≠ result** — separate tables; lifecycle owned by the server.
3. **Client result = claim** — allowlisted fields only; fail-closed.
4. **At most one `active` session** per `(user_id, game_id)`.
5. **Session TTL** — catalog `session_ttl_seconds` (60–86400, default 3600);
   expired sessions cannot submit.
6. **Privacy defaults all private** — opt-in only for achievements / best
   score / level-or-progress / activity.
7. **No public leaderboards** and no cross-player read policies.
8. **UM Points firewall** — Games V1 never awards points or mutates wallet
   ledgers/balances.
9. **No Ads activation** — `game_key` is not an Ads placement id.
10. **Activity Tiers are not** game achievements.

## Out of scope (V1)

Playable games, full Games UI, multiplayer, leaderboards, UM Points rewards,
Live/World event logic, Ads `GAMES` placement enablement, service role in UI.

## Tables

| Table | Role |
| --- | --- |
| `games` | Catalog (`game_key`, `slug`, status, validation mode, TTL) |
| `game_player_profiles` | Lightweight Games player row (≠ social profile) |
| `game_privacy_settings` | Opt-in sharing flags (default false) |
| `game_sessions` | Server-owned session lifecycle |
| `game_session_results` | Claim + decision; 1:1 with session |
| `game_player_progress` | Per-game summary (server-written) |
| `game_achievements` | Per-game achievement catalog |
| `game_player_achievements` | Idempotent unlocks |

Reserved nullable columns (no FKs, non-authoritative): `city_id`,
`world_event_id`, `live_room_id`, `community_project_id` on `games` and
`game_sessions`.

## Session statuses

`active` → `submitted` | `expired` | `cancelled`  
Submit path may atomically decide `accepted` | `rejected`.

TTL: lazy expiry via `game_session_expire_if_due` (no background job).

## RPC contracts

| RPC | Access | Notes |
| --- | --- | --- |
| `start_game_session(game_id)` | authenticated | Resumes active or creates; requires `games.status=active` |
| `submit_game_session_result(session_id, idempotency_key, claim)` | authenticated | Owner-only; validates claim; idempotent replay |
| `get_my_game_session(session_id)` | authenticated | Owner-only; shared deny message |
| `get_my_game_progress(game_id)` | authenticated | Own summary |
| `get_my_game_achievements(game_id)` | authenticated | Own unlocks |
| `get_my_game_privacy_settings()` | authenticated | Ensures defaults |
| `update_my_game_privacy_settings(patch)` | authenticated | Boolean opt-in keys only |

### Internal helpers (EXECUTE revoked from `authenticated`)

- `game_ensure_player_profile`
- `game_ensure_privacy_settings`
- `game_session_expire_if_due`
- `game_validate_client_result_claim`
- `game_apply_accepted_result`

All `SECURITY DEFINER` with `SET search_path = public`. Sensitive tables use
ENABLE + FORCE RLS; authenticated SELECT owner-only (or active catalog);
INSERT/UPDATE/DELETE revoked — writes via RPCs only.

## Trust / anti-cheat boundaries (not full anti-cheat)

V1 establishes trust boundaries only:

- Claim allowlist: `score`, `level`, `experience_delta`, `duration_ms`, `client_meta`
- Authoritative denylist rejected (`server_score`, `um_points`, …)
- Finite non-negative score; range caps; payload size caps
- Idempotency key unique per `(user_id, game_id)`
- Session ownership + expiry
- No duplicate accepted row per session (`session_id` unique)
- Fail-closed `result_validation_mode`

Does **not** prove fair play, detect bots, or certify scores for economy.

## Privacy model

Defaults: all share flags `false`.  
Opt-in fields only: achievements, best score, level/progress, activity.  
V1 does **not** implement public reads based on these flags.

## UM Points firewall

Games Foundation SQL and TS must not call or mutate:

- `award_um_points` / `award_um_points_to_user`
- `um_point_balances` / `um_points_ledger`
- welcome/referral claim awards

Future integration may call internal Points writers from a **separate** approved
slice with fixed server rules — never from client scores directly.

## Future integration boundaries

Nullable reserved ids only. No FKs to missing systems. No Live/World/Ads logic.

## Migration apply status

**NOT APPLIED** to remote Supabase. Git-only until explicitly approved.

## Rollback considerations

Additive migration. Rollback = drop Games RPCs/helpers/tables in reverse
dependency order in a future down migration (not shipped here). Do not edit
prior Learning migrations (`20260828`–`20260841`).
