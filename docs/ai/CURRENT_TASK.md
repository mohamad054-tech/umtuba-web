# Current Task

## Task title

UMTUBA — Games Privacy Settings Lookup Trusted V1

## Goal

Add a fail-closed authenticated client for the existing
`get_my_game_privacy_settings` RPC while explicitly preserving and documenting
its ensure-on-read database side effects. Return owner privacy preference
metadata only — no public-sharing, Hub, reward, economy, or playability
authority.

## Allowed scope

- `lib/games/gamesPrivacySettings.ts`
- `lib/games/gamesPrivacySettings.test.ts`
- `docs/games/implementation/GAMES_PRIVACY_SETTINGS_LOOKUP_TRUSTED_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Learning / Ads / Store / World / Financial / Social
- New Supabase migrations; apply of `20260846` or `20260847`
- Remote privacy lookup execution
- `update_my_game_privacy_settings` client
- Public privacy / sharing read surface
- Hub Runtime / achievements UI / progress UI / profiles / feeds / leaderboards wiring
- Rewards / wallet / points / economy
- `start_game_session` / `submit_game_session_result` clients
- Playable runtime / Kick Blast gameplay / matchmaking / multiplayer
- Application-side ensure or duplicate default-row logic
- Merge / push to `alpha-0.2`
- Unrelated files

## Branch

`office/games-privacy-settings-lookup-trusted-v1`

Required parent: `office/games-achievements-lookup-trusted-v1` at
`22a778201e54bb0b2f8ceee816e0f131d8a440b0`

## Status

complete — PASS
