# Current Task

## Task title

UM Games — Platform Foundation V1

## Goal

Create a shared, server-authoritative Games foundation: catalog, lightweight
player profile, sessions, claim-based results, per-game progression,
achievements, privacy defaults, anti-cheat trust boundaries, and reserved
future integration fields. No playable game, no full Games UI, no multiplayer,
no leaderboards, no UM Points awards, no Ads activation.

## Allowed scope

- `supabase/migrations/20260842_games_platform_foundation_v1.sql`
- `docs/games/implementation/GAMES_PLATFORM_FOUNDATION_V1.md`
- `lib/games/gamesFoundation.ts`
- `lib/games/gamesFoundation.test.ts`
- `vitest.config.ts` (include `lib/games/**/*.test.ts` only)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Playable games / canvases / multiplayer
- Public leaderboards or cross-player score reads
- UM Points awarding / ledger / balance mutation
- Ads `GAMES` placement activation
- Live / World / community project logic
- Activity Tiers as game achievements
- Editing migrations `20260828`–`20260841`
- Remote Supabase apply
- Commit / push / merge into `alpha-0.2` unless explicitly requested

## Branch

`office/games-platform-foundation-v1` from `alpha-0.2` @
`9cf3e3da6779ddb3a5686d18f8d11ca503652e88`

## Status

`implemented — verified (games 27/27, tsc, build, git diff --check clean);
migration 20260842 Git-only; not applied to Supabase; not committed/pushed/merged.`

---

## Prior completed (alpha-0.2)

### UM Learning — Learner Result Delivery V1

`complete on alpha-0.2 @ 9cf3e3d; migration 20260841 Git-only until separately
applied.`

### Ads Platform — Fraud & Invalid Traffic / Billing & Charging

`complete on alpha-0.2 lineage.`
