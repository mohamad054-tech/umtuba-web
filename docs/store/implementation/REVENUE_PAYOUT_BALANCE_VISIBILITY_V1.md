# Commerce Revenue ↔ Payout Balance Visibility V1

Capability: `commerce.revenue.payout_balance_visibility_v1`
Status: implemented locally (no new migration)

Depends on: Seller Payout Read Model V1 (`20260882`), Commerce Revenue Ledger Bridge Foundation V1

## Purpose

Expose **trusted seller payout balances** through the existing Revenue Bridge seller-visibility contract, sourced only from Seller Payout Read Model RPCs. Bank/rail execution remains disabled (`payoutsEnabled: false`).

## Behavior

`buildSellerRevenueBridgeVisibility` / `loadSellerRevenueBridgeVisibility`:

| Flag / field | Meaning |
| --- | --- |
| `balanceVisibilityEnabled` | True when balances are backed by trusted payout summary reads |
| `payoutsEnabled` | Always **false** while bank rails are absent |
| `payoutBalances.byCurrency[]` | Per-currency `availablePayoutMinor`, `inTransitMinor`, `completedMinor` |
| `withheldUnsupportedValues` | Drops `available_payout` / `seller_balance` when visibility is on; still withholds `commission`, `net_earnings`, `reserve`, `payout_date` |

When payout reads fail or are omitted → fail closed: balances withheld (legacy withhold list).

## Surfaces

- `lib/store/commerceRevenueBridge.ts` — types + mapper + loader
- `app/seller/store/page.tsx` — server load into existing seller store insights (no Dashboard redesign)

## Security

- Owner/manager enforced by payout read RPCs
- No client money totals
- No journal IDs / fingerprints / bank fields
- Currency buckets never mixed

## Out of scope

Bank rails, write/booking RPCs, Dashboard/admin UI, commission invention, broad new payout screens, migrations.

Trusted commission calculation SSOT (not auto-activated): `commerce.revenue.commission_policy_foundation_v1`. Seller visibility still withholds `commission` / `net_earnings` until a dedicated surface is approved.
