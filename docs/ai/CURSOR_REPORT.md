# Cursor Report — feat/quran-hifz-v1 (Learning move + sourced tafsir)

## Summary

Moved Surah ash-Shams into Learning (`/learning/quran`, `/learning/quran/shams`) with a distinct free section **القرآن الكريم والحديث الشريف** on `/learning`. Legacy `/hifz/shams` permanently redirects (308). Added sourced **التفسير الميسر** (Arabic) and verified QuranEnc meanings for site languages that have downloads; Korean omitted (no QuranEnc edition). Every tafsir/meanings string was downloaded twice from QuranEnc and SHA-256 matched before shipping. No invented Quran/tafsir/translation text. No hadith UI. Audio still streamed (Husary). Pages stay noindex / robots-disallowed / off sitemap. No Supabase. No merge/deploy/PR.

```
TASK_ID = FEAT_LEARNING_QURAN_MOVE_AND_SOURCED_TAFSIR_V1
BRANCH = feat/quran-hifz-v1
BASE = origin/feat/quran-hifz-v1 @ 8608d2928ae36dc0720d5afd3ee1fb258ba0abf9
```

### PART A — Learning home

- Section appears on **`/learning`** (Learning hub home / dashboard), above continue-learning / partner courses.
- New addresses: `/learning/quran` (section home — ash-Shams only) and `/learning/quran/shams` (experience).
- Old `/hifz/shams` → **308 permanent** redirect to `/learning/quran/shams` (`next.config.ts` + `lib/hifz/routes.ts`). Old interactive page removed.

### PART B — Sources per site locale

| Locale | Source shipped |
| --- | --- |
| ar | التفسير الميسر (KFGQPC via QuranEnc `arabic_moyassar`) — tafsir only |
| en | المختصر في تفسير القرآن الكريم (`english_mokhtasar`) |
| fr | المختصر (`french_mokhtasar`) |
| es | المختصر (`spanish_mokhtasar`) |
| de | German Translation — Frank Bubenheim (`german_bubenheim`) — no mukhtasar on QuranEnc |
| pt | Portuguese Translation — Helmi Nasr (`portuguese_nasr`) — no mukhtasar on QuranEnc |
| id | المختصر (`indonesian_mokhtasar`) |
| hi | المختصر (`hindi_mokhtasar`) |
| ru | المختصر (`russian_mokhtasar`) |
| tr | المختصر (`turkish_mokhtasar`) |
| zh-CN | المختصر (`chinese_mokhtasar`) |
| ja | المختصر (`japanese_mokhtasar`) |
| ko | **no verified source, omitted** |

Cross-check: dual downloads byte-identical (SHA-256) for every shipped edition → `crossCheckWordByWord100Percent: true`.

### License / terms (plain language)

- **QuranEnc** (`https://quranenc.com/en/home/contact_us`): Contents may be downloaded and **re-published** if: (1) no modification/addition/deletion; (2) clearly credit publisher + QuranEnc.com; (3) mention version number; (4) keep transcript info; (5) notify QuranEnc of notes; (6) update to latest; (7) no inappropriate ads. → **Copy into project allowed** under those rules; we store JSON + show attribution + version identity.
- **KFGQPC / التفسير الميسر**: Official developer page `https://qurancomplex.gov.sa/quran-dev/` describes developer files for apps; **live fetch from this machine timed out (ETIMEDOUT)**. Text was obtained via QuranEnc (which attributes KFGQPC) and shipped under QuranEnc republishing terms with KFGQPC named as publisher.
- **Tafsir Center / المختصر**: Delivered through QuranEnc edition keys `*_mokhtasar`; covered by QuranEnc terms above (attribution includes Tafsir Center / Al-Mukhtasar name).

UI: tafsir + meanings hidden by default; buttons **التفسير** / **ترجمة معاني القرآن** (never “translation of the Quran”). Arabic ayah unchanged.

## Exact files changed

- `next.config.ts` — permanent redirect `/hifz/shams` → `/learning/quran/shams`
- `lib/hifz/routes.ts` — route constants + redirect config
- `lib/hifz/quranUiCopy.ts` — AR/EN UI chrome (other locales → EN)
- `lib/hifz/sourcedEditionMap.ts` — locale → QuranEnc edition map
- `lib/hifz/sourcedTexts.ts` — load validated downloaded JSON
- `lib/hifz/sourcedTexts.test.ts` — routes, mapping, sourced load tests
- `lib/site/indexing.ts` — disallow `/learning/quran`
- `data/hifz/ash-shams-91.tafsir-muyassar.json` + `ash-shams-91.meanings-*.json` (12 editions)
- `app/learning/quran/page.tsx` — section home
- `app/learning/quran/shams/page.tsx` — experience page (noindex)
- `app/learning/quran/shams/HifzShamsExperience.tsx` (moved from `app/hifz/shams/`)
- `app/learning/quran/shams/useHusaryPlayer.ts` (moved)
- `app/learning/quran/shams/hifz-shams.css` (moved)
- `app/learning/quran/shams/VerseSourcedNotes.tsx` — calm tafsir/meanings UI
- `app/components/learning/home/LearningQuranSection.tsx`
- `app/components/learning/home/LearningDashboardView.tsx` — mount section
- Removed: `app/hifz/shams/page.tsx`, `app/hifz/layout.tsx` (redirect-only legacy path)
- `docs/ai/CURSOR_REPORT.md` (this report)

Not staged: `AGENTS.md`, `.local/`, `docs/ai/IOS_STATUS_AR.md`, `tmp/`, `worktrees/`.

## Migrations created

none

## Security review

- Quran Learning routes: `noindex` + `nofollow` via `buildPageMetadata`; robots disallow `/learning/quran` and `/hifz`; not in sitemap or global nav (only Learning hub section).
- Sourced texts are static published downloads with attribution; no secrets; no new privileged APIs.
- Audio remains on-demand Quran.com Husary streams; no audio binaries added.
- No hadith surface; no prophet imagery added.

## Tests

- `npx vitest run lib/hifz/audio.test.ts lib/hifz/ashShamsData.test.ts lib/hifz/sourcedTexts.test.ts` — **PASS** (26 tests)

## TypeScript

- `npx tsc --noEmit` — **PASS** (after clearing stale `.next/types` that still referenced deleted `/hifz` pages)

## Build

- `npm run build` — **PASS** (routes include `/learning/quran`, `/learning/quran/shams`; no `/hifz/shams` page; unrelated Turbopack FS tracing warnings in translation-studio)

## git diff --check

- **PASS** (on staged paths)

## git status --short

After commit/push: branch ahead then synced with `origin/feat/quran-hifz-v1`; unrelated dirt left alone.

## Open issues

- **Browser MCP:** `cursor-ide-browser` `browser_navigate` returned “No browser tab available” — could not visually verify. **HTTP against `next start :3460`:** `/learning` 200 (Quran section present), `/learning/quran` 200 (ash-Shams), `/learning/quran/shams` 200 (experience), `/hifz/shams` **308** → `/learning/quran/shams`.
- KFGQPC `quran-dev` page could not be fetched live (timeout); relied on QuranEnc republishing terms + publisher attribution.
- Korean meanings omitted until a verified QuranEnc (or equivalent) edition exists.
- Edition version numbers for mukhtasar/muyassar are not in QuranEnc `/translations/list`; stored as `quranenc-api-download-YYYY-MM-DD` plus SHA-256 of the dual-matched payload (list versions used for Bubenheim `1.1.4` and Helmi Nasr `1.4.1`).
