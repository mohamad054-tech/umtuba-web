# UMTUBA_CJ_STORE_LAUNCH_MIX_V1

Local launch assortment from Profit Gate V2. V1 and V2 JSON files were preserved. Production Store was not touched. No CJ orders or payments.

## Status

```text
TASK_ID = UMTUBA_CJ_STORE_LAUNCH_MIX_V1
STATUS = COMPLETE
CANDIDATES_INPUT = 137
LAUNCH_SELECTED = 59
LAUNCH_HERO = 15
LAUNCH_STANDARD = 44
ORGANIC_ONLY = 1
HOLD = 77
LOCAL_PREVIEW_URL = http://localhost:3000/sandbox/store/cj-pilot
PRODUCTION_CHANGED = NO
CJ_ORDER_CREATED = NO
PAYMENT_ACTION = NO
DEPLOYED = NO
PUSHED = NO
```

59 is below the 60–80 target on purpose. After diversity caps, the leftover PAID_AD_READY SKUs were near-identical phone cases, car holders, makeup-brush sets, ice trays, or blocked electrics/chemicals. Rules were **not** padded.

## Assumptions (conservative, labeled)

Repo finance foundation (`FINANCE_FOUNDATION_PLACEHOLDER.paymentProcessingFees`) is **not_configured**. No finalized processor rate exists.

| Item | Value | Label |
|---|---|---|
| Payment fee | `round(retail × 2.9%) + $0.30` | `ASSUMED_NOT_FINAL` — not a live processor rate |
| Returns reserve | 3% low / 6% medium / 8% high (jewelry/fashion) | conservative placeholder |
| Target CPA | 55% of break-even | mid of 50–65% |
| Ireland dest | IE / Dublin / D02 | TEST only, not a personal address |

Formulas:

```text
break_even_ad_cost = gross_profit - payment_fee - returns_risk_reserve
recommended_target_CPA = 0.55 * break_even
estimated_net_profit_at_target_CPA = break_even - target_CPA
estimated_net_margin_at_target_CPA = net_profit / retail
```

High gross margin is **not** enough. Launch requires break-even ≥ $4, target CPA ≥ $2, and net at target ≥ $2.

## Diversity caps

Family caps (do not raise to hit a count): phone cases 4, cube jewelry 3, car phone holders 8, makeup brush sets 6, ice molds 4, pet food bowls 8, plus smaller caps for water bowls, feeders, kitchen, toys, personal-care brushes. Electric/wireless/USB/humidifier/night-lamp and hair-dye families are capped at 0. Category max 16.

## Mix

| Group | Count |
|---|---|
| LAUNCH_HERO | 15 |
| LAUNCH_STANDARD | 44 |
| LAUNCH_SELECTED | 59 |
| ORGANIC_ONLY | 1 (Kitchen cutter chopper — V2 organic, 12–19 day delivery) |
| HOLD | 77 |

Category mix (selected): Home 11 / Pet 16 / Car 9 / Travel 11 / Beauty 12.

Selected averages: retail **$22.89**, landed **$10.85**, gross margin **55.0%**, break-even ad **$10.22**, target CPA **$5.62**, estimated net at target **$4.60**.

## Top 20 launch products

1. Pet Stainless Steel Water Bowl Large Capacity Floating — HERO
2. Eye and Face Loose Powder High Gloss Blush Smudge Makeup Brush Set — HERO
3. Stainless Steel Large Capacity Pet Non-slip Splash-proof Water Bowl — HERO
4. Light Luxury Diamond-embedded Makeup Brush Set — HERO
5. Foldable Car Cup Holder / bottle organizer — HERO
6. Cute Expression Pet Bowl Oblique Ceramic — HERO
7. Ceramic Cat Bowl Cat Plate — HERO
8. Windshield Car Phone Holder — HERO
9. Cat Bowl Ceramic Basin Cervical Slope — HERO
10. Slow Food Bowl Anti Choking Puzzle Feeder — HERO
11. 1.5L Cat Dog Floating Water Bowl — HERO
12. Pet Supplies Cat Bowl Protects Spine — HERO
13. Magnetic Phone Holder For Car Dashboard — HERO
14. Universal Car Phone Holder Anti-Slip Pad — HERO
15. Fine Art Nylon Brush Painting Brush Set — HERO
16. Nylon Cleaning Brush Set Stainless Steel — STANDARD
17. Pet Simple Wooden Frame Anti-tumble Ceramic Bowl — STANDARD
18. Simple And Portable Plastic Car Phone Holder — STANDARD
19. Food Grade Ice Hockey Mold Circular Ice Cube — STANDARD
20. Baking Utensils Silicone Cake Spatula — STANDARD

## HOLD reasons (typical)

- Diversity caps on phone cases, car holders, makeup sets, ice trays, extra bowls
- Electric / wireless charger / USB / humidifier / night lamp / smart feeder
- Hair dye (chemical)
- V2 REJECTED_V2 (no Ireland freight, heavy, branded, batteries)

## Preview

`http://localhost:3000/sandbox/store/cj-pilot`

Filters: ALL / LAUNCH_HERO / LAUNCH_STANDARD / ORGANIC_ONLY / HOLD plus Home/Pet/Car/Travel/Beauty.

HTTP 200: ALL 137, HERO 15, STANDARD 44, ORGANIC 1, HOLD 77, HERO+Pet 8.

## Gates

- `npx tsc --noEmit` PASS
- `npx vitest run lib/services/cj` PASS (29)
- Route verification PASS
- Secret scan PASS
- `git diff --check` PASS

## Next action

Owner final local launch-catalog review before any production work. Do not publish. Do not create CJ orders.
