# DESKTOP_STORE_SANDBOX_PRODUCT_REVIEW_V1

DATE = 2026-08-18
DEVICE = DESKTOP
ROLE = STORE_SANDBOX_PRODUCT_VALIDATOR
SANDBOX_SOURCE_SHA = 8f39277bbe902dd202023379bff2fc25161d3168
SANDBOX_SOURCE_SHA_SERVED = 8f39277bbe902dd202023379bff2fc25161d3168
HOW_OPENED = local Next.js `npm run dev -- --port 3057` in detached worktree `worktrees/DESKTOP-STORE-SANDBOX-REVIEW-V1`; anonymous GET denied; operator enter `/sandbox/business-preview/enter?sandbox_token=<gitignored>` then cookie redirect to `/sandbox/business-preview` with token stripped
SOURCE_CHANGED = NO
DEPLOYED = NO
REAL_PRODUCTS_IMPORTED = 0
REAL_PARTNERSHIPS_ACTIVE = 0
REAL_PAYMENT = 0
SQL_20260929 = NOT_APPLIED
CENTRAL_ACTION_REQUIRED = YES

## Verdict

`/sandbox/business-preview` is an **honest private Product Owner dossier**, not a future commercial marketplace. Labels, DEMO catalog reuse, mock payments, and prospective-partner deny-by-default are strong. Discovery, PDP, cart interaction, full checkout, payment-state UX, orders/returns, seller ops, and Store Admin are **MISSING or fixture-only**. Do not treat this SHA as Store product PASS.

## How this review was run

- Parent `umtuba-web` was dirty on `office/profile-hero-completeness-v1` and did **not** contain `8f39277` until `git fetch --prune`.
- DESKTOP-A2 web worktree was `716bf47` (buyer a11y) and could **not** serve this hub.
- Created detached worktree `worktrees/DESKTOP-STORE-SANDBOX-REVIEW-V1` at exact SHA. `git rev-parse HEAD` = `8f39277bbe902dd202023379bff2fc25161d3168`.
- Did **not** FF parent. Did **not** merge. Did **not** patch shared Web source.
- Playwright walk + 43 screenshots in `screenshots/`. Structured dump: `walk-evidence.json`.
- Existing 26 DEMO products reused. No real cards. No supplier contact. No partner logos imported.

## Section reviews

### 1. Store home / discovery — FAIL / NOT_A_MARKETPLACE

Sandbox `/store` is a 3-column (1-col on phone) list of 26 text cards: title, DEMO badge, commerce-mode enum, price, “Open product”.

MISSING: categories, featured, recommendations, search, filters, sort, product images, favorites, cart icon, orders entry as buyer chrome, empty/loading/error merchandising, hero, brand rail, trust strip.

Confusing UX: operator-flag chrome, not shopper IA. Hierarchy is nav-pills → flat grid. Empty space is mostly unused dark canvas under cards. Visual language is consistent *inside* the hub (dark cards, gold badges) but does not match public `/store` chrome. Public app bottom nav (Home / Live / Messages / Profile) still wraps the private hub.

Premium global marketplace feel: **NO**.

### 2. Product catalog (26 DEMO) — CATALOG_INTEGRITY PASS / SHOP_UX FAIL

All 26 listings come from `UMTUBA_DEMO_PRODUCTS`. Runtime overlay sets `purchasableInProduction=false`, `realInventory=false`, `label=DEMO`. Fixture fields: `SOURCE_TYPE=DEMO`, `RIGHTS_STATUS=DEMO_ONLY`, `REAL_PROVIDER=NONE`, `PURCHASABLE=NO`, `PRODUCTION_SELLABLE=NO`.

Observed on every PDP: those flags printed in the description. No partner SKU styling. No unauthorized marketplace inventory look.

MISSING in the sandbox grid: category filter, search, sort, images, empty/loading/error states, variant picker, stock demo beyond `onHand=N (synthetic)` text.

Do not read commerce-mode rotation as a supplier agreement. Modes are assigned by index `% 7`.

### 3. PDP — NOT_WORLD_CLASS / HONEST

Present: title, synthetic description, DEMO badge, first-variant price, mode, actor id, variant list with synthetic onHand, PURCHASABLE=NO footer.

MISSING: gallery, placeholder image render, zoom, sticky ATC, add-to-cart, favorite, variant *selector*, shipping promises (good — none invented), ratings/reviews (good — none invented), discounts, partner claims, related products, breadcrumbs beyond “Back to hub”, digital-vs-physical presentation (print pack still shows onHand).

