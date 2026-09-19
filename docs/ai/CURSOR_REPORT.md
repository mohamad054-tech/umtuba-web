# Cursor Report — games artwork tiles 2026-09-19

## Summary

Owner artwork for 13 playable games was copied from this machine, resized to 512 WebP (no PNG fallback), wired into the `/games` catalogue with `next/image`, and left as SVG for the other 16 games. Verified with `tsc`, production build, and Playwright (ar/en at 390 and 1280). Committed and pushed to `feat/games-v1` only.

```
TASK_ID = FEAT_GAMES_ARTWORK_TILES_V1
STATUS = COMPLETE
BRANCH = feat/games-v1
WORKTREE = C:\Users\1\Desktop\umtuba\worktrees\FEAT-GAMES-V1
COMMIT = e0bc1533f5a69687ed1d300c7071333efebcd35f
MESSAGE = feat(games): artwork tiles for 13 games
PUSHED = YES (feat/games-v1 only)
DEPLOYED = NO
SQL_APPLIED = NO
RELEASE_V1_PUSHED = NO
SOURCE_FOLDER = C:\Users\1\Desktop\game-art
```

All 13 source filenames matched the slugs exactly (lowercase). Nothing missing. No case remapping. Original 1024 PNGs were not committed.

## Exact files changed

In commit `e0bc1533`:

- `app/games/GamesCatalog.tsx`
- `app/games/play/GameArt.tsx`
- `app/games/play/games-play.css`
- `lib/games/play/catalog.ts`
- `lib/games/play/catalog.test.ts`
- `lib/games/play/playwright-art-tiles.mjs` (new)
- `public/games/art/sudoku.webp`
- `public/games/art/snake.webp`
- `public/games/art/g2048.webp`
- `public/games/art/memory.webp`
- `public/games/art/xo.webp`
- `public/games/art/hanoi.webp`
- `public/games/art/solitaire.webp`
- `public/games/art/uno.webp`
- `public/games/art/wheel.webp`
- `public/games/art/shapes.webp`
- `public/games/art/typerace.webp`
- `public/games/art/hangword.webp`
- `public/games/art/guess-city.webp`

Handoff docs written after the push (this file + `docs/ai/CURRENT_TASK.md`).

Local only, not committed: `tmp/games-art-shots/` (Playwright screenshots).

## Source folder

`C:\Users\1\Desktop\game-art`

13 PNGs, 1024×1024, names = slugs:

`sudoku`, `snake`, `g2048`, `memory`, `xo`, `hanoi`, `solitaire`, `uno`, `wheel`, `shapes`, `typerace`, `hangword`, `guess-city`

Missing / misnamed: none.

## Per-file sizes

| File | Before (PNG 1024) | After (WebP ≤512) |
| --- | ---: | ---: |
| sudoku | 1,673,168 | 22,466 |
| snake | 1,699,850 | 14,942 |
| g2048 | 2,114,628 | 26,878 |
| memory | 2,016,900 | 24,812 |
| xo | 1,849,296 | 23,024 |
| hanoi | 1,720,134 | 14,304 |
| solitaire | 2,024,032 | 26,440 |
| uno | 2,004,452 | 32,078 |
| wheel | 2,137,404 | 27,964 |
| shapes | 1,767,157 | 23,770 |
| typerace | 1,961,682 | 31,338 |
| hangword | 1,841,606 | 27,064 |
| guess-city | 2,106,738 | 34,302 |
| **Total** | **24,917,047 (23.8 MB)** | **329,382 (322 KB)** |

No file needed a PNG fallback. All WebP files are well under 100 KB (max 34,302).

## Catalogue wiring

- `GAME_ARTWORK_SLUGS` / `hasGameArtwork` / `gameArtworkSrc` in `lib/games/play/catalog.ts`.
- `GameArt` uses `next/image` for those 13 slugs (`width={512}` `height={512}`, `sizes` for 2/3/4-col grid).
- Alt text = existing i18n game title.
- First 4 tiles: `priority`. First 8: eager. Rest: lazy.
- CSS: `.um-play-card-art img` fills the same square as SVG (`object-fit: cover`).
- Other 16 games keep current SVG art.

## Mixed grid note

Photo + SVG tiles share navy + gold. Photo tiles have more glow; SVG tiles are flatter. Acceptable. Optional later (not done): matching photos for the remaining 16, or a light gold frame on SVG tiles.

## Migrations created

none

## Security review

- Original owner artwork only. No third-party stock URLs.
- Public static assets under `/games/art/*.webp`. No secrets / `.env` reads.
- No SQL. No deploy. No `release/v1` push.

## Tests

- `lib/games/play/catalog.test.ts` — 3/3 PASS (includes 13 WebP files exist, each `< 100 KB`, SVG remaining for the other slugs).
- Playwright `lib/games/play/playwright-art-tiles.mjs` — PASS. Locales `ar`+`en`, viewports 390 and 1280. All 13 images `complete` and `naturalWidth > 0`. No broken images. No card-top layout shift after load. Screenshots:

```
C:\Users\1\Desktop\umtuba\worktrees\FEAT-GAMES-V1\tmp\games-art-shots\games-art-en-390.png
C:\Users\1\Desktop\umtuba\worktrees\FEAT-GAMES-V1\tmp\games-art-shots\games-art-en-1280.png
C:\Users\1\Desktop\umtuba\worktrees\FEAT-GAMES-V1\tmp\games-art-shots\games-art-ar-390.png
C:\Users\1\Desktop\umtuba\worktrees\FEAT-GAMES-V1\tmp\games-art-shots\games-art-ar-1280.png
```

`/games` transferSize (approx before = after − art bytes):

| Viewport | Before | After | Art |
| --- | ---: | ---: | ---: |
| en 390 | 677,121 | 817,875 | 140,754 |
| en 1280 | 685,627 | 890,319 | 204,692 |
| ar 390 | 670,202 | 810,956 | 140,754 |
| ar 1280 | 675,557 | 880,249 | 204,692 |

## TypeScript

`npx tsc --noEmit` PASS (after a real `npm install` in this worktree; the old `node_modules` junction was missing `maplibre-gl`).

## Build

`npm run build` PASS.

## git diff --check

PASS on the artwork commit files.

## git status --short

After artwork commit + push, before this handoff write:

```
## feat/games-v1...origin/feat/games-v1
?? tmp/
```

## Open issues

- Mixed photo/SVG grid is acceptable; no redesign done.
- Playwright screenshots live only under `tmp/` (untracked).
- Worktree still has a local `.next` production build from verification.
- Do not deploy. Do not apply SQL. Do not push `release/v1`.
- Next agent: wait for owner go, or the next games task. Do not touch `feat/world-map-v1` unless explicitly asked.
