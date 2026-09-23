# Cursor Report — feat/quran-hifz-v1 (owner phone UX fixes)

## Summary

Fixed four owner-tested phone issues on the hidden Ash-Shams experience at `/hifz/shams` only. Shortened listen-and-repeat silence (default **short**), added short/medium/long pause choice remembered in localStorage, made **وصل التلاوة** continue through ayah 15, clarified **رتّب الآيات** with intro + demo + hints, and turned sky into simple **تقدّم الحفظ** progress. No Quran text edits, no audio binaries, no hadith, no games/video/watch. noindex unchanged. No Supabase. No merge/deploy/PR.

```
TASK_ID = FIX_QURAN_HIFZ_OWNER_PHONE_UX_V1
BRANCH = feat/quran-hifz-v1
BASE = origin/feat/quran-hifz-v1 @ c14a06190db42fe500424f399d19af513cb00155
```

### The 4 fixes (everyday)

1. **Repeat gap** — Default silence between repeats is a short breath (~28% of ayah length), not “as long as the ayah.” User can pick قصيرة / متوسطة / طويلة; choice saved on the device only.
2. **Connected recitation** — From the current ayah (or basmala then 1), plays continuously to ayah 15 or until Stop; current ayah number is highlighted.
3. **Order mode** — Renamed to رتّب الآيات; short Arabic goal + calm demo animation before start; next ayah pulsed; gentle hint when stuck; quiet «في مكانها» / «أحسنت» on correct taps.
4. **Sky / progress** — Renamed to تقدّم الحفظ; large «حفظت N من 15 آية» plus what to do next; sky stars are lit/unlit progress only (no dim-after-days rule on screen).

## Exact files changed

- `lib/hifz/audio.ts` — pause lengths; `buildHusaryQueue` (tilawa through end)
- `lib/hifz/audio.test.ts` — pause + queue tests
- `lib/hifz/progress.ts` — `readRepeatPauseLength` / `writeRepeatPauseLength`
- `app/hifz/shams/useHusaryPlayer.ts` — pause length + shared queue builder
- `app/hifz/shams/HifzShamsExperience.tsx` — UI for all four fixes
- `app/hifz/shams/hifz-shams.css` — calm order demo / pulse / praise animations
- `docs/ai/CURSOR_REPORT.md` (this report)

Not staged: `AGENTS.md`, `.local/`, `docs/ai/IOS_STATUS_AR.md`, `tmp/`, `worktrees/`.

## Migrations created

none

## Security review

- Still hidden: `noindex`, robots disallow `/hifz`, not in nav/sitemap.
- Audio still streamed on demand; no audio binaries.
- Quran ayah strings untouched.
- Pause preference and progress stay in localStorage only (device).
- No secrets; no Supabase; no new network endpoints beyond existing Husary streams.

## Tests

- `npx vitest run lib/hifz/audio.test.ts lib/hifz/ashShamsData.test.ts` — **PASS** (20 tests)

## TypeScript

- `npx tsc --noEmit` — **PASS**

## Build

- `npm run build` — **PASS** (`/hifz/shams` present; unrelated Turbopack FS tracing warnings in translation-studio)

## git diff --check

- **PASS** (on staged hifz + report files)

## git status --short

After commit (expected): clean for staged paths; unrelated dirt left alone (`AGENTS.md`, `.local/`, etc.).

## Open issues

- **Browser MCP:** `cursor-ide-browser` `browser_navigate` returned “No browser tab available” — could not visually verify phone/wide layouts in-session. Logic covered by unit tests; manual check on device recommended for pause feel and order demo.
- Owner should confirm SHORT pause feels like a brief breath on a real phone with Husary streaming.
