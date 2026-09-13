# UMTUBA_STORE_GEMINI_CURRENT_198_NEW_LOCALIZATION_V1

Owner-authorized NEW Gemini localization for the CURRENT 198 products in `localization_review`. This is not reconstruction of the lost historical 180.

## Status

**GEMINI_COMPLETE**

Preflight passed. Backups and the exact 198-input ID manifest were written before Gemini. Flash-family `gemini-flash-latest` accepted 176 of 198. Twenty-two failed Gold Standard / quality gates and remain in review. Actual spend **$0.0501**. Cap $5 not exceeded. HTTP 429 count: 0.

The 334 already-localized products were not sent to Gemini and their localized copy is unchanged. Canonical catalog SHA256 is unchanged.

## Required block

```text
TASK_ID = UMTUBA_STORE_GEMINI_CURRENT_198_NEW_LOCALIZATION_V1
STATUS = GEMINI_COMPLETE
CANONICAL_SHA256_VERIFIED = 0c554bd3bc43c152fc4188e7439fd73046e44622d0a92483aeac6859e26bb9eb
TOTAL_PRODUCTS_BEFORE = 532
LOCALIZATION_REVIEW_BEFORE = 198
BACKUP_PATH = data/cj-catalog-532-localized-final-v1.RETRY_V2-2026-09-09-1759.backup.json
BACKUP_SHA256 = 0c554bd3bc43c152fc4188e7439fd73046e44622d0a92483aeac6859e26bb9eb
INPUT_MANIFEST_PATH = docs/ai/recovery/UMTUBA_STORE_GEMINI_CURRENT_198_NEW_LOCALIZATION_V1/input-198-ids.json
GEMINI_INPUT_PRODUCTS = 198
GEMINI_SUCCESS = 176
GEMINI_FAILURE = 22
GEMINI_COST = $0.0501
SUCCESS_MANIFEST_PATH = docs/ai/recovery/UMTUBA_STORE_GEMINI_CURRENT_198_NEW_LOCALIZATION_V1/success-ids.json
FAILURE_MANIFEST_PATH = docs/ai/recovery/UMTUBA_STORE_GEMINI_CURRENT_198_NEW_LOCALIZATION_V1/failure-ids.json
GEMINI_RESULT_ARCHIVE_PATH = docs/ai/recovery/UMTUBA_STORE_GEMINI_CURRENT_198_NEW_LOCALIZATION_V1/gemini-archive.json
CANDIDATE_PATH = data/cj-catalog-532-localized-final-v1.GEMINI_198_CANDIDATE.json
CANDIDATE_SHA256 = c07179cddf978093acc9e188293bd269942db1657cab3b12cec828d56eeb3168
TOTAL_PRODUCTS_AFTER = 532
LOCALIZED_TOTAL = 510
LOCALIZATION_REVIEW_AFTER = 22
PUBLISHABLE_PRODUCTS = 364
HELD_PRODUCTS = 168
AVG_PUBLISHABLE_MARGIN = 0.5321108359600335
PRODUCT_IDS_CHANGED = 0
PRICES_CHANGED = 0
COSTS_CHANGED = 0
MARGINS_CHANGED = 0
COMMERCIAL_FLAGS_CHANGED = 0
IP_FLAGS_CHANGED = 0
CANONICAL_FILE_CHANGED = NO
LIVE_DEPLOY = NO
PRODUCTS_PUBLISHED = NO
PAYMENTS_CHANGED = NO
BLOCKERS = NONE
NEXT_ACTION = OWNER_REVIEW_BEFORE_CANONICAL_REPLACEMENT
```

Historical 514/18/364/168 is reference only. Actual candidate localization is 510/22. Publishable/held happened to land at 364/168.

## Attempt

- Preferred model `gemini-2.5-flash` skipped (prior 404). Working model: `gemini-flash-latest`
- Batch size 5, concurrency 1, 12s inter-request delay
- Quality gates unchanged (`evaluateLocalizationQuality` + `goldStandardGaps`)
- Writer: `scripts/store/runGeminiCurrent198CandidateLocalization.ts` (defaults to candidate path; refuses canonical / live / backup writes)

## Failed product IDs (22)

| ID | SKU | Gap |
| --- | --- | --- |
| 1359044603478675456 | CJHZ101031801AZ | unsupported_claim |
| 1360080266508505088 | CJZR101156501AZ | unsupported_claim |
| 1376513937130000384 | CJGY105926301AZ | unsupported_claim |
| 1392067844971302912 | CJGY112387101AZ | unsupported_claim |
| 1404623861760266240 | CJMY117423901AZ | unsupported_claim |
| 1405434203297943552 | CJQC117858301AZ | changed_numeric_value |
| 1429317075750490112 | CJGY125979801AZ | suspicious_mt_artifact |
| 1447901045861781504 | CJYE131669201AZ | changed_numeric_value |
| 1467092240978546688 | CJRT137153201AZ | changed_numeric_value |
| 1594961358263693312 | CJHZ161854703CX | unsupported_claim |
| 1753982835490304000 | CJYD196344902BY | unsupported_claim |
| 1796518153233633280 | CJYD205093101AZ | untranslated_supplier_spam, en_title_too_long, en_title_stuffed |
| 19583873-3C62-48C5-BE3E-B01791CC71E2 | CJQCWBQC00076-200cm x 50cm | suspicious_mt_artifact |
| 20B24E49-68D5-4A7E-A17A-C4580004C59F | CJJJCWNY00052-5style | unsupported_claim |
| 2406180737491620300 | CJYD206305002BY | unsupported_claim |
| 2408150612121603200 | CJYD211114301AZ | changed_numeric_value |
| 52022F6B-104F-453E-A1E6-73797FF89B87 | CJBJHZHZ00263-Red | unsupported_claim |
| 6393DCAD-3885-42D4-B6BC-ADF846AB8CB2 | CJJJCWGY00551-Blue | unsupported_claim |
| 8800BE41-B655-4594-8BFD-6BF53003231F | CJBJHZCZ00186-50ml | unsupported_claim |
| C0080972-C4DC-47BD-BDA5-B6F0B4484C42 | CJJJJTJT01168-default | unsupported_claim |
| C9052A90-6D89-419A-8A7C-BC34FA08B426 | CJBJHZHZ00566-Brown | unsupported_claim |
| EE1DC650-D8A1-477D-83D5-A5EFEA81FEB2 | CJJJCWGY00400-5cm Yellow | unsupported_claim |

Failure buckets: unsupported_claim=15, changed_numeric_value=4, suspicious_mt_artifact=2, title-spam=1.

## Next action

Owner visual review of the candidate before any canonical replacement.
