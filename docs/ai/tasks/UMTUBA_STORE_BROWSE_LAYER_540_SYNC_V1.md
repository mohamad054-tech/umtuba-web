# UMTUBA_STORE_BROWSE_LAYER_540_SYNC_V1

Owner GO: update the Store browse/QA layer so it recognizes all 540 canonical products.

## Status

**COMPLETE**

Canonical SHA256 verified unchanged: `a6f171dcc78b45e888c809a786da0a027a09572ec30394fac970f7c0d28112af`. Browse layer before: 532. After: 540. Official commercial audit: **405 publishable / 135 held**. Expected 405/135 restored. The 8 leftover expansion SKUs are no longer `NO_QA_FLAG_BUT_NOT_PUBLISHABLE`.

Canonical merchandising/localization was not rewritten. Gemini was not rerun. No deploy / publish / payments / commit / push.

## Required block

```text
TASK_ID = UMTUBA_STORE_BROWSE_LAYER_540_SYNC_V1
STATUS = COMPLETE
CANONICAL_SHA256_VERIFIED = a6f171dcc78b45e888c809a786da0a027a09572ec30394fac970f7c0d28112af
BROWSE_LAYER_BEFORE_COUNT = 532
BROWSE_LAYER_AFTER_COUNT = 540
MISSING_NEW_PRODUCT_IDS = 2412210206111611700,2409240350571624600,2D644825-4547-4EA6-9C8D-22E3DC3CFFE8,DCB495CC-80F8-4ED9-B5BD-26E39B751776,1380094536965033984,1607997452471250944,38396C3B-40FA-4EE3-9FE2-60FE32A2DE24,2508140725141623900
QA_EVALUATED_NEW_PRODUCTS = 8
NEW_PRODUCTS_PUBLISHABLE = 8
NEW_PRODUCTS_HELD = 0
NO_QA_FLAG_REMAINING = 0
TOTAL_PRODUCTS = 540
PUBLISHABLE_AFTER = 405
HELD_AFTER = 135
EXPECTED_405_135_RESTORED = YES
FILES_CHANGED = lib/services/cj/expansionFile.ts,lib/services/cj/expansionBrowse.ts,lib/services/cj/expansionCatalog.test.ts,lib/services/cj/index.ts,docs/ai/CURRENT_TASK.md,docs/ai/CURSOR_REPORT.md,docs/ai/tasks/UMTUBA_STORE_BROWSE_LAYER_540_SYNC_V1.md
CATALOG_CHANGED = NO
LOCALIZATION_CHANGED = NO
GEMINI_RERUN = NO
PRICES_CHANGED = 0
COSTS_CHANGED = 0
IDS_CHANGED = 0
LIVE_DEPLOY = NO
PRODUCTS_PUBLISHED = NO
PAYMENTS_CHANGED = NO
PREVIEW_URL = http://127.0.0.1:3000/sandbox/store/cj-launch
TEST_RESULTS = vitest 9/9 pass; tsc --noEmit pass; official audit 405/135; 8 PDPs 200
DIFF_CHECK = PASS
BLOCKERS =
NEXT_ACTION = OWNER_VISUAL_QA
```

## Method

1. Traced browse to `loadStoreBrowseCatalog()` = approved-59 + `data/cj-catalog-expansion-300-v1.json` (473). Official audits use that overlay + stored `catalog_qa` via `isPublishableBrowseRow`.
2. Identified the 8 missing IDs from `docs/ai/recovery/UMTUBA_STORE_NEXT_CATALOG_EXPANSION_ALL_LANGUAGES_V1/final-publishable-new-products.json`. They exist in canonical with complete 13-locale copy, `status=local_pass`, `quality.ok`, and stored `catalog_qa: []`.
3. Confirmed full commercial source rows already exist in `data/cj-catalog-next-expansion-all-locales-v1.json`.
4. Expanded the browse loader to include leftover next-expansion SKUs that are already in canonical and not already in approved-59 / expansion-473. Did not invent supplier rows.
5. Re-ran the same QA/publishable rules. The 8 pass; the previous 135 HOLDs are unchanged.
6. Validated browse 540, official 405/135, targeted tests, tsc, and cj-launch department + PDP HTTP.

## The 8

- `2412210206111611700` PUBLISHABLE — empty stored QA, in-stock, margin/profit/shipping pass
- `2409240350571624600` PUBLISHABLE — empty stored QA, in-stock, margin/profit/shipping pass
- `2D644825-4547-4EA6-9C8D-22E3DC3CFFE8` PUBLISHABLE — empty stored QA, in-stock, margin/profit/shipping pass
- `DCB495CC-80F8-4ED9-B5BD-26E39B751776` PUBLISHABLE — empty stored QA, in-stock, margin/profit/shipping pass
- `1380094536965033984` PUBLISHABLE — empty stored QA, in-stock, margin/profit/shipping pass
- `1607997452471250944` PUBLISHABLE — empty stored QA, in-stock, margin/profit/shipping pass
- `38396C3B-40FA-4EE3-9FE2-60FE32A2DE24` PUBLISHABLE — empty stored QA, in-stock, margin/profit/shipping pass
- `2508140725141623900` PUBLISHABLE — empty stored QA, in-stock, margin/profit/shipping pass
