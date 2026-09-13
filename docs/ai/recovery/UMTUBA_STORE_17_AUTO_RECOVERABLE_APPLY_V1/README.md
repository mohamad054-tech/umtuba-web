# UMTUBA_STORE_17_AUTO_RECOVERABLE_APPLY_V1

Candidate-only apply of the 17 AUTO_RECOVERABLE products from `UMTUBA_STORE_152_HOLD_RECOVERY_AUDIT_V1`.

Canonical was not replaced.

```text
TASK_ID = UMTUBA_STORE_17_AUTO_RECOVERABLE_APPLY_V1
STATUS = COMPLETE
CANONICAL_SHA256_VERIFIED = YES
AUTO_RECOVERY_MANIFEST_VERIFIED = YES
INPUT_PRODUCTS = 17
FIXED_PRODUCTS = 17
FAILED_TO_FIX = NONE
UNRELATED_PRODUCTS_CHANGED = 0
CANDIDATE_PATH = data/cj-catalog-532-localized-final-v1.HOLD17_CANDIDATE.json
CANDIDATE_SHA256 = 92775bcb72f894a13663a3c4a3c87007ca5d747a8ebc3f83e461306c10d63f52
TOTAL_PRODUCTS = 532
PUBLISHABLE_AFTER = 397
HELD_AFTER = 135
PUBLISHABLE_GAIN = 17
MANUAL_REVIEW_REMAINING = 129
HARD_HOLD_REMAINING = 6
LOCALIZATION_CHANGED = NO
GEMINI_RERUN = NO
PRODUCTS_ADDED = 0
PRODUCTS_DELETED = 0
CANONICAL_REPLACED = NO
LIVE_DEPLOY = NO
PRODUCTS_PUBLISHED = NO
PAYMENTS_CHANGED = NO
BLOCKERS = NONE
NEXT_ACTION = OWNER_REVIEW_BEFORE_CANONICAL_PROMOTION
```

## Gate used

`evaluateCatalogQa` reads `source.source_title` and flags `PRODUCT_DATA_REVIEW` when word count ≥ 18.
`isPublishableBrowseRow` then blocks on stored `catalog_qa`.

For each of the 17 IDs: copied existing `localized.title_en_clean` into `source_title`, then re-evaluated `catalog_qa` for that row only. Arabic and other localized fields were not changed.

## Artifacts

- `apply-report.json` — field-level diffs, SHA256s, fixed IDs
- `candidate-audit.json` — official `auditLocalizationCatalogPath` results
- Backup: `data/cj-catalog-532-localized-final-v1.HOLD17-2026-09-10T11-23-19.backup.json` (SHA256 = canonical)
