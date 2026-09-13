# UMTUBA_STORE_HOLD17_CANONICAL_PROMOTION_V1

Owner GO: promote the verified HOLD17 candidate to the Store canonical catalog.

## Status

**COMPLETE**

Independent verification: source candidate SHA256 matched `92775bcb72f894a13663a3c4a3c87007ca5d747a8ebc3f83e461306c10d63f52`. Current canonical before promotion was FINAL_22 `bee64499b82a957777020ebdb5e5e7626dc0b73f16ff8861abce2b9eb84d47c1`. One new timestamped backup was created and hashed to the same FINAL_22 value. Canonical was replaced with exact candidate bytes via `Copy-Item`. New canonical SHA256 equals the candidate. Read-only audits: 532 / 0 localization review / 397 publishable / 135 held. Remaining hold classification: 129 MANUAL_REVIEW / 6 HARD_HOLD. Product-level diff vs old canonical is exactly the 17 AUTO_RECOVERABLE IDs.

Gemini was not rerun. Live deploy / publish / database / payments were not changed.

## Required block

```text
TASK_ID = UMTUBA_STORE_HOLD17_CANONICAL_PROMOTION_V1
STATUS = COMPLETE
OLD_CANONICAL_SHA256 = bee64499b82a957777020ebdb5e5e7626dc0b73f16ff8861abce2b9eb84d47c1
BACKUP_PATH = data/cj-catalog-532-localized-final-v1.CANONICAL-pre-HOLD17-promotion-20260910-142925.json
BACKUP_SHA256 = bee64499b82a957777020ebdb5e5e7626dc0b73f16ff8861abce2b9eb84d47c1
SOURCE_CANDIDATE_SHA256 = 92775bcb72f894a13663a3c4a3c87007ca5d747a8ebc3f83e461306c10d63f52
NEW_CANONICAL_SHA256 = 92775bcb72f894a13663a3c4a3c87007ca5d747a8ebc3f83e461306c10d63f52
EXACT_SHA_MATCH = YES
TOTAL_PRODUCTS = 532
LOCALIZATION_REVIEW = 0
PUBLISHABLE_PRODUCTS = 397
HELD_PRODUCTS = 135
MANUAL_REVIEW_REMAINING = 129
HARD_HOLD_REMAINING = 6
UNRELATED_PRODUCTS_CHANGED = 0
CANONICAL_REPLACED = YES
LIVE_DEPLOY = NO
DATABASE_CHANGED = NO
GEMINI_RERUN = NO
BLOCKERS = NONE
NEXT_ACTION = OWNER_REVIEW
```

## Method

1. Hashed HOLD17 candidate before any write. SHA256 = expected `92775bcb…`.
2. Hashed current canonical. SHA256 = FINAL_22 `bee64499…`. File existed.
3. Created `data/cj-catalog-532-localized-final-v1.CANONICAL-pre-HOLD17-promotion-20260910-142925.json` via `Copy-Item` of the then-current canonical. Did not overwrite `RETRY_V2`, `pre-FINAL22`, or `HOLD17-2026-09-10T11-23-19.backup.json`.
4. Confirmed backup SHA256 equals old canonical SHA256 (`bee64499…`).
5. Replaced only `data/cj-catalog-532-localized-final-v1.json` with `Copy-Item` from the HOLD17 candidate. No transform.
6. Confirmed new canonical SHA256 equals `92775bcb…`.
7. Ran read-only `auditLocalizationCatalogPath.ts` and `auditHoldRecovery.ts` on the new canonical.
8. Intersected still-held IDs with the 152-audit `manual-review.json` (129) and `hard-hold.json` (6). All 129 + 6 remain held; none released; no unclassified held IDs.
9. Diffed new canonical vs the backup just created. Exactly the 17 AUTO_RECOVERABLE IDs differ. Unrelated products changed: 0.

Untouched (hashes recorded after promotion):

- HOLD17 candidate still `92775bcb…`
- FINAL_22 candidate still `bee64499…`
- GEMINI_198 candidate `c07179cd…`
- `data/cj-localization-catalog-v1.json` `0c554bd3…`

## Audits (read-only, new canonical)

Localization (`auditLocalizationCatalogPath.ts`):

| Metric | Value |
| --- | ---: |
| total_products | 532 |
| localized_not_manual | 532 |
| localization_review | 0 |
| publishable | 397 |
| held | 135 |
| avg_margin | 0.52931782699604 |
| ip_review | 3 |
| price_review | 25 |
| product_data_review | 112 |

Commercial hold audit (`auditHoldRecovery.ts`) reported the same 532 / 0 localization review / 397 publishable / 135 held.

## Safety

- No Gemini rerun
- No localization body edits
- No price / cost / margin / stock / image edits beyond bytes already in the candidate
- No deploy / publish / Supabase / database
- No cj-launch / Arabic display edits
- No commit / push
