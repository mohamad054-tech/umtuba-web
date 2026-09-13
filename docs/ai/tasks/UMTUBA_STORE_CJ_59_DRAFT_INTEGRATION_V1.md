# UMTUBA_STORE_CJ_59_DRAFT_INTEGRATION_V1

Owner-approved integration of the 59-product CJ launch mix into isolated UMTUBA Store **drafts**. Not published. Checkout disabled. Production `/store` unchanged.

## Status

```text
TASK_ID = UMTUBA_STORE_CJ_59_DRAFT_INTEGRATION_V1
STATUS = COMPLETE
OWNER_APPROVED_SOURCE = YES
APPROVED_PRODUCTS = 59
DRAFT_PRODUCTS_PREPARED = 59
HERO_PRODUCTS = 15
STANDARD_PRODUCTS = 44
PRODUCTS_FLAGGED = 0
CATEGORY_MIX = Home 11 / Pet 16 / Car 9 / Travel 11 / Beauty / Personal 12
LOCAL_STORE_PREVIEW_URL = http://localhost:3000/sandbox/store/cj-launch
PRODUCTION_CHANGED = NO
```

Exactly the 59 selected products from `data/cj-store-launch-mix-v1.json` (15 LAUNCH_HERO + 44 LAUNCH_STANDARD). No HOLD, no ORGANIC_ONLY, no substitutions, no padding.

## Identity (internal)

Every draft:

- `provider = cj`
- `pilot_batch = CJ_STORE_LAUNCH_V1`
- `cj_product_id`
- `cj_variant_id` / SKU from V2 when present
- `status = draft`, `active = false`, `published_at = null`

Public customer ids/slugs are opaque hashes. Raw CJ ids are not used in customer URLs or listing HTML.

## Customer vs admin

Customer listing/detail show: clean title, category, images, retail price, in-stock label, delivery estimate. Checkout button is absent.

Customer UI does **not** show: landed cost, margin, gross profit, profitability score, CJ product/variant ids, SKUs.

Admin overlay (`?admin=1`) shows landed/margin/classification in a labeled “Admin only” panel.

## Live CJ refresh

Skipped. Drafts use the owner-approved launch-mix data. Read-only sync plan exists (`createCjLaunchReadSyncPlan`) for later price/stock/shipping refresh. No order/payment paths.

## Preview

- Listing: `http://localhost:3000/sandbox/store/cj-launch`
- Detail example: `http://localhost:3000/sandbox/store/cj-launch/pet-stainless-steel-water-bowl-large-capacity-fl-2ff2f30e`
- Category: `?category=Pet`
- RTL check: `?dir=rtl`
- Admin: `?admin=1`

HTTP 200: listing 59 cards, Pet 16, detail 200, production `/store` 200 with no draft mix-in.

Uses existing StoreShell + ProductCard visual system. No live Store overwrite.

## Gates

- `npx tsc --noEmit` PASS
- `npx vitest run lib/services/cj` PASS (32)
- `npm run build` PASS (routes include `/sandbox/store/cj-launch`)
- Secret scan PASS
- `git diff --check` PASS

## Next action

Owner reviews the isolated draft Store preview. Do not publish, do not enable checkout, do not create CJ orders.
