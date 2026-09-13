# UMTUBA_CJ_PROFIT_GATE_V2_LOCAL

Local-only re-rank of the CJ pilot catalog for paid-ad profitability. V1 dataset `data/cj-pilot-100.json` was preserved. Production Store was not touched. No CJ orders or payments.

## Status

```text
TASK_ID = UMTUBA_CJ_PROFIT_GATE_V2_LOCAL
STATUS = COMPLETE
CANDIDATES_EVALUATED = 137
PAID_AD_READY = 98
ORGANIC_ONLY = 1
REJECTED_V2 = 38
STRONG = 99
AVG_MARGIN_PAID_AD_READY = 54.7%
AVG_GROSS_PROFIT_PAID_AD_READY = $11.55
AVG_DELIVERY_DAYS_PAID_AD_READY = 9.2
LOCAL_PREVIEW_URL = http://localhost:3000/sandbox/store/cj-pilot
EXPANSION_ATTEMPTED = NO
PRODUCTION_CHANGED = NO
CJ_ORDER_CREATED = NO
PAYMENT_ACTION = NO
DEPLOYED = NO
PUSHED = NO
```

Existing V1 catalog already produced 99 strong products (98 paid + 1 organic). Gates were **not** weakened. Additional CJ fetch (up to 300 unique) was **not** required.

## Ireland TEST destination

`IE` / Dublin / `D02`. Not a personal address. Landed cost = supplier + Ireland shipping + documented API fees.

## Ranking formula

Documented in `lib/services/cj/profitScore.ts` and in `data/cj-profit-gate-v2.json`.

```text
score =
  0.28 * marginScore +
  0.22 * profitScore +
  0.15 * deliveryScore +
  0.12 * stockScore +
  0.10 * simplicityScore +
  0.08 * visualScore +
  0.05 * landedScore
```

Component mapping (each 0–100):

- **margin:** 35% → 0, 65%+ → 100
- **profit:** $4 → 0, $20+ → 100
- **delivery:** 1 day → 100, 14+ days → 0 (unknown → 40)
- **stock:** 30 → 0, 500+ → 100
- **simplicity:** simple gadget 100 / size hints 40–70 / apparel 15
- **visual:** image count + short concrete title
- **landed:** landed share 55% → 0, 30% or below → 100

Score is for ranking only. Classification uses hard gates.

## Pricing (recalculated; V1 retail not reused)

- `minRetail = max(landed / (1 - targetMargin), landed + minProfit)`
- Then clean psychological rounding (`.49` / `.99`)
- **Paid:** margin ≥ 45%, profit ≥ $8 (prefer $10), landed share ≤ 55%, retail cap $79.99
- **Organic:** margin ≥ 35%, profit ≥ $4, retail cap $99.99, marked `ORGANIC_ONLY`, never mixed with paid
- Unrealistic retail is flagged and cannot enter that lane

## Gates

**PAID_AD_READY**

- Gross margin ≥ 45%
- Gross profit ≥ $8 (prefer ≥ $10)
- Landed ≤ 55% of retail
- Delivery ≤ 12 days
- Healthy stock (≥ 30)
- No complicated sizing / apparel return risk
- No trademark / battery / heavy / restricted
- Retail not above $79.99 impulse cap

**ORGANIC_ONLY**

- Fails paid gate
- Gross margin ≥ 35%
- Gross profit ≥ $4
- Delivery ≤ 21 days
- Same hard exclusions
- Retail not above $99.99

**REJECTED_V2** — hard exclusions, missing Ireland freight, or both lanes fail. V1 hard rejects are not reopened by raising price.

## Counts

| Group | Count |
|---|---|
| Candidates evaluated | 137 (all unique V1 records) |
| PAID_AD_READY | 98 |
| ORGANIC_ONLY | 1 (Kitchen cutter chopper — delivery 12–19 days) |
| REJECTED_V2 | 38 |
| Strong (paid + organic) | 99 |

## Top 20 (by score)

