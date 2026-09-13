# UMTUBA_STORE_152_HOLD_RECOVERY_AUDIT_V1

Read-only audit of the 152 commercially held products on the FINAL_22 canonical. Localization is closed. No fixes were applied.

## Status

**COMPLETE**

Canonical SHA256 verified as `bee64499b82a957777020ebdb5e5e7626dc0b73f16ff8861abce2b9eb84d47c1` before and after the audit. Read-only localization + commercial audits (same `isPublishableBrowseRow` + stored `catalog_qa` definition that produced 380/152): 532 total / 532 localized / 0 localization review / 380 publishable / 152 held / avg publishable margin `0.5306495931108619`.

## Required block

```text
TASK_ID = UMTUBA_STORE_152_HOLD_RECOVERY_AUDIT_V1
STATUS = COMPLETE
CANONICAL_SHA256_VERIFIED = YES
TOTAL_PRODUCTS = 532
PUBLISHABLE_BEFORE = 380
HELD_BEFORE = 152
HOLD_IDS_IDENTIFIED = 152
SINGLE_REASON_HOLDS = 143
MULTI_REASON_HOLDS = 9
HOLD_REASON_COUNTS = PRODUCT_DATA_REVIEW keyword-stuffed=79; PRICE_REVIEW margin_below_40=25; Travel mismatch=7; Beauty mismatch=7; Garden mismatch=6; Kids mismatch=6; Fashion mismatch=5; Sports mismatch=5; Car mismatch=4; Home mismatch=4; Pet mismatch=4; IP_REVIEW=3; Electronics IP/fashion clip=3; Near-duplicate licking-pad group=2; Garbled/numeric title=2
PRODUCT_DATA_HOLDS = 128
PRICE_MARGIN_HOLDS = 25
IP_BRAND_HOLDS = 3
DUPLICATE_HOLDS = 2
SUPPLIER_SOURCE_HOLDS = 2
IMAGE_HOLDS = 0
SHIPPING_AVAILABILITY_HOLDS = 0
OTHER_HOLDS = 0
AUTO_RECOVERABLE = 17
MANUAL_REVIEW = 129
HARD_HOLD = 6
AUTO_RECOVERABLE_SINGLE_GATE = 17
EXPECTED_PUBLISHABLE_AFTER_SAFE_RECOVERY = 397
AUTO_RECOVERY_MANIFEST = docs/ai/recovery/UMTUBA_STORE_152_HOLD_RECOVERY_AUDIT_V1/auto-recoverable.json
MANUAL_REVIEW_MANIFEST = docs/ai/recovery/UMTUBA_STORE_152_HOLD_RECOVERY_AUDIT_V1/manual-review.json
HARD_HOLD_MANIFEST = docs/ai/recovery/UMTUBA_STORE_152_HOLD_RECOVERY_AUDIT_V1/hard-hold.json
CANONICAL_CHANGED = NO
LOCALIZATION_CHANGED = NO
GEMINI_RERUN = NO
PUBLISHABLE_PRODUCTS_CHANGED = 0
LIVE_DEPLOY = NO
PAYMENTS_CHANGED = NO
BLOCKERS = NONE
NEXT_RECOMMENDED_ACTION = Owner GO on a scoped apply-only task for the 17 AUTO_RECOVERABLE single-gate title substitutions. Do not touch the 129 MANUAL_REVIEW or 6 HARD_HOLD rows. Do not start that task here.
```

## Definition used

`lib/store/productLocalization/publishable.ts` `isPublishableBrowseRow` against stored `catalog_qa` on `data/cj-catalog-532-localized-final-v1.json`, plus browse stock / visibility from approved-59 + expansion. Blocking flags: `LOCALIZATION_REVIEW`, `PRODUCT_DATA_REVIEW`, `IP_REVIEW`, `PRICE_REVIEW`, `SHIPPING_REVIEW`, `UNAVAILABLE`. Price floor remains `evaluatePriceSafety` (margin ≥ 40% and profit ≥ $8).

A product with one AUTO reason and one HARD/MANUAL reason is not counted as expected-publishable.

## Phase 1 — HOLD classification

152 HOLD IDs identified. 143 have a single stored QA finding. 9 have multiple findings.

