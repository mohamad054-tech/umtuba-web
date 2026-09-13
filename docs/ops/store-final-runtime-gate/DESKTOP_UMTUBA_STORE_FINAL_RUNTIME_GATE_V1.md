# DESKTOP_UMTUBA_STORE_FINAL_RUNTIME_GATE_V1

DATE = 2026-08-24
MACHINE = DESKTOP
OPERATOR = DESKTOP / WEB STORE
TASK_ID = DESKTOP_UMTUBA_STORE_FINAL_RUNTIME_GATE_V1
STATUS = BLOCKED_ONLY_REAL_ACTIVE_PRODUCT

```
TASK_ID = DESKTOP_UMTUBA_STORE_FINAL_RUNTIME_GATE_V1
STATUS = BLOCKED_ONLY_REAL_ACTIVE_PRODUCT
STORE_DESIGN_PRESERVED = YES
REAL_ACTIVE_PRODUCT_FOUND = NO
REAL_ACTIVE_PRODUCT_ID = N/A
REAL_ACTIVE_PRODUCT_VISIBLE = NO
PDP = NOT_TESTED
PRODUCT_MEDIA = NOT_TESTED
PRICE = NOT_TESTED
VARIANTS = NOT_TESTED
FAVORITES = NOT_TESTED
ADD_TO_CART = NOT_TESTED
CART_PERSISTENCE = NOT_TESTED
CHECKOUT_SAFE_FLOW = NOT_TESTED
REAL_PAYMENT_CAPTURE = DISABLED
ARABIC_RTL = NOT_TESTED
LTR = NOT_TESTED
DESKTOP_RESPONSIVE = NOT_TESTED
MOBILE_WEB_RESPONSIVE = NOT_TESTED
AUTH_SESSION = NOT_TESTED
LOADING_EMPTY_ERROR = EMPTY_OBSERVED
RUNTIME_DEFECTS_FOUND = NONE
FIXES_APPLIED = NO
TESTS = N/A
TYPECHECK = N/A
BUILD = N/A
DEPLOYED = NO
SOURCE_SHA = 92992786f41f68e83331fe00d991e8b9437275e2
LIVE_RELEASE = /opt/umtuba/production/releases/92992786-20260824153400
ORIGIN_STORE_TIP = 6d1a2b4526f95e4a0fd05d39ec0da5bd129d8a0f
MIGRATION = NO
MIGRATION_20260934_APPLIED = NO
MOBILE_NATIVE_TOUCHED = NO
LEARNING_TOUCHED = NO
STORE_FINAL_RUNTIME_GATE = BLOCKED_ONLY_REAL_ACTIVE_PRODUCT
```

## Verdict

Live Store is up at `https://umtuba.com/store`. Night Market / accepted Store design is on production. Public catalog query returned **zero** sellable products. No PDP URL exists. Desktop did **not** create a product, did **not** redesign, did **not** capture payment, did **not** deploy, did **not** touch Learning or mobile.

`STORE_FINAL_RUNTIME_GATE` cannot be PASS. The only blocker is the missing real Active product.

## Inspected before any change

1. `docs/ai/PROJECT_STATE.md`, `docs/ai/CURRENT_TASK.md`, `docs/DEVELOPMENT_WORKFLOW.md`.
2. `git fetch --prune`. Parent `office/profile-hero-completeness-v1` @ `380a366` remains dirty with unrelated docs/ops/worktrees — not merged, not reset, not stashed.
3. `origin/alpha-0.2` tip = `6d1a2b4526f95e4a0fd05d39ec0da5bd129d8a0f` (`fix(store): stop requiring forbidden Store 20260934 SQL`). Historical Store productization parent = `d114e6e`. Central seller-approval tip `1f79dcb` is **not** live.
4. Host current (SSH inspect only): `/opt/umtuba/production/releases/92992786-20260824153400`, `GIT_SHA=92992786f41f68e83331fe00d991e8b9437275e2`. This object is **not** on GitHub `origin` (`upload-pack: not our ref`). Prior host dirs still present: `6d1a2b45-20260824115820`, `db1b6bad-20260824171946`. Not switched. Not deleted.
5. Live Store route confirmed: `https://umtuba.com/store` HTTP 200. `https://umtuba.com/healthz` = `umtuba-production-ok`. Did **not** open `/learning`.

