# Current Task

## Task title

UMTUBA — Games Privacy Settings Update Trusted V1

## Goal

Add a fail-closed authenticated owner-only client for the existing
`update_my_game_privacy_settings` RPC while explicitly preserving and
documenting its ensure-on-write database side effects. Return owner privacy
preference metadata only — no public-sharing, Hub, reward, economy, or
playability authority.

## Allowed scope

- `lib/games/gamesPrivacySettings.ts`
- `lib/games/gamesPrivacySettings.test.ts`
- `docs/games/implementation/GAMES_PRIVACY_SETTINGS_UPDATE_TRUSTED_V1.md`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Forbidden scope

- Learning / Ads / Store / World / Financial / Social
- New Supabase migrations; apply of `20260846` or `20260847`
- Remote privacy lookup or update execution
- Public privacy / sharing read surface
- Hub Runtime / achievements UI / progress UI / profiles / feeds / leaderboards wiring
- Rewards / wallet / points / economy
- `start_game_session` / `submit_game_session_result` clients
- Playable runtime / Kick Blast gameplay / matchmaking / multiplayer
- Application-side ensure or duplicate default-row logic
- Merge / push to `alpha-0.2`
- Unrelated files

## Branch

`office/games-privacy-settings-update-trusted-v1`

Required parent: `office/games-privacy-settings-lookup-trusted-v1` at
`85c0cd6428dc73e8140d3052f6be2b84ea972f53`

## Status

complete — PASS
