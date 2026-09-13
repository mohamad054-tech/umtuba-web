# UMTUBA_STORE_13_LOCALE_BACKFILL_AND_EXPANSION_V1

Owner GO: adopt the authoritative Store locale set of 13. Do not wait for mobile.

## Required locales

`ar, en, fr, es, de, pt, id, hi, ru, tr, zh-CN, ja, ko`

## Source

- `data/cj-catalog-532-plus-expansion-ALL_LOCALES-CANDIDATE.json`
- Expected SHA256 `e3f87d7bfceb8a0d46d1d7a75666214d8f6db244a5c7f9adbac3bccf9d233e83`
- TOTAL=540 PUBLISHABLE=405 HELD=135
- Canonical `data/cj-catalog-532-localized-final-v1.json` must not change

## Rules

- Do not resend approved Arabic or English
- Preserve the 8 expansion products; add missing locales only
- Do not overwrite the 540 6-locale candidate; write a new file
- No deploy / publish / commit / push

## Manifests

`docs/ai/recovery/UMTUBA_STORE_13_LOCALE_BACKFILL_AND_EXPANSION_V1/`