No fake ratings/reviews/shipping/discount/partner claims. Good honesty. Not a commercial PDP.

### 4. Cart sandbox — FIXTURE_ONLY

Static 3 lines (earbuds Graphite UMTUBA_OWNED, desk lamp AFFILIATE, overshirt S CATALOG_API). Qty always 1. Subtotal printed. Discount example `SANDBOX-SAVE10` and shipping `Sandbox standard` are **labels only** — not applied to a computed total.

MISSING: add/remove, qty stepper, variant change, unavailable, price-change, inventory-change, empty cart, proceed CTA (checkout is a separate nav pill).

Clearly SANDBOX. No real commercial order.

### 5. Full checkout sandbox — MISSING_FLOW

Served path: `/sandbox/business-preview/store/checkout` repeats the static cart, then three mock buttons. Banner: `PAYMENT_MODE=SANDBOX · REAL_PAYMENT=OFF`. Adapter `sandbox-mock-adapter`. No card fields (`hasCardInput=false`).

MISSING steps: Address, Shipping selection, Payment method, Review, Place DEMO order, Success page, Order detail deep-link.

No real charge possible from this UI.

### 6. Payment states — PARTIAL

Sandbox outcomes: SUCCESS, FAILURE, REFUND, PENDING.
Order statuses: CAPTURED, FAILED, REFUNDED, AUTHORIZED, CREATED.

Requested but **NOT_FOUND** as named UX: DECLINED, PROCESSING, CANCELLED, REFUND_PENDING.

Buttons do not explain buyer meaning (retry, why declined, when refund lands). Public Store domain `PAYMENT_STATUSES` is `pending|authorized|paid|failed|refunded` — also not the requested set. Attempt statuses include `cancelled` in `lib/store/payments.ts` but that is not wired into this hub.

### 7. Orders — LIST_ONLY

Five synthetic orders with product, amount, status, paymentOutcome, Demo Student N. Flow map for success/failure/refund. `REAL_PAYMENTS=0`.

MISSING: order detail, line items page, payment timeline, shipping/tracking demo, cancel, return, refund action, buyer/seller split views.

### 8. Seller Dashboard — NOT_USABLE_BY_MERCHANT

Three actor cards: Demo Supplier A (15 listings), Demo Supplier B (8), Demo Marketplace Seller C (3), all `payout=OFF`.

MISSING: profile edit, product create/edit, variants, inventory, pricing, orders, returns, revenue/commission/settlement UI, analytics, markets, catalog status, rights per listing, provider status.

A future merchant **cannot** manage without staff. Public `/seller/store/*` exists in this SHA (products, inventory, orders, analytics, marketplace, shipping, promotions) but is **not composed into the sandbox** and was not admin-authenticated in this review.

### 9. Provider models — LABELS_ONLY / OWNERSHIP_UNCLEAR

All seven modes appear on catalog cards via rotation: UMTUBA_OWNED, AFFILIATE, CATALOG_API, DROPSHIP, WHOLESALE, RESELLER, MARKETPLACE_SELLER.

MISSING: per-mode explanation of PRODUCT / PAYMENT / FULFILLMENT / RETURNS / CUSTOMER_SUPPORT ownership. Cart mixes three modes with no split. UMTUBA_OWNED still attributed to `demo-supplier-a`. Rights matrix is on the Partners/Rights pages, not on PDP.

UNKNOWN=DENY is implemented and visible on prospective partners.

### 10. Global partner preview — PASS (honesty)

SHEIN, Temu, AliExpress, Alibaba, Trendyol, Amazon, eBay, DHgate. Each: PROSPECTIVE PARTNER, NOT AN UMTUBA PARTNER, text-only, no logo, no imported catalog, all rights UNKNOWN→DENY, integrations PENDING CONTRACT / UNKNOWN. `logoImg=false`.

Do not promote this as a signed partnership. Status cannot become ACTIVE in this UI.

### 11. Store Admin — NOT_FOUND in sandbox

No sandbox admin section for providers/sellers/products/imports/orders/payments/returns/refunds/rights/markets/currencies/commission/suspension/audit.

Public `/admin/store` in this SHA is a **moderation queue** (seller applications, product review, reservations) with hardcoded English chrome. Not opened (requires platform admin + Supabase). Lifecycle DRAFT→…→TERMINATED is typed in fixtures (`LIFECYCLE_STATUSES`) but not an admin console. Prospective companies stay PROSPECTIVE.

