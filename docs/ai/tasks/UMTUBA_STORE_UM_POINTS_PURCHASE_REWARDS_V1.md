# UMTUBA_STORE_UM_POINTS_PURCHASE_REWARDS_V1

Status: implemented locally (earn + reversal foundation + Store UI).  
Production DB / deploy / payments / CJ orders: not touched.

## Owner visual approval (2026-09-09)

```text
OWNER_VISUAL_APPROVAL_BANNER = YES
OWNER_VISUAL_APPROVAL_POINTS_UI = YES
```

Owner approved the UM Points promo banner and the UMTUBA Points display system, including the product earn message. Currency formatting and unavailable-product gating were follow-up fixes in `UMTUBA_STORE_UM_POINTS_CURRENCY_AND_AVAILABILITY_FIX_V1` — not a rejection of the points UI.

## Existing architecture

Authoritative customer wallet already exists:

- `public.um_point_balances` — unified balance (`balance >= 0`)
- `public.um_points_ledger` — social/learning **positive-only** earn rows (`points > 0`)
- `award_um_points_to_user` — trusted SECURITY DEFINER writer (revoked from clients)
- `lib/wallet/adapters/umPoints.ts` reads `um_point_balances`
- Digital-asset sandbox ledgers are isolated TEST labs and are not this system

Do **not** create a competing customer balance. Store purchase rewards extend this wallet.

## Reuse / new schema

**SCHEMA_DECISION = EXTEND_EXISTING_WALLET + NEW_STORE_EVENT_LEDGER**

- Reuse `um_point_balances` as the only customer-facing balance
- Reuse `award_um_points_to_user` for PURCHASE_EARN (bypass daily social cap)
- Add `store_um_points_events` as the auditable Store purchase ledger (signed `points_delta`, unique `idempotency_key`)
- Do **not** drop `um_points_ledger_points_positive`

## Migration number

`supabase/migrations/20260917_store_um_points_purchase_rewards_v1.sql`

Next unused number after `20260916`. Candidate only. **Not applied to production.**

## Earning formula

`points = floor(eligible_product_spend_usd)`  
`$1 eligible product spend = 1 UM Point`. No rounding up.

Eligible spend = product subtotal actually paid − discounts/coupons.  
**Exclude:** shipping, tax/VAT, tips, gift-card value, refunded amounts, the discount amount itself.

Example: products $40, discount $5, shipping $8, tax $7, customer pays $50 → eligible $35 → **35 points**.

Award only when payment status is `paid` or `captured`.  
Cart / checkout start / pending / failed / cancelled / unpaid → **0**.

Canonical currency is USD. Other currencies require an authoritative checkout/payment FX value. Never assume EUR 1 = USD 1. Store original currency/value **and** USD equivalent.

## Refund formula

- Full refund of remaining eligible product spend → `REFUND_REVERSAL` of `floor(refunded_eligible_usd)`
- Partial → `PARTIAL_REFUND_REVERSAL` of `floor(refunded_eligible_usd)` (example: earned 50, refund $12.75 → reverse 12)
- Reversal is capped at remaining net earn for that order
- Duplicate refund notifications use the same idempotency key → no second reversal

## Idempotency

Stable keys:

- Purchase: `store.um_points.purchase:{orderId}:{paymentRef}`
- Full refund: `store.um_points.refund:{orderId}:{refundRef}`
- Partial refund: `store.um_points.partial_refund:{orderId}:{refundRef}`

Unique `idempotency_key` on `store_um_points_events`. Retries/webhooks/refreshes cannot duplicate.

`apply_store_um_points_event` is the safe post-capture interface. It does **not** replace `apply_store_payment_outcome`.

## Negative-balance / future spend policy

`FUTURE_SPENT_POINTS_REFUND_POLICY = STORE_LEDGER_ALLOWS_NEGATIVE_WALLET_NONNEG_UNCHANGED`

