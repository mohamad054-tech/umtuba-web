# Cursor Report — feat/quran-hifz-v1 (Husary listen & repeat)

## Summary

Added calm **listen / listen-and-repeat / tilawa-link** audio to the hidden Ash-Shams prototype at `/hifz/shams`. Streams Sheikh Mahmoud Khalil Al-Husary **murattal** ayah-by-ayah (+ basmala) from the Quranicaudio EveryAyah mirror URLs exposed by Quran.com — **no audio binaries in the repo**. Word-by-word highlight included (Quran.com Husary murattal segments align 15/15 with local Uthmani tokens). Existing text modes unchanged. noindex / not linked. No Supabase. No merge/deploy/PR.

```
TASK_ID = FEAT_QURAN_HIFZ_AUDIO_V1
BRANCH = feat/quran-hifz-v1
BASE = origin/feat/quran-hifz-v1 @ c01fdfc085119f389af1a72ed1b5d6fc7e5309f7
RELEASE_ANCESTOR = origin/release/v1 @ aa2f3ae5 (ancestor of feature tip; feature already ahead — no FF needed)
```

### Audio provenance & permission

- **Source name:** Quran.com / Quran Foundation (CDN: mirrors.quranicaudio.com EveryAyah Husary set)
- **Reciter:** Mahmoud Khalil Al-Husary, murattal (`recitation_id` 6). Muallim also listed as id 12 — not used in UI.
- **Terms URL:** https://api-docs.quran.com/legal/developer-terms/
- **Quote (permission):** “QF grants Developer a … license to access and use the APIs solely to develop and operate Applications that provide beneficial Quranic experiences to end users.” / “Developer may display QF Content to end users within the Application, provided that: … QF Content is not sold, sublicensed, or redistributed.” Free/paid apps allowed when content is only part of the end-user experience.
- **Audio URL pattern:** `https://mirrors.quranicaudio.com/everyayah/Husary_128kbps/091{AAA}.mp3`
  Basmala: `…/bismillah.mp3` (same bytes as `001001.mp3`; **not** `091001.mp3`)
- **16 files checked:** **yes** — HTTP 200, `audio/mpeg`, MP3 headers; ayah 1 ≠ basmala; mapping 91:1–15 correct.
- **Word timings:** **yes** — from `chapter_recitations/6/91?segments=true`; segment counts match Uthmani whitespace tokens for all 15 ayat → word highlight **included**.

### Modes added (Arabic labels)

- الاستماع — listen (tap ayah / controls)
- التكرار — listen & repeat (1/3/5/7, default 3; silent pause ≈ ayah + a little; words fade per round)
- وصل التلاوة — audio link of ayah N then N+1 (distinct from text «الوصل»)
- Learn mode gains an **استمع** step into listen

## Exact files changed

- `app/hifz/shams/HifzShamsExperience.tsx`
- `app/hifz/shams/useHusaryPlayer.ts` (new)
- `app/hifz/shams/hifz-shams.css`
- `lib/hifz/audio.ts` (new)
- `lib/hifz/audio.test.ts` (new)
- `lib/hifz/husaryTimings.ts` (new)
- `lib/hifz/types.ts`
- `data/hifz/ash-shams-91.husary-timings.json` (new — timing metadata only)
- `data/hifz/SOURCES.md`
- `docs/ai/CURSOR_REPORT.md` (this report)

Not committed: `docs/ai/IOS_STATUS_AR.md`, `.local/`, `tmp/`, `worktrees/`.

## Migrations created

none

## Security review

- Still hidden: `noindex`, robots disallow `/hifz`, not in nav/sitemap.
- Audio streamed on demand (`preload="none"`); no audio binaries committed.
- Quran text unchanged (downloaded Uthmani only); basmala shown as UI label «البسملة» without inventing Quran words.
- Media Session + `playsInline` HTML audio for mobile background where the browser allows; no promise beyond standard approach.
- No secrets; no Supabase; localStorage progress unchanged.
- Attribution shown for Husary / Quran.com.

## Tests

- `npx vitest run lib/hifz` — **15 passed** (9 prior + 6 audio/timings)

## TypeScript

- `npx tsc --noEmit` — **pass**

## Build

- `npm run build` — **pass**; route `/hifz/shams` present

## git diff --check

- **pass** (trailing whitespace cleaned)

## git status --short

- Clean feature commit on `feat/quran-hifz-v1` after push (see SHA below). Unrelated untracked left out: `.local/`, `tmp/`, `docs/ai/IOS_STATUS_AR.md`, `worktrees/`.

## Open issues

- Lock-screen / background playback depends on the mobile browser; implemented via HTML `<audio>` + Media Session, not guaranteed on every OS.
- Quran.com public API lists Husary as `Husary_64kbps`; UI streams the same reciter’s `Husary_128kbps` mirror paths (verified HTTP 200) for clearer audio.
- Browser MCP (`cursor-ide-browser`) could not open a tab in this environment. Verified instead via: HTTP 200 for `/hifz/shams` with mode labels الاستماع / التكرار / وصل التلاوة / existing modes present; audio URLs not in first paint (lazy); all 16 stream URLs previously HEAD/GET verified.
