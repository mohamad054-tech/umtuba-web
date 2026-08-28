# CURSOR_REPORT — DESKTOP_UMTUBA_OFFICIAL_BRAND_IMPLEMENTATION_PHASE2_V1

## Summary

Isolated Phase 2 brand implementation on `desktop/umtuba-official-brand-phase2-v1` from authorized `origin/alpha-0.2` @ `b2c0bbd`. Exact V3 stacked masters copied into `brand/official-v3/` and served from `public/brand/official-v3/`. Shared `UmtubaBrandMark` replaces text UMTUBA marks in compact (symbol) and primary (stacked) placements. Favicon/PWA icons use approved symbol assets. No deploy. No merge. No push. Parent dirty office checkout unchanged.

```
TASK_ID = DESKTOP_UMTUBA_OFFICIAL_BRAND_IMPLEMENTATION_PHASE2_V1
STATUS = COMPLETE_LOCAL_CANDIDATE
AUTHORIZED_BASE_REF = origin/alpha-0.2
AUTHORIZED_BASE_SHA = b2c0bbd1aeb423c4f5aa7410c48c407989f30d1c
WORKTREE = C:\Users\1\Desktop\umtuba\worktrees\UMTUBA-OFFICIAL-BRAND-PHASE2-V1
BRANCH = desktop/umtuba-official-brand-phase2-v1
PACKAGE_VALIDATED = YES
MASTER_ASSETS_USED_EXACTLY = YES
TYPECHECK = PASS
BUILD = PASS
PUSHED = NO
DEPLOYED = NO
```

## Exact files changed

See git status on the isolated branch. Product/source:

- `lib/site/brand.ts`
- `lib/site/brandAssets.ts`
- `lib/site/brand.test.ts`
- `lib/site/jsonLd.ts`
- `app/components/brand/UmtubaBrandMark.tsx`
- `app/components/AppTopNav.tsx`
- `app/components/auth/AuthShell.tsx`
- `app/components/landing/LandingHero.tsx`
- `app/components/legal/LegalDocumentPage.tsx`
- `app/components/product/ProductLoadingState.tsx`
- `app/welcome/page.tsx`
- `app/support/page.tsx`
- `app/feed/page.tsx`
- `app/watch/WatchExperience.tsx`
- `app/manifest.ts`
- `app/favicon.ico`, `app/icon.png`, `app/apple-icon.png`
- `public/favicon.ico`
- `public/brand/official-v3/**` (exact runtime copies)
- `brand/official-v3/**` (exact masters including video/audio)
- worktree handoff docs

## Migrations created

None.

## Security review

- Exact approved assets only. No AI-regenerated artwork.
- Favicon ICO wraps exact PNG payloads (16/32/48). No pixel redraw.
- No `.env` read or printed. No secrets.
- No database, payments, Stripe, entitlements, or migrations.
- Parent `office/profile-hero-completeness-v1` @ `380a366` not modified.

## Tests

Brand-owned: `lib/site/brand.test.ts` + `lib/site/metadata.test.ts` PASS.

Full `vitest run`: 4505 passed, 24 failed, 1 skipped. Failed files are pre-existing on `b2c0bbd` (Learning/content/i18n/wallet/media-foundation/nav contrast) and were not introduced by this brand diff. Untouched `app/globals.css` and `DiscoverShell.tsx` still fail the same contrast/overflow contracts.

## TypeScript

`npx tsc --noEmit` PASS.

## Build

`npm run build` PASS. Manifest and icon routes generated.

## git diff --check

PASS.

## git status --short

Isolated worktree dirty with brand files until local commit. Parent remains `office/profile-hero-completeness-v1` @ `380a366` with prior unrelated dirt.

## Open issues

- Android/iOS native sources not in this repo.
- Watermark / end-tag 9:16 / 16:9 / audio sting: no existing product integration; masters stored only.
- Auth login preview fail-closed without local AUTH env — AuthShell stacked mark not screenshotable in this preview.
- Compact headers correctly use symbol-only (stacked lockup would be unreadable). Existing page title text "UMTUBA" beside the symbol is product chrome, not a new horizontal lockup.
