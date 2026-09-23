# Cursor Report — feat/quran-hifz-path-v1 (guided path UX)

## Summary

Redesigned `/learning/quran/shams` from nine top mode buttons into one calm guided memorization path. Main screen stays quiet: current step, verse/audio for that step, one «التالي», plus a small row for «مراجعات اليوم» / «خريطة الحفظ» / «أدوات أخرى». Spaced self-ratings are stored on-device only. Branch created from live Quran+games commit `e63f2377ab7696d5603d45934fa222d2b43516a4`. No deploy. No merge. `release/v1` untouched.

```
BRANCH = feat/quran-hifz-path-v1
BASE = e63f2377ab7696d5603d45934fa222d2b43516a4
DEPLOY = FORBIDDEN
MERGE = FORBIDDEN
```

### Guided path (Arabic on-screen)

استمع → كرّر → الآية كاملة → بعض الكلمات مخفية → الحروف الأولى → مخفية بالكامل → من الذاكرة → كيف كان حفظك؟  
After «حفظتها»: وصل — هذه الآية → وصل — الآية التالية → وصل — الآيتان معاً  
After last ayah: السورة من الصور (text hidden; «أظهر الآية» per verse; night sky if no image)

### أدوات أخرى

رتّب الآيات · وصل التلاوة · السورة كاملة · البسملة · الوصل · الاستماع بلا نظر

### Review ladder (localStorage only)

- أعدها = later today (+4 hours)
- متردد = tomorrow (+1 day)
- حفظتها = 3 → 7 → 14 → 30 → 60 days (streak grows; caps at 60)

### Images

Ayat **1–6** have `public/hifz/shams/shams-{n}.webp`. Ayat **7–15** have no image (night sky only).

## Exact files changed

- `app/learning/quran/shams/HifzShamsExperience.tsx` — guided-path UX rewrite
- `app/learning/quran/shams/useHusaryPlayer.ts` — `startQueue` for chain-link audio
- `lib/hifz/reviewSchedule.ts` — spaced schedule + map status helpers
- `lib/hifz/reviewSchedule.test.ts` — unit tests for ratings / due / map
- `lib/hifz/pathSteps.ts` — pure path state machine
- `lib/hifz/pathSteps.test.ts` — path advancement / chain / surah memory
- `lib/hifz/progress.ts` — progress v2, `rateAyah`, v1 migrate, `listDueToday`
- `lib/hifz/types.ts` — HifzLocalProgress v2 + tool types
- `docs/ai/CURSOR_REPORT.md` — this report

## Migrations created

none

## Security review

- Progress and reviews stay device-only (`localStorage` via `rateAyah` / `readProgress`).
- No secrets, no env values printed, no remote DB, no service-role use.
- Quran ayah / tafsir / meanings strings were not invented or edited.
- Husary audio still streamed from Quran.com CDN (not copied into repo).
- Page stays noindex. Old `/hifz/shams` permanent redirect unchanged.
- Games / video / watch not modified.

## Tests

```
npx vitest run lib/hifz/reviewSchedule.test.ts lib/hifz/pathSteps.test.ts lib/hifz/ashShamsData.test.ts lib/hifz/audio.test.ts
```

**PASS** — 4 files, 39 tests.

## TypeScript

```
npx tsc --noEmit
```

**PASS** (exit 0)

## Build

```
npm run build
```

**PASS** (exit 0). Routes include `/learning/quran` and `/learning/quran/shams`. Unrelated Turbopack filesystem-tracing warnings in translation-studio remain.

## git diff --check

**PASS** (no whitespace errors; CRLF conversion warnings only)

## git status --short

(relevant to commit)

- `M app/learning/quran/shams/HifzShamsExperience.tsx`
- `M app/learning/quran/shams/useHusaryPlayer.ts`
- `M lib/hifz/progress.ts`
- `M lib/hifz/types.ts`
- `A lib/hifz/pathSteps.ts`
- `A lib/hifz/pathSteps.test.ts`
- `A lib/hifz/reviewSchedule.ts`
- `A lib/hifz/reviewSchedule.test.ts`
- `M docs/ai/CURSOR_REPORT.md`

Unrelated dirt not committed: `.local/`, `tmp/`, `docs/ai/IOS_STATUS_AR.md`, `worktrees/`, `AGENTS.md` (stash).

## Open issues

- cursor-ide-browser MCP could not open a usable tab (tabs list empty / navigate failed). Local production server was started on port 3461 for manual check; automated phone/wide viewport browser pass was **not** verified.
- Auto-play may start on listen / repeat / link steps; pause/stop remain available.
