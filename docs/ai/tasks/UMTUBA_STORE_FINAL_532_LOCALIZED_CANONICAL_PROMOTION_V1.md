# UMTUBA_STORE_FINAL_532_LOCALIZED_CANONICAL_PROMOTION_V1

Owner GO: promote the verified FINAL_22 candidate to the Store canonical catalog.

## Status

**ALREADY_PROMOTED**

Independent verification of current disk state (same GO sent again). Candidate SHA256 matched `bee64499b82a957777020ebdb5e5e7626dc0b73f16ff8861abce2b9eb84d47c1`. Current canonical SHA256 is already the same value. The existing timestamped backup still hashes to the original old canonical `0c554bd3bc43c152fc4188e7439fd73046e44622d0a92483aeac6859e26bb9eb`. Idempotent rule applied: no second backup, no recopy. Read-only audits match the expected verified state.

Gemini was not rerun. HOLD recovery was not started. Live deploy / publish / payments were not changed.

## Required block

```text
TASK_ID = UMTUBA_STORE_FINAL_532_LOCALIZED_CANONICAL_PROMOTION_V1
STATUS = ALREADY_PROMOTED
OLD_CANONICAL_SHA256 = 0c554bd3bc43c152fc4188e7439fd73046e44622d0a92483aeac6859e26bb9eb
BACKUP_PATH = data/cj-catalog-532-localized-final-v1.CANONICAL-pre-FINAL22-promotion-20260910-120959.json
BACKUP_SHA256 = 0c554bd3bc43c152fc4188e7439fd73046e44622d0a92483aeac6859e26bb9eb
SOURCE_CANDIDATE_SHA256 = bee64499b82a957777020ebdb5e5e7626dc0b73f16ff8861abce2b9eb84d47c1
NEW_CANONICAL_SHA256 = bee64499b82a957777020ebdb5e5e7626dc0b73f16ff8861abce2b9eb84d47c1
EXACT_SHA_MATCH = YES
TOTAL_PRODUCTS = 532
LOCALIZED_TOTAL = 532
LOCALIZATION_REVIEW = 0
PUBLISHABLE_PRODUCTS = 380
HELD_PRODUCTS = 152
AVG_PUBLISHABLE_MARGIN = 0.5306495931108619
PRODUCTS_ADDED = 0
PRODUCTS_DELETED = 0
IDS_CHANGED = 0
PRICES_CHANGED = 0
COSTS_CHANGED = 0
MARGINS_CHANGED = 0
COMMERCIAL_FLAGS_CHANGED = 0
IP_FLAGS_CHANGED = 0
GEMINI_RERUN = NO
LIVE_DEPLOY = NO
PRODUCTS_PUBLISHED = NO
PAYMENTS_CHANGED = NO
BLOCKERS = NONE
NEXT_ACTION = UMTUBA_STORE_152_HOLD_RECOVERY_AUDIT_V1
```

## Method (this verification pass)

1. Hashed source candidate before any write decision. SHA256 = expected `bee644…`.
2. Hashed current canonical. Already `bee644…` (promotion stuck).
3. Hashed existing backup `data/cj-catalog-532-localized-final-v1.CANONICAL-pre-FINAL22-promotion-20260910-120959.json`. SHA256 = original old canonical `0c554b…`.
4. Confirmed only one pre-FINAL22 backup exists. Did not create a second backup. Did not recopy.
5. `cmd /c fc /b` reported no differences between canonical and FINAL_22 candidate.
6. Ran read-only `auditLocalizationCatalogPath.ts` and `auditHoldRecovery.ts`.

## Method (prior promotion, already on disk)

1. Verified source candidate SHA256 before any replacement.
2. Created `data/cj-catalog-532-localized-final-v1.CANONICAL-pre-FINAL22-promotion-20260910-120959.json` via `Copy-Item` of the then-current canonical. Did not overwrite `RETRY_V2-2026-09-09-1759.backup.json`.
3. Confirmed backup SHA256 equals old canonical SHA256.
4. Replaced only `data/cj-catalog-532-localized-final-v1.json` with `Copy-Item` from the FINAL_22 candidate.
5. Confirmed new canonical SHA256 equals the candidate SHA256.

## Audits (read-only, this pass)

Localization (`auditLocalizationCatalogPath.ts` on the current canonical):

| Metric | Value |
| --- | --- |
| total_products | 532 |
| localized_not_manual | 532 |
| localization_review | 0 |
| publishable | 380 |
| held | 152 |
| avg_margin | 0.5306495931108619 |
| ip_review | 3 |
| price_review | 25 |
| product_data_review | 129 |

Commercial hold audit (`auditHoldRecovery.ts`) reported the same publishable / held / localization-review counts.

## Preserved

| File | SHA256 |
| --- | --- |
| FINAL_22 candidate | bee64499b82a957777020ebdb5e5e7626dc0b73f16ff8861abce2b9eb84d47c1 |
| Current canonical | bee64499b82a957777020ebdb5e5e7626dc0b73f16ff8861abce2b9eb84d47c1 |
| GEMINI_198 candidate | c07179cddf978093acc9e188293bd269942db1657cab3b12cec828d56eeb3168 |
| `cj-localization-catalog-v1.json` | 0c554bd3bc43c152fc4188e7439fd73046e44622d0a92483aeac6859e26bb9eb |
| RETRY_V2 backup | 0c554bd3bc43c152fc4188e7439fd73046e44622d0a92483aeac6859e26bb9eb |
| Existing pre-promotion backup | 0c554bd3bc43c152fc4188e7439fd73046e44622d0a92483aeac6859e26bb9eb |

Input / success / failure manifests and Gemini recovery archives were not modified.

## Not done

- HOLD recovery (`UMTUBA_STORE_152_HOLD_RECOVERY_AUDIT_V1`)
- Live deploy / publish / payments
- Commit / push
