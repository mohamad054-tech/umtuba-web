# Cursor Report — release-candidate/2026-09-23-quran

## Summary

Prepared a release candidate that keeps the live games work and adds the Learning Quran section. The live site was **not** switched.

Public site checks before any change still matched the current live copy: games pages answer, the old sun page answers, and the new Quran addresses do not exist yet. This machine has no way to sign in to the server, so the live folder name was **not** read on the server, and no new folder was created there. Nothing was switched. `release/v1` was not moved.

```
BRANCH = release-candidate/2026-09-23-quran
BASE = d2e72b8da963d898735888ad0509da31ea356114 (integrate/games-hifz-v1)
MERGED = d37c52a435c708c04ade2e5a1fa0e25ab6cf7d18 (feat/quran-hifz-v1)
MERGE = clean (ort). Parents are exactly those two commits.
NOT INCLUDED = fix/watch-shared-link-v1, feat/games-v2 tip, deca19b8
release/v1 = still aa2f3ae5a970902f0284e2faebd126a263b87bb7
DEPLOY = NOT DONE (no server access from this machine)
ROLLBACK TARGET = unchanged live folder (expected d2e72b8d-20260923142924; not re-read on the host)
```

Local production server (`next start` on port 3460), Arabic preference:

- `/` 200, `/games` 200, `/games/flag-guess` 200, `/games/larger-country` 200, `/games/farther-pair` 200
- `/learning` 200 and contains **القرآن الكريم والحديث الشريف**
- `/learning/quran` 200, `/learning/quran/shams` 200 with surah text and **التفسير**
- Husary audio host is in the client bundle (`mirrors.quranicaudio.com`), not in the first HTML
- `/hifz/shams` 308 to `/learning/quran/shams`
- `public/games/flags/sa.svg` still has `flag-icons-sa`; `jo.svg` still present

## Exact files changed

Merge of `d37c52a4` onto `d2e72b8d` (34 files: Learning Quran section, sourced texts, permanent redirect, audio pause tweak). Plus this handoff:

- `lib/site/metadata.test.ts` — accept `/learning/quran` in the robots disallow list (same pattern as `/hifz`)
- `docs/ai/CURSOR_REPORT.md` — this report

## Migrations created

none

## Security review

- No new secrets, no env values printed, no service-role use, no remote migration.
- Quran routes stay noindex / robots-disallowed / off the sitemap.
- Audio host unchanged. Report-only content security policy was not edited.
- `release/v1` not updated. No other branch merged.

## Tests

- Targeted: hifz audio, sourced texts, metadata, title brand, games flags/catalog/places/engine, google SEO, indexing repair — **70 passed**
- Full `npx vitest run` — **25 failed, 4751 passed, 11 skipped**. Failures are the same pre-existing set (learning contracts, profile, messenger, translation studio, landing). None are in the Quran or games files changed by this merge.

## TypeScript

- `npx tsc --noEmit` — **PASS**

## Build

- `npm run build` — **PASS** (exit 0). Routes include `/learning/quran` and `/learning/quran/shams`. Unrelated Turbopack filesystem-tracing warnings in translation-studio remain.

## git diff --check

- **PASS** (no whitespace errors on the handoff diff)

## git status --short

Before the handoff commit:

- `M docs/ai/CURSOR_REPORT.md`
- `M lib/site/metadata.test.ts`

## Open issues

- Live site was **not** updated. This machine cannot reach the production server (no sign-in, no host name). Do not treat the public pages as a folder-name confirmation.
- Side-by-side folder on the server was **not** built. Rollback folder was **not** re-read on the host.
- Korean meanings still omitted (no verified edition).
- Full test suite still has 25 older failures unrelated to this merge.
