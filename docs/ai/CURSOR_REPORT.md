# Cursor Report — Feed audio persistence V1

## Summary

New branch `fix/feed-audio-persistence` off `4cb958c5`. Watch unmute is stored in memory + `sessionStorage` so it survives clip changes and page remounts. Browser autoplay rejection still mutes the current element (`muted_fallback`) but does not overwrite the stored preference. Home/Discover starts the next clip from the same preference.

Not merged.

## Exact files changed

- `lib/video/feedAudioPreference.ts`
- `lib/video/feedAudioPreference.test.ts`
- `lib/video/feedAudioPersistence.contract.test.ts`
- `app/components/video/VerticalVideoFeed.tsx`
- `app/discover/components/DiscoverNativeVideo.tsx`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None.

## Security review

- Preference is a boolean in `sessionStorage` (`umtuba.feed.unmuted`). No PII, no tokens.
- Storage failures (private mode) stay in memory only.
- No RLS, secrets, or remote DB access.

## Tests

```
npx vitest run lib/video/feedAudioPreference.test.ts \
  lib/video/feedAudioPersistence.contract.test.ts \
  lib/video/playActiveVideo.test.ts
```

PASS — 12 tests.

## TypeScript

`npx tsc --noEmit` — PASS.

## Build

Not run. Query/UI mute preference only; typecheck covers the changed TS.

## git diff --check

Pending at commit time.

## git status --short

Pending at commit time.

## Open issues

- Not merged into `feat/legal-pages-v1`.
- Live Watch unmute swipe was not clicked in a browser here (needs a signed-in feed session).
- Discover native controls do not write the preference (Watch toggle does). Discover still *reads* it.
