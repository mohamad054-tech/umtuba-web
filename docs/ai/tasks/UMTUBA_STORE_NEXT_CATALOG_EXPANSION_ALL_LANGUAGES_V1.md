# UMTUBA_STORE_NEXT_CATALOG_EXPANSION_ALL_LANGUAGES_V1

## Status

CANDIDATE_READY locally. Not committed. Not deployed. Canonical 532 unchanged.

## REQUIRED_STORE_LOCALES

`["ar", "en", "fr", "es", "de", "pt"]` — exact `SUPPORTED_LOCALES` from `lib/i18n/locales.ts`. Settings `LanguageSelector` and Translation Studio use the same list. PROJECT_STATE does not exclude any locale from Store.

## Result

- Live READ-ONLY CJ expansion (Electronics / Sports / Garden keywords, skip all 532 IDs): 30 accepted, 23 list-time rejects
- Unused leftover SKUs from profit-gate / launch-mix / pilot (58) all failed family-cap / profit / hold reuse
- Pre-Gemini commercial gate kept 8; rejected 22 (family cap, IP, apparel, surveillance cameras, category mismatch)
- Gemini Flash localized all 8 into 6/6 locales. Actual spend $0.0058
- Candidate `data/cj-catalog-532-plus-expansion-ALL_LOCALES-CANDIDATE.json`: 532 preserved + 8 new = 540
- Publishable: 397 original + 8 new = 405. Original HOLD 135 unchanged

## Safety

- Canonical SHA256 still `92775bcb72f894a13663a3c4a3c87007ca5d747a8ebc3f83e461306c10d63f52`
- No commit / push / deploy / payments
- Existing 532 product objects hash-identical inside the candidate
