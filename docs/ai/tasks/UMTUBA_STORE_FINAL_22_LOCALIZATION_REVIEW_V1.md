# UMTUBA_STORE_FINAL_22_LOCALIZATION_REVIEW_V1

Owner-authorized localization review of the 22 products still in `LOCALIZATION_REVIEW` after `UMTUBA_STORE_GEMINI_CURRENT_198_NEW_LOCALIZATION_V1`.

## Status

**REVIEW_COMPLETE**

Preflight passed: source candidate SHA256 matched, counts were 532 / 510 / 22, and the 22 failure IDs matched `docs/ai/recovery/UMTUBA_STORE_GEMINI_CURRENT_198_NEW_LOCALIZATION_V1/failure-ids.json`.

Surgical local edits were applied to those 22 IDs only, using the prior Gemini archive drafts plus authoritative source title/description. Gemini was not called again. Quality gates were not weakened. All 22 now pass `evaluateLocalizationQuality` + `goldStandardGaps`.

Canonical and the Gemini 198 candidate were not overwritten. The original 510 localizations are unchanged.

## Required block

```text
TASK_ID = UMTUBA_STORE_FINAL_22_LOCALIZATION_REVIEW_V1
STATUS = REVIEW_COMPLETE
SOURCE_CANDIDATE_SHA256_VERIFIED = c07179cddf978093acc9e188293bd269942db1657cab3b12cec828d56eeb3168
INPUT_PRODUCTS = 22
FIXED_TOTAL = 22
STILL_REVIEW_TOTAL = 0
UNSUPPORTED_CLAIM_FIXED = 15
UNSUPPORTED_CLAIM_STILL_REVIEW = 0
NUMERIC_VALUE_FIXED = 4
NUMERIC_VALUE_STILL_REVIEW = 0
MT_ARTIFACT_FIXED = 2
MT_ARTIFACT_STILL_REVIEW = 0
TITLE_SPAM_FIXED = 1
TITLE_SPAM_STILL_REVIEW = 0
ADDITIONAL_GEMINI_COST = $0.0000
FINAL_CANDIDATE_PATH = data/cj-catalog-532-localized-final-v1.FINAL_22_CANDIDATE.json
FINAL_CANDIDATE_SHA256 = bee64499b82a957777020ebdb5e5e7626dc0b73f16ff8861abce2b9eb84d47c1
TOTAL_PRODUCTS = 532
LOCALIZED_TOTAL = 532
LOCALIZATION_REVIEW = 0
PUBLISHABLE_PRODUCTS = 380
HELD_PRODUCTS = 152
AVG_PUBLISHABLE_MARGIN = 0.5306495931108619
IDS_CHANGED = 0
PRICES_CHANGED = 0
COSTS_CHANGED = 0
MARGINS_CHANGED = 0
COMMERCIAL_FLAGS_CHANGED = 0
IP_FLAGS_CHANGED = 0
ORIGINAL_510_LOCALIZATIONS_CHANGED = 0
CANONICAL_FILE_CHANGED = NO
LIVE_DEPLOY = NO
PAYMENTS_CHANGED = NO
BLOCKERS = NONE
NEXT_ACTION = OWNER_REVIEW_FOR_CANONICAL_PROMOTION
```

Remaining-review IDs: none.

## Method

- Reused existing gates (`qualityGate.ts`, `goldStandardGaps`, `catalog_qa.flag === LOCALIZATION_REVIEW`).
- Compared each failed Gemini draft against source title/description and `gemini-archive.json`.
- Surgical edits only:
  - `unsupported_claim`: removed `treat`/`treats` (pet food) and Arabic substrings that trip `طبي` (`تطبيق`, `طبيعي`, `طبيب`/`طبية`). Doctor-play copy uses `دكتور` / toy stethoscope.
  - `changed_numeric_value`: restored source digits only; spelled-out Five/Seven kept spelled; dropped invented `OBD2` / numbered connectors.
  - `suspicious_mt_artifact`: removed forbidden `pet supplies` and `car styling` phrases; no extra facts.
  - `title_spam`: shortened customer title; kept listed model codes `T1T1ST` and `AirT3`; did not invent extra model splits.
- Writer: `scripts/store/runFinal22LocalizationReview.ts` (refuses canonical, paired live, and the Gemini 198 candidate).

## Still commercially held (localized, not localization-review)

These 6 now have `local_pass` but keep prior commercial HOLDs. HOLD-repair was out of scope.

| ID | Remaining flag |
| --- | --- |
| 1392067844971302912 | PRODUCT_DATA_REVIEW (keyword-stuffed supplier title) |
| 1429317075750490112 | PRICE_REVIEW (margin_below_40) |
| 1753982835490304000 | PRODUCT_DATA_REVIEW (keyword-stuffed supplier title) |
| 1796518153233633280 | PRODUCT_DATA_REVIEW (travel / different product family) |
| 20B24E49-68D5-4A7E-A17A-C4580004C59F | PRODUCT_DATA_REVIEW (kids listing describes unrelated goods) |
| 2408150612121603200 | PRODUCT_DATA_REVIEW (beauty listing misclassified / unsafe) |

Publishable 380 / held 152 is the actual audit (364 + 16 newly unblocked by localization only). Do not force 364/168.

## Artifacts

- Input IDs: `docs/ai/recovery/UMTUBA_STORE_FINAL_22_LOCALIZATION_REVIEW_V1/input-22-ids.json`
- Success IDs: `docs/ai/recovery/UMTUBA_STORE_FINAL_22_LOCALIZATION_REVIEW_V1/success-ids.json`
- Remaining review: `docs/ai/recovery/UMTUBA_STORE_FINAL_22_LOCALIZATION_REVIEW_V1/remaining-review-ids.json`
- Archive: `docs/ai/recovery/UMTUBA_STORE_FINAL_22_LOCALIZATION_REVIEW_V1/review-archive.json`
- Audit: `docs/ai/recovery/UMTUBA_STORE_FINAL_22_LOCALIZATION_REVIEW_V1/candidate-audit.json`
- Candidate: `data/cj-catalog-532-localized-final-v1.FINAL_22_CANDIDATE.json`
