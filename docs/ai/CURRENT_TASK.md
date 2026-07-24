# Current Task

## Task title

UMTUBA — Games Achievements Lookup Trusted V1

## Goal

Add a fail-closed trusted application client for the existing owner-only
Games Platform achievements lookup RPC (`get_my_game_achievements`), without
creating unlock, reward, economy, Catalog, Hub Runtime, or playable authority.

## Allowed scope

- `lib/games/gamesAchievements.ts`
- `lib/games/gamesAchievements.test.ts`
- `docs/games/implementation/GAMES_ACHIEVEMENTS_LOOKUP_TRUSTED_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Learning / Ads / Store / World / Financial / Social
- New Supabase migrations; apply of `20260846` or `20260847`
- Remote achievements lookup execution
- Achievement unlock mutation
- Rewards / wallet / points / economy
- `start_game_session` / `submit_game_session_result` clients
- Hub or detail-page UI / playable runtime / Kick Blast gameplay
- Matchmaking / multiplayer
- Connecting achievements to Hub `runtime.*` / `platformSessionId`
- Catalog pre-read for existence proof
- Merge / push to `alpha-0.2`
- Unrelated files

## Branch

`office/games-achievements-lookup-trusted-v1`

Required parent: `office/games-progress-lookup-trusted-v1` at
`f6de5137dd399ac1841e756b9289943988585889`

## Status

complete — PASS
