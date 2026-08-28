# CURSOR_REPORT — PC2 official logo visual correction V2

```text
TASK_ID = PC2_UMTUBA_OFFICIAL_LOGO_WEB_VISUAL_CORRECTION_V2
STATUS = IMPLEMENTED_LOCAL_PREVIEW
BASE_COMMIT = d0858b093b73c9655c273855eed01b198d9eb201
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-web-official-logo-approved-video-v1
BRANCH = pc2/official-logo-from-approved-video-v1
LOCAL_PREVIEW = http://localhost:3010/welcome
PUSH = NO
MERGED = NO
DEPLOYED = NO
PRODUCT_FUNCTIONALITY_CHANGED = NO
DATABASE_TOUCHED = NO
PAYMENTS_TOUCHED = NO
```

## Summary

Corrected presentation of the already-approved video-derived logo. Header/legal/compact auth now use the official symbol at a readable 48–56px. Welcome hero keeps the full stacked lockup, rendered larger (320–448px) without stretching or exceeding the 788×776 source. No new artwork. No V2/V3/V4 assets.

## Exact files changed

- `lib/site/brand.ts` — symbol dimensions + `BRAND_MARK_PRESETS` (display caps vs source)
- `app/components/brand/UmtubaStackedLogo.tsx` — mark selection, `object-contain`, `sizes`, quality
- `app/components/auth/AuthShell.tsx` — compact mobile mark uses `authCompact` (symbol)
- `app/components/landing/LandingHero.tsx` — hero wrapper spacing only
- `lib/site/brandAssets.test.ts` — compact vs spacious + no-upscale audit
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/PC2_UMTUBA_OFFICIAL_LOGO_WEB_VISUAL_CORRECTION_V2.md`
- this report

## Migrations created

None. None applied remotely.

## Security review

- Presentation-only. No auth logic, payments, Store, Learning, Globe, or DB changes.
- No secrets or `.env` reads/writes.
- Isolated worktree only.

## Tests

`npx vitest run lib/site/brandAssets.test.ts lib/site/metadata.test.ts`

PASS — 2 files, 16 tests (includes raster upscale audit).

## TypeScript

`npx tsc --noEmit` — PASS.

## Build

`npx next build` — PASS.

## git diff --check

PASS.

## git status --short

Recorded at handoff time before isolated commit (brand/docs only).

## Open issues

- Auth routes still 503 in this worktree without `.env` (secrets not copied). Auth chrome code is updated.
- Owner visual review on `http://localhost:3010/welcome` and `/terms`.
- Not pushed, not merged, not deployed.