## Public catalog evidence

Public listing uses `listPublicCatalog` on the live release: `store_products.status=active` AND `moderation_status=approved` AND `stores.status=active` (same contract as `isPubliclyVisibleProduct`).

| Surface | Result |
| --- | --- |
| `GET https://umtuba.com/store?hl=en` | 200. Copy: "Products are coming" / "Nothing is for sale yet" / "No featured products yet". `a[href*="/product/"]` count = 0. No `DEMO-` SKUs. |
| `GET https://umtuba.com/store/search?hl=en` | 200. "0 results" + "No matches". Product links = 0. |
| `GET https://umtuba.com/store?hl=ar` | 200. `lang=ar` `dir=rtl`. Arabic empty catalog copy present. Product links = 0. |
| `GET https://umtuba.com/store/search?hl=ar` | 200. `dir=rtl`. "0 نتائج" / "لا نتائج". Product links = 0. |
| Mobile 390×844 EN home | Same empty catalog. Product links = 0. |
| `GET https://umtuba.com/store/cart?hl=en` | Guest redirected to `/login`. No product in cart. Payment not reached. |
| Sitemap | Static only. Store PDPs are not enumerated. |

Categories (Digital Products, Education, Electronics, …) are taxonomy rails, not sellable products.

Demo catalog from `DESKTOP_STORE_DEMO_CATALOG_PRODUCTIZATION_V1` (`REAL_PRODUCTS_USED = 0`) is **not** on the public storefront. That is correct. Demo fixtures do not satisfy this gate.

Draft / pending / rejected products are not visible through public APIs. Desktop did not invent credentials or query admin/service-role. If unpublished real SKUs exist, Central/owner must activate them.

## Empty-state observation (not a product E2E pass)

These were observed only as empty-catalog shell checks. They are **not** claimed as PDP/cart/checkout PASS.

- EN LTR desktop + mobile home: honest empty Night Market shell.
- AR RTL desktop home + search: honest empty Night Market shell.
- Guest can read Store home/search without login.
- Guest cart route requires login on this live release.
- No catalog error banner; empty state rendered instead of a crash.

## What owner / Central must provide

Do **not** ask Desktop to invent a SKU. Provide **one real merchant product intended for sale**:

1. Active store: `stores.status = active`.
2. Real product record (not `DEMO-*`, not sandbox fixture): `store_products.status = active` AND `store_products.moderation_status = approved`.
3. At least one `product_variants.status = active` with an active `product_prices` row.
4. Inventory that allows Add to Cart (`on_hand` usable after reserve/safety).
5. At least one `product_media.status = active` if PDP media is expected.
6. Tell Desktop the store slug + product slug (or ID) after publish.
7. Keep `REAL_PAYMENT_CAPTURE = DISABLED`. Re-run this gate only after the product is publicly visible at `/store` and `/store/{storeSlug}/product/{productSlug}`.

## Not done (correct stop)

- No fake product / dummy seed.
- No redesign. No Night Market change.
- No new migration. `20260934` not applied.
- No mobile-native work.
- No Learning edit or `/learning` navigation.
- No deploy.
- No real payment.
- No parent dirt commit/merge/reset/stash.

## Screenshots

`docs/ops/store-final-runtime-gate/screenshots/`

- `01-store-home-desktop-en.png`
- `02-store-search-desktop-en.png`
- `03-store-home-mobile-en.png`
- `04-store-home-desktop-ar.png`
- `05-store-search-desktop-ar.png`
- `06-store-cart-desktop-en.png` (login gate)

Structured dump: `screenshot-evidence.json`.

Cursor browser MCP could not keep a tab in this session. Playwright headless against production Store routes was the substitute. No Learning URL was opened.

## Open issues

- Gate blocked only by missing real Active product.
- Live host SHA `92992786f41f68e83331fe00d991e8b9437275e2` is not fetchable from `origin`. Central should confirm deploy provenance. Not treated as a Store runtime defect in this task.
- Guest `/store/cart` redirects to login. Not classified as a defect here (no product to persist).
