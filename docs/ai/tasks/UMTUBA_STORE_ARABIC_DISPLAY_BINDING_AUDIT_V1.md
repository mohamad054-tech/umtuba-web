# UMTUBA_STORE_ARABIC_DISPLAY_BINDING_AUDIT_V1

Read-only audit of why the Store UI shows English/source product text instead of Arabic already stored on the FINAL_22 canonical. No code or catalog change.

## Status

**COMPLETE — WAIT FOR OWNER GO**

Canonical SHA256 verified as `bee64499b82a957777020ebdb5e5e7626dc0b73f16ff8861abce2b9eb84d47c1` before and after. 532 / 532 localized / 0 review / 380 publishable / 152 HOLD. Localization data is present. Display binding is broken on the 532 preview surface.

## Required block

```text
TASK_ID = UMTUBA_STORE_ARABIC_DISPLAY_BINDING_AUDIT_V1
STATUS = COMPLETE
CANONICAL_SHA256_VERIFIED = YES
CANONICAL_ARABIC_FIELDS = localized.title_ar, localized.description_ar, localized.department_ar, localized.subcategory_ar, localized.specifications_ar, localized.search_keywords_ar
STORE_ACTUAL_DATA_SOURCE = SANDBOX: approved-59 + expansion-473 JSON via loadStoreBrowseCatalog, overlay from data/cj-catalog-532-localized-final-v1.json; /store: Supabase listPublicCatalog(limit 48), no JSON overlay
STORE_TITLE_FIELD_RENDERED = sandbox ProductCard/PDP: catalogItem.product.title / customer.title after applyCustomerLocalization (ar → localized.title_ar, else localized.title_en_clean). Default URL uses en. /store: store_products.title (currently 0 products locally)
STORE_DESCRIPTION_FIELD_RENDERED = sandbox PDP: customer.description (ar → localized.description_ar). Cards: catalogItem.product.short_description is NOT overlaid (stays English draft short). /store: store_products.short_description / description
ARABIC_LOCALE_DETECTED = APP SHELL YES (cookie umtuba_locale / Accept-Language → html dir). SANDBOX PRODUCT OVERLAY NO unless ?dir=rtl. /store locale used for chrome/money only
ALL_VIEW_SOURCE = loadStoreBrowseCatalog + applyCustomerLocalization + applyPublishableCustomerVisibility + filterBrowseCatalog
CATEGORY_VIEW_SOURCE = SAME loader; only filterBrowseCatalog({ dept })
PRODUCT_DETAIL_SOURCE = sandbox: findBrowseProductBySlug on same browse+overlay; /store PDP: getPublicProductDetail(Supabase)
ROOT_CAUSE = Sandbox locale is hardcoded from query dir=rtl (locale = rtl ? "ar" : "en"). Cookie and Accept-Language are ignored for product copy, so the 380-product preview renders title_en_clean. Arabic fields exist and the mapper works when locale is forced to ar.
AFFECTED_PRODUCT_COUNT = 380
LOCALIZATION_DATA_MISSING = NO
LOCALIZATION_BINDING_BROKEN = YES
LIVE_DATA_DIFFERENT_FROM_CANONICAL = YES
SAFE_FIX = On cj-launch listing + PDP, resolve locale via resolveRequestLocale() (cookie → Accept-Language) and keep ?dir=rtl as an explicit override. Optionally set catalogItem.product.short_description in applyCustomerLocalization. Do not touch the canonical JSON. Do not publish /store from this task.
FILES_REQUIRED_TO_CHANGE = app/sandbox/store/cj-launch/page.tsx; app/sandbox/store/cj-launch/[slug]/page.tsx; lib/store/productLocalization/customerOverlay.ts (optional short_description)
DATABASE_CHANGE_REQUIRED = NO
DEPLOY_REQUIRED_TO_SEE_FIX_LIVE = NO
```

## Surfaces

### `/sandbox/store/cj-launch` (what shows the 532 / 380)

Browse source is `loadStoreBrowseCatalog()` = approved-59 production candidate + expansion (473), 532 IDs, 0 ID mismatches vs the canonical. Overlay reads `readLocalizationCatalogFile()` which prefers `data/cj-catalog-532-localized-final-v1.json`.

Locale on listing and PDP:

```ts
const rtl = params.dir === "rtl";
const locale: AppLocale = rtl ? "ar" : "en";
```

`applyCustomerLocalization` then picks `localized.title_ar` only when `locale === "ar"`.

Live local HTML (127.0.0.1:3000):

| URL / headers | Product titles shown |
| --- | --- |
| `/sandbox/store/cj-launch` | English cleaned (`title_en_clean`) |
| cookie `umtuba_locale=ar` | html `dir=rtl`, products still English cleaned |
| `Accept-Language: ar` | same: shell RTL, products English cleaned |
| `?dir=rtl` | Arabic `title_ar` on All, Fashion, Home, PDP |

HOLD rows are hidden (`customerVisible=false`). Customer storefront = 380. HOLD is irrelevant to this display bug.

All view and category view share the same loader. PDP uses the same overlay after slug lookup.

### `/store` (Discovery)

`listPublicCatalog(supabase, { limit: 48 })`. No `applyCustomerLocalization`. Locale from `resolveRequestLocale()` is passed to ProductCard for money only. Card/PDP render `product.title` from Supabase.

Local `/store` and `/store/search` with Arabic Accept-Language: chrome is Arabic, **0 product links**, “No featured products yet”, catalog load error. None of the 532 titles appear. Live Store and the canonical JSON are different datasets.

## Canonical Arabic keys (real sample)

Nested under each product, not top-level `title_ar` / `name.ar`:

`products[].localized.title_ar`
`products[].localized.description_ar`
`products[].localized.title_en_clean`
`products[].localized.description_en_clean`
plus `department_ar`, `subcategory_ar`, `specifications_ar`, `search_keywords_ar`.

Example PET gold row `1687032314666168320`: `source_title` = “Pet Stainless Steel Water Bowl Large Capacity Floating”; `localized.title_ar` = “وعاء ماء عائم للحيوانات الأليفة من الستانلس ستيل”.

## Product examples (publishable)

See CURSOR_REPORT. Mapper emits Arabic when locale is `ar`, English cleaned when `en`. Default sandbox URL uses `en`. `/store` would not show these IDs at all.

## Secondary gap (not the owner-visible title bug)

`applyCustomerLocalization` writes `customer.short_description` and `catalogItem.product.title` / `description`, but not `catalogItem.product.short_description`. ProductCard reads the catalogItem short field, so card subtitles stay English even under `?dir=rtl`.

## Proposed MINIMAL fix (not applied)

1. `app/sandbox/store/cj-launch/page.tsx` and `[slug]/page.tsx`: `const { locale } = await resolveRequestLocale()`; treat `dir=rtl` / `lang=ar` as override only.
2. Optional: `customerOverlay.ts` also set `catalogItem.product.short_description`.
3. Do not change the canonical catalog, Gemini, HOLD recovery, `/store` loaders, or deploy.

Wait for OWNER GO.
