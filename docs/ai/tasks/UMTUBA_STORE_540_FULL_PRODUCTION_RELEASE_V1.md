# UMTUBA_STORE_540_FULL_PRODUCTION_RELEASE_V1

Owner production GO for the approved 540-product / 13-locale Store.

Live customer surface is `https://umtuba.com/store`, not only `/sandbox/store/cj-launch`.

`/store` and `/store/search` load `loadStoreBrowseCatalog` + localization overlay + `applyPublishableCustomerVisibility`. HOLD products are not customer-visible. PDP is `/store/p/[slug]` with the shared `ProductImageGallery`. Locale comes from `resolveRequestLocale()` / `umtuba_locale`; product titles use `by_locale` / `title_ar` / `title_en_clean`.
