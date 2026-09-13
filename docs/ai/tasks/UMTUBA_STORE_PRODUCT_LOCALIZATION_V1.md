# UMTUBA_STORE_PRODUCT_LOCALIZATION_V1

## Status

**ARABIC_LOCALIZATION_OWNER_PASS = YES** — 20-product gold sample visually approved and frozen.

Follow-on: `UMTUBA_STORE_PRODUCT_LOCALIZATION_FULL_CATALOG_V1` applies the same rules to the approved 59 + current expansion. Local pipeline only. No paid Gemini/OpenAI.

## Gold standard freeze

- Frozen file: `data/cj-localization-qa-sample-v1.json` (do not rewrite product copy)
- Frozen IDs: `lib/store/productLocalization/constants.ts` (`LOCALIZATION_QA_SAMPLE_IDS`)
- Style: clean English titles, fluent MSA Arabic, facts only, no keyword spam, no invented specs

## Full catalog pass

- Task: `UMTUBA_STORE_PRODUCT_LOCALIZATION_FULL_CATALOG_V1`
- Machine-readable catalog: `data/cj-localization-catalog-v1.json` (gold sample JSON not rewritten)
- Gold 20 reused exactly (`generated_at` of the sample file remains `2026-09-09T10:55:45.748Z`)
- Approved 59: 17 gold + 42 editorial `local_pass` (all 59 shipped)
- Expansion 300: 3 gold + 130 `local_pass` + 167 `manual_review_required`
- Catalog total 359 = 59 + 300 (no silent quality downgrade)

```text
TOTAL_PRODUCTS_LOCALIZED = 192
ARABIC_TITLES_COMPLETE = 192
ARABIC_DESCRIPTIONS_COMPLETE = 192
SPECIFICATIONS_COMPLETE = 192
NUMERIC_FACTS_PRESERVED = 192
UNTRANSLATED_ARTIFACTS = 0
UNSUPPORTED_CLAIMS = 0
MANUAL_REVIEW_REQUIRED = 167
PAID_AI_USED = NO
PAID_AI_REQUIRED = YES
```

## Safety

- No commit / push / deploy / production DB
- `CJ_ORDER_FULFILLMENT_ENABLED=false`
- Never print keys / `.env`
- Paid providers stay disabled
- Customer overlay never includes CJ IDs, landed cost, or margin

## Previews

- Gold + metrics: http://localhost:3000/sandbox/store/cj-localization-qa
- Customer store: http://localhost:3000/sandbox/store/cj-launch
- RTL: http://localhost:3000/sandbox/store/cj-launch?dir=rtl

## Next action

Paid-AI / human review of `manual_review_required` SKUs, then owner QA of the local_pass expansion set. Do not enable Gemini/OpenAI until that GO.
