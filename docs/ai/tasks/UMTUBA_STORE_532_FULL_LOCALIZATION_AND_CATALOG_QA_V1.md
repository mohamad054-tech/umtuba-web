# UMTUBA_STORE_532_FULL_LOCALIZATION_AND_CATALOG_QA_V1

## Status

**LOCAL_PASS_WITH_REVIEW_QUEUE** — 532 products accounted. Gold 20 frozen and reused. Local pipeline shipped 334 at gold-standard quality. 198 titles flagged for paid-AI / human review instead of silent quality drop.

```text
ARABIC_LOCALIZATION_OWNER_PASS = YES
GOLD_STANDARD_PRESERVED = 20/20
TOTAL_PRODUCTS = 532
PRODUCTS_LOCALIZED = 334
MANUAL_REVIEW_REQUIRED = 198
PAID_AI_USED = NO
PAID_AI_REQUIRED = YES
```

## Inputs

- Approved 59: `data/cj-store-launch-approved-59.json`
- Expansion 473: `data/cj-catalog-expansion-300-v1.json`
- Frozen gold sample: `data/cj-localization-qa-sample-v1.json` (do not rewrite)

## Outputs

- Machine-readable catalog: `data/cj-localization-catalog-v1.json`
- Customer preview: `/sandbox/store/cj-launch` and `?dir=rtl`
- QA preview: `/sandbox/store/cj-localization-qa`

## Paid-AI estimate (no spend)

198 products · ~138.6k input tokens · ~108.9k output tokens  
Gemini Flash ≈ **$0.09** · Gemini Pro ≈ **$1.26**  
Owner GO required before any credits.

## Safety

- No commit / push / deploy / production DB
- Customer overlay never includes CJ IDs, landed cost, or margin
- Unavailable / unverified listings stay hidden
