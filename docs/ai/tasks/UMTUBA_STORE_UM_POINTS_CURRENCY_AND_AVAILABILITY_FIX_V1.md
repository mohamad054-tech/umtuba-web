# UMTUBA_STORE_UM_POINTS_CURRENCY_AND_AVAILABILITY_FIX_V1

Owner follow-up after visual review of UM Points. No production. No CJ orders. Checkout stays off.

```text
STATUS = COMPLETE
OWNER_VISUAL_APPROVAL_BANNER = YES
OWNER_VISUAL_APPROVAL_POINTS_UI = YES
CURRENCY_AR_FORMAT = 49.99 US$
UNAVAILABLE_CUSTOMER_BEHAVIOR = HIDE_FROM_CUSTOMER_LISTING
CJ_ORDER_FULFILLMENT_ENABLED = false
PRODUCTION_CHANGED = NO
```

## Owner visual approval

Recorded in `docs/ai/tasks/UMTUBA_STORE_UM_POINTS_PURCHASE_REWARDS_V1.md`. Banner and points UI (including product earn message) are approved. These two fixes were the remaining pre-production items.

## Currency

Reused the existing i18n/store money formatters. One USD system:

- LTR English: `$49.99`
- RTL Arabic: `49.99 US$` with Western digits
- Never `$US` mixed with Arabic-Indic digits

`formatMinorUnits` now takes the app locale (default `en`) instead of the OS locale.

## Availability

Customer catalog excludes `SYNC_ERROR`, `OUT_OF_STOCK`, and `PROVIDER_UNAVAILABLE`. Customer PDP 404s those slugs. Admin (`?admin=1`) can still open flagged rows, labeled INTERNAL. No silent SKU substitution. Landed cost / margin / CJ IDs stay off customer HTML.

Current candidate file reports 59 HEALTHY / 0 SYNC_ERROR after a parallel live-resolution pass (`substituted: false`). The gate still hides those statuses when they appear.

## NEXT_ACTION

After these fixes: expand toward hundreds of products with clear departments/subcategories (kitchen, home, clothing, beauty, cars, pets, travel, electronics, kids, sports, etc.). Do not import hundreds in this task.