The Store event ledger may sum negative.  
`um_point_balances_nonneg` is unchanged. If a refund would reverse points already spent (learning unlock / future redemption), the Store event is still recorded in full and wallet apply may return `blocked_nonneg`. Foundation does **not** invent spend/redemption behavior.

## RLS / authz

- Users SELECT own `store_um_points_events` only
- INSERT/UPDATE/DELETE revoked from `anon` / `authenticated`
- `apply_store_um_points_event` granted to `service_role` only — **no client points argument**
- `get_my_store_um_points_activity` granted to `authenticated` (own rows / own wallet only)
- Domain engine denies cross-user reads/writes
- Client-supplied `points_delta` is ignored

## UI placements

| Surface | Placement |
|---|---|
| Promo banner | Top of `/sandbox/store/cj-launch` and `/store` (black/gold, no fake scarcity) |
| Product cards | Earnable points under price (`floor` of retail product price) |
| Product detail | Sandbox `[slug]` + live PDP: “Earn X UMTUBA Points with this purchase” |
| Cart | `/store/cart` summary + sandbox demo order estimate |
| Rewards | `/rewards` disclosure; sandbox TEST/DEMO ledger panel |

## Localization

Keys under `store.umPoints.*` in `lib/i18n/messages` (en + ar authored; other locales inherit English via catalog spread).  
Sandbox `?dir=rtl` uses Arabic. Live Store uses `resolveRequestLocale()`. No one-language hard-code in the banner.

## Files changed (implementation)

- `lib/store/umPointsPurchaseRewards.ts`
- `lib/store/umPointsPurchaseLedger.ts`
- `lib/store/umPointsPurchaseDemo.ts`
- `lib/store/umPointsPurchaseRewards.test.ts`
- `supabase/migrations/20260917_store_um_points_purchase_rewards_v1.sql`
- `lib/i18n/messages/{types,en,ar}.ts`
- `app/components/store/StoreUmPointsPromoBanner.tsx`
- `app/components/store/StoreUmPointsEarnHint.tsx`
- `app/components/store/StoreUmPointsCartEstimate.tsx`
- `app/components/store/StoreUmPointsRewardsPanel.tsx`
- `app/components/store/ProductCard.tsx`
- `app/components/store/ProductRail.tsx`
- `app/components/store/CartView.tsx`
- `app/sandbox/store/cj-launch/page.tsx`
- `app/sandbox/store/cj-launch/[slug]/page.tsx`
- `app/store/page.tsx`
- `app/store/cart/page.tsx`
- `app/store/[storeSlug]/product/[productSlug]/page.tsx`
- `app/store/[storeSlug]/product/[productSlug]/ProductDetailClient.tsx`
- `app/rewards/page.tsx`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- this file

## Tests / tsc / build

- `npx vitest run lib/store/umPointsPurchaseRewards.test.ts` — 21/21 PASS (formula, refunds, idempotency, authz, FX, RTL copy, migration contract)
- Store regression: cartFoundation, cartCheckoutExperience, pricingFoundation, checkoutFoundation — PASS
- i18n foundation + umPointsAwardSecurity — PASS
- `npx tsc --noEmit` — PASS (also fixed a pre-existing sleep typing in `scripts/sandbox/run-cj-59-live-read-gate.ts`)
- `npm run build` — PASS
- `git diff --check` — PASS
- Secret scan of new rewards files — PASS (no keys)
- Local preview HTTP 200 LTR + RTL listing + PDP (HTML verified). Browser MCP tab could not be created on this machine.

## Preview URL

http://localhost:3000/sandbox/store/cj-launch  
RTL: http://localhost:3000/sandbox/store/cj-launch?dir=rtl  
Product: http://localhost:3000/sandbox/store/cj-launch/{slug}

## Not in this task

Spending, redemption, cash conversion, transfer, buying points, expiration, VIP tiers, referral bonuses, production payment webhook replacement, CJ orders, production DB apply.
