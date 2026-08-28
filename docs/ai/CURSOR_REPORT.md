# CURSOR_REPORT — PC2 official logo from approved video V1

```text
TASK_ID = PC2_UMTUBA_OFFICIAL_LOGO_WEB_IMPLEMENTATION_FROM_APPROVED_VIDEO_V1
STATUS = IMPLEMENTED_LOCAL_PREVIEW
APPROVED_PACKAGE_VERIFIED = YES
AUTHORITATIVE_REPO = C:/Users/Giga store/Desktop/umtuba/umtuba-web-translation-trunk-port-v1
AUTHORIZED_BASE = office/platform-translation-trunk-port-v1
BASE_SHA = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-web-official-logo-approved-video-v1
BRANCH = pc2/official-logo-from-approved-video-v1
STACKED_LOGO_IMPLEMENTED = YES
LOCAL_PREVIEW = http://localhost:3010/welcome
PUSH = NO
MERGED = NO
DEPLOYED = NO
PRODUCT_FUNCTIONALITY_CHANGED = NO
DATABASE_TOUCHED = NO
PAYMENTS_TOUCHED = NO
```

## Summary

Integrated the owner-approved End Tag video logo package (`UMTUBA_LOGO_FROM_APPROVED_VIDEO_V1.zip`) into shared web brand chrome on an isolated worktree. Primary lockup is the extracted stacked PNG (symbol above UMTUBA). Dirty primary checkout was not used. V2/V3/V4 artwork was not used. No deploy, merge, or push.

## Exact files changed

Modified:

- `app/components/AppTopNav.tsx`
- `app/components/auth/AuthShell.tsx`
- `app/components/landing/LandingHero.tsx`
- `app/components/legal/LegalDocumentPage.tsx`
- `app/components/product/ProductLoadingState.tsx`
- `app/favicon.ico` (packed from approved 16/32/48 PNGs)
- `app/feed/page.tsx` (legacy experimental header mark)
- `app/layout.tsx`
- `app/manifest.ts`
- `app/opengraph-image.tsx` (comment only; OG stays generated typography)
- `app/welcome/page.tsx`
- `docs/ai/CURRENT_TASK.md`
- `lib/site/brand.ts`
- `lib/site/metadata.ts`
- `lib/site/metadata.test.ts`

Added:

- `app/components/brand/UmtubaStackedLogo.tsx`
- `app/components/brand/BrandJsonLd.tsx`
- `app/icon.png` (approved 32×32)
- `app/apple-icon.png` (approved 180×180)
- `public/brand/*` (stacked lockup, symbol, 1024 icon, 16–512 icons)
- `public/favicon-16x16.png`
- `public/favicon-32x32.png`
- `public/favicon.ico`
- `lib/site/brandAssets.test.ts`
- `scripts/pack-approved-favicon.mjs`
- `docs/ai/pc2-official-logo-from-approved-video-v1/package/` (full zip evidence)
- `docs/ai/PC2_UMTUBA_OFFICIAL_LOGO_WEB_IMPLEMENTATION_FROM_APPROVED_VIDEO_V1.md`
- this report

## Migrations created

None. None applied remotely.

## Security review

- Branding chrome only. No auth logic, payments, Store, Learning, Globe, or DB changes.
- No secrets, `.env`, or service-role keys read or written.
- JSON-LD logo URL is a public asset path on the site origin.
- Isolated worktree; dirty primary tree left untouched.

## Tests

`npx vitest run lib/site/brandAssets.test.ts lib/site/metadata.test.ts lib/site/siteUrl.test.ts`

PASS — 3 files, 28 tests.

## TypeScript

`npx tsc --noEmit` — PASS.

## Build

`npx next build` — PASS (Next.js 16.2.10). `/icon.png`, `/apple-icon.png`, and `/manifest.webmanifest` prerendered.

Limitation: embedding the stacked PNG inside `ImageResponse` failed on this host (`lookupType: 5 - substFormat: 3`). OG remains generated typography. UI/favicon/PWA/JSON-LD use the approved rasters.

## git diff --check

PASS.

## git status --short

```text
 M app/components/AppTopNav.tsx
 M app/components/auth/AuthShell.tsx
 M app/components/landing/LandingHero.tsx
 M app/components/legal/LegalDocumentPage.tsx
 M app/components/product/ProductLoadingState.tsx
 M app/favicon.ico
 M app/feed/page.tsx
 M app/layout.tsx
 M app/manifest.ts
 M app/opengraph-image.tsx
 M app/welcome/page.tsx
 M docs/ai/CURRENT_TASK.md
 M lib/site/brand.ts
 M lib/site/metadata.test.ts
 M lib/site/metadata.ts
?? app/apple-icon.png
?? app/components/brand/
?? app/icon.png
?? docs/ai/PC2_UMTUBA_OFFICIAL_LOGO_WEB_IMPLEMENTATION_FROM_APPROVED_VIDEO_V1.md
?? docs/ai/pc2-official-logo-from-approved-video-v1/
?? lib/site/brandAssets.test.ts
?? public/brand/
?? public/favicon-16x16.png
?? public/favicon-32x32.png
?? public/favicon.ico
?? scripts/pack-approved-favicon.mjs
```

Plus this `docs/ai/CURSOR_REPORT.md` rewrite (uncommitted until isolated commit).

## Open issues

- Owner visual review required on `http://localhost:3010/welcome` (also `/login`, any AppTopNav page).
- Stacked PNG is a video-frame extract with a black background, not a transparent vector master.
- OG share image does not yet render the extracted stacked PNG (host ImageResponse limitation).
- Not pushed, not merged, not deployed.
