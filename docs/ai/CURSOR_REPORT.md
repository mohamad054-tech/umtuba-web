# CURSOR_REPORT

## Summary

**Platform Navigation Secondary Surface Cleanup V1** — Living Navigation, `/feed`, `/journey-pro`, `/post-journey`, `/live/media-lab`, and `/city/*` classified as non-primary. Contracts block them from Desktop primary, Mobile primary, and UserMenu baseline. Routes remain; no disable/delete. Living Navigation is **not** official chrome. **Verification PASS** (in-scope). Commit / Push / Merge **not** performed.

## Exact files changed

- `app/lib/nav/secondarySurfaceContract.ts` (new)
- `app/lib/nav/secondarySurfaceContract.test.ts` (new)
- `app/lib/nav/index.ts`
- `app/lib/nav/mobileNav.ts` (comment: media-lab hide-only)
- `app/lib/nav/shellCoherence.test.ts`
- `app/components/video/living-navigation/livingNavigationConfig.ts` (classification comment)
- `docs/architecture/PLATFORM_NAVIGATION_ARCHITECTURE_V1.md` (§2.6)
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`

## Surfaces classified

- Living Navigation — prototype-overlay (not official chrome)
- `/feed`, `/journey-pro` — experimental
- `/post-journey` — legacy
- `/live/media-lab` — lab
- `/city/*` — experimental

## Chrome exclusion contracts

- Not in Desktop `APP_NAV_ITEMS`
- Not in Mobile `MOBILE_PRIMARY_NAV_ITEMS`
- Not in UserMenu baseline
- Official chrome sources free of those destinations (`/live/media-lab` may appear in mobileNav only to hide the bar)

## Migrations created

None.

## Security review

- No Store Domain or Home feed edits.
- No route retirement or feature disable.

## Tests

- In-scope Vitest: **PASS** (51)
- Full Vitest: **2715 passed**, **3 failed** — pre-existing Store Domain only:
  - `lib/store/paymentOutcomeSync.test.ts` (1)
  - `lib/store/storeRemoteE2eSandboxScripts.test.ts` (2)

## TypeScript

- `npx tsc --noEmit`: **FAIL** pre-existing / out of scope — `profilePinnedContentStructure.v1.test.ts` → `../cards`
- `npm run build` TypeScript phase: **PASS**

## Build

**PASS**

## git diff --check

**PASS**

## git status --short

Pending stage for manual commit.

## Open issues

- Await explicit commit GO (manual Terminal; no Git trailers).
- Pre-existing Store Vitest failures and pinned-content `tsc` import remain out of scope.
- **Proposed next feature (not started):** Platform Navigation Mobile World Affordance Decision V1.
