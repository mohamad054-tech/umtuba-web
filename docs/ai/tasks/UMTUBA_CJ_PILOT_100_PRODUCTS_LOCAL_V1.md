# UMTUBA_CJ_PILOT_100_PRODUCTS_LOCAL_V1

```text
TASK_ID = UMTUBA_CJ_PILOT_100_PRODUCTS_LOCAL_V1
STATUS = LIVE_IMPORT_COMPLETE
BASE_SHA = 196a035801ea8cc992693f261052ee83b9390780
BRANCH = pc2/umtuba-communications-v1-part1b-identity-discovery
CJ_API_CONNECTED = YES
CANDIDATES_FETCHED = 137
PRODUCTS_ACCEPTED = 100
PRODUCTS_REJECTED = 37
AVG_LANDED_COST = $10.47
AVG_RETAIL_PRICE = $15.42
AVG_GROSS_MARGIN = 32.4%
LOCAL_PREVIEW_URL = http://localhost:3000/sandbox/store/cj-pilot
TYPECHECK = PASS
TESTS = PASS (13)
BUILD = SKIPPED_NO_UI_WIRING_CHANGE
SECRET_SCAN = PASS
PRODUCTION_CHANGED = NO
CJ_ORDER_CREATED = NO
PAYMENT_ACTION = NO
DEPLOYED = NO
COMMIT = NO
PUSH = NO
```

## Import result

Live read-only CJ catalog + Ireland freight ran locally. `.env.local` is gitignored; key presence was `hasKey=true`, `keyLengthGt0=true` (value never printed). Access token cached in gitignored `.local/cj/`.

| Category | Accepted | Rejected |
| --- | ---: | ---: |
| Home | 20 | 10 |
| Pet | 20 | 16 |
| Car | 20 | 2 |
| Travel | 20 | 8 |
| Beauty | 20 | 1 |
| **Total** | **100** | **37** |

Candidates fetched (evaluated rows in the merged catalog): **137**.

## Pricing (accepted)

- Average landed cost: **$10.47** (1047 minor USD)
- Average proposed retail: **$15.42** (1542 minor USD)
- Average gross margin: **32.4%** (target ≥ 30%)
- Market competitiveness: unverified on all accepted rows
- CJ list-page margin was not used

## Top 10 best-margin accepted

| Margin | Category | Retail | Landed | Title |
| ---: | --- | ---: | ---: | --- |
| 37% | Home | $9.99 | $6.32 | Advanced Liquid Silicone New Lens All-inclusive Phone Case |
| 37% | Beauty | $9.99 | $6.32 | Makeup brush set |
| 37% | Home | $9.99 | $6.34 | New Mobile Phone Case Liquid Silicone Creative Window Lens |
| 36% | Beauty | $6.99 | $4.44 | Fine Art Nylon Brush Painting Brush Set |
| 36% | Car | $10.99 | $7.00 | Foldable Mobile Phone Holder Ring Buckle… |
| 36% | Pet | $11.99 | $7.71 | New Pet Bowl Slow Feeding Bowl Anti-choke… |
| 36% | Home | $9.99 | $6.43 | Laser Colorful Love For Double-sided Coated Silicone Phone Case |
| 36% | Car | $11.99 | $7.72 | Rotate Metal Magnetic Car Phone Holder… |
| 35% | Travel | $8.99 | $5.82 | Tide Figure Rubik's Cube Painted Frosted All-inclusive Mobile Phone Soft Case |
| 35% | Pet | $12.99 | $8.41 | Pet Food Bowl Stainless Steel Pet Bowl… |

## Worst rejection reasons

| Count | Reason |
| ---: | --- |
| 19 | heavy_or_bulky |
| 6 | slow_delivery |
| 5 | counterfeit_or_branded |
| 3 | batteries_or_restricted |
| 2 | shipping_unavailable_to_ireland_test_dest |
| 1 | regulated_medical_claims |
| 1 | supplements |

First live pass rejected many rows as `poor_inventory` because variant warehouse arrays came back empty (stock=0) while list inventory was healthy. Local fix: fall back to list warehouse inventory, skip freight on already-excluded SKUs, and reserve freight per category so Beauty is not starved.

## Ireland TEST destination

Not a personal address.

| Field | Value |
| --- | --- |
| Country | Ireland (`IE`) |
| Locality | Dublin |
| Postcode | `D02` |
| Freight | `endCountryCode=IE`, `zip=D02` |

## API endpoints used (read-only)

| Endpoint | Purpose |
| --- | --- |
| `POST /api2.0/v1/authentication/getAccessToken` | API key → access token (cached) |
| `POST /api2.0/v1/authentication/refreshAccessToken` | Refresh path (available; cache was still fresh) |
| `GET /api2.0/v1/product/listV2` | Keyword catalog search |
| `GET /api2.0/v1/product/query` | Product + variant detail |
| `POST /api2.0/v1/logistic/freightCalculate` | Shipping to Ireland test dest |

No create-order, payment, or fulfillment calls.

## Preview

`http://localhost:3000/sandbox/store/cj-pilot`  
Verified locally on `http://localhost:3017/sandbox/store/cj-pilot` (HTTP 200, `CJ API connected = YES`, accepted cards present, empty-state absent).

## Gates

- `npx tsc --noEmit` — PASS
- `npx vitest run lib/services/cj` — PASS (13)
- `npm run build` — skipped (no UI wiring change; route already registered)
- `git diff --check` — PASS
- Secret scan — PASS (no keys/tokens in changed files or catalog JSON)
- Production Store / CJ orders / payments / deploy — not performed

## Blockers

None for this local pilot.

## Next action

Owner review of `/sandbox/store/cj-pilot` and `data/cj-pilot-100.json`. Do not publish to production Store.
