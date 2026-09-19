# Current Task

## Task title

FEAT_GAMES_ARTWORK_TILES_V1

## Status

COMPLETE. Owner artwork for 13 playable games is optimized, wired into `/games`, verified, committed, and pushed to `feat/games-v1`. Not deployed. No SQL applied. `release/v1` was not pushed.

```
TASK_ID = FEAT_GAMES_ARTWORK_TILES_V1
STATUS = COMPLETE
DATE = 2026-09-19
BRANCH = feat/games-v1
WORKTREE = C:\Users\1\Desktop\umtuba\worktrees\FEAT-GAMES-V1
COMMIT = e0bc1533f5a69687ed1d300c7071333efebcd35f
PARENT = 5209309253cb2da7aa0a162be70de43db120b75f
REMOTE = origin/feat/games-v1 (pushed)
SOURCE_ART = C:\Users\1\Desktop\game-art
PRODUCTION_DB = DO_NOT_TOUCH
SUPABASE_DB_PUSH = FORBIDDEN
DEPLOY = FORBIDDEN
PUSH_RELEASE_V1 = FORBIDDEN
```

## Allowed scope

- Copy owner PNGs from this machine's Desktop `game-art` folder.
- Optimize to WebP ≤512px, well under 100 KB, into `public/games/art/`.
- Wire the 13 slugs into the games catalogue via `next/image`.
- Keep SVG tiles for the other 16 games.
- Verify with tsc, production build, and Playwright `/games` (ar/en, 390/1280).
- Commit `feat(games): artwork tiles for 13 games` and push `feat/games-v1` only.

## Forbidden scope

- Do not deploy.
- Do not apply Supabase migrations or run `supabase db push`.
- Do not push `release/v1`.
- Do not commit original 1024px PNGs if optimized WebP is enough.
- Do not redesign the mixed photo/SVG grid without asking.
- Do not print secrets / `.env`.
