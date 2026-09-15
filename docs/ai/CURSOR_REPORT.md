# Cursor Report — UM Life More menu + hide native download

## Summary

UM Life post cards (text, image, and video) now use the same `VideoMoreMenu` as Home and Watch. Owner actions: Edit caption, Copy link, Delete. Others: Copy link, Not interested, Report. Labels reuse `video.more.*`. The menu sits in the card header (`ms-auto`, RTL-safe) so it does not overlap native video controls. “Not interested” and successful delete remove the card from the current Life list.

Every native `<video controls>` in the app now has `controlsList="nodownload"` (playback speed and picture-in-picture stay). Watch `VideoPlayer` and other custom players without native `controls` were not changed.

No SQL. Not deployed.

## Exact files changed

- `app/life/LifePostCard.tsx`
- `app/life/LifeExperience.tsx`
- `app/life/page.tsx`
- `app/life/umLifePhase1.contract.test.ts`
- `app/components/social/videoMoreMenu.contract.test.ts`
- `app/components/video/OnDemandSignedVideo.tsx`
- `app/discover/components/DiscoverNativeVideo.tsx`
- `app/admin/ads/creatives/page.tsx`
- `app/components/learning/ContinueWatchingVideo.tsx`
- `app/components/learning/WelcomeVideoHook.tsx`
- `app/components/learning/ContentBlockRenderer.tsx`
- `app/create/video/VideoOverlayEditor.tsx`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Migrations created

None.

## Security review

- Reuses existing `VideoMoreMenu` ownership (`viewerMaySeeDeleteControl`), caption/delete/report/copy-link actions, and `surface="life"`.
- Viewer id comes from `getServerUser()` on `/life` only; no new endpoints.
- `controlsList="nodownload"` is a browser UI hint only (not a DRM control).
- No secrets printed. No remote DB writes.

## Tests

- `npx tsc --noEmit` PASS
- `npx vitest run app/life/umLifePhase1.contract.test.ts app/components/social/videoMoreMenu.contract.test.ts` PASS (14)
- `npm run build` PASS

## TypeScript

PASS (`npx tsc --noEmit` and Next build TypeScript step)

## Build

PASS (`npm run build`). Pre-existing Turbopack NFT warning on `next.config.ts` / translation-studio journal unchanged.

## ESLint (edited files)

New issues: none.

Pre-existing:

- `DiscoverNativeVideo.tsx`: 4 errors (`react-hooks/refs` ×2, `react-hooks/set-state-in-effect` ×2) and 1 `exhaustive-deps` warning. Unrelated to `controlsList`.
- `LifePostCard.tsx`: 2 `@next/next/no-img-element` warnings on existing post images.

## git diff --check

Run at handoff.

## git status --short

Run at handoff.

## Open issues

- Live browser click-through of More menu was not verified here (no signed-in Life feed in this worktree).
- `controlsList="nodownload"` hides the browser Download item; it does not prevent saving the media URL by other means.
- DiscoverNativeVideo still uses native `controls` (Home); only the Download item was hidden. Watch custom player has no native controls and was left unchanged.