1. Fine Art Nylon Brush Painting Brush Set — Beauty — $14.99 / landed $4.44 / GP $10.55 / 70.4% / 77.8
2. Mesh Cube Sugar Pendant Vintage Necklace — Travel — $15.99 / $5.28 / $10.71 / 67.0% / 77.4
3. Pearl Cube Crystal Zircon Earrings — Travel — $15.99 / $5.30 / $10.69 / 66.9% / 77.3
4. Kitchen Mini Stainless Steel Ice Cube Clamp — Travel — $14.99 / $4.70 / $10.29 / 68.6% / 77.2
5. Nylon Cleaning Brush Set Stainless Steel — Beauty — $15.99 / $5.37 / $10.62 / 66.4% / 77.2
6. Rhinestone Cube Earrings Ins Fashion Temperament Geometric Earrings — Travel — $15.99 / $5.40 / $10.59 / 66.2% / 77.1
7. Pure Color Simple Advanced Silicone Phone Case — Home — $15.99 / $5.42 / $10.57 / 66.1% / 77.0
8. Silicone Mobile Phone Back Pasted Card Holder — Home — $14.99 / $4.81 / $10.18 / 67.9% / 76.8
9. Solid Color All Inclusive Anti Drop Silicone Phone Case — Home — $15.99 / $5.46 / $10.53 / 65.9% / 76.5
10. Solid Color Meteorite Pattern Niche High-grade Silicone Phone Case — Home — $16.99 / $6.03 / $10.96 / 64.5% / 76.4
11. Food Grade Ice Hockey Mold Ice Maker Circular Ice Cube — Travel — $15.99 / $5.55 / $10.44 / 65.3% / 76.3
12. Natural Crystal Cube Rough Polishing Aromatherapy Stone Diffuser Stone — Travel — $15.99 / $5.29 / $10.70 / 66.9% / 75.8
13. Baking Utensils… Cake Cream Jam Spatula — Home — $15.99 / $5.57 / $10.42 / 65.2% / 75.0
14. Liquid Silicone Phone Case Lanyard — Home — $16.99 / $6.27 / $10.72 / 63.1% / 74.9
15. Advanced Liquid Silicone New Lens All-inclusive Phone Case — Home — $16.99 / $6.32 / $10.67 / 62.8% / 74.5
16. Makeup brush set — Beauty — $16.99 / $6.32 / $10.67 / 62.8% / 74.5
17. Lightweight Car Shooting Bracket Mobile Phone Holder — Car — $15.99 / $5.86 / $10.13 / 63.4% / 74.3
18. Geometry Pattern In Purple Glass Crystal… Stud Earrings — Travel — $15.99 / $5.85 / $10.14 / 63.4% / 74.0
19. New Mobile Phone Case Liquid Silicone Creative Window Lens — Home — $16.99 / $6.34 / $10.65 / 62.7% / 73.9
20. New Car Phone Holder Dashboard Navigation — Car — $15.99 / $5.95 / $10.04 / 62.8% / 73.6

## Rejection reasons (V2)

| Reason | Count |
|---|---|
| shipping_unavailable_to_ireland_test_dest | 31 |
| heavy_or_bulky | 19 |
| slow_delivery | 6 |
| counterfeit_or_branded | 5 |
| batteries_or_restricted | 3 |
| apparel_return_risk | 2 |
| regulated_medical_claims | 1 |
| supplements | 1 |

A product can carry more than one reason. Most rejects are the original 37 V1 hard rejects plus one extra apparel/title hit. They were not repriced into paid/organic.

## Endpoints used (read-only, inherited from V1)

- `POST /v1/authentication/getAccessToken`
- `POST /v1/authentication/refreshAccessToken`
- `GET /v1/product/listV2`
- `GET /v1/product/query`
- `POST /v1/logistic/freightCalculate`

No create-order, payment, or fulfillment paths. Token cache remains gitignored at `.local/cj/`.

## Local preview

- URL: `http://localhost:3000/sandbox/store/cj-pilot`
- Filters: `ALL` / `PAID_AD_READY` / `ORGANIC_ONLY` / `REJECTED_V2` (`?filter=`)
- Each card: retail, landed, gross profit, margin, delivery, stock, score, classification
- HTTP 200 confirmed: ALL 137 cards, PAID 98, ORGANIC 1, REJECTED 38
- Isolated sandbox. `provider=cj`. Production `/store` unchanged.

## Files

- `lib/services/cj/profitGate.ts` — floors, types, expansion keywords
- `lib/services/cj/profitPricing.ts` — V2 retail
- `lib/services/cj/profitScore.ts` — documented score
- `lib/services/cj/profitEvaluate.ts` — classification
- `lib/services/cj/profitCatalogFile.ts` — V2 JSON IO
- `lib/services/cj/*test.ts` — pricing / score / gate tests
- `scripts/sandbox/run-cj-profit-gate-v2.ts`
- `data/cj-profit-gate-v2.json`
- `app/sandbox/store/cj-pilot/page.tsx` — filter toggle
- `data/cj-pilot-100.json` — **preserved, not overwritten**

## Gates run

- `npx tsc --noEmit` PASS
- `npx vitest run lib/services/cj` PASS (24)
- Route verification PASS (HTTP 200)
- Secret scan PASS (no tokens in V2 JSON)
- `git diff --check` PASS
- `.env*` gitignored (`.gitignore` `.env*`, `!.env.example`)

## Next action

Owner review of `/sandbox/store/cj-pilot` paid-ad cards. Do not publish to production Store. Do not create CJ orders.
