# UMTUBA_STORE_540_13_LOCALE_CANONICAL_PROMOTION_V1

Owner GO: promote the verified 540-product / 13-locale candidate to the Store canonical catalog. Filename stays `data/cj-catalog-532-localized-final-v1.json` historically; contents become 540.

## Status

**COMPLETE**

Independent verification: source candidate SHA256 matched `a6f171dcc78b45e888c809a786da0a027a09572ec30394fac970f7c0d28112af`. Current canonical before promotion was HOLD17 `92775bcb72f894a13663a3c4a3c87007ca5d747a8ebc3f83e461306c10d63f52`. One new timestamped backup was created and hashed to the same HOLD17 value. Canonical was replaced with exact candidate bytes via `Copy-Item`. New canonical SHA256 equals the candidate.

Read-only 13-locale completeness: 540 products, all 13 locales complete, 0 incomplete. Official commercial audits (`auditLocalizationCatalogPath.ts`, `auditHoldRecovery.ts`) report **397 publishable / 143 held** against the current 532-item browse overlay. Required/expected from the candidate-era expansion-aware browse map was 405 / 135. Difference is exactly 8: `NO_QA_FLAG_BUT_NOT_PUBLISHABLE` = 8, `browse_count` = 532. Catalog bytes vs candidate are identical.

Gemini was not rerun. Live deploy / publish / database / payments were not changed.

## Required block

```text
TASK_ID = UMTUBA_STORE_540_13_LOCALE_CANONICAL_PROMOTION_V1
STATUS = COMPLETE
OLD_CANONICAL_SHA256 = 92775bcb72f894a13663a3c4a3c87007ca5d747a8ebc3f83e461306c10d63f52
BACKUP_PATH = data/cj-catalog-532-localized-final-v1.CANONICAL-pre-540-13LOCALE-promotion-20260910-212933.json
BACKUP_SHA256 = 92775bcb72f894a13663a3c4a3c87007ca5d747a8ebc3f83e461306c10d63f52
SOURCE_CANDIDATE_SHA256 = a6f171dcc78b45e888c809a786da0a027a09572ec30394fac970f7c0d28112af
NEW_CANONICAL_SHA256 = a6f171dcc78b45e888c809a786da0a027a09572ec30394fac970f7c0d28112af
EXACT_SHA_MATCH = YES
TOTAL_PRODUCTS = 540
REQUIRED_LOCALE_COUNT = 13
ALL_13_LOCALES_COMPLETE_PRODUCTS = 540
INCOMPLETE_PRODUCTS = 0
PUBLISHABLE_PRODUCTS = 397
HELD_PRODUCTS = 143
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
BLOCKERS = OFFICIAL_BROWSE_OVERLAY_STILL_532: expected 405/135; official audit 397/143
NEXT_ACTION = OWNER_REVIEW
```

## Method

1. Hashed 13-locale candidate before any write. SHA256 = expected `a6f171dc…`.
2. Hashed current canonical. SHA256 = HOLD17 `92775bcb…`. File existed.
3. Created `data/cj-catalog-532-localized-final-v1.CANONICAL-pre-540-13LOCALE-promotion-20260910-212933.json` via `Copy-Item` of the then-current canonical. Did not overwrite `RETRY_V2`, `pre-FINAL22`, `pre-HOLD17`, `HOLD17-2026-09-10T11-23-19.backup.json`, or the 540 6-locale expansion candidate.
4. Confirmed backup SHA256 equals old canonical SHA256 (`92775bcb…`).
5. Replaced only `data/cj-catalog-532-localized-final-v1.json` with `Copy-Item` from the 13-locale candidate. No transform / regenerate / retranslate.
6. Confirmed new canonical SHA256 equals `a6f171dc…`. Candidate file SHA unchanged.
7. Ran read-only `evaluateLocaleCompleteness` on all 540 products (13 locales: ar, en, fr, es, de, pt, id, hi, ru, tr, zh-CN, ja, ko).
8. Ran read-only `auditLocalizationCatalogPath.ts` and `auditHoldRecovery.ts` on the new canonical.

## Audits (read-only, new canonical)

13-locale completeness (`evaluateLocaleCompleteness`):

| Metric | Value |
| --- | ---: |
| total_products | 540 |
| required_locale_count | 13 |
| all_13_locales_complete | 540 |
| incomplete | 0 |
| ar/en/fr/es/de/pt/id/hi/ru/tr/zh-CN/ja/ko pass | 540 each |

Official commercial (`auditLocalizationCatalogPath.ts` / `auditHoldRecovery.ts`):

| Metric | Value |
| --- | ---: |
| total_products | 540 |
| localized_not_manual | 540 |
| localization_review | 0 |
| publishable | 397 |
| held | 143 |
| browse_count | 532 |
| avg_margin | 0.52931782699604 |
| ip_review | 3 |
| price_review | 25 |
| product_data_review | 112 |
| NO_QA_FLAG_BUT_NOT_PUBLISHABLE | 8 |

Expected from the candidate-era expansion-aware browse map: 405 publishable / 135 held. Official scripts use `loadStoreBrowseCatalog()` only (532 items), so the 8 expansion SKUs cannot satisfy `isPublishableBrowseRow` and are counted held. Catalog bytes were not manipulated.

## Untouched hashes after promotion

- 13-locale candidate still `a6f171dc…`
- 540 6-locale expansion candidate still `e3f87d7b…`
- New HOLD17 backup `92775bcb…`
- pre-HOLD17 backup still `bee64499…`
- RETRY_V2 and pre-FINAL22 backups still `0c554bd3…`

## Safety

- No Gemini rerun
- No localization body edits
- No price / cost / margin / ID / flag edits (same bytes as candidate)
- No deploy / publish / Supabase / database / payments
- No HOLD recovery
- No commit / push
