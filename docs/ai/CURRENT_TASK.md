# Current Task

## Task title

UM Games — Catalog Foundation V1

## Goal

Authoritative games catalog registry (definitions, lifecycle, availability,
visibility, feature flags, platforms, player counts, categories, difficulty,
versioning) so future games register without app-code changes. No gameplay,
economy, UM Points, Ads, matchmaking, leaderboards, or anti-cheat.

## Allowed scope

- `supabase/migrations/20260843_games_catalog_foundation_v1.sql`
- `docs/games/implementation/GAMES_CATALOG_FOUNDATION_V1.md`
- `lib/games/gamesCatalog.ts`
- `lib/games/gamesCatalog.test.ts`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Editing `20260842` / Platform Foundation files (except REPLACE of
  `start_game_session` inside **new** migration only)
- Gameplay / canvases / matchmaking / anti-cheat engines
- UM Points awarding / Ads activation / public leaderboards
- Ads, Store, Learning, World, Financial modules
- Remote Supabase apply
- Merge into `alpha-0.2` unless explicitly requested

## Branch

`office/games-platform-foundation-v1` (continues after Platform Foundation
commit `043257b`)

## Status

`implemented — verified (games 45/45, tsc, build, git diff --check clean); migration 20260843 Git-only; not applied; committed/pushed on feature branch only when push done.`

---

## Prior completed on this branch

### UM Games — Platform Foundation V1

`complete @ 043257b; migration 20260842 Git-only.`