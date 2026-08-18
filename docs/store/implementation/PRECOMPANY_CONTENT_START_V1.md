# Store pre-company content start V1

Extends `PRECOMPANY_PROVIDER_FOUNDATION_V2.md`. No second provider stack.

## Demo catalog

`lib/store/demo` — 26 UMTUBA-owned or synthetic DEMO products.

- SOURCE_TYPE=DEMO
- RIGHTS_STATUS=DEMO_ONLY
- PURCHASABLE=NO
- PRODUCTION_SELLABLE=NO
- REAL_PROVIDER=NONE
- Images: UMTUBA_NEUTRAL_PLACEHOLDER only

In-memory surface covers catalog, search, filters, PDP, variants, favorites, cart, checkout sandbox, empty/loading/error. No live checkout.

## Categories

`lib/store/categories` — Electronics, Fashion, Home, Beauty, Sports, Books, Accessories, Kids, Automotive Accessories, Office, Digital/Other. Provider aliases map into these slugs. Residual / unknown maps to Digital/Other.

## Mock provider A

`lib/store/providers/mockProviderA.ts` — 25 synthetic products → import → normalize → category map → rights gate. MOCK_DATA cannot become production-purchasable.
