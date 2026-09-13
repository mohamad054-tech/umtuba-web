# PC2 — Official UMTUBA logo web implementation from approved video V1

```text
TASK_ID = PC2_UMTUBA_OFFICIAL_LOGO_WEB_IMPLEMENTATION_FROM_APPROVED_VIDEO_V1
STATUS = IMPLEMENTED_LOCAL_PREVIEW
APPROVED_PACKAGE_VERIFIED = YES
AUTHORITATIVE_REPO = C:/Users/Giga store/Desktop/umtuba/umtuba-web-translation-trunk-port-v1
AUTHORIZED_BASE = office/platform-translation-trunk-port-v1 (in sync with origin)
BASE_SHA = b3c05d8d8d5d5ac0b397fe468a3160b952e1cfb2
WORKTREE = C:/Users/Giga store/Desktop/umtuba/umtuba-web-official-logo-approved-video-v1
BRANCH = pc2/official-logo-from-approved-video-v1
STACKED_LOGO_IMPLEMENTED = YES
HEADER = YES (AppTopNav + welcome nav + legacy feed header)
WELCOME = YES (hero stacked lockup + footer)
AUTH = YES (AuthShell branding chrome only)
FOOTER = YES (welcome + legal nav mark)
LOADING = YES (full-page ProductLoadingState)
FAVICON_PWA = YES (extracted 16–512 + packed ICO + app/icon.png + apple-icon.png)
METADATA_JSONLD = YES (root icons + Organization JSON-LD logo)
TYPECHECK = PASS
TESTS = PASS (28: brandAssets + metadata + siteUrl)
BUILD = PASS
LOCAL_PREVIEW = http://localhost:3010/welcome
COMMIT = YES (isolated worktree only; no push)
PRODUCT_FUNCTIONALITY_CHANGED = NO
DATABASE_TOUCHED = NO
PAYMENTS_TOUCHED = NO
MERGED = NO
DEPLOYED = NO
READY_FOR_OWNER_VISUAL_REVIEW = YES
```

## Approved package

Found at `C:\Users\Giga store\Desktop\UMTUBA_LOGO_FROM_APPROVED_VIDEO_V1.zip` (1,138,182 bytes, 2026-08-28 22:57). V2/V3/V4 packages were not used.

| File | Size | Dimensions |
|---|---|---|
| README.txt | 648 | text |
| umtuba_logo_stacked_from_approved_video.png | 499137 | 788×776 |
| umtuba_symbol_from_approved_video.png | 228438 | 487×450 |
| umtuba_app_icon_1024.png | 197216 | 1024×1024 |
| umtuba_icon_512.png | 69109 | 512×512 |
| umtuba_icon_192.png | 13860 | 192×192 |
| umtuba_icon_180.png | 12379 | 180×180 |
| umtuba_icon_144.png | 8700 | 144×144 |
| umtuba_icon_96.png | 4608 | 96×96 |
| umtuba_icon_64.png | 2507 | 64×64 |
| umtuba_icon_48.png | 1648 | 48×48 |
| umtuba_icon_32.png | 958 | 32×32 |
| umtuba_icon_16.png | 445 | 16×16 |
| VERIFY_logo_on_black.jpg | 117293 | 948×936 |

README confirms: extracted from the final stable frame of the owner-approved End Tag video; primary website logo is the stacked PNG; no V3/V4; no AI substitute.

Evidence copy: `docs/ai/pc2-official-logo-from-approved-video-v1/package/`

## Implementation

Primary lockup is the stacked PNG (symbol above UMTUBA above LEARN - CREATE - SHARE). Shared component: `app/components/brand/UmtubaStackedLogo.tsx`.

Surfaces:

- Header / main nav: `AppTopNav`
- Welcome: `LandingHero` nav + hero lockup; welcome footer
- Auth chrome: `AuthShell` (no login/signup logic change)
- Legal header mark: `LegalDocumentPage`
- Loading splash: full-page `ProductLoadingState`
- Legacy feed header brand mark (experimental route only)
- Favicon / PWA: `public/brand/umtuba_icon_*.png`, packed `app/favicon.ico` + `public/favicon.ico` from 16/32/48 PNGs, `app/icon.png` (32), `app/apple-icon.png` (180), manifest 192/512/180
- Metadata icons + Organization JSON-LD logo URL

Open Graph `/opengraph-image` remains generated typography. Embedding the extracted PNG in `ImageResponse` on this Windows host failed (`lookupType: 5 - substFormat: 3`). Favicon/PWA/JSON-LD/UI use the approved raster files.

## Not changed

Globe, posts/videos, Learning, Store product logic, auth behavior, database, migrations, payments, End Tag video, V2/V3/V4 artwork.
