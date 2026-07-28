# Unified Revenue Platform Foundation V1

**Status:** Foundation (contracts + in-memory registries)  
**Branch:** `office/unified-revenue-platform-foundation-v1`  
**Base:** `origin/alpha-0.2` @ `6fac440`  
**Machine:** Desktop  

## Purpose

UMTUBA’s **shared financial reference layer** for every product surface.  
Not Wallet-UI-only. Not Commerce-only. Not Learning-payments-only.

All future money movement should map into these contracts before PSP or product-specific implementations.

## Architecture

```text
Product sources (Commerce · Learning · Games · Ads · Live · Tips · …)
        │
        ▼
┌──────────────────────────────────────────────┐
│     Unified Revenue Platform (lib/revenue)   │
│  Sources · Consumers · Events · Transactions │
│  Wallet · Ledger · Billing hooks (noop)      │
│  Provider hooks (Stripe/PayPal/… noop)       │
└──────────────────────────────────────────────┘
        │
        ├── related (not replaced): lib/store/settlementFoundation
        ├── related (not replaced): lib/store/payments
        ├── related (not replaced): lib/wallet (UM Points presentation)
        └── related (not replaced): lib/ads/platform/billing
```

### Domain modules

| Module | Role in V1 |
| --- | --- |
| Wallet | Owner containers; balances derived from ledger |
| Ledger | Append-only double-entry; immutable |
| Transactions | Propose → post via ledger |
| Balances | Derived projections only |
| Earnings / Revenue Sharing / Commissions / Fees | Transaction kinds + events |
| Payouts / Refunds / Adjustments / Settlement | Transaction kinds + events |
| Billing Hooks | Noop extension points |

### Hard rules

- Integer **minor units** only
- **No direct balance mutation**
- **Immutable ledger** (no rewrite/delete)
- Balanced posts required (debit == credit per currency)
- No provider secrets / payloads in events
- No UI / DB / migrations / Stripe in this phase

## Registries

**Sources:** commerce, learning, games, ads, live, tips, gifts, subscriptions, ai, future  

**Consumers:** user, creator, seller, supplier, platform, affiliate, advertiser  

## Events

`payment_received` · `payment_failed` · `payout_requested` · `payout_completed` · `commission_created` · `refund_requested` · `refund_completed` · `wallet_credit` · `wallet_debit`

## Future provider hooks (noop)

Stripe · PayPal · Apple · Google · Crypto · Bank Transfer

## Code

`lib/revenue/` — see `index.ts` exports.
