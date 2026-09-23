# Cursor Report — feat/quran-hifz-v1 (سماء الحفظ)

## Summary

Hidden calm Quran memorization prototype **سماء الحفظ** for Surah Ash-Shams (91) only, at `/hifz/shams`. Branched from `origin/release/v1` @ `aa2f3ae5`. Six modes (تعلّم، تلاشٍ، الحروف الأولى، الوصل، الترتيب، السماء), Amiri Quran (SIL OFL), WebP art for ayat 1–6, localStorage-only sky progress, `noindex` + robots disallow `/hifz`. No nav/sitemap links. No Supabase. No merge/deploy/PR.

```
TASK_ID = FEAT_QURAN_HIFZ_V1
BRANCH = feat/quran-hifz-v1
BASE = origin/release/v1 @ aa2f3ae5a970902f0284e2faebd126a263b87bb7
```

### Quran text provenance (critical)

- **Primary download:** Quran.com API v4 Uthmani  
  `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=91`  
  Stored in `data/hifz/ash-shams-91.uthmani.json` (15 ayat).
- **Secondary cross-check:** Tanzil.net Uthmani txt-2  
  `https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true`
- **Word-by-word match:** **yes (100%)** for ayah bodies. Tanzil ayah 1 includes a leading basmala (4 tokens) before the ayah body; after suffix-match removal of that prefix, bodies matched. Ayat 2–15 exact.
- **Ayah count:** 15 on both sources before use.

### Font

- Amiri Quran Regular from Google Fonts OFL tree  
  `https://raw.githubusercontent.com/google/fonts/main/ofl/amiriquran/AmiriQuran-Regular.ttf`  
  + `OFL.txt` in `public/fonts/amiri-quran/` (SIL Open Font License).

### Images

- Source folder: `C:\Users\Giga store\Desktop\quran-art` (6 ChatGPT-named PNGs, ordered by mtime → shams-1…6). OneDrive path not found.
- Output: `public/hifz/shams/shams-1.webp` … `shams-6.webp` — all ≤800px and **under 150 KB** (6/6).

## Exact files changed

- `app/hifz/layout.tsx`
- `app/hifz/shams/page.tsx`
- `app/hifz/shams/HifzShamsExperience.tsx`
- `app/hifz/shams/hifz-shams.css`
- `data/hifz/ash-shams-91.uthmani.json`
- `data/hifz/SOURCES.md`
- `lib/hifz/types.ts`
- `lib/hifz/tokenize.ts`
- `lib/hifz/ashShamsData.ts`
- `lib/hifz/linking.ts`
- `lib/hifz/progress.ts`
- `lib/hifz/ashShamsData.test.ts`
- `lib/site/indexing.ts` (`/hifz` in `ROBOTS_DISALLOW_PATHS`)
- `vitest.config.ts` (include `lib/hifz/**/*.test.ts`)
- `public/fonts/amiri-quran/AmiriQuran-Regular.ttf`
- `public/fonts/amiri-quran/OFL.txt`
- `public/hifz/shams/shams-1.webp` … `shams-6.webp`
- `docs/ai/CURSOR_REPORT.md` (this report)

Not committed: `docs/ai/IOS_STATUS_AR.md`, `.local/`, `tmp/`, `worktrees/`.

## Migrations created

none

## Security review

- Hidden route: page metadata `noindex`/`nofollow`; `/hifz` added to robots disallow; not in sitemap static routes; not linked from home/games nav (HTTP spot-check).
- Progress only in `localStorage` (`hifz:shams:v1`) — no server, no Supabase, no accounts.
- Quran text only from downloaded verified sources; load refuses data without `crossCheckWordByWord100Percent`.
- No secrets committed. Font OFL license file shipped with the font.

## Tests

- `npx vitest run lib/hifz` — **9 passed**
- `npx vitest run lib/site/googleSeo.test.ts` — **11 passed** (with hifz disallow)

## TypeScript

- `npx tsc --noEmit` — **pass** (after production build regenerated `.next` types; earlier stale `.next` cache had unrelated broken validators)
- `npm run build` TypeScript phase — **pass**

## Build

- `npm run build` — **pass**; route `/hifz/shams` present in output

## git diff --check

- **pass** (no whitespace errors)

## git status --short

(after commit; see final push notes)

## Open issues

- Browser MCP (`cursor-ide-browser`) could not open a tab (“No browser tab available”); verified instead via HTTP 200 + RTL/Arabic markers on `/hifz/shams`, and confirmed `/` and `/games` do not link `/hifz`.
- Image sources were not named `shams-1`…`shams-6`; used mtime order of the six Desktop `quran-art` PNGs.
- Prototype covers Surah 91 only by design.