Exact stored reasons (finding counts; a product may contribute more than one):

| Gate / reason | Count |
| --- | ---: |
| `PRODUCT_DATA_REVIEW`: Supplier title is keyword-stuffed or unreadable. | 79 |
| `PRICE_REVIEW`: Price safety: margin_below_40. | 25 |
| `PRODUCT_DATA_REVIEW`: Travel listing title describes a different product family. | 7 |
| `PRODUCT_DATA_REVIEW`: Beauty listing title is misclassified or unsafe. | 7 |
| `PRODUCT_DATA_REVIEW`: Garden listing title does not describe a garden tool. | 6 |
| `PRODUCT_DATA_REVIEW`: Kids listing title describes adult or unrelated goods. | 6 |
| `PRODUCT_DATA_REVIEW`: Fashion listing title describes a different product family. | 5 |
| `PRODUCT_DATA_REVIEW`: Sports listing title is not a workout accessory. | 5 |
| `PRODUCT_DATA_REVIEW`: Car listing may be decorative lighting or unrelated hardware. | 4 |
| `PRODUCT_DATA_REVIEW`: Home listing title is a cable, diagnostic, or pet item. | 4 |
| `PRODUCT_DATA_REVIEW`: Pet listing title describes bag hardware. | 4 |
| `IP_REVIEW`: Title mentions a restricted brand, platform mark, or model family. | 3 |
| `PRODUCT_DATA_REVIEW`: Electronics listing title may be IP-restricted or a fashion clip. | 3 |
| `PRODUCT_DATA_REVIEW`: Near-duplicate title group (2): dog silicone licking pad pet | 2 |
| `PRODUCT_DATA_REVIEW`: Supplier title is empty, numeric-only, or garbled. | 2 |

Bucket rollup (product counts; a product may sit in more than one bucket):

- product data/completeness: **128** (catalog metric `product_data_review` = 129, including one duplicate-only row rolled to `duplicate`)
- pricing/margin: **25**
- IP/brand: **3**
- duplicate: **2** (`1665981331156774912`, `2606170908561602100`)
- supplier/source verification: **2** (numeric title `12`, `Tinker-bell-kids`)
- missing/invalid images: **0**
- shipping/availability: **0**
- other: **0**

## Phase 2 — Recoverability (identify only)

Conservative rules:

- AUTO only when an exact replacement already exists on the same row (owner-approved gold/editorial `localized.title_en_clean` for `approved_59` / `gold_standard`) or in approved-59 / expansion / profit-gate.
- Expansion `localized.title_en_clean` is localization output, not a supplier field → MANUAL_REVIEW.
- Raising retail to clear the 40% floor would invent a price → MANUAL_REVIEW.
- IP/brand stays HARD_HOLD. No authorization field exists in the dataset.
- Duplicates are not deleted. `commercialHoldAudit.duplicateScore` ranks `2606170908561602100` over `1665981331156774912`. The weaker approved-59 listing stays HARD_HOLD. The scored winner still has `PRICE_REVIEW` so it is MANUAL_REVIEW and is not expected to become publishable.

## Phase 3 — High-value recovery

- AUTO_RECOVERABLE = **17**, all single-gate keyword-stuffed title holds on owner-approved gold/editorial rows
- EXPECTED_PUBLISHABLE_AFTER_SAFE_RECOVERY = **397** (380 + 17)
- MANUAL_REVIEW = **129** (category mismatches, expansion keyword-stuffed titles, all 25 `margin_below_40` rows)
- HARD_HOLD = **6** (3 IP_REVIEW, 1 weaker duplicate, 2 unverifiable/garbled titles)

## Manifests

Under `docs/ai/recovery/UMTUBA_STORE_152_HOLD_RECOVERY_AUDIT_V1/`:

- `hold-152-ids.json`
- `hold-reasons.json`
- `single-reason-holds.json`
- `multi-reason-holds.json`
- `auto-recoverable.json`
- `manual-review.json`
- `hard-hold.json`
- `audit-summary.json`

## Not done

- No AUTO fix applied
- No Gemini rerun
- No catalog / localization / payment / deploy change
- No follow-on repair task started
