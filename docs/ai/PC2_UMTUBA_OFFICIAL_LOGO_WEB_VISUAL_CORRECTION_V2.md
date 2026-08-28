# PC2 — Official UMTUBA logo web visual correction V2

```text
TASK_ID = PC2_UMTUBA_OFFICIAL_LOGO_WEB_VISUAL_CORRECTION_V2
STATUS = IMPLEMENTED_LOCAL_PREVIEW
BASE_COMMIT = d0858b093b73c9655c273855eed01b198d9eb201
HEADER_SYMBOL_ONLY = YES
HEADER_READABILITY = PASS
WELCOME_STACKED_LOCKUP = YES
WELCOME_READABILITY = PASS
AUTH = stacked on desktop panel; symbol-only on compact mobile chrome
FOOTER = stacked, 144–176px
LEGAL = symbol-only, 48px
LOADING = stacked, 192px
RASTER_UPSCALE_AUDIT = PASS
SIDE_BY_SIDE_PRIMARY_FOUND = NO
TYPECHECK = PASS
TESTS = PASS (16: brandAssets + metadata)
BUILD = PASS
LOCAL_PREVIEW = http://localhost:3010/welcome
PRODUCT_FUNCTIONALITY_CHANGED = NO
DATABASE_TOUCHED = NO
PAYMENTS_TOUCHED = NO
MERGED = NO
DEPLOYED = NO
READY_FOR_OWNER_VISUAL_REVIEW = YES
```

## What changed

Presentation only. Same `UMTUBA_LOGO_FROM_APPROVED_VIDEO_V1` rasters.

- Compact chrome (`nav`, `legal`, `authCompact`) now renders `umtuba_symbol_from_approved_video.png` at 48–56px instead of shrinking the full stacked lockup to 40–44px.
- Welcome hero keeps the full stacked lockup at `clamp(20rem, 60vw, 28rem)` (320–448px), under the 776px source height.
- Footer / auth desktop / loading keep stacked lockup at 144–192px.
- `object-contain`, native width/height, `sizes`, `quality={90}`, no stretch.

## Verified HTML

- `/welcome` references both stacked (hero/footer) and symbol (nav).
- `/terms` uses symbol for the compact legal header.
- No horizontal/side-by-side primary lockup class or asset.

## Unchanged

Globe, posts/videos, Learning, Store, auth logic, Alpha 0.2 / Join Beta copy, database, payments. No push, merge, or deploy.
