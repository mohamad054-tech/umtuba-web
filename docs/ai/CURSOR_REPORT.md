# CURSOR_REPORT — DESKTOP_UMTUBA_OFFICIAL_BRAND_IMPLEMENTATION_PHASE2_V1

## Summary

Central visual fail on `http://127.0.0.1:3028/welcome`: stacked placement was correct, but the mark looked flatter than the Brand Board. Investigation only — no redesign, no trace, no replacement artwork, no page-design change.

The V3 **PNG stacked masters** match the premium board (3D tubular U, orbit over/behind bars, clear star). The V3 **SVG companions** are simplified stroke reconstructions (~1.8 KB) and do not. `/welcome` was faithfully rendering the SVG. CSS was not clipping or filtering the mark (`filter: none`, `clip-path: none`, `object-fit: contain`).

Fix: `brandMarkSrc()` now returns the exact PNG masters. Artwork files were not edited. Live page after rebuild serves `logo_stacked_transparent.png` (2400×3000, SHA256 match to disk) at the existing hero size 179×224.

```
SOURCE_MASTER_VISUALLY_MATCHES_APPROVED_BOARD = YES
WEB_RENDER_MATCHES_SOURCE_MASTER = YES
ROOT_CAUSE = WEB_RENDERING
FIX_APPLIED = serve exact PNG masters for on-page marks; SVGs left unmodified
VISUAL_REVIEW_READY = YES
DEPLOYED = NO
MERGED = NO
PUSHED = NO
```

Parent `office/profile-hero-completeness-v1` @ `380a366` not modified.

## Exact files changed

Fidelity follow-up (this pass):

- `lib/site/brandAssets.ts`
- `lib/site/brand.test.ts`
- `app/components/brand/UmtubaBrandMark.tsx`
- `public/brand/official-v3/png/logo_stacked_dark.png` (exact copy)
- `public/brand/official-v3/png/logo_stacked_light.png` (exact copy)
- `docs/ops/official-brand-phase2-v1/FIDELITY_INVESTIGATION.md`
- `docs/ops/official-brand-phase2-v1/VISUAL_REVIEW.md`
- worktree `docs/ai/*`

Page layout, hero classes, and artwork binaries in `brand/official-v3/` were not redesigned.

## Migrations created

None.

## Security review

- Exact approved PNG bytes only. No generated/traced artwork.
- No `.env` read or printed. No secrets.
- No database, payments, Stripe, entitlements, or migrations.
- Parent dirty office checkout not touched.

## Tests

`npx vitest run lib/site/brand.test.ts lib/site/metadata.test.ts` — 12 passed.

## TypeScript

`npx tsc --noEmit` PASS (standalone). `next build` Finished TypeScript in 10.7min.

## Build

`npm run build` PASS.

## git diff --check

Recorded at commit time.

## git status --short

Recorded at commit time.

## Open issues

- Package SVGs remain simplified reconstructions. They are stored but no longer used for on-page marks. Do not redraw them.
- At the existing hero size (`h-[min(14rem,42vw)]` = 224px), the 2400×3000 PNG is scaled down. Detail is the master at that size, not a crop.
- Android/iOS native sources not in this repo.
- Watermark / end-tag / audio sting: no existing product integration; masters stored only.
