# UMTUBA_STORE_17_AUTO_RECOVERABLE_APPLY_V1

Candidate-only apply of the 17 AUTO_RECOVERABLE keyword-stuffed title holds.

## Status

**COMPLETE**

Canonical SHA256 verified as `bee64499b82a957777020ebdb5e5e7626dc0b73f16ff8861abce2b9eb84d47c1` before and after. Canonical was not replaced. New backup `data/cj-catalog-532-localized-final-v1.HOLD17-2026-09-10T11-23-19.backup.json` matches that SHA.

Official read-only audit on the candidate (`auditLocalizationCatalogPath`): 532 total / 532 localized / 0 localization review / 397 publishable / 135 held.

## Required block

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

## Gate

`lib/store/productLocalization/catalogQa.ts` `evaluateCatalogQa` reads `source.source_title` and flags keyword-stuffed when word count ≥ 18.
`lib/store/productLocalization/publishable.ts` `isPublishableBrowseRow` blocks on stored `catalog_qa`.

Correction applied on the 17 IDs only: copy existing `localized.title_en_clean` into `source_title`, then re-evaluate that row's `catalog_qa`. No invented titles. Arabic and other localized fields unchanged.

## Not done

- Canonical promotion
- MANUAL_REVIEW / HARD_HOLD
- Gemini / deploy / publish / payments / commit
