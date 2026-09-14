# PC2_UMTUBA_STORE_WORLD_CLASS_VISUAL_DESIGN_V1

## Phase 0

| Field | Value |
| --- | --- |
| BASE | `cfc57402e38423231092d9eb80244b333c4cf6a7` |
| FUNCTIONAL_CANDIDATE | `C:\Users\Giga store\Desktop\umtuba\worktrees\PC2-STORE-SELLER-CENTER-COMMERCE-READINESS-V1` |
| FUNCTIONAL_BRANCH | `office/pc2-umtuba-store-seller-center-commerce-readiness-v1` (preserved) |
| WORKTREE | `C:\Users\Giga store\Desktop\umtuba\worktrees\PC2-STORE-WORLD-CLASS-VISUAL-DESIGN-V1` |
| BRANCH | `office/pc2-umtuba-store-world-class-visual-design-v1` |
| PREVIEW_PATH | `/sandbox/store-visual` |
| LOCAL_PREVIEW_URL | `http://127.0.0.1:3020/sandbox/store-visual` |
| DEMO_DATA | `lib/store/visualDemo/data.ts` (local fixtures only) |

## Surfaces

| Surface | Label | Path |
| --- | --- | --- |
| Store Home | VISUAL_DEMO | `/sandbox/store-visual` |
| Product Detail | VISUAL_DEMO | `/sandbox/store-visual/product/aurora-buds` |
| Cart | VISUAL_DEMO | `/sandbox/store-visual/cart` |
| Checkout | VISUAL_DEMO | `/sandbox/store-visual/checkout` |
| Public seller store | VISUAL_DEMO | `/sandbox/store-visual/store/harbor-pulse` |
| Become a Seller | VISUAL_DEMO | `/sandbox/store-visual/become-a-seller` |
| Seller Center | VISUAL_DEMO | `/sandbox/store-visual/seller` |
| Add Product | VISUAL_DEMO | `/sandbox/store-visual/seller/product/new` |
| Seller Orders | VISUAL_DEMO | `/sandbox/store-visual/seller/orders` |
| Returns | FUNCTIONAL_WIRING_PENDING | `/sandbox/store-visual/seller/returns` |
| Reviews | FUNCTIONAL_WIRING_PENDING | `/sandbox/store-visual/seller/reviews` |
| Analytics | FUNCTIONAL_WIRING_PENDING | `/sandbox/store-visual/seller/analytics` |
| Watch → chip → sheet → PDP | VISUAL_DEMO | `/sandbox/store-visual/watch` |
| Existing public `/store` | FUNCTIONAL_EXISTING | unchanged production route |

## Screenshots

All under `docs/ai/pc2-store-visual-design/shots/`:

- `01_store_home_desktop_VISUAL_DEMO.png`
- `02_store_home_mobile_VISUAL_DEMO.png`
- `03_pdp_VISUAL_DEMO.png`
- `04_cart_VISUAL_DEMO.png`
- `05_checkout_VISUAL_DEMO.png`
- `06_seller_storefront_VISUAL_DEMO.png`
- `07_become_a_seller_VISUAL_DEMO.png`
- `08_seller_center_VISUAL_DEMO.png`
- `09_add_product_VISUAL_DEMO.png`
- `10_orders_VISUAL_DEMO.png`
- `11_returns_FUNCTIONAL_WIRING_PENDING.png`
- `12_reviews_FUNCTIONAL_WIRING_PENDING.png`
- `13_analytics_FUNCTIONAL_WIRING_PENDING.png`
- `14_arabic_rtl_VISUAL_DEMO.png`
- `15_ltr_watch_VISUAL_DEMO.png`

## Financial gates

```text
REAL_PAYMENT_CAPTURE = DISABLED
REAL_SELLER_PAYOUT = DISABLED
PAYMENT_PROVIDER_CONNECTED = NO
```

## Hard flags

```text
DEPLOYED = NO
MOBILE_TOUCHED = NO
MIGRATIONS = NO
COMMIT = NO
PUSH = NO
READY_FOR_OWNER_VISUAL_REVIEW = YES
DESIGN_PASS = NOT_CLAIMED
```
