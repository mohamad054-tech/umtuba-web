# Cursor Report — feat/translations-11-locales

## Summary

Translated leftover English UI strings in the 11 locales that are not English or Arabic (`fr`, `es`, `de`, `pt`, `id`, `hi`, `ru`, `tr`, `zh-CN`, `ja`, `ko`). Branch was created from `bd1ab74a1ca95317acab0a1560607a52a0a345c1`. No deploy. No merge. No pull request.

```
BRANCH = feat/translations-11-locales
BASE = bd1ab74a1ca95317acab0a1560607a52a0a345c1
DEPLOY = NO
MERGE = NO
PUSH = origin feat/translations-11-locales
```

Arabic UI was not rewritten. Legal catalogs and legal markdown were not edited. Quran text, tafsir, and translation-of-meanings were not edited. `quranUiCopy.ts` stays bilingual Arabic/English by its existing contract. None of the 11 locales is RTL; `dir` / locale direction logic was not changed.

A local modification to this file from `fix/legal-operator-details-v1` is in `stash@{0}` (`legal CURSOR_REPORT before translations branch`) and was not committed here.

## Exact files changed

- `lib/i18n/messages/uiEnglishClosures.ts` — translations for UI keys that still matched English
- `lib/i18n/messages/catalogs.ts` — spread those closures last, after the game overlays
- `lib/i18n/appShellTranslation.test.ts` — expect the existing French consent label `Accepter`
- `lib/world/worldMapSafety.test.ts` — expect French map title `Carte`

## Migrations created

None.

## Security review

No auth, payment, or data-access changes. Placeholders such as `{start}`, `{end}`, and `{radius}` were not rewritten. Brand strings `UMTUBA`, `UM Life`, and `Hello City` stay as-is. Map attribution keeps `OpenFreeMap`, `OpenMapTiles`, and `OpenStreetMap`.

## Tests

- `npx vitest run lib/i18n lib/world/worldMapSafety.test.ts` — 19 files, 107 tests, PASS
- `npm test` — 446 files passed, 23 failed, 26 failed tests, 11 skipped. The i18n tests pass. Failures checked against this branch with the translation files stashed are pre-existing, including Translation Studio seed hash / row-count tests (`expected 88, got 145`) and the App Shell inventory count (`expected 146, got 145`). Other failures are outside i18n (wallet formatting, learning route snapshots, nav contract scans, local Supabase gate). Not fixed.

## TypeScript

`npx tsc --noEmit` — PASS

## Build

`npm run build` — PASS (existing Turbopack filesystem-tracing warnings in translation studio, not from this change)

## git diff --check

PASS (no whitespace errors)

## git status --short

Committed: the four files above. Left untracked and uncommitted: `.local/`, `tmp/`, `worktrees/`.

## Open issues

Some short labels stay identical to English because they are the normal word in that language, or because the surrounding copy already uses that loanword (`Store`, `Stories`, `Creator`, `Likes` in German; `Notifications`, `Question`, `Social` in French; `Ideas`, `Global`, `Instructor` in Spanish). Product names left unchanged: `UMTUBA`, `UM Life`, `Hello City`, `UMTUBA Learning`, `CPU`, `2048`, `Sudoku` where that spelling is the name, and `DEMO` where the Latin badge is the usual form. `learning.oneToOne.range` stays `{start} – {end}`.