### 12. Commercial economics — HONEST / INCOMPLETE

Disclaimer present: not forecast, not accounting, not legal. Payouts `enabled=false`. Store rows: UMTUBA_OWNED 100/0, MARKETPLACE_SELLER 15/85, DROPSHIP 25/75, AFFILIATE 8/0.

MISSING store rows: CATALOG_API, WHOLESALE, RESELLER. No settlement calendar, no tax, no FX, no markets.

### 13. Multi-provider order UX — MISSING

Sandbox cart is three commerce modes and one subtotal. No split shipment, no “3 orders / 3 sellers”, no per-provider payment/fulfillment story.

Public Store has `multiSellerCheckoutNotice` (“Items from N sellers will become N orders”) in `lib/store/cartCheckoutPresentation.ts`. **Not used** in the sandbox hub. Do not implement complex backend from Desktop.

### 14. Localization — ARABIC_CHROME PASS / BODY FAIL

- `ar`: `dir=rtl`, `lang=ar`. Nav pills Arabic. Product names left in English (correct).
- Hardcoded English remains: “26 reused DEMO products…”, “Sandbox cart”, “Subtotal”, “discount example”, order ids/status enums, rights flag names, partner notes, commercial mode names, “Sections: 13. Public nav must not link here.”
- `fr/es/de/pt`: title/subtitle/store/hub translated; Student, Instructor, Cart, Checkout, Orders, Seller leftover English (`lib/sandbox/i18n.ts` spreads `en` and overrides only a few keys).
- Prices via `formatMinorUnits` → `Intl.NumberFormat(undefined)` so this Arabic Windows host showed Eastern Arabic digits + `US$` even on EN chrome.

### 15. Responsive — NO_HORIZONTAL_CLIP / CHROME_HEAVY

Viewports 360, 390, 430, 768, 1024, 1440 on store / checkout / seller: `scrollWidth === clientWidth`, `clipped=false`.

360: nav pills wrap to ~6 rows and consume the first screen; public bottom nav sits on content; no sticky ATC (none exists); no seller tables. Usable, not premium.

### 16. Security / sandbox — CONTAINMENT PASS

| Flag | Result |
| --- | --- |
| PRIVATE_SANDBOX | YES — anonymous denied; token or platform admin |
| PUBLIC_ACCESS | NO |
| NOINDEX | YES — layout `robots: { index: false, follow: false }`; `ROBOTS_DISALLOW_PATHS` includes `/sandbox` |
| PUBLIC_NAV_LINK | NO — not in `APP_NAV_ITEMS`, mobile primary, user menu, sitemap |
| REAL_PAYMENT_POSSIBLE | NO |
| REAL_PRODUCTS_IMPORTED | 0 |
| REAL_PARTNERSHIPS_ACTIVE | 0 |
| Demo escape to public Store | Fixtures not imported into `/store` (containment tests + source). Public `/store` in this isolated worktree had no sandbox catalog grafted. |

Residual: public **app shell** (bottom nav) still renders on sandbox pages. Path is private; chrome is public.

### 17. Product quality judgment

UMTUBA still needs, to feel globally competitive (do not copy proprietary competitor UI):

1. A real storefront composition (hero, category IA, search, filters, merchandising rails, cards with media).
2. A world-class PDP (gallery, variant UX, trust, fulfillment honesty per provider model).
3. An interactive sandbox cart/checkout that walks Address→Shipping→Mock pay→Success without ever collecting cards.
4. Named payment/order/return states a buyer can understand.
5. A seller workspace a single merchant can operate.
6. A Store Admin that can keep prospective brands PROSPECTIVE and never ACTIVE without contract.
7. Multi-provider order architecture visible in UX before any import.
8. Arabic *and* RTL for shopper copy, not only chrome, with locale-correct money (not host `undefined`).

Honesty of DEMO / SANDBOX / NOT A PARTNER is already better than a fake-full marketplace. Keep that. Build the shop around it.

## Evidence

- `walk-evidence.json`
- `screenshots/` (43 PNG)
- `review-walk.mjs` (token read from gitignored file; token not printed)

## Quality gates this session

- Sandbox vitest: 4 files / 25 tests PASS
- TypeScript: not run (no product source change)
- Build: not run (QA only)
- `git diff --check`: clean
- `git rev-parse`: `8f39277bbe902dd202023379bff2fc25161d3168`
