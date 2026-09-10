# UMTUBA_STORE_540_FULL_PRODUCTION_RELEASE_V1

Owner production GO. Live customer surface is `/store` on `alpha-0.2`.

`/store` and `/store/search` load the approved 540 catalog via `loadStoreBrowseCatalog` + localization overlay + `applyPublishableCustomerVisibility`. HOLD products stay hidden. PDP is `/store/p/[slug]` with `ProductImageGallery`. Locale is `resolveRequestLocale()` / `umtuba_locale`.
